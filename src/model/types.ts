export interface Subscriber {
  iccid: string;
  imsi: string;
  operatorId: string;
  status: string;
  terminationEnabled: boolean;
  groupId: string;
  speedClass: string;
  tags: { [id: string]: string };
  msisdn: string;
  ipAddress: string;
  apn: string;
  moduleType: string;
  plan: number;
  subscription: string;
  createdAt: number;
  lastModifiedAt: number;
  expiredAt: number;
  expiryAction: string;
  serialNumber: string;
  sessionStatus: any;
  cellInfo: any;
  imeiLock: string;
  selected: boolean;
  timestamp: number;
}

export interface PortMapping {
  ipAddress: string;
  port: number;
  hostname: string;
  operatorId: string;
  createdTime: number;
  duration: number;
  tlsRequired: boolean;
  destination: { imsi: string; port: number };
  source: { ipRanges: string[] };
  placement: string;
  expired: boolean;
  imsi: string;
  endpoint: string;
  expiredTime: number;
}

export interface User {
  operatorId: string;
  userName: string;
}

export interface SessionEvent {
  apn: string;
  cell: {
    eci: number;
    mcc: number;
    mnc: number;
    radioType: string;
    tac: number;
  };
  createdTime: string;
  dns0: string;
  dns1: string;
  event: string;
  imei: string;
  imsi: string;
  operatorId: string;
  primaryImsi: string;
  time: number;
  ueIpAddress: string;
}
