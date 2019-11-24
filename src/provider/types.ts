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
  PORT_MAPPING_ENTRY = "portMappingEntry"
}
