/**
 * SiteContract — Defines the interface each core module must implement.
 * ARCcC: boundary/orchestrator/contracts/SiteContract.js
 *
 * Every module registered with the Orchestrator must implement:
 *   - init(config: SiteConfig): void
 *   - update(config: SiteConfig): void   [optional but recommended]
 *
 * @typedef {Object} SiteModule
 * @property {function(SiteConfig): void}  init    — called once on boot
 * @property {function(SiteConfig): void}  [update] — called on config change
 */

/**
 * Validate that a module conforms to the SiteModule contract.
 * @param {*} mod
 * @returns {boolean}
 */
function conformsToSiteContract(mod) {
  return (
    mod !== null &&
    typeof mod === 'object' &&
    typeof mod.init === 'function'
  );
}
