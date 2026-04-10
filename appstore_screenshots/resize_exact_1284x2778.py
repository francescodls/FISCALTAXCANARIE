#!/usr/bin/env python3
"""
Script per ridimensionare gli screenshot alle dimensioni ESATTE richieste da Apple App Store Connect.
iPhone 6.5" : 1284 x 2778 pixels (PORTRAIT)
"""

import requests
from PIL import Image
from io import BytesIO
import os

# URLs degli screenshot generati con colori corporativi #3caca4
SCREENSHOTS = [
    {
        "name": "01_login",
        "url": "https://static.prod-images.emergentagent.com/jobs/d8480d09-6e57-4895-af01-8566d54690e5/images/a7f6c5548db6bb7d248867b03cce2bcbe4ec7aa357e4e236c546d79db47f1af5.png"
    },
    {
        "name": "02_dashboard", 
        "url": "https://static.prod-images.emergentagent.com/jobs/d8480d09-6e57-4895-af01-8566d54690e5/images/d16aafd6079a12eb66009d319f144d371890ced61f98d07f062b55acd15947b3.png"
    },
    {
        "name": "03_dichiarazioni",
        "url": "https://static.prod-images.emergentagent.com/jobs/d8480d09-6e57-4895-af01-8566d54690e5/images/fce04e8d5ffb557c0028700e387e547b4ac943e867c5db9e9108c50f2d8fae92.png"
    },
    {
        "name": "04_documenti",
        "url": "https://static.prod-images.emergentagent.com/jobs/d8480d09-6e57-4895-af01-8566d54690e5/images/6cfa780651de5c44ff5be6c72fb63f9d2ec76d5259a8f8697e303eb0dc0e1591.png"
    },
    {
        "name": "05_chat",
        "url": "https://static.prod-images.emergentagent.com/jobs/d8480d09-6e57-4895-af01-8566d54690e5/images/9e137460ea059c00a9b2f3f7ddc5ed9ebc07a56142f9ae1668b207f3051c7f04.png"
    }
]

# Dimensioni ESATTE richieste da Apple per iPhone 6.5"
TARGET_WIDTH = 1284
TARGET_HEIGHT = 2778

OUTPUT_DIR = "/app/appstore_screenshots/final"

def download_and_resize(screenshot_info):
    """Scarica l'immagine e la ridimensiona alle dimensioni ESATTE Apple."""
    name = screenshot_info["name"]
    url = screenshot_info["url"]
    
    print(f"Elaborazione: {name}")
    
    # Scarica l'immagine
    response = requests.get(url)
    img = Image.open(BytesIO(response.content))
    
    # Converti in RGB (rimuove canale alpha se presente) - OBBLIGATORIO per Apple
    if img.mode in ('RGBA', 'P'):
        # Crea sfondo bianco
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[3] if len(img.split()) == 4 else None)
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    original_width, original_height = img.size
    print(f"  Dimensioni originali: {original_width}x{original_height}")
    
    # Metodo: ridimensiona l'immagine per coprire completamente le dimensioni target,
    # poi ritaglia al centro per ottenere le dimensioni ESATTE
    
    # Calcola i rapporti di scala
    scale_w = TARGET_WIDTH / original_width
    scale_h = TARGET_HEIGHT / original_height
    
    # Usa la scala più grande per coprire tutto
    scale = max(scale_w, scale_h)
    
    new_width = int(original_width * scale)
    new_height = int(original_height * scale)
    
    # Ridimensiona
    img_resized = img.resize((new_width, new_height), Image.LANCZOS)
    
    # Ritaglia al centro per ottenere le dimensioni ESATTE
    left = (new_width - TARGET_WIDTH) // 2
    top = (new_height - TARGET_HEIGHT) // 2
    right = left + TARGET_WIDTH
    bottom = top + TARGET_HEIGHT
    
    final_img = img_resized.crop((left, top, right, bottom))
    
    # Verifica dimensioni
    assert final_img.size == (TARGET_WIDTH, TARGET_HEIGHT), f"Errore dimensioni: {final_img.size}"
    
    # Salva come PNG RGB (senza alpha) - JPEG anche accettato
    output_path = os.path.join(OUTPUT_DIR, f"{name}_1284x2778.png")
    final_img.save(output_path, 'PNG', optimize=True)
    
    # Verifica finale
    verify_img = Image.open(output_path)
    print(f"  Dimensioni finali: {verify_img.size[0]}x{verify_img.size[1]}")
    print(f"  Modalità colore: {verify_img.mode} (deve essere RGB)")
    print(f"  Salvato: {output_path}")
    
    return output_path

if __name__ == "__main__":
    print("=" * 60)
    print("RIDIMENSIONAMENTO SCREENSHOT PER APPLE APP STORE")
    print(f"Dimensioni target: {TARGET_WIDTH}x{TARGET_HEIGHT} (iPhone 6.5\")")
    print("Colori corporativi: #3caca4 (Teal Fiscal Tax Canarie)")
    print("=" * 60)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    output_files = []
    for screenshot in SCREENSHOTS:
        output_path = download_and_resize(screenshot)
        output_files.append(output_path)
    
    print("\n" + "=" * 60)
    print("✅ COMPLETATO! File pronti per App Store Connect:")
    for f in output_files:
        print(f"  - {f}")
    print("=" * 60)
    print("\nDimensioni: 1284 x 2778 pixel (ESATTE per iPhone 6.5\")")
    print("Formato: PNG RGB (senza trasparenza)")
