import { env, Event, EventEmitter, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri, window } from "vscode";
import { ContextValue, Node } from "./types";
import { SoracomModel } from "../model/SoracomModel";
import { SessionEvent, Subscriber } from "../model/types";

export class SimDataProvider implements TreeDataProvider<Node> {
  private _onDidChangeTreeData: EventEmitter<Node | undefined> = new EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData: Event<Node | undefined> = this._onDidChangeTreeData.event;

  private _mask: boolean = false;
  private _imsi: string = "";

  constructor(private readonly model: SoracomModel, mask: boolean) {
    this.mask = mask;
  }

  getTreeItem(node: Node): TreeItem {
    return node;
  }

  updateSelected(imsi: string) {
    this.imsi = imsi;
    this.refresh();
  }

  getChildren(node?: Node): Node[] | Thenable<Node[]> {
    return node ? this.childNodes(node) : this.rootNode();
  }

  private rootNode(): Promise<Node[]> {
    return new Promise(async (resolve, reject) => {
      if (this._imsi !== "") {
        try {
          const subscriber = await this.model.getSubscriber(this.imsi);
          resolve(this.transformToSubscriberDetailNodes(subscriber));
        } catch (e) {
          reject(e);
        }
      }
      resolve([]);
    });
  }

  private childNodes(node: Node): Promise<Node[]> {
    return new Promise(async (resolve, reject) => {
      switch (node.contextValue) {
        case ContextValue.SIM_SESSION_STATUS:
          try {
            const sessionEvents = await this.model.listSessionEvents(node.resource);
            resolve(this.transformToSessionEventsNodes(sessionEvents));
          } catch (e) {
            reject(e);
          }
          break;
      }
      reject([]);
    });
  }

  private transformToSubscriberDetailNodes({
    imsi,
    moduleType,
    tags,
    sessionStatus,
    groupId,
    msisdn,
    subscription,
    ipAddress,
    speedClass
  }: Subscriber): Node[] {
    return [
      {
        label: "IMSI",
        description: this.masked(imsi, /[\d]{12}$/, "000000000000"),
        tooltip: imsi,
        resource: imsi,
        collapsibleState: TreeItemCollapsibleState.None,
        contextValue: ContextValue.SIM_DETAIL_ENTRY
      },
      {
        label: "Name",
        description: tags.name === null ? "no name" : this.masked(tags.name, /\p{Letter}/giu, "x"),
        tooltip: tags.name === null ? "no name" : tags.name,
        resource: tags.name === null ? "no name" : tags.name,
        collapsibleState: TreeItemCollapsibleState.None,
        contextValue: ContextValue.SIM_DETAIL_ENTRY
      },
      {
        label: "Group ID",
        description: groupId === null ? "no group" : groupId,
        tooltip: groupId === null ? "no group" : groupId,
        resource: groupId === null ? "" : groupId,
        collapsibleState: TreeItemCollapsibleState.None,
        contextValue: ContextValue.SIM_DETAIL_ENTRY_GROUP
      },
      {
        label: "Plan",
        description: subscription,
        tooltip: subscription,
        resource: subscription,
        collapsibleState: TreeItemCollapsibleState.None,
        contextValue: ContextValue.SIM_DETAIL_ENTRY
      },
      {
        label: "Module Type",
        description: moduleType,
        tooltip: moduleType,
        resource: moduleType,
        collapsibleState: TreeItemCollapsibleState.None,
        contextValue: ContextValue.SIM_DETAIL_ENTRY
      },
      {
        label: "Speed",
        description: speedClass,
        tooltip: speedClass,
        resource: speedClass,
        collapsibleState: TreeItemCollapsibleState.None,
        contextValue: ContextValue.SIM_DETAIL_ENTRY
      },
      {
        label: "IMEI",
        description: this.masked(sessionStatus.imei, /\d/g, "x"),
        tooltip: sessionStatus.imei,
        resource: sessionStatus.imei,
        collapsibleState: TreeItemCollapsibleState.None,
        contextValue: ContextValue.SIM_DETAIL_ENTRY
      },
      {
        label: "MSISDN",
        description: this.masked(msisdn, /\d/g, "x"),
        tooltip: msisdn,
        resource: msisdn,
        collapsibleState: TreeItemCollapsibleState.None,
        contextValue: ContextValue.SIM_DETAIL_ENTRY
      },
      {
        label: "Session",
        description: sessionStatus.online ? "Online" : "Offline",
        tooltip: sessionStatus.online ? "Online" : "Offline",
        resource: sessionStatus.online ? "Online" : "Offline",
        collapsibleState: TreeItemCollapsibleState.None,
        contextValue: ContextValue.SIM_DETAIL_ENTRY
      },
      {
        label: "IP Address",
        description: this.masked(ipAddress, /\d/g, "x"),
        tooltip: ipAddress,
        resource: ipAddress,
        collapsibleState: TreeItemCollapsibleState.None,
        contextValue: ContextValue.SIM_DETAIL_ENTRY
      },
      {
        label: "Session Events",
        description: "",
        resource: imsi,
        collapsibleState: TreeItemCollapsibleState.Collapsed,
        contextValue: ContextValue.SIM_SESSION_STATUS
      }
    ];
  }

  private transformToSessionEventsNodes(events: SessionEvent[]): Node[] {
    return events
      .map(e => (typeof e.cell === "undefined" ? Object.assign(e, { cell: { radioType: "unknown" } }) : e))
      .map(({ cell: { radioType }, event, imei, time }) => {
        return {
          label: event,
          description: `${toDate(time)} - ${this.masked(imei, /\d/g, "x")} - ${radioType.toUpperCase()}`,
          tooltip: `${event}: ${toDate(time)} - ${imei} - ${radioType.toUpperCase()}`,
          resource: `${event}: ${toDate(time)} - ${imei} - ${radioType.toUpperCase()}`,
          collapsibleState: TreeItemCollapsibleState.None,
          contextValue: ContextValue.SIM_SESSION_EVENT
        };
      });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  copy(node: Node): void {
    env.clipboard.writeText(node.resource.toString());
  }

  openGroupExternal(node: Node): void {
    if (node.resource === "") {
      window.setStatusBarMessage("Do nothing as no group is configured for selected SIM", 5 * 1000);
    } else {
      env.openExternal(Uri.parse(`https://console.soracom.io/#/groups?id=${node.resource}`));
    }
  }

  get imsi(): string {
    return this._imsi;
  }

  set imsi(value: string) {
    this._imsi = value;
  }

  set mask(value: boolean) {
    this._mask = value;
  }

  get mask() {
    return this._mask;
  }

  private masked(value: string | number, pattern: RegExp, replaceValue: string): string {
    if (this.mask) {
      return value.toString().replace(pattern, replaceValue);
    }
    return value.toString();
  }
}

function toDate(date: number): string {
  return new Date(date).toLocaleString();
}
