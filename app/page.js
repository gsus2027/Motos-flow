import fs from "fs";
import path from "path";
import "./marketing.css";
import MarketingScript from "@/components/marketing/MarketingScript";

const marketingDir = path.join(process.cwd(), "lib", "marketing");
const bodyHtml = fs.readFileSync(path.join(marketingDir, "body.html"), "utf8");
const scriptText = fs.readFileSync(path.join(marketingDir, "script.js"), "utf8");
const schemaBusiness = fs.readFileSync(path.join(marketingDir, "schema-business.json"), "utf8");
const schemaFaq = fs.readFileSync(path.join(marketingDir, "schema-faq.json"), "utf8");

export const viewport = {
  themeColor: "#15171A",
};

export const metadata = {
  title: "Flow Rentals",
  description:
    "Flow Rentals: e-bike, Honda Navi moto and scooter rentals on Isla Colón, Bocas del Toro, Panama. Clear daily and half-day pricing, hotel delivery, and instant booking on WhatsApp.",
  keywords:
    "Bocas del Toro rentals, Isla Colon e-bike rental, moto rental Bocas del Toro, scooter rental Panama, Honda Navi rental, Flow Rentals, Flow e bike y motos, alquiler de motos Bocas del Toro, alquiler de e-bike Isla Colon",
  robots: "index, follow",
  openGraph: {
    siteName: "Flow Rentals",
    title: "Flow Rentals — E-bike & Moto Rentals in Bocas del Toro",
    description:
      "Rent e-bikes, scooters and motos on Isla Colón, Bocas del Toro. Clear pricing, hotel delivery, and WhatsApp booking.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Flow Rentals — E-bike & Moto Rentals in Bocas del Toro",
    description:
      "Rent e-bikes, scooters and motos on Isla Colón, Bocas del Toro. Clear pricing, hotel delivery, and WhatsApp booking.",
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schemaBusiness }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schemaFaq }}
      />
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <MarketingScript code={scriptText} />
    </>
  );
}
