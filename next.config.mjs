/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Proxy /api to FastAPI backend in dev if FASTAPI_URL is set
    if (process.env.NEXT_PUBLIC_FASTAPI_URL) {
      return [];
    }
    return [];
  },
};

export default nextConfig;
