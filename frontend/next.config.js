/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    // NEXT_PUBLIC_API_URL controls where /api/* requests are forwarded.
    //
    // In Docker:  NEXT_PUBLIC_API_URL is set to http://gateway:4000/api
    //             (Docker DNS resolves "gateway" to the gateway container)
    //
    // Locally:    Defaults to http://localhost:4000/api
    //             (your machine talks to the gateway on mapped port 4000)
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
