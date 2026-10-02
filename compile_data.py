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
snapshot_path = 'assets/data/.last_compile_snapshot.json'

print("[Info] Compiling project assets and excel sheets into data.js...")

# ==========================================================================
#  TRUE TWO-WAY SYNC ENGINE
#  Uses a snapshot to detect which side (Excel or Admin) made the latest
#  change. After compile, both data.js AND Excel are fully synchronized.
#
#  How it works:
#    1. Load the SNAPSHOT (what Excel looked like at last compile)
#    2. Load data.js (may contain Admin edits since last compile)
#    3. Load current Excel (may contain user edits since last compile)
#    4. For each synced field (myRating, status, feedback):
#       - Excel changed from snapshot → Excel was edited → EXCEL WINS
#       - Excel unchanged, data.js changed → Admin edited → ADMIN WINS
#       - Both changed → EXCEL WINS (tiebreak: physical access = intent)
#       - Neither changed → use Excel value (they're the same anyway)
#    5. Write winning values to data.js AND back to Excel
#    6. Save a fresh snapshot for next compile
# ==========================================================================

# --- Step 1: Load previous compile snapshot ---
previous_snapshot = {}  # keyed by entry ID → {myRating, status, feedback}

def load_snapshot():
    """Load the snapshot of Excel values from the last compile."""
    global previous_snapshot
    if not os.path.exists(snapshot_path):
        print("[Info] No compile snapshot found — first run with sync engine.")
        return
    try:
        with open(snapshot_path, 'r', encoding='utf-8') as f:
            previous_snapshot = json.load(f)
        print(f"[Info] Loaded snapshot from last compile ({len(previous_snapshot)} entries).")
    except Exception as e:
        print(f"[Warning] Could not load snapshot: {e}")

load_snapshot()

# --- Step 2: Load existing data.js (may contain Admin edits) ---
existing_data_js = {}  # keyed by entry ID → {myRating, status, feedback}

def load_existing_data_js():
    """Parse the existing data.js and extract admin-editable fields per entry."""
    global existing_data_js
    
    if not os.path.exists(output_path):
        print("[Info] No existing data.js found — fresh compile.")
        return
    
    try:
        with open(output_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        match = re.search(r'const\s+animeList\s*=\s*(\[[\s\S]*?\]);', content)
        if not match:
            print("[Warning] Could not parse existing data.js animeList — skipping sync.")
            return
        
        anime_json = match.group(1)
        existing_entries = json.loads(anime_json)
        
        for entry in existing_entries:
            entry_id = entry.get('id')
            if entry_id is not None:
                existing_data_js[entry_id] = {
                    'myRating': entry.get('myRating'),
                    'status': entry.get('status'),
                    'feedback': entry.get('feedback'),
                }
        
        print(f"[Info] Loaded {len(existing_data_js)} entries from existing data.js.")
    except Exception as e:
        print(f"[Warning] Failed to parse existing data.js: {e}")

load_existing_data_js()

# --- Helper: normalize a value for comparison ---
def norm(val):
    """Normalize a value to a comparable string. None and '' both become ''."""
    if val is None:
        return ''
    return str(val).strip()

# --- Step 3: Parse Excel and apply sync logic ---
if not os.path.exists(xlsx_path):
    print(f"[Error] Could not find {xlsx_path}!")
    exit(1)

wb = openpyxl.load_workbook(xlsx_path)
sheet = wb.active
rows = list(sheet.iter_rows(values_only=True))

headers = [cell for cell in rows[0] if cell is not None]

# Find column indices for fields we may need to write back to Excel
HEADER_TO_COL = {}
for i, h in enumerate(headers):
    HEADER_TO_COL[h] = i + 1  # openpyxl uses 1-based column indices

# Track which Excel cells need to be updated (row_number → {field: value})
excel_writebacks = {}
# Build fresh snapshot for this compile
new_snapshot = {}

anime_entries = []
for row_idx, r in enumerate(rows[1:], start=2):  # row_idx = Excel row number
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

    # --- Two-Way Sync: Snapshot-based "latest wins" logic ---
    # Compare three sources: Excel (current), Snapshot (last compile), data.js (live)
    entry_id_str = str(entry_id) if entry_id is not None else None
    snap = previous_snapshot.get(entry_id_str, {}) if entry_id_str else {}
    live = existing_data_js.get(entry_id, {}) if entry_id is not None else {}
    
    def resolve_field(field_name, excel_val, snap_key):
        """
        Resolve which value to use for a synced field.
        Returns (winning_value, source_label) where source_label is for logging.
        """
        excel_norm = norm(excel_val)
        snap_norm = norm(snap.get(snap_key))
        live_norm = norm(live.get(snap_key))
        
        excel_changed = excel_norm != snap_norm
        admin_changed = live_norm != snap_norm
        
        if excel_changed:
            # Excel was edited since last compile — Excel wins (even if admin also changed)
            if admin_changed and excel_norm != live_norm:
                return excel_val, 'excel-wins-over-admin'
            return excel_val, 'excel'
        elif admin_changed and live_norm != '':
            # Excel unchanged, but admin edited on live site — Admin wins
            return live.get(snap_key), 'admin'
        else:
            # Neither changed, or both are the same — use Excel
            return excel_val, 'unchanged'

    # Resolve each synced field
    final_rating, rating_source = resolve_field('My Rating', my_rating, 'myRating')
    final_status, status_source = resolve_field('Status', status_from_excel, 'status')
    final_feedback, feedback_source = resolve_field('Feedback', feedback_from_excel, 'feedback')

    # Log any sync decisions
    name = entry.get('Name')
    if rating_source == 'admin':
        print(f"  [Sync] '{name}' — using admin myRating: '{norm(final_rating)}' (Excel unchanged)")
    elif rating_source == 'excel-wins-over-admin':
        print(f"  [Sync] '{name}' — Excel myRating wins: '{norm(final_rating)}' (admin had: '{norm(live.get('myRating'))}')")
    
    if status_source == 'admin':
        print(f"  [Sync] '{name}' — using admin status: '{norm(final_status)}' (Excel unchanged)")
    elif status_source == 'excel-wins-over-admin':
        print(f"  [Sync] '{name}' — Excel status wins: '{norm(final_status)}' (admin had: '{norm(live.get('status'))}')")
    
    if feedback_source == 'admin':
        print(f"  [Sync] '{name}' — using admin feedback: '{norm(final_feedback)[:50]}...' (Excel unchanged)")
    elif feedback_source == 'excel-wins-over-admin':
        print(f"  [Sync] '{name}' — Excel feedback wins (admin had different)")

    # Track cells that need to be written back to Excel (admin wins → update Excel)
    writeback = {}
    if rating_source == 'admin' and norm(final_rating) != norm(my_rating):
        writeback['My Rating'] = final_rating
    if status_source == 'admin' and norm(final_status) != norm(status_from_excel):
        writeback['Status'] = final_status
    if feedback_source == 'admin' and norm(final_feedback) != norm(feedback_from_excel):
        writeback['Feedback'] = final_feedback
    if writeback:
        excel_writebacks[row_idx] = writeback

    # Save snapshot of the FINAL resolved values (what will be in data.js)
    if entry_id_str:
        new_snapshot[entry_id_str] = {
            'myRating': norm(final_rating) if final_rating else None,
            'status': norm(final_status) if final_status else None,
            'feedback': norm(final_feedback) if final_feedback else None,
        }

    anime_entries.append({
        "id": entry_id,
        "name": name,
        "japaneseName": jp_name,
        "type": entry.get('Type'),
        "rating": entry.get('Rating'),
        "myRating": final_rating,
        "feedback": final_feedback,
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
        "status": final_status,
        "fav": fav
    })

# --- Step 4: Write admin changes back to Excel ---
excel_modified = False

if excel_writebacks:
    print(f"\n[Sync] Writing {len(excel_writebacks)} admin edit(s) back to Excel...")
    for row_num, fields in excel_writebacks.items():
        for field_name, value in fields.items():
            col = HEADER_TO_COL.get(field_name)
            if col:
                sheet.cell(row=row_num, column=col, value=value)
                anime_name = sheet.cell(row=row_num, column=HEADER_TO_COL.get('Name', 2)).value
                print(f"  [Excel←Admin] Row {row_num} '{anime_name}': {field_name} = '{value}'")
    excel_modified = True
else:
    print("[Sync] No field-level writebacks needed.")

# --- Step 4b: Rescue orphan entries (in data.js but NOT in Excel) ---
# When an agent or admin adds entries directly to data.js, they won't exist
# in Excel. We detect these orphans and add them as new rows so they survive
# future compiles and Excel stays the complete source of truth.
#
# IMPORTANT: If an entry IS in the snapshot (existed in Excel last compile)
# but is now gone from Excel, the user deliberately deleted it — DON'T rescue.
# Only rescue entries that are NOT in the snapshot (truly new additions).
excel_ids = {e['id'] for e in anime_entries}

# Full data.js entries (not just the sync fields — we need all metadata)
orphan_entries_from_js = []
deleted_entries = []
if existing_data_js:
    # Re-parse data.js for full entry data (not just the 3 sync fields)
    try:
        with open(output_path, 'r', encoding='utf-8') as f:
            content = f.read()
        match = re.search(r'const\s+animeList\s*=\s*(\[[\s\S]*?\]);', content)
        if match:
            all_js_entries = json.loads(match.group(1))
            for js_entry in all_js_entries:
                entry_id = js_entry.get('id')
                if entry_id is not None and entry_id not in excel_ids:
                    entry_id_str = str(entry_id)
                    if entry_id_str in previous_snapshot:
                        # Was in Excel last time, now removed → user deleted it
                        deleted_entries.append(js_entry)
                    else:
                        # Never was in Excel → truly new (agent/admin added)
                        orphan_entries_from_js.append(js_entry)
    except Exception as e:
        print(f"[Warning] Could not scan data.js for orphan entries: {e}")

if deleted_entries:
    print(f"\n[Sync] {len(deleted_entries)} entries were removed from Excel — respecting deletion:")
    for d in deleted_entries:
        print(f"  [Deleted] ID {d.get('id')}: '{d.get('name')}'")


if orphan_entries_from_js:
    print(f"\n[Rescue] Found {len(orphan_entries_from_js)} entries in data.js that are NOT in Excel!")
    
    # Map from data.js field names → Excel header names
    JS_TO_EXCEL = {
        'id': 'ID', 'name': 'Name', 'japaneseName': 'Japanese Name',
        'type': 'Type', 'rating': 'Rating', 'myRating': 'My Rating',
        'feedback': 'Feedback', 'seasons': 'Seasons', 'episodes': 'Episodes',
        'year': 'Year', 'runtime': 'Runtime', 'studio': 'Studio',
        'director': 'Director', 'folderName': 'Folder Name',
        'status': 'Status', 'description': 'Description',
    }
    
    for orphan in orphan_entries_from_js:
        next_row = sheet.max_row + 1
        name = orphan.get('name', '???')
        
        # Write each field to the correct Excel column
        for js_key, excel_header in JS_TO_EXCEL.items():
            col = HEADER_TO_COL.get(excel_header)
            if col and js_key in orphan:
                sheet.cell(row=next_row, column=col, value=orphan[js_key])
        
        # Handle special fields
        # Genre: join list back to comma-separated string
        genres = orphan.get('genres', [])
        genre_col = HEADER_TO_COL.get('Genre')
        if genre_col and genres:
            sheet.cell(row=next_row, column=genre_col, value=', '.join(genres))
        
        # Fav: convert boolean back to "Yes"/"No"
        fav_col = HEADER_TO_COL.get('Fav')
        if fav_col:
            sheet.cell(row=next_row, column=fav_col, value='Yes' if orphan.get('fav') else None)
        
        print(f"  [Excel←Rescue] Row {next_row}: Added '{name}' (ID {orphan.get('id')})")
        
        # Also add to anime_entries so data.js includes it
        # Re-scan posters for this entry (they may exist on disk)
        folder_name = orphan.get('folderName', '')
        posters = []
        if folder_name:
            folder_path = os.path.join(posters_dir, folder_name)
            if os.path.exists(folder_path):
                poster_files = sorted(os.listdir(folder_path))
                for pf in poster_files:
                    pf_full = os.path.join(folder_path, pf)
                    if os.path.isfile(pf_full) and pf.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif')):
                        posters.append(f"assets/posters/{folder_name}/{pf}")
        
        anime_entries.append({
            "id": orphan.get('id'),
            "name": name,
            "japaneseName": orphan.get('japaneseName'),
            "type": orphan.get('type'),
            "rating": orphan.get('rating'),
            "myRating": orphan.get('myRating'),
            "feedback": orphan.get('feedback'),
            "seasons": orphan.get('seasons'),
            "episodes": orphan.get('episodes'),
            "year": orphan.get('year'),
            "runtime": orphan.get('runtime'),
            "studio": orphan.get('studio'),
            "director": orphan.get('director'),
            "description": orphan.get('description'),
            "genres": genres,
            "folderName": folder_name,
            "posters": posters if posters else orphan.get('posters', []),
            "status": orphan.get('status'),
            "fav": orphan.get('fav', False)
        })
        
        # Add to snapshot
        entry_id_str = str(orphan.get('id'))
        new_snapshot[entry_id_str] = {
            'myRating': norm(orphan.get('myRating')),
            'status': norm(orphan.get('status')),
            'feedback': norm(orphan.get('feedback')),
        }
    
    excel_modified = True

if excel_modified:
    wb.save(xlsx_path)
    print(f"[Sync] Excel file saved.")

# --- Step 5: Save fresh snapshot ---
os.makedirs(os.path.dirname(snapshot_path), exist_ok=True)
with open(snapshot_path, 'w', encoding='utf-8') as f:
    json.dump(new_snapshot, f, indent=2, ensure_ascii=False)
print(f"[Info] Saved compile snapshot ({len(new_snapshot)} entries).")

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

print(f"\n[Success] Compile complete! Generated {len(anime_entries)} anime entries, {len(lofi_tracks)} lofi tracks, {len(ambience_tracks)} ambient sounds, and {len(atmospheres)} atmospheres.")
