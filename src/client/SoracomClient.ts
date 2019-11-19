import axios, { AxiosInstance } from "axios";
import { ApiParams } from "./types";

export class SoracomClient {
  private _authKeyId: string;
  private _authKeySecret: string;
  private _endpoint: string;
  private _apiKey: string = "";
  private _token: string = "";
  private _lastAuthenticated: number = 0;
  private _operatorId: string = "";
  private _userName: string = "";

  private readonly axios: AxiosInstance;

  constructor(authKeyId: string, authKeySecret: string, endpoint: string) {
    this._authKeyId = authKeyId;
    this._authKeySecret = authKeySecret;
    this._endpoint = endpoint;
    this.axios = axios.create({
      headers: { "user-agent": "vscode-soracom-napter-tools" }
    });
    this.axios.defaults.headers.post["content-type"] = "application/json";
  }

  public async auth() {
    const { data, status, statusText } = await this.callApi({
      method: "POST",
      path: "/v1/auth",
      body: {
        authKeyId: this._authKeyId,
        authKey: this._authKeySecret
      }
    });
    if (status === 200) {
      this.apiKey = data.apiKey;
      this.token = data.token;
      this.operatorId = data.operatorId;
      this.userName = data.userName;
    } else {
      throw new Error(statusText);
    }
  }

  public async callApi(params: ApiParams) {
    if (new Date().getTime() - this.lastAuthenticated > 60 * 60 * 20 * 1000) {
      try {
        this.lastAuthenticated = new Date().getTime();
        await this.auth();
      } catch (e) {
        throw new Error(e);
      }
    }

    const headers = Object.assign(
      {
        "x-soracom-api-key": this.apiKey,
        "x-soracom-token": this.token
      },
      params.headers
    );

    let url: string = `${this.endpoint}${params.path}`;
    if (params.query !== undefined) {
      let q = [];
      for (const [key, value] of Object.entries(params.query)) {
        q.push(`${key}=${value}`);
      }
      url = `${url}?${q.join("&")}`;
    }

    return this.axios({
      url,
      headers,
      method: params.method,
      data: params.body
    });
  }

  set authKeyId(value: string) {
    this._authKeyId = value;
    this.lastAuthenticated = 0;
  }

  set authKeySecret(value: string) {
    this._authKeySecret = value;
    this.lastAuthenticated = 0;
  }

  get endpoint(): string {
    return this._endpoint;
  }

  set endpoint(value: string) {
    this._endpoint = value;
    this.lastAuthenticated = 0;
  }

  private get apiKey(): string {
    return this._apiKey;
  }

  private set apiKey(value: string) {
    this._apiKey = value;
  }

  private get token(): string {
    return this._token;
  }

  private set token(value: string) {
    this._token = value;
  }

  private get lastAuthenticated(): number {
    return this._lastAuthenticated;
  }

  private set lastAuthenticated(value: number) {
    this._lastAuthenticated = value;
  }

  get operatorId(): string {
    return this._operatorId;
  }

  set operatorId(value: string) {
    this._operatorId = value;
  }

  get userName(): string {
    return this._userName;
  }

  set userName(value: string) {
    this._userName = value;
  }
}
