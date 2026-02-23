/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    // On Vercel: NEXT_PUBLIC_API_URL = https://refinery-gateway.onrender.com
    // In Docker: falls back to http://gateway:4000
    // Locally:   falls back to http://localhost:4000
    const gatewayUrl = process.env.NEXT_PUBLIC_API_URL || 'http://gateway:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${gatewayUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;