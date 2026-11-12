import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'

const blocked = new BlockList()
blocked.addSubnet('0.0.0.0', 8, 'ipv4')
blocked.addSubnet('10.0.0.0', 8, 'ipv4')
blocked.addSubnet('127.0.0.0', 8, 'ipv4')
blocked.addSubnet('169.254.0.0', 16, 'ipv4')
blocked.addSubnet('172.16.0.0', 12, 'ipv4')
blocked.addSubnet('192.168.0.0', 16, 'ipv4')
blocked.addAddress('::1', 'ipv6')
blocked.addSubnet('fc00::', 7, 'ipv6')
blocked.addSubnet('fe80::', 10, 'ipv6')

export function isBlockedWebhookAddress(ip: string): boolean {
  const family = isIP(ip)
  if (family === 0) return true
  return blocked.check(ip, family === 4 ? 'ipv4' : 'ipv6')
}

function hostnameOf(url: URL): string {
  return url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
}

function isLocalName(host: string): boolean {
  return host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')
}

export function webhookUrlLooksPublic(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.username || url.password) return false
  const host = hostnameOf(url)
  if (!host || isLocalName(host)) return false
  if (isIP(host)) return !isBlockedWebhookAddress(host)
  return true
}

export async function isPublicHttpsWebhookUrl(
  raw: string,
  resolve: (host: string) => Promise<string[]> = async (host) => {
    const records = await lookup(host, { all: true, verbatim: true })
    return records.map((record) => record.address)
  }
): Promise<boolean> {
  if (!webhookUrlLooksPublic(raw)) return false
  const host = hostnameOf(new URL(raw))
  if (isIP(host)) return true
  let addresses: string[]
  try {
    addresses = await resolve(host)
  } catch {
    return false
  }
  if (addresses.length === 0) return false
  return addresses.every((address) => !isBlockedWebhookAddress(address))
}
