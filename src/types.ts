export enum ApiEndpoint {
  jp = "https://api.soracom.io",
  g = "https://g.api.soracom.io"
}

export interface SoracomConfiguration {
  name: string;
  sandbox: boolean;
  coverageType: "jp" | "g";
  authKeyId: string;
  authKey: string;
  registerPaymentMethod: boolean;
}
