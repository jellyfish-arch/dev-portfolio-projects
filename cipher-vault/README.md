# 🔐 CipherVault

A **browser-based password manager and encryption toolkit** built with vanilla HTML, CSS, and JavaScript — powered by the **Web Crypto API (AES-256-GCM + PBKDF2)**.

Zero servers. Zero tracking. Everything stays on your device.

---

## ✨ Features

### 🔑 Encrypted Password Vault
- All entries encrypted with **AES-256-GCM** using your master password
- Master password verified via a **PBKDF2-derived key** (310,000 iterations, SHA-256) — never stored in plaintext
- Add, edit, delete, search, and filter vault entries
- Reveal/hide individual passwords, copy to clipboard instantly
- Category tags: Social, Work, Finance, Dev, Other

### 🛡️ Password Generator
- Cryptographically secure generation via `crypto.getRandomValues()`
- Configurable length (8–64 chars), character sets, and ambiguous char exclusion
- Real-time strength meter  

### 🔒 Text Encryption Toolkit
- Encrypt any plaintext string to a **Base64-encoded ciphertext**
- Decrypt it back with the same key
- Uses real AES-256-GCM — not fake encoding

### 📊 Security Audit
- Scans vault for weak passwords, reused passwords, and short passwords
- Produces a security score (0–100) with an animated ring chart
- Actionable issue cards highlighting exactly what to fix

### 🎨 Premium UI
- Dark glassmorphism design with animated gradients
- Entry cards with category-colored avatars and strength indicators
- Toast notification system, smooth view transitions
- Fully responsive (mobile-friendly sidebar)

---

## ⚙️ How It Works

```
User enters master password
        ↓
PBKDF2 (310,000 iterations, SHA-256) derives AES-256 key
        ↓
Vault data encrypted as: [salt(16B) | IV(12B) | AES-GCM ciphertext]
        ↓
Stored as Base64 in localStorage
        ↓
On unlock: same process reversed — wrong key = crypto failure
```

---

## 🔤 Cryptography Glossary

| Term | Meaning |
|------|---------|
| **AES-256-GCM** | Symmetric encryption with 256-bit key and authenticated encryption |
| **PBKDF2** | Password-Based Key Derivation Function — converts a password into a cryptographic key |
| **IV / Nonce** | Random value ensuring each encryption is unique |
| **Salt** | Random bytes mixed into key derivation to defeat precomputation attacks |
| **Web Crypto API** | Native browser cryptography — no libraries needed |
| **localStorage** | Browser storage used as the encrypted data layer |

---

## 🚀 Quick Start

Just open `index.html` in any modern browser — no installation, no server, no dependencies.

```bash
# Optional: serve locally
npx serve .
# then open http://localhost:3000
```

> Works in Chrome, Firefox, Edge, Safari (any browser with Web Crypto API support)

---

## 📁 Project Structure

```
cipher-vault/
├── index.html   # Full app structure + lock screen + modal
├── style.css    # Premium dark theme, glassmorphism, responsive
├── script.js    # Crypto engine, vault store, UI logic
└── README.md
```

---

## 🧠 Technical Highlights

- **Real cryptography** — not Base64 or XOR, actual AES-256-GCM via the browser's native `crypto.subtle` API
- **Zero dependencies** — pure vanilla HTML/CSS/JS, no frameworks or libraries
- **Secure key derivation** — 310,000 PBKDF2 iterations (OWASP recommendation for SHA-256)
- **Authenticated encryption** — GCM mode detects tampering (wrong key = decryption fails gracefully)
- **Random UUID** — each entry uses `crypto.randomUUID()` for unique, collision-free IDs
- **Keyboard shortcuts** — `Ctrl+K` search, `Ctrl+N` add entry, `Esc` close modal

---

## 🎯 Purpose

Built to demonstrate applied knowledge of:
- Browser-native **Web Crypto API**
- Real-world **security engineering** concepts
- **Local-first architecture** (offline, private by design)
- Premium **UI/UX engineering** with vanilla CSS

---

## 👨‍💻 Author

Jelly Fish — [GitHub](https://github.com/jellyfish-arch)

---

> *"Security should be invisible by default, powerful under the hood."*
