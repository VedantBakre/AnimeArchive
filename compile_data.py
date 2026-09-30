import openpyxl
import json
import os
import re

# Absolute or relative paths
xlsx_path = 'assets/data/anime.xlsx'
posters_dir = 'assets/posters'
lofi_dir = 'assets/music/lofi'
ambience_dir = 'assets/music/ambience'
atmosphere_dir = 'assets/atmosphere'
output_path = 'data.js'

print("[Info] Compiling project assets and excel sheets into data.js...")

# --- Two-Way Sync: Load existing data.js to preserve Admin Mode edits ---
# Admin Mode can edit myRating, status, and feedback directly on GitHub.
# When recompiling from Excel, we preserve those fields if they were
# changed via Admin Mode (i.e., differ from what Excel has).
existing_admin_overrides = {}  # keyed by entry ID

def load_existing_data_js():
    """Parse the existing data.js and extract admin-editable fields per entry."""
    global existing_admin_overrides
    
    if not os.path.exists(output_path):
        print("[Info] No existing data.js found — fresh compile.")
        return
    
    try:
        with open(output_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract the animeList JSON array from the JS file
        # Pattern: const animeList = [ ... ];
        match = re.search(r'const\s+animeList\s*=\s*(\[[\s\S]*?\]);', content)
        if not match:
            print("[Warning] Could not parse existing data.js animeList — skipping two-way sync.")
            return
        
        anime_json = match.group(1)
        existing_entries = json.loads(anime_json)
        
        for entry in existing_entries:
            entry_id = entry.get('id')
            if entry_id is not None:
                existing_admin_overrides[entry_id] = {
                    'myRating': entry.get('myRating'),
                    'status': entry.get('status'),
                    'feedback': entry.get('feedback'),
                }
        
        print(f"[Info] Loaded {len(existing_admin_overrides)} existing entries for two-way sync.")
    except Exception as e:
        print(f"[Warning] Failed to parse existing data.js for two-way sync: {e}")

load_existing_data_js()

# 1. Parse Anime Excel Sheet
if not os.path.exists(xlsx_path):
    print(f"[Error] Could not find {xlsx_path}!")
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
            file_full = os.path.join(folder_path, f)
            if not os.path.isfile(file_full):
                continue
            if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif')):
                posters.append(f"assets/posters/{folder_name}/{f}")
            else:
                # Check magic bytes for images without standard extension
                try:
                    with open(file_full, 'rb') as img_f:
                        head = img_f.read(16)
                        if head.startswith(b'\xff\xd8\xff') or head.startswith(b'\x89PNG') or head.startswith(b'GIF8') or (head.startswith(b'RIFF') and b'WEBP' in head):
                            posters.append(f"assets/posters/{folder_name}/{f}")
                except Exception:
                    pass
    else:
        print(f"[Warning] Poster folder not found: '{folder_path}' — entry '{entry.get('Name')}' will have no posters.")
                
    jp_name = entry.get('Japanese Name')
    if jp_name:
        jp_name = str(jp_name).strip()
    
    genre_str = entry.get('Genre')
    genres = [g.strip() for g in genre_str.split(',')] if genre_str else []
    
    my_rating = entry.get('My Rating')
    if my_rating:
        my_rating = str(my_rating).replace('\\', '/')
        
    fav = True if entry.get('Fav') and str(entry.get('Fav')).lower() == 'yes' else False

    entry_id = entry.get('ID')
    feedback_from_excel = entry.get('Feedback')
    status_from_excel = entry.get('Status')

    # --- Two-Way Sync Logic ---
    # For myRating, status, and feedback: if the existing data.js has a
    # different value than Excel, prefer the data.js value (admin edits).
    # If data.js matches Excel or doesn't exist, use Excel's value.
    if entry_id is not None and entry_id in existing_admin_overrides:
        override = existing_admin_overrides[entry_id]
        
        # My Rating: prefer admin override if it exists and differs
        admin_rating = override.get('myRating')
        if admin_rating is not None and admin_rating != '' and admin_rating != my_rating:
            print(f"  [Sync] '{entry.get('Name')}' — keeping admin myRating: '{admin_rating}' (Excel has: '{my_rating}')")
            my_rating = admin_rating
        
        # Status: prefer admin override if it differs
        admin_status = override.get('status')
        if admin_status is not None and admin_status != '' and admin_status != status_from_excel:
            print(f"  [Sync] '{entry.get('Name')}' — keeping admin status: '{admin_status}' (Excel has: '{status_from_excel}')")
            status_from_excel = admin_status
        
        # Feedback: prefer admin override if it differs
        admin_feedback = override.get('feedback')
        if admin_feedback is not None and admin_feedback != '' and admin_feedback != feedback_from_excel:
            print(f"  [Sync] '{entry.get('Name')}' — keeping admin feedback: '{admin_feedback}' (Excel has: '{feedback_from_excel}')")
            feedback_from_excel = admin_feedback

    anime_entries.append({
        "id": entry_id,
        "name": entry.get('Name'),
        "japaneseName": jp_name,
        "type": entry.get('Type'),
        "rating": entry.get('Rating'),
        "myRating": my_rating,
        "feedback": feedback_from_excel,
        "seasons": entry.get('Seasons') if entry.get('Seasons') is not None else entry.get('No. of Seasons'),
        "episodes": entry.get('Episodes') if entry.get('Episodes') is not None else entry.get('Avg No. of Episodes'),
        "year": entry.get('Year') if entry.get('Year') is not None else entry.get('Released Year'),
        "runtime": entry.get('Runtime'),
        "studio": entry.get('Studio'),
        "director": entry.get('Director'),
        "description": entry.get('Description'),
        "genres": genres,
        "folderName": folder_name,
        "posters": posters,
        "status": status_from_excel,
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

print(f"[Success] Compile complete! Generated {len(anime_entries)} anime entries, {len(lofi_tracks)} lofi tracks, {len(ambience_tracks)} ambient sounds, and {len(atmospheres)} atmospheres.")
