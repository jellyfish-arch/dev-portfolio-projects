/**
 * CipherVault — script.js
 * Password Manager & Encryption Toolkit
 * AES-256-GCM + PBKDF2 via Web Crypto API
 * Forgot Password via Security Questions (PBKDF2-encrypted recovery)
 * Zero servers. All data in localStorage.
 */

'use strict';

/* ═══════════════════════════════════════════════════════════
   CRYPTO ENGINE  —  AES-256-GCM + PBKDF2
═══════════════════════════════════════════════════════════ */
const Crypto = (() => {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

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

  async function encrypt(plaintext, passphrase) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv   = crypto.getRandomValues(new Uint8Array(12));
    const key  = await deriveKey(passphrase, salt);
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
    const packed = new Uint8Array(16 + 12 + cipher.byteLength);
    packed.set(salt, 0);
    packed.set(iv,   16);
    packed.set(new Uint8Array(cipher), 28);
    return btoa(String.fromCharCode(...packed));
  }

  async function decrypt(b64, passphrase) {
    const packed = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const salt   = packed.slice(0, 16);
    const iv     = packed.slice(16, 28);
    const cipher = packed.slice(28);
    const key    = await deriveKey(passphrase, salt);
    const plain  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    return dec.decode(plain);
  }

  async function hashPassphrase(passphrase) {
    const salt = enc.encode('cv-static-salt-v1');
    const key  = await deriveKey(passphrase, salt);
    const iv   = new Uint8Array(12).fill(42);
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode('__cv_verify__'));
    return btoa(String.fromCharCode(...new Uint8Array(cipher)));
  }

  return { encrypt, decrypt, hashPassphrase };
})();


/* ═══════════════════════════════════════════════════════════
   VAULT STORE — encrypted localStorage
═══════════════════════════════════════════════════════════ */
const Store = (() => {
  const VAULT_KEY    = 'cv_vault';
  const VERIFIER_KEY = 'cv_verifier';
  const RECOVERY_KEY = 'cv_recovery'; // security questions recovery blob

  let masterKey = null;

  async function setMaster(passphrase) { masterKey = passphrase; }
  function clearMaster() { masterKey = null; }

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

  function hasVault() { return !!localStorage.getItem(VERIFIER_KEY); }

  async function load() {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return [];
    try {
      const json = await Crypto.decrypt(raw, masterKey);
      return JSON.parse(json);
    } catch { return []; }
  }

  async function save(entries) {
    if (!masterKey) return;
    const json = JSON.stringify(entries);
    const encrypted = await Crypto.encrypt(json, masterKey);
    localStorage.setItem(VAULT_KEY, encrypted);
  }

  /* ── Security Question Recovery ───────────────────────────── */

  /**
   * Save security questions + encrypt the master password with a key
   * derived from the combined (normalized) answers.
   */
  async function saveRecovery(q1id, q1answer, q2id, q2answer, masterPassword) {
    const combinedAnswer = normalizeAnswer(q1answer) + '||' + normalizeAnswer(q2answer);
    const encryptedMaster = await Crypto.encrypt(masterPassword, combinedAnswer);
    const payload = JSON.stringify({ q1: q1id, q2: q2id, encryptedMaster });
    localStorage.setItem(RECOVERY_KEY, payload);
  }

  /**
   * Attempt recovery: derive key from answers, decrypt master password.
   * Returns master password string on success, or throws.
   */
  async function recoverMaster(a1, a2) {
    const raw = localStorage.getItem(RECOVERY_KEY);
    if (!raw) throw new Error('No recovery data found.');
    const { encryptedMaster } = JSON.parse(raw);
    const combinedAnswer = normalizeAnswer(a1) + '||' + normalizeAnswer(a2);
    // Will throw if answers are wrong (AES-GCM auth failure)
    return await Crypto.decrypt(encryptedMaster, combinedAnswer);
  }

  /** Get saved question IDs for display */
  function getRecoveryQuestions() {
    const raw = localStorage.getItem(RECOVERY_KEY);
    if (!raw) return null;
    const { q1, q2 } = JSON.parse(raw);
    return { q1, q2 };
  }

  function hasRecovery() { return !!localStorage.getItem(RECOVERY_KEY); }

  function normalizeAnswer(ans) { return ans.trim().toLowerCase().replace(/\s+/g, ' '); }

  return {
    setMaster, clearMaster, saveVerifier, verifyPassphrase, hasVault,
    load, save, saveRecovery, recoverMaster, getRecoveryQuestions, hasRecovery
  };
})();


/* ═══════════════════════════════════════════════════════════
   SECURITY QUESTION LABELS
═══════════════════════════════════════════════════════════ */
const QUESTION_LABELS = {
  pet:     'What was the name of your first pet?',
  city:    'What city were you born in?',
  school:  'What was the name of your first school?',
  car:     'What was the make of your first car?',
  nick:    'What was your childhood nickname?',
  road:    'What street did you grow up on?',
  teacher: "What was your favourite teacher's last name?",
};


/* ═══════════════════════════════════════════════════════════
   PASSWORD STRENGTH
═══════════════════════════════════════════════════════════ */
function scorePassword(pw) {
  if (!pw || pw.length === 0) return { score: 0, label: '—', color: '#3d4460' };
  let s = 0;
  if (pw.length >= 8)  s += 10;
  if (pw.length >= 12) s += 15;
  if (pw.length >= 16) s += 20;
  if (pw.length >= 24) s += 10;
  if (/[a-z]/.test(pw)) s += 10;
  if (/[A-Z]/.test(pw)) s += 10;
  if (/[0-9]/.test(pw)) s += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) s += 15;
  const unique = new Set(pw).size;
  if (unique > pw.length * 0.6) s += 10;
  s = Math.min(100, s);

  let label, color;
  if (s < 30)      { label = 'Very Weak'; color = '#f87171'; }
  else if (s < 50) { label = 'Weak';      color = '#fb923c'; }
  else if (s < 70) { label = 'Fair';      color = '#fbbf24'; }
  else if (s < 85) { label = 'Strong';    color = '#34d399'; }
  else             { label = 'Very Strong'; color = '#2dd4bf'; }

  return { score: s, label, color };
}

function applyStrength(barEl, labelEl, password) {
  const { score, label, color } = scorePassword(password || '');
  if (barEl)   { barEl.style.width = score + '%'; barEl.style.backgroundColor = color; }
  if (labelEl) { labelEl.textContent = label; labelEl.style.color = color; }
}


/* ═══════════════════════════════════════════════════════════
   PASSWORD GENERATOR
═══════════════════════════════════════════════════════════ */
function generatePassword({ length = 16, upper = true, lower = true, nums = true, syms = true, noAmbig = false } = {}) {
  let chars = '';
  const ambig = 'O0Il1';
  if (upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (lower) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (nums)  chars += '0123456789';
  if (syms)  chars += '!@#$%^&*()-_=+[]{}|;:,.<>?';
  if (noAmbig) chars = chars.split('').filter(c => !ambig.includes(c)).join('');
  if (!chars) return 'Select at least one character type';
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, n => chars[n % chars.length]).join('');
}


/* ═══════════════════════════════════════════════════════════
   TOAST SYSTEM
═══════════════════════════════════════════════════════════ */
function toast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-dot"></span>${message}`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toast-out 0.25s ease forwards';
    setTimeout(() => el.remove(), 250);
  }, duration);
}

async function copyText(text, label = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast(`${label} to clipboard`, 'success');
  } catch {
    toast('Copy failed — try manually', 'error');
  }
}


/* ═══════════════════════════════════════════════════════════
   CATEGORY HELPERS
═══════════════════════════════════════════════════════════ */
const CAT_EMOJI = { Social: '💬', Work: '💼', Finance: '💰', Dev: '🛠️', Other: '📦' };
const CAT_COLOR = {
  Social:  { bg: 'rgba(99,102,241,0.18)',  fg: '#818cf8', bar: '#6366f1' },
  Work:    { bg: 'rgba(59,130,246,0.18)',  fg: '#60a5fa', bar: '#3b82f6' },
  Finance: { bg: 'rgba(212,165,53,0.18)', fg: '#e8c06a', bar: '#d4a535' },
  Dev:     { bg: 'rgba(45,212,191,0.18)', fg: '#2dd4bf', bar: '#14b8a6' },
  Other:   { bg: 'rgba(148,163,184,0.18)',fg: '#94a3b8', bar: '#64748b' },
};


/* ═══════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);


/* ═══════════════════════════════════════════════════════════
   LOCK SCREEN — STEP ROUTING
═══════════════════════════════════════════════════════════ */
let pendingMasterPassword = null; // held between step-1 and step-2

function showLockStep(stepId) {
  document.querySelectorAll('.lock-panel').forEach(p => p.classList.remove('active'));
  const el = $(stepId);
  if (el) el.classList.add('active');
}

/* Initialise the lock screen state */
function initLockScreen() {
  const hasVault  = Store.hasVault();
  const hasRecovery = Store.hasRecovery();

  if (hasVault) {
    $('lock-title-text').textContent    = 'Welcome back';
    $('lock-subtitle-text').textContent = 'Enter your master password to unlock the vault.';
    $('confirm-group').style.display    = 'none';
    $('pw-strength-wrap').style.display = 'none';
    $('unlock-btn-text').textContent    = 'Unlock Vault';
    $('forgot-link-wrap').style.display = hasRecovery ? 'block' : 'none';
  } else {
    $('lock-title-text').textContent    = 'Create your vault';
    $('lock-subtitle-text').textContent = 'Choose a strong master password. It cannot be recovered without security questions.';
    $('confirm-group').style.display    = 'flex';
    $('pw-strength-wrap').style.display = 'flex';
    $('unlock-btn-text').textContent    = 'Create Vault';
    $('forgot-link-wrap').style.display = 'none';
  }

  showLockStep('step-main');
}

/* Master password input — strength while creating */
on($('master-password-input'), 'input', () => {
  if (!Store.hasVault()) {
    applyStrength($('pw-strength-bar'), $('pw-strength-label'), $('master-password-input').value);
  }
});


/* ── UNLOCK / CREATE ────────────────────────────────────── */
on($('unlock-btn'), 'click', async () => {
  const pw      = $('master-password-input').value;
  const confirm = $('confirm-password-input').value;
  const spinner = $('unlock-spinner');
  const btnTxt  = $('unlock-btn-text');

  if (!pw) { toast('Enter your master password', 'error'); return; }

  spinner.style.display = 'block';
  btnTxt.style.display  = 'none';

  try {
    if (!Store.hasVault()) {
      // ── Creating new vault ──
      if (pw !== confirm) { toast('Passwords do not match', 'error'); return; }
      if (pw.length < 8)  { toast('Password must be at least 8 characters', 'error'); return; }

      await Store.saveVerifier(pw);
      await Store.setMaster(pw);
      pendingMasterPassword = pw;

      // Go to security questions step
      showLockStep('step-questions');

    } else {
      // ── Unlocking existing vault ──
      const valid = await Store.verifyPassphrase(pw);
      if (!valid) { toast('Wrong master password', 'error'); return; }
      await Store.setMaster(pw);
      entries = await Store.load();
      enterApp();
    }

  } finally {
    spinner.style.display = 'none';
    btnTxt.style.display  = 'block';
  }
});


/* ── SECURITY QUESTIONS SETUP ───────────────────────────── */
on($('save-questions-btn'), 'click', async () => {
  const q1id  = $('sq1-select').value;
  const q1ans = $('sq1-answer').value.trim();
  const q2id  = $('sq2-select').value;
  const q2ans = $('sq2-answer').value.trim();

  if (!q1id || !q1ans) { toast('Please fill in question 1', 'error'); return; }
  if (!q2id || !q2ans) { toast('Please fill in question 2', 'error'); return; }
  if (q1id === q2id)   { toast('Choose two different questions', 'error'); return; }
  if (!pendingMasterPassword) { toast('Session error. Please reload.', 'error'); return; }

  try {
    await Store.saveRecovery(q1id, q1ans, q2id, q2ans, pendingMasterPassword);
    entries = await Store.load();
    toast('Recovery questions saved!', 'success');
    pendingMasterPassword = null;
    enterApp();
  } catch {
    toast('Failed to save recovery data', 'error');
  }
});

on($('skip-questions-btn'), 'click', async () => {
  entries = await Store.load();
  toast('Vault created (no recovery set)', 'info');
  pendingMasterPassword = null;
  enterApp();
});


/* ── FORGOT PASSWORD ────────────────────────────────────── */
on($('forgot-btn'), 'click', () => {
  const questions = Store.getRecoveryQuestions();
  if (!questions) { toast('No recovery data found', 'error'); return; }

  $('forgot-q1-label').textContent = QUESTION_LABELS[questions.q1] || 'Question 1';
  $('forgot-q2-label').textContent = QUESTION_LABELS[questions.q2] || 'Question 2';
  $('recovered-pw-box').style.display = 'none';
  $('forgot-a1').value = '';
  $('forgot-a2').value = '';

  showLockStep('step-forgot');
});

on($('recover-btn'), 'click', async () => {
  const a1 = $('forgot-a1').value;
  const a2 = $('forgot-a2').value;

  if (!a1 || !a2) { toast('Please answer both questions', 'error'); return; }

  $('recover-btn').disabled = true;
  $('recover-btn').textContent = 'Verifying…';

  try {
    const masterPassword = await Store.recoverMaster(a1, a2);

    // Show the recovered password
    $('recovered-pw-text').textContent = masterPassword;
    $('recovered-pw-box').style.display = 'flex';
    $('recover-btn').textContent = 'Answers correct ✓';

    // Also auto-fill the password field on step-main
    $('master-password-input').value = masterPassword;

    toast('Password recovered! You can now log in.', 'success', 5000);

    // After a moment, go back to login
    setTimeout(() => {
      initLockScreen();
      $('master-password-input').value = masterPassword;
    }, 3500);

  } catch {
    toast('Incorrect answers — please try again', 'error');
    $('recover-btn').disabled = false;
    $('recover-btn').textContent = 'Verify & Recover';
  }
});

on($('back-to-login-btn'), 'click', () => initLockScreen());

on($('recovered-copy-btn'), 'click', () => {
  copyText($('recovered-pw-text').textContent, 'Master password');
});


/* ═══════════════════════════════════════════════════════════
   APP — ENTER / EXIT
═══════════════════════════════════════════════════════════ */
const lockScreen = $('lock-screen');
const appEl      = $('app');
let entries = [];

function enterApp() {
  lockScreen.style.display = 'none';
  appEl.style.display = 'grid';
  updateStats();
  renderVault();
  $('master-password-input').value = '';
  $('confirm-password-input').value = '';
}

function lockApp() {
  Store.clearMaster();
  entries = [];
  appEl.style.display = 'none';
  lockScreen.style.display = 'flex';
  initLockScreen();
}

on($('lock-vault-btn'), 'click', lockApp);


/* ═══════════════════════════════════════════════════════════
   EYE ICON TOGGLE
═══════════════════════════════════════════════════════════ */
document.addEventListener('click', e => {
  const btn = e.target.closest('.toggle-pw-btn');
  if (!btn) return;
  const targetId = btn.dataset.target;
  const input = $(targetId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  const icon = btn.querySelector('.eye-icon');
  if (icon) {
    icon.style.opacity = input.type === 'text' ? '0.5' : '1';
  }
});


/* ═══════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════ */
const navItems = document.querySelectorAll('.nav-item[data-view]');
const views    = document.querySelectorAll('.view');

navItems.forEach(item => {
  on(item, 'click', e => {
    e.preventDefault();
    const view = item.dataset.view;
    navItems.forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    views.forEach(v => v.classList.remove('active'));
    $('view-' + view).classList.add('active');
    if (window.innerWidth <= 900) closeSidebar();
  });
});

/* Sidebar toggle */
on($('menu-btn'), 'click', () => $('sidebar').classList.add('open'));
on($('close-sidebar-btn'), 'click', closeSidebar);
function closeSidebar() { $('sidebar').classList.remove('open'); }


/* ═══════════════════════════════════════════════════════════
   VAULT RENDER
═══════════════════════════════════════════════════════════ */
let activeFilter  = 'All';
let searchQuery   = '';

function filteredEntries() {
  return entries.filter(e => {
    const matchCat    = activeFilter === 'All' || e.category === activeFilter;
    const matchSearch = !searchQuery ||
      e.name.toLowerCase().includes(searchQuery) ||
      (e.username || '').toLowerCase().includes(searchQuery) ||
      (e.url || '').toLowerCase().includes(searchQuery);
    return matchCat && matchSearch;
  });
}

function renderVault() {
  const list    = $('vault-list');
  const empty   = $('vault-empty');
  const badge   = $('vault-count-badge');
  const visible = filteredEntries();

  badge.textContent = entries.length;
  list.innerHTML = '';
  list.appendChild(empty);

  if (visible.length === 0) {
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  visible.forEach(entry => {
    const { score, color } = scorePassword(entry.password || '');
    const cat = CAT_COLOR[entry.category] || CAT_COLOR['Other'];
    const emoji = CAT_EMOJI[entry.category] || '📦';

    const row = document.createElement('div');
    row.className = 'entry-row';
    row.style.setProperty('--entry-color', cat.bar);

    row.innerHTML = `
      <div class="entry-avatar" style="background:${cat.bg}; color:${cat.fg};">${emoji}</div>
      <div class="entry-info">
        <div class="entry-name">${esc(entry.name)}</div>
        ${entry.username ? `<div class="entry-user">${esc(entry.username)}</div>` : ''}
        <div class="entry-meta-row">
          <span class="entry-cat-tag">${esc(entry.category)}</span>
          <span class="strength-dot" style="background:${color};" title="Strength: ${score}%"></span>
        </div>
      </div>
      <div class="entry-actions">
        <div class="entry-pw-field">
          <span class="entry-pw-text" id="pw-${entry.id}" data-plain="${esc(entry.password)}" data-hidden="true">••••••••</span>
          <button class="field-btn toggle-pw-btn" data-target-entry="${entry.id}" aria-label="Toggle password">
            <svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="field-btn" data-copy-entry="${entry.id}" title="Copy password">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>
        <button class="icon-btn" data-edit-entry="${entry.id}" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="icon-btn" data-delete-entry="${entry.id}" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    `;
    list.appendChild(row);
  });
}

/* Entry actions delegation */
document.addEventListener('click', async e => {
  // Toggle password visibility in vault
  const toggleBtn = e.target.closest('[data-target-entry]');
  if (toggleBtn) {
    const id  = toggleBtn.dataset.targetEntry;
    const span = $('pw-' + id);
    if (!span) return;
    if (span.dataset.hidden === 'true') {
      span.textContent   = span.dataset.plain;
      span.dataset.hidden = 'false';
    } else {
      span.textContent   = '••••••••';
      span.dataset.hidden = 'true';
    }
    return;
  }

  // Copy password
  const copyBtn = e.target.closest('[data-copy-entry]');
  if (copyBtn) {
    const id   = copyBtn.dataset.copyEntry;
    const span = $('pw-' + id);
    if (span) copyText(span.dataset.plain, 'Password');
    return;
  }

  // Edit entry
  const editBtn = e.target.closest('[data-edit-entry]');
  if (editBtn) {
    const id    = editBtn.dataset.editEntry;
    const entry = entries.find(e => e.id === id);
    if (entry) openEditModal(entry);
    return;
  }

  // Delete entry
  const delBtn = e.target.closest('[data-delete-entry]');
  if (delBtn) {
    const id = delBtn.dataset.deleteEntry;
    if (confirm('Delete this entry?')) deleteEntry(id);
    return;
  }
});

function updateStats() {
  $('stat-total').textContent = entries.length;
  const weak = entries.filter(e => scorePassword(e.password).score < 50).length;
  $('stat-weak').textContent = weak;

  const pwMap = {};
  entries.forEach(e => { (pwMap[e.password] = pwMap[e.password] || []).push(e); });
  const reused = Object.values(pwMap).filter(a => a.length > 1).length;
  $('stat-reused').textContent = reused;
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* Search */
on($('search-input'), 'input', e => {
  searchQuery = e.target.value.toLowerCase().trim();
  renderVault();
});

/* Filter chips */
document.getElementById('filter-chips').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  activeFilter = chip.dataset.cat;
  renderVault();
});


/* ═══════════════════════════════════════════════════════════
   ENTRY MODAL
═══════════════════════════════════════════════════════════ */
const modalOverlay = $('entry-modal-overlay');

function openAddModal() {
  $('modal-title').textContent   = 'New Entry';
  $('modal-save-btn').textContent = 'Save Entry';
  $('entry-form').reset();
  $('entry-id').value = '';
  $('modal-strength-bar').style.width = '0%';
  modalOverlay.style.display = 'flex';
}

function openEditModal(entry) {
  $('modal-title').textContent   = 'Edit Entry';
  $('modal-save-btn').textContent = 'Update Entry';
  $('entry-id').value       = entry.id;
  $('entry-name').value     = entry.name;
  $('entry-category').value = entry.category;
  $('entry-username').value = entry.username || '';
  $('entry-password').value = entry.password;
  $('entry-url').value      = entry.url || '';
  $('entry-notes').value    = entry.notes || '';
  applyStrength($('modal-strength-bar'), null, entry.password);
  modalOverlay.style.display = 'flex';
}

function closeModal() { modalOverlay.style.display = 'none'; }

on($('add-entry-btn'),    'click', openAddModal);
on($('modal-close-btn'), 'click', closeModal);
on($('modal-cancel-btn'),'click', closeModal);
on(modalOverlay, 'click', e => { if (e.target === modalOverlay) closeModal(); });

// Password strength in modal
on($('entry-password'), 'input', () => {
  applyStrength($('modal-strength-bar'), null, $('entry-password').value);
});

// Quick-generate in modal
on($('modal-gen-btn'), 'click', () => {
  const pw = generatePassword({ length: 20, upper: true, lower: true, nums: true, syms: true });
  $('entry-password').value = pw;
  $('entry-password').type = 'text';
  applyStrength($('modal-strength-bar'), null, pw);
});

// Save entry
on($('entry-form'), 'submit', async e => {
  e.preventDefault();
  const name = $('entry-name').value.trim();
  const pw   = $('entry-password').value.trim();
  if (!name) { toast('Site name is required', 'error'); return; }
  if (!pw)   { toast('Password is required', 'error'); return; }

  const entry = {
    id:       $('entry-id').value || crypto.randomUUID(),
    name,
    category: $('entry-category').value,
    username: $('entry-username').value.trim(),
    password: pw,
    url:      $('entry-url').value.trim(),
    notes:    $('entry-notes').value.trim(),
    created:  $('entry-id').value ? undefined : Date.now(),
    updated:  Date.now(),
  };

  const existingIdx = entries.findIndex(e => e.id === entry.id);
  if (existingIdx !== -1) {
    entries[existingIdx] = entry;
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

/* Delete */
async function deleteEntry(id) {
  entries = entries.filter(e => e.id !== id);
  await Store.save(entries);
  updateStats();
  renderVault();
  toast('Entry deleted', 'info');
}


/* ═══════════════════════════════════════════════════════════
   GENERATOR VIEW
═══════════════════════════════════════════════════════════ */
const genOutput       = $('gen-output');
const genLengthSlider = $('gen-length');
const genLenVal       = $('len-val');
const genStrengthBar  = $('gen-strength-bar');
const genStrLabel     = $('gen-strength-label');

on(genLengthSlider, 'input', () => { genLenVal.textContent = genLengthSlider.value; });

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
  applyStrength(genStrengthBar, genStrLabel, pw);
}

on($('gen-btn'), 'click', runGenerator);
on($('gen-copy-btn'), 'click', () => {
  const pw = genOutput.textContent;
  if (pw && pw !== 'Click Generate') copyText(pw, 'Password');
});


/* ═══════════════════════════════════════════════════════════
   ENCRYPT VIEW
═══════════════════════════════════════════════════════════ */
on($('enc-btn'), 'click', async () => {
  const plain = $('enc-plain').value.trim();
  const key   = $('enc-key').value.trim();
  if (!plain) { toast('Enter text to encrypt', 'error'); return; }
  if (!key)   { toast('Enter an encryption key', 'error'); return; }
  try {
    const cipher = await Crypto.encrypt(plain, key);
    $('enc-result').textContent = cipher;
    $('enc-result-wrap').style.display = 'flex';
    toast('Encrypted successfully', 'success');
  } catch { toast('Encryption failed', 'error'); }
});

on($('enc-copy-btn'), 'click', () => copyText($('enc-result').textContent, 'Ciphertext'));

on($('dec-btn'), 'click', async () => {
  const cipher = $('dec-cipher').value.trim();
  const key    = $('dec-key').value.trim();
  if (!cipher) { toast('Enter ciphertext to decrypt', 'error'); return; }
  if (!key)    { toast('Enter the decryption key', 'error'); return; }
  try {
    const plain = await Crypto.decrypt(cipher, key);
    $('dec-result').textContent = plain;
    $('dec-result-wrap').style.display = 'flex';
    toast('Decrypted successfully', 'success');
  } catch { toast('Decryption failed — wrong key?', 'error'); }
});

on($('dec-copy-btn'), 'click', () => copyText($('dec-result').textContent, 'Text'));


/* ═══════════════════════════════════════════════════════════
   AUDIT VIEW
═══════════════════════════════════════════════════════════ */
on($('run-audit-btn'), 'click', runAudit);

function runAudit() {
  if (entries.length === 0) { toast('Add some entries first', 'info'); return; }

  const issues = [];
  let deductions = 0;

  const weakList = entries.filter(e => scorePassword(e.password).score < 50);
  if (weakList.length > 0) {
    deductions += Math.min(50, weakList.length * 10);
    issues.push({ type:'danger', icon:'⚠️',
      title: `${weakList.length} Weak Password${weakList.length > 1 ? 's' : ''}`,
      desc:  `Entries: ${weakList.map(e=>e.name).join(', ')} — easily guessable.` });
  }

  const pwMap = {};
  entries.forEach(e => { (pwMap[e.password] = pwMap[e.password] || []).push(e.name); });
  const reused = Object.values(pwMap).filter(a => a.length > 1);
  if (reused.length > 0) {
    deductions += Math.min(30, reused.length * 10);
    issues.push({ type:'warn', icon:'🔁',
      title: `${reused.length} Reused Password${reused.length > 1 ? 's' : ''}`,
      desc:  `Groups: ${reused.map(g=>g.join(' & ')).join('; ')} — use unique passwords.` });
  }

  const shortList = entries.filter(e => e.password.length < 12 && scorePassword(e.password).score >= 50);
  if (shortList.length > 0) {
    deductions += Math.min(20, shortList.length * 5);
    issues.push({ type:'warn', icon:'📏',
      title: `${shortList.length} Short Password${shortList.length > 1 ? 's' : ''}`,
      desc:  `${shortList.map(e=>e.name).join(', ')} — aim for 16+ characters.` });
  }

  const noUrl = entries.filter(e => !e.url);
  if (noUrl.length > 0) {
    issues.push({ type:'info', icon:'🔗',
      title: `${noUrl.length} Entry Without URL`,
      desc:  `E.g.: ${noUrl.slice(0,3).map(e=>e.name).join(', ')} — URLs help identify entries quickly.` });
  }

  const score = Math.max(0, 100 - deductions);

  // Animate ring
  const ringFill = $('audit-ring-fill');
  const offset = 314 - (score / 100) * 314;
  ringFill.style.stroke = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';
  ringFill.style.strokeDashoffset = offset;
  $('audit-score-num').textContent = score;

  let grade, desc;
  if (score >= 80)      { grade = '🛡️ Excellent'; desc = 'Your vault is well secured!'; }
  else if (score >= 60) { grade = '✅ Good'; desc = 'A few improvements recommended.'; }
  else if (score >= 40) { grade = '⚠️ Fair'; desc = 'Several issues need attention.'; }
  else                  { grade = '🚨 Critical'; desc = 'Serious security problems found.'; }

  $('audit-score-grade').textContent = grade;
  $('audit-score-desc').textContent  = desc;

  const list = $('audit-issues-list');
  list.innerHTML = '';
  if (issues.length === 0) {
    list.innerHTML = '<div style="color:var(--green);font-weight:700;">✅ No issues found — great work!</div>';
  } else {
    issues.forEach(issue => {
      const el = document.createElement('div');
      el.className = `audit-issue ${issue.type}`;
      el.innerHTML = `
        <span class="audit-issue-icon">${issue.icon}</span>
        <div class="audit-issue-body">
          <div class="audit-issue-title">${issue.title}</div>
          <div class="audit-issue-desc">${issue.desc}</div>
        </div>`;
      list.appendChild(el);
    });
  }
  toast('Audit complete', 'success');
}

/* Audit SVG gradient */
const svgNS  = 'http://www.w3.org/2000/svg';
const ringSvg = document.querySelector('.ring-svg');
if (ringSvg) {
  const defs = document.createElementNS(svgNS, 'defs');
  const grad = document.createElementNS(svgNS, 'linearGradient');
  grad.setAttribute('id', 'ringGrad');
  grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
  grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '100%');
  const s1 = document.createElementNS(svgNS, 'stop');
  s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', '#d4a535');
  const s2 = document.createElementNS(svgNS, 'stop');
  s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', '#2dd4bf');
  grad.appendChild(s1); grad.appendChild(s2);
  defs.appendChild(grad);
  ringSvg.insertBefore(defs, ringSvg.firstChild);
}


/* ═══════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
═══════════════════════════════════════════════════════════ */
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


/* ═══════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════ */
initLockScreen();