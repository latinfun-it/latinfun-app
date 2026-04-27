/**
 * Logo kit completo: sfondo NERO, wordmark LATIN bianco + FUN rosso
 * (stesso font della home), con tagline + subtitle + pills App Store/Google Play.
 * Dimensioni ridotte per sicurezza: margini 15% sui lati.
 */

const BG = "#050505";
const BRAND = "#E11D48";
const GOLD = "#F59E0B";
const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const OFFSET_SINGLE = 0.33;
const OFFSET_STACKED = 0.33;

/** Pills App Store / Google Play (larghezza totale 436px, altezza 60px). */
function promoPills(x: number, y: number, scale = 1) {
  const w = 210 * scale;
  const h = 60 * scale;
  const gap = 16 * scale;
  const pill = (cx: number, cy: number, label: string, sub: string) => `
    <g transform="translate(${cx}, ${cy})">
      <rect width="${w}" height="${h}" rx="${h / 2}" fill="#ffffff" />
      <text x="${24 * scale}" y="${h / 2 - 4 * scale}" font-family="${FONT_STACK}" font-size="${12 * scale}" fill="#555555" font-weight="600">${label}</text>
      <text x="${24 * scale}" y="${h / 2 + 16 * scale}" font-family="${FONT_STACK}" font-size="${18 * scale}" fill="#050505" font-weight="900">${sub}</text>
    </g>
  `;
  return pill(x, y, "SCARICA SU", "App Store") + pill(x + w + gap, y, "DISPONIBILE SU", "Google Play");
}

/** Wordmark "LATINFUN" su una riga, centrato a (cx, cy). */
function wordmarkCentered(cx: number, cy: number, totalWidth: number) {
  const fontSize = totalWidth * 0.24;
  const baseY = cy + fontSize * OFFSET_SINGLE;
  const startX = cx - totalWidth / 2;
  const ls = -fontSize * 0.04;
  return `<text x="${startX}" y="${baseY}" font-family="${FONT_STACK}" font-weight="900" font-size="${fontSize}" letter-spacing="${ls}" textLength="${totalWidth}" lengthAdjust="spacingAndGlyphs"><tspan fill="#ffffff">LATIN</tspan><tspan fill="${BRAND}">FUN</tspan></text>`;
}

/** Stacked wordmark per icona app. */
function wordmarkStacked(cx: number, cy: number, width: number) {
  const fontSize = width * 0.36;
  const lineGap = fontSize * 0.88;
  const latinY = cy - lineGap / 2 + fontSize * OFFSET_STACKED;
  const funY = cy + lineGap / 2 + fontSize * OFFSET_STACKED;
  const startX = cx - width / 2;
  const funWidth = width * 0.68;
  const ls = -fontSize * 0.04;
  return `
    <text x="${startX}" y="${latinY}" font-family="${FONT_STACK}" font-weight="900" font-size="${fontSize}" letter-spacing="${ls}" textLength="${width}" lengthAdjust="spacingAndGlyphs" fill="#ffffff">LATIN</text>
    <text x="${cx - funWidth / 2}" y="${funY}" font-family="${FONT_STACK}" font-weight="900" font-size="${fontSize}" letter-spacing="${ls}" textLength="${funWidth}" lengthAdjust="spacingAndGlyphs" fill="${BRAND}">FUN</text>
  `;
}

function centeredText(cx: number, cy: number, fontSize: number, color: string, weight: number, spacing: number, content: string) {
  const baseY = cy + fontSize * OFFSET_SINGLE;
  return `<text x="${cx}" y="${baseY}" text-anchor="middle" font-family="${FONT_STACK}" font-size="${fontSize}" fill="${color}" font-weight="${weight}" letter-spacing="${spacing}">${content}</text>`;
}

/** BANNER 1600x900 — wordmark 900px al centro (margine 350px lati), tagline+subtitle+pills. */
export const bannerSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet">
  <rect width="1600" height="900" fill="${BG}" />
  ${centeredText(800, 250, 30, GOLD, 800, 6, "LATIN MUSIC SCENE · ITALIA")}
  ${wordmarkCentered(800, 420, 900)}
  ${centeredText(800, 600, 28, "#cccccc", 500, 0, "Eventi · DJ · Scuole di ballo · Playlist")}
  <g transform="translate(${(1600 - 436) / 2}, 720)">${promoPills(0, 0, 1)}</g>
</svg>`;

/** SQUARE 1080x1080 — wordmark 680px (margine 200px lati). */
export const squareSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" preserveAspectRatio="xMidYMid meet">
  <rect width="1080" height="1080" fill="${BG}" />
  ${centeredText(540, 330, 26, GOLD, 800, 5, "LATIN MUSIC SCENE · ITALIA")}
  ${wordmarkCentered(540, 510, 680)}
  ${centeredText(540, 680, 26, "#cccccc", 500, 0, "Eventi · DJ · Scuole · Playlist")}
  <g transform="translate(${(1080 - 436) / 2}, 880)">${promoPills(0, 0, 1)}</g>
</svg>`;

/** ROUND 1080x1080 — wordmark 580px dentro cerchio con bordo rosso. */
export const roundSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" preserveAspectRatio="xMidYMid meet">
  <rect width="1080" height="1080" fill="${BG}" />
  <circle cx="540" cy="540" r="500" fill="${BG}" stroke="${BRAND}" stroke-width="10" />
  ${centeredText(540, 400, 22, GOLD, 800, 5, "LATIN · ITALIA")}
  ${wordmarkCentered(540, 540, 580)}
  ${centeredText(540, 660, 20, "#cccccc", 500, 0, "Eventi · DJ · Scuole")}
  ${centeredText(540, 780, 17, "#ffffff", 700, 3, "SCARICA L'APP")}
  ${centeredText(540, 820, 15, "#cccccc", 500, 0, "App Store · Google Play")}
</svg>`;

/** APP ICON 1024x1024 — stacked wordmark 640px al centro (margine 192px). */
export const appIconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" preserveAspectRatio="xMidYMid meet">
  <rect width="1024" height="1024" rx="224" fill="${BG}" />
  ${wordmarkStacked(512, 512, 640)}
</svg>`;

/** SPLASH 1284x2778 — wordmark 900px al centro verticale. */
export const splashSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1284 2778" preserveAspectRatio="xMidYMid meet">
  <rect width="1284" height="2778" fill="${BG}" />
  ${centeredText(642, 1180, 32, GOLD, 800, 8, "LATIN MUSIC SCENE · ITALIA")}
  ${wordmarkCentered(642, 1389, 900)}
  ${centeredText(642, 1580, 30, "#cccccc", 500, 0, "Eventi · DJ · Scuole · Playlist")}
  <g transform="translate(${(1284 - 436) / 2}, 1700)">${promoPills(0, 0, 1)}</g>
  ${centeredText(642, 2500, 22, "#888888", 700, 4, "CARICAMENTO IN CORSO...")}
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
