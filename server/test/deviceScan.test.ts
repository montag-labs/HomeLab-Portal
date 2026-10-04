import { describe, expect, test } from "vitest";
import { ipv4, parseSubnet, privateIp, scanAddresses } from "../src/services/deviceScan.js";

describe("ipv4", () => {
  test("parses valid addresses", () => {
    expect(ipv4("0.0.0.0")).toBe(0);
    expect(ipv4("192.168.1.10")).toBe(3232235786);
    expect(ipv4("255.255.255.255")).toBe(4294967295);
  });

  test.each(["", "1.2.3", "1.2.3.4.5", "256.1.1.1", "01.2.3.4", "a.b.c.d", "1.2.3.4 "])("rejects %j", (value) => {
    expect(ipv4(value)).toBeNull();
  });
});

describe("privateIp", () => {
  test.each(["10.0.0.1", "172.16.0.1", "172.31.255.255", "192.168.0.1"])("accepts %s", (value) => {
    expect(privateIp(ipv4(value)!)).toBe(true);
  });

  test.each(["8.8.8.8", "172.15.255.255", "172.32.0.0", "192.169.0.1", "127.0.0.1", "169.254.1.1"])("rejects %s", (value) => {
    expect(privateIp(ipv4(value)!)).toBe(false);
  });
});

describe("parseSubnet", () => {
  test("normalizes a CIDR to its network address", () => {
    expect(parseSubnet("192.168.1.77/24")).toMatchObject({ cidr: "192.168.1.0/24", size: 256, prefix: 24 });
  });

  test.each(["192.168.1.0", "192.168.1.0/7", "192.168.1.0/33", "8.8.8.0/24", "172.0.0.0/8", "256.1.1.1/24", "x/24"])("rejects %s", (value) => {
    expect(() => parseSubnet(value)).toThrow();
  });
});

describe("scanAddresses", () => {
  const allowed = ["192.168.1.0/24"];

  test("skips network and broadcast addresses", () => {
    const addresses = scanAddresses("192.168.1.0/24", allowed);
    expect(addresses).toHaveLength(254);
    expect(addresses[0]).toBe("192.168.1.1");
    expect(addresses.at(-1)).toBe("192.168.1.254");
  });

  test("keeps every address of a /32", () => {
    expect(scanAddresses("192.168.1.5/32", allowed)).toEqual(["192.168.1.5"]);
  });

  test("rejects subnets larger than /24", () => {
    expect(() => scanAddresses("10.0.0.0/16", ["10.0.0.0/8"])).toThrow(/256/);
  });

  test("rejects subnets outside the allowed networks", () => {
    expect(() => scanAddresses("192.168.2.0/24", allowed)).toThrow(/freigegeben/);
    expect(() => scanAddresses("192.168.1.0/24", [])).toThrow(/freigegeben/);
  });
});
