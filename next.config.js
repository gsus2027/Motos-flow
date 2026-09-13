/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  // pdfkit (usado por @react-pdf/renderer para el PDF del contrato) trae
  // archivos de fuentes que Vercel no detecta solo al empaquetar la
  // función serverless — hay que indicárselo explícitamente, o el envío
  // del correo con el contrato falla con "Cannot find module ... Helvetica".
  outputFileTracingIncludes: {
    "/api/rentas": ["./node_modules/pdfkit/js/**"],
    "/api/rentas-ebike": ["./node_modules/pdfkit/js/**"],
  },
};

module.exports = nextConfig;
