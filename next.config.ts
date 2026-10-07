import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // "/" is not one of the pages, so send it to the login page.
    return [{ source: "/", destination: "/login", permanent: false }];
  },
};

export default nextConfig;
