import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Export each page as /route/index.html, the layout the CloudFront routing function
  // (cloudfront.js) rewrites to. Without it, /login is missing in S3 and CloudFront's error
  // fallback serves the homepage HTML at every URL.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
