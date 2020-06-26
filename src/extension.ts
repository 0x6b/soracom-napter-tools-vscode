import { join } from "path";
import { readdirSync, readFileSync } from "fs";
import { homedir } from "os";
import { commands, ConfigurationChangeEvent, env, ExtensionContext, Uri, window, workspace } from "vscode";
import { SoracomClient } from "./client/SoracomClient";
import { SoracomModel } from "./model/SoracomModel";
import { NapterDataProvider } from "./provider/NapterDataProvider";
import { SimDataProvider } from "./provider/SimDataProvider";
import { ApiEndpoint, SoracomConfiguration } from "./types";

const VSCODE_CONFIG_KEY = "soracom";
const CONFIG_DIR = join(process.env.SORACOM_PROFILE_DIR || homedir(), ".soracom");

// @ts-ignore: noUnusedParameters
export function activate(context: ExtensionContext) {
  let id = getConfiguration("auth.authkey.id") as string;
  let secret = getConfiguration("auth.authkey.secret") as string;
  const profiles: SoracomConfiguration[] = getProfiles();

  const profile = getProfileFor(profiles, getConfiguration("auth.profileName") as string);
  if (profile) {
    id = profile.authKeyId;
    secret = profile.authKey;
  }

  const endpoint = getConfiguration("endpoint") as string;
  const mask = getConfiguration("mask") as boolean;

  if (id !== "" && secret !== "") {
    const client = new SoracomClient(id, secret, endpoint);
    const model = new SoracomModel(client);
    const napterDataProvider = new NapterDataProvider(model, mask);
    const simDataProvider = new SimDataProvider(model, mask);

    window.registerTreeDataProvider("napterDataProvider", napterDataProvider);
    window.registerTreeDataProvider("simDataProvider", simDataProvider);

    commands.registerCommand("napterDataProvider.refresh", () => napterDataProvider.refresh());
    commands.registerCommand("napterDataProvider.toggleCoverage", () => {
      switch (getConfiguration("endpoint")) {
        case ApiEndpoint.jp:
          workspace
            .getConfiguration(VSCODE_CONFIG_KEY)
            .update("endpoint", ApiEndpoint.g, true)
            .then(() => napterDataProvider.refresh());
          break;
        case ApiEndpoint.g:
          workspace
            .getConfiguration(VSCODE_CONFIG_KEY)
            .update("endpoint", ApiEndpoint.jp, true)
            .then(() => napterDataProvider.refresh());
          break;
      }
    });
    commands.registerCommand("napterDataProvider.createPortMapping", (arg) =>
      napterDataProvider.createPortMapping(arg)
    );
    commands.registerCommand("napterDataProvider.deletePortMapping", (arg) =>
      napterDataProvider.deletePortMapping(arg)
    );
    commands.registerCommand("napterDataProvider.connect", (arg) => napterDataProvider.connect(arg));
    commands.registerCommand("napterDataProvider.copy", (arg) => napterDataProvider.copy(arg));
    commands.registerCommand("napterDataProvider.copyAsSshCommand", (arg) => napterDataProvider.copyAsSshCommand(arg));
    commands.registerCommand("openUserConsole", () => env.openExternal(Uri.parse("https://console.soracom.io")));

    commands.registerCommand("simDataProvider.copy", (arg) => simDataProvider.copy(arg));
    commands.registerCommand("simDataProvider.openGroupExternal", (arg) => simDataProvider.openGroupExternal(arg));
    commands.registerCommand("simDataProvider.refresh", () => simDataProvider.refresh());

    napterDataProvider.addSubscriberChangeEventListener((e) => simDataProvider.updateSelected(e));
    commands.registerCommand("napterDataProvider.fireSubscriberChangeEvent", (arg) =>
      napterDataProvider.fireSubscriberChangeEvent(arg)
    );

    workspace.onDidChangeConfiguration((e) => {
      if (isAffected(e, "auth.authkey.id") && (!getConfiguration("auth.useCliConfiguration") as boolean)) {
        client.authKeyId = getConfiguration("auth.authkey.id") as string;
        napterDataProvider.refresh();
        simDataProvider.refresh();
      }
      if (isAffected(e, "auth.authkey.secret") && (!getConfiguration("auth.useCliConfiguration") as boolean)) {
        client.authKeySecret = getConfiguration("auth.authkey.secret") as string;
        napterDataProvider.refresh();
        simDataProvider.refresh();
      }
      if (isAffected(e, "endpoint")) {
        client.endpoint = getConfiguration("endpoint") as string;
        napterDataProvider.refresh();
        simDataProvider.refresh();
      }
      if (isAffected(e, "mask")) {
        const m = getConfiguration("mask") as boolean;
        napterDataProvider.mask = m;
        simDataProvider.mask = m;
        napterDataProvider.refresh();
        simDataProvider.refresh();
      }
      if (isAffected(e, "auth.profileName") && (getConfiguration("auth.useCliConfiguration") as boolean)) {
        const newProfile = getProfileFor(profiles, getConfiguration("auth.profileName") as string);
        if (newProfile) {
          client.authKeyId = newProfile.authKeyId;
          client.authKeySecret = newProfile.authKey;
          napterDataProvider.refresh();
          simDataProvider.refresh();
        }
      }
    });
  } else {
    window
      .showInformationMessage("Configure SORACOM API credentials in the preferences", "Open Preferences")
      .then((clicked) => {
        if (clicked === "Open Preferences") {
          commands.executeCommand("workbench.action.openSettings", "SORACOM Auth");
        }
      });
  }
}

// tslint:disable-next-line:no-empty
export function deactivate() {}

function isAffected(e: ConfigurationChangeEvent, key: string) {
  return e.affectsConfiguration(VSCODE_CONFIG_KEY + "." + key);
}

function getConfiguration(section: string) {
  return workspace.getConfiguration(VSCODE_CONFIG_KEY).get(section);
}

function getProfiles(): SoracomConfiguration[] {
  const useCliConfiguration = getConfiguration("auth.useCliConfiguration") as boolean;
  if (useCliConfiguration) {
    return readdirSync(join(CONFIG_DIR), { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((f) => {
        return Object.assign(
          { name: f.name.replace(/\.json$/, "") },
          JSON.parse(readFileSync(join(CONFIG_DIR, f.name), "utf8"))
        ) as SoracomConfiguration;
      })
      .filter((p) => !p.sandbox);
  }
  return [];
}

function getProfileFor(profiles: SoracomConfiguration[], name: string): SoracomConfiguration | null {
  if (profiles.length > 0) {
    const candidate = profiles.filter((p) => p.name === name);
    if (candidate.length > 0) {
      return candidate[0];
    }
  }
  return null;
}
