/**
 * DOM utils — Pure helper functions for DOM manipulation.
 * ARCcC: utils/dom/index.js
 */

const DOMUtils = (() => {

  /**
   * Shorthand querySelector.
   * @param {string} selector
   * @param {Element} [context=document]
   */
  const $ = (selector, context = document) => context.querySelector(selector);

  /**
   * Shorthand querySelectorAll → Array.
   * @param {string} selector
   * @param {Element} [context=document]
   */
  const $$ = (selector, context = document) =>
    Array.from(context.querySelectorAll(selector));

  /**
   * Create an element with optional attributes and children.
   * @param {string} tag
   * @param {object} [attrs]
   * @param {...(string|Element)} children
   */
  function createElement(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class')    el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else                   el.setAttribute(k, v);
    });
    children.forEach((child) => {
      if (typeof child === 'string') el.appendChild(document.createTextNode(child));
      else if (child)                el.appendChild(child);
    });
    return el;
  }

  /**
   * Set text of an element by selector, silently if not found.
   * @param {string} selector
   * @param {string} text
   */
  function setText(selector, text) {
    const el = $(selector);
    if (el) el.textContent = text;
  }

  /**
   * Set innerHTML of an element by selector.
   * @param {string} selector
   * @param {string} html
   */
  function setHTML(selector, html) {
    const el = $(selector);
    if (el) el.innerHTML = html;
  }

  /**
   * Set attribute on element by selector.
   * @param {string} selector
   * @param {string} attr
   * @param {string} value
   */
  function setAttr(selector, attr, value) {
    const el = $(selector);
    if (el) el.setAttribute(attr, value);
  }

  /**
   * Throttle a function call.
   * @param {Function} fn
   * @param {number}   delay  ms
   */
  function throttle(fn, delay) {
    let lastCall = 0;
    return function (...args) {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        fn.apply(this, args);
      }
    };
  }

  /**
   * Debounce a function call.
   * @param {Function} fn
   * @param {number}   delay ms
   */
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  return Object.freeze({ $, $$, createElement, setText, setHTML, setAttr, throttle, debounce });
})();
