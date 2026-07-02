/** @type {import('next').NextConfig} */
const nextConfig = {
  // Locally, keep production builds out of the dev server's .next directory
  // so `npm run build` doesn't clobber a running dev server's static assets.
  // On Vercel there is no concurrent dev server and the platform expects the
  // default ".next" output, so use it there.
  distDir: process.env.VERCEL
    ? ".next"
    : process.env.NODE_ENV === "production"
      ? ".next-build"
      : ".next",
  experimental: {
    // These rely on Node built-ins / large assets and must not be bundled
    // by Next's server compiler — keep them external so they load at runtime.
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
