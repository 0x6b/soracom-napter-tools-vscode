import { join } from "path";
import {
  commands,
  env,
  Event,
  EventEmitter,
  StatusBarAlignment,
  StatusBarItem,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  window,
  workspace
} from "vscode";
import { SoracomModel } from "../model/SoracomModel";
import { PortMapping, Subscriber, User } from "../model/types";
import { Node } from "./types";

export class NapterDataProvider implements TreeDataProvider<Node> {
  private _onDidChangeTreeData: EventEmitter<Node | undefined> = new EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData: Event<Node | undefined> = this._onDidChangeTreeData.event;

  private mediaRoot = join(__filename, "..", "..", "..", "media");
  private subscriberIconPath = {
    light: join(this.mediaRoot, "SIS0006-light.svg"),
    dark: join(this.mediaRoot, "SIS0006-dark.svg")
  };
  private portMappingIconPath = {
    light: join(this.mediaRoot, "SISS024-light.svg"),
    dark: join(this.mediaRoot, "SISS024-dark.svg")
  };

  private statusBarItem: StatusBarItem;
  private _onTreeRefreshed: EventEmitter<User> = new EventEmitter<User>();
  private onTreeRefreshed: Event<User> = this._onTreeRefreshed.event;
  private _mask: boolean = false;

  constructor(private readonly model: SoracomModel, mask: boolean) {
    this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 0);
    this.statusBarItem.tooltip = "SORACOM Operator. Click to open User Console";
    this.statusBarItem.command = "openUserConsole";

    this.onTreeRefreshed(e => {
      this.statusBarItem.text = `$(info) ${this.masked(e.userName, /\w/gi, "x")}@${this.masked(
        e.operatorId,
        /\d/g,
        "0"
      )}`;
      this.statusBarItem.show();
    });
    this.mask = mask;
  }

  getTreeItem(node: Node): TreeItem {
    return node;
  }

  getChildren(node?: Node): Node[] | Thenable<Node[]> {
    return node ? this.childNodes(node) : this.rootNode();
  }

  refresh(): void {
    this._onTreeRefreshed.fire();
    this._onDidChangeTreeData.fire();
  }

  createPortMapping(node: Node | undefined): void {
    if (node === undefined) {
      this.model.listSubscribers().then(subscribers => {
        this.pick(
          subscribers,
          (s: Subscriber) => {
            const name = s.tags.name !== undefined ? s.tags.name : "no name";
            return `${s.imsi} - ${name}`;
          },
          (imsi: string) => {
            this._createPortMapping(`${imsi}`.split(" ")[0]);
          },
          () => window.setStatusBarMessage("No port mapping to be created", 5 * 1000)
        );
      });
    } else {
      this._createPortMapping(node.resource);
    }
  }

  deletePortMapping(node: Node): void {
    if (node === undefined) {
      this.model.listPortMappings().then(portMappings => {
        this.pick(
          portMappings,
          (p: PortMapping) => p.endpoint,
          (endpoint: string) => {
            this._deletePortMapping(endpoint);
          },
          () => window.setStatusBarMessage("No port mapping to be removed", 5 * 1000)
        );
      });
    } else {
      this._deletePortMapping(node.resource);
    }
  }

  connect(node: Node): void {
    if (node === undefined) {
      this.model.listPortMappings().then(portMappings => {
        this.pick(
          portMappings,
          (p: PortMapping) => p.endpoint,
          (endpoint: string) => this._connect(endpoint),
          () =>
            window.showInformationMessage("No port mapping to connect. Create a new?", "Create").then(clicked => {
              if (clicked === "Create") {
                this.createPortMapping(undefined);
              }
            })
        );
      });
    } else {
      this._connect(node.resource);
    }
  }

  copy(node: Node): void {
    env.clipboard.writeText(node.resource.toString());
  }

  copyAsSshCommand(node: Node): void {
    const [host, port] = node.resource.split(":");
    env.clipboard.writeText(`ssh -p ${port} ${getConfiguration("napter.ssh.user")}@${host}`);
  }

  private _createPortMapping(imsi: string): void {
    const port = <number>getConfiguration("napter.port");
    const duration = <number>getConfiguration("napter.duration") * 60;

    this.model
      .createPortMapping(imsi, port, duration)
      .then(result => {
        this.refresh();
        this._connect(result.endpoint);
      })
      .catch(err => window.showErrorMessage(err.toString()));
  }

  private _deletePortMapping(endpoint: string): void {
    this.model
      .deletePortMapping(endpoint)
      .then(() => this.refresh())
      .catch(err => window.showErrorMessage(err.toString()));
  }

  private _connect(endpoint: string): void {
    const user = getConfiguration("napter.ssh.user");
    window.setStatusBarMessage(
      "SSH connection information is copied to the clipboard. Paste it to the input box and hit enter to connect.",
      5 * 1000
    );
    env.clipboard
      .writeText(`ssh://${user}@${endpoint}`)
      .then(() => commands.executeCommand("opensshremotes.openEmptyWindow"));
  }

  private pick<T>(collection: T[], map: Function, onFulfilled: Function, onRejected: Function): void {
    const candidates = collection.map(p => map(p));
    if (candidates.length > 0) {
      window.showQuickPick(candidates).then(pick => {
        if (pick === undefined) {
          onRejected();
        } else {
          onFulfilled(pick);
        }
      });
    } else {
      onRejected();
    }
  }

  private rootNode(): Promise<Node[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const subscribers = await this.model.listSubscribers();
        this._onTreeRefreshed.fire(this.model.getUserInfo());
        resolve(this.transformToSubscriberNodes(subscribers));
      } catch (e) {
        reject(e);
      }
    });
  }

  private childNodes(node: Node): Promise<Node[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const mappings = await this.model.listPortMappings();
        switch (node.contextValue) {
          case "imsi":
            resolve(this.transformToPortMappingNodes(mappings, node.resource));
            break;
          case "portMapping":
            resolve(this.transformToPortMappingDetailNodes(mappings, node.resource));
            break;
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  private transformToSubscriberNodes(subscribers: Subscriber[]): Node[] {
    return subscribers
      .map(({ imsi, tags }) => ({ imsi, name: tags.name !== undefined ? tags.name : "no name" }))
      .map(({ imsi, name }) => ({
        label: this.masked(imsi, /[\d]{12}$/, "000000000000"),
        description: this.masked(name, /\p{Letter}/giu, "x"),
        resource: imsi
      }))
      .map(({ label, description, resource }) => {
        return {
          label,
          description,
          tooltip: `${label} ${description}`,
          resource,
          collapsibleState: TreeItemCollapsibleState.Collapsed,
          contextValue: "imsi",
          iconPath: this.subscriberIconPath
        };
      });
  }

  private transformToPortMappingNodes(portMappings: PortMapping[], resource: string): Node[] {
    return portMappings
      .filter(({ destination }) => destination.imsi === resource)
      .map(({ endpoint }) => ({
        description: this.masked(endpoint, /\w/gi, "x"),
        resource: endpoint
      }))
      .map(({ description, resource }) => ({
        label: "Port Mapping",
        description,
        tooltip: description,
        resource,
        collapsibleState: TreeItemCollapsibleState.Expanded,
        contextValue: "portMapping",
        iconPath: this.portMappingIconPath
      }));
  }

  private transformToPortMappingDetailNodes(portMappings: PortMapping[], resource: string): Node[] {
    const result = portMappings
      .filter(({ endpoint }) => endpoint === resource)
      .map(
        ({
          hostname,
          ipAddress,
          port,
          duration,
          tlsRequired,
          source: { ipRanges },
          destination: { port: destPort },
          createdTime,
          expiredTime
        }) => ({
          presentation: {
            hostname: this.masked(hostname, /\d/g, "x"),
            ipAddress: this.masked(ipAddress, /\d/g, "x"),
            port: this.masked(port, /\d/g, "x"),
            duration: `${duration / 60 / 60} hours`,
            tlsRequired: `${tlsRequired}`,
            ipRanges: ipRanges.map(ipRange => this.masked(ipRange, /\d/g, "x")).join(", "),
            destPort: this.masked(destPort, /\d/g, "x"),
            createdTime: toDate(createdTime),
            expiredTime: toDate(expiredTime)
          },
          resource: {
            hostname,
            ipAddress,
            port,
            duration,
            tlsRequired,
            ipRanges,
            destPort,
            createdTime,
            expiredTime
          }
        })
      )
      .map(({ presentation, resource }) => {
        return [
          {
            label: "Hostname",
            description: presentation.hostname,
            tooltip: presentation.hostname,
            resource: resource.hostname,
            collapsibleState: TreeItemCollapsibleState.None,
            contextValue: "portMappingEntry"
          },
          {
            label: "IP Address",
            description: presentation.ipAddress,
            tooltip: presentation.ipAddress,
            resource: resource.ipAddress,
            collapsibleState: TreeItemCollapsibleState.None,
            contextValue: "portMappingEntry"
          },
          {
            label: "Port",
            description: presentation.port,
            tooltip: presentation.port,
            resource: resource.port,
            collapsibleState: TreeItemCollapsibleState.None,
            contextValue: "portMappingEntry"
          },
          {
            label: "Duration",
            description: presentation.duration,
            tooltip: presentation.duration,
            resource: resource.duration,
            collapsibleState: TreeItemCollapsibleState.None,
            contextValue: "portMappingEntry"
          },
          {
            label: "TLS Required",
            description: presentation.tlsRequired,
            tooltip: presentation.tlsRequired,
            resource: resource.tlsRequired,
            collapsibleState: TreeItemCollapsibleState.None,
            contextValue: "portMappingEntry"
          },
          {
            label: "Destination Port",
            description: presentation.destPort,
            tooltip: presentation.destPort,
            resource: resource.destPort,
            collapsibleState: TreeItemCollapsibleState.None,
            contextValue: "portMappingEntry"
          },
          {
            label: "Source IP Addresses Ranges",
            description: presentation.ipRanges,
            tooltip: presentation.ipRanges,
            resource: resource.ipRanges,
            collapsibleState: TreeItemCollapsibleState.None,
            contextValue: "portMappingEntry"
          },
          {
            label: "Created",
            description: presentation.createdTime,
            tooltip: presentation.createdTime,
            resource: resource.createdTime,
            collapsibleState: TreeItemCollapsibleState.None,
            contextValue: ""
          },
          {
            label: "Expired",
            description: presentation.expiredTime,
            tooltip: presentation.expiredTime,
            resource: resource.expiredTime,
            collapsibleState: TreeItemCollapsibleState.None,
            contextValue: ""
          }
        ];
      });
    return <Node[]>result[0];
  }

  set mask(value: boolean) {
    this._mask = value;
  }

  private masked(value: string | number, pattern: RegExp, replaceValue: string): string {
    if (this._mask) {
      return value.toString().replace(pattern, replaceValue);
    }
    return value.toString();
  }
}

function getConfiguration(section: string) {
  return workspace.getConfiguration("soracom").get(section);
}

function toDate(date: number): string {
  return new Date(date).toLocaleString();
}
