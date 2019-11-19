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
import { NapterModel } from "../model/NapterModel";
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

  constructor(private readonly model: NapterModel) {
    this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 0);
    this.statusBarItem.tooltip = "SORACOM Operator. Click to open User Console";
    this.statusBarItem.command = "openUserConsole";

    this.onTreeRefreshed(e => {
      this.statusBarItem.text = `$(info) ${e.userName}@${e.operatorId}`;
      this.statusBarItem.show();
    });
  }

  getTreeItem(node: Node): TreeItem {
    return node;
  }

  getChildren(node?: Node): Node[] | Thenable<Node[]> {
    return node ? this.childNodes(node) : this.rootNode();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  createPortMapping(node: Node | undefined): void {
    if (node === undefined) {
      this.model.getSubscribers().then(subscribers => {
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

  removePortMapping(node: Node): void {
    if (node === undefined) {
      this.model.getPortMappings().then(portMappings => {
        this.pick(
          portMappings,
          (p: PortMapping) => p.endpoint,
          (endpoint: string) => {
            this._removePortMapping(endpoint);
          },
          () => window.setStatusBarMessage("No port mapping to be removed", 5 * 1000)
        );
      });
    } else {
      this._removePortMapping(node.resource);
    }
  }

  connect(node: Node): void {
    if (node === undefined) {
      this.model.getPortMappings().then(portMappings => {
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
    env.clipboard.writeText(node.resource);
  }

  private _createPortMapping(imsi: string): void {
    const port = <number>getConfiguration("napter.port");
    const duration =
      typeof getConfiguration("napter.duration") === "undefined" // not sure why config is null sometimes
        ? <number>getConfiguration("napter.duration") * 60
        : 30 * 60;
    const tlsRequired = <boolean>getConfiguration("napter.tlsRequired");

    this.model
      .createPortMapping(imsi, port, duration, tlsRequired)
      .then(result => {
        this.refresh();
        this._connect(result.endpoint);
      })
      .catch(err => window.showErrorMessage(err.toString()));
  }

  private _removePortMapping(endpoint: string): void {
    this.model
      .removePortMapping(endpoint)
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
        const subscribers = await this.model.getSubscribers();
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
        const mappings = await this.model.getPortMappings();
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
    return subscribers.map(s => {
      const name = s.tags.name !== undefined ? s.tags.name : "no name";
      return {
        label: s.imsi,
        description: name,
        tooltip: `${s.imsi} ${name}`,
        resource: s.imsi,
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
        label: "Port Mapping",
        description: endpoint,
        tooltip: endpoint,
        resource: endpoint,
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
        }) => {
          return [
            {
              label: "Hostname",
              description: hostname,
              tooltip: hostname,
              resource: hostname,
              collapsibleState: TreeItemCollapsibleState.None,
              contextValue: "portMappingEntry"
            },
            {
              label: "IP Address",
              description: ipAddress,
              tooltip: ipAddress,
              resource: ipAddress,
              collapsibleState: TreeItemCollapsibleState.None,
              contextValue: "portMappingEntry"
            },
            {
              label: "Port",
              description: `${port}`,
              tooltip: `${port}`,
              resource: port,
              collapsibleState: TreeItemCollapsibleState.None,
              contextValue: "portMappingEntry"
            },
            {
              label: "Duration",
              description: `${duration / 60 / 60} hours`,
              tooltip: `${duration / 60 / 60} hours`,
              resource: duration,
              collapsibleState: TreeItemCollapsibleState.None,
              contextValue: "portMappingEntry"
            },
            {
              label: "TLS Required",
              description: `${tlsRequired}`,
              tooltip: `${tlsRequired}`,
              resource: tlsRequired,
              collapsibleState: TreeItemCollapsibleState.None,
              contextValue: "portMappingEntry"
            },
            {
              label: "Destination Port",
              description: `${destPort}`,
              tooltip: `${destPort}`,
              resource: destPort,
              collapsibleState: TreeItemCollapsibleState.None,
              contextValue: "portMappingEntry"
            },
            {
              label: "Source IP Addresses Ranges",
              description: `${ipRanges.join(", ")}`,
              tooltip: `${ipRanges.join(", ")}`,
              resource: ipRanges,
              collapsibleState: TreeItemCollapsibleState.None,
              contextValue: "portMappingEntry"
            },
            {
              label: "Created",
              description: toDate(createdTime),
              tooltip: toDate(createdTime),
              resource: createdTime,
              collapsibleState: TreeItemCollapsibleState.None,
              contextValue: ""
            },
            {
              label: "Expired",
              description: toDate(expiredTime),
              tooltip: toDate(expiredTime),
              resource: expiredTime,
              collapsibleState: TreeItemCollapsibleState.None,
              contextValue: ""
            }
          ];
        }
      );
    return <Node[]>result[0];
  }
}

function getConfiguration(section: string) {
  return workspace.getConfiguration("soracom").get(section);
}

function toDate(date: number): string {
  return new Date(date).toLocaleString();
}
