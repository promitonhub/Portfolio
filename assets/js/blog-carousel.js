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
  const bottom = carousel.querySelector(".blog-carousel-bottom");
  if (!viewport || !track || !group || !emptyCard || !status || !toggle || !bottom) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const MAX_POSTS = 999;
  // BLOG CAROUSEL EDGE-RECYCLE BUFFER V1
  const VISIBLE_SLOTS = 9;
  const AUTOPLAY_MS = 4800;
  const posts = [];
  let activeIndex = 0;
  let pausedByUser = false;
  let isInView = true;
  let overlay = null;
  let overlayPanel = null;
  let readerBody = null;
  let readerScroll = null;
  let readerTitle = null;
  let readerKicker = null;
  let readerSource = null;
  let closeReaderButton = null;
  let opener = null;
  let closeTimer = 0;
  let autoplayTimer = 0;

  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  const stripMarkdown = (value) => String(value ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}[-*+]\s+/gm, "")
    .replace(/^\s{0,3}\d+\.\s+/gm, "")
    .replace(/[*_~`|]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const parsePost = (raw, id) => {
    let body = String(raw ?? "").replace(/^\uFEFF/, "");
    const metadata = {};
    const frontMatter = body.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
    if (frontMatter) {
      for (const line of frontMatter[1].split(/\r?\n/)) {
        const match = line.match(/^([a-z][a-z0-9_-]*)\s*:\s*(.*?)\s*$/i);
        if (!match) continue;
        metadata[match[1].toLowerCase()] = match[2].replace(/^(["'])(.*)\1$/, "$2").trim();
      }
      body = body.slice(frontMatter[0].length);
    }

    const h1 = body.match(/^\s{0,3}#\s+(.+?)\s*#*\s*$/m);
    const title = metadata.title || (h1 ? stripMarkdown(h1[1]) : `Field note ${String(id).padStart(2, "0")}`);
    const rawParagraphs = body.split(/\r?\n\s*\r?\n/).map(part => part.trim()).filter(Boolean);
    let excerpt = metadata.excerpt || "";
    if (!excerpt) {
      const candidate = rawParagraphs.find(part => !/^#{1,6}\s/.test(part) && !/^```/.test(part) && !/^[-*+>]\s/.test(part) && !/^\d+\.\s/.test(part));
      excerpt = stripMarkdown(candidate || "");
    }
    if (excerpt.length > 185) excerpt = `${excerpt.slice(0, 182).trimEnd()}…`;
    const wordCount = stripMarkdown(body).split(/\s+/).filter(Boolean).length;

    return {
      id,
      title,
      category: metadata.category || "ORIGINAL WRITING",
      date: metadata.date || "",
      excerpt: excerpt || "Open this field note to read the full article.",
      alt: metadata.alt || title,
      minutes: Math.max(1, Math.ceil(wordCount / 210)),
      body,
      thumbnail: `blogs/Blog_Thunbnails/BT${id}.png`,
      contentPath: `blogs/Blog_Content/BC${id}.txt`
    };
  };

  const imageExists = async (path) => {
    try {
      let response = await fetch(path, { method: "HEAD", cache: "no-cache" });
      if (response.status === 405 || response.status === 501) {
        response = await fetch(path, { method: "GET", cache: "no-cache" });
        if (response.body && typeof response.body.cancel === "function") await response.body.cancel();
      }
      return response.ok;
    } catch (_) {
      return false;
    }
  };

  const discoverPosts = async () => {
    for (let id = 1; id <= MAX_POSTS; id += 1) {
      const contentPath = `blogs/Blog_Content/BC${id}.txt`;
      const thumbnailPath = `blogs/Blog_Thunbnails/BT${id}.png`;
      let contentResponse;
      const [hasThumbnail, response] = await Promise.all([
        imageExists(thumbnailPath),
        fetch(contentPath, { cache: "no-cache" }).catch(() => null)
      ]);
      contentResponse = response;
      const hasContent = Boolean(contentResponse?.ok);

      if (!hasThumbnail && !hasContent) break;
      if (!hasThumbnail || !hasContent) {
        console.warn(`[Blog] Incomplete pair ${id}: expected BT${id}.png and BC${id}.txt. Discovery stopped at this number.`);
        break;
      }
      try {
        const source = await contentResponse.text();
        posts.push(parsePost(source, id));
      } catch (error) {
        console.warn(`[Blog] Could not read ${contentPath}.`, error);
        break;
      }
    }
  };

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const createCard = (post) => {
    const card = element("article", "blog-card");
    card.dataset.postId = String(post.id);
    const link = element("a", "blog-card-link");
    link.href = `/blogs/${post.id}/`;
    link.dataset.blogOpen = "";
    link.dataset.postIndex = String(post.id);
    link.setAttribute("aria-haspopup", "dialog");
    link.setAttribute("aria-controls", "blog-reader-overlay");
    link.setAttribute("aria-label", `Read field note ${post.id}: ${post.title}`);

    const media = element("div", "blog-card-media");
    const image = element("img");
    image.src = post.thumbnail;
    image.alt = post.alt;
    image.width = 480;
    image.height = 640;
    image.loading = "lazy";
    image.decoding = "async";
    media.appendChild(image);
    media.appendChild(element("span", "blog-card-media-index", `FIELD NOTE / ${String(post.id).padStart(2, "0")}`));
    media.appendChild(element("span", "blog-card-category", post.category));

    const body = element("div", "blog-card-body");
    const meta = element("div", "blog-card-meta");
    meta.appendChild(element("span", "", post.date || `POST / ${String(post.id).padStart(2, "0")}`));
    meta.appendChild(element("span", "", `${post.minutes} MIN READ`));
    body.appendChild(meta);
    body.appendChild(element("h3", "", post.title));
    body.appendChild(element("p", "", post.excerpt));
    const foot = element("div", "blog-card-foot");
    foot.appendChild(element("span", "", "BY PROMIT MITRA"));
    foot.appendChild(element("span", "blog-card-arrow", "↗"));
    foot.lastChild.setAttribute("aria-hidden", "true");
    body.appendChild(foot);

    link.append(media, body);
    card.appendChild(link);
    return card;
  };

  const ensureControls = () => {
    let controls = bottom.querySelector("[data-blog-controls]");
    if (!controls) {
      controls = element("div", "blog-carousel-controls");
      controls.dataset.blogControls = "";
      const previous = element("button", "blog-carousel-control", "← PREV");
      previous.type = "button";
      previous.dataset.blogPrev = "";
      previous.setAttribute("aria-label", "Show previous blog post");
      const next = element("button", "blog-carousel-control", "NEXT →");
      next.type = "button";
      next.dataset.blogNext = "";
      next.setAttribute("aria-label", "Show next blog post");
      controls.append(previous, next);
      bottom.appendChild(controls);
    }
    if (toggle.parentElement !== controls) controls.appendChild(toggle);
    controls.querySelector("[data-blog-prev]")?.addEventListener("click", () => step(-1));
    controls.querySelector("[data-blog-next]")?.addEventListener("click", () => step(1));
    toggle.addEventListener("click", () => setPausedByUser(!pausedByUser));
    return controls;
  };

  const controls = ensureControls();

  const updateStatus = () => {
    const total = String(posts.length).padStart(2, "0");
    status.replaceChildren(document.createTextNode(`POST INDEX / ${total} `));
    status.appendChild(element("span", "", "—"));
    status.appendChild(document.createTextNode(` ${posts.length === 1 ? "1 ARTICLE" : `${posts.length} ARTICLES`} / ${reduceMotion.matches ? "MANUAL BROWSING" : "FLEX CAROUSEL"}`));
  };

  const setPausedByUser = (paused) => {
    pausedByUser = paused;
    carousel.dataset.paused = String(paused);
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", paused ? "Resume automatic blog carousel" : "Pause automatic blog carousel");
    toggle.innerHTML = paused ? 'RESUME MOTION <span aria-hidden="true">↗</span>' : 'PAUSE MOTION <span aria-hidden="true">Ⅱ</span>';
  };

  // Keep seven persistent card shells and recycle them like an infinite flex ribbon.
  // The DOM nodes are moved one slot per step, then their content is rebound to the
  // next numbered post. This preserves flex/transform transitions and works with one post.
  const renderCards = () => {
    const count = posts.length;
    if (!count) return;
    const radius = Math.floor(VISIBLE_SLOTS / 2);
    let nodes = Array.from(group.children).filter(node => node.matches?.(".blog-card"));

    if (nodes.length !== VISIBLE_SLOTS) {
      nodes = Array.from({ length: VISIBLE_SLOTS }, () => createCard(posts[0]));
      group.replaceChildren(...nodes);
    }

    nodes.forEach((node, slot) => {
      const distance = slot - radius;
      const postIndex = ((activeIndex + distance) % count + count) % count;
      const post = posts[postIndex];
      // Preserve the rendered card when it still represents the same article.
      // Rebuilding every card at the wrap boundary reloads media and is a source of the end snap.
      if (Number(node.dataset.postId) !== post.id || !node.querySelector("[data-blog-open]")) {
        const fresh = createCard(post);
        node.replaceChildren(...Array.from(fresh.childNodes));
        node.dataset.postId = String(post.id);
      }
      node.dataset.distance = String(distance);
      node.dataset.loopCopy = String(Math.abs(distance) >= count);
      const link = node.querySelector("[data-blog-open]");
      if (link) {
        const position = distance === 0 ? "center" : distance < 0 ? `${Math.abs(distance)} card${Math.abs(distance) === 1 ? "" : "s"} to the left` : `${distance} card${distance === 1 ? "" : "s"} to the right`;
        link.setAttribute("aria-label", `${post.title}; ${position}. Open article.`);
      }
    });

    carousel.dataset.state = reduceMotion.matches ? "static" : "ready";
    emptyCard.hidden = true;
    controls.hidden = false;
    toggle.hidden = reduceMotion.matches;
    carousel.dataset.paused = reduceMotion.matches ? "true" : String(pausedByUser);
    updateStatus();
    applySmoothLayout(scrollCurrent);
  };
  const step = (direction) => {
    const amount = Math.sign(direction);
    if (!amount || !posts.length) return;
    window.clearTimeout(snapTimer);
    settleTarget = null;
    if (reduceMotion.matches) {
      window.clearTimeout(snapTimer);
      if (motionFrame) cancelAnimationFrame(motionFrame);
      motionFrame = 0;
      scrollCurrent = 0;
      scrollTarget = 0;
      lastMotionTime = 0;
      commitSlide(amount);
      return;
    }
    scrollTarget = clampMotion(scrollTarget + amount, -MAX_QUEUED_STEPS, MAX_QUEUED_STEPS);
    scheduleSnap(140);
    scheduleMotion();
  };

  const inlineMarkdown = (source) => {
    let html = escapeHTML(source);
    // Links are deliberately limited to safe web/email schemes; raw HTML stays escaped.
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)(?:\s+&quot;[^&]*&quot;)?\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/~~([^~]+)~~/g, "<del>$1</del>")
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>")
      .replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");
    return html;
  };

  const renderMarkdown = (source, title) => {
    const lines = String(source ?? "").replace(/^\uFEFF/, "").split(/\r?\n/);
    const front = lines.join("\n").match(/^---\s*\n[\s\S]*?\n---\s*(?:\n|$)/);
    if (front) {
      const count = front[0].split("\n").length - 1;
      lines.splice(0, count);
    }
    const out = [];
    let i = 0;
    let skippedTitle = false;

    const isBlockStart = (line, next) => /^(\s{0,3}#{1,6}\s|\s{0,3}```|\s{0,3}>\s?|\s{0,3}([-*_]\s*){3,}$|\s{0,3}[-*+]\s+|\s{0,3}\d+\.\s+)/.test(line) ||
      (line.includes("|") && next && /^\s*\|?\s*:?-{3,}/.test(next));

    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i += 1; continue; }

      if (/^\s{0,3}```/.test(line)) {
        i += 1;
        const code = [];
        while (i < lines.length && !/^\s{0,3}```/.test(lines[i])) code.push(lines[i++]);
        if (i < lines.length) i += 1;
        out.push(`<pre><code>${escapeHTML(code.join("\n"))}</code></pre>`);
        continue;
      }

      const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (heading) {
        i += 1;
        if (!skippedTitle && heading[1].length === 1 && stripMarkdown(heading[2]).toLowerCase() === String(title).toLowerCase()) {
          skippedTitle = true;
          continue;
        }
        const level = heading[1].length;
        out.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
        continue;
      }

      if (/^\s{0,3}([-*_]\s*){3,}$/.test(line)) { out.push("<hr>"); i += 1; continue; }

      if (/^\s{0,3}>/.test(line)) {
        const quote = [];
        while (i < lines.length && /^\s{0,3}>/.test(lines[i])) quote.push(lines[i++].replace(/^\s{0,3}>\s?/, ""));
        out.push(`<blockquote>${quote.map(part => `<p>${inlineMarkdown(part)}</p>`).join("")}</blockquote>`);
        continue;
      }

      const listMatch = line.match(/^\s{0,3}([-*+]\s+|\d+\.\s+)/);
      if (listMatch) {
        const ordered = /^\s{0,3}\d+\./.test(line);
        const tag = ordered ? "ol" : "ul";
        const items = [];
        while (i < lines.length) {
          const item = lines[i].match(/^\s{0,3}(?:[-*+]\s+|\d+\.\s+)(.+)$/);
          if (!item || /^\s{0,3}\d+\./.test(lines[i]) !== ordered) break;
          items.push(`<li>${inlineMarkdown(item[1])}</li>`);
          i += 1;
        }
        out.push(`<${tag}>${items.join("")}</${tag}>`);
        continue;
      }

      if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
        const splitRow = (row) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim());
        const headers = splitRow(line);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
          rows.push(splitRow(lines[i++]));
        }
        out.push(`<div class="blog-reader-table-wrap"><table><thead><tr>${headers.map(cell => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${headers.map((_, index) => `<td>${inlineMarkdown(row[index] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
        continue;
      }

      const paragraph = [line.trim()];
      i += 1;
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i], lines[i + 1])) paragraph.push(lines[i++].trim());
      out.push(`<p>${paragraph.map(part => inlineMarkdown(part)).join(" ")}</p>`);
    }
    return out.join("\n") || "<p>This field note has no readable content yet.</p>";
  };

  const ensureReader = () => {
    if (overlay) return;
    overlay = element("section", "blog-reader-overlay");
    overlay.id = "blog-reader-overlay";
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    overlay.setAttribute("aria-label", "Blog article reader");

    overlay.innerHTML = `
      <div class="blog-reader-panel" role="dialog" aria-modal="true" aria-labelledby="blog-reader-title" tabindex="-1">
        <header class="blog-reader-header">
          <div class="blog-reader-title-block">
            <p class="blog-reader-kicker"><span class="blog-reader-live-dot"></span><span data-reader-kicker>FIELD NOTE / 01 — ORIGINAL WRITING</span></p>
            <h2 id="blog-reader-title" data-reader-title>Field note</h2>
          </div>
          <div class="blog-reader-actions">
            <a class="blog-reader-source" data-reader-source href="#" target="_blank" rel="noopener">OPEN ARTICLE ↗</a>
            <button class="blog-reader-close" type="button" aria-label="Close article" title="Close article"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18"/></svg></button>
          </div>
        </header>
        <div class="blog-reader-scroll"><article class="blog-reader-body" data-reader-body></article></div>
        <footer class="blog-reader-footer"><span>ORIGINAL WRITING / PROMIT MITRA</span><span>FIELD NOTES <b>↗</b></span></footer>
      </div>`;
    document.body.appendChild(overlay);
    overlayPanel = overlay.querySelector(".blog-reader-panel");
    readerBody = overlay.querySelector("[data-reader-body]");
    readerScroll = overlay.querySelector(".blog-reader-scroll");
    readerTitle = overlay.querySelector("[data-reader-title]");
    readerKicker = overlay.querySelector("[data-reader-kicker]");
    readerSource = overlay.querySelector("[data-reader-source]");
    closeReaderButton = overlay.querySelector(".blog-reader-close");
    closeReaderButton.addEventListener("click", closeReader);
    // Lenis is stopped while the reader is open. Handle wheel input directly on the
    // reader scroller as a fallback for browsers or input devices that don't scroll the
    // nested flex child reliably; touch scrolling remains native through touch-action.
    readerScroll?.addEventListener("wheel", event => {
      if (overlay.hidden || event.ctrlKey || !readerScroll) return;
      const maxScroll = Math.max(0, readerScroll.scrollHeight - readerScroll.clientHeight);
      if (maxScroll <= 0) return;
      let delta = event.deltaY;
      if (event.deltaMode === 1) delta *= 16;
      else if (event.deltaMode === 2) delta *= readerScroll.clientHeight;
      if (!delta) return;
      const before = readerScroll.scrollTop;
      const after = Math.max(0, Math.min(maxScroll, before + delta));
      if (after !== before) {
        event.preventDefault();
        readerScroll.scrollTop = after;
      }
    }, { passive: false });
    // BLOG READER MANUAL TOUCH SCROLL FALLBACK V1
    // Some mobile browsers fail to scroll this nested flex child reliably.
    // Convert vertical finger movement into scrollTop changes on the reader itself.
    let readerTouchY = null;
    readerScroll?.addEventListener("touchstart", event => {
      if (overlay.hidden || event.touches.length !== 1) {
        readerTouchY = null;
        return;
      }
      readerTouchY = event.touches[0].clientY;
    }, { passive: true });

    readerScroll?.addEventListener("touchmove", event => {
      if (overlay.hidden || readerTouchY === null || event.touches.length !== 1) return;
      const nextY = event.touches[0].clientY;
      const deltaY = readerTouchY - nextY;
      readerTouchY = nextY;
      if (Math.abs(deltaY) < 0.5) return;
      if (event.cancelable) event.preventDefault();
      readerScroll.scrollTop += deltaY;
    }, { passive: false });

    const resetReaderTouch = () => { readerTouchY = null; };
    readerScroll?.addEventListener("touchend", resetReaderTouch, { passive: true });
    readerScroll?.addEventListener("touchcancel", resetReaderTouch, { passive: true });

    overlay.addEventListener("click", event => { if (event.target === overlay) closeReader(); });
    document.addEventListener("keydown", event => {
      if (overlay.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeReader();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = Array.from(overlayPanel.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(node => !node.hidden);
      if (!focusables.length) { event.preventDefault(); overlayPanel.focus(); return; }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  };

  const openReader = (post, trigger) => {
    ensureReader();
    opener = trigger;
    readerTitle.textContent = post.title;
    readerKicker.textContent = `FIELD NOTE / ${String(post.id).padStart(2, "0")} — ${post.category}${post.date ? ` — ${post.date}` : ""}`;
    readerSource.href = `/blogs/${post.id}/`;
    readerSource.setAttribute("aria-label", `Open permanent article page for ${post.title}`);
    readerBody.innerHTML = renderMarkdown(post.body, post.title);
    if (readerScroll) readerScroll.scrollTop = 0;
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("case-overlay-open");
    window.portfolioLenis?.stop();
    void overlay.offsetWidth;
    requestAnimationFrame(() => {
      overlay.classList.add("is-open");
      closeReaderButton.focus({ preventScroll: true });
    });
  };

  function closeReader() {
    if (!overlay || overlay.hidden) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("case-overlay-open");
    const finish = () => {
      overlay.hidden = true;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      if (!document.hidden && !document.body.classList.contains("case-overlay-open")) window.portfolioLenis?.start();
    };
    window.clearTimeout(closeTimer);
    if (reduceMotion.matches) finish();
    else closeTimer = window.setTimeout(finish, 320);
  }

  // BLOG READER CLICK CAPTURE FIX V1
  // Handle card clicks on the document in capture phase. This runs before card/page
  // bubbling handlers can cancel propagation and bypass the old document-level handler.
  const handleBlogCardOpen = event => {
    const link = event.target?.closest?.("[data-blog-open]");
    if (!link || !group.contains(link) || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (typeof event.button === "number" && event.button !== 0) return;
    const postId = Number(link.dataset.postIndex);
    const post = posts.find(record => record.id === postId);
    if (!post) {
      console.error(`[Blog] Clicked card ${postId}, but its article was not loaded. Check blogs/Blog_Content/BC${postId}.txt and its matching thumbnail.`);
      return;
    }
    event.preventDefault();
    openReader(post, link);
  };
  document.addEventListener("click", handleBlogCardOpen, true);

  let observer = null;
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) isInView = entry.isIntersecting;
    }, { threshold: 0.03 });
    observer.observe(carousel);
  }
  document.addEventListener("visibilitychange", () => {
    carousel.dataset.pageHidden = String(document.hidden);
  });
  carousel.addEventListener("keydown", event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
    else if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
  });
  // BLOG CAROUSEL NO-SNAP SETTLE V1
  // BLOG LENIS-STYLE HORIZONTAL MOTION V2
  // A fractional carousel position is eased each animation frame (Lenis-like lerp).
  // Cards resize, rotate and trade places continuously; whole-slide boundaries recycle
  // the seven persistent shells, keeping the ribbon infinite even with one article.
  let scrollCurrent = 0;
  let scrollTarget = 0;
  let settleTarget = null;
  let motionFrame = 0;
  let lastMotionTime = 0;
  let snapTimer = 0;
  let horizontalWheelDelta = 0;
  let activePointerId = null;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerLastX = 0;
  let pointerLastTime = 0;
  let pointerVelocity = 0;
  let pointerDidDrag = false;
  let suppressPointerClickUntil = 0;
  const MAX_QUEUED_STEPS = 4.75;
  const MOTION_LERP = 0.105;
  const SETTLE_LERP = 0.15;
  const DRAG_START_PX = 7;
  const MAX_FLING_STEPS = 0.9;

  carousel.dataset.smoothMotion = "true";
  viewport.setAttribute(
    "aria-label",
    "Browse field notes. Scroll horizontally, drag or swipe, or use the left and right arrow keys."
  );

  const clampMotion = (value, min, max) => Math.max(min, Math.min(max, value));
  const slideDistance = () => clampMotion((viewport.clientWidth || window.innerWidth) * 0.155, 82, 176);

  function applySmoothLayout(offset = scrollCurrent) {
    const nodes = Array.from(group.children).filter(node => node.matches?.(".blog-card"));
    if (!nodes.length) return;
    const width = viewport.clientWidth || window.innerWidth;
    let centerBasis;
    if (width <= 700) centerBasis = Math.min(width * 0.57, 270);
    else if (width <= 900) centerBasis = clampMotion(width * 0.32, 235, 320);
    else centerBasis = clampMotion(width * 0.205, 245, 350);

    // Each point mirrors the existing card hierarchy from center to feathered edge.
    const points = [
      { grow: 0, basis: centerBasis, opacity: 1, scale: 1, tilt: 0 },
      { grow: 1.45, basis: 0, opacity: 1, scale: 0.98, tilt: 9 },
      { grow: 1, basis: 0, opacity: 0.82, scale: 0.95, tilt: 16 },
      { grow: 0.48, basis: 0, opacity: 0.55, scale: 0.92, tilt: 22 },
      // Guard slot: zero opacity and almost zero flex at the instant it is recycled.
      { grow: 0.002, basis: 0, opacity: 0, scale: 0.82, tilt: 30 }
    ];
    const mix = (a, b, t) => a + (b - a) * t;
    const radius = Math.floor(VISIBLE_SLOTS / 2);

    nodes.forEach((node, slot) => {
      const distance = slot - radius - offset;
      const absDistance = Math.min(4, Math.abs(distance));
      const lower = Math.min(3, Math.floor(absDistance));
      const t = absDistance - lower;
      const a = points[lower];
      const b = points[lower + 1];
      const grow = mix(a.grow, b.grow, t);
      const basis = mix(a.basis, b.basis, t);
      const opacity = mix(a.opacity, b.opacity, t);
      const scale = mix(a.scale, b.scale, t);
      const tilt = mix(a.tilt, b.tilt, t) * (distance < 0 ? 1 : -1);

      node.dataset.distance = String(Math.round(distance));
      node.style.setProperty("--blog-flex", `${grow.toFixed(4)} 1 ${basis.toFixed(2)}px`);
      node.style.setProperty("--blog-opacity", opacity.toFixed(4));
      node.style.setProperty("--blog-scale", scale.toFixed(4));
      node.style.setProperty("--blog-rotate", `${tilt.toFixed(3)}deg`);
      const bodyOpacity = clampMotion(1 - absDistance / 1.08, 0, 1);
      const overlayOpacity = clampMotion(1 - absDistance * 0.14, 0.42, 1);
      node.style.setProperty("--blog-body-opacity", bodyOpacity.toFixed(4));
      node.style.setProperty("--blog-body-y", `${((1 - bodyOpacity) * 13).toFixed(2)}px`);
      node.style.setProperty("--blog-card-overlay-opacity", overlayOpacity.toFixed(4));
      node.style.zIndex = absDistance < 0.55 ? "5" : "1";
    });
  }

  function commitSlide(direction) {
    if (!posts.length) return;
    activeIndex = (activeIndex + direction + posts.length) % posts.length;
    if (direction > 0 && group.firstElementChild) group.appendChild(group.firstElementChild);
    else if (direction < 0 && group.lastElementChild) group.prepend(group.lastElementChild);
    renderCards();
  }

  function scheduleMotion() {
    if (!motionFrame) motionFrame = requestAnimationFrame(animateMotion);
  }

  function scheduleSnap(delay = 140) {
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(() => {
      // Ease the destination itself toward the nearest slide. Never jump the destination
      // in one frame; this avoids the final catch-up snap after wheel/drag momentum.
      settleTarget = Math.round(scrollTarget);
      scheduleMotion();
    }, delay);
  }

  function animateMotion(timestamp) {
    motionFrame = 0;
    if (reduceMotion.matches) {
      scrollCurrent = 0;
      scrollTarget = 0;
      settleTarget = null;
      applySmoothLayout(0);
      return;
    }

    const elapsed = lastMotionTime ? Math.min(48, Math.max(1, timestamp - lastMotionTime)) : 16.667;
    lastMotionTime = timestamp;

    // First ease the target toward its resting slide, then ease the visible position
    // toward that moving target. This produces a continuous deceleration rather than a snap.
    if (settleTarget !== null) {
      const settleAlpha = 1 - Math.pow(1 - SETTLE_LERP, elapsed / 16.667);
      scrollTarget += (settleTarget - scrollTarget) * settleAlpha;
      if (Math.abs(settleTarget - scrollTarget) < 0.001) {
        scrollTarget = settleTarget;
        settleTarget = null;
      }
    }

    const alpha = 1 - Math.pow(1 - MOTION_LERP, elapsed / 16.667);
    scrollCurrent += (scrollTarget - scrollCurrent) * alpha;
    if (Math.abs(scrollTarget - scrollCurrent) < 0.0015) scrollCurrent = scrollTarget;

    // Rebase the fractional offset at each full slide. Rebinding only happens at the
    // boundary, so the same image card physically travels into the center instead of popping.
    let safety = 0;
    while (scrollCurrent >= 1 && safety++ < 8) {
      scrollCurrent -= 1;
      scrollTarget -= 1;
      if (settleTarget !== null) settleTarget -= 1;
      commitSlide(1);
    }
    while (scrollCurrent <= -1 && safety++ < 8) {
      scrollCurrent += 1;
      scrollTarget += 1;
      if (settleTarget !== null) settleTarget += 1;
      commitSlide(-1);
    }

    applySmoothLayout(scrollCurrent);
    if (settleTarget !== null || Math.abs(scrollTarget - scrollCurrent) >= 0.0015) {
      motionFrame = requestAnimationFrame(animateMotion);
    } else {
      lastMotionTime = 0;
    }
  }

  function addHorizontalMotion(amount, snapDelay = 145) {
    if (!amount || !Number.isFinite(amount) || !posts.length) return;
    settleTarget = null;
    if (reduceMotion.matches) {
      const threshold = 0.48;
      scrollTarget += amount;
      if (Math.abs(scrollTarget) >= threshold) {
        const dir = Math.sign(scrollTarget);
        scrollTarget = 0;
        commitSlide(dir);
      }
      return;
    }
    scrollTarget = clampMotion(scrollTarget + amount, -MAX_QUEUED_STEPS, MAX_QUEUED_STEPS);
    scheduleSnap(snapDelay);
    scheduleMotion();
  }

  viewport.addEventListener("wheel", event => {
    // Keep normal vertical page scrolling intact; only horizontal trackpad gestures and
    // Shift+wheel are routed through the eased horizontal motion engine.
    let delta = Math.abs(event.deltaX) > 0.5 ? event.deltaX : (event.shiftKey ? event.deltaY : 0);
    if (!delta || (overlay && !overlay.hidden)) return;
    if (event.deltaMode === 1) delta *= 16;
    else if (event.deltaMode === 2) delta *= viewport.clientWidth || window.innerWidth;
    event.preventDefault();

    if (reduceMotion.matches) {
      horizontalWheelDelta += delta;
      if (Math.abs(horizontalWheelDelta) >= 96) {
        const direction = Math.sign(horizontalWheelDelta);
        horizontalWheelDelta = 0;
        step(direction);
      }
      return;
    }
    addHorizontalMotion(delta / slideDistance(), 155);
  }, { passive: false });

  /* BLOG READER CLICK / DEFER POINTER CAPTURE FIX V1 */
  viewport.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target.closest?.("button, [data-blog-motion-toggle]")) return;
    activePointerId = event.pointerId;
    pointerStartX = pointerLastX = event.clientX;
    pointerStartY = event.clientY;
    pointerLastTime = performance.now();
    pointerVelocity = 0;
    pointerDidDrag = false;
  });

  viewport.addEventListener("pointermove", event => {
    if (activePointerId !== event.pointerId) return;
    const dxFromStart = event.clientX - pointerStartX;
    const dyFromStart = event.clientY - pointerStartY;
    if (!pointerDidDrag && Math.abs(dxFromStart) > DRAG_START_PX && Math.abs(dxFromStart) > Math.abs(dyFromStart) * 1.12) {
      pointerDidDrag = true;
      carousel.dataset.dragging = "true";
      // Capture only after this gesture is known to be a horizontal drag. A normal
      // click on an article card must retain its anchor target so the reader can open.
      try { viewport.setPointerCapture(event.pointerId); } catch (_) {}
    }
    const now = performance.now();
    if (pointerDidDrag) {
      event.preventDefault();
      const dx = event.clientX - pointerLastX;
      const elapsed = Math.max(8, now - pointerLastTime);
      const amount = -dx / slideDistance();
      pointerVelocity = (amount / elapsed) * 1000;
      addHorizontalMotion(amount, 160);
    }
    pointerLastX = event.clientX;
    pointerLastTime = now;
  });

  const finishPointerGesture = event => {
    if (activePointerId !== event.pointerId) return;
    activePointerId = null;
    if (pointerDidDrag) {
      suppressPointerClickUntil = performance.now() + 500;
      if (!reduceMotion.matches) {
        const fling = clampMotion(pointerVelocity * 0.16, -MAX_FLING_STEPS, MAX_FLING_STEPS);
        if (Math.abs(fling) > 0.08) addHorizontalMotion(fling, 170);
        else scheduleSnap(120);
      } else {
        if (Math.abs(scrollTarget) >= 0.48) commitSlide(Math.sign(scrollTarget));
        scrollCurrent = 0;
        scrollTarget = 0;
        applySmoothLayout(0);
      }
    }
    pointerDidDrag = false;
    delete carousel.dataset.dragging;
    try {
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    } catch (_) {}
  };
  viewport.addEventListener("pointerup", finishPointerGesture);
  viewport.addEventListener("pointercancel", event => {
    if (activePointerId !== event.pointerId) return;
    activePointerId = null;
    pointerDidDrag = false;
    delete carousel.dataset.dragging;
    scheduleSnap(80);
  });
  viewport.addEventListener("click", event => {
    // Don't open an article when a drag ends; keyboard activation remains unaffected.
    if (event.detail > 0 && performance.now() < suppressPointerClickUntil) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  carousel.addEventListener("pointerenter", () => { carousel.dataset.hovered = "true"; });
  carousel.addEventListener("pointerleave", () => { carousel.dataset.hovered = "false"; });
  carousel.addEventListener("focusin", () => { carousel.dataset.focused = "true"; });
  carousel.addEventListener("focusout", event => {
    if (!carousel.contains(event.relatedTarget)) carousel.dataset.focused = "false";
  });
  reduceMotion.addEventListener?.("change", () => {
    if (reduceMotion.matches) {
      carousel.dataset.paused = "true";
      toggle.hidden = true;
      window.clearTimeout(snapTimer);
      if (motionFrame) cancelAnimationFrame(motionFrame);
      motionFrame = 0;
      scrollCurrent = 0;
      scrollTarget = 0;
      settleTarget = null;
      lastMotionTime = 0;
    }
    renderCards();
  });

  const beginAutoplay = () => {
    window.clearInterval(autoplayTimer);
    autoplayTimer = window.setInterval(() => {
      const readerOpen = Boolean(overlay && !overlay.hidden);
      if (!posts.length || reduceMotion.matches || pausedByUser || !isInView || document.hidden ||
          carousel.dataset.hovered === "true" || carousel.dataset.focused === "true" || readerOpen) return;
      step(1);
    }, AUTOPLAY_MS);
  };

  const init = async () => {
    carousel.dataset.state = "loading";
    viewport.setAttribute("aria-label", "Browse published field notes. Use previous and next controls to explore.");
    try {
      await discoverPosts();
    } catch (error) {
      console.error("[Blog] Could not discover posts. Check the numbered thumbnail/content pairs.", error);
    }
    if (!posts.length) {
      carousel.dataset.state = "empty";
      carousel.dataset.paused = "true";
      group.replaceChildren();
      emptyCard.hidden = false;
      controls.hidden = true;
      toggle.hidden = true;
      status.replaceChildren(document.createTextNode("POST INDEX / 00 "));
      status.appendChild(element("span", "", "—"));
      status.appendChild(document.createTextNode(" NO ARTICLES PUBLISHED YET"));
      return;
    }
    const postDates = posts.map(post => Date.parse(post.date));
    if (postDates.every(Number.isFinite)) {
      posts.sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || a.id - b.id);
    } else {
      posts.sort((a, b) => a.id - b.id);
    }
    activeIndex = posts.length - 1;
    renderCards();
    beginAutoplay();
  };

  init();
})();
