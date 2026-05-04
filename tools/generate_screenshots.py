"""
Script Python per generare screenshot App Store / Play Store.
Usa Playwright già installato in /usr/local/lib/python3.11

Uso:
    python3 /app/tools/generate_screenshots.py

Output:
    /app/tools/screenshots/ios-6.9/   (per App Store)
    /app/tools/screenshots/android/   (per Google Play)
"""
import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

BASE_URL = os.environ.get("APP_URL", "http://localhost:3000")
OUT_DIR = Path("/app/tools/screenshots")

# iPhone 6.9" (iPhone 16 Pro Max) - output 1320x2868
IOS_VIEWPORT = {"width": 440, "height": 956}
IOS_SCALE = 3

# Android phone (Pixel 7) - output 1236x2745
ANDROID_VIEWPORT = {"width": 412, "height": 915}
ANDROID_SCALE = 3

SCREENS = [
    {"name": "01-home", "url": "/", "wait": 3500},
    {"name": "02-events", "url": "/(tabs)/events", "wait": 3000},
    {"name": "03-djs", "url": "/(tabs)/djs", "wait": 3000},
    {"name": "04-schools", "url": "/(tabs)/schools", "wait": 3000},
    {"name": "05-music", "url": "/(tabs)/music", "wait": 3000},
    {"name": "06-dancer", "url": "/dancer", "wait": 3000},
    {"name": "07-profile", "url": "/(tabs)/profile", "wait": 3000},
]


async def login_and_save_state(browser, viewport, scale, user_agent):
    """Login as admin once, save storage state, reuse for all screenshots."""
    context = await browser.new_context(
        viewport=viewport,
        device_scale_factor=scale,
        user_agent=user_agent,
    )
    page = await context.new_page()
    print("  🔑 Logging in as admin...")
    await page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=20000)
    await page.wait_for_timeout(2500)
    # Use the "Login Demo Admin" button which auto-logs in
    try:
        await page.click('text=Login Demo Admin', timeout=3000)
        print("  ✅ Demo admin login clicked")
    except Exception as e:
        print(f"  ⚠️ Demo admin click failed: {e}, trying manual login")
        # Manual login fallback
        email = await page.query_selector('input[type="email"], input[placeholder*="mail" i]')
        if email:
            await email.fill("admin@latinfun.it")
        pwd = await page.query_selector('input[type="password"]')
        if pwd:
            await pwd.fill("admin123")
        await page.wait_for_timeout(500)
        try:
            await page.click('text=Accedi', timeout=3000)
        except Exception:
            pass
    await page.wait_for_timeout(5000)
    # Verify we're logged in by navigating to home and checking no "Accedi" button
    await page.goto(f"{BASE_URL}/", wait_until="networkidle", timeout=15000)
    await page.wait_for_timeout(2000)
    storage = await context.storage_state()
    await context.close()
    return storage


async def take_screenshots(browser, platform, viewport, scale, subdir, user_agent):
    out_path = OUT_DIR / subdir
    out_path.mkdir(parents=True, exist_ok=True)

    # First: login to get storage state (auth token in localStorage)
    storage = await login_and_save_state(browser, viewport, scale, user_agent)

    context = await browser.new_context(
        viewport=viewport,
        device_scale_factor=scale,
        user_agent=user_agent,
        storage_state=storage,
    )
    page = await context.new_page()

    print(f"\n🎬 {platform.upper()} screenshots ({viewport['width']*scale}x{viewport['height']*scale}):")
    for screen in SCREENS:
        file_path = out_path / f"{screen['name']}.png"
        try:
            print(f"  📸 {screen['name']} → {file_path.name}")
            await page.goto(f"{BASE_URL}{screen['url']}", wait_until="networkidle", timeout=25000)
            await page.wait_for_timeout(screen["wait"])
            await page.evaluate("window.scrollTo(0, 0)")
            await page.wait_for_timeout(500)
            await page.screenshot(path=str(file_path), full_page=False)
            print(f"     ✅")
        except Exception as e:
            print(f"     ❌ {e}")
    await context.close()


async def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            await take_screenshots(
                browser,
                "ios",
                IOS_VIEWPORT,
                IOS_SCALE,
                "ios-6.9",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
            )
            await take_screenshots(
                browser,
                "android",
                ANDROID_VIEWPORT,
                ANDROID_SCALE,
                "android",
                "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Mobile",
            )
        finally:
            await browser.close()
    print(f"\n✨ Done!")
    print(f"   iOS: {OUT_DIR / 'ios-6.9'}")
    print(f"   Android: {OUT_DIR / 'android'}")


if __name__ == "__main__":
    asyncio.run(main())
