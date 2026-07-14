# 🌸 Anime Archive

> "A cozy room, a warm cup of coffee, and stories that will linger in the heart forever."

**Anime Archive** is a warm, personal, and minimalist digital gallery designed to display a curated collection of watched anime and movies. Rather than functioning as an information-dense database, it is styled like a peaceful personal journal—cozy, relaxing, and aesthetic.

Live Demo hosted on GitHub Pages: **[Deploy yours today!]**

---

## ✨ Features

- **Cozy Design System:** CURATED Light & Dark modes utilizing warm beige, coffee, and amber accents.
- **Dynamic Stats Board:** Shows live numbers for watched titles, movies, series, average ratings, total hours watched, and your top favorite genre.
- **Handwritten Aesthetic:** Custom cursive script headings under posters resembling handwritten notebook entries.
- **Detail Popup Modal:** Backdrop-blurred overlay displaying metadata details, a slide viewer for alternate artwork/seasons, and a **"My Thoughts"** section for personal feedback notes.
- **Mini Audio Player:** A floating music player that features:
  - **Lofi Playlist:** A custom playlist of calming lo-fi tracks.
  - **Ambient Sounds Mixer:** Layerable background soundscapes (Rain, Ocean, Space) with independent volume sliders.
- **Sakura Petals Engine:** A lightweight HTML5 Canvas rendering engine for falling cherry blossom petals that automatically pauses when you switch tabs to conserve computer performance.
- **Atmosphere Mode (Full Immersion):** Smoothly transitions the interface out, filling the screen with looping backdrop videos (Gaming Room, Rainy Night, Space, Starlit Ocean) and turning the site into a calm screensaver.
- **Automatic Settings Storage:** Saves your preferences (theme, lofi playback, petals active, volumes) in `localStorage` so they persist automatically on reload.
- **Keyboard Shortcuts:**
  - `Space`: Play/Pause lofi music.
  - `Escape`: Close detail popups or exit Atmosphere Mode.
  - `ArrowLeft` / `ArrowRight`: Navigate alternate posters inside the detail popup, or flip between next/prev entries.

---

## 🛠️ Technology Stack

- **Frontend:** Vanilla HTML5, Vanilla CSS3 (Custom Grid layouts, CSS transitions, keyframe animations), Vanilla ES6 JavaScript.
- **Audio Channels:** Dual HTML5 Audio elements.
- **Visuals:** Inline SVG icons (completely scalable & color-matched) & HTML5 Canvas.
- **Database:** Static JSON arrays parsed from Excel sheets.
- **Compiler script:** Python 3 (`openpyxl` library) for automatic data compilation.

---

## 📂 Project Structure

```text
AnimeVault/
├── index.html          # Core structure & DOM containers
├── style.css           # Styling styles & dark/light theme variables
├── script.js          # Interactive player engine & state management
├── data.js             # Recompiled list of data (movies, tracks, atmosphere metadata)
├── compile_data.py     # Python script to compile excel updates
└── assets/
    ├── data/           # Location of anime.xlsx spreadsheet
    ├── posters/        # Folders with numbered posters (e.g. 1.webp, 2.jpg)
    ├── music/          # Audio tracks (lofi playlist / ambient sound clips)
    ├── atmosphere/     # Full-screen MP4 loops
    ├── fonts/          # Fonts folder
    └── icons/          # Vector icons
```

---

## 🚀 Running Locally

Web browsers block loading media folders locally (`file://`) due to CORS security policies. Use a simple local server to run the project.

Using **Python** (pre-installed):
1. Open your terminal inside the project folder.
2. Spin up the server:
   ```bash
   python -m http.server 8000
   ```
3. Open your browser and navigate to **`http://localhost:8000`**.

---

## ⚙️ Content Management Guide

The project includes an automatic compiler script (`compile_data.py`) to keep your library up to date without writing JavaScript.

### Prerequisites
Make sure you have python and `openpyxl` installed:
```bash
pip install openpyxl
```

### 1. Adding a New Anime
1. Create a folder inside `assets/posters/` named with lowercase letters and hyphens (e.g., `assets/posters/my-favorite-show/`).
2. Add your posters inside that folder. Name the main cover `1.webp` (or `1.jpg`) and alternate artwork `2.webp`, `3.webp`, etc.
3. Open `assets/data/anime.xlsx` and add a row at the bottom with the details. Make sure the **Folder Name** column matches your poster folder name exactly.
4. Run the compiler:
   ```bash
   python compile_data.py
   ```

### 2. Editing existing details / reviews
1. Open `assets/data/anime.xlsx`.
2. Locate the row, make your edits (e.g. update your thoughts under `Feedback` column or change `My Rating`), and save the sheet.
3. Run the compiler:
   ```bash
   python compile_data.py
   ```

### 3. Adding New Lofi Music or Ambience
- Put music files (`.mp3` or `.m4a`) in `assets/music/lofi/` (lofi music playlist) or `assets/music/ambience/` (layerable atmosphere mixers).
- Run the compiler:
   ```bash
   python compile_data.py
   ```
   *The script will automatically detect and clean up the filenames into formatted playlist titles.*

---

## 💖 Support & Credits

If you love this project, consider giving the repository a ⭐! 

Made with ☕, lofi beats, and lots of 💖 by **[Vedant Bakre](https://github.com/VedantBakre)**.

*Copyright © 2026 Vedant Bakre. All stories are remembered forever.*
