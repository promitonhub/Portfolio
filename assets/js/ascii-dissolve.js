/*
 * Local, self-contained adaptation of the ASCII dissolve technique.
 * It uses stroked letterforms, a small character ramp, deterministic grain,
 * and letter-by-letter erosion/assembly. No remote module or runtime fetches.
 */
(() => {
  "use strict";
  const heading = document.querySelector(".hero-title-dissolve");
  const output = heading?.querySelector(".ascii-dissolve-output");
  if (!heading || !output) return;

  const reducedMotion = window.portfolioShouldReduceMotion ? window.portfolioShouldReduceMotion() : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) return; // Delayed CSS fade brings in the static wordmark fallback.

  const COLS = 64;
  const ROWS = 13;
  const GAP = 4;
  const RAMP = " .·░▒▓█";
  const HOLD = 1.6;
  const TRANS = 2.6;
  const STAGGER = 0.2;
  const JITTER = 0.22;
  const ERODE = 0.3;
  const FADE = 0.5;
  const LATER = 1;
  const R = 0.5;
  const RD = 0.6;
  const WORDS = ["PROMIT.", "SIGNAL", "SYSTEMS", "CONTENT"];

  // Stroke paths are the original 4 × 6 polyline-style letter construction,
  // restricted to the glyphs used by the words above.
  const STROKES = {
    A: [[0, 6, 1.6, 0, 2.4, 0, 4, 6], [0.7, 4, 3.3, 4]],
    C: [[4, 1, 3, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5]],
    E: [[4, 0, 0, 0, 0, 6, 4, 6], [0, 3, 3, 3]],
    G: [[4, 1, 3, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5, 4, 3, 2, 3]],
    I: [[1, 0, 3, 0], [2, 0, 2, 6], [1, 6, 3, 6]],
    L: [[0, 0, 0, 6, 4, 6]],
    M: [[0, 6, 0, 0, 2, 3.5, 4, 0, 4, 6]],
    N: [[0, 6, 0, 0, 4, 6, 4, 0]],
    O: [[1, 0, 3, 0, 4, 1, 4, 5, 3, 6, 1, 6, 0, 5, 0, 1, 1, 0]],
    P: [[0, 6, 0, 0, 3, 0, 4, 1, 4, 2, 3, 3, 0, 3]],
    R: [[0, 6, 0, 0, 3, 0, 4, 1, 4, 2, 3, 3, 0, 3], [2.2, 3, 4, 6]],
    S: [[4, 1, 3, 0, 1, 0, 0, 1, 0, 2, 1, 3, 3, 3, 4, 4, 4, 5, 3, 6, 1, 6, 0, 5]],
    T: [[0, 0, 4, 0], [2, 0, 2, 6]],
    Y: [[0, 0, 2, 3], [4, 0, 2, 3, 2, 6]],
    ".": [[2, 6, 2, 6]],
  };

  const hash = (a, b) => {
    let h = Math.imul(a, 374761393) + Math.imul(b, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const glyph = ch => STROKES[ch] || [];
  const span = g => {
    const xs = g.flatMap(path => path.filter((_, i) => i % 2 === 0));
    return xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 2];
  };
  const segmentDistance = (x, y, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay;
    const lengthSq = dx * dx + dy * dy;
    const k = lengthSq ? clamp(((x - ax) * dx + (y - ay) * dy) / lengthSq, 0, 1) : 0;
    return Math.hypot(x - ax - k * dx, y - ay - k * dy) - (dx && dy ? RD : R);
  };

  const gapForUnit = u => Math.max(2, Math.round(GAP * u));
  const wordWidth = (word, u) => word.split("").reduce((total, ch) => {
    const [lo, hi] = span(glyph(ch));
    return total + Math.round(2 * u * (hi - lo)) + gapForUnit(u);
  }, 0) - gapForUnit(u) + 4 * u * R;

  // Fit the longest word to the fixed character grid. The pen starts at a small
  // constant inset rather than centering each frame, so the name is left-aligned.
  let unit = Math.min(1, (ROWS - 2) / (6 + 2 * R));
  while (unit > 0.3 && Math.max(...WORDS.map(word => wordWidth(word, unit))) > COLS - 4) unit -= 0.02;
  const letterGap = gapForUnit(unit);
  const y0 = ROWS / 2 - 3 * unit;

  const bakeWord = word => {
    const cover = new Float32Array(COLS * ROWS);
    const slot = new Int8Array(COLS);
    let pen = Math.round(2 * unit * R); // left anchor shared by every word
    const centres = [];

    for (const ch of word) {
      const paths = glyph(ch);
      const [lo, hi] = span(paths);
      const width = Math.round(2 * unit * (hi - lo));
      centres.push(pen + width / 2);
      const minCol = Math.max(0, pen - 3);
      const maxCol = Math.min(COLS, pen + width + 3);
      for (let row = 0; row < ROWS; row++) {
        for (let col = minCol; col < maxCol; col++) {
          let hit = 0;
          for (let sy = 0; sy < 3; sy++) {
            for (let sx = 0; sx < 3; sx++) {
              const gx = lo + (col + (sx + 0.5) / 3 - pen) / (2 * unit);
              const gy = (row + (sy + 0.5) / 3 - y0) / unit;
              let d = 9;
              for (const path of paths) {
                for (let i = 0; i + 3 < path.length; i += 2) {
                  d = Math.min(d, segmentDistance(gx, gy, path[i], path[i + 1], path[i + 2], path[i + 3]));
                }
              }
              if (d <= 0) hit++;
            }
          }
          const k = row * COLS + col;
          cover[k] = Math.max(cover[k], hit / 9);
        }
      }
      pen += width + letterGap;
    }

    for (let col = 0; col < COLS; col++) {
      let best = 0;
      for (let i = 1; i < centres.length; i++) {
        if (Math.abs(centres[i] - col) < Math.abs(centres[best] - col)) best = i;
      }
      slot[col] = best;
    }
    return { cover, slot };
  };

  let baked;
  try {
    baked = WORDS.map(bakeWord);
  } catch (error) {
    // Leave the fallback to fade in if baking cannot complete in this browser.
    console.warn("Local ASCII dissolve could not initialise.", error);
    heading.classList.add("ascii-dissolve-failed");
    return;
  }

  const count = COLS * ROWS;
  const values = new Float32Array(count);
  const dust = new Float32Array(count);
  const period = WORDS.length * (HOLD + TRANS);
  const frameInterval = 1000 / 20;
  let startedAt = 0;
  let lastFrameAt = -Infinity;
  let raf = 0;
  let alive = true;

  const splat = (x, y, density) => {
    const col = Math.round(x), row = Math.round(y);
    if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
      const k = row * COLS + col;
      dust[k] = Math.max(dust[k], density);
    }
  };

  function renderAt(seconds) {
    const u = ((seconds % period) + period) % period;
    const n = Math.floor(u / (HOLD + TRANS));
    const tau = u - n * (HOLD + TRANS) - HOLD;
    const A = baked[n];
    const B = baked[(n + 1) % WORDS.length];
    dust.fill(0);

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const k = row * COLS + col;
        const a = A.cover[k], b = B.cover[k];
        let v = a;
        if (tau > 0) {
          v = 0;
          if (a > 0) {
            const go = A.slot[col] * STAGGER + hash(k, n) * JITTER;
            const erosion = (tau - go) / ERODE;
            if (a <= 0.3 || hash(k, n + 7) > 0.5) v = a * (1 - ease(erosion));
            else if (erosion < 1) v = a * (1 - 0.5 * Math.max(0, erosion));
            else {
              const age = tau - go - ERODE;
              const life = 0.5 + 0.35 * hash(k, n + 57);
              if (age < life) {
                const vx = 0.6 + 1.4 * hash(k, n + 31);
                const vy = 0.3 + 0.6 * hash(k, n + 83);
                splat(col + 0.5 + vx * age, row + vy * age + 4 * age * age, 0.5 * (1 - 0.7 * age / life));
              }
            }
          }
          if (b > 0) {
            const land = LATER + B.slot[col] * STAGGER + hash(k, n + 977) * JITTER;
            if (tau >= land) {
              const fillProgress = ease((tau - land) / FADE);
              v = Math.max(v, b * (b > 0.3 ? 0.4 + 0.6 * fillProgress : fillProgress));
            } else if (b > 0.3 && hash(k, n + 9) < 0.55) {
              const life = 0.45 + 0.3 * hash(k, n + 211);
              const f = (land - tau) / life;
              if (f < 1) {
                const q = f * f;
                const theta = 6.283 * hash(k, n + 401);
                const distance = 0.8 + 1.2 * hash(k, n + 613);
                splat(col + 1.8 * distance * Math.cos(theta) * q, row + distance * Math.sin(theta) * q,
                  0.17 + 0.3 * (1 - f));
              }
            }
          }
        }
        values[k] = v;
      }
    }

    const lines = new Array(ROWS);
    for (let row = 0; row < ROWS; row++) {
      let line = "";
      for (let col = 0; col < COLS; col++) {
        const k = row * COLS + col;
        line += RAMP[Math.round(Math.max(values[k], dust[k]) * (RAMP.length - 1))];
      }
      lines[row] = line;
    }
    return lines.join("\n");
  }

  const stop = () => {
    alive = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const start = () => {
    if (document.hidden || raf) return;
    alive = true;
    raf = requestAnimationFrame(tick);
  };

  window.addEventListener("pagehide", stop);
  window.addEventListener("pageshow", start);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    } else {
      start();
    }
  });

  function tick(now) {
    if (!alive) return;
    if (document.hidden) {
      raf = 0;
      return;
    }
    if (now - lastFrameAt >= frameInterval - 0.5) {
      if (!startedAt) startedAt = now;
      output.textContent = renderAt((now - startedAt) / 1000);
      lastFrameAt = now;
      if (!heading.classList.contains("ascii-dissolve-ready")) {
        heading.classList.add("ascii-dissolve-ready");
        heading.classList.remove("ascii-dissolve-failed");
      }
    }
    raf = requestAnimationFrame(tick);
  }

  // Display the first (PROMIT.) frame immediately, then begin the timed dissolve.
  try {
    output.textContent = renderAt(0);
    heading.classList.add("ascii-dissolve-ready");
    start();
  } catch (error) {
    console.warn("Local ASCII dissolve failed to render.", error);
    heading.classList.add("ascii-dissolve-failed");
  }
})();
