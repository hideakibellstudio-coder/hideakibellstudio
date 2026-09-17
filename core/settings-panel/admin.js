/**
 * Admin Dashboard Controller.
 * ARCcC: core/settings-panel/admin.js
 */
document.addEventListener('DOMContentLoaded', () => {
  // Init infrastructure and i18n
  I18n.init();

  // The dashboard only boots after the access gate is satisfied
  GateUI.init(() => { _bootDashboard(); });
});

/** Active configuration (defaults + published content + local overrides) */
let _config = null;

/** Last loaded Software Area content (kept for slugs/section defaults) */
let _studioContent = null;

/** Boot the dashboard once the studio is unlocked. */
async function _bootDashboard() {
  // Load the published content (content/*.json) and merge it into the config
  let content = null;
  try {
    content = await ContentLoader.loadAll();
  } catch (err) {
    console.warn('[Admin] Could not load content:', err);
  }

  _config = applyContentOverrides(loadConfig(), content);
  _studioContent = normalizeStudioContent(ContentLoader.get('studio'));

  // Wire dynamic language switch in dashboard
  const langBtn = document.getElementById('lang-switch-btn');
  langBtn?.addEventListener('click', () => {
    const nextLang = I18n.getLang() === 'en' ? 'pt' : 'en';
    I18n.setLang(nextLang);
    langBtn.textContent = nextLang.toUpperCase();
    _translateStaticUI();
  });

  _translateStaticUI();
  _bindNavigation();
  _bindLangMode();
  _populateFields(_config);
  _populateStudioFields(_studioContent);
  _bindColorSync();
  _bindDirtyTracking();
  _bindPostComposer();
  _bindActions(_config);
  _bindSecurity();

  // Publish / security pane (needs the current form values when publishing)
  Publisher.init({ collect: _collectContent });
}

// ── Navigation tabs switching ────────────────────────────────
function _bindNavigation() {
  const tabs = document.querySelectorAll('.admin-nav-item');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('is-active'));
      document.querySelectorAll('.admin-pane').forEach((p) => p.classList.remove('is-active'));

      tab.classList.add('is-active');
      const paneId = `pane-${tab.dataset.tab}`;
      document.getElementById(paneId)?.classList.add('is-active');
    });
  });
}

// ── Sync color picker and text inputs ────────────────────────
function _bindColorSync() {
  const picker = document.getElementById('s-accent-color');
  const hex = document.getElementById('s-accent-color-hex');

  picker?.addEventListener('input', () => {
    hex.value = picker.value.toUpperCase();
    _applyAccentColor(picker.value);
  });

  hex?.addEventListener('input', () => {
    if (/^#[0-9A-F]{6}$/i.test(hex.value)) {
      picker.value = hex.value;
      _applyAccentColor(hex.value);
    }
  });
}

// ── Live apply accent color variables to editor UI ───────────
function _applyAccentColor(hexHex) {
  if (!hexHex || !/^#[0-9a-fA-F]{6}$/.test(hexHex)) return;
  const vars = Formatters.accentColorVars(hexHex);
  Object.entries(vars).forEach(([k, v]) => {
    document.documentElement.style.setProperty(k, v);
  });
  document.documentElement.style.setProperty('--color-accent-soft', `${hexHex}14`);
}

// ── Populate field inputs from configuration object ──────────
function _populateFields(config) {
  // Visual
  document.getElementById('s-accent-color').value = config.site.accentColor || '#FF3EA5';
  document.getElementById('s-accent-color-hex').value = (config.site.accentColor || '#FF3EA5').toUpperCase();
  _applyAccentColor(config.site.accentColor);

  // Artist info
  document.getElementById('s-artist-name').value = config.artist.name || '';

  // Taglines
  document.getElementById('s-artist-tagline-en').value = config.artist.tagline?.en || config.artist.tagline || '';
  document.getElementById('s-artist-tagline-pt').value = config.artist.tagline?.pt || config.artist.tagline || '';

  // Bilingual Bios
  const bio = config.artist.bio || {};
  const bioEn = bio.en || (Array.isArray(bio) ? bio : []);
  const bioPt = bio.pt || [];
  document.getElementById('s-artist-bio-en-1').value = bioEn[0] || '';
  document.getElementById('s-artist-bio-en-2').value = bioEn[1] || '';
  document.getElementById('s-artist-bio-pt-1').value = bioPt[0] || '';
  document.getElementById('s-artist-bio-pt-2').value = bioPt[1] || '';

  document.getElementById('s-artist-avatar').value = config.artist.avatarUrl || '';

  // Specialties
  const specs = config.artist.specialties || [];
  const specsEn = specs.map(s => s.en || s).join(', ');
  const specsPt = specs.map(s => s.pt || (typeof s === 'string' ? s : '')).join(', ');
  document.getElementById('s-artist-specialties-en').value = specsEn;
  document.getElementById('s-artist-specialties-pt').value = specsPt;

  // Stats
  const stats = config.artist.stats || {};
  document.getElementById('s-stat-years').value = stats.years || '';
  document.getElementById('s-stat-projects').value = stats.projects || '';
  document.getElementById('s-stat-clients').value = stats.clients || '';

  // Contact info
  document.getElementById('s-contact-email').value = config.contact.email || '';
  document.getElementById('s-formspree').value = config.contact.formspreeEndpoint || '';

  // Social Links
  document.getElementById('s-instagram').value = config.social.instagram || '';
  document.getElementById('s-behance').value = config.social.behance || '';
  document.getElementById('s-artstation').value = config.social.artstation || '';
  document.getElementById('s-twitter').value = config.social.twitter || '';
  document.getElementById('s-youtube').value = config.social.youtube || '';

  // SEO
  document.getElementById('s-site-title').value = config.site.title || '';
  document.getElementById('s-site-description').value = config.site.description || '';

  // Artworks Editor cards
  _buildArtworksGrid(config.artworks || []);
}

// ── Build artworks list editors ──────────────────────────────
// Full add/remove control (blue-team note: every interpolation is escaped;
// the preview image uses the same URL allowlist as the gallery).
function _buildArtworksGrid(artworks) {
  const container = document.getElementById('s-artworks-list');
  if (!container) return;
  container.innerHTML = '';

  // "Add artwork" button pinned at the TOP of the list
  container.appendChild(_makeAddArtworkButton());

  artworks.forEach((art, i) => {
    container.appendChild(_buildArtworkCard(art, i));
  });

  if (!artworks.length) {
    const note = document.createElement('p');
    note.className = 'artwork-empty-note';
    note.textContent = I18n.getLang() === I18n.LANGUAGES.PT
      ? 'Nenhuma obra ainda. Use o botão acima para adicionar.'
      : 'No artworks yet. Use the button above to add one.';
    container.appendChild(note);
  }
}

/** Shared factory so the add button is identical wherever it is rebuilt. */
function _makeAddArtworkButton() {
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.id = 'btn-add-artwork';
  addBtn.className = 'btn-primary';
  addBtn.textContent = I18n.getLang() === I18n.LANGUAGES.PT
    ? '+ Adicionar obra'
    : '+ Add artwork';
  addBtn.addEventListener('click', () => {
    const container = document.getElementById('s-artworks-list');
    if (!container) return;
    const card = _buildArtworkCard({
      title: { en: '', pt: '' },
      category: { en: '', pt: '' },
      description: { en: '', pt: '' },
      imageUrl: '',
      nsfw: false,
    }, container.querySelectorAll('.artwork-editor-card').length);
    // New card lands right under the button (top of the grid)
    container.insertBefore(card, addBtn.nextSibling);
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    _markDirty();
  });
  return addBtn;
}

function _buildArtworkCard(art, i) {
  const card = document.createElement('div');
  card.className = 'artwork-editor-card';
  card.dataset.index = i;

  const isEn = I18n.getLang() === 'en';
  const titleEn = art.title?.en || art.title || '';
  const titlePt = art.title?.pt || art.title || '';
  const catEn   = art.category?.en || art.category || '';
  const catPt   = art.category?.pt || art.category || '';
  const descEn  = art.description?.en || art.description || '';
  const descPt  = art.description?.pt || art.description || '';
  // Preview only renders allowlisted URLs (same policy as the gallery)
  const safePreview = _sanitizeUrl(art.imageUrl || '');

  card.innerHTML = `
      <div class="artwork-media-col">
        <div class="artwork-preview-box" tabindex="0" role="button" aria-label="${_esc(isEn ? 'Change image: drop a file or click to choose' : 'Trocar imagem: arraste um arquivo ou clique para escolher')}">
          ${safePreview ? `<img src="${_esc(safePreview)}" alt="Preview" />` : `<span class="no-img">${_esc(isEn ? 'No Image' : 'Sem imagem')}</span>`}
          <span class="drop-hint">${_esc(isEn ? 'Drop an image here or click to choose' : 'Arraste uma imagem aqui ou clique para escolher')}</span>
        </div>
        <input class="admin-input art-img" type="text" value="${_esc(art.imageUrl)}" placeholder="${_esc(isEn ? 'assets/images/… · https://… · or drop a file' : 'assets/images/… · https://… · ou arraste um arquivo')}" />
        <div class="artwork-card-tools">
          <button type="button" class="tool-btn" data-tool="up" title="${_esc(isEn ? 'Move up' : 'Mover para cima')}">↑</button>
          <button type="button" class="tool-btn" data-tool="down" title="${_esc(isEn ? 'Move down' : 'Mover para baixo')}">↓</button>
          <button type="button" class="tool-btn" data-tool="dup" title="${_esc(isEn ? 'Duplicate' : 'Duplicar')}">⧉</button>
          <button type="button" class="tool-btn tool-danger artwork-remove-btn" data-tool="remove" title="${_esc(isEn ? 'Remove' : 'Remover')}">✕</button>
        </div>
        <input type="file" class="art-file" accept="image/*" hidden />
      </div>
      <div class="artwork-editor-fields">
        <div class="field-group" data-lang="en">
          <label class="admin-label">Title (EN)</label>
          <input class="admin-input art-title-en" type="text" value="${_esc(titleEn)}" />
        </div>
        <div class="field-group" data-lang="pt">
          <label class="admin-label">Title (PT)</label>
          <input class="admin-input art-title-pt" type="text" value="${_esc(titlePt)}" />
        </div>
        <div class="field-group" data-lang="en">
          <label class="admin-label">Category (EN)</label>
          <input class="admin-input art-cat-en" type="text" value="${_esc(catEn)}" />
        </div>
        <div class="field-group" data-lang="pt">
          <label class="admin-label">Category (PT)</label>
          <input class="admin-input art-cat-pt" type="text" value="${_esc(catPt)}" />
        </div>
        <div class="field-group" data-lang="en">
          <label class="admin-label">Description (EN)</label>
          <textarea class="admin-textarea art-desc-en">${_esc(descEn)}</textarea>
        </div>
        <div class="field-group" data-lang="pt">
          <label class="admin-label">Description (PT)</label>
          <textarea class="admin-textarea art-desc-pt">${_esc(descPt)}</textarea>
        </div>
        <div class="field-group full" style="flex-direction:row;align-items:center;gap:8px;">
          <input type="checkbox" class="art-nsfw" ${art.nsfw ? 'checked' : ''} id="nsfw-${i}" style="cursor:pointer;" />
          <label class="admin-label" for="nsfw-${i}" style="cursor:pointer;">NSFW Content (18+)</label>
        </div>
        <div class="nsfw-warning-msg" style="color:#ff6b8b;font-size:11px;grid-column:span 2;display:none;margin-top:2px;"></div>
      </div>
    `;

    // Wire live preview & validation warning
    const imgInput = card.querySelector('.art-img');
    const nsfwCheck = card.querySelector('.art-nsfw');

    function updateWarning() {
      const isNsfw = nsfwCheck.checked;
      const url = imgInput.value.trim();
      const isLocalUrl = url.startsWith('assets/') || !/^https?:\/\//i.test(url);
      const warningEl = card.querySelector('.nsfw-warning-msg');
      if (warningEl) {
        if (isNsfw && isLocalUrl) {
          warningEl.textContent = I18n.getLang() === 'en'
            ? '⚠️ Warning: For NSFW content, it is highly recommended to use an external host (e.g. Cloudinary) instead of the GitHub repository to avoid Pages suspension.'
            : '⚠️ Aviso: Para conteúdo NSFW, é altamente recomendado usar hospedagem externa (ex: Cloudinary) em vez do GitHub para evitar a suspensão do Pages.';
          warningEl.style.display = 'block';
        } else {
          warningEl.style.display = 'none';
        }
      }
    }

    function updatePreview() {
      const preview = card.querySelector('.artwork-preview-box');
      const safeUrl = _sanitizeUrl(imgInput.value.trim());
      if (safeUrl) {
        preview.innerHTML = `<img src="${_esc(safeUrl)}" alt="Preview" />`;
      } else {
        preview.innerHTML = `<span class="no-img">${_esc(isEn ? 'No Image' : 'Sem imagem')}</span>`;
      }
      updateWarning();
    }

    imgInput.addEventListener('input', () => {
      updatePreview();
      _markDirty();
    });

    nsfwCheck.addEventListener('change', () => {
      updateWarning();
      _markDirty();
    });

    // Image picker: click / drag & drop / file input → resized data URL
    _wireImageDropzone({
      zone: card.querySelector('.artwork-preview-box'),
      fileInput: card.querySelector('.art-file'),
      onResult: (dataUrl) => {
        imgInput.value = dataUrl;
        updatePreview();
        _markDirty();
        _warnIfHeavyImage(dataUrl, isEn);
      },
    });

    // Card tools: move / duplicate / remove
    card.querySelector('[data-tool="up"]').addEventListener('click', () => _moveArtworkCard(card, -1));
    card.querySelector('[data-tool="down"]').addEventListener('click', () => _moveArtworkCard(card, 1));
    card.querySelector('[data-tool="dup"]').addEventListener('click', () => {
      const clone = _readArtworkCard(card);
      const newCard = _buildArtworkCard(clone, Number(card.dataset.index) + 1);
      card.after(newCard);
      newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      _markDirty();
    });
    card.querySelector('[data-tool="remove"]').addEventListener('click', () => {
      if (!window.confirm(isEn ? 'Remove this artwork?' : 'Remover esta obra?')) return;
      card.remove();
      if (!_gridHasAddButton()) _ensureAddButton();
      _markDirty();
    });

    // Run check on load
    updateWarning();

    return card;
}

/** Read the fields of one artwork card back into an artwork object. */
function _readArtworkCard(card) {
  const v = (sel) => {
    const el = card.querySelector(sel);
    return el ? el.value.trim() : '';
  };
  const nsfwEl = card.querySelector('.art-nsfw');
  return {
    title:       { en: v('.art-title-en'), pt: v('.art-title-pt') },
    category:    { en: v('.art-cat-en'),   pt: v('.art-cat-pt') },
    description: { en: v('.art-desc-en'),  pt: v('.art-desc-pt') },
    imageUrl:    v('.art-img'),
    nsfw:        !!(nsfwEl && nsfwEl.checked),
  };
}

/** Swap an artwork card with its previous/next sibling card. */
function _moveArtworkCard(card, dir) {
  const sib = dir < 0 ? card.previousElementSibling : card.nextElementSibling;
  if (!sib || !sib.classList.contains('artwork-editor-card')) return;
  card.parentNode.insertBefore(dir < 0 ? card : sib, dir < 0 ? sib : card);
  _markDirty();
}

// Keep the "Add artwork" button as the last child of the grid
function _gridHasAddButton() {
  const container = document.getElementById('s-artworks-list');
  return !!(container && container.querySelector('#btn-add-artwork'));
}

function _ensureAddButton() {
  const container = document.getElementById('s-artworks-list');
  if (!container) return;
  const emptyNote = document.createElement('p');
  emptyNote.className = 'artwork-empty-note';
  emptyNote.textContent = I18n.getLang() === I18n.LANGUAGES.PT
    ? 'Nenhuma obra. Use o botão acima para adicionar.'
    : 'No artworks yet. Use the button above to add one.';
  container.appendChild(emptyNote);
  _buildArtworksGridAddOnly();
}

/** Rebuild just the add button (top of the grid) after cards were removed. */
function _buildArtworksGridAddOnly() {
  const container = document.getElementById('s-artworks-list');
  if (!container) return;
  container.insertBefore(_makeAddArtworkButton(), container.firstChild);
}

// ── Image helpers (shared: artworks + post composer) ─────────
/** Downscale an image file into a compact data URL (CSP-safe: img-src data:). */
function _fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//i.test(file.type)) {
      reject(new Error('not-an-image'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read-failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode-failed'));
      img.onload = () => {
        const MAX = 1600; // long edge — keeps data URLs reasonably small
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/** Shared toast for oversized embedded images. */
function _warnIfHeavyImage(dataUrl, isEn) {
  if (dataUrl && dataUrl.length > 700000) {
    _toast(isEn
      ? `Large image embedded as data URL (~${Math.round(dataUrl.length / 1024)} KB). Prefer an external host (e.g. Cloudinary) to keep the JSON light.`
      : `Imagem grande embutida como data URL (~${Math.round(dataUrl.length / 1024)} KB). Prefira um host externo (ex: Cloudinary) para deixar o JSON leve.`);
  }
}

/** Wire click + drag & drop on a zone, feeding the result to onResult(dataUrl). */
function _wireImageDropzone({ zone, fileInput, onResult }) {
  if (!zone || !fileInput) return;
  const isEn = I18n.getLang() === 'en';
  const fail = () => _toast(
    isEn ? 'Could not read that image file.' : 'Não foi possível ler esse arquivo de imagem.',
    'error'
  );

  zone.addEventListener('click', () => fileInput.click());
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    _fileToDataUrl(file).then(onResult).catch(fail);
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    _fileToDataUrl(file).then(onResult).catch(fail);
    fileInput.value = '';
  });
}

// ── Post composer (Facebook-like) ────────────────────────────
function _bindPostComposer() {
  const composer = document.getElementById('studio-post-composer');
  if (!composer) return;
  const isEn = I18n.getLang() === 'en';

  const openComposer = (focusLang) => {
    composer.classList.add('is-open');
    let target = document.getElementById(`composer-body-${focusLang}`);
    if (!target || target.offsetParent === null) {
      // Field hidden by the language mode — focus the visible one instead.
      target = document.getElementById(focusLang === 'en' ? 'composer-body-pt' : 'composer-body-en');
    }
    if (target) target.focus();
  };

  ['pt', 'en'].forEach((lang) => {
    const trigger = document.getElementById(`composer-trigger-${lang}`);
    trigger?.addEventListener('focus', () => openComposer(lang));
    trigger?.addEventListener('click', () => openComposer(lang));
  });

  // Keep the composer open while typing anywhere in it
  composer.addEventListener('input', () => composer.classList.add('is-open'));

  // Image dropzone (file → resized data URL, or paste a URL above)
  _wireImageDropzone({
    zone: document.getElementById('composer-drop'),
    fileInput: document.getElementById('composer-file'),
    onResult: (dataUrl) => {
      const urlInput = document.getElementById('composer-image');
      const drop = document.getElementById('composer-drop');
      if (urlInput) urlInput.value = dataUrl;
      if (drop) drop.innerHTML = `<img src="${_esc(dataUrl)}" alt="" />`;
      _markDirty();
      _warnIfHeavyImage(dataUrl, isEn);
    },
  });

  // Publish the entry into the feed (top) — id + today's date are automatic
  document.getElementById('composer-post')?.addEventListener('click', () => {
    const val = (id) => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };
    const bodyEn = val('composer-body-en');
    const bodyPt = val('composer-body-pt');
    if (!bodyEn && !bodyPt) {
      _toast(isEn ? 'Write something before posting.' : 'Escreva algo antes de publicar.', 'error');
      return;
    }

    StudioEditor.prepend('posts', {
      id: 'post-' + Date.now().toString(36),
      date: new Date().toISOString().slice(0, 10),
      tag:   { en: val('composer-tag-en'),   pt: val('composer-tag-pt') },
      title: { en: val('composer-title-en'), pt: val('composer-title-pt') },
      body:  { en: bodyEn, pt: bodyPt },
      image: val('composer-image'),
      video: val('composer-video'),
      link:  val('composer-link'),
    });

    [
      'composer-tag-pt', 'composer-tag-en',
      'composer-title-pt', 'composer-title-en',
      'composer-body-pt', 'composer-body-en',
      'composer-image', 'composer-video', 'composer-link',
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const drop = document.getElementById('composer-drop');
    if (drop) {
      drop.textContent = isEn
        ? 'Drag an image here or click to choose'
        : 'Arraste uma imagem aqui ou clique para escolher';
    }
    composer.classList.remove('is-open');
    _markDirty();
    _toast(isEn
      ? 'Update added to the feed. Use Save / Publish to make it live.'
      : 'Novidade adicionada ao feed. Use Salvar / Publicar para torná-la pública.',
      'success');
  });
}

// ── Editing language mode (both / pt / en) ───────────────────
const LANGMODE_KEY = 'hb_admin_langmode';

function _applyLangMode(mode) {
  document.body.dataset.langMode = mode;
  document.querySelectorAll('.langmode-chips button').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.mode === mode);
  });
}

function _bindLangMode() {
  let saved = 'both';
  try { saved = localStorage.getItem(LANGMODE_KEY) || 'both'; } catch { /* noop */ }
  _applyLangMode(['both', 'pt', 'en'].includes(saved) ? saved : 'both');
  document.querySelectorAll('.langmode-chips button').forEach((btn) => {
    btn.addEventListener('click', () => {
      _applyLangMode(btn.dataset.mode);
      try { localStorage.setItem(LANGMODE_KEY, btn.dataset.mode); } catch { /* noop */ }
    });
  });
}

// ── Unsaved-changes tracking + toasts ────────────────────────
let _isDirty = false;

function _markDirty() {
  if (_isDirty) return;
  _isDirty = true;
  document.getElementById('dirty-badge')?.removeAttribute('hidden');
  document.getElementById('admin-save-btn')?.classList.add('is-dirty');
}

function _markClean() {
  _isDirty = false;
  document.getElementById('dirty-badge')?.setAttribute('hidden', '');
  document.getElementById('admin-save-btn')?.classList.remove('is-dirty');
}

function _bindDirtyTracking() {
  const content = document.querySelector('.admin-content');
  if (!content) return;
  content.addEventListener('input', _markDirty);
  content.addEventListener('change', _markDirty);
}

function _toast(message, type) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'admin-toast' + (type ? ` is-${type}` : '');
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 350);
  }, 4500);
}

// ─ Populate the Software Area (agnostic) fields ─────────────
function _populateStudioFields(content) {
  const studio = normalizeStudioContent(content);
  const meta = studio.meta || {};

  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
  };
  const setPair = (base, pair) => {
    setValue(`${base}-en`, pair ? pair.en : '');
    setValue(`${base}-pt`, pair ? pair.pt : '');
  };

  setPair('s-studio-name', meta.name);
  setPair('s-studio-tagline', meta.tagline);
  setPair('s-studio-status', meta.status);
  setValue('s-studio-version', meta.version);
  setValue('s-studio-hero', meta.heroImage);
  setPair('s-studio-cta-label', meta.cta ? meta.cta.label : null);
  setValue('s-studio-cta-url', meta.cta ? meta.cta.url : '');

  const intros = studio.intros || {};
  setValue('s-studio-intro-en', (intros.en || []).join('\n'));
  setValue('s-studio-intro-pt', (intros.pt || []).join('\n'));

  StudioEditor.mount(studio);
}

// ── Read the Software Area form back into a content object ───
function _collectStudio() {
  const value = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };
  const pair = (base) => ({ en: value(`${base}-en`), pt: value(`${base}-pt`) });
  const lines = (id) => value(id).split('\n').map((s) => s.trim()).filter(Boolean);

  const lists = StudioEditor.read();

  return {
    meta: {
      slug: (_studioContent && _studioContent.meta && _studioContent.meta.slug) || 'studio',
      name:    pair('s-studio-name'),
      tagline: pair('s-studio-tagline'),
      status:  pair('s-studio-status'),
      version: value('s-studio-version'),
      heroImage: value('s-studio-hero'),
      cta: {
        label: pair('s-studio-cta-label'),
        url:   value('s-studio-cta-url') || '#studio-feed',
      },
    },
    intros: {
      en: lines('s-studio-intro-en'),
      pt: lines('s-studio-intro-pt'),
    },
    highlights: lists.highlights,
    roadmap:    lists.roadmap,
    posts:      lists.posts,
    links:      lists.links,
  };
}

// ── Collect everything the site publishes (3 JSON files) ─────
function _collectContent() {
  const config = _readFields(_config);
  return {
    site: {
      site:    config.site,
      artist:  config.artist,
      social:  config.social,
      contact: config.contact,
      seo:     config.seo,
    },
    art:    { artworks: config.artworks },
    studio: _collectStudio(),
  };
}

// ── Bind Save & Export actions ────────────────────────────────
function _bindActions(originalConfig) {
  const isEn = () => I18n.getLang() === 'en';

  // Screen -> in-memory content (shared by Save and JSON export, so an
  // export always reflects what is on screen, even before clicking Save)
  const _syncEditsToMemory = () => {
    const content = _collectContent();
    ContentLoader.setOverride('site',   content.site);
    ContentLoader.setOverride('art',    content.art);
    ContentLoader.setOverride('studio', content.studio);
  };

  // Save button — local preview only (localStorage), never the repository
  document.getElementById('admin-save-btn').addEventListener('click', () => {
    const nextConfig = _readFields(originalConfig);
    SettingsPersistence.save(nextConfig);

    _syncEditsToMemory();

    Publisher.refreshStatus();

    _markClean();
    _toast(isEn()
      ? 'Saved locally! Open the Publish & Security tab to make it public, or refresh the site to preview.'
      : 'Salvo localmente! Abra a aba Publicar & Segurança para tornar público, ou atualize o site para pré-visualizar.',
      'success');
  });

  // Ctrl/Cmd+S saves too
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 's') {
      e.preventDefault();
      document.getElementById('admin-save-btn')?.click();
    }
  });

  // Export button — downloads config.js (works even without a token)
  document.getElementById('admin-export-btn').addEventListener('click', () => {
    const nextConfig = _readFields(originalConfig);
    SettingsExporter.exportAsJS(nextConfig);
  });

  // ── JSON export / import (art.json & studio.json) ──────────
  // Uses the same serialization as the publisher, so an exported file can be
  // committed directly to /content or imported back without reformatting.
  const _downloadJSON = (key) => {
    _syncEditsToMemory();
    const blob = new Blob([ContentLoader.toJSONString(key)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${key}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const _importJSON = (key, file) => {
    if (!file) return;
    file.text().then((text) => {
      let data;
      try {
        data = JSON.parse(text);
        if (!data || typeof data !== 'object') throw new Error('bad-shape');
      } catch {
        _toast(isEn() ? `Invalid JSON for ${key}.json` : `JSON inválido para ${key}.json`, 'error');
        return;
      }
      ContentLoader.setOverride(key, data);
      // Refresh the matching editor so the pane reflects the imported state
      if (key === 'art') _buildArtworksGrid(data.artworks || []);
      if (key === 'studio') _populateStudioFields(data);
      _markDirty();
      _toast(isEn() ? `${key}.json imported!` : `${key}.json importado!`, 'success');
    });
  };

  // Gallery toolbar
  document.getElementById('artwork-add-top-btn')?.addEventListener('click', () => {
    document.getElementById('btn-add-artwork')?.click();
  });
  document.getElementById('artwork-json-export')?.addEventListener('click', () => _downloadJSON('art'));
  document.getElementById('artwork-json-import')?.addEventListener('click', () => {
    document.getElementById('artwork-json-file')?.click();
  });
  document.getElementById('artwork-json-file')?.addEventListener('change', (e) => {
    _importJSON('art', e.target.files && e.target.files[0]);
    e.target.value = '';
  });

  // Studio toolbar
  document.getElementById('studio-json-export')?.addEventListener('click', () => _downloadJSON('studio'));
  document.getElementById('studio-json-import')?.addEventListener('click', () => {
    document.getElementById('studio-json-file')?.click();
  });
  document.getElementById('studio-json-file')?.addEventListener('change', (e) => {
    _importJSON('studio', e.target.files && e.target.files[0]);
    e.target.value = '';
  });
}

// ── Bind Studio access (passphrase) actions ───────────────────
function _bindSecurity() {
  const isEn = () => I18n.getLang() === 'en';
  const msg = (text) => {
    const el = document.getElementById('sec-msg');
    if (el) el.textContent = text || '';
  };

  document.getElementById('sec-change')?.addEventListener('click', async () => {
    const current = document.getElementById('sec-current').value;
    const next    = document.getElementById('sec-new').value;

    if (!next || next.length < 4) {
      msg(isEn() ? 'The new passphrase needs at least 4 characters.' : 'A nova senha precisa de pelo menos 4 caracteres.');
      return;
    }

    const ok = await AdminGate.changePassphrase(current, next);
    msg(ok
      ? (isEn() ? 'Passphrase updated.' : 'Senha atualizada.')
      : (isEn() ? 'Current passphrase is wrong.' : 'A senha atual está incorreta.'));

    if (ok) {
      document.getElementById('sec-current').value = '';
      document.getElementById('sec-new').value = '';
    }
  });

  document.getElementById('sec-lock')?.addEventListener('click', () => {
    AdminGate.lock();
    location.reload();
  });
}

// ── Extract form fields into unified Config object ────────────
function _readFields(originalConfig) {
  // Specialties parsing
  const parseSpecs = (id) => document.getElementById(id).value.split(',').map(s => s.trim()).filter(Boolean);
  
  // Artworks parsing
  const artworkCards = document.querySelectorAll('.artwork-editor-card');
  const artworks = Array.from(artworkCards).map((card, i) => {
    return {
      id: `artwork-${i + 1}`,
      title: {
        en: card.querySelector('.art-title-en').value.trim(),
        pt: card.querySelector('.art-title-pt').value.trim()
      },
      category: {
        en: card.querySelector('.art-cat-en').value.trim(),
        pt: card.querySelector('.art-cat-pt').value.trim()
      },
      description: {
        en: card.querySelector('.art-desc-en').value.trim(),
        pt: card.querySelector('.art-desc-pt').value.trim()
      },
      imageUrl: card.querySelector('.art-img').value.trim(),
      nsfw: card.querySelector('.art-nsfw').checked
    };
  });

  // Specialties
  const specsEn = parseSpecs('s-artist-specialties-en');
  const specsPt = parseSpecs('s-artist-specialties-pt');
  
  // Join specialties bilingual objects
  const specialties = [];
  const maxLen = Math.max(specsEn.length, specsPt.length);
  for (let idx = 0; idx < maxLen; idx++) {
    specialties.push({
      en: specsEn[idx] || '',
      pt: specsPt[idx] || ''
    });
  }

  // Bios
  const bioEn = [
    document.getElementById('s-artist-bio-en-1').value.trim(),
    document.getElementById('s-artist-bio-en-2').value.trim()
  ].filter(Boolean);
  
  const bioPt = [
    document.getElementById('s-artist-bio-pt-1').value.trim(),
    document.getElementById('s-artist-bio-pt-2').value.trim()
  ].filter(Boolean);

  return {
    site: {
      title: document.getElementById('s-site-title').value.trim(),
      description: document.getElementById('s-site-description').value.trim(),
      accentColor: document.getElementById('s-accent-color-hex').value.trim() || '#FF3EA5'
    },
    artist: {
      name: document.getElementById('s-artist-name').value.trim(),
      tagline: {
        en: document.getElementById('s-artist-tagline-en').value.trim(),
        pt: document.getElementById('s-artist-tagline-pt').value.trim()
      },
      bio: {
        en: bioEn,
        pt: bioPt
      },
      avatarUrl: document.getElementById('s-artist-avatar').value.trim(),
      specialties,
      stats: {
        years: document.getElementById('s-stat-years').value.trim(),
        projects: document.getElementById('s-stat-projects').value.trim(),
        clients: document.getElementById('s-stat-clients').value.trim()
      }
    },
    social: {
      instagram: document.getElementById('s-instagram').value.trim(),
      behance: document.getElementById('s-behance').value.trim(),
      artstation: document.getElementById('s-artstation').value.trim(),
      twitter: document.getElementById('s-twitter').value.trim(),
      youtube: document.getElementById('s-youtube').value.trim()
    },
    contact: {
      email: document.getElementById('s-contact-email').value.trim(),
      formspreeEndpoint: document.getElementById('s-formspree').value.trim()
    },
    seo: {
      ogImage: originalConfig.seo?.ogImage || 'assets/images/artwork-1.jpg'
    },
    artworks
  };
}

// ── Translate static dashboard labels dynamically ─────────────
function _translateStaticUI() {
  const current = I18n.getLang();
  const isEn = current === I18n.LANGUAGES.EN;

  // Sidebar Buttons
  document.getElementById('nav-btn-identity').textContent = isEn ? 'Identity & Profile' : 'Identidade & Perfil';
  document.getElementById('nav-btn-gallery').textContent = isEn ? 'Artworks Gallery' : 'Galeria de Obras';
  document.getElementById('nav-btn-social').textContent = isEn ? 'Social Networks' : 'Redes Sociais';
  document.getElementById('nav-btn-seo').textContent = isEn ? 'SEO & Page Title' : 'SEO & Metadados';
  document.getElementById('nav-btn-studio').textContent = isEn ? 'Software Area' : 'Área Software';
  document.getElementById('nav-btn-publish').textContent = isEn ? 'Publish & Security' : 'Publicar & Segurança';

  // Subtitles
  document.getElementById('studio-title').textContent = isEn ? 'Creator Studio' : 'Estúdio de Criação';
  document.getElementById('studio-subtitle').textContent = isEn 
    ? 'Edit your portfolio settings and content' 
    : 'Edite o conteúdo e as configurações do seu portfólio';

  // Global Actions Buttons
  document.getElementById('admin-save-btn').textContent = isEn ? 'Save Changes' : 'Salvar Alterações';
  document.getElementById('admin-export-btn').textContent = isEn ? 'Export config.js' : 'Exportar config.js';

  // Publish & Security pane labels
  const publishLabels = {
    'pub-save-settings': isEn ? 'Save settings' : 'Salvar configurações',
    'pub-verify':        isEn ? 'Verify token' : 'Verificar token',
    'pub-forget-token':  isEn ? 'Forget token' : 'Esquecer token',
    'pub-export-all':    isEn ? 'Export JSON files' : 'Exportar arquivos JSON',
    'pub-publish':       isEn ? 'Publish to GitHub' : 'Publicar no GitHub',
    'sec-change':        isEn ? 'Change passphrase' : 'Alterar senha',
    'sec-lock':          isEn ? 'Lock session' : 'Bloquear sessão',
  };
  Object.keys(publishLabels).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = publishLabels[id];
  });

  // Language-mode chips + unsaved badge + composer strings
  const bothChip = document.getElementById('langmode-both');
  if (bothChip) bothChip.textContent = isEn ? 'Both' : 'Ambos';
  const dirtyText = document.getElementById('dirty-badge-text');
  if (dirtyText) dirtyText.textContent = isEn ? 'Unsaved changes' : 'Alterações não salvas';

  const setPh = (id, ph) => {
    const el = document.getElementById(id);
    if (el) el.placeholder = ph;
  };
  setPh('composer-trigger-pt', 'Escreva uma novidade… (o que mudou no projeto?)');
  setPh('composer-trigger-en', 'Share an update… (what changed in the project?)');

  const postBtn = document.getElementById('composer-post');
  if (postBtn) postBtn.textContent = isEn ? 'Post update' : 'Publicar novidade';
  const compHint = document.getElementById('composer-hint');
  if (compHint) compHint.textContent = isEn
    ? 'Date and id are generated automatically.'
    : 'Data e id são gerados automaticamente.';
  const compDrop = document.getElementById('composer-drop');
  if (compDrop) compDrop.textContent = isEn
    ? 'Drag an image here or click to choose'
    : 'Arraste uma imagem aqui ou clique para escolher';

  // Sidebar back link
  const back = document.getElementById('back-to-site-link');
  if (back) {
    back.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform:scaleX(-1)">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
      ${isEn ? 'Back to Live Site' : 'Voltar ao Portfólio'}
    `;
  }
}

// ── Escape HTML strings helpers ──────────────────────────────
// Full context escape: safe in element content AND in attribute values.
// (Escaping only quotes allowed `<img onerror>` payloads via published
//  content JSON to break out of attribute context — see red-team audit.)
function _esc(str) {
  return (str === undefined || str === null ? '' : String(str))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** URL allowlist for previews/attributes — mirrors the public renderers. */
function _sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const u = url.trim();
  if (/^(https?:\/\/|data:image\/)/i.test(u) || u.startsWith('assets/')) return u;
  return '';
}
