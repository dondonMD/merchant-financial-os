/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@zb-vaka/i18n", "@zb-vaka/ui"],
  experimental: {
    typedRoutes: false
  }
};

export default nextConfig;
