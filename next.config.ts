import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["tesseract.js", "tesseract.js-core"],
  agentRules: false,
  // Mesure de couverture (scripts/coverage-api.sh) : source maps serveur pour ramener la couverture V8 au code source.
  ...(process.env.COVERAGE_BUILD === '1' ? { experimental: { serverSourceMaps: true } } : {}),
};

export default nextConfig;
