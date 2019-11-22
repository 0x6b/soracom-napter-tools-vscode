# soracom-napter-tools

This extension will assist you working with SORACOM Napter with Visual Studio Code.

Napter is an on-demand networking service for devices using Soracom Air for Cellular SIM cards, which enables you to quickly and securely access your devices remotely. Napter allows you to perform remote maintenance, troubleshooting, or other typical remote access tasks, without setting up any relay servers or installing agent software on the device.

## Requirements

- [**Visual Studio Code**](https://code.visualstudio.com/), tested on v1.40.0.
- [**Visual Studio Code Remote - SSH Extension**](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh), tested on v0.47.2. See [Connect over SSH with Visual Studio Code](https://code.visualstudio.com/remote-tutorials/ssh/getting-started) for setup.
- **SORACOM user account**. See [SORACOM Air for セルラーの利用方法](https://soracom.jp/start/) (Japanese) or [Getting Started | Soracom IoT Connectivity](https://www.soracom.io/getting-started/) (English) for detail.
- **SORACOM API credential**. Follow [SORACOM API 利用ガイド](https://dev.soracom.io/jp/docs/api_guide/) (Japanese) or [Soracom API Usage Guide](https://developers.soracom.io/en/docs/tools/api-reference/) (English) to configure your AuthKey ID and Secret. See [Supported Authentication Method](#supported-authentication-method).
- **SSH server connected with SORACOM IoT SIM** e.g. Raspberry Pi with USB dongle. Soracom provides [通信モジュール/USB ドングル](https://soracom.jp/products/module/) at the [User Console](https://console.soracom.io) or [US Online Store](https://www.soracom.io/us-store/).

## Usage

Open the Explorer in the side bar and you can see **Your SORACOM SIMs** view. You can see your _online_ SIMs and list, create, and delete Napter port mappings. This extension contributes the following commands to your Visual Studio Code.

|          View Icon           | Command                                                                 | Description                                                                                                                                                           |
| :--------------------------: | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![](media/remote-light.png)  | SORACOM Napter: Create New Port Mapping                                 | Create new port mapping.                                                                                                                                              |
|              -               | SORACOM Napter: Delete Port Mapping                                     | Delete existing port mapping. Also you can delete port mapping from right click menu.                                                                                 |
| ![](media/console-light.png) | SORACOM Napter: Connect via Visual Studio Code 'Remote - SSH' Extension | Open input box for **Remote - SSH** extension while copying connection string (`ssh://user@host:port`) in the clipboard. You can paste it and press enter to connect. |
| ![](media/refresh-light.png) | SORACOM Napter: Refresh                                                 | Refresh **Your SORACOM SIMs** view in the Explorer.                                                                                                                   |
|  ![](media/globe-light.png)  | SORACOM Napter: Toggle Coverage                                         | Toggle coverage between Japan and Global.                                                                                                                             |
| ![](media/clippy-light.png)  | -                                                                       | Copy item value to the clipboard if applicable.                                                                                                                       |
|              -               | SORACOM: Open User Console                                              | Open [SORACOM User Console](https://console.soracom.io) in your browser.                                                                                              |

## Extension Settings

This extension contributes the following settings.

| Key                       | Description                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| `soracom.authkey.id`      | SORACOM API AuthKey ID                                               |
| `soracom.authkey.secret`  | SORACOM API AuthKey secret                                           |
| `soracom.endpoint`        | Specifies coverage for SORACOM                                       |
| `soracom.napter.duration` | Specifies default minutes for SORACOM Napter port mapping duration   |
| `soracom.napter.port`     | Specifies default remote port number for SORACOM Napter port mapping |
| `soracom.napter.ssh.user` | Specifies default remote user name for SORACOM Napter port mapping   |

## Supported Authentication Method

Authkey method is recommended for security reason. Email and password should work but not tested.

| User type    | Email and password | AuthKey ID and AuthKey secret |
| ------------ | ------------------ | ----------------------------- |
| Root account | -                  | supported                     |
| SAM user     | -                  | supported                     |

## Known Limitation

- You cannot specify source IP addresses ranges.

## TODOs or Ideas

- i18n
- group by SIM group
- group by coverage
- show audit log
- [soracom/soracom-cli](https://github.com/soracom/soracom-cli/) configuration file (`~/.soracom/*.json`) and profiles support

## References

- Japanese
  - [IoT プラットフォーム 株式会社ソラコム](https://soracom.jp/)
  - [SORACOM Napter とは | ユーザーガイド | SORACOM Developers](https://dev.soracom.io/jp/napter/what-is-napter/)
- English
  - [Soracom | Cellular IoT Cloud Connectivity](https://www.soracom.io/)
  - [Soracom Napter Overview | SORACOM Developers](https://developers.soracom.io/en/docs/napter/)

## License

MIT. See [LICENSE](LICENSE) for details.

See license for [SORACOM Icons Set](https://dev.soracom.io/jp/docs/sis/) and [microsoft/vscode-icons](https://github.com/microsoft/vscode-icons) for icons.

---

**Enjoy remote development with SORACOM Napter!**
