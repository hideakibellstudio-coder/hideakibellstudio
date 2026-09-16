/**
 * Social Links Renderer — Renders social network link buttons.
 * ARCcC: core/contact/private/social-links/index.js
 */

const SocialLinksRenderer = (() => {

  const SOCIAL_META = {
    instagram:  { label: 'Instagram',  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>' },
    behance:    { label: 'Behance',    icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M7.799 5.698c.589 0 1.12.051 1.606.156.482.105.894.273 1.241.508.344.235.612.543.804.924.19.381.284.839.284 1.373 0 .59-.135 1.09-.406 1.495-.272.404-.67.736-1.198.993.72.207 1.259.57 1.614 1.09.354.517.532 1.14.532 1.865 0 .59-.115 1.107-.348 1.548-.231.441-.548.81-.951 1.104-.404.293-.874.515-1.41.665-.537.148-1.102.225-1.697.225H0V5.698h7.799zM7.4 10.474c.483 0 .878-.114 1.186-.343.308-.229.46-.583.46-1.063 0-.27-.047-.494-.144-.675-.096-.181-.228-.327-.397-.44-.169-.112-.364-.195-.582-.246-.218-.051-.45-.077-.698-.077H2.93v2.844H7.4zm.217 4.582c.271 0 .524-.028.762-.084.237-.055.445-.146.623-.27.178-.125.318-.29.42-.494.102-.206.152-.461.152-.764 0-.609-.17-1.048-.511-1.319-.341-.271-.792-.407-1.353-.407H2.93v3.338h4.687zm9.31-.88c.33.32.806.481 1.428.481.446 0 .83-.112 1.153-.334.322-.223.52-.457.594-.704h2.529c-.406 1.265-1.027 2.176-1.862 2.731-.836.555-1.843.833-3.021.833-.82 0-1.563-.13-2.228-.393-.665-.262-1.233-.635-1.702-1.118-.469-.483-.832-1.061-1.091-1.733-.258-.672-.388-1.411-.388-2.216 0-.782.131-1.51.393-2.182.261-.672.63-1.25 1.104-1.733.474-.483 1.042-.862 1.705-1.135.664-.273 1.39-.41 2.178-.41.884 0 1.664.171 2.337.511.673.341 1.228.8 1.661 1.378.433.578.75 1.245.947 2.001.198.756.271 1.553.22 2.39H16.57c.045.697.327 1.239.657 1.559zm2.501-4.254c-.266-.292-.686-.438-1.259-.438-.37 0-.675.062-.912.188-.237.124-.43.277-.575.456-.145.18-.247.375-.305.585-.058.21-.092.406-.101.588h3.743c-.099-.603-.325-1.087-.591-1.379zM16.532 7h5.317v1.361h-5.317V7z"/></svg>' },
    artstation: { label: 'ArtStation', icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M0 17.723l2.027 3.505h.001a2.424 2.424 0 002.164 1.333h13.457l-2.792-4.838H0zm24 .025c0-.484-.143-.935-.388-1.314L15.728 2.728a2.424 2.424 0 00-2.164-1.333H9.044L21.616 22.25l1.96-3.393c.268-.463.424-.927.424-1.108zm-11.52-3.505H4.99l-4.016 6.975H8.507l3.973-6.975z"/></svg>' },
    twitter:    { label: 'Twitter/X',  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' },
    youtube:    { label: 'YouTube',    icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>' },
  };

  /**
   * Render social links into the container.
   * @param {object} social  — config.social
   */
  function render(social) {
    const container = document.getElementById('contact-socials');
    if (!container) return;

    container.innerHTML = '';
    let hasLinks = false;

    Object.entries(SOCIAL_META).forEach(([key, meta]) => {
      const href = social[key];
      if (!href) return;

      hasLinks = true;
      const link = document.createElement('a');
      link.className = 'social-link';
      link.href       = href;
      link.target     = '_blank';
      link.rel        = 'noopener noreferrer';
      link.setAttribute('aria-label', meta.label);
      link.innerHTML  = `${meta.icon}<span>${meta.label}</span>`;
      container.appendChild(link);
    });

    // Show/hide container based on whether links exist
    const wrapper = document.getElementById('contact-socials-wrapper');
    if (wrapper) wrapper.style.display = hasLinks ? '' : 'none';
  }

  return Object.freeze({ render });
})();
