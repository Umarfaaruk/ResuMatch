/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // These rely on Node built-ins / large assets and must not be bundled
    // by Next's server compiler — keep them external so they load at runtime.
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth"],
  },
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.version': JSON.stringify('v18.0.0'),
      })
    );
    return config;
  },
};

export default nextConfig;
