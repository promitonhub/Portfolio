(() => {
  const root = document.documentElement;
  root.classList.add("js-ready");
  const progress = document.querySelector(".scroll-progress");
  const railPercent = document.querySelector("#rail-percent");
  const railChapters = [...document.querySelectorAll(".rail-chapter")];
  const toggle = document.querySelector(".theme-toggle");
  const themeIcon = document.querySelector(".theme-icon");
  const menuToggle = document.querySelector(".menu-toggle");
  const mobileNav = document.querySelector(".mobile-nav");
  const sections = [...document.querySelectorAll("main section[id]")];
  const navLinks = [...document.querySelectorAll('.desktop-nav a[href^="#"], .nav-contact[href^="#"], .mobile-nav a[href^="#"]')];
  const hero = document.querySelector(".hero");
  const heroStage = hero?.querySelector(".hero-stage");
  const heroTiles = [...document.querySelectorAll(".hero-tile[data-parallax]")];
  const heroAscii = document.querySelector(".hero-ascii-art");
  const asciiParticleLayer = hero?.querySelector(".hero-ascii-particles");
  const reduceMotion = window.portfolioShouldReduceMotion ? window.portfolioShouldReduceMotion() : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let asciiState = null;
  let asciiProgress = 0;
  let asciiResizeFrame = 0;

  // Theme preference is optional; page remains functional when storage is unavailable.
  try {
    const saved = localStorage.getItem("promit-theme");
    if (saved === "light" || saved === "dark") root.dataset.theme = saved;
  } catch (_) {}
  const updateThemeButton = () => {
    if (!themeIcon) return;
    const light = root.dataset.theme === "light";
    themeIcon.textContent = light ? "☼" : "◐";
    toggle?.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#f5f4ed" : "#0b0c0d");
  };
  updateThemeButton();
  toggle?.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    try { localStorage.setItem("promit-theme", root.dataset.theme); } catch (_) {}
    updateThemeButton();
    // Redraw the ASCII canvas immediately; its glyph tone differs between themes.
    if (asciiState) {
      asciiState.lastEased = -1;
      const eased = asciiProgress * asciiProgress * (3 - 2 * asciiProgress);
      drawAsciiCanvas(eased, true);
    }
    window.dispatchEvent(new CustomEvent("promit:themechange", { detail: { theme: root.dataset.theme } }));
  });

  // Accessible mobile navigation closes after following a link.
  menuToggle?.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!open));
    mobileNav?.classList.toggle("is-open", !open);
  });
  mobileNav?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    menuToggle?.setAttribute("aria-expanded", "false");
    mobileNav.classList.remove("is-open");
  }));

  // Deterministic helper: the scatter has stable destinations, so scrolling down and back
  // follows exactly the same path instead of re-rolling the glyphs on every frame.
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  // Keep source art and canvas scatter aligned when CSS zoom is applied.
  const getEffectiveCssZoom = (element) => {
    if (typeof element?.currentCSSZoom === "number" && Number.isFinite(element.currentCSSZoom) && element.currentCSSZoom > 0) {
      return element.currentCSSZoom;
    }
    let zoom = 1;
    for (let node = element; node; node = node.parentElement) {
      const value = Number.parseFloat(getComputedStyle(node).zoom);
      if (Number.isFinite(value) && value > 0) zoom *= value;
    }
    return zoom || 1;
  };
  const seededRandom = (seed) => {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // Render the whole ASCII scatter to one canvas instead of moving thousands of DOM nodes.
  // A canvas keeps the scroll-linked transformation on one drawing surface and avoids a
  // style/layout update for every character on every scroll frame.
  const drawAsciiCanvas = (eased, force = false) => {
    const state = asciiState;
    if (!state?.ctx || !state.canvas) return;
    if (!force && state.hasDrawn && Math.abs(eased - state.lastEased) < 0.00035) return;

    const { ctx, stageW, stageH, fontSize, fontFamily, lineHeight } = state;
    ctx.clearRect(0, 0, stageW, stageH);
    ctx.font = `400 ${fontSize}px ${fontFamily}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const themeStyles = getComputedStyle(root);
    const canvasInk = themeStyles.getPropertyValue("--ascii-ink").trim();
    const lightTheme = root.dataset.theme === "light";
    ctx.fillStyle = canvasInk || "#aabac7";
    // One alpha for the entire layer avoids thousands of per-glyph compositing changes.
    const baseAlpha = Number.parseFloat(themeStyles.getPropertyValue("--ascii-alpha-base")) || (lightTheme ? 0.34 : 0.43);
    const fadeAlpha = Number.parseFloat(themeStyles.getPropertyValue("--ascii-alpha-fade")) || (lightTheme ? 0.27 : 0.35);
    ctx.globalAlpha = Math.max(0, baseAlpha - eased * fadeAlpha);

    for (const glyph of state.glyphs) {
      const x = glyph.baseX + (glyph.targetX - glyph.baseX) * eased;
      const y = glyph.baseY + (glyph.targetY - glyph.baseY) * eased;
      // Keep fractional coordinates; rounding every position was a source of visible judder.
      ctx.fillText(glyph.character, x, y);
    }
    ctx.globalAlpha = 1;
    state.lastEased = eased;
    state.hasDrawn = true;
  };

  const updateAsciiScatter = (progress, force = false) => {
    const next = clamp(progress, 0, 1);
    const changed = Math.abs(next - asciiProgress) > 0.00001;
    asciiProgress = next;
    if (!asciiState || reduceMotion) return;
    if (!changed && !force && asciiState.hasDrawn) return;

    // Keep the background grid on a fixed cell size. Animating background-size forces
    // repainting a large patterned layer on every frame; opacity is much cheaper to animate.
    heroStage?.style.setProperty("--ascii-grid-opacity", (0.10 + next * 0.28).toFixed(3));
    const p = next;
    const eased = p * p * (3 - 2 * p);
    drawAsciiCanvas(eased, force);
  };

  const layoutAsciiScatter = () => {
    if (!heroStage || !heroAscii || !asciiParticleLayer || !asciiState || reduceMotion) return;

    // Fit the original portrait to the available window, preserving the tall glyph face
    // while preventing clipping if the layout is displayed at an enlarged scale.
    const artWindow = heroAscii.closest(".hero-ascii-wrap");
    if (artWindow) {
      if (!Number.isFinite(asciiState.baseFontSize) || asciiState.baseFontSize <= 0) {
        asciiState.baseFontSize = parseFloat(getComputedStyle(heroAscii).fontSize) || 9;
      }
      const availableW = Math.max(1, artWindow.clientWidth - 12);
      const availableH = Math.max(1, artWindow.clientHeight - 12);
      const currentFontSize = parseFloat(getComputedStyle(heroAscii).fontSize) || asciiState.baseFontSize;
      const restoreRatio = asciiState.baseFontSize / currentFontSize;
      const contentW = Math.max(1, (heroAscii.scrollWidth || heroAscii.offsetWidth || 1) * restoreRatio);
      const contentH = Math.max(1, (heroAscii.scrollHeight || heroAscii.offsetHeight || 1) * restoreRatio);
      const fitScale = Math.min(1, availableW / contentW, availableH / contentH);
      const fittedFontSize = asciiState.baseFontSize * fitScale;
      const priorFontSize = parseFloat(heroAscii.style.fontSize) || 0;
      if (!priorFontSize || Math.abs(priorFontSize - fittedFontSize) > 0.05) {
        heroAscii.style.fontSize = `${fittedFontSize.toFixed(3)}px`;
      }
    }

    const stageRect = heroStage.getBoundingClientRect();
    const artRect = heroAscii.getBoundingClientRect();
    const styles = getComputedStyle(heroAscii);
    const fontSize = parseFloat(styles.fontSize) || 9;
    const lineHeight = parseFloat(styles.lineHeight) || fontSize * 1.02;
    const cssZoom = getEffectiveCssZoom(heroStage);
    const stageW = heroStage.clientWidth;
    const stageH = heroStage.clientHeight;
    const originX = (artRect.left - stageRect.left) / cssZoom;
    const originY = (artRect.top - stageRect.top) / cssZoom;
    const cellW = (artRect.width / cssZoom) / asciiState.columns || fontSize * 0.602;
    const cellH = (artRect.height / cssZoom) / asciiState.rows || lineHeight;
    const dpr = Math.min((window.devicePixelRatio || 1) * cssZoom, 1.8);
    const canvas = asciiState.canvas;
    const ctx = asciiState.ctx;

    // Limit backing resolution so high-DPI screens don't turn each scroll frame into a
    // needlessly expensive multi-megapixel repaint.
    const backingW = Math.max(1, Math.round(stageW * dpr));
    const backingH = Math.max(1, Math.round(stageH * dpr));
    if (canvas.width !== backingW || canvas.height !== backingH) {
      canvas.width = backingW;
      canvas.height = backingH;
    }
    canvas.style.width = `${stageW}px`;
    canvas.style.height = `${stageH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    Object.assign(asciiState, {
      stageW, stageH, fontSize, lineHeight,
      fontFamily: styles.fontFamily,
      lastEased: -1,
      hasDrawn: false
    });

    const stepX = clamp(stageW / 155, 7.8, 11.2);
    const stepY = clamp(stageH / 68, 9.2, 12.8);
    const cols = Math.ceil(stageW / stepX);
    const rows = Math.ceil(stageH / stepY);
    const slots = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        slots.push({
          x: col * stepX + (stepX - cellW * 0.82) * 0.5,
          y: row * stepY + (stepY - lineHeight * 0.82) * 0.5
        });
      }
    }
    const random = seededRandom(0x50524F4D);
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    const chosen = slots.slice(0, asciiState.glyphs.length);
    asciiState.glyphs.forEach((glyph, index) => {
      glyph.baseX = originX + glyph.col * cellW;
      glyph.baseY = originY + glyph.row * cellH;
      const slot = chosen[index] || { x: random() * stageW, y: random() * stageH };
      glyph.targetX = slot.x;
      glyph.targetY = slot.y;
    });
    updateAsciiScatter(asciiProgress, true);
  };

  const setupAsciiScatter = () => {
    if (reduceMotion || !heroStage || !heroAscii || !asciiParticleLayer || asciiState) return;
    const rawText = heroAscii.textContent.replace(/\r/g, "");
    const lines = rawText.split("\n");
    if (lines.length && lines[lines.length - 1] === "") lines.pop();
    const columns = Math.max(1, ...lines.map(line => line.length));
    const glyphSpecs = [];

    // A single canvas replaces thousands of individually transformed span elements.
    const canvas = document.createElement("canvas");
    canvas.className = "hero-ascii-canvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.setAttribute("role", "presentation");
    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) return; // Leave the original preformatted art visible as a safe fallback.
    asciiParticleLayer.replaceChildren(canvas);

    lines.forEach((line, row) => {
      for (let col = 0; col < line.length; col++) {
        const character = line[col];
        if (/\s/.test(character)) continue;
        glyphSpecs.push({
          character, row, col,
          baseX: 0, baseY: 0, targetX: 0, targetY: 0
        });
      }
    });
    asciiState = {
      glyphs: glyphSpecs, rows: lines.length, columns,
      canvas, ctx, stageW: 0, stageH: 0,
      fontSize: 9, lineHeight: 9.2,
      baseFontSize: parseFloat(getComputedStyle(heroAscii).fontSize) || 9,
      fontFamily: '"Share Tech Mono", "DejaVu Sans Mono", "Liberation Mono", "Courier New", monospace',
      lastEased: -1, hasDrawn: false
    };
    heroStage.classList.add("ascii-enhanced");
    layoutAsciiScatter();
  };

  // Scroll-linked page ruler and glyph transition. The outer hero is a scroll track while
  // its inner scene remains sticky; the grid state is held until the scene leaves the track.
  let ticking = false;
  const updateScrollUI = () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pageProgress = clamp(window.scrollY / maxScroll, 0, 1);
    root.style.setProperty("--scroll-progress", pageProgress.toFixed(5));
    root.style.setProperty("--scroll-progress-pct", `${(pageProgress * 100).toFixed(3)}%`);
    if (railPercent) railPercent.textContent = String(Math.round(pageProgress * 100)).padStart(3, "0");

    if (hero && heroStage && !reduceMotion) {
      const scrollLength = Math.max(1, hero.offsetHeight - heroStage.offsetHeight);
      const scatterProgress = clamp(window.scrollY / scrollLength, 0, 1);
      hero.style.setProperty("--hero-scroll", scatterProgress.toFixed(3));
      heroTiles.forEach(tile => {
        const factor = Number(tile.dataset.parallax || 0);
        tile.style.setProperty("--scroll-shift", `${(-scatterProgress * window.innerHeight * factor).toFixed(1)}px`);
      });
      updateAsciiScatter(scatterProgress);
    }
    ticking = false;
  };
  const requestScrollUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateScrollUI);
  };
  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate, { passive: true });
  updateScrollUI();
  if (!reduceMotion) {
    const startAscii = () => {
      setupAsciiScatter();
      updateScrollUI();
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(startAscii).catch(startAscii);
    else startAscii();
    window.addEventListener("resize", () => {
      if (asciiResizeFrame) cancelAnimationFrame(asciiResizeFrame);
      asciiResizeFrame = requestAnimationFrame(() => {
        layoutAsciiScatter();
        updateScrollUI();
      });
    }, { passive: true });
  }

  // Content reveals only when each element enters the viewport, with a light stagger per card.
  // Case-study narrative and diagrams reveal on entry, so motion follows the reader rather than a timer.
  document.querySelectorAll('.case-content-section, .case-stats .case-stat, .case-monitor-card, .case-flow-item, .case-channel, .case-tags span, .case-section-body > h2, .case-section-body > h3, .case-note, .system-signal-band, .system-stage, .system-channels-panel, .system-channel, .system-outcome, .system-rfp-branch, .home-map-node, .home-channel-row > div, .home-crm-bar, .home-rfp-route, .system-stage-glyph, .rfp-cell, .ops-channels > div').forEach((el) => {
    if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', '');
  });
  const revealEls = [...document.querySelectorAll("[data-reveal]")];
  revealEls.forEach((el, index) => el.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 70}ms`));
  if ("IntersectionObserver" in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add("is-visible"));
  }

  // One canonical section map drives desktop navigation, mobile navigation, and the right rail.
  // Select the section crossing a fixed reading line. IntersectionObserver callbacks can arrive
  // in batches and briefly activate a neighbouring section while a tall hero is still in view.
  const setActiveSection = id => {
    navLinks.forEach(link => {
      const active = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    railChapters.forEach(chapter => chapter.classList.toggle("is-active", chapter.dataset.chapter === id));
  };

  const siteHeader = document.querySelector(".site-header");
  const getCurrentSectionId = () => {
    if (!sections.length) return "home";
    const headerHeight = siteHeader?.getBoundingClientRect().height || 54;
    // The reading line sits below the sticky header, inside the top third of the viewport.
    const readingLine = Math.min(window.innerHeight * 0.38, headerHeight + window.innerHeight * 0.22);
    let current = sections[0].id;
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= readingLine) current = section.id;
      if (rect.top <= readingLine && rect.bottom > readingLine) return section.id;
      if (rect.top > readingLine) break;
    }
    // At the very bottom, favour Contact even if the reading line has moved beyond its top.
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
      return sections[sections.length - 1].id;
    }
    return current;
  };

  let activeSectionFrame = 0;
  const updateActiveSection = () => {
    activeSectionFrame = 0;
    setActiveSection(getCurrentSectionId());
  };
  const queueActiveSectionUpdate = () => {
    if (activeSectionFrame) return;
    activeSectionFrame = requestAnimationFrame(updateActiveSection);
  };
  window.addEventListener("scroll", queueActiveSectionUpdate, { passive: true });
  window.addEventListener("resize", queueActiveSectionUpdate, { passive: true });
  window.addEventListener("hashchange", queueActiveSectionUpdate);
  window.addEventListener("pageshow", queueActiveSectionUpdate);
  updateActiveSection();

  // Pointer parallax adds a small responsive layer on desktop; scroll motion remains the main movement.
  if (hero && !reduceMotion && window.matchMedia("(pointer:fine)").matches) {
    let pointerFrame = 0;
    hero.addEventListener("pointermove", event => {
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      pointerFrame = requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        heroTiles.forEach((tile, index) => {
          const depth = (index % 3 + 1) * 1.3;
          tile.style.setProperty("--pointer-x", `${(x * depth).toFixed(1)}px`);
          tile.style.setProperty("--pointer-y", `${(y * depth).toFixed(1)}px`);
        });
        if (asciiParticleLayer) asciiParticleLayer.style.setProperty("--ascii-pointer-x", `${(x * -5).toFixed(1)}px`);
      });
    });
    hero.addEventListener("pointerleave", () => {
      heroTiles.forEach(tile => {
        tile.style.setProperty("--pointer-x", "0px");
        tile.style.setProperty("--pointer-y", "0px");
      });
      if (asciiParticleLayer) asciiParticleLayer.style.setProperty("--ascii-pointer-x", "0px");
    });
  }

  const year = document.querySelector("#year");
  if (year) year.textContent = new Date().getFullYear();
})();
