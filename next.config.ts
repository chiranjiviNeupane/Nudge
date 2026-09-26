import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the dev-tools button; it overlaps the bottom nav on phones.
  // Compile/runtime errors are still shown.
  devIndicators: false,
  // Allow opening the dev server from a phone on the local network
  // (e.g. http://192.168.1.20:3000).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
};

export default nextConfig;
