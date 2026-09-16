/**
 * EventBus — Pub/Sub for decoupled module communication.
 * ARCcC: infrastructure/event-bus/index.js
 *
 * Contract: modules never import each other directly.
 * All cross-module communication passes through this bus.
 */

const EventBus = (() => {
  /** @type {Map<string, Set<Function>>} */
  const _listeners = new Map();

  /**
   * Subscribe to an event.
   * @param {string}   eventName
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  function on(eventName, callback) {
    if (!_listeners.has(eventName)) {
      _listeners.set(eventName, new Set());
    }
    _listeners.get(eventName).add(callback);

    // Return unsubscribe function
    return () => off(eventName, callback);
  }

  /**
   * Unsubscribe from an event.
   * @param {string}   eventName
   * @param {Function} callback
   */
  function off(eventName, callback) {
    _listeners.get(eventName)?.delete(callback);
  }

  /**
   * Emit an event with optional payload.
   * @param {string} eventName
   * @param {*}      [payload]
   */
  function emit(eventName, payload) {
    _listeners.get(eventName)?.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[EventBus] Error in listener for "${eventName}":`, err);
      }
    });
  }

  /**
   * Subscribe to an event once — auto-unsubscribes after first call.
   * @param {string}   eventName
   * @param {Function} callback
   */
  function once(eventName, callback) {
    const unsub = on(eventName, (payload) => {
      callback(payload);
      unsub();
    });
  }

  return Object.freeze({ on, off, emit, once });
})();

// ── Event name constants (the "dot.case" contract) ──────────
const EVENTS = Object.freeze({
  // Config
  CONFIG_LOADED:   'config.loaded',
  CONFIG_UPDATED:  'config.updated',
  // Gallery
  GALLERY_FILTER:  'gallery.filter',
  ARTWORK_OPEN:    'artwork.open',
  ARTWORK_CLOSE:   'artwork.close',
  ARTWORK_NEXT:    'artwork.next',
  ARTWORK_PREV:    'artwork.prev',
  // Panel
  PANEL_OPEN:      'panel.open',
  PANEL_CLOSE:     'panel.close',
  // Nav
  NAV_SECTION:     'nav.section',
});
