import { networkInterfaces } from 'node:os';

// Interfaces virtuais (Docker, VMs, VPNs) que um celular na mesma Wi-Fi não alcança.
const VIRTUAL = /^(docker|br-|veth|virbr|vmnet|vboxnet|lxc|lxd|cni|flannel|kube|podman|zt|tun|tap|utun|awdl|llw|bridge)/i;

/** IPs da rede local deste computador, do mais provável (192.168.x.x) ao menos provável. */
export function lanAddresses(): string[] {
  const found: { address: string; rank: number }[] = [];
  for (const [name, infos] of Object.entries(networkInterfaces())) {
    if (!infos || VIRTUAL.test(name)) continue;
    for (const info of infos) {
      if (info.family !== 'IPv4' || info.internal) continue;
      const a = info.address;
      if (a.startsWith('169.254.')) continue;
      const rank = a.startsWith('192.168.') ? 0 : a.startsWith('10.') ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(a) ? 2 : 3;
      found.push({ address: a, rank });
    }
  }
  return found.sort((x, y) => x.rank - y.rank).map((f) => f.address);
}

export function lanUrls(port: number): string[] {
  return lanAddresses().map((a) => `http://${a}:${port}`);
}
