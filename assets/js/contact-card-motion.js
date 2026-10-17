(() => {
  const card = document.querySelector(".contact-panel");
  if (!card) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (reducedMotion.matches || !finePointer.matches) return;

  let bounds = null;
  let point = null;
  let raf = 0;

  const reset = () => {
    point = null;
    bounds = null;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    card.classList.remove("is-tilting");
    card.style.removeProperty("transform");
    card.style.setProperty("--contact-glow-x", "50%");
    card.style.setProperty("--contact-glow-y", "50%");
  };

  const render = () => {
    raf = 0;
    if (!point || !bounds || bounds.width <= 0 || bounds.height <= 0) return;

    const x = Math.max(0, Math.min(1, (point.x - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (point.y - bounds.top) / bounds.height));

    // Keep the perspective gentle: a maximum of about ±2.2° horizontally and ±1.8° vertically.
    const rotateY = (x - 0.5) * 4.4;
    const rotateX = (0.5 - y) * 3.6;
    card.style.transform = `perspective(1350px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.006, 1.006, 1.006)`;
    card.style.setProperty("--contact-glow-x", `${(x * 100).toFixed(1)}%`);
    card.style.setProperty("--contact-glow-y", `${(y * 100).toFixed(1)}%`);
  };

  card.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "touch" || reducedMotion.matches || !finePointer.matches) return;
    bounds = card.getBoundingClientRect();
    card.classList.add("is-tilting");
    point = { x: event.clientX, y: event.clientY };
    if (!raf) raf = requestAnimationFrame(render);
  });

  card.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || !card.classList.contains("is-tilting")) return;
    point = { x: event.clientX, y: event.clientY };
    if (!raf) raf = requestAnimationFrame(render);
  });

  card.addEventListener("pointerleave", reset);
  card.addEventListener("pointercancel", reset);
  window.addEventListener("blur", reset);

  // If the browser's motion or input preferences change mid-session, return to the base card.
  reducedMotion.addEventListener?.("change", event => { if (event.matches) reset(); });
  finePointer.addEventListener?.("change", event => { if (!event.matches) reset(); });
})();
