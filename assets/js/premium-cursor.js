(() => {
  const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!pointer.matches || reducedMotion.matches) return;
  if (document.querySelector(".premium-cursor")) return;

  const cursor = document.createElement("div");
  cursor.className = "premium-cursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML = "<span class=\"premium-cursor__dot\"></span><span class=\"premium-cursor__ring\"></span>";
  document.body.appendChild(cursor);

  const dot = cursor.querySelector(".premium-cursor__dot");
  const ring = cursor.querySelector(".premium-cursor__ring");
  let x = innerWidth / 2, y = innerHeight / 2;
  let ringX = x, ringY = y;
  let active = false;
  let visible = false;

  document.addEventListener("pointermove", event => {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    x = event.clientX;
    y = event.clientY;
    if (!visible) {
      visible = true;
      cursor.classList.add("is-visible");
    }
  }, { passive: true });

  document.addEventListener("pointerover", event => {
    const target = event.target.closest("a, button, [role=\"button\"], input, textarea, select, label, summary, [data-cursor=\"hover\"]");
    if (target) cursor.classList.add("is-hover");
  });

  document.addEventListener("pointerout", event => {
    const target = event.target.closest("a, button, [role=\"button\"], input, textarea, select, label, summary, [data-cursor=\"hover\"]");
    if (target && !target.contains(event.relatedTarget)) cursor.classList.remove("is-hover");
  });

  document.addEventListener("pointerdown", () => cursor.classList.add("is-pressed"));
  document.addEventListener("pointerup", () => cursor.classList.remove("is-pressed"));
  document.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
  document.addEventListener("mouseenter", () => {
    if (visible) cursor.classList.add("is-visible");
  });

  function animate() {
    ringX += (x - ringX) * 0.12;
    ringY += (y - ringY) * 0.12;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();
