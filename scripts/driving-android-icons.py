from pathlib import Path
from PIL import Image

root=Path('mobile-app-source/android/app/src/main/res')
icon=Image.open('app-store-assets/AppIcon-1024.png').convert('RGBA')
for density,size in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
    folder=root/f'mipmap-{density}'
    folder.mkdir(parents=True,exist_ok=True)
    icon.resize((size,size),Image.Resampling.LANCZOS).save(folder/'ic_launcher.png')
    icon.resize((size,size),Image.Resampling.LANCZOS).save(folder/'ic_launcher_round.png')
    full=Image.new('RGBA',(round(size*2.25),round(size*2.25)),(255,255,255,0))
    logo=icon.resize((round(size*1.35),round(size*1.35)),Image.Resampling.LANCZOS)
    full.alpha_composite(logo,((full.width-logo.width)//2,(full.height-logo.height)//2))
    full.save(folder/'ic_launcher_foreground.png')
adaptive=root/'mipmap-anydpi-v26'
adaptive.mkdir(parents=True,exist_ok=True)
for name in ['ic_launcher.xml','ic_launcher_round.xml']:
    (adaptive/name).write_text('<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@android:color/white"/><foreground android:drawable="@mipmap/ic_launcher_foreground"/></adaptive-icon>\n')
