#!/usr/bin/env python3
"""
Crea screenshot per iPad 13" con dimensioni esatte: 2048 x 2732 px
"""

import asyncio
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFilter
from io import BytesIO
import os

APP_URL = "https://tribute-models-docs.preview.emergentagent.com"
ADMIN_EMAIL = "francesco@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Lanzarote1"
OUTPUT_DIR = "/app/appstore_screenshots/ipad_final"

# Dimensioni iPad 13"
TARGET_WIDTH = 2048
TARGET_HEIGHT = 2732

# Viewport iPad
IPAD_WIDTH = 1024
IPAD_HEIGHT = 1366

def create_ipad_mockup(screenshot_img, output_path):
    """Crea mockup iPad su sfondo bianco."""
    background = Image.new('RGB', (TARGET_WIDTH, TARGET_HEIGHT), (255, 255, 255))
    
    # Dimensioni iPad nel mockup (80% dell'altezza)
    ipad_height = int(TARGET_HEIGHT * 0.75)
    ipad_width = int(ipad_height * (IPAD_WIDTH / IPAD_HEIGHT) * 1.06)
    
    # Margini per bordi iPad
    screen_margin = int(ipad_width * 0.03)
    screen_width = ipad_width - (screen_margin * 2)
    screen_height = int(screen_width * (IPAD_HEIGHT / IPAD_WIDTH))
    
    screenshot_resized = screenshot_img.resize((screen_width, screen_height), Image.LANCZOS)
    
    # Frame iPad
    ipad_img = Image.new('RGBA', (ipad_width, ipad_height), (0, 0, 0, 0))
    ipad_draw = ImageDraw.Draw(ipad_img)
    
    corner_radius = int(ipad_width * 0.05)
    ipad_draw.rounded_rectangle([(0, 0), (ipad_width, ipad_height)], radius=corner_radius, fill=(30, 30, 32, 255))
    
    inner_margin = int(ipad_width * 0.02)
    inner_radius = corner_radius - inner_margin
    ipad_draw.rounded_rectangle([(inner_margin, inner_margin), (ipad_width - inner_margin, ipad_height - inner_margin)], radius=inner_radius, fill=(0, 0, 0, 255))
    
    screen_x = (ipad_width - screen_width) // 2
    screen_y = (ipad_height - screen_height) // 2
    
    if screenshot_resized.mode != 'RGBA':
        screenshot_resized = screenshot_resized.convert('RGBA')
    
    ipad_img.paste(screenshot_resized, (screen_x, screen_y))
    
    # Posiziona iPad al centro
    ipad_x = (TARGET_WIDTH - ipad_width) // 2
    ipad_y = (TARGET_HEIGHT - ipad_height) // 2 + int(TARGET_HEIGHT * 0.02)
    
    background.paste(ipad_img, (ipad_x, ipad_y), ipad_img)
    background.save(output_path, 'PNG', optimize=True)
    print(f"  Salvato: {output_path}")
    return output_path

async def capture_ipad_screenshots():
    screenshots = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': IPAD_WIDTH, 'height': IPAD_HEIGHT},
            device_scale_factor=2
        )
        page = await context.new_page()
        
        print("Catturando: Welcome...")
        await page.goto(APP_URL)
        await page.wait_for_timeout(2000)
        screenshots.append(('01_welcome', Image.open(BytesIO(await page.screenshot()))))
        
        print("Catturando: Login...")
        await page.click("text=Accedi")
        await page.wait_for_timeout(1500)
        screenshots.append(('02_login', Image.open(BytesIO(await page.screenshot()))))
        
        print("Login...")
        await page.fill('input[type="email"]', ADMIN_EMAIL)
        await page.fill('input[type="password"]', ADMIN_PASSWORD)
        await page.click('button:has-text("Accedi")')
        await page.wait_for_timeout(4000)
        
        print("Catturando: Dashboard...")
        screenshots.append(('03_dashboard', Image.open(BytesIO(await page.screenshot()))))
        
        print("Catturando: Dichiarazioni...")
        await page.click("text=Dichiarazioni dei Redditi")
        await page.wait_for_timeout(2000)
        screenshots.append(('04_dichiarazioni', Image.open(BytesIO(await page.screenshot()))))
        
        await browser.close()
    
    return screenshots

async def main():
    print("=" * 50)
    print(f"SCREENSHOT iPAD 13\" - {TARGET_WIDTH}x{TARGET_HEIGHT}px")
    print("=" * 50)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    screenshots = await capture_ipad_screenshots()
    
    print("\nCreazione mockup iPad...")
    for name, img in screenshots:
        output_path = os.path.join(OUTPUT_DIR, f"{name}_ipad_2048x2732.png")
        create_ipad_mockup(img, output_path)
    
    print("\n✅ Completato!")

if __name__ == "__main__":
    asyncio.run(main())
