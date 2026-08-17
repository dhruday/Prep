/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Prevent webpack from bundling these Node-only packages
    serverComponentsExternalPackages: ["pdf-parse", "tiktoken"],
  },
  // Allow streaming from edge functions
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
