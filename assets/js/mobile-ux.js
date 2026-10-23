/*
 * Phone-only behaviours for the homepage. Desktop is not modified.
 */
(() => {
  "use strict";
  if (!window.matchMedia("(max-width: 700px)").matches) return;

  const archiveLabel = document.querySelector(".blog-heading-index.blog-archive-link small");
  if (archiveLabel) archiveLabel.textContent = "VIEW ALL BLOGS";

  const steps = [...document.querySelectorAll("#approach .process-step")];
  if (!steps.length) return;

  let activeStep = null;
  let manualStep = null;
  let manuallyClosedStep = null;
  let lastScrollY = window.scrollY;
  let scrollFrame = 0;

  const render = () => {
    const selected = manualStep || (activeStep !== manuallyClosedStep ? activeStep : null);
    steps.forEach(step => {
      const expanded = step === selected;
      step.classList.toggle("is-mobile-active", expanded);
      const button = step.querySelector(".process-step-toggle");
      if (button) {
        button.setAttribute("aria-expanded", String(expanded));
        button.textContent = expanded ? "HIDE DETAILS" : "READ DETAILS";
      }
    });
  };

  steps.forEach((step, index) => {
    const heading = step.querySelector("h3");
    if (!heading) return;
    const button = document.createElement("button");
    button.className = "process-step-toggle";
    button.type = "button";
    button.textContent = "READ DETAILS";
    button.setAttribute("aria-expanded", "false");
    const paragraph = step.querySelector("p");
    if (paragraph) {
      paragraph.id = `approach-detail-${index + 1}`;
      button.setAttribute("aria-controls", paragraph.id);
    }
    heading.insertAdjacentElement("afterend", button);
    button.addEventListener("click", () => {
      if (manualStep === step || (manualStep === null && activeStep === step && manuallyClosedStep !== step)) {
        manualStep = null;
        manuallyClosedStep = step;
      } else {
        manualStep = step;
        manuallyClosedStep = null;
      }
      render();
    });
  });

  // The nearest card expands near the viewport centre; leaving that zone contracts it,
  // including while scrolling upward. Only the three approach cards are measured.
  const updateFromScroll = () => {
    scrollFrame = 0;
    const currentY = window.scrollY;
    if (Math.abs(currentY - lastScrollY) > 2) {
      manualStep = null;
      manuallyClosedStep = null;
    }
    lastScrollY = currentY;

    const viewportCenter = window.innerHeight / 2;
    let nearest = null;
    let nearestDistance = Infinity;
    steps.forEach(step => {
      const rect = step.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = step;
      }
    });
    activeStep = nearestDistance <= window.innerHeight * 0.31 ? nearest : null;
    render();
  };

  window.addEventListener("scroll", () => {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateFromScroll);
  }, { passive: true });
  window.addEventListener("resize", updateFromScroll, { passive: true });
  updateFromScroll();
})();
