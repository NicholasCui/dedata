/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { /* 可以留空或按需配置 */ },

  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Suppress specific warnings
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Transpile specific packages that may have compatibility issues
  transpilePackages: ['@heroui/react', '@nextui-org/react'],

  // Webpack configuration to handle dependencies
  webpack: (config, { isServer }) => {
    // Fix for @metamask/sdk and React Native dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    };

    return config;
  },
};

export default nextConfig;