import { NextRequest } from "next/server";

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const seed = searchParams.get("seed") ?? "mercado";
  const emoji = searchParams.get("e") ?? "🛍️";
  const label = (searchParams.get("t") ?? "").slice(0, 44);
  const h = hash(seed);
  const hue = h % 360;
  const hue2 = (hue + 28) % 360;
  const rot = (h % 40) - 20;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" role="img" aria-label="${escapeXml(label)}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue} 62% 92%)"/>
      <stop offset="100%" stop-color="hsl(${hue2} 58% 80%)"/>
    </linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.65)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#g)"/>
  <circle cx="${120 + (h % 200)}" cy="${110 + (h % 90)}" r="${90 + (h % 60)}" fill="rgba(255,255,255,0.35)"/>
  <rect x="0" y="0" width="600" height="300" fill="url(#s)"/>
  <g transform="translate(300 300) rotate(${rot})">
    <text x="0" y="28" font-size="190" text-anchor="middle" dominant-baseline="middle">${escapeXml(emoji)}</text>
  </g>
  <text x="300" y="540" font-size="30" font-family="Helvetica, Arial, sans-serif" font-weight="700" fill="rgba(20,32,43,0.55)" text-anchor="middle">${escapeXml(label)}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
