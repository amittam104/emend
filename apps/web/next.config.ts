import type { NextConfig } from "next"
import { createMDX } from "fumadocs-mdx/next"

const nextConfig: NextConfig = {
  transpilePackages: ["@emend/registry-components", "@workspace/ui"],
  async rewrites() {
    return [
      {
        source: "/docs/:slug*.md",
        destination: "/llms.mdx/docs/:slug*/content.md",
      },
    ]
  },
}

const withMDX = createMDX()

export default withMDX(nextConfig)
