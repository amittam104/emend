import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@emend/registry-components", "@workspace/ui"],
}

export default nextConfig
