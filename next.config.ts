/** @type {import('next').NextConfig} */
const nextConfig: import('next').NextConfig = {
  output: 'standalone',

  images: {
    unoptimized: true,
  },
};

export default nextConfig;