/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep production builds out of the dev server's .next directory, so
  // running `npm run build` while `npm run dev` is up doesn't clobber the
  // dev server's static assets (which breaks CSS/JS until a restart).
  distDir: process.env.NODE_ENV === "production" ? ".next-build" : ".next",
  experimental: {
    // These rely on Node built-ins / large assets and must not be bundled
    // by Next's server compiler — keep them external so they load at runtime.
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth"],
  },
};

export default nextConfig;
