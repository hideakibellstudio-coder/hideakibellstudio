/**
 * Boundary Entry Point — Registers the modules present on the current page
 * and boots the site.
 * ARCcC: boundary/index.js
 *
 * This is the ONLY file that knows about all core modules. Each page declares
 * which area it is through <body data-page="hub|art|studio">, and modules are
 * registered only when their mount points exist in the DOM — so the same
 * shared script chain works for every page without runtime errors.
 */

document.addEventListener('DOMContentLoaded', () => {
  const has = (selector) => !!document.querySelector(selector);

  // Hero section (home / hub page)
  if (has('#hero-canvas') || has('#hero-name')) {
    Orchestrator.register(HeroModule, 'hero');
  }

  // Art area (gallery + lightbox + NSFW gate + filters)
  if (has('#gallery-grid')) {
    Orchestrator.register(GalleryModule, 'gallery');
  }

  // About section
  if (has('#about-bio')) {
    Orchestrator.register(AboutModule, 'about');
  }

  // Contact section
  if (has('#contact-socials') || has('#contact')) {
    Orchestrator.register(ContactModule, 'contact');
  }

  // Software area (agnostic, content-driven)
  if (has('#studio-root')) {
    Orchestrator.register(StudioModule, 'studio');
  }

  // Universal UI
  if (has('#theme-toggle-btn'))  Orchestrator.register(ThemeToggleModule, 'theme-toggle');
  if (has('#lang-switch-btn'))   Orchestrator.register(LanguageModule, 'language');

  // Boot the application
  Orchestrator.boot();
});

