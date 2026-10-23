/*
 * Fit the existing 64-column ASCII dissolve to the actual available width.
 * Uses ResizeObserver so fold/unfold, rotation, split-screen and browser
 * viewport changes are handled without device-specific breakpoints.
 */
(() => {
  "use strict";

  const heading = document.querySelector(".hero-title-dissolve");
  const output = heading?.querySelector(".ascii-dissolve-output");
  if (!heading || !output) return;

  const mobile = window.matchMedia("(max-width: 700px)");
  if (!mobile.matches) return; // Desktop keeps its existing design.

  const COLS = 64;
  const MONOSPACE_ADVANCE = 0.602; // Typical CSS monospace glyph advance in em.
  const MIN_FONT = 7;
  const MAX_FONT = 22;
  let observer = null;
  let frame = 0;

  function fit() {
    frame = 0;
    if (!mobile.matches) {
      heading.style.removeProperty("--ascii-responsive-font-size");
      return;
    }

    // Measure the actual inner width, not device pixels or reported DPI.
    const rect = heading.getBoundingClientRect();
    const styles = getComputedStyle(heading);
    const horizontalPadding =
      parseFloat(styles.paddingLeft || "0") +
      parseFloat(styles.paddingRight || "0");
    const available = Math.max(0, rect.width - horizontalPadding);
    if (!available) return;

    // The generated art has exactly 64 columns. Fit all columns to the real
    // content width; this naturally scales across compact and foldable phones.
    const rawSize = available / (COLS * MONOSPACE_ADVANCE);
    const fontSize = Math.max(MIN_FONT, Math.min(MAX_FONT, rawSize));
    heading.style.setProperty("--ascii-responsive-font-size", `${fontSize.toFixed(3)}px`);

    // Ensure the preformatted output uses the same width measurement.
    output.style.width = "100%";
    output.style.maxWidth = "100%";
  }

  const scheduleFit = () => {
    if (!frame) frame = requestAnimationFrame(fit);
  };

  if ("ResizeObserver" in window) {
    observer = new ResizeObserver(scheduleFit);
    observer.observe(heading);
  } else {
    window.addEventListener("resize", scheduleFit, { passive: true });
  }

  mobile.addEventListener?.("change", scheduleFit);
  window.addEventListener("orientationchange", scheduleFit, { passive: true });
  window.addEventListener("pageshow", scheduleFit);
  scheduleFit();
})();
