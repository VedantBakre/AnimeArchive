/* ==========================================================================
   ANIME ARCHIVE — INTERACTIVE LOGIC
   Pure Vanilla JS Implementation
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // --- 1. Global State Management ---
  const state = {
    theme: 'light',          // 'light' | 'dark'
    petals: false,          // true | false
    music: false,           // true | false (playlist state)
    sounds: false,          // true | false (ambient sound state)
    musicVolume: 0.5,
    soundsVolume: 0.5,
    currentTrackIndex: 0,
    activeAtmosphere: 'none', // atmosphere id or 'none'
    activeFilter: 'all',     // 'all' | 'movie' | 'series' | 'watched' | 'pending' | 'fav'
    searchQuery: '',
    selectedAnimeIndex: -1,   // index of current anime in active list
    selectedPosterIndex: 0,   // active alternate poster index
    isLoop: false,
    isShuffle: false,
    isPlayingMusic: false,
    isPlayingSound: false
  };

  // Keep a reference to the active filtered anime list for detail modal navigation
  let filteredAnimeList = [...animeList];
  let shuffleOrder = []; // Shuffled lofi playlist indices

  // --- 2. DOM Caching ---
  const DOM = {
    body: document.body,
    appContainer: document.getElementById('app-container'),
    sakuraCanvas: document.getElementById('sakura-canvas'),
    
    // Header
    time: document.getElementById('header-time'),
    date: document.getElementById('header-date'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsPanel: document.getElementById('settings-panel'),
    
    // Stats Dashboard
    statTotal: document.getElementById('stat-total'),
    statMovies: document.getElementById('stat-movies'),
    statSeries: document.getElementById('stat-series'),
    statRating: document.getElementById('stat-rating'),
    statHours: document.getElementById('stat-hours'),
    statGenre: document.getElementById('stat-genre'),
    
    // Search & Filters
    searchBox: document.getElementById('search-box'),
    filterTabs: document.querySelectorAll('.filter-tab'),
    animeGrid: document.getElementById('anime-grid'),
    noResults: document.getElementById('no-results'),
    
    // Detail Modal
    detailModal: document.getElementById('detail-modal'),
    modalBackdrop: document.getElementById('modal-backdrop'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalPrevBtn: document.getElementById('modal-prev-btn'),
    modalNextBtn: document.getElementById('modal-next-btn'),
    modalPosterImg: document.getElementById('modal-poster-img'),
    posterPrevBtn: document.getElementById('poster-prev-btn'),
    posterNextBtn: document.getElementById('poster-next-btn'),
    posterDots: document.getElementById('poster-dots'),
    modalAnimeName: document.getElementById('modal-anime-name'),
    modalAnimeJpName: document.getElementById('modal-anime-jp-name'),
    modalFavHeart: document.getElementById('modal-fav-heart'),
    modalMetaType: document.getElementById('modal-meta-type'),
    modalMetaYear: document.getElementById('modal-meta-year'),
    modalMetaRating: document.getElementById('modal-meta-rating'),
    modalMetaMyRating: document.getElementById('modal-meta-my-rating'),
    modalMetaSeasons: document.getElementById('modal-meta-seasons'),
    modalMetaEpisodes: document.getElementById('modal-meta-episodes'),
    modalMetaRuntime: document.getElementById('modal-meta-runtime'),
    modalMetaStudio: document.getElementById('modal-meta-studio'),
    modalMetaDirector: document.getElementById('modal-meta-director'),
    modalGenresContainer: document.getElementById('modal-genres-container'),
    modalThoughtsText: document.getElementById('modal-thoughts-text'),
    
    // Settings Controls
    toggleDarkMode: document.getElementById('toggle-dark-mode'),
    togglePetals: document.getElementById('toggle-petals'),
    toggleMusic: document.getElementById('toggle-music'),
    volumeMusic: document.getElementById('volume-music'),
    toggleSounds: document.getElementById('toggle-sounds'),
    volumeSounds: document.getElementById('volume-sounds'),
    
    // Mini-Player Elements
    miniPlayer: document.getElementById('mini-player'),
    playerToggleBtn: document.getElementById('player-toggle-btn'),
    playerTrackTitle: document.getElementById('player-track-title'),
    playerTrackSource: document.getElementById('player-track-source'),
    btnLoop: document.getElementById('btn-loop'),
    btnPrev: document.getElementById('btn-prev'),
    btnPlayPause: document.getElementById('btn-play-pause'),
    playIcon: document.getElementById('play-icon'),
    pauseIcon: document.getElementById('pause-icon'),
    btnNext: document.getElementById('btn-next'),
    btnShuffle: document.getElementById('btn-shuffle'),
    playerSeek: document.getElementById('player-seek'),
    playerTimeCurrent: document.getElementById('player-time-current'),
    playerTimeTotal: document.getElementById('player-time-total'),
    playerVolume: document.getElementById('player-volume'),
    musicSelectBtn: document.getElementById('music-select-btn'),
    atmosSelectBtn: document.getElementById('atmos-select-btn'),
    ambienceSelect: document.getElementById('ambience-select'),
    
    // Dropdowns
    musicDropdown: document.getElementById('music-dropdown'),
    musicDropdownClose: document.getElementById('music-dropdown-close'),
    musicTrackList: document.getElementById('music-track-list'),
    atmosDropdown: document.getElementById('atmos-dropdown'),
    atmosDropdownClose: document.getElementById('atmos-dropdown-close'),
    atmosList: document.getElementById('atmos-list'),
    
    // Atmosphere Mode Elements
    atmosphereOverlay: document.getElementById('atmosphere-overlay'),
    atmosphereVideo: document.getElementById('atmosphere-video'),
    exitAtmosphereBtn: document.getElementById('exit-atmosphere-btn'),
    
    // HTML Audio objects
    lofiAudio: document.getElementById('lofi-audio-player'),
    ambienceAudio: document.getElementById('ambience-audio-player')
  };

  // --- 3. Live Clock Integration ---
  function updateClock() {
    const now = new Date();
    
    // Format Time: HH:MM:SS AM/PM
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    DOM.time.textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
    
    // Format Date: Day, Month DD, YYYY
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    DOM.date.textContent = now.toLocaleDateString('en-US', options);
  }
  updateClock();
  setInterval(updateClock, 1000);

  // --- 4. Statistics Dashboard Logic ---
  function calculateStatistics() {
    const total = animeList.length;
    const movies = animeList.filter(a => a.type === 'Movie').length;
    const series = animeList.filter(a => a.type === 'Series').length;
    
    // Average rating logic
    const ratedAnimes = animeList.filter(a => typeof a.rating === 'number');
    const avgRating = ratedAnimes.length > 0 
      ? (ratedAnimes.reduce((sum, a) => sum + a.rating, 0) / ratedAnimes.length).toFixed(1) 
      : '-';
    
    // Hours Watched calculation
    // Movies = runtime mins. Series = seasons * episodes * runtime mins
    const totalMinutes = animeList.reduce((acc, a) => {
      if (a.type === 'Movie') {
        return acc + (a.runtime || 0);
      } else {
        const seasons = a.seasons || 1;
        const episodes = a.episodes || 1;
        const runtime = a.runtime || 0;
        return acc + (seasons * episodes * runtime);
      }
    }, 0);
    const hours = Math.round(totalMinutes / 60);
    
    // Top Genre calculation
    const genreCounts = {};
    animeList.forEach(a => {
      if (a.genres && Array.isArray(a.genres)) {
        a.genres.forEach(g => {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
      }
    });
    let topGenre = '-';
    let maxCount = 0;
    for (const [genre, count] of Object.entries(genreCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topGenre = genre;
      }
    }

    // Set text in UI
    DOM.statTotal.textContent = total;
    DOM.statMovies.textContent = movies;
    DOM.statSeries.textContent = series;
    DOM.statRating.textContent = avgRating;
    DOM.statHours.textContent = hours;
    DOM.statGenre.textContent = topGenre;
  }
  calculateStatistics();

  // --- 5. Grid Rendering & Dynamic Cards ---
  function createAnimeCard(anime, index) {
    const card = document.createElement('div');
    card.className = 'anime-card';
    card.dataset.id = anime.id;
    card.style.animationDelay = `${index * 0.05}s`; // Stagger cards transition entrance
    
    // Main Poster
    const posterSrc = anime.posters && anime.posters.length > 0 
      ? anime.posters[0] 
      : 'assets/posters/placeholder.jpg';
      
    // Rating display (prefer personal, fallback to public, fallback to empty)
    let displayRating = '';
    if (anime.myRating) {
      displayRating = anime.myRating;
    } else if (anime.rating) {
      displayRating = `${anime.rating}/10`;
    }

    card.innerHTML = `
      <div class="card-poster-wrapper">
        <img class="card-poster-img" src="${posterSrc}" alt="${anime.name}" loading="lazy">
        <div class="card-tags">
          <span class="tag-badge">${anime.type}</span>
          ${anime.fav ? '<span class="tag-badge fav-badge">❤</span>' : ''}
        </div>
        ${displayRating ? `
          <div class="card-rating-badge">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
              <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"></polygon>
            </svg>
            <span>${displayRating}</span>
          </div>
        ` : ''}
      </div>
      <div class="card-info">
        <h3 class="card-title-cursive">${anime.name}</h3>
        <div class="card-meta">
          <span>${anime.studio || 'Unknown Studio'}</span>
          <span>${anime.year || 'N/A'}</span>
        </div>
        <div class="card-genres">
          ${anime.genres ? anime.genres.slice(0, 3).join(' • ') : ''}
        </div>
      </div>
    `;

    card.addEventListener('click', () => openDetailModal(anime.id));
    return card;
  }

  function renderGrid() {
    DOM.animeGrid.innerHTML = '';
    
    if (filteredAnimeList.length === 0) {
      DOM.noResults.classList.remove('hidden');
      return;
    }
    
    DOM.noResults.classList.add('hidden');
    filteredAnimeList.forEach((anime, idx) => {
      DOM.animeGrid.appendChild(createAnimeCard(anime, idx));
    });
  }

  // --- 6. Search & Filters with Debounce ---
  let debounceTimeout = null;

  function filterAndSearch() {
    const query = state.searchQuery.toLowerCase().trim();
    const filter = state.activeFilter;

    filteredAnimeList = animeList.filter(a => {
      // 1. Category Tabs Filter
      if (filter === 'movie' && a.type !== 'Movie') return false;
      if (filter === 'series' && a.type !== 'Series') return false;
      if (filter === 'watched' && a.status !== 'Watched') return false;
      if (filter === 'pending' && a.status !== 'Pending') return false;
      if (filter === 'fav' && !a.fav) return false;

      // 2. Query search input match
      if (query !== '') {
        const nameMatch = a.name ? a.name.toLowerCase().includes(query) : false;
        const jpNameMatch = a.japaneseName ? a.japaneseName.toLowerCase().includes(query) : false;
        const studioMatch = a.studio ? a.studio.toLowerCase().includes(query) : false;
        const yearMatch = a.year ? String(a.year).includes(query) : false;
        const directorMatch = a.director ? a.director.toLowerCase().includes(query) : false;
        const genreMatch = a.genres ? a.genres.some(g => g.toLowerCase().includes(query)) : false;

        return nameMatch || jpNameMatch || studioMatch || yearMatch || directorMatch || genreMatch;
      }

      return true;
    });

    renderGrid();
  }

  DOM.searchBox.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    // 100ms Debounce
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(filterAndSearch, 100);
  });

  DOM.filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      DOM.filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeFilter = tab.dataset.filter;
      filterAndSearch();
    });
  });

  // --- 7. Detail Popup Modal with Navigation ---
  function openDetailModal(animeId) {
    const index = filteredAnimeList.findIndex(a => a.id === animeId);
    if (index === -1) return;
    
    state.selectedAnimeIndex = index;
    state.selectedPosterIndex = 0; // Reset poster sub-index when changing anime
    
    updateDetailModal();
    DOM.detailModal.classList.add('active');
    DOM.body.style.overflow = 'hidden'; // freeze backdrop scrolling
  }

  function closeDetailModal() {
    DOM.detailModal.classList.remove('active');
    DOM.body.style.overflow = '';
  }

  function updateDetailModal() {
    const anime = filteredAnimeList[state.selectedAnimeIndex];
    if (!anime) return;

    // Header info
    DOM.modalAnimeName.textContent = anime.name;
    DOM.modalAnimeJpName.textContent = anime.japaneseName || '';
    
    // Favorite status
    if (anime.fav) {
      DOM.modalFavHeart.classList.add('active');
    } else {
      DOM.modalFavHeart.classList.remove('active');
    }

    // Metadata grid
    DOM.modalMetaType.textContent = anime.type || '-';
    DOM.modalMetaYear.textContent = anime.year || '-';
    DOM.modalMetaRating.textContent = anime.rating ? `${anime.rating}/10` : '-';
    DOM.modalMetaMyRating.textContent = anime.myRating || '-';
    DOM.modalMetaSeasons.textContent = anime.seasons || '-';
    DOM.modalMetaEpisodes.textContent = anime.episodes || '-';
    DOM.modalMetaRuntime.textContent = anime.runtime ? `${anime.runtime} mins` : '-';
    DOM.modalMetaStudio.textContent = anime.studio || '-';
    DOM.modalMetaDirector.textContent = anime.director || '-';

    // Genres
    DOM.modalGenresContainer.innerHTML = '';
    if (anime.genres) {
      anime.genres.forEach(genre => {
        const tag = document.createElement('span');
        tag.className = 'genre-tag';
        tag.textContent = genre;
        DOM.modalGenresContainer.appendChild(tag);
      });
    }

    // Thoughts (Personal Feedback)
    DOM.modalThoughtsText.textContent = anime.feedback ? `"${anime.feedback}"` : '"No thoughts recorded yet."';

    // Set up posters gallery
    updatePosterGallery();
  }

  function updatePosterGallery() {
    const anime = filteredAnimeList[state.selectedAnimeIndex];
    if (!anime || !anime.posters || anime.posters.length === 0) {
      DOM.modalPosterImg.src = 'assets/posters/placeholder.jpg';
      DOM.posterPrevBtn.classList.add('hidden');
      DOM.posterNextBtn.classList.add('hidden');
      DOM.posterDots.innerHTML = '';
      return;
    }

    // Load active poster
    const posterPath = anime.posters[state.selectedPosterIndex];
    DOM.modalPosterImg.src = posterPath;

    // Handle button arrows visibility (only if more than 1 poster)
    if (anime.posters.length > 1) {
      DOM.posterPrevBtn.classList.remove('hidden');
      DOM.posterNextBtn.classList.remove('hidden');
    } else {
      DOM.posterPrevBtn.classList.add('hidden');
      DOM.posterNextBtn.classList.add('hidden');
    }

    // Generate indicator dots
    DOM.posterDots.innerHTML = '';
    anime.posters.forEach((_, idx) => {
      const dot = document.createElement('div');
      dot.className = `poster-dot ${idx === state.selectedPosterIndex ? 'active' : ''}`;
      dot.addEventListener('click', () => {
        state.selectedPosterIndex = idx;
        updatePosterGallery();
      });
      DOM.posterDots.appendChild(dot);
    });
  }

  // Poster switching actions (inside current anime)
  function prevPoster(e) {
    if (e) e.stopPropagation();
    const anime = filteredAnimeList[state.selectedAnimeIndex];
    if (!anime || !anime.posters || anime.posters.length <= 1) return;
    
    state.selectedPosterIndex = (state.selectedPosterIndex - 1 + anime.posters.length) % anime.posters.length;
    updatePosterGallery();
  }

  function nextPoster(e) {
    if (e) e.stopPropagation();
    const anime = filteredAnimeList[state.selectedAnimeIndex];
    if (!anime || !anime.posters || anime.posters.length <= 1) return;
    
    state.selectedPosterIndex = (state.selectedPosterIndex + 1) % anime.posters.length;
    updatePosterGallery();
  }

  // Global details flip navigation (between entries)
  function prevAnimeEntry() {
    if (filteredAnimeList.length <= 1) return;
    state.selectedAnimeIndex = (state.selectedAnimeIndex - 1 + filteredAnimeList.length) % filteredAnimeList.length;
    state.selectedPosterIndex = 0;
    updateDetailModal();
  }

  function nextAnimeEntry() {
    if (filteredAnimeList.length <= 1) return;
    state.selectedAnimeIndex = (state.selectedAnimeIndex + 1) % filteredAnimeList.length;
    state.selectedPosterIndex = 0;
    updateDetailModal();
  }

  // Bind detail popup events
  DOM.modalCloseBtn.addEventListener('click', closeDetailModal);
  DOM.modalBackdrop.addEventListener('click', closeDetailModal);
  DOM.posterPrevBtn.addEventListener('click', prevPoster);
  DOM.posterNextBtn.addEventListener('click', nextPoster);
  DOM.modalPrevBtn.addEventListener('click', prevAnimeEntry);
  DOM.modalNextBtn.addEventListener('click', nextAnimeEntry);

  // --- 8. Settings Panel Control ---
  DOM.settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    DOM.settingsPanel.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    // Close panel if clicked outside
    if (!DOM.settingsPanel.contains(e.target) && e.target !== DOM.settingsBtn) {
      DOM.settingsPanel.classList.remove('active');
    }
    // Close audio dropdown lists
    if (!DOM.miniPlayer.contains(e.target)) {
      DOM.musicDropdown.classList.add('hidden');
      DOM.atmosDropdown.classList.add('hidden');
    }
  });

  DOM.settingsPanel.addEventListener('click', (e) => e.stopPropagation());

  // --- 9. Music & Playlist Player System ---
  function initPlayerLists() {
    // 1. Populate lofi tracks dropdown list
    DOM.musicTrackList.innerHTML = '';
    lofiPlaylist.forEach((track, idx) => {
      const li = document.createElement('li');
      li.textContent = track.title;
      li.dataset.index = idx;
      li.addEventListener('click', () => {
        playTrack(idx);
        DOM.musicDropdown.classList.add('hidden');
      });
      DOM.musicTrackList.appendChild(li);
    });

    // 2. Populate ambience drop list
    DOM.ambienceSelect.innerHTML = '<option value="none">None</option>';
    ambiencePlaylist.forEach((track, idx) => {
      const option = document.createElement('option');
      option.value = idx;
      option.textContent = track.title;
      DOM.ambienceSelect.appendChild(option);
    });

    // 3. Populate atmosphere selection popup list
    DOM.atmosList.innerHTML = '<li data-atmos="none" class="atmos-item active">None</li>';
    atmospheres.forEach(atmos => {
      const li = document.createElement('li');
      li.textContent = atmos.name;
      li.dataset.atmos = atmos.id;
      li.className = 'atmos-item';
      li.addEventListener('click', () => {
        setAtmosphereMode(atmos.id);
        DOM.atmosDropdown.classList.add('hidden');
      });
      DOM.atmosList.appendChild(li);
    });
  }

  function setupShuffleOrder() {
    shuffleOrder = Array.from({ length: lofiPlaylist.length }, (_, i) => i);
    if (state.isShuffle) {
      // Fisher-Yates shuffle
      for (let i = shuffleOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffleOrder[i], shuffleOrder[j]] = [shuffleOrder[j], shuffleOrder[i]];
      }
    }
  }

  function playTrack(index) {
    if (index < 0 || index >= lofiPlaylist.length) return;
    state.currentTrackIndex = index;
    
    // Highlight active list item
    const listItems = DOM.musicTrackList.querySelectorAll('li');
    listItems.forEach((li, idx) => {
      if (idx === index) li.classList.add('active');
      else li.classList.remove('active');
    });

    const track = lofiPlaylist[index];
    DOM.lofiAudio.src = track.file;
    DOM.playerTrackTitle.textContent = track.title;
    DOM.playerTrackSource.textContent = "Lofi Playlist";
    
    // Slide player up if collapsed
    DOM.miniPlayer.classList.remove('collapsed');

    // Trigger Play
    DOM.lofiAudio.play()
      .then(() => {
        state.isPlayingMusic = true;
        state.music = true;
        DOM.toggleMusic.checked = true;
        updatePlayerUI();
        saveSettings();
      })
      .catch(err => {
        console.log("Audio autoplay blocked by browser: click play manually.", err);
        // Show paused state in UI
        state.isPlayingMusic = false;
        updatePlayerUI();
      });
  }

  function togglePlayPause() {
    // If no source is loaded yet, load track 0
    if (!DOM.lofiAudio.src) {
      playTrack(0);
      return;
    }

    if (state.isPlayingMusic) {
      DOM.lofiAudio.pause();
      state.isPlayingMusic = false;
    } else {
      DOM.lofiAudio.play()
        .then(() => {
          state.isPlayingMusic = true;
          state.music = true;
          DOM.toggleMusic.checked = true;
          saveSettings();
        })
        .catch(err => console.log(err));
    }
    updatePlayerUI();
  }

  function nextTrack() {
    if (state.isShuffle) {
      let currShuffleIdx = shuffleOrder.indexOf(state.currentTrackIndex);
      let nextShuffleIdx = (currShuffleIdx + 1) % shuffleOrder.length;
      playTrack(shuffleOrder[nextShuffleIdx]);
    } else {
      let nextIdx = (state.currentTrackIndex + 1) % lofiPlaylist.length;
      playTrack(nextIdx);
    }
  }

  function prevTrack() {
    if (state.isShuffle) {
      let currShuffleIdx = shuffleOrder.indexOf(state.currentTrackIndex);
      let prevShuffleIdx = (currShuffleIdx - 1 + shuffleOrder.length) % shuffleOrder.length;
      playTrack(shuffleOrder[prevShuffleIdx]);
    } else {
      let prevIdx = (state.currentTrackIndex - 1 + lofiPlaylist.length) % lofiPlaylist.length;
      playTrack(prevIdx);
    }
  }

  function updatePlayerUI() {
    if (state.isPlayingMusic) {
      DOM.playIcon.classList.add('hidden');
      DOM.pauseIcon.classList.remove('hidden');
    } else {
      DOM.playIcon.classList.remove('hidden');
      DOM.pauseIcon.classList.add('hidden');
    }

    DOM.btnLoop.classList.toggle('active', state.isLoop);
    DOM.btnShuffle.classList.toggle('active', state.isShuffle);
  }

  // Track progress updating
  DOM.lofiAudio.addEventListener('timeupdate', () => {
    if (DOM.lofiAudio.duration) {
      const pct = (DOM.lofiAudio.currentTime / DOM.lofiAudio.duration) * 100;
      DOM.playerSeek.value = pct;
      
      // Update durations display
      DOM.playerTimeCurrent.textContent = formatTime(DOM.lofiAudio.currentTime);
      DOM.playerTimeTotal.textContent = formatTime(DOM.lofiAudio.duration);
    }
  });

  DOM.playerSeek.addEventListener('input', (e) => {
    if (DOM.lofiAudio.duration) {
      DOM.lofiAudio.currentTime = (e.target.value / 100) * DOM.lofiAudio.duration;
    }
  });

  DOM.lofiAudio.addEventListener('ended', () => {
    if (state.isLoop) {
      DOM.lofiAudio.currentTime = 0;
      DOM.lofiAudio.play().catch(e => console.log(e));
    } else {
      nextTrack();
    }
  });

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  // Playlist Button click triggers
  DOM.btnPlayPause.addEventListener('click', togglePlayPause);
  DOM.btnNext.addEventListener('click', nextTrack);
  DOM.btnPrev.addEventListener('click', prevTrack);
  
  DOM.btnLoop.addEventListener('click', () => {
    state.isLoop = !state.isLoop;
    updatePlayerUI();
  });
  
  DOM.btnShuffle.addEventListener('click', () => {
    state.isShuffle = !state.isShuffle;
    setupShuffleOrder();
    updatePlayerUI();
  });

  // Floating Player Toggle (Expand/Collapse drawer)
  DOM.playerToggleBtn.addEventListener('click', () => {
    DOM.miniPlayer.classList.toggle('collapsed');
  });

  // Open Playlist Popups
  DOM.musicSelectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    DOM.atmosDropdown.classList.add('hidden');
    DOM.musicDropdown.classList.toggle('hidden');
  });

  DOM.atmosSelectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    DOM.musicDropdown.classList.add('hidden');
    DOM.atmosDropdown.classList.toggle('hidden');
  });

  DOM.musicDropdownClose.addEventListener('click', () => DOM.musicDropdown.classList.add('hidden'));
  DOM.atmosDropdownClose.addEventListener('click', () => DOM.atmosDropdown.classList.add('hidden'));

  // Ambience Select Dropdown Change logic
  DOM.ambienceSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'none') {
      DOM.ambienceAudio.pause();
      state.isPlayingSound = false;
      state.sounds = false;
      DOM.toggleSounds.checked = false;
    } else {
      const idx = parseInt(val, 10);
      const track = ambiencePlaylist[idx];
      DOM.ambienceAudio.src = track.file;
      
      if (DOM.lofiAudio.src && state.isPlayingMusic) {
        // Play together with music
        DOM.ambienceAudio.play()
          .then(() => {
            state.isPlayingSound = true;
            state.sounds = true;
            DOM.toggleSounds.checked = true;
          })
          .catch(e => console.log(e));
      } else {
        // Play alone
        DOM.ambienceAudio.play()
          .then(() => {
            state.isPlayingSound = true;
            state.sounds = true;
            DOM.toggleSounds.checked = true;
            DOM.miniPlayer.classList.remove('collapsed');
          })
          .catch(e => console.log(e));
      }
    }
    saveSettings();
  });

  // --- 10. Ambient Sound System Toggles ---
  DOM.toggleMusic.addEventListener('change', (e) => {
    state.music = e.target.checked;
    if (state.music) {
      if (!DOM.lofiAudio.src) {
        playTrack(0);
      } else {
        DOM.lofiAudio.play()
          .then(() => { state.isPlayingMusic = true; updatePlayerUI(); })
          .catch(e => console.log(e));
      }
    } else {
      DOM.lofiAudio.pause();
      state.isPlayingMusic = false;
      updatePlayerUI();
    }
    saveSettings();
  });

  DOM.volumeMusic.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    state.musicVolume = val;
    DOM.lofiAudio.volume = val;
    if (DOM.playerVolume) DOM.playerVolume.value = val; // Sync mini-player volume
    saveSettings();
  });

  DOM.playerVolume.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    state.musicVolume = val;
    DOM.lofiAudio.volume = val;
    DOM.volumeMusic.value = val; // Sync settings volume
    saveSettings();
  });

  DOM.toggleSounds.addEventListener('change', (e) => {
    state.sounds = e.target.checked;
    if (state.sounds) {
      if (DOM.ambienceSelect.value === 'none') {
        // Select first one as default
        DOM.ambienceSelect.value = 0;
        DOM.ambienceSelect.dispatchEvent(new Event('change'));
      } else {
        DOM.ambienceAudio.play()
          .then(() => { state.isPlayingSound = true; })
          .catch(e => console.log(e));
      }
    } else {
      DOM.ambienceAudio.pause();
      state.isPlayingSound = false;
    }
    saveSettings();
  });

  DOM.volumeSounds.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    state.soundsVolume = val;
    DOM.ambienceAudio.volume = val;
    saveSettings();
  });

  // --- 11. Atmosphere Mode Controller ---
  function setAtmosphereMode(atmosId) {
    state.activeAtmosphere = atmosId;
    
    // Update active state class in atmosphere lists
    const items = DOM.atmosList.querySelectorAll('.atmos-item');
    items.forEach(li => {
      if (li.dataset.atmos === atmosId) li.classList.add('active');
      else li.classList.remove('active');
    });

    if (atmosId === 'none') {
      exitAtmosphere();
      return;
    }

    const atmos = atmospheres.find(a => a.id === atmosId);
    if (!atmos) return;

    // Load and play background atmosphere loop video
    DOM.atmosphereVideo.src = atmos.video;
    DOM.atmosphereVideo.load();
    DOM.atmosphereVideo.play()
      .then(() => {
        // Transition Layout: Fade out grid cards and top headers
        DOM.appContainer.classList.add('fade-out');
        DOM.atmosphereOverlay.classList.add('active');
        
        // Match Accent Color dynamically if defined
        if (atmos.themeColor) {
          document.documentElement.style.setProperty('--accent-color', atmos.themeColor);
          document.documentElement.style.setProperty('--accent-hover', adjustColorBrightness(atmos.themeColor, -20));
        }
      })
      .catch(err => {
        console.log("Could not autoplay atmosphere video background.", err);
      });
  }

  function exitAtmosphere() {
    state.activeAtmosphere = 'none';
    
    // Reset active dropdown option
    const items = DOM.atmosList.querySelectorAll('.atmos-item');
    items.forEach(li => {
      if (li.dataset.atmos === 'none') li.classList.add('active');
      else li.classList.remove('active');
    });

    // Reset accents back to core theme color
    const isDark = DOM.body.classList.contains('dark-theme');
    const defaultAccent = isDark ? '#C59D6F' : '#B08968';
    const defaultHover = isDark ? '#DBB283' : '#967050';
    document.documentElement.style.setProperty('--accent-color', defaultAccent);
    document.documentElement.style.setProperty('--accent-hover', defaultHover);

    // Stop atmosphere video
    DOM.atmosphereVideo.pause();
    DOM.atmosphereVideo.src = '';
    
    // Fade layout back in
    DOM.atmosphereOverlay.classList.remove('active');
    DOM.appContainer.classList.remove('fade-out');
    
    // Stop ambient sound
    DOM.ambienceSelect.value = 'none';
    DOM.ambienceSelect.dispatchEvent(new Event('change'));
  }

  DOM.exitAtmosphereBtn.addEventListener('click', exitAtmosphere);

  // Helper to adjust color brightness dynamically
  function adjustColorBrightness(hex, percent) {
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    R = (R > 0) ? R : 0;
    G = (G > 0) ? G : 0;
    B = (B > 0) ? B : 0;

    const rHex = R.toString(16).padStart(2, '0');
    const gHex = G.toString(16).padStart(2, '0');
    const bHex = B.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  }

  // --- 12. Sakura Petals Animation Loop ---
  let petalList = [];
  let petalAnimationId = null;
  let isTabActive = true;

  class SakuraPetal {
    constructor(canvasWidth, canvasHeight) {
      this.canvasWidth = canvasWidth;
      this.canvasHeight = canvasHeight;
      this.reset();
      // start at a random height on boot
      this.y = Math.random() * canvasHeight;
    }

    reset() {
      this.x = Math.random() * this.canvasWidth;
      this.y = -10;
      this.size = Math.random() * 8 + 4; // size in px
      this.speedY = Math.random() * 0.8 + 0.5; // fall speed
      this.speedX = Math.random() * 0.5 - 0.2; // drift speed
      this.rotation = Math.random() * 360;
      this.rotationSpeed = Math.random() * 1.5 - 0.75;
      this.swayAmplitude = Math.random() * 1.5;
      this.swaySpeed = Math.random() * 0.02 + 0.01;
      this.swayAngle = Math.random() * Math.PI * 2;
    }

    update() {
      this.y += this.speedY;
      this.swayAngle += this.swaySpeed;
      this.x += this.speedX + Math.sin(this.swayAngle) * this.swayAmplitude * 0.3;
      this.rotation += this.rotationSpeed;

      // recycle if falls past bottom/edges
      if (this.y > this.canvasHeight + 10 || this.x < -10 || this.x > this.canvasWidth + 10) {
        this.reset();
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      
      // Draw sakura petal shape
      ctx.beginPath();
      // Pink sakura petal color gradient
      const gradient = ctx.createRadialGradient(0, 0, 1, 0, 0, this.size);
      gradient.addColorStop(0, '#FFCCD5');
      gradient.addColorStop(0.8, '#FFB3C1');
      gradient.addColorStop(1, 'rgba(255, 179, 193, 0)');
      
      ctx.fillStyle = gradient;
      
      // Draw smooth drop petal shape
      ctx.ellipse(0, 0, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }
  }

  function resizeCanvas() {
    DOM.sakuraCanvas.width = window.innerWidth;
    DOM.sakuraCanvas.height = window.innerHeight;
    
    // adjust existing active particles
    petalList.forEach(p => {
      p.canvasWidth = DOM.sakuraCanvas.width;
      p.canvasHeight = DOM.sakuraCanvas.height;
    });
  }

  function initPetals() {
    const maxPetals = 15; // cozy amount, subtle, not distracting
    petalList = [];
    
    const ctx = DOM.sakuraCanvas.getContext('2d');
    resizeCanvas();
    
    for (let i = 0; i < maxPetals; i++) {
      petalList.push(new SakuraPetal(DOM.sakuraCanvas.width, DOM.sakuraCanvas.height));
    }
  }

  function petalAnimationLoop() {
    if (!state.petals || !isTabActive) {
      cancelAnimationFrame(petalAnimationId);
      petalAnimationId = null;
      return;
    }

    const ctx = DOM.sakuraCanvas.getContext('2d');
    ctx.clearRect(0, 0, DOM.sakuraCanvas.width, DOM.sakuraCanvas.height);

    petalList.forEach(p => {
      p.update();
      p.draw(ctx);
    });

    petalAnimationId = requestAnimationFrame(petalAnimationLoop);
  }

  function startPetals() {
    DOM.sakuraCanvas.classList.remove('hidden');
    if (petalList.length === 0) {
      initPetals();
    }
    if (!petalAnimationId) {
      petalAnimationId = requestAnimationFrame(petalAnimationLoop);
    }
  }

  function stopPetals() {
    DOM.sakuraCanvas.classList.add('hidden');
    if (petalAnimationId) {
      cancelAnimationFrame(petalAnimationId);
      petalAnimationId = null;
    }
    // Clear canvas completely
    const ctx = DOM.sakuraCanvas.getContext('2d');
    ctx.clearRect(0, 0, DOM.sakuraCanvas.width, DOM.sakuraCanvas.height);
  }

  // Listen to canvas resize
  window.addEventListener('resize', resizeCanvas);

  // Pause engine loop on tab inactive (page visibility)
  document.addEventListener('visibilitychange', () => {
    isTabActive = !document.hidden;
    if (isTabActive) {
      if (state.petals) {
        startPetals();
      }
      // Resume playing atmospheres video if running
      if (state.activeAtmosphere !== 'none' && DOM.atmosphereVideo.src) {
        DOM.atmosphereVideo.play().catch(e => console.log(e));
      }
    } else {
      if (petalAnimationId) {
        cancelAnimationFrame(petalAnimationId);
        petalAnimationId = null;
      }
      if (state.activeAtmosphere !== 'none') {
        DOM.atmosphereVideo.pause();
      }
    }
  });

  // Settings: Falling Petals switch toggle
  DOM.togglePetals.addEventListener('change', (e) => {
    state.petals = e.target.checked;
    if (state.petals) {
      startPetals();
    } else {
      stopPetals();
    }
    saveSettings();
  });

  // --- 13. Theme Management ---
  DOM.toggleDarkMode.addEventListener('change', (e) => {
    state.theme = e.target.checked ? 'dark' : 'light';
    applyTheme();
    saveSettings();
  });

  function applyTheme() {
    const isDark = state.theme === 'dark';
    
    // Add/remove class from body
    DOM.body.classList.toggle('dark-theme', isDark);
    DOM.toggleDarkMode.checked = isDark;
    
    // Reset accent color defaults if not currently overridden by atmosphere video
    if (state.activeAtmosphere === 'none') {
      const defaultAccent = isDark ? '#C59D6F' : '#B08968';
      const defaultHover = isDark ? '#DBB283' : '#967050';
      document.documentElement.style.setProperty('--accent-color', defaultAccent);
      document.documentElement.style.setProperty('--accent-hover', defaultHover);
    }
  }

  // --- 14. Keyboard Accessibility Navigation ---
  document.addEventListener('keydown', (e) => {
    // ESC: close detail popup or exit full immersion mode
    if (e.key === 'Escape') {
      if (DOM.detailModal.classList.contains('active')) {
        closeDetailModal();
      } else if (state.activeAtmosphere !== 'none') {
        exitAtmosphere();
      }
    }

    // Space: Play/Pause lofi background music (unless typing in search box)
    if (e.key === ' ' && document.activeElement !== DOM.searchBox) {
      e.preventDefault();
      togglePlayPause();
    }

    // Modal navigation: Left/Right arrows
    if (DOM.detailModal.classList.contains('active')) {
      if (e.key === 'ArrowLeft') {
        const anime = filteredAnimeList[state.selectedAnimeIndex];
        if (anime && anime.posters && anime.posters.length > 1) {
          // Switch between alternate posters
          prevPoster();
        } else {
          // Fallback: previous anime card
          prevAnimeEntry();
        }
      } else if (e.key === 'ArrowRight') {
        const anime = filteredAnimeList[state.selectedAnimeIndex];
        if (anime && anime.posters && anime.posters.length > 1) {
          // Switch between alternate posters
          nextPoster();
        } else {
          // Fallback: next anime card
          nextAnimeEntry();
        }
      }
    }
  });

  // --- 15. Local Storage Settings Logic ---
  const STORAGE_KEY = 'anime_archive_user_settings';

  function saveSettings() {
    const config = {
      theme: state.theme,
      petals: state.petals,
      music: state.music,
      sounds: state.sounds,
      musicVolume: state.musicVolume,
      soundsVolume: state.soundsVolume,
      currentTrackIndex: state.currentTrackIndex,
      isShuffle: state.isShuffle,
      isLoop: state.isLoop
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  function loadSettings() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Setup initial defaults: theme light, music/petals off
      applyTheme();
      stopPetals();
      setupShuffleOrder();
      return;
    }

    try {
      const config = JSON.parse(raw);
      
      state.theme = config.theme || 'light';
      state.petals = !!config.petals;
      state.music = !!config.music;
      state.sounds = !!config.sounds;
      state.musicVolume = typeof config.musicVolume === 'number' ? config.musicVolume : 0.5;
      state.soundsVolume = typeof config.soundsVolume === 'number' ? config.soundsVolume : 0.5;
      state.currentTrackIndex = typeof config.currentTrackIndex === 'number' ? config.currentTrackIndex : 0;
      state.isShuffle = !!config.isShuffle;
      state.isLoop = !!config.isLoop;

      // Apply appearance settings
      applyTheme();
      DOM.togglePetals.checked = state.petals;
      if (state.petals) {
        startPetals();
      } else {
        stopPetals();
      }

      // Apply volumes
      DOM.volumeMusic.value = state.musicVolume;
      if (DOM.playerVolume) DOM.playerVolume.value = state.musicVolume;
      DOM.lofiAudio.volume = state.musicVolume;
      DOM.volumeSounds.value = state.soundsVolume;
      DOM.ambienceAudio.volume = state.soundsVolume;

      setupShuffleOrder();
      updatePlayerUI();

      // Apply initial toggles but don't autoplay music immediately on pageload due to browser autoplay policy
      DOM.toggleMusic.checked = state.music;
      DOM.toggleSounds.checked = state.sounds;

      // Prepare track title in player
      const track = lofiPlaylist[state.currentTrackIndex];
      if (track) {
        DOM.playerTrackTitle.textContent = track.title;
        DOM.playerTrackSource.textContent = "Paused";
        DOM.lofiAudio.src = track.file;
      }
    } catch (e) {
      console.error("Could not parse saved user settings.", e);
    }
  }

  // --- 16. Boot Initialization ---
  initPlayerLists();
  loadSettings();
  renderGrid();
  
});
