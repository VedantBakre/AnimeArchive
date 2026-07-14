import openpyxl
import json
import os

# Absolute or relative paths
xlsx_path = 'assets/data/anime.xlsx'
posters_dir = 'assets/posters'
lofi_dir = 'assets/music/lofi'
ambience_dir = 'assets/music/ambience'
atmosphere_dir = 'assets/atmosphere'
output_path = 'data.js'

print("🔄 Compiling project assets and excel sheets into data.js...")

# 1. Parse Anime Excel Sheet
if not os.path.exists(xlsx_path):
    print(f"❌ Error: Could not find {xlsx_path}!")
    exit(1)

wb = openpyxl.load_workbook(xlsx_path)
sheet = wb.active
rows = list(sheet.iter_rows(values_only=True))

headers = [cell for cell in rows[0] if cell is not None]

anime_entries = []
for r in rows[1:]:
    if not r or r[0] is None:
        continue
    
    entry = {}
    for i, h in enumerate(headers):
        val = r[i] if i < len(r) else None
        entry[h] = val
    
    folder_name = entry.get('Folder Name')
    if not folder_name:
        continue
        
    # Check posters inside directories
    folder_path = os.path.join(posters_dir, folder_name)
    posters = []
    if os.path.exists(folder_path):
        # List and sort alphabetically (e.g. 1.webp, 2.jpg)
        files = sorted(os.listdir(folder_path))
        for f in files:
            if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif')):
                posters.append(f"assets/posters/{folder_name}/{f}")
                
    jp_name = entry.get('Japanese Name')
    if jp_name:
        jp_name = str(jp_name).strip()
    
    genre_str = entry.get('Genre')
    genres = [g.strip() for g in genre_str.split(',')] if genre_str else []
    
    my_rating = entry.get('My Rating')
    if my_rating:
        my_rating = str(my_rating).replace('\\', '/')
        
    fav = True if entry.get('Fav') and str(entry.get('Fav')).lower() == 'yes' else False
    
    anime_entries.append({
        "id": entry.get('ID'),
        "name": entry.get('Name'),
        "japaneseName": jp_name,
        "type": entry.get('Type'),
        "rating": entry.get('Rating'),
        "myRating": my_rating,
        "feedback": entry.get('Feedback'),
        "seasons": entry.get('No. of Seasons'),
        "episodes": entry.get('Avg No. of Episodes'),
        "year": entry.get('Released Year'),
        "runtime": entry.get('Runtime'),
        "studio": entry.get('Studio'),
        "director": entry.get('Director'),
        "genres": genres,
        "folderName": folder_name,
        "posters": posters,
        "status": entry.get('Status'),
        "fav": fav
    })

# 2. Parse Lofi Audio Tracks
lofi_tracks = []
if os.path.exists(lofi_dir):
    files = sorted(os.listdir(lofi_dir))
    for f in files:
        if f.lower().endswith(('.m4a', '.mp3', '.wav', '.ogg')):
            display_name = os.path.splitext(f)[0].replace('-', ' ').title()
            lofi_tracks.append({
                "title": display_name,
                "file": f"assets/music/lofi/{f}"
            })

# 3. Parse Ambient Audio Tracks
ambience_tracks = []
if os.path.exists(ambience_dir):
    files = sorted(os.listdir(ambience_dir))
    for f in files:
        if f.lower().endswith(('.m4a', '.mp3', '.wav', '.ogg')):
            base = os.path.splitext(f)[0]
            if "Rain" in base or "Thunderstorm" in base:
                display_name = "Rain & Thunderstorm"
            elif "Ocean" in base:
                display_name = "Ocean Waves"
            elif "Universe" in base or "Space" in base:
                display_name = "Space Ambience"
            else:
                display_name = base.replace('-', ' ').title()
                
            ambience_tracks.append({
                "title": display_name,
                "file": f"assets/music/ambience/{f}"
            })

# 4. Parse Atmosphere loop videos
atmospheres = []
if os.path.exists(atmosphere_dir):
    files = sorted(os.listdir(atmosphere_dir))
    for f in files:
        if f.lower().endswith(('.mp4', '.webm')):
            base = os.path.splitext(f)[0]
            display_name = base.replace('-', ' ').title()
            sound_match = None
            theme_color = "#B08968"
            if "rain" in base.lower():
                sound_match = "Rain & Thunderstorm"
                theme_color = "#5A738E"
            elif "ocean" in base.lower() or "sea" in base.lower():
                sound_match = "Ocean Waves"
                theme_color = "#4D6B82"
            elif "space" in base.lower() or "universe" in base.lower():
                sound_match = "Space Ambience"
                theme_color = "#394E68"
            elif "room" in base.lower() or "gaming" in base.lower():
                sound_match = "Rain & Thunderstorm"
                theme_color = "#8C6A5C"
                
            atmospheres.append({
                "id": base.lower().replace(' ', '-'),
                "name": display_name,
                "video": f"assets/atmosphere/{f}",
                "suggestedSound": sound_match,
                "themeColor": theme_color
            })

# Write to data.js
data_js_content = f"""// Auto-generated data file from anime.xlsx and asset directories
const animeList = {json.dumps(anime_entries, indent=2, ensure_ascii=False)};

const lofiPlaylist = {json.dumps(lofi_tracks, indent=2, ensure_ascii=False)};

const ambiencePlaylist = {json.dumps(ambience_tracks, indent=2, ensure_ascii=False)};

const atmospheres = {json.dumps(atmospheres, indent=2, ensure_ascii=False)};
"""

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(data_js_content)

print(f"✅ Compile complete! Generated {len(anime_entries)} anime entries, {len(lofi_tracks)} lofi tracks, {len(ambience_tracks)} ambient sounds, and {len(atmospheres)} atmospheres.")
