/**
 * Orchestrator — Coordinates initialization and updates of all site modules.
 * ARCcC: boundary/orchestrator/index.js
 *
 * Responsible for:
 * 1. Loading configuration
 * 2. Initializing all core modules in dependency order
 * 3. Wiring config updates from SettingsPanel → all other modules
 * 4. Managing navigation scroll behavior
 */

const Orchestrator = (() => {

  /** Registered modules conforming to SiteContract */
  const _modules = [];

  /** Active site configuration (config defaults + published content + local overrides) */
  let _config = null;

  /**
   * Register a module to be managed by the orchestrator.
   * @param {SiteModule} mod
   * @param {string}     [name] — for debug logging
   */
  function register(mod, name = 'unknown') {
    if (!conformsToSiteContract(mod)) {
      console.error(`[Orchestrator] Module "${name}" does not conform to SiteContract.`);
      return;
    }
    _modules.push({ mod, name });
  }

  /**
   * Boot the site: load config/content, init all modules, wire events.
   * Async because published content lives in /content/*.json (fetched).
   * @returns {Promise<SiteConfig>}
   */
  async function boot() {
    // Init infrastructure
    I18n.init();
    ScrollReveal.init();

    // Load the published content (content/*.json) and merge it into the config
    let content = null;
    try {
      if (typeof ContentLoader !== 'undefined') {
        content = await ContentLoader.loadAll();
      }
    } catch (err) {
      console.warn('[Orchestrator] Content load failed, using built-in defaults:', err);
    }

    const config = applyContentOverrides(loadConfig(), content);
    _config = config;

    // Apply the configured accent color to the whole site
    _applyAccentColor(config.site?.accentColor);

    // Init all registered core modules
    _modules.forEach(({ mod, name }) => {
      try {
        mod.init(config);
      } catch (err) {
        console.error(`[Orchestrator] Error initializing module "${name}":`, err);
      }
    });

    // Wire navigation
    _initNavigation();
    _initCustomCursor();

    // Set initial translations and listen for changes
    _translateGlobalUI();
    EventBus.on('language.changed', _translateGlobalUI);

    // Content edited in another tab/page → re-render
    EventBus.on('content.updated', () => {
      const next = applyContentOverrides(loadConfig(), ContentLoader.getAll());
      _config = next;
      _applyAccentColor(next.site?.accentColor);
      _modules.forEach(({ mod, name }) => {
        if (typeof mod.update !== 'function') return;
        try {
          mod.update(next);
        } catch (err) {
          console.error(`[Orchestrator] Error updating module "${name}":`, err);
        }
      });
      _translateGlobalUI();
    });

    // Creator Studio entry point: hidden by default — secret shortcut reveals it
    _initAdminSecretAccess();

    EventBus.emit(EVENTS.CONFIG_LOADED, config);

    return config;
  }

  /**
   * Creator Studio entry point — hidden by default.
   * Secret shortcut: Ctrl + Shift + Q toggles the ⚙ link visibility.
   * (Never a security boundary — see core/admin-gate for the real gate.)
   */
  function _initAdminSecretAccess() {
    const adminLink = document.getElementById('admin-link-btn');
    if (!adminLink) return;

    // Always hidden until the secret shortcut is pressed
    adminLink.style.display = 'none';
    adminLink.setAttribute('aria-hidden', 'true');

    document.addEventListener('keydown', (e) => {
      // Ctrl + Shift + Q (e.code é independente de layout/maiúsculas)
      if (e.ctrlKey && e.shiftKey && !e.altKey && e.code === 'KeyQ') {
        e.preventDefault();
        const willShow = adminLink.style.display === 'none';
        adminLink.style.display = willShow ? 'flex' : 'none';
        adminLink.setAttribute('aria-hidden', String(!willShow));
      }
    });
  }

  /**
   * Apply the configured accent color as CSS variables.
   * @param {string} hex
   */
  function _applyAccentColor(hex) {
    if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    const vars = Formatters.accentColorVars(hex);
    Object.entries(vars).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
    });
    document.documentElement.style.setProperty('--color-accent-soft', `${hex}14`);
  }


  function _translateGlobalUI() {
    // Nav links (ids are reused across every page of the site)
    const navKeys = {
      'nav-link-home':    'nav_home',
      'nav-link-art':     'nav_art',
      'nav-link-studio':  'nav_studio',
      'nav-link-gallery': 'nav_gallery',
      'nav-link-about':   'nav_about',
      'nav-link-contact': 'nav_contact',
    };
    Object.keys(navKeys).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = I18n.t(navKeys[id]);
    });

    // Any element carrying data-i18n="key" (optional data-i18n-attr="placeholder")
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const text = I18n.t(el.getAttribute('data-i18n'));
      const attr = el.getAttribute('data-i18n-attr');
      if (attr) el.setAttribute(attr, text);
      else el.textContent = text;
    });

    // Footer (artist name comes from the published content — escape it)
    const footerText = document.querySelector('.site-footer__text');
    if (footerText) {
      const year = new Date().getFullYear();
      const name = (_config && _config.artist && _config.artist.name) || 'Hideaki Bell';
      const escName = String(name)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      footerText.innerHTML = `© <span id="footer-year">${year}</span> ${escName} · ${I18n.t('footer_rights')} · Built with ❤ using <a href="#" aria-label="ARCcC methodology">ARCcC</a>`;
    }
  }


  // ── Navigation ────────────────────────────────────────────

  function _initNavigation() {
    const nav       = document.querySelector('.site-nav');
    const navLinks  = document.querySelectorAll('.nav__link');
    const burger    = document.querySelector('.nav__burger');
    const navMenu   = document.querySelector('.nav__links');
    const sections  = document.querySelectorAll('section[id]');

    // Scroll → sticky nav
    window.addEventListener('scroll', DOMUtils.throttle(() => {
      nav?.classList.toggle('is-scrolled', window.scrollY > 60);
    }, 100));

    // Active link on scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((link) => {
              link.classList.toggle(
                'is-active',
                link.getAttribute('href') === `#${entry.target.id}`
              );
            });
          }
        });
      },
      { threshold: 0.35 }
    );

    sections.forEach((s) => observer.observe(s));

    // Mobile burger menu
    burger?.addEventListener('click', () => {
      navMenu?.classList.toggle('is-open');
    });

    // Close mobile menu on link click
    navLinks.forEach((link) => {
      link.addEventListener('click', () => navMenu?.classList.remove('is-open'));
    });
  }

  // ── Custom cursor ─────────────────────────────────────────

  function _initCustomCursor() {
    const dot  = document.querySelector('.cursor-dot');
    const ring = document.querySelector('.cursor-ring');
    if (!dot || !ring) return;

    let ringX = 0, ringY = 0;
    let curX  = 0, curY  = 0;

    document.addEventListener('mousemove', (e) => {
      curX = e.clientX;
      curY = e.clientY;
      dot.style.transform  = `translate(${curX}px, ${curY}px) translate(-50%, -50%)`;
    });

    // Smooth ring follow
    function animateRing() {
      ringX += (curX - ringX) * 0.12;
      ringY += (curY - ringY) * 0.12;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(animateRing);
    }
    animateRing();

    // Hover effect on interactive elements
    const interactiveSelector = 'a, button, .artwork-card, .filter-btn, input, textarea, select, .social-link';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(interactiveSelector)) {
        ring.classList.add('is-hovering');
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(interactiveSelector)) {
        ring.classList.remove('is-hovering');
      }
    });
  }

  return Object.freeze({ register, boot });
})();
