/**
 * Studio Editor — Repeatable list editors for the Software Area content.
 * ARCcC: core/settings-panel/private/studio-editor/index.js
 *
 * The Software Area is content-driven and agnostic (see StudioTypes), so the
 * dashboard edits it through data-driven lists instead of hardcoded inputs:
 * each list below declares its own fields, and both the DOM and the reading
 * back of values are generated from that declaration.
 *
 * Field types:
 *   'text' — single string input
 *   'bi'   — bilingual pair (en / pt) text inputs
 *   'bita' — bilingual pair (en / pt) textareas
 *   'bool' — checkbox
 */

const StudioEditor = (() => {

  const LIST_DEFS = Object.freeze([
    {
      key: 'highlights',
      mount: 'studio-highlights-editor',
      label: { en: 'Highlight', pt: 'Destaque' },
      template: { icon: '✦', title: { en: '', pt: '' }, text: { en: '', pt: '' } },
      fields: [
        { name: 'icon',  type: 'text', label: { en: 'Icon', pt: 'Ícone' } },
        { name: 'title', type: 'bi',   label: { en: 'Title', pt: 'Título' } },
        { name: 'text',  type: 'bita', label: { en: 'Text', pt: 'Texto' } },
      ],
    },
    {
      key: 'roadmap',
      mount: 'studio-roadmap-editor',
      label: { en: 'Roadmap step', pt: 'Etapa do roadmap' },
      template: { phase: '', title: { en: '', pt: '' }, done: false },
      fields: [
        { name: 'phase', type: 'text', label: { en: 'Phase', pt: 'Fase' } },
        { name: 'title', type: 'bi',   label: { en: 'Title', pt: 'Título' } },
        { name: 'done',  type: 'bool', label: { en: 'Done', pt: 'Concluído' } },
      ],
    },
    {
      key: 'posts',
      mount: 'studio-posts-editor',
      label: { en: 'Entry', pt: 'Entrada' },
      template: {
        id: '', date: '',
        tag:   { en: '', pt: '' },
        title: { en: '', pt: '' },
        body:  { en: '', pt: '' },
        image: '', link: '',
      },
      fields: [
        { name: 'id',    type: 'text', label: { en: 'Id (optional)', pt: 'Id (opcional)' } },
        { name: 'date',  type: 'date', label: { en: 'Date', pt: 'Data' } },
        { name: 'tag',   type: 'bi',   label: { en: 'Tag', pt: 'Etiqueta' } },
        { name: 'title', type: 'bi',   label: { en: 'Title', pt: 'Título' } },
        { name: 'body',  type: 'bita', label: { en: 'Text', pt: 'Texto' } },
        { name: 'image', type: 'text', label: { en: 'Image path / URL', pt: 'Caminho / URL da imagem' } },
        { name: 'video', type: 'text', label: { en: 'Video URL (YouTube/Vimeo/.mp4)', pt: 'URL do vídeo (YouTube/Vimeo/.mp4)' } },
        { name: 'link',  type: 'text', label: { en: 'External link', pt: 'Link externo' } },
      ],
    },
    {
      key: 'links',
      mount: 'studio-links-editor',
      label: { en: 'Link', pt: 'Link' },
      template: { label: '', url: '', icon: '◆' },
      fields: [
        { name: 'label', type: 'text', label: { en: 'Label', pt: 'Rótulo' } },
        { name: 'url',   type: 'text', label: { en: 'URL', pt: 'URL' } },
        { name: 'icon',  type: 'text', label: { en: 'Icon', pt: 'Ícone' } },
      ],
    },
  ]);

  /** @type {StudioContent} */
  let _content = null;

  /**
   * Render every list from the given studio content.
   * @param {StudioContent} content
   */
  function mount(content) {
    _content = normalizeStudioContent(content);
    LIST_DEFS.forEach((def) => _renderList(def, _content[def.key] || []));
  }

  /** @returns {Object} the list part of the content (meta is handled elsewhere) */
  function read() {
    const out = {};
    LIST_DEFS.forEach((def) => { out[def.key] = _readList(def); });
    return out;
  }

  // ── Rendering ──────────────────────────────────────────────

  function _renderList(def, items) {
    const container = document.getElementById(def.mount);
    if (!container) return;

    container.innerHTML = '';

    const addBtn = document.querySelector(`[data-add-list="${def.key}"]`);
    if (addBtn) {
      addBtn.textContent = _t({ en: `+ Add ${def.label.en}`, pt: `+ Adicionar ${def.label.pt}` });
      addBtn.onclick = () => {
        const next = _readList(def);
        next.push(_clone(def.template));
        _renderList(def, next);
      };
    }

    items.forEach((item, index) => container.appendChild(_buildCard(def, item, index)));
  }

  function _buildCard(def, item, index) {
    const isEn = I18n.getLang() === 'en';
    const card = document.createElement('div');
    card.className = 'studio-editor-card';
    card.dataset.index = index;

    const head = document.createElement('div');
    head.className = 'studio-editor-card__head';
    head.innerHTML = `<span>${_esc(_t(def.label))} ${index + 1}</span>`;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn-ghost-danger';
    remove.textContent = isEn ? 'Remove' : 'Remover';
    remove.addEventListener('click', () => {
      const items = _readList(def).filter((_, i) => i !== index);
      _renderList(def, items);
    });
    head.appendChild(remove);
    card.appendChild(head);

    def.fields.forEach((field) => {
      if (field.type === 'bi' || field.type === 'bita') {
        ['en', 'pt'].forEach((lang) => {
          const value = (item[field.name] || {})[lang] || '';
          card.appendChild(_buildField(field, value, lang));
        });
      } else {
        card.appendChild(_buildField(field, item[field.name], null));
      }
    });

    return card;
  }

  function _buildField(field, value, lang) {
    const wrap = document.createElement('div');
    wrap.className = 'field-group';

    const labelText = _t(field.label) + (lang ? ` (${lang.toUpperCase()})` : '');
    const inputId = `f-${field.name}-${lang || 'x'}-${Math.random().toString(36).slice(2, 7)}`;

    if (field.type === 'bool') {
      wrap.style.flexDirection = 'row';
      wrap.style.alignItems = 'center';
      wrap.style.gap = '8px';
      wrap.innerHTML = `
        <input type="checkbox" id="${inputId}" data-field="${field.name}" ${value ? 'checked' : ''} style="cursor:pointer;" />
        <label class="admin-label" for="${inputId}" style="cursor:pointer;">${_esc(labelText)}</label>
      `;
      return wrap;
    }

    const isTextarea = field.type === 'bita';
    const langAttr = lang ? ` data-lang="${lang}"` : '';
    const inputType = field.type === 'date' ? 'date' : 'text';

    wrap.innerHTML = `
      <label class="admin-label" for="${inputId}">${_esc(labelText)}</label>
      ${isTextarea
        ? `<textarea class="admin-textarea" id="${inputId}" data-field="${field.name}"${langAttr}>${_esc(value || '')}</textarea>`
        : `<input class="admin-input" id="${inputId}" type="${inputType}" data-field="${field.name}"${langAttr} value="${_esc(value || '')}" />`}
    `;
    return wrap;
  }

  // ── Reading ────────────────────────────────────────────────

  function _readList(def) {
    const container = document.getElementById(def.mount);
    if (!container) return [];

    return Array.from(container.querySelectorAll('.studio-editor-card')).map((card) => {
      const item = {};
      def.fields.forEach((field) => {
        if (field.type === 'bool') {
          const el = card.querySelector(`[data-field="${field.name}"]`);
          item[field.name] = !!(el && el.checked);
        } else if (field.type === 'bi' || field.type === 'bita') {
          const en = card.querySelector(`[data-field="${field.name}"][data-lang="en"]`);
          const pt = card.querySelector(`[data-field="${field.name}"][data-lang="pt"]`);
          item[field.name] = {
            en: en ? en.value.trim() : '',
            pt: pt ? pt.value.trim() : '',
          };
        } else {
          const el = card.querySelector(`[data-field="${field.name}"]`);
          item[field.name] = el ? el.value.trim() : '';
        }
      });
      return item;
    });
  }

  // ── Helpers ────────────────────────────────────────────────

  function _t(pair) {
    return pair[I18n.getLang()] || pair.en;
  }

  function _clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function _esc(str) {
    return (str === undefined || str === null) ? '' : String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return Object.freeze({ mount, read, LIST_DEFS });
})();
