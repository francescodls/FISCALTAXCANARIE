#!/usr/bin/env python3
"""
Script per catturare screenshot reali dall'app e creare mockup iPhone per App Store.
"""

import asyncio
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFilter
from io import BytesIO
import os

# Configurazione
APP_URL = "https://tribute-models-docs.preview.emergentagent.com"
ADMIN_EMAIL = "francesco@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Lanzarote1"
OUTPUT_DIR = "/app/appstore_screenshots/mockup_final"
LOGO_PATH = "/app/appstore_screenshots/logo_official.png"

# Dimensioni iPhone (schermo)
IPHONE_SCREEN_WIDTH = 390
IPHONE_SCREEN_HEIGHT = 844

# Dimensioni finali per App Store (iPhone 6.5")
TARGET_WIDTH = 1284
TARGET_HEIGHT = 2778

def create_iphone_mockup(screenshot_img, output_path):
    """
    Crea un mockup iPhone moderno con sfondo bianco.
    """
    # Dimensioni del mockup
    mockup_width = TARGET_WIDTH
    mockup_height = TARGET_HEIGHT
    
    # Crea sfondo bianco
    background = Image.new('RGB', (mockup_width, mockup_height), (255, 255, 255))
    
    # Calcola dimensioni del telefono nel mockup
    # Il telefono occuperà circa il 75% dell'altezza
    phone_height = int(mockup_height * 0.72)
    phone_width = int(phone_height * (IPHONE_SCREEN_WIDTH / IPHONE_SCREEN_HEIGHT) * 1.08)  # Aggiungi bordi
    
    # Ridimensiona lo screenshot
    screen_margin = int(phone_width * 0.04)  # Margine per i bordi del telefono
    screen_width = phone_width - (screen_margin * 2)
    screen_height = int(screen_width * (IPHONE_SCREEN_HEIGHT / IPHONE_SCREEN_WIDTH))
    
    screenshot_resized = screenshot_img.resize((screen_width, screen_height), Image.LANCZOS)
    
    # Crea il frame del telefono (rettangolo arrotondato nero/grigio)
    phone_img = Image.new('RGBA', (phone_width, phone_height), (0, 0, 0, 0))
    phone_draw = ImageDraw.Draw(phone_img)
    
    # Bordo esterno del telefono (titanio scuro)
    corner_radius = int(phone_width * 0.12)
    phone_draw.rounded_rectangle(
        [(0, 0), (phone_width, phone_height)],
        radius=corner_radius,
        fill=(30, 30, 32, 255)  # Titanio scuro
    )
    
    # Bordo interno (schermo con bordo sottile)
    inner_margin = int(phone_width * 0.025)
    inner_radius = corner_radius - inner_margin
    phone_draw.rounded_rectangle(
        [(inner_margin, inner_margin), (phone_width - inner_margin, phone_height - inner_margin)],
        radius=inner_radius,
        fill=(0, 0, 0, 255)  # Nero per lo schermo
    )
    
    # Posiziona lo screenshot sullo schermo
    screen_x = (phone_width - screen_width) // 2
    screen_y = int(phone_height * 0.04)  # Un po' più in basso per la Dynamic Island
    
    # Crea maschera arrotondata per lo screenshot
    mask = Image.new('L', (screen_width, screen_height), 0)
    mask_draw = ImageDraw.Draw(mask)
    screen_radius = int(inner_radius * 0.9)
    mask_draw.rounded_rectangle([(0, 0), (screen_width, screen_height)], radius=screen_radius, fill=255)
    
    # Converti screenshot a RGBA
    if screenshot_resized.mode != 'RGBA':
        screenshot_resized = screenshot_resized.convert('RGBA')
    
    # Incolla lo screenshot
    phone_img.paste(screenshot_resized, (screen_x, screen_y), mask)
    
    # Dynamic Island (pillola nera in alto)
    island_width = int(phone_width * 0.28)
    island_height = int(phone_height * 0.025)
    island_x = (phone_width - island_width) // 2
    island_y = int(phone_height * 0.015)
    phone_draw.rounded_rectangle(
        [(island_x, island_y), (island_x + island_width, island_y + island_height)],
        radius=island_height // 2,
        fill=(0, 0, 0, 255)
    )
    
    # Aggiungi ombra sottile
    shadow = Image.new('RGBA', (phone_width + 60, phone_height + 60), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        [(30, 30), (phone_width + 30, phone_height + 30)],
        radius=corner_radius,
        fill=(0, 0, 0, 40)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=15))
    
    # Posiziona telefono al centro dello sfondo
    phone_x = (mockup_width - phone_width) // 2
    phone_y = (mockup_height - phone_height) // 2 + int(mockup_height * 0.05)  # Leggermente più in basso
    
    # Incolla ombra
    background.paste(shadow, (phone_x - 30, phone_y - 30), shadow)
    
    # Incolla telefono
    background.paste(phone_img, (phone_x, phone_y), phone_img)
    
    # Salva
    background.save(output_path, 'PNG', optimize=True)
    print(f"  Salvato: {output_path}")
    return output_path

async def capture_screenshots():
    """Cattura screenshot dall'app."""
    screenshots = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': IPHONE_SCREEN_WIDTH, 'height': IPHONE_SCREEN_HEIGHT},
            device_scale_factor=2  # Retina
        )
        page = await context.new_page()
        
        # 1. Welcome page
        print("Catturando: Welcome page...")
        await page.goto(APP_URL)
        await page.wait_for_timeout(2000)
        screenshot_bytes = await page.screenshot()
        screenshots.append(('01_welcome', Image.open(BytesIO(screenshot_bytes))))
        
        # 2. Login form
        print("Catturando: Login form...")
        await page.click("text=Accedi")
        await page.wait_for_timeout(1500)
        screenshot_bytes = await page.screenshot()
        screenshots.append(('02_login', Image.open(BytesIO(screenshot_bytes))))
        
        # 3. Effettua login e cattura dashboard
        print("Login in corso...")
        await page.fill('input[type="email"]', ADMIN_EMAIL)
        await page.fill('input[type="password"]', ADMIN_PASSWORD)
        await page.click('button:has-text("Accedi")')
        await page.wait_for_timeout(4000)
        
        print("Catturando: Dashboard...")
        screenshot_bytes = await page.screenshot()
        screenshots.append(('03_dashboard', Image.open(BytesIO(screenshot_bytes))))
        
        # 4. Dichiarazioni
        print("Catturando: Dichiarazioni...")
        await page.click("text=Dichiarazioni dei Redditi")
        await page.wait_for_timeout(2000)
        screenshot_bytes = await page.screenshot()
        screenshots.append(('04_dichiarazioni', Image.open(BytesIO(screenshot_bytes))))
        
        await browser.close()
    
    return screenshots

async def main():
    print("=" * 60)
    print("CREAZIONE MOCKUP iPHONE CON SCREENSHOT REALI")
    print(f"Dimensioni finali: {TARGET_WIDTH}x{TARGET_HEIGHT} (iPhone 6.5\")")
    print("=" * 60)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Cattura screenshot
    print("\n📸 Cattura screenshot dall'app...")
    screenshots = await capture_screenshots()
    
    # Crea mockup
    print("\n📱 Creazione mockup iPhone...")
    output_files = []
    for name, img in screenshots:
        output_path = os.path.join(OUTPUT_DIR, f"{name}_mockup_1284x2778.png")
        create_iphone_mockup(img, output_path)
        output_files.append(output_path)
    
    print("\n" + "=" * 60)
    print("✅ COMPLETATO! File pronti per App Store:")
    for f in output_files:
        print(f"  - {f}")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
