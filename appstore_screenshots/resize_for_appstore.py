#!/usr/bin/env python3
"""
Script per ridimensionare gli screenshot alle dimensioni esatte richieste da Apple App Store Connect.
iPhone 6.7" (iPhone 14 Pro Max, 15 Pro Max): 1290 x 2796 pixels
"""

import requests
from PIL import Image
from io import BytesIO
import os

# URLs degli screenshot generati
SCREENSHOTS = [
    {
        "name": "01_login",
        "url": "https://static.prod-images.emergentagent.com/jobs/d8480d09-6e57-4895-af01-8566d54690e5/images/b2e0dc0e12291aaf4018e5cde53c3a59366ac030ee0b6531066441bd33e458f8.png"
    },
    {
        "name": "02_dashboard", 
        "url": "https://static.prod-images.emergentagent.com/jobs/d8480d09-6e57-4895-af01-8566d54690e5/images/edc9fefc6df8388e6f2b038b628a780222abea7b9884920e1d680699be46723d.png"
    },
    {
        "name": "03_dichiarazioni",
        "url": "https://static.prod-images.emergentagent.com/jobs/d8480d09-6e57-4895-af01-8566d54690e5/images/43dec97de1b1f54234660c96713a6dbe9b3d9789fa4a05c5685d05dbcf9bb1a8.png"
    },
    {
        "name": "04_documenti",
        "url": "https://static.prod-images.emergentagent.com/jobs/d8480d09-6e57-4895-af01-8566d54690e5/images/f43df1ba05a58e48000e43ab3ac64f8b3db788e82709e1fe2f4d99bb1974e875.png"
    },
    {
        "name": "05_chat",
        "url": "https://static.prod-images.emergentagent.com/jobs/d8480d09-6e57-4895-af01-8566d54690e5/images/3fd66701850c0674e03b695492367525af9ecf648969530a486b59f84d688e72.png"
    }
]

# Dimensioni richieste da Apple per iPhone 6.7"
TARGET_WIDTH = 1290
TARGET_HEIGHT = 2796

OUTPUT_DIR = "/app/appstore_screenshots"

def download_and_resize(screenshot_info):
    """Scarica l'immagine e la ridimensiona alle dimensioni Apple."""
    name = screenshot_info["name"]
    url = screenshot_info["url"]
    
    print(f"Elaborazione: {name}")
    
    # Scarica l'immagine
    response = requests.get(url)
    img = Image.open(BytesIO(response.content))
    
    # Converti in RGB (rimuove canale alpha se presente)
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
    
    # Calcola il rapporto di aspetto target
    target_ratio = TARGET_WIDTH / TARGET_HEIGHT  # ~0.461
    original_ratio = original_width / original_height
    
    # Ridimensiona mantenendo il contenuto centrato
    if original_ratio > target_ratio:
        # Immagine troppo larga, ridimensiona per altezza e aggiungi bande laterali
        new_height = TARGET_HEIGHT
        new_width = int(original_width * (TARGET_HEIGHT / original_height))
        img_resized = img.resize((new_width, new_height), Image.LANCZOS)
        
        # Crea immagine finale con sfondo bianco
        final_img = Image.new('RGB', (TARGET_WIDTH, TARGET_HEIGHT), (255, 255, 255))
        x_offset = (TARGET_WIDTH - new_width) // 2
        final_img.paste(img_resized, (x_offset, 0))
    else:
        # Immagine troppo alta o corretta, ridimensiona per larghezza e aggiungi bande sopra/sotto
        new_width = TARGET_WIDTH
        new_height = int(original_height * (TARGET_WIDTH / original_width))
        img_resized = img.resize((new_width, new_height), Image.LANCZOS)
        
        # Crea immagine finale con sfondo bianco
        final_img = Image.new('RGB', (TARGET_WIDTH, TARGET_HEIGHT), (255, 255, 255))
        y_offset = (TARGET_HEIGHT - new_height) // 2
        final_img.paste(img_resized, (0, y_offset))
    
    # Salva come PNG senza canale alpha (RGB)
    output_path = os.path.join(OUTPUT_DIR, f"{name}_appstore.png")
    final_img.save(output_path, 'PNG', optimize=True)
    
    # Verifica dimensioni finali
    verify_img = Image.open(output_path)
    print(f"  Dimensioni finali: {verify_img.size[0]}x{verify_img.size[1]}")
    print(f"  Salvato: {output_path}")
    
    return output_path

if __name__ == "__main__":
    print("=" * 60)
    print("RIDIMENSIONAMENTO SCREENSHOT PER APPLE APP STORE")
    print(f"Dimensioni target: {TARGET_WIDTH}x{TARGET_HEIGHT} (iPhone 6.7\")")
    print("=" * 60)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    output_files = []
    for screenshot in SCREENSHOTS:
        output_path = download_and_resize(screenshot)
        output_files.append(output_path)
    
    print("\n" + "=" * 60)
    print("COMPLETATO! File generati:")
    for f in output_files:
        print(f"  - {f}")
    print("=" * 60)
