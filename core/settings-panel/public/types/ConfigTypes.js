/**
 * ConfigTypes — Contract defining the shape of the site config object.
 * ARCcC: core/settings-panel/public/types/ConfigTypes.js
 *
 * @typedef {Object} SiteConfig
 * @property {object} site
 * @property {string} site.title
 * @property {string} site.description
 * @property {string} site.accentColor   — CSS hex color string
 * @property {object} artist
 * @property {string} artist.name
 * @property {string} artist.tagline
 * @property {string[]} artist.bio       — Array of paragraphs
 * @property {string} artist.avatarUrl
 * @property {string[]} artist.specialties
 * @property {object} artist.stats
 * @property {string} artist.stats.years
 * @property {string} artist.stats.projects
 * @property {string} artist.stats.clients
 * @property {object} social
 * @property {string} social.instagram
 * @property {string} social.behance
 * @property {string} social.artstation
 * @property {string} social.twitter
 * @property {string} social.youtube
 * @property {object} contact
 * @property {string} contact.email
 * @property {string} contact.formspreeEndpoint
 * @property {Artwork[]} artworks         — Array conforming to ArtworkTypes
 */

/**
 * Validate a config object has the required top-level keys.
 * @param {*} obj
 * @returns {boolean}
 */
function isValidConfig(obj) {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof obj.site    === 'object' &&
    typeof obj.artist  === 'object' &&
    typeof obj.social  === 'object' &&
    typeof obj.contact === 'object' &&
    Array.isArray(obj.artworks)
  );
}
