/*
 * Fit the ASCII animation by measuring the actual browser font metrics.
 * Keeps every one of the 64 columns at the same width; handles fold/unfold,
 * rotation, split-screen and browser viewport resizing.
 */
(() => {
  "use strict";
  const heading = document.querySelector(".hero-title-dissolve");
  const output = heading?.querySelector(".ascii-dissolve-output");
  if (!heading || !output) return;

  const phone = window.matchMedia("(max-width: 700px)");
  if (!phone.matches) return;

  const COLS = 64;
  const MIN_FONT = 5;
  const MAX_FONT = 30;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  let frame = 0;
  let lastWidth = -1;
  let lastFont = -1;

  function measuredAdvance(fontSize) {
    if (!ctx) return fontSize * 0.602;
    const family = getComputedStyle(output).fontFamily;
    ctx.font = `${fontSize}px ${family}`;
    return ctx.measureText("M").width;
  }

  function fit() {
    frame = 0;
    if (!phone.matches) {
      heading.style.removeProperty("--ascii-responsive-font-size");
      return;
    }

    const available = heading.getBoundingClientRect().width;
    if (!Number.isFinite(available) || available <= 0) return;
    if (Math.abs(available - lastWidth) < 0.5 && lastFont > 0) return;

    // Measure the browser's actual glyph advance at 1 CSS px, then solve:
    // font size = available width / (64 columns × glyph advance at 1px).
    const advanceAtOnePx = measuredAdvance(1);
    if (!advanceAtOnePx) return;
    const exact = available / (COLS * advanceAtOnePx);
    const fontSize = Math.max(MIN_FONT, Math.min(MAX_FONT, exact));

    heading.style.setProperty("--ascii-responsive-font-size", `${fontSize.toFixed(4)}px`);
    output.style.width = "max-content";
    output.style.maxWidth = "none";
    lastWidth = available;
    lastFont = fontSize;
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(fit);
  }

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(schedule);
    observer.observe(heading);
  } else {
    window.addEventListener("resize", schedule, { passive: true });
  }

  phone.addEventListener?.("change", schedule);
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule);
  if (document.fonts?.ready) document.fonts.ready.then(schedule);
  schedule();
})();
