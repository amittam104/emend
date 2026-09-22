import { defineConfig } from "fumadocs-mdx/config"

function convertCommand(command: string, packageManager: "bun" | "pnpm") {
  const executable = packageManager === "pnpm" ? "pnpm dlx" : "bunx"

  return command
    .replace(/^npm (?:install|i)\b/, `${packageManager} add`)
    .replace(/^npx\b/, executable)
}

export default defineConfig({
  mdxOptions: {
    remarkNpmOptions: {
      packageManagers: [
        {
          command: (command) => convertCommand(command, "pnpm"),
          name: "pnpm",
        },
        {
          command: (command) => convertCommand(command, "bun"),
          name: "bun",
        },
        {
          command: (command) => command,
          name: "npm",
        },
      ],
    },
  },
})
