import path from "path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Secrets live in the repo-root .env (git-ignored); load them for server routes.
// forceReload: Next already loaded this app's own (empty) env before reading this file.
loadEnvConfig(path.resolve(process.cwd(), "../.."), process.env.NODE_ENV !== "production", console, true);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["images.unsplash.com", "image.tmdb.org", "m.media-amazon.com"],
  },
};

export default nextConfig;
