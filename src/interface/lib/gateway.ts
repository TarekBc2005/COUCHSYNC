import os from "node:os";

/* Where a phone should go to open the web controller (/join) for group mode.
   1. A public tunnel, if NEXT_PUBLIC_TUNNEL_URL is set AND actually answering. Free tunnel
      addresses die whenever the tunnel program stops, so it is probed instead of trusted.
   2. Otherwise this machine's Wi-Fi/Ethernet address (works for phones on the same network).
   3. Otherwise nothing: the QR screen then falls back to the Telegram QR. */

export type Gateway = { url: string; kind: "tunnel" | "lan" };

export type GatewayInfo = {
  gateway: Gateway | null;
  tunnelConfigured: boolean;
  tunnelReachable: boolean;
};

// Adapters that other devices can't reach (WSL/Hyper-V/Docker/VPN...).
const VIRTUAL = /vethernet|wsl|hyper-v|virtualbox|vmware|docker|loopback|bluetooth|tailscale|zerotier|vpn|\btap\b|\btun\b/i;

/** This machine's address on the local network (prefers 192.168.x, then 10.x, then 172.16-31.x). */
export function lanAddress(): string | null {
  const found: Array<{ ip: string; rank: number }> = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (VIRTUAL.test(name)) continue;
    for (const a of addrs ?? []) {
      if ((a.family !== "IPv4" && (a.family as unknown) !== 4) || a.internal) continue;
      const rank = a.address.startsWith("192.168.")
        ? 0
        : a.address.startsWith("10.")
          ? 1
          : /^172\.(1[6-9]|2\d|3[01])\./.test(a.address)
            ? 2
            : 3;
      found.push({ ip: a.address, rank });
    }
  }
  return found.sort((a, b) => a.rank - b.rank)[0]?.ip ?? null;
}

let lastProbe: { base: string; at: number; ok: boolean } | null = null;

async function tunnelReachable(base: string): Promise<boolean> {
  if (lastProbe && lastProbe.base === base && Date.now() - lastProbe.at < 20_000) return lastProbe.ok;
  let ok = false;
  try {
    const res = await fetch(`${base}/join`, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(3000) });
    ok = res.status < 500; // a stopped Cloudflare tunnel answers 530
  } catch {
    ok = false;
  }
  lastProbe = { base, at: Date.now(), ok };
  return ok;
}

export async function resolveGateway(port: string): Promise<GatewayInfo> {
  const configured = process.env.NEXT_PUBLIC_TUNNEL_URL?.trim().replace(/\/+$/, "") || "";
  if (configured && (await tunnelReachable(configured))) {
    return { gateway: { url: configured, kind: "tunnel" }, tunnelConfigured: true, tunnelReachable: true };
  }
  const ip = lanAddress();
  return {
    gateway: ip ? { url: `http://${ip}:${port}`, kind: "lan" } : null,
    tunnelConfigured: Boolean(configured),
    tunnelReachable: false,
  };
}
