/**
 * Studio Module — Public API for the Software Area (agnostic).
 * ARCcC: core/studio/index.js
 *
 * Content comes from ContentLoader('studio') — i.e. content/studio.json.
 * The module owns no product knowledge: it renders whatever the contract
 * (StudioTypes) describes. Re-renders on language change.
 */

const StudioModule = (() => {

  let _content = null;

  /**
   * @param {SiteConfig} _config — conforms to SiteContract (unused)
   */
  function init(_config) {
    _content = ContentLoader.get('studio');
    _render();

    EventBus.on('language.changed', _render);
    EventBus.on('content.updated', (payload) => {
      if (payload && payload.key === 'studio') {
        _content = payload.value;
        _render();
      }
    });
  }

  /** Re-render with the latest content. */
  function update() {
    _content = ContentLoader.get('studio');
    _render();
  }

  function _render() {
    if (!document.getElementById('studio-root')) return;
    StudioRenderer.render(_content);
    // Devlog carousel: one entry per view, "view all" restores the plain list
    if (typeof DevlogCarousel !== 'undefined') DevlogCarousel.init();
    // Fullscreen media viewer for feed captures/videos (idempotent)
    if (typeof MediaViewer !== 'undefined') MediaViewer.init();
    // Dedicated support/payment area (hidden when nothing is configured)
    if (typeof SupportSection !== 'undefined') SupportSection.render(_content.support);
  }

  return Object.freeze({ init, update });
})();
