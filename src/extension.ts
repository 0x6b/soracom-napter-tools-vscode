import { commands, env, ExtensionContext, Uri, window, workspace } from "vscode";
import { SoracomClient } from "./client/SoracomClient";
import { SoracomModel } from "./model/SoracomModel";
import { NapterDataProvider } from "./provider/NapterDataProvider";

// @ts-ignore: noUnusedParameters
export function activate(context: ExtensionContext) {
  const id = getConfiguration("authkey.id");
  const secret = getConfiguration("authkey.secret");
  const endpoint = getConfiguration("endpoint");
  const mask = getConfiguration("debug.mask");

  if (id !== "" && secret !== "") {
    const client = new SoracomClient(id as string, secret as string, endpoint as string);
    const model = new SoracomModel(client);
    const provider = new NapterDataProvider(model, mask as boolean);

    window.registerTreeDataProvider("napterDataProvider", provider);

    commands.registerCommand("napterDataProvider.refresh", () => provider.refresh());
    commands.registerCommand("napterDataProvider.toggleCoverage", () => {
      if (getConfiguration("endpoint") === "https://api.soracom.io") {
        workspace
          .getConfiguration("soracom")
          .update("endpoint", "https://g.api.soracom.io", true)
          .then(() => provider.refresh());
      } else {
        workspace
          .getConfiguration("soracom")
          .update("endpoint", "https://api.soracom.io", true)
          .then(() => provider.refresh());
      }
    });
    commands.registerCommand("napterDataProvider.createPortMapping", arg => provider.createPortMapping(arg));
    commands.registerCommand("napterDataProvider.deletePortMapping", arg => provider.deletePortMapping(arg));
    commands.registerCommand("napterDataProvider.connect", arg => provider.connect(arg));
    commands.registerCommand("napterDataProvider.copy", arg => provider.copy(arg));
    commands.registerCommand("napterDataProvider.copyAsSshCommand", arg => provider.copyAsSshCommand(arg));
    commands.registerCommand("openUserConsole", () => env.openExternal(Uri.parse("https://console.soracom.io")));

    workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration("soracom.authkey.id")) {
        client.authKeyId = getConfiguration("authkey.id") as string;
        provider.refresh();
      }
      if (e.affectsConfiguration("soracom.authkey.secret")) {
        client.authKeySecret = getConfiguration("authkey.secret") as string;
        provider.refresh();
      }
      if (e.affectsConfiguration("soracom.endpoint")) {
        client.endpoint = getConfiguration("endpoint") as string;
        provider.refresh();
      }
      if (e.affectsConfiguration("soracom.debug.mask")) {
        provider.mask = getConfiguration("debug.mask") as boolean;
        provider.refresh();
      }
    });
  } else {
    window
      .showInformationMessage("Configure SORACOM API credentials in the preferences", "Open Preferences")
      .then(clicked => {
        if (clicked === "Open Preferences") {
          commands.executeCommand("workbench.action.openSettings", "SORACOM Authkey");
        }
      });
  }
}

// tslint:disable-next-line:no-empty
export function deactivate() {}

function getConfiguration(section: string) {
  return workspace.getConfiguration("soracom").get(section);
}
