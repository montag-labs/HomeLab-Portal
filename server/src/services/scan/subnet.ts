import { networkInterfaces } from "node:os";

export function ipv4(value: string): number | null {
  if (!/^(0|[1-9]\d{0,2})(\.(0|[1-9]\d{0,2})){3}$/.test(value)) return null;
  const parts = value.split(".").map(Number);
  if (parts.some((part) => part > 255)) return null;
  return parts.reduce((sum, part) => sum * 256 + part, 0);
}

export function formatAddress(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".");
}

/** 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16. */
export function privateIp(value: number): boolean {
  return Math.floor(value / 16777216) === 10
    || Math.floor(value / 1048576) === 2753
    || Math.floor(value / 65536) === 49320;
}

export function parseSubnet(value: string) {
  const match = /^(.*)\/(\d{1,2})$/.exec(value);
  if (!match) throw new Error("Ungültiges IPv4-Subnetz");
  const ip = ipv4(match[1]);
  const prefix = Number(match[2]);
  if (ip === null || prefix < 8 || prefix > 32) throw new Error("Ungültiges IPv4-Subnetz");
  const size = 2 ** (32 - prefix);
  const start = Math.floor(ip / size) * size;
  if (!privateIp(start) || !privateIp(start + size - 1)) throw new Error("Nur private IPv4-Netze sind erlaubt");
  return { start, end: start + size - 1, size, prefix, cidr: `${formatAddress(start)}/${prefix}` };
}

export function allowedSubnets(): string[] {
  const configured = process.env.DEVICE_SCAN_SUBNETS;
  if (configured !== undefined) {
    return configured.split(",").map((item) => item.trim()).filter(Boolean).map((item) => parseSubnet(item).cidr);
  }
  const local = Object.values(networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((item) => item.family === "IPv4" && !item.internal && item.cidr && privateIp(ipv4(item.address) ?? 0))
    .map((item) => parseSubnet(item.cidr!).cidr);
  return [...new Set(local)];
}

export function scanAddresses(cidr: string, allowed = allowedSubnets()): string[] {
  const subnet = parseSubnet(cidr);
  if (subnet.size > 256) throw new Error("Maximal 256 Adressen pro Scan (/24 oder kleiner)");
  const permitted = allowed.some((value) => {
    const parent = parseSubnet(value);
    return subnet.start >= parent.start && subnet.end <= parent.end;
  });
  if (!permitted) throw new Error("Subnetz ist nicht für Scans freigegeben");
  const skip = subnet.prefix <= 30 ? 1 : 0;
  return Array.from({ length: subnet.size - skip * 2 }, (_, index) => formatAddress(subnet.start + skip + index));
}
