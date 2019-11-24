import { commands, ConfigurationChangeEvent, env, ExtensionContext, Uri, window, workspace } from "vscode";
import { SoracomClient } from "./client/SoracomClient";
import { SoracomModel } from "./model/SoracomModel";
import { NapterDataProvider } from "./provider/NapterDataProvider";

const CONFIG_KEY = "soracom";
enum apiEndpoint {
  jp = "https://api.soracom.io",
  g = "https://g.api.soracom.io"
}

// @ts-ignore: noUnusedParameters
export function activate(context: ExtensionContext) {
  const id = getConfiguration("authkey.id");
  const secret = getConfiguration("authkey.secret");
  const endpoint = getConfiguration("endpoint");
  const mask = getConfiguration("mask");

  if (id !== "" && secret !== "") {
    const client = new SoracomClient(id as string, secret as string, endpoint as string);
    const model = new SoracomModel(client);
    const provider = new NapterDataProvider(model, mask as boolean);

    window.registerTreeDataProvider("napterDataProvider", provider);

    commands.registerCommand("napterDataProvider.refresh", () => provider.refresh());
    commands.registerCommand("napterDataProvider.toggleCoverage", () => {
      switch (getConfiguration("endpoint")) {
        case apiEndpoint.jp:
          workspace
            .getConfiguration(CONFIG_KEY)
            .update("endpoint", apiEndpoint.g, true)
            .then(() => provider.refresh());
          break;
        case apiEndpoint.g:
          workspace
            .getConfiguration(CONFIG_KEY)
            .update("endpoint", apiEndpoint.jp, true)
            .then(() => provider.refresh());
          break;
      }
    });
    commands.registerCommand("napterDataProvider.createPortMapping", arg => provider.createPortMapping(arg));
    commands.registerCommand("napterDataProvider.deletePortMapping", arg => provider.deletePortMapping(arg));
    commands.registerCommand("napterDataProvider.connect", arg => provider.connect(arg));
    commands.registerCommand("napterDataProvider.copy", arg => provider.copy(arg));
    commands.registerCommand("napterDataProvider.copyAsSshCommand", arg => provider.copyAsSshCommand(arg));
    commands.registerCommand("openUserConsole", () => env.openExternal(Uri.parse("https://console.soracom.io")));

    workspace.onDidChangeConfiguration(e => {
      if (isAffected(e, "authkey.id")) {
        client.authKeyId = getConfiguration("authkey.id") as string;
        provider.refresh();
      }
      if (isAffected(e, "authkey.secret")) {
        client.authKeySecret = getConfiguration("authkey.secret") as string;
        provider.refresh();
      }
      if (isAffected(e, "endpoint")) {
        client.endpoint = getConfiguration("endpoint") as string;
        provider.refresh();
      }
      if (isAffected(e, "mask")) {
        provider.mask = getConfiguration("mask") as boolean;
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

function isAffected(e: ConfigurationChangeEvent, key: string) {
  return e.affectsConfiguration(CONFIG_KEY + "." + key);
}

function getConfiguration(section: string) {
  return workspace.getConfiguration(CONFIG_KEY).get(section);
}
