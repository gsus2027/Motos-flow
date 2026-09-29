// Next.js genera /sitemap.xml automáticamente a partir de este archivo.
export default function sitemap() {
  const base = "https://www.theflowrentals.com";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/rentar`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/rentar-ebike`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/privacidad`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];
}
