/**
 * Script per generare screenshot automatici per App Store e Google Play
 * 
 * Uso:
 *   cd /app/tools
 *   node generate_screenshots.js
 * 
 * Genera screenshot nelle cartelle:
 *   /app/tools/screenshots/ios-6.9/
 *   /app/tools/screenshots/android/
 */

const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const OUT_DIR = path.join(__dirname, 'screenshots');

// iPhone 6.9" (iPhone 16 Pro Max) - 1320x2868 richiesto da Apple
// Viewport logico: 440x956 a scale 3 = 1320x2868
const IOS_VIEWPORT = { width: 440, height: 956 };
const IOS_SCALE = 3;

// Android phone (Pixel 7) - 1080x2400
const ANDROID_VIEWPORT = { width: 412, height: 915 };
const ANDROID_SCALE = 3;

const SCREENS = [
  {
    name: '01-home',
    url: '/',
    title: 'Scopri il mondo latino',
    wait: 3000,
  },
  {
    name: '02-events',
    url: '/(tabs)/events',
    title: 'Tutti gli eventi latini',
    wait: 2500,
  },
  {
    name: '03-djs',
    url: '/(tabs)/djs',
    title: 'I migliori DJ latini',
    wait: 2500,
  },
  {
    name: '04-schools',
    url: '/(tabs)/schools',
    title: 'Scuole di ballo',
    wait: 2500,
  },
  {
    name: '05-music',
    url: '/(tabs)/music',
    title: 'Playlist curate',
    wait: 2500,
  },
  {
    name: '06-dancer',
    url: '/dancer',
    title: 'Trova il tuo partner',
    wait: 2500,
  },
  {
    name: '07-profile',
    url: '/(tabs)/profile',
    title: 'Il tuo profilo',
    wait: 2500,
  },
];

async function takeScreenshot(browser, platform, viewport, scale, outSubdir) {
  const outPath = path.join(OUT_DIR, outSubdir);
  if (!fs.existsSync(outPath)) fs.mkdirSync(outPath, { recursive: true });

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: scale,
    userAgent:
      platform === 'ios'
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
        : 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Mobile',
  });

  const page = await context.newPage();

  console.log(`\n🎬 Generating ${platform.toUpperCase()} screenshots...`);
  for (const screen of SCREENS) {
    const fileName = `${screen.name}.png`;
    const filePath = path.join(outPath, fileName);
    try {
      console.log(`  📸 ${screen.name} → ${filePath}`);
      await page.goto(`${BASE_URL}${screen.url}`, {
        waitUntil: 'networkidle',
        timeout: 20000,
      });
      await page.waitForTimeout(screen.wait);
      // Scroll to top to ensure consistent framing
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`  ✅ ${fileName}`);
    } catch (err) {
      console.error(`  ❌ Error on ${screen.name}:`, err.message);
    }
  }
  await context.close();
}

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    await takeScreenshot(browser, 'ios', IOS_VIEWPORT, IOS_SCALE, 'ios-6.9');
    await takeScreenshot(browser, 'android', ANDROID_VIEWPORT, ANDROID_SCALE, 'android');
  } finally {
    await browser.close();
  }

  console.log(`\n✨ Done! Screenshots in ${OUT_DIR}`);
  console.log(`   - iOS: ${path.join(OUT_DIR, 'ios-6.9')}`);
  console.log(`   - Android: ${path.join(OUT_DIR, 'android')}`);
})();
