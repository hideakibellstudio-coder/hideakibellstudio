/**
 * i18n — Internationalization module for English and Portuguese (pt-BR).
 * ARCcC: infrastructure/i18n/index.js
 */

const I18n = (() => {

  const STORAGE_KEY = 'hb_lang';
  const LANGUAGES = {
    EN: 'en',
    PT: 'pt',
  };

  let _currentLang = LANGUAGES.EN;

  const DICTIONARY = {
    [LANGUAGES.EN]: {
      nav_gallery: "Gallery",
      nav_about: "About",
      nav_contact: "Contact",
      nav_home: "Home",
      nav_art: "Art",
      nav_studio: "Software",
      hero_view_gallery: "View Gallery",
      hero_get_in_touch: "Get in Touch",
      hero_scroll: "Scroll",
      section_portfolio: "Portfolio",
      section_selected_works: "Selected Works",
      section_about: "About",
      section_the_artist: "The Artist",
      section_contact: "Contact",
      section_lets_create: "Let's Create Together",
      contact_intro: "Open to commissions, collaborations, and creative projects. Reach out and let's bring your vision to life.",
      contact_or_send: "or get in touch directly",
      contact_card_text: "Ready to start your next creative project, inquiry, or commission?",
      contact_name: "Name",

      contact_email: "Email",
      contact_subject: "Subject",
      contact_message: "Message",
      contact_submit: "Send Message",
      contact_sending: "Sending...",
      contact_fallback: "Or email directly:",
      contact_subject_placeholder: "Commission / Collaboration / Other",
      contact_message_placeholder: "Tell me about your project...",
      contact_name_placeholder: "Your name",
      contact_email_placeholder: "your@email.com",
      footer_rights: "All Rights Reserved",
      hub_label: "Two areas",
      hub_title: "Two independent areas",
      hub_intro: "This site is not a single sales page: it holds two separate areas — one for my artwork, another for the software I am building. Each one has its own page, its own layout and its own pace.",
      hub_art_title: "Art Area",
      hub_art_text: "Illustrations, concept art and personal pieces. Filter by category, open the full-screen viewer and opt in to 18+ content if you want it.",
      hub_art_cta: "Enter the art area",
      hub_studio_title: "Software Area",
      hub_studio_text: "Development log, features, roadmap and releases — everything about the software I am building, updated as it happens.",
      hub_studio_cta: "Enter the software area",
      hub_note: "Each area is edited separately in the Creator Studio.",
      studio_label: "Software",
      studio_title: "Building in public",
      studio_highlights_label: "Overview",
      studio_highlights_title: "What it does",
      studio_feed_label: "Updates",
      studio_feed_title: "Latest entries",
      studio_roadmap_label: "Roadmap",
      studio_roadmap_title: "Where it is going",
      studio_links_label: "Links",
      studio_links_title: "Elsewhere",
      studio_cta: "Read the updates",
      studio_read_more: "Read more",
      studio_soon: "First entry coming soon.",
      studio_feed_prev: "Previous entry",
      studio_feed_next: "Next entry",
      studio_feed_view_all: "View all",
      studio_feed_view_carousel: "Carousel",
      studio_feed_dots: "Devlog entries",
      studio_support_eyebrow: "Independent project",
      studio_support_close: "Close",
      studio_support_copy: "Copy Pix key",
      studio_support_copied: "Copied!",
      studio_support_qr_alt: "Donation QR code",
      back_home: "Back to home",
      load_more: "Load More",
      show_nsfw: "Show NSFW (18+)",
      age_gate_title: "Content Warning",
      age_gate_desc: "This portfolio contains mature/sensitive content (NSFW) intended for adult audiences. You must be 18 years of age or older to view this content.",
      age_gate_accept: "I am 18 or older",
      age_gate_reject: "Cancel",
      all_works: "All Works",
      form_no_endpoint: "Please configure a Formspree endpoint in Creator Studio (admin.html).",
      form_success: "Message sent! I'll get back to you soon.",
      form_error: "Something went wrong. Please try again.",
      form_network_error: "Network error. Please check your connection and try again.",
    },
    [LANGUAGES.PT]: {
      nav_gallery: "Galeria",
      nav_about: "Sobre",
      nav_contact: "Contato",
      nav_home: "Início",
      nav_art: "Arte",
      nav_studio: "Software",
      hero_view_gallery: "Ver Galeria",
      hero_get_in_touch: "Entrar em Contato",
      hero_scroll: "Rolar",
      section_portfolio: "Portfólio",
      section_selected_works: "Trabalhos Selecionados",
      section_about: "Sobre",
      section_the_artist: "O Artista",
      section_contact: "Contato",
      section_lets_create: "Vamos Criar Juntos",
      contact_intro: "Aberto a comissões, colaborações e projetos criativos. Entre em contato e vamos dar vida à sua visão.",
      contact_or_send: "ou entre em contato diretamente",
      contact_card_text: "Pronto para iniciar seu próximo projeto criativo, proposta ou comissão?",
      contact_name: "Nome",

      contact_email: "E-mail",
      contact_subject: "Assunto",
      contact_message: "Mensagem",
      contact_submit: "Enviar Mensagem",
      contact_sending: "Enviando...",
      contact_fallback: "Ou envie um e-mail direto:",
      contact_subject_placeholder: "Comissão / Colaboração / Outro",
      contact_message_placeholder: "Fale-me sobre o seu projeto...",
      contact_name_placeholder: "Seu nome",
      contact_email_placeholder: "seu@email.com",
      footer_rights: "Todos os Direitos Reservados",
      hub_label: "Duas áreas",
      hub_title: "Duas áreas independentes",
      hub_intro: "Este site não é uma página única de venda: ele reúne duas áreas separadas — uma para as minhas artes, outra para o software que estou desenvolvendo. Cada uma tem sua própria página, seu próprio layout e seu próprio ritmo.",
      hub_art_title: "Área Arte",
      hub_art_text: "Ilustrações, concept art e trabalhos pessoais. Filtre por categoria, abra o visualizador em tela cheia e habilite o conteúdo 18+ se quiser.",
      hub_art_cta: "Entrar na área de arte",
      hub_studio_title: "Área Software",
      hub_studio_text: "Diário de desenvolvimento, recursos, roadmap e lançamentos — tudo sobre o software que estou construindo, atualizado conforme acontece.",
      hub_studio_cta: "Entrar na área do software",
      hub_note: "Cada área é editada separadamente no Creator Studio.",
      studio_label: "Software",
      studio_title: "Construindo em público",
      studio_highlights_label: "Visão geral",
      studio_highlights_title: "O que ele faz",
      studio_feed_label: "Novidades",
      studio_feed_title: "Últimas entradas",
      studio_roadmap_label: "Roadmap",
      studio_roadmap_title: "Para onde vai",
      studio_links_label: "Links",
      studio_links_title: "Outros lugares",
      studio_cta: "Ler as novidades",
      studio_read_more: "Ler mais",
      studio_soon: "Primeira entrada em breve.",
      studio_feed_prev: "Entrada anterior",
      studio_feed_next: "Próxima entrada",
      studio_feed_view_all: "Ver todas",
      studio_feed_view_carousel: "Carrossel",
      studio_feed_dots: "Entradas do devlog",
      studio_support_eyebrow: "Projeto independente",
      studio_support_close: "Fechar",
      studio_support_copy: "Copiar chave Pix",
      studio_support_copied: "Copiado!",
      studio_support_qr_alt: "QR code para doação",
      back_home: "Voltar ao início",
      load_more: "Carregar Mais",
      show_nsfw: "Mostrar NSFW (18+)",
      age_gate_title: "Aviso de Conteúdo",
      age_gate_desc: "Este portfólio contém conteúdo maduro/sensível (NSFW) destinado a maiores de 18 anos. Você deve ter 18 anos ou mais para visualizar este conteúdo.",
      age_gate_accept: "Tenho 18 anos ou mais",
      age_gate_reject: "Cancelar",
      all_works: "Todos",
      form_no_endpoint: "Por favor, configure um endpoint do Formspree no Creator Studio (admin.html).",
      form_success: "Mensagem enviada! Entrarei em contato em breve.",
      form_error: "Ocorreu um erro. Por favor, tente novamente.",
      form_network_error: "Erro de conexão. Por favor, verifique sua internet e tente novamente.",
    }
  };


  /**
   * Initialize language detection.
   * Priority: localStorage > browser language settings > default (en)
   */
  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && Object.values(LANGUAGES).includes(saved)) {
      _currentLang = saved;
    } else {
      const browserLang = navigator.language || navigator.userLanguage;
      if (browserLang && browserLang.startsWith('pt')) {
        _currentLang = LANGUAGES.PT;
      } else {
        _currentLang = LANGUAGES.EN;
      }
    }
    _applyLanguageAttributes();
  }

  function getLang() {
    return _currentLang;
  }

  /**
   * Change active language.
   * @param {'en'|'pt'} lang
   */
  function setLang(lang) {
    if (!Object.values(LANGUAGES).includes(lang)) return;
    _currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    _applyLanguageAttributes();
    EventBus.emit('language.changed', lang);
  }

  /**
   * Translate a dictionary key.
   * @param {string} key
   * @returns {string} translated text
   */
  function t(key) {
    return DICTIONARY[_currentLang]?.[key] || DICTIONARY[LANGUAGES.EN]?.[key] || key;
  }

  /**
   * Get translation for a dynamic field (bilingual object or string).
   * @param {object|string} field
   * @returns {string}
   */
  function tField(field) {
    if (!field) return '';
    if (typeof field === 'object' && !Array.isArray(field)) {
      return field[_currentLang] || field[LANGUAGES.EN] || Object.values(field)[0] || '';
    }
    return field;
  }

  /**
   * Get translation for a dynamic array (bilingual array object or array).
   * @param {object|string[]} field
   * @returns {string[]}
   */
  function tFieldArray(field) {
    if (!field) return [];
    if (typeof field === 'object' && !Array.isArray(field)) {
      return field[_currentLang] || field[LANGUAGES.EN] || Object.values(field)[0] || [];
    }
    return field;
  }

  function _applyLanguageAttributes() {
    document.documentElement.setAttribute('lang', _currentLang);
  }

  return Object.freeze({ init, getLang, setLang, t, tField, tFieldArray, LANGUAGES });
})();
