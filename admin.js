/* ==========================================================================
   ANIME ARCHIVE — ADMIN MODE (Vanilla JS + GitHub API)
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
            <label>My Rating (Out of 10)</label>
            <input type="text" id="edit-my-rating" class="admin-input" placeholder="e.g. 9.5" />
          </div>
          <div class="admin-input-group">
            <label>My Thoughts</label>
            <textarea id="edit-feedback" class="admin-input" rows="4" placeholder="Write your thoughts..."></textarea>
          </div>
          <button id="admin-save-entry-btn" class="filter-tab active" style="width: 100%; margin-top: 8px;">Save Changes & Commit</button>
        </div>
      `;
      thoughtsSection.parentNode.insertBefore(editSection, thoughtsSection.nextSibling);

      document.getElementById('admin-save-entry-btn').addEventListener('click', saveAndCommitEntry);
    }
  }

  // Polling for detail modal content change to populate inputs
  setInterval(() => {
    if (isAdmin && document.getElementById('detail-modal').classList.contains('active')) {
      const title = document.getElementById('modal-anime-name').textContent;
      const entry = animeList.find(a => a.name === title);

      const inputRating = document.getElementById('edit-my-rating');
      const inputFeedback = document.getElementById('edit-feedback');

      if (entry && inputRating && inputFeedback && inputRating.dataset.currentId != entry.id) {
        inputRating.value = entry.myRating || '';
        inputFeedback.value = entry.feedback || '';
        inputRating.dataset.currentId = entry.id;
      }
    } else if (isAdmin) {
      const inputRating = document.getElementById('edit-my-rating');
      if (inputRating) inputRating.dataset.currentId = '';
    }
  }, 300);

  async function saveAndCommitEntry() {
    const btn = document.getElementById('admin-save-entry-btn');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
      const currentId = document.getElementById('edit-my-rating').dataset.currentId;
      const newRating = document.getElementById('edit-my-rating').value.trim();
      const newFeedback = document.getElementById('edit-feedback').value.trim();

      if (!currentId) throw new Error("No active entry found.");

      const entryIndex = animeList.findIndex(a => a.id == currentId);
      if (entryIndex === -1) throw new Error("Entry not found in data.");

      // Update local array
      animeList[entryIndex].myRating = newRating;
      animeList[entryIndex].feedback = newFeedback;

      // Reflect directly in UI
      document.getElementById('modal-meta-my-rating').textContent = newRating || '-';
      document.getElementById('modal-thoughts-text').textContent = newFeedback ? `"${newFeedback}"` : '"No thoughts recorded yet."';

      // Construct file content
      const fileContent = constructDataJs();

      // Commit via GitHub API
      await commitToGitHub(fileContent, `Update rating and feedback for ${animeList[entryIndex].name}`);

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
    return `const animeList = ${JSON.stringify(animeList, null, 2)};\\n\\n` +
      `const lofiPlaylist = ${JSON.stringify(lofiPlaylist, null, 2)};\\n\\n` +
      `const ambiencePlaylist = ${JSON.stringify(ambiencePlaylist, null, 2)};\\n\\n` +
      `const atmospheres = ${JSON.stringify(atmospheres, null, 2)};\\n`;
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
      throw new Error("Failed to commit to GitHub.");
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
