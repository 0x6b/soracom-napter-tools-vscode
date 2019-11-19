import { SoracomClient } from "../client/SoracomClient";
import { PortMapping, Subscriber, User } from "./types";

export class NapterModel {
  constructor(private readonly client: SoracomClient) {}

  public async getSubscribers(): Promise<Subscriber[]> {
    const { data, status, statusText } = await this.client.callApi({
      method: "GET",
      path: "/v1/subscribers",
      query: { status_filter: "active", limit: "1000" }
    });
    if (status !== 200) {
      throw new Error(statusText);
    }
    return data.filter((s: Subscriber) => s.sessionStatus && s.sessionStatus.online);
  }

  public async getPortMappings(): Promise<PortMapping[]> {
    const { data, status, statusText } = await this.client.callApi({
      method: "GET",
      path: "/v1/port_mappings",
      query: { limit: "1000" }
    });
    if (status !== 200) {
      throw new Error(statusText);
    }
    return data;
  }

  public async createPortMapping(
    imsi: string,
    port: number,
    duration: number,
    tlsRequired: boolean
  ): Promise<PortMapping> {
    const { data, status, statusText } = await this.client.callApi({
      method: "POST",
      path: `/v1/port_mappings`,
      body: {
        destination: {
          imsi,
          port
        },
        duration,
        tlsRequired
      }
    });
    if (status !== 201) {
      throw new Error(statusText);
    }
    return data;
  }

  public async removePortMapping(endpoint: string): Promise<string> {
    const { status, statusText } = await this.client.callApi({
      method: "DELETE",
      path: `/v1/port_mappings/${endpoint.replace(/:/, "/")}`
    });
    if (status !== 204) {
      throw new Error(statusText);
    }
    return "204";
  }

  public getUserInfo(): User {
    return {
      operatorId: this.client.operatorId,
      userName: this.client.userName
    };
  }
}
