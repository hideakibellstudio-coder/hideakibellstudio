/**
 * Config — Default site configuration.
 * ARCcC: infrastructure/config/index.js
 *
 * This file can be replaced by the exported config from the Settings Panel.
 * All values here are the site defaults (overridden by localStorage in the panel).
 */

const DEFAULT_CONFIG = Object.freeze({
  site: {
    title:       'Hideaki Bell · Digital Artist',
    description: 'Portfolio of Hideaki Bell — independent digital artist specializing in digital illustration, concept art, and abstract digital art.',
    accentColor: '#FF3EA5',   // Brand pink — Hideaki Bell signature color
    language:    'en',
  },

  artist: {
    name:      'Hideaki Bell',
    tagline:   {
      en: 'Digital Artist · Independent Creator',
      pt: 'Ilustrador Digital · Criador Independente'
    },
    bio: {
      en: [
        'I create worlds that exist between the seen and unseen — spaces where light dissolves into shadow and form emerges from chaos. My work explores the intersection of technology and human emotion through a visual language that is both precise and intuitive.',
        'Based in Brazil, I work as an independent digital artist creating illustrations, concept art, and abstract works for clients and personal projects worldwide.',
      ],
      pt: [
        'Crio mundos que existem entre o visto e o invisível — espaços onde a luz se dissolve em sombra e a forma emerge do caos. Meu trabalho explora a interseção da tecnologia e da emoção humana através de uma linguagem visual que é ao mesmo tempo precisa e intuitiva.',
        'Sediado no Brasil, trabalho como artista digital independente criando ilustrações, concept art e obras abstratas para clientes e projetos pessoais em todo o mundo.',
      ]
    },
    avatarUrl:    'assets/images/avatar.jpg',
    specialties: [
      { en: 'Digital Illustration', pt: 'Ilustração Digital' },
      { en: 'Concept Art', pt: 'Arte Conceitual' },
      { en: 'Abstract Art', pt: 'Arte Abstrata' },
      { en: 'Visual Development', pt: 'Desenvolvimento Visual' }
    ],
    stats: {
      years:    '7+',
      projects: '120+',
      clients:  '40+',
    },
  },

  social: {
    instagram:  '',
    behance:    '',
    artstation: '',
    twitter:    '',
    youtube:    '',
  },

  contact: {
    email:            'hello@hideakibell.art',
    formspreeEndpoint:'',   // e.g. https://formspree.io/f/YOUR_ID
  },

  seo: {
    ogImage: 'assets/images/artwork-1.jpg',
  },

  artworks: [
    {
      id:          'artwork-1',
      title:       { en: 'Ethereal Void', pt: 'Vazio Etéreo' },
      category:    { en: 'Abstract', pt: 'Abstrato' },
      description: {
        en: 'A meditation on the luminous spaces between states of being. Light trails trace the paths of unseen forces.',
        pt: 'Uma meditação sobre os espaços luminosos entre estados de ser. Trilhas de luz traçam os caminhos de forças invisíveis.'
      },
      imageUrl:    'assets/images/artwork-1.jpg',
      nsfw:        false,
    },
    {
      id:          'artwork-2',
      title:       { en: 'The Veiled', pt: 'O Velado' },
      category:    { en: 'Concept Art', pt: 'Arte Conceitual' },
      description: {
        en: 'Character study exploring identity, concealment, and the tension between presence and absence.',
        pt: 'Estudo de personagem explorando identidade, ocultamento e a tensão entre presença e ausência.'
      },
      imageUrl:    'assets/images/artwork-2.jpg',
      nsfw:        false,
    },
    {
      id:          'artwork-3',
      title:       { en: 'Sacred Geometry No.7', pt: 'Geometria Sagrada Nº 7' },
      category:    { en: 'Generative', pt: 'Generativo' },
      description: {
        en: 'Mathematical structures rendered as visual poetry. Order and complexity in dialogue.',
        pt: 'Estruturas matemáticas interpretadas como poesia visual. Ordem e complexidade em diálogo.'
      },
      imageUrl:    'assets/images/artwork-3.jpg',
      nsfw:        false,
    },
    {
      id:          'artwork-4',
      title:       { en: 'Emergence', pt: 'Emergência' },
      category:    { en: 'Digital Painting', pt: 'Pintura Digital' },
      description: {
        en: 'A portrait study in the tradition of chiaroscuro, reimagined through a digital lens.',
        pt: 'Um estudo de retrato na tradição do chiaroscuro, reimaginado através de uma lente digital.'
      },
      imageUrl:    'assets/images/artwork-4.jpg',
      nsfw:        false,
    },
    {
      id:          'artwork-5',
      title:       { en: 'Still City [NSFW]', pt: 'Cidade Silenciosa [NSFW]' },
      category:    { en: 'Landscape', pt: 'Paisagem' },
      description: {
        en: 'An urban landscape reduced to its essential geometry. The city as abstraction.',
        pt: 'Uma paisagem urbana reduzida à sua geometria essencial. A cidade como abstração.'
      },
      imageUrl:    'assets/images/artwork-5.jpg',
      nsfw:        true,
    },
    {
      id:          'artwork-6',
      title:       { en: 'Fluid State [NSFW]', pt: 'Estado Fluido [NSFW]' },
      category:    { en: 'Abstract', pt: 'Abstrato' },
      description: {
        en: 'Liquid dynamics frozen at the precise moment of dissolution. Motion as stillness.',
        pt: 'Dinâmica de líquidos congelada no momento preciso de dissolução. Movimento como quietude.'
      },
      imageUrl:    'assets/images/artwork-6.jpg',
      nsfw:        true,
    },
  ],
});


/**
 * Load config: merges DEFAULT_CONFIG with any saved localStorage overrides.
 * @returns {object} merged config
 */
function loadConfig() {
  try {
    const saved = localStorage.getItem('hb_portfolio_config');
    if (!saved) return deepClone(DEFAULT_CONFIG);
    const parsed = JSON.parse(saved);
    return deepMerge(deepClone(DEFAULT_CONFIG), parsed);
  } catch {
    return deepClone(DEFAULT_CONFIG);
  }
}

/**
 * Merge published content (infrastructure/content) into a config object.
 *
 * `content.site`     → overrides site / artist / social / contact / seo
 * `content.art`      → replaces the artworks array (arrays are not merged)
 *
 * @param {object} config
 * @param {object} content — resolved ContentLoader.getAll() map
 * @returns {object} the same config object, mutated
 */
function applyContentOverrides(config, content) {
  if (!config || !content) return config;

  const site = content.site;
  if (site && typeof site === 'object') {
    ['site', 'artist', 'social', 'contact', 'seo'].forEach((section) => {
      if (site[section] && typeof site[section] === 'object') {
        deepMerge(config[section], site[section]);
      }
    });
  }

  const art = content.art;
  if (art && Array.isArray(art.artworks)) {
    config.artworks = art.artworks;
  }

  return config;
}

/**
 * Save config to localStorage.
 * @param {object} config
 */
function saveConfig(config) {
  try {
    localStorage.setItem('hb_portfolio_config', JSON.stringify(config));
  } catch (err) {
    console.warn('[Config] Could not save to localStorage:', err);
  }
}

/** Deep clone helper */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/** Deep merge: target into source (non-destructive on arrays).
 *  Skips `__proto__`/`constructor`/`prototype` keys to block
 *  prototype pollution via untrusted JSON (content files). */
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
