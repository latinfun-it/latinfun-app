/**
 * Logo kit minimale: sfondo NERO PIENO, wordmark LATIN (bianco) + HUB (rosso),
 * perfettamente centrato in ciascun formato. Nessun elemento decorativo aggiuntivo.
 */

const BG = "#050505";
const BRAND = "#E11D48";
// Font stack = identico alla home: sistema black / SF Pro Black / Roboto Black, con peso 900 e letter-spacing stretto
const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

// Offset baseline (empirico per system black) per posizionare il centro visivo a cy
const OFFSET_SINGLE = 0.33;
const OFFSET_STACKED = 0.33;

/** Wordmark "LATIN"+"HUB" su una riga, centrato a (cx, cy).
 *  letter-spacing negativo replica lo stile della home. */
function wordmarkCentered(cx: number, cy: number, totalWidth: number) {
  const fontSize = totalWidth * 0.24;
  const baseY = cy + fontSize * OFFSET_SINGLE;
  const startX = cx - totalWidth / 2;
  const ls = -fontSize * 0.04;
  return `<text x="${startX}" y="${baseY}" font-family="${FONT_STACK}" font-weight="900" font-size="${fontSize}" letter-spacing="${ls}" textLength="${totalWidth}" lengthAdjust="spacingAndGlyphs"><tspan fill="#ffffff">LATIN</tspan><tspan fill="${BRAND}">HUB</tspan></text>`;
}

/** Stacked wordmark: LATIN sopra, HUB sotto, centro visivo dello stack a cy. */
function wordmarkStacked(cx: number, cy: number, width: number) {
  const fontSize = width * 0.36;
  const lineGap = fontSize * 0.88;
  const latinY = cy - lineGap / 2 + fontSize * OFFSET_STACKED;
  const hubY = cy + lineGap / 2 + fontSize * OFFSET_STACKED;
  const startX = cx - width / 2;
  const hubWidth = width * 0.68;
  const ls = -fontSize * 0.04;
  return `
    <text x="${startX}" y="${latinY}" font-family="${FONT_STACK}" font-weight="900" font-size="${fontSize}" letter-spacing="${ls}" textLength="${width}" lengthAdjust="spacingAndGlyphs" fill="#ffffff">LATIN</text>
    <text x="${cx - hubWidth / 2}" y="${hubY}" font-family="${FONT_STACK}" font-weight="900" font-size="${fontSize}" letter-spacing="${ls}" textLength="${hubWidth}" lengthAdjust="spacingAndGlyphs" fill="${BRAND}">HUB</text>
  `;
}

/** BANNER 1600x900 — sfondo nero, wordmark al centro esatto. */
export const bannerSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet">
  <rect width="1600" height="900" fill="${BG}" />
  ${wordmarkCentered(800, 450, 1100)}
</svg>`;

/** SQUARE 1080x1080 — sfondo nero, wordmark al centro. */
export const squareSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" preserveAspectRatio="xMidYMid meet">
  <rect width="1080" height="1080" fill="${BG}" />
  ${wordmarkCentered(540, 540, 850)}
</svg>`;

/** ROUND 1080x1080 — cerchio nero con bordo rosso, wordmark al centro del cerchio. */
export const roundSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" preserveAspectRatio="xMidYMid meet">
  <rect width="1080" height="1080" fill="${BG}" />
  <circle cx="540" cy="540" r="510" fill="${BG}" stroke="${BRAND}" stroke-width="10" />
  ${wordmarkCentered(540, 540, 720)}
</svg>`;

/** APP ICON 1024x1024 — quadrato nero arrotondato, stacked wordmark centrato. */
export const appIconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" preserveAspectRatio="xMidYMid meet">
  <rect width="1024" height="1024" rx="224" fill="${BG}" />
  ${wordmarkStacked(512, 512, 800)}
</svg>`;

/** SPLASH 1284x2778 — sfondo nero, wordmark al centro verticale. */
export const splashSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1284 2778" preserveAspectRatio="xMidYMid meet">
  <rect width="1284" height="2778" fill="${BG}" />
  ${wordmarkCentered(642, 1389, 1000)}
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
  { key: "banner", title: "Banner orizzontale", subtitle: "Header social, cover Facebook/LinkedIn", aspect: 1600 / 900, svg: bannerSvg, exportSize: { width: 1600, height: 900 } },
  { key: "square", title: "Quadrato", subtitle: "Post Instagram, stories, WhatsApp", aspect: 1, svg: squareSvg, exportSize: { width: 1080, height: 1080 } },
  { key: "round", title: "Tondo / Badge", subtitle: "Avatar, profilo, sticker", aspect: 1, svg: roundSvg, exportSize: { width: 1080, height: 1080 } },
  { key: "app-icon", title: "Icona App (store)", subtitle: "App Store & Google Play — 1024×1024", aspect: 1, svg: appIconSvg, exportSize: { width: 1024, height: 1024 } },
  { key: "splash", title: "Splash Screen", subtitle: "Schermata di avvio (iPhone Pro Max)", aspect: 1284 / 2778, svg: splashSvg, exportSize: { width: 1284, height: 2778 } },
];
