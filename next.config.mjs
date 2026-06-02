/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "packschool.s3.us-east-1.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
