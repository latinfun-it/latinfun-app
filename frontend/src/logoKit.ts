/**
 * Branded SVG templates — wordmark "LATIN"+"HUB" PERFETTAMENTE centrato
 * tramite calcolo esplicito della baseline (Arial Black cap-height ≈ 0.73*fontSize).
 * Funziona in tutti i renderer SVG (browser, canvas→PNG, nativi).
 */

const BG = "#050505";
const BRAND = "#E11D48";
const BRAND_DARK = "#9F1239";
const GOLD = "#F59E0B";
const FONT_STACK = "Impact, 'Arial Black', Arial, sans-serif";

// Offset empirici per compensare la baseline del font e posizionare visivamente al centro.
const OFFSET_SINGLE = 0.75; // per wordmark su unica riga (Impact/Arial Black)
const OFFSET_STACKED = 0.36; // per stacked: LATIN/HUB simmetrici rispetto a cy

/** Un unico <text> con due <tspan> (LATIN bianco + HUB rosso). */
function wordmarkCentered(cx: number, cy: number, totalWidth: number) {
  const fontSize = totalWidth * 0.22;
  const baseY = cy + fontSize * OFFSET_SINGLE;
  const startX = cx - totalWidth / 2;
  return `<text x="${startX}" y="${baseY}" font-family="${FONT_STACK}" font-weight="900" font-size="${fontSize}" textLength="${totalWidth}" lengthAdjust="spacingAndGlyphs"><tspan fill="#ffffff">LATIN</tspan><tspan fill="${BRAND}">HUB</tspan></text>`;
}

/** LATIN sopra, HUB sotto — cy è il centro visivo dello stack. */
function wordmarkStacked(cx: number, cy: number, width: number) {
  const fontSize = width * 0.32;
  const lineGap = fontSize * 0.92;
  const latinY = cy - lineGap / 2 + fontSize * OFFSET_STACKED;
  const hubY = cy + lineGap / 2 + fontSize * OFFSET_STACKED;
  const startX = cx - width / 2;
  const hubWidth = width * 0.72;
  return `
    <text x="${startX}" y="${latinY}" font-family="${FONT_STACK}" font-weight="900" font-size="${fontSize}" textLength="${width}" lengthAdjust="spacingAndGlyphs" fill="#ffffff">LATIN</text>
    <text x="${cx - hubWidth / 2}" y="${hubY}" font-family="${FONT_STACK}" font-weight="900" font-size="${fontSize}" textLength="${hubWidth}" lengthAdjust="spacingAndGlyphs" fill="${BRAND}">HUB</text>
  `;
}

/** Testo centrato orizzontalmente con baseline calcolata rispetto al centro visivo. */
function centeredText(cx: number, cy: number, fontSize: number, color: string, weight: number, spacing: number, content: string) {
  const baseY = cy + fontSize * OFFSET_SINGLE;
  return `<text x="${cx}" y="${baseY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" fill="${color}" font-weight="${weight}" letter-spacing="${spacing}">${content}</text>`;
}

/** BANNER 1600x900 — wordmark al CENTRO esatto del canvas,
 *  tagline & subtitle simmetriche sopra/sotto. */
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

  ${centeredText(800, 280, 32, GOLD, 800, 6, "LATIN MUSIC SCENE · ITALIA")}
  ${wordmarkCentered(800, 450, 1050)}
  ${centeredText(800, 620, 32, "#cccccc", 500, 0, "Eventi · DJ · Scuole di ballo · Playlist")}
  ${centeredText(800, 830, 22, "#ffffff", 700, 4, "SCARICA L'APP  ·  App Store  ·  Google Play")}
</svg>`;

/** SQUARE 1080x1080 — wordmark al centro esatto (540,540). */
export const squareSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" preserveAspectRatio="xMidYMid meet">
  <defs>
    <linearGradient id="bgSq" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${BG}" />
      <stop offset="1" stop-color="#15060A" />
    </linearGradient>
    <radialGradient id="glowSq" cx="0.5" cy="0.5" r="0.55">
      <stop offset="0" stop-color="${BRAND}" stop-opacity="0.3" />
      <stop offset="1" stop-color="${BRAND}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bgSq)" />
  <rect width="1080" height="1080" fill="url(#glowSq)" />

  ${centeredText(540, 340, 28, GOLD, 800, 5, "LATIN MUSIC SCENE · ITALIA")}
  ${wordmarkCentered(540, 540, 800)}
  ${centeredText(540, 740, 28, "#cccccc", 500, 0, "Eventi · DJ · Scuole · Playlist")}
  ${centeredText(540, 940, 22, "#ffffff", 700, 4, "SCARICA L'APP  ·  App Store  ·  Google Play")}
</svg>`;

/** ROUND 1080x1080 — wordmark al centro del cerchio. */
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

  ${centeredText(540, 420, 26, GOLD, 800, 6, "LATIN · ITALIA")}
  ${wordmarkCentered(540, 540, 640)}
  ${centeredText(540, 660, 22, "#cccccc", 500, 0, "Eventi · DJ · Scuole · Playlist")}
</svg>`;

/** APP ICON 1024x1024 — stacked LATIN/HUB al centro esatto (512,512). */
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

/** SPLASH SCREEN 1284x2778 — wordmark al centro verticale del canvas. */
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

  ${centeredText(642, 1180, 36, GOLD, 800, 8, "LATIN MUSIC SCENE · ITALIA")}
  ${wordmarkCentered(642, 1389, 1000)}
  ${centeredText(642, 1600, 34, "#cccccc", 500, 0, "Eventi · DJ · Scuole · Playlist")}
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
  { key: "banner", title: "Banner orizzontale", subtitle: "Perfetto per header social, cover Facebook/LinkedIn", aspect: 1600 / 900, svg: bannerSvg, exportSize: { width: 1600, height: 900 } },
  { key: "square", title: "Quadrato", subtitle: "Per post Instagram, stories, WhatsApp broadcast", aspect: 1, svg: squareSvg, exportSize: { width: 1080, height: 1080 } },
  { key: "round", title: "Tondo / Badge", subtitle: "Avatar, profilo, sticker", aspect: 1, svg: roundSvg, exportSize: { width: 1080, height: 1080 } },
  { key: "app-icon", title: "Icona App (store)", subtitle: "App Store & Google Play — 1024×1024 richiesto", aspect: 1, svg: appIconSvg, exportSize: { width: 1024, height: 1024 } },
  { key: "splash", title: "Splash Screen", subtitle: "Schermata di avvio verticale (iPhone Pro Max)", aspect: 1284 / 2778, svg: splashSvg, exportSize: { width: 1284, height: 2778 } },
];
