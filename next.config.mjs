/** @type {import('next').NextConfig} */
const nextConfig = {};

if (process.env.NODE_ENV === "development") {
  nextConfig.rewrites = async () => [
    {
      source: "/api/:path*",
      destination: "http://127.0.0.1:8000/api/:path*",
    },
  ];
}

export default nextConfig;
