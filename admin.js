/* ==========================================================================
   ANIME ARCHIVE — ADMIN MODE (Vanilla JS + GitHub API)
   Two-way sync: edits from Admin Mode commit directly to GitHub.
   Editable fields: My Rating, Status, and Feedback (My Thoughts).
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PIN = 'ved@admin';
  const REPO_OWNER = 'VedantBakre';
  const REPO_NAME = 'AnimeArchive';
  const FILE_PATH = 'data.js';

  // Inject HTML for Admin Modal & Toast
  const adminHtml = `
    <div id="admin-login-modal" class="modal">
      <div class="modal-backdrop" id="admin-modal-backdrop"></div>
      <div class="modal-content admin-modal-content">
        <h2>Admin Login</h2>
        <p>Please enter the admin PIN to unlock editing.</p>
        <input type="password" id="admin-pin-input" placeholder="PIN" class="admin-input" autocomplete="off" />
        <p>Please enter your GitHub Fine-Grained PAT (needs content read/write access).</p>
        <input type="password" id="admin-pat-input" placeholder="GitHub PAT" class="admin-input" autocomplete="off" />
        <div class="admin-actions">
          <button id="admin-cancel-btn" class="filter-tab">Cancel</button>
          <button id="admin-login-btn" class="filter-tab active">Login</button>
        </div>
      </div>
    </div>
    <div id="admin-toast-container" class="toast-container"></div>
  `;
  document.body.insertAdjacentHTML('beforeend', adminHtml);

  // Reference elements
  const loginModal = document.getElementById('admin-login-modal');
  const pinInput = document.getElementById('admin-pin-input');
  const patInput = document.getElementById('admin-pat-input');
  const loginBtn = document.getElementById('admin-login-btn');
  const cancelBtn = document.getElementById('admin-cancel-btn');
  const backdrop = document.getElementById('admin-modal-backdrop');

  // State
  let isAdmin = sessionStorage.getItem('adminPAT') ? true : false;
  let currentPat = sessionStorage.getItem('adminPAT') || '';
  // Track the currently displayed entry ID to avoid redundant input population
  let lastPopulatedEntryId = null;

  if (isAdmin) {
    enableAdminMode();
  }

  // Keyboard shortcut Ctrl+Alt+A
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      if (!isAdmin) {
        loginModal.classList.add('active');
        pinInput.focus();
      } else {
        showToast("Already logged in as Admin.");
      }
    }
  });

  // Cancel login
  cancelBtn.addEventListener('click', () => {
    loginModal.classList.remove('active');
    pinInput.value = '';
    patInput.value = '';
  });
  backdrop.addEventListener('click', () => {
    loginModal.classList.remove('active');
  });

  // Login action
  loginBtn.addEventListener('click', () => {
    const pin = pinInput.value.trim();
    const pat = patInput.value.trim();

    if (pin === ADMIN_PIN && pat) {
      currentPat = pat;
      sessionStorage.setItem('adminPAT', pat);
      isAdmin = true;
      loginModal.classList.remove('active');
      pinInput.value = '';
      patInput.value = '';
      enableAdminMode();
      showToast('Admin Mode Unlocked!', 'success');
    } else {
      showToast('Invalid PIN or missing PAT.', 'error');
    }
  });

  // Allow Enter key to submit login
  patInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
  });
  pinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') patInput.focus();
  });

  function enableAdminMode() {
    // 1. Add Badge to header
    const headerLeft = document.querySelector('.header-left');
    if (!document.getElementById('admin-badge')) {
      const badge = document.createElement('span');
      badge.id = 'admin-badge';
      badge.className = 'admin-badge';
      badge.textContent = 'Admin Mode';
      headerLeft.appendChild(badge);
    }

    // 2. Inject Edit UI into Detail Modal if not already there
    const thoughtsSection = document.querySelector('.modal-thoughts-section');
    if (thoughtsSection && !document.getElementById('admin-edit-section')) {
      const editSection = document.createElement('div');
      editSection.id = 'admin-edit-section';
      editSection.className = 'admin-edit-section';
      editSection.innerHTML = `
        <hr class="footer-divider" style="margin: 20px 0;">
        <h3 class="thoughts-title">Admin Edit</h3>
        <div class="admin-edit-grid">
          <div class="admin-input-group">
            <label>My Rating (e.g. 9.5/10 or 11/10)</label>
            <input type="text" id="edit-my-rating" class="admin-input" placeholder="e.g. 9.5/10" />
          </div>
          <div class="admin-input-group">
            <label>Status</label>
            <select id="edit-status" class="admin-input">
              <option value="Watched">Watched</option>
              <option value="Pending">Plan to Watch</option>
            </select>
          </div>
          <div class="admin-input-group">
            <label>My Thoughts / Feedback</label>
            <textarea id="edit-feedback" class="admin-input" rows="4" placeholder="Write your thoughts..."></textarea>
          </div>
          <button id="admin-save-entry-btn" class="filter-tab active" style="width: 100%; margin-top: 8px;">Save Changes & Commit</button>
        </div>
      `;
      thoughtsSection.parentNode.insertBefore(editSection, thoughtsSection.nextSibling);

      document.getElementById('admin-save-entry-btn').addEventListener('click', saveAndCommitEntry);
    }

    // 3. Set up event-driven input population (replaces the old 300ms polling)
    setupModalObserver();
  }

  // --- Event-Driven Input Population ---
  // Uses a MutationObserver on the modal title to detect when the displayed
  // anime entry changes, instead of wasteful 300ms setInterval polling.
  function setupModalObserver() {
    const modalTitle = document.getElementById('modal-anime-name');
    if (!modalTitle) return;

    // Populate inputs when the detail modal becomes active
    const detailModal = document.getElementById('detail-modal');

    // Use MutationObserver to watch for class changes on the detail modal
    // and text changes on the title (which change when navigating entries)
    const observer = new MutationObserver(() => {
      if (isAdmin && detailModal.classList.contains('active')) {
        populateAdminInputs();
      } else {
        lastPopulatedEntryId = null;
      }
    });

    // Observe the modal for activation (class changes)
    observer.observe(detailModal, { attributes: true, attributeFilter: ['class'] });

    // Observe the title for text content changes (entry navigation)
    observer.observe(modalTitle, { childList: true, characterData: true, subtree: true });
  }

  function populateAdminInputs() {
    const title = document.getElementById('modal-anime-name').textContent;
    const entry = animeList.find(a => a.name === title);

    const inputRating = document.getElementById('edit-my-rating');
    const inputStatus = document.getElementById('edit-status');
    const inputFeedback = document.getElementById('edit-feedback');

    if (entry && inputRating && inputFeedback && inputStatus && lastPopulatedEntryId !== entry.id) {
      inputRating.value = entry.myRating || '';
      inputStatus.value = entry.status || 'Pending';
      inputFeedback.value = entry.feedback || '';
      // Store the entry ID on the rating input for save reference
      inputRating.dataset.currentId = entry.id;
      lastPopulatedEntryId = entry.id;
    }
  }

  async function saveAndCommitEntry() {
    const btn = document.getElementById('admin-save-entry-btn');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
      const currentId = document.getElementById('edit-my-rating').dataset.currentId;
      const newRating = document.getElementById('edit-my-rating').value.trim();
      const newStatus = document.getElementById('edit-status').value;
      const newFeedback = document.getElementById('edit-feedback').value.trim();

      if (!currentId) throw new Error("No active entry found.");

      const entryIndex = animeList.findIndex(a => a.id == currentId);
      if (entryIndex === -1) throw new Error("Entry not found in data.");

      // Update local array
      animeList[entryIndex].myRating = newRating;
      animeList[entryIndex].status = newStatus;
      animeList[entryIndex].feedback = newFeedback;

      // Reflect directly in the open modal UI
      document.getElementById('modal-meta-my-rating').textContent = newRating || '-';
      document.getElementById('modal-thoughts-text').textContent = newFeedback ? `"${newFeedback}"` : '"No thoughts recorded yet."';

      // Construct file content
      const fileContent = constructDataJs();

      // Commit via GitHub API
      await commitToGitHub(fileContent, `Update rating, status & feedback for ${animeList[entryIndex].name}`);

      // Re-render the grid to reflect changes on cards (rating badges, etc.)
      if (typeof filterAndSearch === 'function') {
        filterAndSearch();
      } else if (typeof renderGrid === 'function') {
        renderGrid();
      }

      // Recalculate stats dashboard (watched count, avg rating, etc.)
      if (typeof calculateStatistics === 'function') {
        calculateStatistics();
      }

      showToast('Changes saved and pushed to GitHub!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      btn.textContent = 'Save Changes & Commit';
      btn.disabled = false;
    }
  }

  function constructDataJs() {
    // Produce clean, readable JS matching the original compile_data.py format
    const comment = '// Auto-generated data file from anime.xlsx and asset directories\n';
    const animeBlock = `const animeList = ${JSON.stringify(animeList, null, 2)};\n`;
    const lofiBlock = `\nconst lofiPlaylist = ${JSON.stringify(lofiPlaylist, null, 2)};\n`;
    const ambienceBlock = `\nconst ambiencePlaylist = ${JSON.stringify(ambiencePlaylist, null, 2)};\n`;
    const atmosBlock = `\nconst atmospheres = ${JSON.stringify(atmospheres, null, 2)};\n`;

    return comment + animeBlock + lofiBlock + ambienceBlock + atmosBlock;
  }

  async function commitToGitHub(content, message) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

    // 1. Get current file SHA
    const getRes = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${currentPat}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!getRes.ok) {
      if (getRes.status === 401) throw new Error("Invalid PAT. Please login again.");
      throw new Error("Failed to fetch current data.js SHA.");
    }
    const fileData = await getRes.json();
    const sha = fileData.sha;

    // 2. Put new content
    // Convert to base64 keeping utf8 intact
    const contentBase64 = btoa(unescape(encodeURIComponent(content)));

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${currentPat}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        content: contentBase64,
        sha: sha
      })
    });

    if (!putRes.ok) {
      const errBody = await putRes.json().catch(() => ({}));
      throw new Error(`Failed to commit to GitHub: ${errBody.message || putRes.statusText}`);
    }
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('admin-toast-container');
    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
});
