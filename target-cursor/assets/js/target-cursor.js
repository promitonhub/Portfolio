(() => {
  'use strict';

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointer.matches || reducedMotion.matches) return;
  if (document.querySelector('.target-cursor')) return;

  const settings = {
    targetSelector: 'a, button, [role="button"], input, textarea, select, summary, [data-cursor-target], .cursor-target',
    cursorColor: '#ffffff',
    cursorColorOnTarget: '#ffffff',
    spinDuration: 2,
    hoverDuration: 0.2,
    parallaxOn: true,
    hideDefaultCursor: true,
    size: 36,
    cornerSize: 12,
    thickness: 3,
    padding: 6,
    matchRadius: true,
    dotSize: 4,
    blendMode: 'difference',
    showLabel: true,
    clickEffect: true
  };

  const root = document.createElement('div');
  root.className = 'target-cursor';
  root.setAttribute('aria-hidden', 'true');
  root.style.mixBlendMode = settings.blendMode;
  root.style.opacity = '0';

  const corners = [0, 90, 180, 270].map(() => {
    const el = document.createElement('span');
    el.className = 'target-cursor__corner';
    root.appendChild(el);
    return el;
  });
  const dot = document.createElement('span');
  dot.className = 'target-cursor__dot';
  root.appendChild(dot);
  const label = document.createElement('span');
  label.className = 'target-cursor__label';
  root.appendChild(label);
  document.body.appendChild(root);

  const style = document.createElement('style');
  document.head.appendChild(style);

  const pointer = { x: 0, y: 0, inside: false, seen: false, pressed: false };
  const springState = () => ({ x: 0, v: 0 });
  const centerX = springState();
  const centerY = springState();
  const halfW = springState();
  const halfH = springState();
  const radius = springState();
  const turn = springState();
  const lock = springState();
  const press = springState();
  const presence = springState();
  const QUARTER = Math.PI / 2;
  let target = null;
  let targetRadius = 0;
  let quarter = 0;
  let spinSpeed = 0;
  let raf = 0;
  let last = 0;
  let lastColor = '';
  let lastLabel = '';

  const spring = (state, goal, stiffness, damping, dt) => {
    const steps = 2;
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      state.v += (stiffness * (goal - state.x) - damping * state.v) * h;
      state.x += state.v * h;
    }
  };

  const hideCursor = () => {
    const rule = settings.hideDefaultCursor && pointer.inside ? 'html, html * { cursor: none !important; }' : '';
    if (style.textContent !== rule) style.textContent = rule;
  };

  const findTarget = (x, y, element) => {
    const node = element || document.elementFromPoint(x, y);
    return node?.closest?.(settings.targetSelector) || null;
  };

  const lockOn = next => {
    if (next === target) return;
    target = next;
    if (target) {
      quarter = Math.round(turn.x / QUARTER);
      targetRadius = parseFloat(getComputedStyle(target).borderTopLeftRadius) || 0;
      spinSpeed = 0;
    }
  };

  const frame = now => {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    if (target && !target.isConnected) lockOn(null);
    const rect = target ? target.getBoundingClientRect() : null;
    const locked = !!rect && pointer.inside;
    const snapW = 4.6 / settings.hoverDuration;
    const snapK = snapW * snapW;
    const snapC = 2 * 0.62 * snapW;

    spring(presence, pointer.inside ? 1 : 0, 260, 32, dt);
    spring(lock, locked ? 1 : 0, snapK, 2 * snapW, dt);
    spring(press, pointer.pressed && settings.clickEffect ? 1 : 0, 900, 40, dt);

    let goalX = pointer.x;
    let goalY = pointer.y;
    let goalW = settings.size / 2;
    let goalH = settings.size / 2;
    let goalR = Math.min(2, settings.cornerSize / 4);
    if (locked) {
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const lean = settings.parallaxOn ? 0.08 : 0;
      goalX = cx + (pointer.x - cx) * lean;
      goalY = cy + (pointer.y - cy) * lean;
      const odd = Math.abs(quarter) % 2 === 1;
      goalW = (odd ? rect.height : rect.width) / 2 + settings.padding;
      goalH = (odd ? rect.width : rect.height) / 2 + settings.padding;
      goalR = settings.matchRadius ? Math.min(targetRadius + Math.max(0, settings.padding), settings.cornerSize) : 0;
    }

    if (!pointer.inside && presence.x < 0.01) pointer.seen = false;
    if (!pointer.seen) {
      centerX.x = goalX;
      centerY.x = goalY;
      halfW.x = goalW;
      halfH.x = goalH;
      pointer.seen = pointer.inside;
    }

    const follow = locked ? snapK : 2200;
    const followC = locked ? snapC : 2 * Math.sqrt(2200);
    spring(centerX, goalX, follow, followC, dt);
    spring(centerY, goalY, follow, followC, dt);
    spring(halfW, goalW, snapK, snapC, dt);
    spring(halfH, goalH, snapK, snapC, dt);
    spring(radius, goalR, snapK, 2 * snapW, dt);

    if (locked) {
      spring(turn, quarter * QUARTER, snapK, snapC, dt);
    } else {
      const speed = settings.spinDuration > 0 ? (Math.PI * 2) / settings.spinDuration : 0;
      spinSpeed += (speed - spinSpeed) * (1 - Math.exp(-dt * 3));
      turn.v = spinSpeed;
      turn.x += spinSpeed * dt;
    }

    const squeeze = 1 - press.x * 0.14;
    const cos = Math.cos(turn.x);
    const sin = Math.sin(turn.x);
    const w = Math.max(0, halfW.x) * squeeze;
    const h = Math.max(0, halfH.x) * squeeze;
    const points = [[-w, -h], [w, -h], [w, h], [-w, h]];
    const r = Math.max(0, Math.min(radius.x, settings.cornerSize));
    const degrees = turn.x * 180 / Math.PI;
    let left = Infinity;
    let top = Infinity;
    corners.forEach((corner, i) => {
      const [lx, ly] = points[i];
      const x = centerX.x + lx * cos - ly * sin;
      const y = centerY.x + lx * sin + ly * cos;
      left = Math.min(left, x);
      top = Math.min(top, y);
      corner.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${([0, 90, 180, 270][i] + degrees).toFixed(2)}deg)`;
      corner.style.width = `${settings.cornerSize}px`;
      corner.style.height = `${settings.cornerSize}px`;
      corner.style.borderWidth = `${settings.thickness}px 0 0 ${settings.thickness}px`;
      corner.style.borderTopLeftRadius = `${r.toFixed(2)}px`;
    });

    dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%) scale(${(1 - press.x * 0.35).toFixed(3)})`;
    dot.style.width = `${settings.dotSize}px`;
    dot.style.height = `${settings.dotSize}px`;

    const text = settings.showLabel && target ? target.getAttribute('data-cursor-label') || '' : '';
    if (text && text !== lastLabel) label.textContent = text;
    if (text) lastLabel = text;
    const shown = text ? Math.max(0, Math.min(1, lock.x)) : 0;
    label.style.transform = `translate3d(${(Number.isFinite(left) ? left : centerX.x).toFixed(2)}px, ${((Number.isFinite(top) ? top : centerY.x) - 8).toFixed(2)}px, 0) translateY(-100%) translateY(${((1 - shown) * 4).toFixed(2)}px)`;
    label.style.opacity = shown.toFixed(3);

    const mix = Math.round(Math.max(0, Math.min(1, lock.x)) * 100);
    const color = `color-mix(in oklab, ${settings.cursorColorOnTarget} ${mix}%, ${settings.cursorColor})`;
    if (color !== lastColor) {
      root.style.setProperty('--target-cursor-color', color);
      lastColor = color;
    }
    root.style.opacity = Math.max(0, Math.min(1, presence.x)).toFixed(3);

    const resting = !pointer.inside && presence.x < 0.002 && Math.abs(presence.v) < 0.002 && Math.abs(lock.x) < 0.002 && Math.abs(press.x) < 0.002;
    const spinning = pointer.inside && !locked && spinSpeed > 0.0001;
    const moving = Math.abs(centerX.v) + Math.abs(centerY.v) + Math.abs(halfW.v) + Math.abs(halfH.v) + Math.abs(turn.v) > 0.01 || Math.abs(goalX - centerX.x) + Math.abs(goalY - centerY.x) > 0.05 || Math.abs(lock.v) + Math.abs(press.v) + Math.abs(presence.v) > 0.001;
    if (!resting && (spinning || moving || locked)) raf = requestAnimationFrame(frame);
    else last = 0;
  };

  const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const onPointerMove = event => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    const inside = true;
    if (inside !== pointer.inside) {
      pointer.inside = inside;
      hideCursor();
    }
    lockOn(findTarget(pointer.x, pointer.y, event.target));
    wake();
  };
  const onPointerDown = event => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    pointer.pressed = true;
    wake();
  };
  const onPointerUp = () => { pointer.pressed = false; wake(); };
  const onLeave = () => {
    pointer.inside = false;
    pointer.pressed = false;
    lockOn(null);
    hideCursor();
    wake();
  };
  const onScroll = () => {
    if (!pointer.inside) return;
    lockOn(findTarget(pointer.x, pointer.y));
    wake();
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true, capture: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);
  finePointer.addEventListener?.('change', () => { if (!finePointer.matches) onLeave(); });
  reducedMotion.addEventListener?.('change', () => { if (reducedMotion.matches) onLeave(); });

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('scroll', onScroll, true);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('blur', onLeave);
    root.remove();
    style.remove();
  }, { once: true });
})();
