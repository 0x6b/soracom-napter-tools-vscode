import { Method } from "axios";

export interface ApiParams {
  method: Method;
  path: string;
  query?: { [key: string]: string };
  body?: any;
  headers?: { [key: string]: string };
}
