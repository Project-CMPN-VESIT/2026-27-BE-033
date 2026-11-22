/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  outputFileTracingIncludes: {
    "/api/comparison": ["./Candidate Affidavits/Candidate Detailed Info (1).xlsx"],
    "/api/verification": ["./Candidate Affidavits/Candidate Detailed Info (1).xlsx"],
    "/api/verification/*": ["./Candidate Affidavits/Candidate Detailed Info (1).xlsx"],
  },
  serverExternalPackages: ["canvas", "pdfjs-dist", "pdf-parse", "tesseract.js"],
};

export default nextConfig;
