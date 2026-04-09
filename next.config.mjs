/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "github.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react", "recharts"],
  },
};

export default nextConfig;
