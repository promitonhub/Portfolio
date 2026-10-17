(() => {
  "use strict";
  const carousel = document.querySelector("[data-blog-carousel]");
  if (!carousel) return;
  const viewport = carousel.querySelector("[data-blog-viewport]");
  const track = carousel.querySelector("[data-blog-track]");
  const group = carousel.querySelector("[data-blog-group]");
  const emptyCard = carousel.querySelector("[data-blog-empty]");
  const status = carousel.querySelector("[data-blog-status]");
  const toggle = carousel.querySelector("[data-blog-motion-toggle]");
  if (!viewport || !track || !group || !emptyCard || !status || !toggle) return;

  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sourceCards = Array.from(group.querySelectorAll(":scope > .blog-card[data-blog-post]"));
  const cleanCopy = (node) => {
    node.setAttribute("aria-hidden", "true");
    node.setAttribute("inert", "");
    if ("inert" in node) node.inert = true;
    node.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    node.querySelectorAll("a, button, input, select, textarea, [tabindex]").forEach((el) => el.setAttribute("tabindex", "-1"));
    return node;
  };

  if (sourceCards.length === 0) {
    carousel.dataset.state = "empty";
    carousel.dataset.paused = "true";
    toggle.hidden = true;
    status.innerHTML = 'POST INDEX / 00 <span>—</span> NO ARTICLES PUBLISHED YET';
    return;
  }

  const authoredCards = sourceCards.map((card) => card.cloneNode(true));
  let resizeFrame = 0;
  let rebuildFrame = 0;
  let pausedByUser = false;

  const setUserPause = (paused) => {
    pausedByUser = paused;
    carousel.dataset.paused = String(paused);
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", paused ? "Resume automatic blog scrolling" : "Pause automatic blog scrolling");
    toggle.innerHTML = paused ? 'RESUME MOTION <span aria-hidden="true">↗</span>' : 'PAUSE MOTION <span aria-hidden="true">Ⅱ</span>';
  };

  const build = () => {
    track.replaceChildren();
    const firstGroup = document.createElement("div");
    firstGroup.className = "blog-carousel-group";
    firstGroup.setAttribute("data-blog-group", "");
    authoredCards.forEach((card) => firstGroup.appendChild(card.cloneNode(true)));
    track.appendChild(firstGroup);

    // Decoratively repeat cards enough to fill even wide screens; these copies are inert.
    const reduced = motionPreference.matches;
    const startCount = firstGroup.children.length;
    let repeatIndex = 0;
    while (!reduced && firstGroup.getBoundingClientRect().width < viewport.clientWidth + 360 && repeatIndex < 40) {
      firstGroup.appendChild(cleanCopy(authoredCards[repeatIndex % startCount].cloneNode(true)));
      repeatIndex += 1;
    }

    if (reduced) {
      carousel.dataset.state = "static";
      carousel.dataset.paused = "true";
      toggle.hidden = true;
      status.innerHTML = `POST INDEX / ${String(authoredCards.length).padStart(2, "0")} <span>—</span> REDUCED MOTION / SWIPE TO EXPLORE`;
      return;
    }

    const secondGroup = cleanCopy(firstGroup.cloneNode(true));
    secondGroup.removeAttribute("data-blog-group");
    secondGroup.setAttribute("data-blog-clone", "");
    track.appendChild(secondGroup);
    const groupWidth = firstGroup.getBoundingClientRect().width;
    track.style.setProperty("--blog-loop-duration", `${Math.max(28, groupWidth / 37).toFixed(1)}s`);
    carousel.dataset.state = "ready";
    toggle.hidden = false;
    setUserPause(pausedByUser);
    status.innerHTML = `POST INDEX / ${String(authoredCards.length).padStart(2, "0")} <span>—</span> ${authoredCards.length === 1 ? "1 ARTICLE" : `${authoredCards.length} ARTICLES`} / IN A CONTINUOUS LOOP`;
  };

  toggle.addEventListener("click", () => setUserPause(!pausedByUser));
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) carousel.dataset.inview = String(entry.isIntersecting);
    }, { threshold: 0.03 });
    observer.observe(carousel);
  }
  document.addEventListener("visibilitychange", () => {
    carousel.dataset.pageHidden = String(document.hidden);
  });

  const scheduleBuild = () => {
    if (rebuildFrame) cancelAnimationFrame(rebuildFrame);
    rebuildFrame = requestAnimationFrame(() => { rebuildFrame = 0; build(); });
  };
  window.addEventListener("resize", () => {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(scheduleBuild);
  }, { passive: true });
  motionPreference.addEventListener?.("change", scheduleBuild);
  build();
})();
