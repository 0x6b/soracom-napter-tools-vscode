import { Command, TreeItem, TreeItemCollapsibleState } from "vscode";

export class Node extends TreeItem {
  label?: string;
  description?: string;
  collapsibleState?: TreeItemCollapsibleState;
  command?: Command;
  resource = "";
  contextValue = "";
}

export enum ContextValue {
  NONE = "none",
  IMSI = "imsi",
  PORT_MAPPING = "portMapping",
  PORT_MAPPING_ENTRY = "portMappingEntry",
  SIM_DETAIL_ENTRY = "simDetailEntry",
  SIM_DETAIL_ENTRY_GROUP = "simDetailEntryGroup",
  SIM_SESSION_STATUS = "simSessionStatus",
  SIM_SESSION_EVENT = "simSessionEvent",
  SIM_AUDIT_LOG = "simAuditLog",
  SIM_AUDIT_LOG_ENTRY = "simAuditLogEvent"
}
