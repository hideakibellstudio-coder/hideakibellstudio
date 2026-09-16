/**
 * Formatters — Pure data formatting utilities.
 * ARCcC: utils/formatters/index.js
 */

const Formatters = (() => {

  /**
   * Truncate a string to maxLength, appending ellipsis if needed.
   * @param {string} str
   * @param {number} maxLength
   */
  function truncate(str, maxLength = 100) {
    if (!str || str.length <= maxLength) return str;
    return str.slice(0, maxLength).trimEnd() + '…';
  }

  /**
   * Convert an accent hex color to CSS HSL string.
   * Used to compute dim/glow variants of the accent color.
   * @param {string} hex   e.g. '#c9a96e'
   * @returns {{ h: number, s: number, l: number }}
   */
  function hexToHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  /**
   * Generate CSS variables for a given accent color hex.
   * @param {string} hex
   * @returns {object} map of CSS variable names to values
   */
  function accentColorVars(hex) {
    const { h, s, l } = hexToHsl(hex);
    return {
      '--color-accent':      `hsl(${h}, ${s}%, ${l}%)`,
      '--color-accent-dim':  `hsla(${h}, ${s}%, ${l}%, 0.12)`,
      '--color-accent-glow': `hsla(${h}, ${s}%, ${l}%, 0.25)`,
    };
  }

  /**
   * Sanitize a plain-text string for safe DOM insertion (no HTML injection).
   * @param {string} str
   */
  function sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return Object.freeze({ truncate, hexToHsl, accentColorVars, sanitize });
})();
