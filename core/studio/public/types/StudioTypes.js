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
 * @property {StudioSupport}     support     — optional; the floating support button
 *                                             only appears when a method URL or a
 *                                             QR image is actually configured
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
 *
 * @typedef {Object} StudioSupport
 * @property {boolean} enabled                — master switch (default: true)
 * @property {string|object} title            — modal title
 * @property {string|object} buttonLabel      — floating button label / aria-label
 * @property {Object|string[]} story          — paragraphs explaining the project
 * @property {string} qrImage                 — optional QR image (assets/… or https)
 * @property {string|object} qrCaption
 * @property {string} pixKey                  — optional Pix copy-and-paste key
 * @property {StudioSupportMethod[]} methods  — e.g. LivePix (Pix/card) + Stripe
 * @property {string|object} thanks
 *
 * @typedef {Object} StudioSupportMethod
 * @property {string} id
 * @property {string} icon
 * @property {string} label
 * @property {string|object} note
 * @property {string} url        — empty = the method button is not rendered
 * @property {boolean} primary   — highlighted first (at most one)
 */

/** Built-in support block — disabled by default (fail closed: nothing to click → nothing shown). */
const DEFAULT_STUDIO_SUPPORT = Object.freeze({
  enabled: false,
  title:       { en: 'Support the project', pt: 'Apoie o projeto' },
  buttonLabel: { en: 'Support', pt: 'Apoiar' },
  story:       { en: [], pt: [] },
  qrImage: '',
  qrCaption:   { en: '', pt: '' },
  pixKey: '',
  methods: [],
  thanks:      { en: '', pt: '' },
});

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
  support: DEFAULT_STUDIO_SUPPORT,
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
    support: normalizeStudioSupport(raw.support),
  };
}

/**
 * Coerce the support block into a renderable shape.
 * `enabled` follows the content (absent = enabled); the floating button itself
 * is only rendered when a method URL or a QR image survives validation.
 * @param {*} raw
 * @returns {StudioSupport}
 */
function normalizeStudioSupport(raw) {
  const base = DEFAULT_STUDIO_SUPPORT;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return JSON.parse(JSON.stringify(base));
  }

  return {
    enabled: raw.enabled !== false,
    title:       raw.title       || base.title,
    buttonLabel: raw.buttonLabel || base.buttonLabel,
    story:       raw.story       || base.story,
    qrImage:     typeof raw.qrImage === 'string' ? raw.qrImage : '',
    qrCaption:   raw.qrCaption   || base.qrCaption,
    pixKey:      typeof raw.pixKey === 'string' ? raw.pixKey : '',
    methods:     Array.isArray(raw.methods) ? raw.methods.filter((m) => m && typeof m === 'object') : [],
    thanks:      raw.thanks      || base.thanks,
  };
}