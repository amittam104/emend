import { DEFAULT_LINK_PROTOCOLS } from "./policy.js"

const blockedProtocols = new Set(["javascript:", "data:", "vbscript:"])
const protocolPattern = /^[a-z][a-z\d+.-]*:$/i
const absoluteUrlPattern = /^([a-z][a-z\d+.-]*):/i
const baseUrl = "https://emend.invalid/"

export function isSafeLinkDestination(
  destination: unknown,
  configuredProtocols?: readonly string[]
): boolean {
  if (typeof destination !== "string") return false

  const value = decodeLinkDestination(destination.trim())
  if (!value || hasControlCharacter(value)) return value === ""
  if (/^[\\/]{2}/.test(value)) return false

  const scheme = value.match(absoluteUrlPattern)?.[1]
  if (!scheme) return true

  try {
    const protocol = new URL(value, baseUrl).protocol.toLowerCase()
    return (
      !blockedProtocols.has(protocol) &&
      resolveProtocols(configuredProtocols).has(protocol)
    )
  } catch {
    return false
  }
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)
  })
}

function resolveProtocols(configured?: readonly string[]): ReadonlySet<string> {
  const protocols = configured ?? DEFAULT_LINK_PROTOCOLS

  return new Set(
    protocols
      .map((protocol) => protocol.toLowerCase())
      .filter(
        (protocol) =>
          protocolPattern.test(protocol) && !blockedProtocols.has(protocol)
      )
  )
}

function decodeLinkDestination(destination: string): string {
  let decoded = destination

  for (let index = 0; index < 4; index += 1) {
    const next = decoded
      .replace(/&colon;/gi, ":")
      .replace(/&(?:tab|newline);/gi, "\n")
      .replace(/&sol;/gi, "/")
      .replace(/&bsol;/gi, "\\")
      .replace(/&#(?:x([\da-f]+)|(\d+));?/gi, (entity, hex, decimal) => {
        const codePoint = Number.parseInt(hex ?? decimal, hex ? 16 : 10)

        try {
          return String.fromCodePoint(codePoint)
        } catch {
          return entity
        }
      })
      .replace(/&amp;/gi, "&")

    if (next === decoded) break
    decoded = next
  }

  try {
    return decodeURIComponent(decoded)
  } catch {
    return decoded
  }
}
