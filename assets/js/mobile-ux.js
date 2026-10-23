/*
 * Phone-only corrective behaviour:
 * - leaves the existing ASCII dissolve responsible for its word loop
 * - removes the previously injected Approach auto-expansion controls
 * - does not change desktop behaviour
 */
(() => {
  "use strict";
  const isPhone = window.matchMedia("(max-width: 700px)").matches;
  if (!isPhone) return;

  const archiveLabel = document.querySelector(".blog-heading-index.blog-archive-link small");
  if (archiveLabel) archiveLabel.textContent = "VIEW ALL BLOGS";

  // Clean up controls/classes inserted by the earlier accordion implementation.
  document.querySelectorAll("#approach .process-step-toggle").forEach(button => button.remove());
  document.querySelectorAll("#approach .process-step").forEach(step => {
    step.classList.remove("is-mobile-active");
    step.querySelectorAll("p, .process-base").forEach(detail => {
      detail.style.removeProperty("max-height");
      detail.style.removeProperty("height");
      detail.style.removeProperty("margin");
      detail.style.removeProperty("padding");
      detail.style.removeProperty("overflow");
      detail.style.removeProperty("opacity");
      detail.style.removeProperty("visibility");
      detail.style.removeProperty("transition");
    });
  });
})();
