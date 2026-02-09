from PIL import Image
import os

images = [
    'assets/icon.png',
    'assets/splash-icon.png',
    'assets/adaptive-icon.png',
    'assets/favicon.png'
]

for img_path in images:
    if os.path.exists(img_path):
        with Image.open(img_path) as img:
            print(f"{img_path}: {img.size[0]}x{img.size[1]}")
    else:
        print(f"{img_path}: NOT FOUND")
