/**
 * StudioTypes — Contract for the Software Area content (agnostic).
 * ARCcC: core/studio/public/types/StudioTypes.js
 *
 * This contract is deliberately PRODUCT-AGNOSTIC: no field carries the name
 * of a specific software. The area is filled from `content/studio.json`
 * (see infrastructure/content) and every text field accepts either a plain
 * string or a bilingual object `{ en, pt }`.
 *
 * @typedef {Object} StudioContent
 * @property {StudioMeta}        meta
 * @property {Object|string[]}   intros      — paragraphs (bilingual array or array)
 * @property {StudioHighlight[]} highlights  — optional; empty hides the section
 * @property {StudioRoadmap[]}   roadmap     — optional; empty hides the section
 * @property {StudioPost[]}      posts       — optional; empty hides the section
 * @property {StudioLink[]}      links       — optional; empty hides the section
 *
 * @typedef {Object} StudioMeta
 * @property {string} slug
 * @property {string|object} name
 * @property {string|object} tagline
 * @property {string|object} status
 * @property {string} version
 * @property {string} heroImage
 * @property {{label: (string|object), url: string}} cta
 *
 * @typedef {Object} StudioHighlight
 * @property {string} icon
 * @property {string|object} title
 * @property {string|object} text
 *
 * @typedef {Object} StudioPost
 * @property {string} id
 * @property {string} date        — ISO date (YYYY-MM-DD)
 * @property {string|object} tag
 * @property {string|object} title
 * @property {string|object} body
 * @property {string} image       — optional image URL
 * @property {string} link        — optional external link
 *
 * @typedef {Object} StudioRoadmap
 * @property {string} phase
 * @property {string|object} title
 * @property {boolean} done
 *
 * @typedef {Object} StudioLink
 * @property {string} label
 * @property {string} url
 * @property {string} icon
 */

/** Built-in fallback used when content/studio.json cannot be read. */
const DEFAULT_STUDIO_CONTENT = Object.freeze({
  meta: {
    slug: 'studio',
    status:      { en: 'In Development', pt: 'Em Desenvolvimento' },
    name:        { en: 'Project Name',   pt: 'Nome do Projeto' },
    tagline:     { en: 'One line about what your software does.', pt: 'Uma linha sobre o que o seu software faz.' },
    version: '0.1.0',
    heroImage: '',
    cta: { label: { en: 'Read the updates', pt: 'Ler as novidades' }, url: '#studio-feed' },
  },
  intros: { en: ['Describe your software here.'], pt: ['Descreva seu software aqui.'] },
  highlights: [],
  roadmap: [],
  posts: [],
  links: [],
});

/**
 * Validate the top-level shape of a StudioContent object.
 * @param {*} obj
 * @returns {boolean}
 */
function isValidStudioContent(obj) {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    obj.meta !== null &&
    typeof obj.meta === 'object'
  );
}

/**
 * Coerce any input into a renderable StudioContent object.
 * Missing pieces become empty arrays so the renderer can simply hide sections.
 * @param {*} raw
 * @returns {StudioContent}
 */
function normalizeStudioContent(raw) {
  const base = DEFAULT_STUDIO_CONTENT;
  if (!isValidStudioContent(raw)) {
    return JSON.parse(JSON.stringify(base));
  }

  const list = (value) => (Array.isArray(value) ? value : []);

  return {
    meta: Object.assign({}, base.meta, raw.meta || {}),
    intros: raw.intros || base.intros,
    highlights: list(raw.highlights),
    roadmap: list(raw.roadmap),
    posts: list(raw.posts),
    links: list(raw.links),
  };
}