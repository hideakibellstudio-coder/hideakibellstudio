/**
 * ArtworkTypes — Contract defining the shape of an artwork object.
 * ARCcC: core/gallery/public/types/ArtworkTypes.js
 *
 * This is the explicit contract between the config module
 * and the gallery rendering module. Any consumer of gallery
 * data must conform to this shape.
 *
 * Text fields (`title`, `category`, `description`) accept EITHER a plain
 * string OR a bilingual object `{ en, pt }` — the gallery, filter and
 * lightbox resolve them through `I18n.tField()`.
 *
 * @typedef {Object} Artwork
 * @property {string} id          — Unique identifier (kebab-case)
 * @property {string|object} title       — Display title (string or {en,pt})
 * @property {string|object} category    — Filter category label
 * @property {string|object} description — Long description shown in lightbox
 * @property {string} imageUrl    — Relative path or absolute URL to the image
 * @property {boolean} [nsfw]     — Mature content flag
 */

/**
 * True when a value is a valid translated text field (string or bilingual pair).
 * @param {*} value
 * @returns {boolean}
 */
function isValidTextField(value) {
  if (typeof value === 'string') return value.length > 0;
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return typeof value.en === 'string' || typeof value.pt === 'string';
  }
  return false;
}

/**
 * Validate that an object conforms to the Artwork contract.
 * @param {*} obj
 * @returns {boolean}
 */
function isValidArtwork(obj) {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof obj.id          === 'string' && obj.id.length > 0 &&
    isValidTextField(obj.title) &&
    isValidTextField(obj.category) &&
    isValidTextField(obj.description) &&
    typeof obj.imageUrl    === 'string'
  );
}

/**
 * Validate an array of artworks.
 * Filters out any invalid items with a warning.
 * @param {Array} arr
 * @returns {Artwork[]}
 */
function validateArtworks(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter((item) => {
    if (!isValidArtwork(item)) {
      console.warn('[ArtworkTypes] Invalid artwork item filtered out:', item);
      return false;
    }
    item.nsfw = !!item.nsfw;
    return true;
  });
}
