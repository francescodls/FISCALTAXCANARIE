#!/usr/bin/env python3
"""
Script per creare screenshot premium per App Store con logo ufficiale Fiscal Tax Canarie.
Dimensioni ESATTE: 1284 x 2778 pixel (iPhone 6.5")
"""

import requests
from PIL import Image
from io import BytesIO
import os

# URLs degli screenshot premium generati (4 mockup 3D)
SCREENSHOTS = [
    {
        "name": "01_login",
        "url": "https://static.prod-images.emergentagent.com/jobs/d8480d09-6e57-4895-af01-8566d54690e5/images/6142473ec9077ff61ffa00bf64dd5fbb924541e78969fb512d6819cf0dfd6645.png",
        "caption": "Accedi in modo sicuro"
    },
    {
        "name": "02_dashboard", 
        "url": "https://static.prod-images.emergentagent.com/jobs/d8480d09-6e57-4895-af01-8566d54690e5/images/69baa4edea69b911bacc15d996e61bef759486e87bdcd54d6aef4f8dfd1922f9.png",
        "caption": "Monitora le tue pratiche"
    },
    {
        "name": "03_dichiarazioni",
        "url": "https://static.prod-images.emergentagent.com/jobs/d8480d09-6e57-4895-af01-8566d54690e5/images/8b12eb6f7ef7210ec7ccfeb88ae3f5b880b74985c14017b3beb5704f6af253dc.png",
        "caption": "Gestisci le dichiarazioni"
    },
    {
        "name": "04_documenti",
        "url": "https://static.prod-images.emergentagent.com/jobs/d8480d09-6e57-4895-af01-8566d54690e5/images/f8c786001d11092d5276fa29f377feb762f046cbfc8c0c9019c9ad34f293b8c6.png",
        "caption": "Carica i tuoi documenti"
    }
]

# Path del logo ufficiale
LOGO_PATH = "/app/appstore_screenshots/logo_official.png"

# Dimensioni ESATTE richieste da Apple per iPhone 6.5"
TARGET_WIDTH = 1284
TARGET_HEIGHT = 2778

OUTPUT_DIR = "/app/appstore_screenshots/premium_final"

def process_screenshot(screenshot_info, logo_img):
    """Processa screenshot: ridimensiona e aggiunge logo ufficiale."""
    name = screenshot_info["name"]
    url = screenshot_info["url"]
    
    print(f"Elaborazione: {name}")
    
    # Scarica l'immagine
    response = requests.get(url)
    img = Image.open(BytesIO(response.content))
    
    # Converti in RGB
    if img.mode in ('RGBA', 'P'):
        background = Image.new('RGB', img.size, (0, 0, 0))  # Sfondo nero
        if img.mode == 'P':
            img = img.convert('RGBA')
        if len(img.split()) == 4:
            background.paste(img, mask=img.split()[3])
        else:
            background.paste(img)
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    original_width, original_height = img.size
    print(f"  Dimensioni originali: {original_width}x{original_height}")
    
    # Ridimensiona per coprire completamente le dimensioni target
    scale_w = TARGET_WIDTH / original_width
    scale_h = TARGET_HEIGHT / original_height
    scale = max(scale_w, scale_h)
    
    new_width = int(original_width * scale)
    new_height = int(original_height * scale)
    
    img_resized = img.resize((new_width, new_height), Image.LANCZOS)
    
    # Ritaglia al centro
    left = (new_width - TARGET_WIDTH) // 2
    top = (new_height - TARGET_HEIGHT) // 2
    right = left + TARGET_WIDTH
    bottom = top + TARGET_HEIGHT
    
    final_img = img_resized.crop((left, top, right, bottom))
    
    # Aggiungi il logo ufficiale in alto al centro
    # Ridimensiona il logo (circa 300px di larghezza)
    logo_width = 350
    logo_ratio = logo_img.size[1] / logo_img.size[0]
    logo_height = int(logo_width * logo_ratio)
    logo_resized = logo_img.resize((logo_width, logo_height), Image.LANCZOS)
    
    # Posizione: centrato in alto con padding
    logo_x = (TARGET_WIDTH - logo_width) // 2
    logo_y = 120  # Padding dall'alto
    
    # Converti final_img a RGBA per il compositing
    final_rgba = final_img.convert('RGBA')
    
    # Paste logo con alpha
    if logo_resized.mode == 'RGBA':
        final_rgba.paste(logo_resized, (logo_x, logo_y), logo_resized)
    else:
        final_rgba.paste(logo_resized, (logo_x, logo_y))
    
    # Converti di nuovo a RGB per Apple
    final_rgb = Image.new('RGB', final_rgba.size, (0, 0, 0))
    final_rgb.paste(final_rgba, mask=final_rgba.split()[3] if final_rgba.mode == 'RGBA' else None)
    
    # Verifica dimensioni
    assert final_rgb.size == (TARGET_WIDTH, TARGET_HEIGHT), f"Errore dimensioni: {final_rgb.size}"
    
    # Salva
    output_path = os.path.join(OUTPUT_DIR, f"{name}_premium_1284x2778.png")
    final_rgb.save(output_path, 'PNG', optimize=True)
    
    print(f"  Dimensioni finali: {final_rgb.size[0]}x{final_rgb.size[1]}")
    print(f"  Salvato: {output_path}")
    
    return output_path

if __name__ == "__main__":
    print("=" * 60)
    print("SCREENSHOT PREMIUM CON LOGO UFFICIALE")
    print(f"Dimensioni: {TARGET_WIDTH}x{TARGET_HEIGHT} (iPhone 6.5\")")
    print("=" * 60)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Carica il logo ufficiale
    print("Caricamento logo ufficiale...")
    logo_img = Image.open(LOGO_PATH)
    if logo_img.mode != 'RGBA':
        logo_img = logo_img.convert('RGBA')
    print(f"  Logo caricato: {logo_img.size[0]}x{logo_img.size[1]}")
    
    output_files = []
    for screenshot in SCREENSHOTS:
        output_path = process_screenshot(screenshot, logo_img)
        output_files.append(output_path)
    
    print("\n" + "=" * 60)
    print("✅ COMPLETATO!")
    for f in output_files:
        print(f"  - {f}")
    print("=" * 60)
