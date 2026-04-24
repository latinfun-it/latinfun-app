/**
 * Three branded SVG templates for the LATINHUB logo kit.
 * Wordmark matches the Home screen: "LATIN" white + "HUB" red brand,
 * heavy weight, negative letter-spacing, no graphic mark.
 * Returned as ready-to-download SVG strings (universal, crisp at any size).
 */

const BG = "#050505";
const BRAND = "#E11D48";
const BRAND_DARK = "#9F1239";
const GOLD = "#F59E0B";
// Use Helvetica Neue as a close substitute for the "system black" weight used in the app.
const FONT_STACK = "Helvetica Neue, Helvetica, Arial, sans-serif";

/** Common "Scarica l'app" promo block - renders app store pills */
function promoBlock(x: number, y: number, scale = 1) {
  const w = 210 * scale;
  const h = 60 * scale;
  const gap = 16 * scale;
  const pill = (cx: number, cy: number, label: string, sub: string) => `
    <g transform="translate(${cx}, ${cy})">
      <rect x="0" y="0" width="${w}" height="${h}" rx="${h / 2}" fill="#ffffff" />
      <text x="${24 * scale}" y="${h / 2 - 4 * scale}" font-family="${FONT_STACK}" font-size="${12 * scale}" fill="#555555" font-weight="600">${label}</text>
      <text x="${24 * scale}" y="${h / 2 + 16 * scale}" font-family="${FONT_STACK}" font-size="${18 * scale}" fill="#050505" font-weight="900">${sub}</text>
    </g>
  `;
  return pill(x, y, "SCARICA SU", "App Store") + pill(x + w + gap, y, "DISPONIBILE SU", "Google Play");
}

/**
 * LATINHUB wordmark rendered as two tspans so "LATIN" is white and "HUB" is brand red.
 * Matches the Home screen (font-weight 900, negative letter-spacing).
 */
function wordmark(
  cx: number,
  cy: number,
  fontSize: number,
  anchor: "start" | "middle" = "middle"
) {
  return `<text x="${cx}" y="${cy}" text-anchor="${anchor}" font-family="${FONT_STACK}" font-weight="900" font-size="${fontSize}" letter-spacing="${-fontSize * 0.04}"><tspan fill="#ffffff">LATIN</tspan><tspan fill="${BRAND}">HUB</tspan></text>`;
}

/** BANNER 1600x900 */
export const bannerSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BG}" />
      <stop offset="0.6" stop-color="#110608" />
      <stop offset="1" stop-color="${BRAND_DARK}" />
    </linearGradient>
    <radialGradient id="glow" cx="0.25" cy="0.35" r="0.6">
      <stop offset="0" stop-color="${BRAND}" stop-opacity="0.35" />
      <stop offset="1" stop-color="${BRAND}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bgGrad)" />
  <rect width="1600" height="900" fill="url(#glow)" />

  <text x="110" y="370" font-family="${FONT_STACK}" font-size="34" fill="${GOLD}" font-weight="800" letter-spacing="6">LATIN MUSIC SCENE · ITALIA</text>
  ${wordmark(110, 560, 230, "start")}
  <text x="110" y="640" font-family="${FONT_STACK}" font-size="34" fill="#cccccc" font-weight="500">Eventi · DJ · Scuole di ballo · Playlist</text>

  ${promoBlock(110, 720, 1)}

  <rect x="0" y="876" width="1600" height="24" fill="${GOLD}" />
</svg>`;

/** SQUARE 1080x1080 */
export const squareSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <defs>
    <linearGradient id="bgSq" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${BG}" />
      <stop offset="1" stop-color="#15060A" />
    </linearGradient>
    <radialGradient id="glowSq" cx="0.5" cy="0.35" r="0.55">
      <stop offset="0" stop-color="${BRAND}" stop-opacity="0.28" />
      <stop offset="1" stop-color="${BRAND}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bgSq)" />
  <rect width="1080" height="1080" fill="url(#glowSq)" />

  <text x="540" y="380" text-anchor="middle" font-family="${FONT_STACK}" font-size="28" fill="${GOLD}" font-weight="800" letter-spacing="6">LATIN MUSIC SCENE · ITALIA</text>

  ${wordmark(540, 580, 180)}

  <text x="540" y="650" text-anchor="middle" font-family="${FONT_STACK}" font-size="28" fill="#cccccc" font-weight="500">Eventi · DJ · Scuole · Playlist</text>

  ${promoBlock(320, 880, 1)}
</svg>`;

/** ROUND 1080x1080 (circular badge) */
export const roundSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <defs>
    <radialGradient id="bgR" cx="0.5" cy="0.5" r="0.7">
      <stop offset="0" stop-color="#1A0608" />
      <stop offset="0.7" stop-color="${BG}" />
      <stop offset="1" stop-color="${BRAND_DARK}" />
    </radialGradient>
  </defs>
  <rect width="1080" height="1080" fill="${BG}" />
  <circle cx="540" cy="540" r="500" fill="url(#bgR)" stroke="${BRAND}" stroke-width="10" />
  <circle cx="540" cy="540" r="430" fill="none" stroke="${GOLD}" stroke-width="2" stroke-dasharray="6 10" />

  <text x="540" y="480" text-anchor="middle" font-family="${FONT_STACK}" font-size="22" fill="${GOLD}" font-weight="800" letter-spacing="5">LATIN · ITALIA</text>

  ${wordmark(540, 610, 130)}

  <text x="540" y="680" text-anchor="middle" font-family="${FONT_STACK}" font-size="18" fill="#cccccc" font-weight="500">Eventi · DJ · Scuole</text>

  <text x="540" y="800" text-anchor="middle" font-family="${FONT_STACK}" font-size="16" fill="#ffffff" font-weight="800" letter-spacing="2">SCARICA L'APP</text>
  <text x="540" y="828" text-anchor="middle" font-family="${FONT_STACK}" font-size="14" fill="#cccccc" font-weight="500">App Store · Google Play</text>
</svg>`;

export type LogoVariant = {
  key: "banner" | "square" | "round";
  title: string;
  subtitle: string;
  aspect: number; // width / height
  svg: string;
  exportSize: { width: number; height: number };
};

export const LOGO_VARIANTS: LogoVariant[] = [
  {
    key: "banner",
    title: "Banner orizzontale",
    subtitle: "Perfetto per header social, cover Facebook/LinkedIn",
    aspect: 1600 / 900,
    svg: bannerSvg,
    exportSize: { width: 1600, height: 900 },
  },
  {
    key: "square",
    title: "Quadrato",
    subtitle: "Per post Instagram, stories, WhatsApp broadcast",
    aspect: 1,
    svg: squareSvg,
    exportSize: { width: 1080, height: 1080 },
  },
  {
    key: "round",
    title: "Tondo / Badge",
    subtitle: "Avatar, profilo, sticker",
    aspect: 1,
    svg: roundSvg,
    exportSize: { width: 1080, height: 1080 },
  },
];
