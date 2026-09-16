# Hideaki Bell — Digital Artist Portfolio

> A minimal-elegant portfolio for an independent digital artist, built with pure HTML/CSS/JS and structured following the ARCcC (Atomic Recursive Componentization by Contract) methodology.

---

## 🚀 Getting Started

### GitHub Pages Deployment

1. Push this folder to a GitHub repository
2. Go to **Settings → Pages → Source → Deploy from branch → `main` / `root`**
3. Your site will be live at `https://hideakibellstudio-coder.github.io/hideakibellstudio/`

### Local Preview

Open `index.html` directly in your browser, **or** use VS Code Live Server:
```
Right-click index.html → Open with Live Server
```

> **Note:** The particle canvas and all features work with both methods. ES modules are NOT used, so no server is strictly required.

---

## ⚙️ Customizing the Site

### Settings Panel (Ctrl+Shift+P)

Press **`Ctrl + Shift + P`** anywhere on the site to open the settings panel, or click the ⚙ button in the bottom-right corner.

You can configure:
- **Identity tab** — Name, tagline, bio, avatar, specialties, stats, accent color, contact info
- **Gallery tab** — Edit each artwork's title, category, image URL, and description
- **Social tab** — Instagram, Behance, ArtStation, Twitter/X, YouTube links
- **SEO tab** — Page title and meta description

### Persisting Changes to GitHub Pages

Settings saved in the panel are stored in **`localStorage`** (browser only).

To make changes permanent on the published site:
1. Apply your changes in the settings panel
2. Click **"Export config.js"** — this downloads a `config.js` file
3. Place the downloaded `config.js` in the root of this repository
4. Add this line to `index.html` (before the closing `</body>` tag, FIRST in the script list):
   ```html
   <script src="config.js"></script>
   ```
5. Commit and push → changes are live on GitHub Pages

### Replacing Artwork Images

1. Add your images to `assets/images/`
2. Update the image URLs in the Settings Panel (Gallery tab)
3. Export `config.js` and commit

---

## 🏗 Architecture (ARCcC)

```
hideaki-bell-portfolio/
├── index.html                    ← Entry point
├── manifest.json
├── boundary/                     ← Entry + Orchestration layer
│   ├── index.js                  ← App bootstrap (registers + boots all modules)
│   └── orchestrator/
│       ├── index.js              ← Module coordinator
│       └── contracts/SiteContract.js
├── core/                         ← Business modules (isolated jurisdictions)
│   ├── hero/                     ← Hero section
│   ├── gallery/                  ← Gallery + lightbox + filter
│   ├── about/                    ← About section
│   ├── contact/                  ← Contact form + social links
│   └── settings-panel/           ← Settings UI + persistence + exporter
├── infrastructure/               ← Shared infrastructure
│   ├── event-bus/                ← Pub/Sub (no direct module imports)
│   ├── config/                   ← Default configuration
│   └── intersection-observer/    ← Scroll reveal
├── utils/                        ← Pure utility functions
│   ├── dom/
│   └── formatters/
└── assets/
    ├── styles/                   ← CSS (tokens → utils → components)
    └── images/                   ← Artwork and avatar images
```

**Key ARCcC principles applied:**
- Modules never import each other directly — all communication via `EventBus`
- Each module has a single `index.js` public API
- Contracts define data shapes (`ArtworkTypes.js`, `ConfigTypes.js`)
- All code in English, `kebab-case` directories

---

## 🔧 Formspree Setup (Contact Form)

1. Create a free account at [formspree.io](https://formspree.io)
2. Create a new form and copy your endpoint URL (`https://formspree.io/f/YOUR_ID`)
3. Open the Settings Panel → Identity tab → paste the URL in "Formspree endpoint"
4. Export `config.js` and commit

---

## 📄 License

All Rights Reserved — Hideaki Bell, 2026
