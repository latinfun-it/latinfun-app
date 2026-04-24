/**
 * Three branded SVG templates for the LATINHUB logo kit.
 * Wordmark: "LATIN" white + "HUB" red brand, Arial Black (widely available),
 * no negative letter-spacing (so rasterized PNG renders identically across systems).
 */

const BG = "#050505";
const BRAND = "#E11D48";
const BRAND_DARK = "#9F1239";
const GOLD = "#F59E0B";
// Arial Black is shipped with Windows, macOS, iOS, Android — safest choice for
// SVG→PNG canvas rasterization. Impact is fallback on older Linux browsers.
const FONT_STACK = "Impact, 'Arial Black', Arial, sans-serif";

/** App-store promo pills */
function promoBlock(x: number, y: number, scale = 1) {
  const w = 210 * scale;
  const h = 60 * scale;
  const gap = 16 * scale;
  const pill = (cx: number, cy: number, label: string, sub: string) => `
    <g transform="translate(${cx}, ${cy})">
      <rect x="0" y="0" width="${w}" height="${h}" rx="${h / 2}" fill="#ffffff" />
      <text x="${24 * scale}" y="${h / 2 - 4 * scale}" font-family="Arial, sans-serif" font-size="${12 * scale}" fill="#555555" font-weight="600">${label}</text>
      <text x="${24 * scale}" y="${h / 2 + 16 * scale}" font-family="Arial Black, Arial, sans-serif" font-size="${18 * scale}" fill="#050505" font-weight="900">${sub}</text>
    </g>
  `;
  return pill(x, y, "SCARICA SU", "App Store") + pill(x + w + gap, y, "DISPONIBILE SU", "Google Play");
}

/** Wordmark "LATINHUB" = single <text> with two <tspan> (different colors).
 *  `dominant-baseline="middle"` centra verticalmente il testo intorno a cy,
 *  `textLength`+`lengthAdjust` forza larghezza totale `totalWidth`. */
function wordmarkCentered(cx: number, cy: number, totalWidth: number) {
  const fontSize = totalWidth * 0.22;
  const startX = cx - totalWidth / 2;
  return `
    <text x="${startX}" y="${cy}" dominant-baseline="middle" font-family="${FONT_STACK}" font-weight="900" font-size="${fontSize}" textLength="${totalWidth}" lengthAdjust="spacingAndGlyphs"><tspan fill="#ffffff">LATIN</tspan><tspan fill="${BRAND}">HUB</tspan></text>
  `;
}

/** Stacked for app icon: LATIN sopra, HUB sotto, entrambi centrati orizzontalmente.
 *  cy = centro verticale visivo dello stack. */
function wordmarkStacked(cx: number, cy: number, width: number) {
  const startX = cx - width / 2;
  const fontSize = width * 0.32;
  const lineGap = fontSize * 0.92;
  // LATIN visual center = cy - lineGap/2, HUB visual center = cy + lineGap/2
  const hubWidth = width * 0.72;
  return `
    <text x="${startX}" y="${cy - lineGap / 2}" dominant-baseline="middle" font-family="${FONT_STACK}" font-weight="900" font-size="${fontSize}" textLength="${width}" lengthAdjust="spacingAndGlyphs" fill="#ffffff">LATIN</text>
    <text x="${cx - hubWidth / 2}" y="${cy + lineGap / 2}" dominant-baseline="middle" font-family="${FONT_STACK}" font-weight="900" font-size="${fontSize}" textLength="${hubWidth}" lengthAdjust="spacingAndGlyphs" fill="${BRAND}">HUB</text>
  `;
}

/** BANNER 1600x900 */
export const bannerSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BG}" />
      <stop offset="0.6" stop-color="#110608" />
      <stop offset="1" stop-color="${BRAND_DARK}" />
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.7">
      <stop offset="0" stop-color="${BRAND}" stop-opacity="0.35" />
      <stop offset="1" stop-color="${BRAND}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bgGrad)" />
  <rect width="1600" height="900" fill="url(#glow)" />

  <text x="800" y="240" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="30" fill="${GOLD}" font-weight="800" letter-spacing="6">LATIN MUSIC SCENE · ITALIA</text>

  ${wordmarkCentered(800, 450, 1050)}

  <text x="800" y="620" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="30" fill="#cccccc" font-weight="500">Eventi · DJ · Scuole di ballo · Playlist</text>

  <g transform="translate(${(1600 - 436) / 2}, 710)">${promoBlock(0, 0, 1)}</g>

  <rect x="0" y="876" width="1600" height="24" fill="${GOLD}" />
</svg>`;

/** SQUARE 1080x1080 */
export const squareSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" preserveAspectRatio="xMidYMid meet">
  <defs>
    <linearGradient id="bgSq" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${BG}" />
      <stop offset="1" stop-color="#15060A" />
    </linearGradient>
    <radialGradient id="glowSq" cx="0.5" cy="0.5" r="0.55">
      <stop offset="0" stop-color="${BRAND}" stop-opacity="0.28" />
      <stop offset="1" stop-color="${BRAND}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bgSq)" />
  <rect width="1080" height="1080" fill="url(#glowSq)" />

  <text x="540" y="340" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="26" fill="${GOLD}" font-weight="800" letter-spacing="5">LATIN MUSIC SCENE · ITALIA</text>

  ${wordmarkCentered(540, 540, 760)}

  <text x="540" y="720" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="26" fill="#cccccc" font-weight="500">Eventi · DJ · Scuole · Playlist</text>

  <g transform="translate(${(1080 - 436) / 2}, 890)">${promoBlock(0, 0, 1)}</g>
</svg>`;

/** ROUND 1080x1080 (circular badge) */
export const roundSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" preserveAspectRatio="xMidYMid meet">
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

  <text x="540" y="430" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="24" fill="${GOLD}" font-weight="800" letter-spacing="6">LATIN · ITALIA</text>

  ${wordmarkCentered(540, 540, 620)}

  <text x="540" y="660" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="22" fill="#cccccc" font-weight="500">Eventi · DJ · Scuole</text>

  <text x="540" y="790" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="20" fill="#ffffff" font-weight="800" letter-spacing="3">SCARICA L'APP</text>
  <text x="540" y="828" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="18" fill="#cccccc" font-weight="500">App Store · Google Play</text>
</svg>`;

/** APP ICON 1024x1024 — stacked LATIN / HUB wordmark centered. */
export const appIconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" preserveAspectRatio="xMidYMid meet">
  <defs>
    <linearGradient id="icGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1A0608" />
      <stop offset="0.55" stop-color="${BG}" />
      <stop offset="1" stop-color="${BRAND_DARK}" />
    </linearGradient>
    <radialGradient id="icGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${BRAND}" stop-opacity="0.35" />
      <stop offset="1" stop-color="${BRAND}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" rx="224" fill="url(#icGrad)" />
  <rect width="1024" height="1024" rx="224" fill="url(#icGlow)" />
  <rect x="14" y="14" width="996" height="996" rx="212" fill="none" stroke="${BRAND}" stroke-opacity="0.35" stroke-width="4" />

  ${wordmarkStacked(512, 512, 760)}
</svg>`;

/** SPLASH SCREEN 1284x2778 (iPhone Pro Max portrait) */
export const splashSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1284 2778" preserveAspectRatio="xMidYMid meet">
  <defs>
    <linearGradient id="sp" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${BG}" />
      <stop offset="0.4" stop-color="#0A0204" />
      <stop offset="1" stop-color="${BRAND_DARK}" />
    </linearGradient>
    <radialGradient id="spGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${BRAND}" stop-opacity="0.35" />
      <stop offset="1" stop-color="${BRAND}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1284" height="2778" fill="url(#sp)" />
  <rect width="1284" height="2778" fill="url(#spGlow)" />

  <text x="642" y="1200" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-weight="800" font-size="34" fill="${GOLD}" letter-spacing="8">LATIN MUSIC SCENE · ITALIA</text>

  ${wordmarkCentered(642, 1389, 1000)}

  <text x="642" y="1570" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-weight="500" font-size="32" fill="#cccccc">Eventi · DJ · Scuole · Playlist</text>

  <rect x="542" y="1660" width="200" height="6" rx="3" fill="${GOLD}" />

  <text x="642" y="2500" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-weight="700" font-size="26" fill="#888888" letter-spacing="4">CARICAMENTO IN CORSO...</text>
</svg>`;

export type LogoVariant = {
  key: "banner" | "square" | "round" | "app-icon" | "splash";
  title: string;
  subtitle: string;
  aspect: number;
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
  {
    key: "app-icon",
    title: "Icona App (store)",
    subtitle: "App Store & Google Play — 1024×1024 richiesto",
    aspect: 1,
    svg: appIconSvg,
    exportSize: { width: 1024, height: 1024 },
  },
  {
    key: "splash",
    title: "Splash Screen",
    subtitle: "Schermata di avvio verticale (iPhone Pro Max)",
    aspect: 1284 / 2778,
    svg: splashSvg,
    exportSize: { width: 1284, height: 2778 },
  },
];
