import { Command, TreeItem, TreeItemCollapsibleState } from "vscode";

export class Node extends TreeItem {
  label?: string;
  description?: string;
  collapsibleState?: TreeItemCollapsibleState;
  command?: Command;
  resource = "";
  contextValue = "";
}
