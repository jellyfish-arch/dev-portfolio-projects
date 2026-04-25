/**
 * CipherVault — script.js
 * Password Manager & Encryption Toolkit
 * Uses Web Crypto API (AES-256-GCM + PBKDF2) for real cryptography.
 * All data lives in localStorage — zero servers, zero tracking.
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   CRYPTO ENGINE  —  AES-256-GCM + PBKDF2
═══════════════════════════════════════════════════════════════ */
const Crypto = (() => {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  /** Derive a CryptoKey from a passphrase + salt via PBKDF2 */
  async function deriveKey(passphrase, salt) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 310_000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /** Encrypt plaintext with a passphrase. Returns base64 blob. */
  async function encrypt(plaintext, passphrase) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv   = crypto.getRandomValues(new Uint8Array(12));
    const key  = await deriveKey(passphrase, salt);
    const cipher = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plaintext)
    );
    // Pack: [salt(16) | iv(12) | ciphertext]
    const packed = new Uint8Array(16 + 12 + cipher.byteLength);
    packed.set(salt, 0);
    packed.set(iv,   16);
    packed.set(new Uint8Array(cipher), 28);
    return btoa(String.fromCharCode(...packed));
  }

  /** Decrypt a base64 blob with a passphrase. Returns plaintext string. */
  async function decrypt(b64, passphrase) {
    const packed = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const salt   = packed.slice(0, 16);
    const iv     = packed.slice(16, 28);
    const cipher = packed.slice(28);
    const key    = await deriveKey(passphrase, salt);
    const plain  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    return dec.decode(plain);
  }

  /** Derive a stable verification hash from the passphrase */
  async function hashPassphrase(passphrase) {
    const salt = enc.encode('cv-static-salt-v1');
    const key  = await deriveKey(passphrase, salt);
    // Encrypt a known sentinel to produce a stable verifier
    const iv   = new Uint8Array(12).fill(42);
    const cipher = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, enc.encode('__cv_verify__')
    );
    return btoa(String.fromCharCode(...new Uint8Array(cipher)));
  }

  return { encrypt, decrypt, hashPassphrase };
})();


/* ═══════════════════════════════════════════════════════════════
   VAULT STORE  — encrypted localStorage
═══════════════════════════════════════════════════════════════ */
const Store = (() => {
  const VAULT_KEY   = 'cv_vault';
  const VERIFIER_KEY = 'cv_verifier';

  let masterKey = null; // raw passphrase held in memory

  async function setMaster(passphrase) {
    masterKey = passphrase;
  }

  function clearMaster() {
    masterKey = null;
  }

  async function saveVerifier(passphrase) {
    const hash = await Crypto.hashPassphrase(passphrase);
    localStorage.setItem(VERIFIER_KEY, hash);
  }

  async function verifyPassphrase(passphrase) {
    const stored = localStorage.getItem(VERIFIER_KEY);
    if (!stored) return false;
    const hash = await Crypto.hashPassphrase(passphrase);
    return hash === stored;
  }

  function hasVault() {
    return !!localStorage.getItem(VERIFIER_KEY);
  }

  async function load() {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return [];
    try {
      const json = await Crypto.decrypt(raw, masterKey);
      return JSON.parse(json);
    } catch {
      return [];
    }
  }

  async function save(entries) {
    if (!masterKey) return;
    const json = JSON.stringify(entries);
    const encrypted = await Crypto.encrypt(json, masterKey);
    localStorage.setItem(VAULT_KEY, encrypted);
  }

  return { setMaster, clearMaster, saveVerifier, verifyPassphrase, hasVault, load, save };
})();


/* ═══════════════════════════════════════════════════════════════
   PASSWORD STRENGTH SCORER
═══════════════════════════════════════════════════════════════ */
function scorePassword(pw) {
  if (!pw || pw.length === 0) return { score: 0, label: '—', color: '#5c6177' };
  let s = 0;

  // Length
  if (pw.length >= 8)  s += 10;
  if (pw.length >= 12) s += 15;
  if (pw.length >= 16) s += 20;
  if (pw.length >= 24) s += 10;

  // Char classes
  if (/[a-z]/.test(pw)) s += 10;
  if (/[A-Z]/.test(pw)) s += 10;
  if (/[0-9]/.test(pw)) s += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) s += 15;

  // Uniqueness
  const unique = new Set(pw).size;
  if (unique > pw.length * 0.6) s += 10;

  s = Math.min(100, s);

  let label, color;
  if (s < 30)      { label = 'Very Weak'; color = '#ef4444'; }
  else if (s < 50) { label = 'Weak';      color = '#f97316'; }
  else if (s < 70) { label = 'Fair';      color = '#f59e0b'; }
  else if (s < 85) { label = 'Strong';    color = '#22d47b'; }
  else             { label = 'Very Strong'; color = '#00d4ff'; }

  return { score: s, label, color };
}

function applyStrength(barEl, labelEl, password) {
  const { score, label, color } = scorePassword(password || '');
  if (barEl) {
    barEl.style.width = score + '%';
    barEl.style.backgroundColor = color;
  }
  if (labelEl) {
    labelEl.textContent = label;
    labelEl.style.color = color;
  }
}


/* ═══════════════════════════════════════════════════════════════
   PASSWORD GENERATOR
═══════════════════════════════════════════════════════════════ */
function generatePassword({ length = 16, upper = true, lower = true, nums = true, syms = true, noAmbig = false } = {}) {
  let chars = '';
  const ambig = 'O0Il1';
  if (upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (lower) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (nums)  chars += '0123456789';
  if (syms)  chars += '!@#$%^&*()-_=+[]{}|;:,.<>?';

  if (noAmbig) {
    chars = chars.split('').filter(c => !ambig.includes(c)).join('');
  }

  if (!chars) return 'Select at least one character type';

  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, n => chars[n % chars.length]).join('');
}


/* ═══════════════════════════════════════════════════════════════
   TOAST SYSTEM
═══════════════════════════════════════════════════════════════ */
function toast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-dot"></span> ${message}`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, duration);
}


/* ═══════════════════════════════════════════════════════════════
   COPYING
═══════════════════════════════════════════════════════════════ */
async function copyText(text, label = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast(`${label} to clipboard`, 'success');
  } catch {
    toast('Copy failed — try manually', 'error');
  }
}


/* ═══════════════════════════════════════════════════════════════
   CATEGORY COLORS / EMOJI
═══════════════════════════════════════════════════════════════ */
const CAT_EMOJI = { Social: '💬', Work: '💼', Finance: '💰', Dev: '🛠️', Other: '📦' };
const GRADIENTS = [
  ['#7c6fff','#5a4ee8'],['#00d4ff','#0099cc'],['#22d47b','#16a55a'],
  ['#f59e0b','#d97706'],['#ef4444','#b91c1c'],['#a78fff','#7c3aed'],
  ['#fb923c','#ea580c'],['#34d399','#059669'],
];

function entryGradient(name) {
  const idx = (name || 'X').charCodeAt(0) % GRADIENTS.length;
  return GRADIENTS[idx];
}


/* ═══════════════════════════════════════════════════════════════
   APP STATE
═══════════════════════════════════════════════════════════════ */
let entries = [];       // in-memory vault
let filterCat = 'all';  // active category filter
let searchTerm = '';    // active search
let editingId = null;   // entry being edited

/* ═══════════════════════════════════════════════════════════════
   DOM HELPERS
═══════════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);


/* ═══════════════════════════════════════════════════════════════
   TOGGLE PASSWORD VISIBILITY
═══════════════════════════════════════════════════════════════ */
document.querySelectorAll('.toggle-pw-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;
    target.type = target.type === 'password' ? 'text' : 'password';
  });
});


/* ═══════════════════════════════════════════════════════════════
   LOCK SCREEN
═══════════════════════════════════════════════════════════════ */
const lockScreen   = $('lock-screen');
const appEl        = $('app');
const masterInput  = $('master-password-input');
const confirmInput = $('confirm-password-input');
const confirmGroup = $('confirm-group');
const unlockBtn    = $('unlock-btn');
const unlockText   = $('unlock-btn-text');
const unlockSpinner= $('unlock-spinner');
const lockHint     = $('lock-hint');
const pwStrengthWrap = $('pw-strength-wrap');
const pwStrengthBar  = $('pw-strength-bar');
const pwStrengthLabel= $('pw-strength-label');

const isNew = !Store.hasVault();
if (isNew) {
  confirmGroup.style.display = 'flex';
  unlockText.textContent = 'Create Vault';
  lockHint.textContent = 'Choose a strong master password. It cannot be recovered.';
  pwStrengthWrap.style.display = 'flex';
} else {
  lockHint.textContent = 'Enter your master password to unlock the vault.';
}

masterInput.addEventListener('input', () => {
  if (isNew) applyStrength(pwStrengthBar, pwStrengthLabel, masterInput.value);
});

unlockBtn.addEventListener('click', handleUnlock);
masterInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleUnlock(); });
confirmInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleUnlock(); });

async function handleUnlock() {
  const pw = masterInput.value.trim();
  if (!pw) { toast('Please enter a master password', 'error'); return; }

  if (isNew) {
    const confirm = confirmInput.value.trim();
    if (!confirm) { toast('Please confirm your password', 'error'); return; }
    if (pw !== confirm) { toast('Passwords do not match', 'error'); return; }
    if (pw.length < 8) { toast('Password must be at least 8 characters', 'error'); return; }
  }

  setLoading(true);

  try {
    if (isNew) {
      await Store.saveVerifier(pw);
      await Store.setMaster(pw);
      entries = [];
      toast('Vault created successfully!', 'success');
    } else {
      const ok = await Store.verifyPassphrase(pw);
      if (!ok) { toast('Incorrect master password', 'error'); setLoading(false); return; }
      await Store.setMaster(pw);
      entries = await Store.load();
      toast('Vault unlocked', 'success');
    }
    bootApp();
  } catch (err) {
    console.error(err);
    toast('An error occurred. Please try again.', 'error');
    setLoading(false);
  }
}

function setLoading(on) {
  unlockBtn.disabled = on;
  unlockText.style.display = on ? 'none' : 'inline';
  unlockSpinner.style.display = on ? 'block' : 'none';
}


/* ═══════════════════════════════════════════════════════════════
   BOOT APP
═══════════════════════════════════════════════════════════════ */
function bootApp() {
  lockScreen.style.display = 'none';
  appEl.style.display = 'grid';
  renderVault();
  updateStats();
}


/* ═══════════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════════ */
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    switchView(item.dataset.view);
  });
});

function switchView(viewId) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  const navEl = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  const viewEl = $(`view-${viewId}`);
  if (navEl) navEl.classList.add('active');
  if (viewEl) viewEl.classList.add('active');

  // Close sidebar on mobile
  if (window.innerWidth <= 900) closeSidebar();
}

// Sidebar mobile toggle
const sidebar = $('sidebar');
on($('menu-btn'), 'click', () => sidebar.classList.add('open'));
on($('close-sidebar-btn'), 'click', closeSidebar);

function closeSidebar() { sidebar.classList.remove('open'); }

// "Add Entry" buttons
on($('add-entry-btn'), 'click', openAddModal);
on($('empty-add-btn'), 'click', openAddModal);

// Lock vault
on($('lock-vault-btn'), 'click', lockVault);

function lockVault() {
  Store.clearMaster();
  entries = [];
  location.reload();
}


/* ═══════════════════════════════════════════════════════════════
   VAULT RENDER
═══════════════════════════════════════════════════════════════ */
function getFilteredEntries() {
  let list = [...entries];
  if (filterCat !== 'all') list = list.filter(e => e.category === filterCat);
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    list = list.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.username || '').toLowerCase().includes(q) ||
      (e.url || '').toLowerCase().includes(q)
    );
  }
  return list;
}

function renderVault() {
  const grid  = $('vault-grid');
  const empty = $('vault-empty');
  const list  = getFilteredEntries();

  grid.innerHTML = '';

  if (list.length === 0) {
    grid.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }

  grid.style.display = 'grid';
  empty.style.display = 'none';

  list.forEach(entry => {
    const card = buildEntryCard(entry);
    grid.appendChild(card);
  });
}

function buildEntryCard(entry) {
  const { score, color } = scorePassword(entry.password);
  const [g1, g2] = entryGradient(entry.name);
  const initials = (entry.name || '?').substring(0, 2).toUpperCase();
  const masked = '•'.repeat(Math.min(entry.password.length, 14));
  const catTag = entry.category || 'Other';
  const emoji  = CAT_EMOJI[catTag] || '📦';

  const card = document.createElement('div');
  card.className = 'entry-card';
  card.innerHTML = `
    <div class="entry-card-top">
      <div class="entry-favicon" style="background:linear-gradient(135deg,${g1},${g2})">${initials}</div>
      <div class="entry-meta">
        <div class="entry-name" title="${escHtml(entry.name)}">${escHtml(entry.name)}</div>
        <div class="entry-username">${escHtml(entry.username || 'No username')}</div>
      </div>
      <span class="entry-category-tag tag-${catTag}">${emoji} ${catTag}</span>
    </div>
    <div class="entry-password-row">
      <div class="entry-pw-display" id="pw-${entry.id}">${masked}</div>
      <div class="entry-pw-strength" style="background:${color}"></div>
      <button class="icon-btn toggle-card-pw" data-id="${entry.id}" title="Reveal/hide password" aria-label="Toggle password">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
    </div>
    <div class="entry-actions">
      <button class="entry-action-btn copy-pw-btn" data-id="${entry.id}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy
      </button>
      <button class="entry-action-btn edit-btn" data-id="${entry.id}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Edit
      </button>
      <button class="entry-action-btn danger delete-btn" data-id="${entry.id}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        Delete
      </button>
    </div>
  `;

  // reveal/hide
  card.querySelector('.toggle-card-pw').addEventListener('click', () => {
    const display = card.querySelector(`#pw-${entry.id}`);
    const isHidden = display.textContent.startsWith('•');
    display.textContent = isHidden ? entry.password : masked;
    display.style.color = isHidden ? 'var(--accent-2)' : 'var(--text-2)';
    display.style.fontFamily = isHidden ? 'var(--mono)' : 'var(--mono)';
  });

  // copy
  card.querySelector('.copy-pw-btn').addEventListener('click', () => {
    copyText(entry.password, `Password for ${entry.name}`);
  });

  // edit
  card.querySelector('.edit-btn').addEventListener('click', () => openEditModal(entry.id));

  // delete
  card.querySelector('.delete-btn').addEventListener('click', () => deleteEntry(entry.id));

  return card;
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


/* ── STATS ──────────────────────────────────────────────────── */
function updateStats() {
  const total   = entries.length;
  const weak    = entries.filter(e => scorePassword(e.password).score < 50).length;
  const pwCounts = {};
  entries.forEach(e => { pwCounts[e.password] = (pwCounts[e.password] || 0) + 1; });
  const reused  = Object.values(pwCounts).filter(c => c > 1).length;

  $('stat-total').textContent  = total;
  $('stat-weak').textContent   = weak;
  $('stat-reused').textContent = reused;
  $('vault-count-badge').textContent = total;
}


/* ── SEARCH ─────────────────────────────────────────────────── */
on($('search-input'), 'input', e => {
  searchTerm = e.target.value;
  renderVault();
});


/* ── FILTER CHIPS ───────────────────────────────────────────── */
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    filterCat = chip.dataset.filter;
    renderVault();
  });
});


/* ═══════════════════════════════════════════════════════════════
   ENTRY MODAL
═══════════════════════════════════════════════════════════════ */
const modalOverlay = $('entry-modal-overlay');
const entryForm    = $('entry-form');
const modalTitle   = $('modal-title');
const modalStrengthBar = $('modal-strength-bar');

function openAddModal() {
  editingId = null;
  modalTitle.textContent = 'Add Entry';
  entryForm.reset();
  $('modal-save-btn').textContent = 'Save Entry';
  modalStrengthBar.style.width = '0%';
  showModal();
}

function openEditModal(id) {
  const entry = entries.find(e => e.id === id);
  if (!entry) return;
  editingId = id;
  modalTitle.textContent = 'Edit Entry';
  $('entry-id').value       = entry.id;
  $('entry-name').value     = entry.name;
  $('entry-category').value = entry.category || 'Other';
  $('entry-username').value = entry.username || '';
  $('entry-password').value = entry.password;
  $('entry-url').value      = entry.url || '';
  $('entry-notes').value    = entry.notes || '';
  $('modal-save-btn').textContent = 'Save Changes';
  applyStrength(modalStrengthBar, null, entry.password);
  showModal();
}

function showModal() {
  modalOverlay.style.display = 'flex';
  setTimeout(() => $('entry-name').focus(), 100);
}

function closeModal() {
  modalOverlay.style.display = 'none';
  entryForm.reset();
  editingId = null;
}

on($('modal-close-btn'),  'click', closeModal);
on($('modal-cancel-btn'), 'click', closeModal);
on(modalOverlay, 'click', e => { if (e.target === modalOverlay) closeModal(); });

// Password strength in modal
on($('entry-password'), 'input', e => {
  applyStrength(modalStrengthBar, null, e.target.value);
});

// Quick-generate inside modal
on($('modal-gen-btn'), 'click', () => {
  const pw = generatePassword({ length: 20, upper: true, lower: true, nums: true, syms: true });
  $('entry-password').value = pw;
  $('entry-password').type = 'text';
  applyStrength(modalStrengthBar, null, pw);
  toast('Password generated', 'info');
});

// Toggle pw visibility in modal
document.querySelectorAll('.toggle-pw-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;
    target.type = target.type === 'password' ? 'text' : 'password';
  });
});

// Submit form
entryForm.addEventListener('submit', async e => {
  e.preventDefault();
  const name = $('entry-name').value.trim();
  const pw   = $('entry-password').value;
  if (!name) { toast('Entry name is required', 'error'); return; }
  if (!pw)   { toast('Password is required', 'error'); return; }

  const entry = {
    id:       editingId || crypto.randomUUID(),
    name,
    category: $('entry-category').value,
    username: $('entry-username').value.trim(),
    password: pw,
    url:      $('entry-url').value.trim(),
    notes:    $('entry-notes').value.trim(),
    updatedAt: new Date().toISOString(),
  };

  if (editingId) {
    const idx = entries.findIndex(e => e.id === editingId);
    if (idx !== -1) entries[idx] = entry;
    toast('Entry updated', 'success');
  } else {
    entries.unshift(entry);
    toast('Entry saved', 'success');
  }

  await Store.save(entries);
  updateStats();
  renderVault();
  closeModal();
});

/* ── DELETE ─────────────────────────────────────────────────── */
async function deleteEntry(id) {
  entries = entries.filter(e => e.id !== id);
  await Store.save(entries);
  updateStats();
  renderVault();
  toast('Entry deleted', 'info');
}


/* ═══════════════════════════════════════════════════════════════
   GENERATOR VIEW
═══════════════════════════════════════════════════════════════ */
const genOutput       = $('gen-output');
const genLengthSlider = $('gen-length');
const genLenVal       = $('len-val');
const genStrengthBar  = $('gen-strength-bar');
const genStrengthLabel= $('gen-strength-label');

genLengthSlider.addEventListener('input', () => {
  genLenVal.textContent = genLengthSlider.value;
});

function runGenerator() {
  const pw = generatePassword({
    length:  parseInt(genLengthSlider.value),
    upper:   $('gen-upper').checked,
    lower:   $('gen-lower').checked,
    nums:    $('gen-nums').checked,
    syms:    $('gen-syms').checked,
    noAmbig: $('gen-ambig').checked,
  });
  genOutput.textContent = pw;
  applyStrength(genStrengthBar, genStrengthLabel, pw);
}

on($('gen-btn'), 'click', runGenerator);
on($('gen-copy-btn'), 'click', () => {
  const pw = genOutput.textContent;
  if (pw && pw !== 'Click Generate') copyText(pw, 'Password');
});


/* ═══════════════════════════════════════════════════════════════
   ENCRYPT VIEW
═══════════════════════════════════════════════════════════════ */
on($('enc-btn'), 'click', async () => {
  const plain = $('enc-plain').value.trim();
  const key   = $('enc-key').value.trim();
  if (!plain) { toast('Enter text to encrypt', 'error'); return; }
  if (!key)   { toast('Enter an encryption key', 'error'); return; }
  try {
    const cipher = await Crypto.encrypt(plain, key);
    $('enc-result').textContent = cipher;
    $('enc-result-wrap').classList.remove('hide');
    toast('Text encrypted', 'success');
  } catch {
    toast('Encryption failed', 'error');
  }
});

on($('enc-copy-btn'), 'click', () => {
  copyText($('enc-result').textContent, 'Ciphertext');
});

on($('dec-btn'), 'click', async () => {
  const cipher = $('dec-cipher').value.trim();
  const key    = $('dec-key').value.trim();
  if (!cipher) { toast('Enter ciphertext to decrypt', 'error'); return; }
  if (!key)    { toast('Enter the decryption key', 'error'); return; }
  try {
    const plain = await Crypto.decrypt(cipher, key);
    $('dec-result').textContent = plain;
    $('dec-result-wrap').classList.remove('hide');
    toast('Decrypted successfully', 'success');
  } catch {
    toast('Decryption failed — wrong key?', 'error');
  }
});

on($('dec-copy-btn'), 'click', () => {
  copyText($('dec-result').textContent, 'Text');
});


/* ═══════════════════════════════════════════════════════════════
   AUDIT VIEW
═══════════════════════════════════════════════════════════════ */
on($('run-audit-btn'), 'click', runAudit);

function runAudit() {
  if (entries.length === 0) {
    toast('Add some entries first', 'info');
    return;
  }

  const issues = [];
  let deductions = 0;

  // 1. Weak passwords
  const weakList = entries.filter(e => scorePassword(e.password).score < 50);
  if (weakList.length > 0) {
    deductions += Math.min(50, weakList.length * 10);
    issues.push({
      type: 'danger',
      icon: '⚠️',
      title: `${weakList.length} Weak Password${weakList.length > 1 ? 's' : ''}`,
      desc: `Entries: ${weakList.map(e => e.name).join(', ')}. These are easily guessable.`,
    });
  }

  // 2. Reused passwords
  const pwMap = {};
  entries.forEach(e => { (pwMap[e.password] = pwMap[e.password] || []).push(e.name); });
  const reused = Object.values(pwMap).filter(a => a.length > 1);
  if (reused.length > 0) {
    deductions += Math.min(30, reused.length * 10);
    issues.push({
      type: 'warn',
      icon: '🔁',
      title: `${reused.length} Reused Password${reused.length > 1 ? 's' : ''}`,
      desc: `Groups: ${reused.map(g => g.join(' & ')).join('; ')}. Use unique passwords for each service.`,
    });
  }

  // 3. Short passwords (< 12 chars)
  const shortList = entries.filter(e => e.password.length < 12 && scorePassword(e.password).score >= 50);
  if (shortList.length > 0) {
    deductions += Math.min(20, shortList.length * 5);
    issues.push({
      type: 'warn',
      icon: '📏',
      title: `${shortList.length} Short Password${shortList.length > 1 ? 's' : ''}`,
      desc: `${shortList.map(e => e.name).join(', ')} — consider passwords of 16+ characters.`,
    });
  }

  // 4. Missing URLs
  const noUrl = entries.filter(e => !e.url);
  if (noUrl.length > 0) {
    issues.push({
      type: 'info',
      icon: '🔗',
      title: `${noUrl.length} Entry Without URL`,
      desc: `Adding URLs helps identify entries quickly. E.g.: ${noUrl.slice(0,3).map(e=>e.name).join(', ')}.`,
    });
  }

  // Score
  const score = Math.max(0, 100 - deductions);

  // Render ring
  const ringFill = $('audit-ring-fill');
  const circumference = 314;
  const dashOffset = circumference - (score / 100) * circumference;
  ringFill.style.stroke = score >= 75 ? '#22d47b' : score >= 50 ? '#f59e0b' : '#ef4444';
  ringFill.style.strokeDashoffset = dashOffset;

  $('audit-score-num').textContent = score;

  let grade, desc;
  if (score >= 80)      { grade = '🛡️ Excellent'; desc = 'Your vault is well secured!'; }
  else if (score >= 60) { grade = '✅ Good'; desc = 'A few improvements are recommended.'; }
  else if (score >= 40) { grade = '⚠️ Fair'; desc = 'Several issues need attention.'; }
  else                  { grade = '🚨 Critical'; desc = 'Your vault has serious security problems.'; }

  $('audit-score-grade').textContent = grade;
  $('audit-score-desc').textContent  = desc;

  // Render issues
  const list = $('audit-issues-list');
  list.innerHTML = '';
  if (issues.length === 0) {
    list.innerHTML = '<div style="color:var(--green);font-weight:600;">✅ No issues found — great job!</div>';
  } else {
    issues.forEach(issue => {
      const el = document.createElement('div');
      el.className = `audit-issue ${issue.type}`;
      el.innerHTML = `
        <span class="audit-issue-icon">${issue.icon}</span>
        <div class="audit-issue-body">
          <div class="audit-issue-title">${issue.title}</div>
          <div class="audit-issue-desc">${issue.desc}</div>
        </div>
      `;
      list.appendChild(el);
    });
  }

  toast('Audit complete', 'success');
}


/* ═══════════════════════════════════════════════════════════════
   SVG GRADIENT DEFINITION (for audit ring)
═══════════════════════════════════════════════════════════════ */
const svgNS = 'http://www.w3.org/2000/svg';
const ringSvg = document.querySelector('.ring-svg');
if (ringSvg) {
  const defs = document.createElementNS(svgNS, 'defs');
  const grad = document.createElementNS(svgNS, 'linearGradient');
  grad.setAttribute('id', 'ringGrad');
  grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
  grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '100%');
  const s1 = document.createElementNS(svgNS, 'stop');
  s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', '#7c6fff');
  const s2 = document.createElementNS(svgNS, 'stop');
  s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', '#00d4ff');
  grad.appendChild(s1); grad.appendChild(s2);
  defs.appendChild(grad);
  ringSvg.insertBefore(defs, ringSvg.firstChild);
}

/* ═══════════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
═══════════════════════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (!appEl || appEl.style.display === 'none') return;
  if (e.key === 'Escape') closeModal();
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    $('search-input').focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    openAddModal();
  }
});
