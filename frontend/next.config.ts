import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app is one unit of a monorepo; without this Next walks up past the
  // repo and picks the home-directory lockfile as the workspace root.
  outputFileTracingRoot: path.join(__dirname),

  // The dev badge parks itself in the bottom-left corner, which is where the
  // phone tab bar lives. Testing on a real device means it sits on top of the
  // SRS tab the whole time.
  devIndicators: false,
};

export default nextConfig;
