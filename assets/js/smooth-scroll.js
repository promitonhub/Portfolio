/* Site-wide Lenis smooth scrolling. The library respects prefers-reduced-motion. */
(() => {
  if (!window.Lenis || window.portfolioLenis) return;

  const lenis = new window.Lenis({
    autoRaf: true,
    anchors: true,
    smoothWheel: true,
    lerp: 0.085,
    wheelMultiplier: 0.9,
    touchMultiplier: 1
  });

  // Expose one instance so existing UI (notably the document overlay) can pause it.
  window.portfolioLenis = lenis;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      lenis.stop();
    } else if (!document.body.classList.contains('case-overlay-open')) {
      lenis.start();
    }
  });

  window.addEventListener('pagehide', () => lenis.stop());
  window.addEventListener('pageshow', () => {
    if (!document.hidden && !document.body.classList.contains('case-overlay-open')) lenis.start();
  });
})();
