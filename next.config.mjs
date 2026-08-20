/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Genera un servidor mínimo autocontenido en .next/standalone (ideal para Docker).
  output: "standalone",
};

export default nextConfig;
