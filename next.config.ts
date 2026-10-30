import type { NextConfig } from "next";

// App 100% dinâmico (sessão por usuário): sem Cache Components / prefetch parcial.
const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@prisma/client"],
};

export default nextConfig;
