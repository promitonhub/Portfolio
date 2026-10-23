/*
 * Variable mobile font scaling intentionally disabled.
 * Mobile ASCII font size is controlled by assets/css/ascii-responsive-size.css
 * using a fixed 15px value. Preserve the original shaded ASCII renderer.
 */
(() => {
  "use strict";
  const heading = document.querySelector(".hero-title-dissolve");
  const output = heading?.querySelector(".ascii-dissolve-output");
  if (!heading || !output) return;
  heading.style.removeProperty("--ascii-responsive-font-size");
  output.style.removeProperty("font-size");
})();
