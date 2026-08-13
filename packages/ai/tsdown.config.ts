import { defineConfig } from "tsdown"

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/protocol/index.ts",
    "src/proposal/index.ts",
    "src/transport/index.ts",
    "src/server/index.ts",
  ],
  format: ["esm"],
  platform: "neutral",
  target: "es2022",
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
})
