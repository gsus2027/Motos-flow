// Next.js genera /robots.txt automáticamente a partir de este archivo.
// Se permite explícitamente a los rastreadores de las IA (GPTBot, ClaudeBot,
// PerplexityBot, Google-Extended) además de los buscadores normales, para
// que puedan leer el sitio y citarlo en sus respuestas.
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"],
      },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "Claude-Web", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "Bytespider", allow: "/" },
    ],
    sitemap: "https://www.theflowrentals.com/sitemap.xml",
  };
}
