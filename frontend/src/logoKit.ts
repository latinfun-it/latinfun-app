/**
 * Three branded SVG templates for the LATINHUB logo kit.
 * Returned as ready-to-download SVG strings (universal, crisp at any size).
 */

const BG = "#050505";
const BRAND = "#E11D48";
const BRAND_DARK = "#9F1239";
const GOLD = "#F59E0B";

/** Common "Scarica l'app" promo block - renders app store pills */
function promoBlock(x: number, y: number, scale = 1) {
  const w = 210 * scale;
  const h = 60 * scale;
  const gap = 16 * scale;
  const pill = (cx: number, cy: number, label: string, sub: string) => `
    <g transform="translate(${cx}, ${cy})">
      <rect x="0" y="0" width="${w}" height="${h}" rx="${h / 2}" fill="#ffffff" />
      <text x="${24 * scale}" y="${h / 2 - 4 * scale}" font-family="Helvetica, Arial, sans-serif" font-size="${12 * scale}" fill="#555555" font-weight="600">${label}</text>
      <text x="${24 * scale}" y="${h / 2 + 16 * scale}" font-family="Helvetica, Arial, sans-serif" font-size="${18 * scale}" fill="#050505" font-weight="900">${sub}</text>
    </g>
  `;
  return pill(x, y, "SCARICA SU", "App Store") + pill(x + w + gap, y, "DISPONIBILE SU", "Google Play");
}

/** Central "L" mark - stylised brand glyph */
function lMark(cx: number, cy: number, size: number, color: string = BRAND) {
  const half = size / 2;
  return `
    <g transform="translate(${cx - half}, ${cy - half})">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${size * 0.22}" fill="${color}" />
      <text x="${size / 2}" y="${size * 0.78}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="900" font-size="${size * 0.8}" fill="#ffffff">L</text>
    </g>
  `;
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
    <radialGradient id="glow" cx="0.2" cy="0.3" r="0.5">
      <stop offset="0" stop-color="${BRAND}" stop-opacity="0.35" />
      <stop offset="1" stop-color="${BRAND}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bgGrad)" />
  <rect width="1600" height="900" fill="url(#glow)" />

  ${lMark(260, 450, 240)}

  <text x="420" y="380" font-family="Helvetica, Arial, sans-serif" font-size="38" fill="${GOLD}" font-weight="800" letter-spacing="6">LATIN MUSIC SCENE · ITALIA</text>
  <text x="420" y="520" font-family="Helvetica, Arial, sans-serif" font-size="150" fill="#ffffff" font-weight="900" letter-spacing="-3">LATINHUB</text>
  <text x="420" y="600" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#cccccc" font-weight="500">Eventi · DJ · Scuole di ballo · Playlist</text>

  ${promoBlock(420, 700, 1)}

  <rect x="0" y="870" width="1600" height="30" fill="${GOLD}" />
</svg>`;

/** SQUARE 1080x1080 */
export const squareSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <defs>
    <linearGradient id="bgSq" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${BG}" />
      <stop offset="1" stop-color="#15060A" />
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bgSq)" />
  <circle cx="540" cy="540" r="700" fill="${BRAND}" fill-opacity="0.08" />

  ${lMark(540, 360, 280)}

  <text x="540" y="620" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="${GOLD}" font-weight="800" letter-spacing="5">LATIN MUSIC SCENE · ITALIA</text>
  <text x="540" y="730" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="110" fill="#ffffff" font-weight="900" letter-spacing="-2">LATINHUB</text>
  <text x="540" y="790" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#cccccc" font-weight="500">Eventi · DJ · Scuole · Playlist</text>

  ${promoBlock(320, 890, 1)}
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
  <circle cx="540" cy="540" r="500" fill="url(#bgR)" stroke="${GOLD}" stroke-width="10" />
  <circle cx="540" cy="540" r="430" fill="none" stroke="${BRAND}" stroke-width="4" stroke-dasharray="8 8" />

  ${lMark(540, 430, 240)}

  <text x="540" y="670" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="72" fill="#ffffff" font-weight="900" letter-spacing="-2">LATINHUB</text>
  <text x="540" y="715" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="${GOLD}" font-weight="800" letter-spacing="4">LATIN · ITALIA</text>
  <text x="540" y="800" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="16" fill="#ffffff" font-weight="700">SCARICA L'APP</text>
  <text x="540" y="828" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="#cccccc" font-weight="500">App Store · Google Play</text>
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
