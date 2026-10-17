/* Muted cursor-reactive grid cells for Profile, Selected Work and Approach. */
(() => {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const sections = [...document.querySelectorAll('#about, #work, #approach')];
  if (!sections.length) return;

  const CELL = 82;
  const MOBILE_CELL = 64;
  const PEAK_ALPHA = 0.34;
  const HOLD_MS = 420;
  const FADE_MS = 1180;
  const DPR_LIMIT = 1.5;

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  sections.forEach((section) => {
    const canvas = section.querySelector('.section-grid-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    const state = {
      width: 0,
      height: 0,
      dpr: 1,
      cellSize: window.innerWidth <= 700 ? MOBILE_CELL : CELL,
      cols: 0,
      rows: 0,
      cells: [],
      lastPoint: null,
      raf: 0,
      active: false,
    };

    const resize = () => {
      const width = Math.max(1, section.clientWidth);
      const height = Math.max(1, section.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_LIMIT);
      const cellSize = window.innerWidth <= 700 ? MOBILE_CELL : CELL;
      const changed = width !== state.width || height !== state.height || dpr !== state.dpr || cellSize !== state.cellSize;
      if (!changed) return;

      state.width = width;
      state.height = height;
      state.dpr = dpr;
      state.cellSize = cellSize;
      state.cols = Math.ceil(width / cellSize);
      state.rows = Math.ceil(height / cellSize);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Recreate cell storage in O(1)-lookup row-major order.
      state.cells = Array.from({ length: state.cols * state.rows }, (_, i) => ({
        col: i % state.cols,
        row: Math.floor(i / state.cols),
        alpha: 0,
        touchedAt: 0,
        active: false,
      }));
      state.lastPoint = null;
    };

    const activateAt = (x, y, now) => {
      const col = Math.floor(x / state.cellSize);
      const row = Math.floor(y / state.cellSize);
      if (col < 0 || row < 0 || col >= state.cols || row >= state.rows) return;
      const cell = state.cells[row * state.cols + col];
      if (!cell) return;
      cell.alpha = PEAK_ALPHA;
      cell.touchedAt = now;
      cell.active = true;
      state.active = true;
    };

    const draw = (now) => {
      state.raf = 0;
      ctx.clearRect(0, 0, state.width, state.height);
      const size = state.cellSize;
      let stillActive = false;

      for (const cell of state.cells) {
        if (!cell.active) continue;
        const age = now - cell.touchedAt;
        if (age > HOLD_MS + FADE_MS) {
          cell.active = false;
          cell.alpha = 0;
          continue;
        }
        const fade = age <= HOLD_MS ? 1 : 1 - (age - HOLD_MS) / FADE_MS;
        const alpha = cell.alpha * clamp(fade, 0, 1);
        if (alpha <= 0.002) {
          cell.active = false;
          continue;
        }
        stillActive = true;

        const x = cell.col * size;
        const y = cell.row * size;
        const cx = x + size * 0.5;
        const cy = y + size * 0.5;
        const radius = size * 0.76;
        const lightTheme = document.documentElement.dataset.theme === 'light';
        const fillRgb = lightTheme ? '91, 111, 79' : '111, 145, 155';
        const strokeRgb = lightTheme ? '93, 112, 82' : '127, 153, 161';
        const gradient = ctx.createRadialGradient(cx, cy, 5, cx, cy, radius);
        // Muted sage in light mode, cool slate/teal in dark mode.
        gradient.addColorStop(0, `rgba(${fillRgb}, ${(alpha * (lightTheme ? 0.22 : 0.30)).toFixed(4)})`);
        gradient.addColorStop(0.55, `rgba(${fillRgb}, ${(alpha * (lightTheme ? 0.09 : 0.12)).toFixed(4)})`);
        gradient.addColorStop(1, `rgba(${fillRgb}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = `rgba(${strokeRgb}, ${(alpha * (lightTheme ? 0.22 : 0.34)).toFixed(4)})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
      }

      state.active = stillActive;
      if (stillActive) state.raf = requestAnimationFrame(draw);
    };

    const ensureFrame = () => {
      if (!reduceMotion && !state.raf) state.raf = requestAnimationFrame(draw);
    };

    if (!reduceMotion) {
      section.addEventListener('pointermove', (event) => {
        // The grid lives behind cards, and does not react to motion directly over those opaque cards.
        if (event.target instanceof Element && event.target.closest('.project-card')) {
          state.lastPoint = null;
          return;
        }
        const rect = section.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        if (x < 0 || y < 0 || x > state.width || y > state.height) return;
        const now = performance.now();

        if (state.lastPoint) {
          const dx = x - state.lastPoint.x;
          const dy = y - state.lastPoint.y;
          const distance = Math.hypot(dx, dy);
          const steps = Math.min(36, Math.max(1, Math.ceil(distance / (state.cellSize * 0.28))));
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            activateAt(state.lastPoint.x + dx * t, state.lastPoint.y + dy * t, now);
          }
        } else {
          activateAt(x, y, now);
        }
        state.lastPoint = { x, y };
        ensureFrame();
      }, { passive: true });

      section.addEventListener('pointerleave', () => { state.lastPoint = null; }, { passive: true });
      section.addEventListener('pointercancel', () => { state.lastPoint = null; }, { passive: true });
    }

    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(resize);
      observer.observe(section);
    } else {
      window.addEventListener('resize', resize, { passive: true });
    }
    resize();
  });
})();
