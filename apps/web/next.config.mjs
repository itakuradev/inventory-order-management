/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // ESLintはmonorepoルートのFlat Configで一括管理し、`pnpm lint` で実行する。
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
