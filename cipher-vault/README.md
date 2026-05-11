# CipherVault

CipherVault is a browser-based password manager and encryption toolkit built using vanilla HTML, CSS, and JavaScript.  
It uses the Web Crypto API for secure, local encryption — your data never leaves your device.

---

## Features

### Encrypted Vault
- Store passwords, usernames, URLs, and notes
- Encrypt all data using AES-256-GCM
- Unlock vault using a master password
- Search, filter, and manage entries
- Show/hide passwords and copy to clipboard
- Categorize entries (Social, Work, Finance, Dev, Other)

---

### Password Generator
- Generate secure passwords using cryptographic randomness,
- Adjustable length and character types,
- Option to exclude ambiguous characters,
- Built-in strength indicator.

---

### Text Encryption Tool
- Encrypt and decrypt custom text
- Uses the same AES-256-GCM encryption model
- Fully local processing

---

### Security Audit
- Detect weak passwords
- Detect reused passwords
- Show vault health overview
- Highlight issues clearly

---

### Recovery System
- Optional security questions
- Recover master password if forgotten
- Fully local — no account or server required

---

### UI & Experience
- Dark and light themes
- Lock screen + app interface separation
- Sidebar navigation
- Responsive layout

---

## How It Works

Master Password  
↓  
PBKDF2 Key Derivation  
↓  
AES-256-GCM Encryption  
↓  
Encrypted Vault stored in browser  

---

## Tech Stack

- HTML5  
- CSS3  
- Vanilla JavaScript  
- Web Crypto API  

---

## Project Structure

ciphervault/  
├── index.html  
├── style.css  
├── script.js  
└── README.md  

---

## Running the Project

Open `index.html` in a modern browser.

Optional local server:

npx serve .

---

## Browser Support

Works in modern browsers that support the Web Crypto API:
- Chrome  
- Edge  
- Firefox  
- Safari  

---

## Security Notes

- All encryption is done locally in the browser  
- No backend or external API is used  
- Data is stored in encrypted form  
- If the master password is lost and recovery is not set, the vault cannot be accessed  

---

## Limitations

- Uses localStorage for storage  
- Recovery system depends on security questions  
- No export/import functionality  
- No auto-lock timeout  

---

## Future Improvements

- Switch to IndexedDB  
- Add secure recovery key system  
- Add vault backup/export  
- Implement auto-lock timer  
- Improve UI with cards and dashboard  
- Modularize code structure  

---

## Purpose

CipherVault is a learning-focused project demonstrating:
- Browser-based cryptography  
- Local-first architecture  
- Secure UI/UX design  

---

## Author

Built as a learning and experimental project.

---

Secure. Local. Simple.

---

*🚀 Maintained by Jelly Fish | Last Updated: May 2026*
