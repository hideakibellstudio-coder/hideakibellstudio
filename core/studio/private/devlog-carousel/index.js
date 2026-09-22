/**
 * DevlogCarousel — Shows the Software Area devlog one entry at a time.
 * ARCcC: core/studio/private/devlog-carousel/index.js
 *
 * Why: the devlog grew to dozens of long entries, which made the page endless
 * to read. The carousel shows one entry per view, while every entry stays in
 * the DOM (search engines and screen readers still reach the whole history)
 * and the "view all" toggle restores the plain vertical list.
 *
 * How: the track is a native horizontal scroll container with CSS scroll-snap,
 * so touch swiping, momentum and overflow are handled by the browser. This
 * module only drives prev/next, dots, counter, keyboard navigation, the
 * "#post-N" deep link and the two view modes.
 *
 * Everything is delegated on `document`, so re-renders (language change or
 * content.updated) never need rebinding, and the current entry plus the chosen
 * view mode survive the re-render.
 */

const DevlogCarousel = (() => {

  /** Active entry (0-based) — kept across re-renders. */
  let _index = 0;

  /** 'carousel' | 'all' — kept across re-renders. */
  let _mode = 'carousel';

  let _bound = false;
  let _raf = 0;

  /** Ignore scroll events produced by our own scrollTo (smooth animation). */
  let _programmaticUntil = 0;

  // ── Public API ─────────────────────────────────────────────

  /** Idempotent: call it after every render of the feed. */
  function init() {
    const root = _root();
    if (!root) return;

    if (!_bound) {
      _bindDocument();
      _bound = true;
    }

    _applyMode(_mode, { instant: true });
    _goTo(_index, { instant: true });
    _applyHash(true);
  }

  /** Go to an entry by index (clamped to the available range). */
  function goTo(index) {
    _goTo(index, { instant: false });
  }

  // ── Queries ────────────────────────────────────────────────

  function _root() {
    return document.querySelector('[data-devlog]');
  }

  function _viewport(root) {
    return root ? root.querySelector('[data-devlog-viewport]') : null;
  }

  function _slides(root) {
    return root ? Array.from(root.querySelectorAll('[data-devlog-slide]')) : [];
  }

  function _indexOf(root) {
    const viewport = _viewport(root);
    const slides = _slides(root);
    if (!viewport || !viewport.clientWidth || slides.length < 2) return 0;
    const raw = Math.round(viewport.scrollLeft / viewport.clientWidth);
    return Math.min(Math.max(raw, 0), slides.length - 1);
  }

  // ── Navigation ─────────────────────────────────────────────

  function _goTo(index, opts) {
    const root = _root();
    if (!root) return;

    const viewport = _viewport(root);
    const slides = _slides(root);
    if (!viewport || !slides.length) return;

    const numeric = Number.isFinite(index) ? index : 0;
    _index = Math.min(Math.max(numeric, 0), slides.length - 1);

    // The UI follows the intent immediately, so the counter and the highlighted
    // dot never depend on how (or whether) the smooth scroll animates.
    _sync(root);

    if (_mode !== 'carousel') return;

    const left = _index * viewport.clientWidth;
    const instant = (opts && opts.instant) || _reducedMotion();
    if (Math.abs(viewport.scrollLeft - left) <= 1) return;

    _programmaticUntil = Date.now() + 700;
    if (instant || typeof viewport.scrollTo !== 'function') viewport.scrollLeft = left;
    else viewport.scrollTo({ left, behavior: 'smooth' });
  }

  function next() { _goTo(_index + 1, { instant: false }); }
  function prev() { _goTo(_index - 1, { instant: false }); }

  // ── View mode (carousel ↔ plain list) ──────────────────────

  function _applyMode(mode, opts) {
    const root = _root();
    if (!root) return;

    _mode = mode === 'all' ? 'all' : 'carousel';
    root.setAttribute('data-devlog-mode', _mode);

    const toggle = root.querySelector('[data-devlog-viewall]');
    if (toggle) {
      const isAll = _mode === 'all';
      toggle.setAttribute('aria-pressed', isAll ? 'true' : 'false');
      toggle.textContent = isAll ? I18n.t('studio_feed_view_carousel') : I18n.t('studio_feed_view_all');
    }

    ['[data-devlog-prev]', '[data-devlog-next]', '[data-devlog-counter]'].forEach((selector) => {
      const el = root.querySelector(selector);
      if (el) el.toggleAttribute('hidden', _mode === 'all');
    });

    if (_mode === 'carousel') {
      _goTo(_index, { instant: !!(opts && opts.instant) });
      return;
    }

    _sync(root);
  }

  function _toggleMode() {
    const toAll = _mode !== 'all';
    _applyMode(toAll ? 'all' : 'carousel', { instant: true });
    if (toAll) _scrollActiveIntoPage();
  }

  /** Keep the reader on the same entry when the plain list takes over. */
  function _scrollActiveIntoPage() {
    const slide = _slides(_root())[_index];
    if (!slide || typeof window.scrollTo !== 'function') return;
    const top = Math.max(slide.getBoundingClientRect().top + window.scrollY - 96, 0);
    window.scrollTo({ top, behavior: _reducedMotion() ? 'auto' : 'smooth' });
  }

  // ── Sync (counter, dots, a11y, button state) ───────────────

  function _sync(root) {
    root = root || _root();
    if (!root) return;

    const viewport = _viewport(root);
    const slides = _slides(root);
    if (!viewport || !slides.length) return;

    const total = slides.length;

    const counter = root.querySelector('[data-devlog-counter]');
    if (counter) counter.textContent = `${_index + 1} / ${total}`;

    const current = root.querySelector('[data-devlog-current]');
    if (current) {
      const slide = slides[_index];
      const tag = slide.querySelector('.studio-post__tag');
      const date = slide.querySelector('.studio-post__date');
      current.textContent = [tag && tag.textContent, date && date.textContent].filter(Boolean).join(' · ');
    }

    // Only the visible entry is reachable by keyboard / assistive tech
    slides.forEach((slide, i) => {
      const active = _mode === 'all' || i === _index;
      slide.toggleAttribute('inert', !active);
      if (active) slide.removeAttribute('aria-hidden');
      else slide.setAttribute('aria-hidden', 'true');
    });

    const dots = Array.from(root.querySelectorAll('[data-devlog-goto]'));
    dots.forEach((dot, i) => dot.setAttribute('aria-current', i === _index ? 'true' : 'false'));
    if (_mode === 'carousel') _centerDot(root.querySelector('[data-devlog-dots]'), dots[_index]);

    // Navigation clamps at both ends (no wrap-around)
    const prevBtn = root.querySelector('[data-devlog-prev]');
    const nextBtn = root.querySelector('[data-devlog-next]');
    if (prevBtn) prevBtn.disabled = _index <= 0;
    if (nextBtn) nextBtn.disabled = _index >= total - 1;
  }

  function _centerDot(rail, dot) {
    if (!rail || !dot || rail.scrollWidth <= rail.clientWidth) return;
    const target = dot.offsetLeft - (rail.clientWidth - dot.offsetWidth) / 2;
    rail.scrollLeft = Math.max(0, Math.min(target, rail.scrollWidth - rail.clientWidth));
  }

  /** The reader scrolled the track (swipe / trackpad / keyboard scroll). */
  function _scheduleSync() {
    if (_raf) return;
    const run = () => {
      _raf = 0;
      if (_mode === 'carousel') _index = _indexOf(_root());
      _sync();
    };
    _raf = (typeof requestAnimationFrame === 'function')
      ? requestAnimationFrame(run)
      : setTimeout(run, 60);
  }

  // ── Deep link (#post-N opens that entry) ───────────────────

  function _applyHash(instant) {
    const root = _root();
    const hash = String(window.location.hash || '').replace(/^#/, '');
    if (!root || !hash) return false;

    const index = _slides(root).findIndex((slide) => slide.id === hash);
    if (index < 0) return false;

    _goTo(index, { instant });
    return true;
  }

  // ── Events (delegated on document: survives re-renders) ────

  function _bindDocument() {
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!target || typeof target.closest !== 'function') return;
      if (!target.closest('[data-devlog]')) return;

      if (target.closest('[data-devlog-prev]')) { e.preventDefault(); prev(); return; }
      if (target.closest('[data-devlog-next]')) { e.preventDefault(); next(); return; }
      if (target.closest('[data-devlog-viewall]')) { e.preventDefault(); _toggleMode(); return; }

      const dot = target.closest('[data-devlog-goto]');
      if (dot) {
        e.preventDefault();
        _goTo(parseInt(dot.getAttribute('data-devlog-goto'), 10) || 0, { instant: false });
      }
    });

    // Native horizontal scrolling (swipe, trackpad, keyboard scroll)
    document.addEventListener('scroll', (e) => {
      const target = e.target;
      if (!target || typeof target.matches !== 'function') return;
      if (!target.matches('[data-devlog-viewport]')) return;
      if (Date.now() < _programmaticUntil) return; // our own smooth scroll
      _scheduleSync();
    }, { capture: true, passive: true });

    document.addEventListener('keydown', (e) => {
      const active = document.activeElement;
      if (!active || typeof active.closest !== 'function' || !active.closest('[data-devlog]')) return;

      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'Home') { e.preventDefault(); _goTo(0, { instant: false }); }
      else if (e.key === 'End') { e.preventDefault(); _goTo(Number.MAX_SAFE_INTEGER, { instant: false }); }
    });

    window.addEventListener('hashchange', () => _applyHash(false));
    window.addEventListener('resize', () => _goTo(_index, { instant: true }));
  }

  function _reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  return Object.freeze({ init, goTo, next, prev });
})();
