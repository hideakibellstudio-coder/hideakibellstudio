/**
 * IntersectionObserver — Scroll-based reveal animations.
 * ARCcC: infrastructure/intersection-observer/index.js
 *
 * Observes elements with .reveal / .reveal-* classes and
 * adds .is-visible when they enter the viewport.
 */

const ScrollReveal = (() => {
  let _observer = null;

  /**
   * Initialize the observer. Call once on app boot.
   * Automatically observes all .reveal elements in the DOM.
   */
  function init() {
    _observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            // Unobserve after revealing (one-shot animation)
            _observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold:  0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observeAll();
  }

  /**
   * Observe all .reveal* elements currently in the DOM.
   * Call again after dynamically adding content (e.g. gallery items).
   */
  function observeAll() {
    if (!_observer) return;
    const targets = document.querySelectorAll(
      '.reveal, .reveal-fade, .reveal-scale, .reveal-left, .reveal-right'
    );
    targets.forEach((el) => _observer.observe(el));
  }

  /**
   * Observe a single element.
   * @param {Element} el
   */
  function observe(el) {
    _observer?.observe(el);
  }

  return Object.freeze({ init, observeAll, observe });
})();
