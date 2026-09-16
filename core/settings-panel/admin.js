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
  _populateFields(_config);
  _populateStudioFields(_studioContent);
  _bindColorSync();
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

  artworks.forEach((art, i) => {
    container.appendChild(_buildArtworkCard(art, i));
  });

  // "Add artwork" button at the end of the list
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.id = 'btn-add-artwork';
  addBtn.className = 'admin-btn artwork-add-btn';
  addBtn.textContent = I18n.getLang() === I18n.LANGUAGES.PT
    ? '+ Adicionar obra'
    : '+ Add artwork';
  addBtn.addEventListener('click', () => {
    const card = _buildArtworkCard({
      title: { en: '', pt: '' },
      category: { en: '', pt: '' },
      description: { en: '', pt: '' },
      imageUrl: '',
      nsfw: false,
    }, container.querySelectorAll('.artwork-editor-card').length);
    container.insertBefore(card, addBtn);
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  container.appendChild(addBtn);
}

function _buildArtworkCard(art, i) {
  const card = document.createElement('div');
  card.className = 'artwork-editor-card';
  card.dataset.index = i;

  const titleEn = art.title?.en || art.title || '';
  const titlePt = art.title?.pt || art.title || '';
  const catEn   = art.category?.en || art.category || '';
  const catPt   = art.category?.pt || art.category || '';
  const descEn  = art.description?.en || art.description || '';
  const descPt  = art.description?.pt || art.description || '';
  // Preview only renders allowlisted URLs (same policy as the gallery)
  const safePreview = _sanitizeUrl(art.imageUrl || '');

  card.innerHTML = `
      <div class="artwork-preview-box">
        ${safePreview ? `<img src="${_esc(safePreview)}" alt="Preview" />` : '<span class="no-img">No Image</span>'}
      </div>
      <div class="artwork-editor-fields">
        <div class="field-group">
          <label class="admin-label">Title (EN)</label>
          <input class="admin-input art-title-en" type="text" value="${_esc(titleEn)}" />
        </div>
        <div class="field-group">
          <label class="admin-label">Title (PT)</label>
          <input class="admin-input art-title-pt" type="text" value="${_esc(titlePt)}" />
        </div>
        <div class="field-group">
          <label class="admin-label">Category (EN)</label>
          <input class="admin-input art-cat-en" type="text" value="${_esc(catEn)}" />
        </div>
        <div class="field-group">
          <label class="admin-label">Category (PT)</label>
          <input class="admin-input art-cat-pt" type="text" value="${_esc(catPt)}" />
        </div>
        <div class="field-group full">
          <label class="admin-label">Image Path</label>
          <input class="admin-input art-img" type="text" value="${_esc(art.imageUrl)}" />
        </div>
        <div class="field-group">
          <label class="admin-label">Description (EN)</label>
          <textarea class="admin-textarea art-desc-en">${_esc(descEn)}</textarea>
        </div>
        <div class="field-group">
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

    imgInput.addEventListener('input', () => {
      const preview = card.querySelector('.artwork-preview-box');
      const safeUrl = _sanitizeUrl(imgInput.value.trim());
      if (safeUrl) {
        preview.innerHTML = `<img src="${_esc(safeUrl)}" alt="Preview" />`;
      } else {
        preview.innerHTML = '<span class="no-img">No Image</span>';
      }
      updateWarning();
    });

    nsfwCheck.addEventListener('change', updateWarning);

    // Remove button (bottom-right of each card)
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'admin-btn artwork-remove-btn';
    removeBtn.textContent = I18n.getLang() === I18n.LANGUAGES.PT
      ? '✕ Remover obra'
      : '✕ Remove artwork';
    removeBtn.addEventListener('click', () => {
      card.remove();
      if (!_gridHasAddButton()) _ensureAddButton();
    });
    card.querySelector('.artwork-editor-fields').appendChild(removeBtn);

    // Run check on load
    updateWarning();

    return card;
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
    ? 'Nenhuma obra. Use o botão abaixo para adicionar.'
    : 'No artworks yet. Use the button below to add one.';
  container.appendChild(emptyNote);
  _buildArtworksGridAddOnly();
}

/** Rebuild just the add button (after all cards were removed). */
function _buildArtworksGridAddOnly() {
  const container = document.getElementById('s-artworks-list');
  if (!container) return;
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.id = 'btn-add-artwork';
  addBtn.className = 'admin-btn artwork-add-btn';
  addBtn.textContent = I18n.getLang() === I18n.LANGUAGES.PT
    ? '+ Adicionar obra'
    : '+ Add artwork';
  addBtn.addEventListener('click', () => {
    const card = _buildArtworkCard({
      title: { en: '', pt: '' },
      category: { en: '', pt: '' },
      description: { en: '', pt: '' },
      imageUrl: '',
      nsfw: false,
    }, 0);
    const existing = container.querySelector('#btn-add-artwork');
    container.insertBefore(card, existing);
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  container.appendChild(addBtn);
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

  // Save button — local preview only (localStorage), never the repository
  document.getElementById('admin-save-btn').addEventListener('click', () => {
    const nextConfig = _readFields(originalConfig);
    SettingsPersistence.save(nextConfig);

    const content = _collectContent();
    ContentLoader.setOverride('site',   content.site);
    ContentLoader.setOverride('art',    content.art);
    ContentLoader.setOverride('studio', content.studio);

    Publisher.refreshStatus();

    alert(isEn()
      ? 'Saved locally! Open the Publish & Security tab to make it public, or refresh the site to preview.'
      : 'Salvo localmente! Abra a aba Publicar & Segurança para tornar público, ou atualize o site para pré-visualizar.');
  });

  // Export button — downloads config.js (works even without a token)
  document.getElementById('admin-export-btn').addEventListener('click', () => {
    const nextConfig = _readFields(originalConfig);
    SettingsExporter.exportAsJS(nextConfig);
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
