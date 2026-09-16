/**
 * Hero Animator — Particle canvas + typewriter effect.
 * ARCcC: core/hero/private/animator/index.js
 */

const HeroAnimator = (() => {

  let _canvas   = null;
  let _ctx      = null;
  let _particles= [];
  let _raf      = null;
  let _taglines = [];
  let _taglineIndex = 0;
  let _typewriterTimer = null;

  const PARTICLE_COUNT = 60;

  /**
   * Initialize canvas particle system + typewriter.
   * @param {string[]} taglineVariants — array of tagline strings to cycle
   */
  function init(taglineVariants) {
    _taglines = taglineVariants.length > 0 ? taglineVariants : ['Digital Artist'];
    _initCanvas();
    _initParticles();
    _startLoop();
    _startTypewriter();
  }

  function updateTaglines(taglineVariants) {
    _taglines = taglineVariants;
    _taglineIndex = 0;
  }

  // ── Canvas ────────────────────────────────────────────────

  function _initCanvas() {
    _canvas = document.getElementById('hero-canvas');
    if (!_canvas) return;
    _ctx = _canvas.getContext('2d');
    _resize();
    window.addEventListener('resize', DOMUtils.throttle(_resize, 200));
  }

  function _resize() {
    if (!_canvas) return;
    _canvas.width  = window.innerWidth;
    _canvas.height = window.innerHeight;
    // Re-scatter particles on resize
    if (_particles.length) _initParticles();
  }

  function _initParticles() {
    _particles = Array.from({ length: PARTICLE_COUNT }, () => _createParticle());
  }

  function _createParticle(x, y) {
    return {
      x:   x ?? Math.random() * (window.innerWidth  || 1200),
      y:   y ?? Math.random() * (window.innerHeight || 800),
      vx:  (Math.random() - 0.5) * 0.25,
      vy:  (Math.random() - 0.5) * 0.25,
      r:   Math.random() * 1.5 + 0.3,
      a:   Math.random() * 0.5 + 0.1,
    };
  }

  function _startLoop() {
    if (_raf) cancelAnimationFrame(_raf);

    function loop() {
      _raf = requestAnimationFrame(loop);
      if (!_ctx || !_canvas) return;

      _ctx.clearRect(0, 0, _canvas.width, _canvas.height);

      // Read accent color dynamically from CSS (supports theme changes)
      const accentRaw = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-accent').trim() || '#FF3EA5';

      _particles.forEach((p) => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = _canvas.width;
        if (p.x > _canvas.width) p.x = 0;
        if (p.y < 0) p.y = _canvas.height;
        if (p.y > _canvas.height) p.y = 0;

        // Draw — use hex color with alpha via globalAlpha
        _ctx.save();
        _ctx.globalAlpha = p.a;
        _ctx.beginPath();
        _ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        _ctx.fillStyle = accentRaw;
        _ctx.fill();
        _ctx.restore();
      });

      // Draw connection lines between nearby particles
      _drawConnections(accentRaw);
    }

    loop();
  }

  function _drawConnections(accentHex) {
    const maxDist = 120;
    for (let i = 0; i < _particles.length; i++) {
      for (let j = i + 1; j < _particles.length; j++) {
        const dx = _particles[i].x - _particles[j].x;
        const dy = _particles[i].y - _particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.1;
          _ctx.save();
          _ctx.globalAlpha = alpha;
          _ctx.beginPath();
          _ctx.moveTo(_particles[i].x, _particles[i].y);
          _ctx.lineTo(_particles[j].x, _particles[j].y);
          _ctx.strokeStyle = accentHex || '#FF3EA5';
          _ctx.lineWidth = 0.5;
          _ctx.stroke();
          _ctx.restore();
        }
      }
    }
  }

  // ── Typewriter ────────────────────────────────────────────

  function _startTypewriter() {
    const el = document.getElementById('hero-tagline');
    if (!el || _taglines.length === 0) return;

    let charIndex = 0;
    let isDeleting = false;
    let currentText = '';
    const TYPING_SPEED  = 60;
    const DELETE_SPEED  = 35;
    const PAUSE_AFTER   = 2400;
    const PAUSE_BEFORE  = 400;

    function tick() {
      const target = _taglines[_taglineIndex];

      if (!isDeleting) {
        currentText = target.slice(0, ++charIndex);
        el.textContent = currentText;

        if (charIndex === target.length) {
          // Pause then start deleting (only if multiple taglines)
          if (_taglines.length > 1) {
            _typewriterTimer = setTimeout(() => {
              isDeleting = true;
              tick();
            }, PAUSE_AFTER);
            return;
          } else {
            return; // Single tagline — just display
          }
        }
      } else {
        currentText = target.slice(0, --charIndex);
        el.textContent = currentText;

        if (charIndex === 0) {
          isDeleting = false;
          _taglineIndex = (_taglineIndex + 1) % _taglines.length;
          _typewriterTimer = setTimeout(tick, PAUSE_BEFORE);
          return;
        }
      }

      _typewriterTimer = setTimeout(tick, isDeleting ? DELETE_SPEED : TYPING_SPEED);
    }

    tick();
  }

  function destroy() {
    if (_raf) cancelAnimationFrame(_raf);
    if (_typewriterTimer) clearTimeout(_typewriterTimer);
    window.removeEventListener('resize', _resize);
  }

  return Object.freeze({ init, updateTaglines, destroy });
})();
