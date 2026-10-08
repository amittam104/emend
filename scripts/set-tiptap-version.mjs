import { readFileSync, writeFileSync } from "node:fs"

const version = process.argv[2]
if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
  console.error("Usage: node scripts/set-tiptap-version.mjs <version>")
  process.exit(1)
}

const packageFiles = [
  "apps/web/package.json",
  "packages/ai/package.json",
  "registry/package.json",
]
const workspaceFile = "pnpm-workspace.yaml"
const overridePattern = /^(\s+"(@tiptap\/[^"]+)"): .+$/gm

const manifests = packageFiles.map((file) => ({
  file,
  manifest: JSON.parse(readFileSync(file, "utf8")),
}))
const workspace = readFileSync(workspaceFile, "utf8")

const names = new Set(
  [...workspace.matchAll(overridePattern)].map((match) => match[2])
)
for (const { manifest } of manifests) {
  for (const field of ["dependencies", "devDependencies"]) {
    for (const name of Object.keys(manifest[field] ?? {})) {
      if (name.startsWith("@tiptap/")) names.add(name)
    }
  }
}

const published = new Set()
await Promise.all(
  [...names].map(async (name) => {
    const response = await fetch(`https://registry.npmjs.org/${name}`)
    if (!response.ok) throw new Error(`Could not read ${name} from npm`)
    const { versions } = await response.json()
    if (versions[version]) published.add(name)
    else console.log(`Skipping ${name}, which has no ${version} release`)
  })
)

for (const { file, manifest } of manifests) {
  for (const field of ["dependencies", "devDependencies"]) {
    for (const name of Object.keys(manifest[field] ?? {})) {
      if (published.has(name)) manifest[field][name] = version
    }
  }
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`)
}

writeFileSync(
  workspaceFile,
  workspace.replace(overridePattern, (line, key, name) =>
    published.has(name) ? `${key}: ${version}` : line
  )
)

console.log(`Set ${published.size} Tiptap packages to ${version}`)
