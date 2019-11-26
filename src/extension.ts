import { commands, ConfigurationChangeEvent, env, ExtensionContext, Uri, window, workspace } from "vscode";
import { SoracomClient } from "./client/SoracomClient";
import { SoracomModel } from "./model/SoracomModel";
import { NapterDataProvider } from "./provider/NapterDataProvider";
import { SimDataProvider } from "./provider/SimDataProvider";

const CONFIG_KEY = "soracom";
enum apiEndpoint {
  jp = "https://api.soracom.io",
  g = "https://g.api.soracom.io"
}

// @ts-ignore: noUnusedParameters
export function activate(context: ExtensionContext) {
  const id = getConfiguration("authkey.id") as string;
  const secret = getConfiguration("authkey.secret") as string;
  const endpoint = getConfiguration("endpoint") as string;
  const mask = getConfiguration("mask") as boolean;

  if (id !== "" && secret !== "") {
    const client = new SoracomClient(id, secret, endpoint);
    const model = new SoracomModel(client);
    const provider = new NapterDataProvider(model, mask);
    const simDataProvider = new SimDataProvider(model, mask);

    window.registerTreeDataProvider("napterDataProvider", provider);
    window.registerTreeDataProvider("simDataProvider", simDataProvider);
    provider.addSubscriberChangeEventListener(e => simDataProvider.updateSelected(e));

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

    commands.registerCommand("simDataProvider.copy", arg => simDataProvider.copy(arg));
    commands.registerCommand("simDataProvider.openGroupExternal", arg => simDataProvider.openGroupExternal(arg));

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
