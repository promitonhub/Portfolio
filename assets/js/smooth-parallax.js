/* Smooth, low-amplitude scroll parallax shared by the portfolio and its CV/case-study documents.
   Native scrolling remains in control; only decorative/secondary layers use eased motion. */
(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const layers = [];
  const add = (selector, strength, opts = {}) => {
    document.querySelectorAll(selector).forEach((el, index) => {
      if (el.dataset.smoothParallaxReady === '1') return;
      if (el.closest('.case-overlay[hidden]')) return;
      el.dataset.smoothParallaxReady = '1';
      el.classList.add('smooth-parallax');
      layers.push({
        el,
        strength: typeof strength === 'function' ? strength(index, el) : strength,
        current: 0,
        target: 0,
      });
    });
  };

  // Portfolio: parallax only the visual/secondary layers, never large text blocks as a whole.
  add('.about-title', -10);
  add('.about-copy', 7);
  add('.about-facts', 5);
  add('.work-heading', -6);
  add('.project-art', (index) => (index % 2 ? -13 : 16));
  add('.home-system-map', -10);
  add('.work-note', 5);
  add('.approach-heading', 7);
  add('.process-step', (index) => (index % 2 ? -8 : 9));
  add('.approach-ghost', -13);
  add('.contact-giant', -8);
  add('.contact-stamp', 10);
  add('.contact-content', 4);

  // Case-study overlays/pages: artwork, section labels and diagrams drift at different depths.
  add('.case-hero-grid > div:first-child', 7);
  add('.case-deck', -6);
  add('.case-hero-visual', 16);
  add('.case-stat', (index) => (index % 2 ? -7 : 8));
  add('.case-section-label', -6);
  add('.case-section-body > h2', 5);
  add('.case-flow', 7);
  add('.case-monitor-grid', -8);
  add('.case-channel-grid', 6);
  add('.case-note', -5);
  add('.editorial-sheet', (index) => [-9, 7, -5][index % 3]);
  add('.response-sheet-grid, .response-focus, .event-visual, .posm-store-card', 8);

  // CV: small depth changes make the document feel alive while keeping it readable and stable.
  add('.cv-header-top', -4);
  add('.cv-section-heading', 4);
  add('.cv-job', (index) => (index % 2 ? -3.5 : 4.5));
  add('.cv-skill-group', (index) => (index % 2 ? -4 : 5));
  add('.cv-edu-item, .cv-cert-list', 3);

  if (!layers.length) return;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const strengthScale = isTouch ? 0.58 : 1;
  layers.forEach(layer => {
    layer.strength *= strengthScale;
    layer.el.style.setProperty('--smooth-parallax-y', '0px');
  });

  let frame = 0;
  let targetRefreshNeeded = true;
  const refreshTargets = () => {
    const viewportHeight = Math.max(1, window.innerHeight);
    layers.forEach(layer => {
      const rect = layer.el.getBoundingClientRect();
      // Remove the current transform from the measured rect to avoid feedback/drift.
      const naturalTop = rect.top - layer.current;
      const span = viewportHeight + Math.max(1, rect.height);
      const progress = clamp((viewportHeight - naturalTop) / span, 0, 1);
      const aroundCenter = (progress - 0.5) * 2;
      layer.target = clamp(-aroundCenter * layer.strength, -Math.abs(layer.strength), Math.abs(layer.strength));
    });
    targetRefreshNeeded = false;
  };

  const tick = () => {
    frame = 0;
    if (targetRefreshNeeded) refreshTargets();
    let moving = false;
    for (const layer of layers) {
      const delta = layer.target - layer.current;
      if (Math.abs(delta) > 0.08) {
        layer.current += delta * 0.16;
        moving = true;
      } else {
        layer.current = layer.target;
      }
      layer.el.style.setProperty('--smooth-parallax-y', `${layer.current.toFixed(2)}px`);
    }

    // Shift decorative pseudo-elements without moving text or the layout box.
    const hero = document.querySelector('.case-hero');
    if (hero) {
      const rect = hero.getBoundingClientRect();
      const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1);
      hero.style.setProperty('--smooth-hero-orbit-y', `${((progress - 0.5) * -24).toFixed(2)}px`);
    }
    const cvSheet = document.querySelector('.cv-sheet');
    if (cvSheet) {
      const rect = cvSheet.getBoundingClientRect();
      const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1);
      cvSheet.style.setProperty('--smooth-cv-grid-y', `${((progress - 0.5) * -10).toFixed(2)}px`);
    }
    if (moving || targetRefreshNeeded) frame = requestAnimationFrame(tick);
  };
  const queue = () => {
    targetRefreshNeeded = true;
    if (!frame) frame = requestAnimationFrame(tick);
  };

  // Initial state settles in on the first paint; scroll remains native and responsive.
  queue();
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  window.addEventListener('pageshow', queue, { passive: true });
  window.addEventListener('load', queue, { passive: true });
  if (document.fonts?.ready) document.fonts.ready.then(queue).catch(() => {});
})();
