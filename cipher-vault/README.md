# 🔐 CipherVault

A **browser-based password manager and encryption toolkit** built with vanilla HTML, CSS, and JavaScript — powered by the **Web Crypto API (AES-256-GCM + PBKDF2)**.

Zero servers. Zero tracking. Everything stays on your device.

---

## ✨ What's New

### 🔑 Forgot Password Recovery (via Security Questions)
- Set **2 security questions** when creating your vault
- Answers are used to encrypt your master password with AES-256-GCM (PBKDF2-derived key)
- On the lock screen, click **"Forgot master password?"** to recover
- Your vault data is **never lost** — the recovered master password decrypts everything
- Answers are **case-insensitive** and trimmed

### 🎨 Redesigned UI
- **Vault Gold** aesthetic — warm amber accents instead of purple glassmorphism
- **Syne** display font — geometric, distinctive, editorial
- Flat card surfaces with bold left-border category indicators
- Refined toggles, animated range slider, clean entry rows
- Subtle grid-texture background, ambient glow lighting

---

## 🔐 Recovery Flow

```
First Time Setup:
  1. Enter + confirm master password → Create Vault
  2. Choose 2 security questions + enter answers → Save

Forgot Password:
  1. Lock screen → "Forgot master password?"
  2. Answer your 2 security questions
  3. Master password is decrypted and shown
  4. Auto-filled back to login → Unlock Vault
```

```
Security of recovery:
  PBKDF2(answer1 || answer2) → AES-256 key
  AES-GCM encrypt(master_password) → stored in localStorage
  Wrong answers = decryption failure (AES-GCM auth tag mismatch)
```

---

## ✨ Features

### 🔑 Encrypted Password Vault
- AES-256-GCM with PBKDF2-derived key (310,000 iterations, SHA-256)
- Add, edit, delete, search, filter entries
- Category tags: Social, Work, Finance, Dev, Other
- Password reveal/hide and one-click copy

### 🛡️ Password Generator
- Cryptographically secure via `crypto.getRandomValues()`
- Configurable length (8–64), char sets, ambiguous char exclusion
- Real-time strength meter

### 🔒 Text Encryption Toolkit
- Encrypt any text to Base64-encoded AES-256-GCM ciphertext
- Decrypt back with the same key

### 📊 Security Audit
- Detects weak, reused, short passwords
- Animated score ring, actionable issue cards

---

## 🚀 Quick Start

Open `index.html` in any modern browser — no install, no server, no dependencies.

```bash
# Optional: serve locally
npx serve .
# then open http://localhost:3000
```

---

## 📁 Project Structure

```
ciphervault/
├── index.html   # Multi-step lock screen + app layout
├── style.css    # Vault Gold theme, Syne font
├── script.js    # Crypto engine + security questions recovery
└── README.md
```