(() => {
  const overlay = document.getElementById('case-overlay');
  const panel = overlay?.querySelector('.case-overlay-panel');
  const closeButton = document.getElementById('case-overlay-close');
  const titleEl = document.getElementById('case-overlay-title');
  const indexEl = document.getElementById('case-overlay-index');
  const confidentialEl = document.getElementById('case-overlay-confidential');
  const fullPageLink = document.getElementById('case-overlay-fullpage');
  const savePdfLink = document.getElementById('case-overlay-save-pdf');
  const stage = document.getElementById('case-overlay-stage');
  const frame = document.getElementById('case-overlay-frame');
  const loadingLabel = document.getElementById('case-overlay-loading-label');
  const work = document.getElementById('work');
  const cvTrigger = document.querySelector('[data-open-cv]');
  const profileTrigger = document.querySelector('[data-open-profile]');
  if (!overlay || !panel || !closeButton || !titleEl || !indexEl || !fullPageLink || !savePdfLink || !stage || !frame || !work) return;

  const cases = {
    'b2b-demand-generation.html': { number: '01', title: 'B2B Demand Generation & Lead Activation' },
    'whitepaper-content-engine.html': { number: '02', title: 'Whitepaper Content Engine' },
    'rfp-proposal-system.html': { number: '03', title: 'RFP & Proposal System' },
    'lead-lifecycle-operations.html': { number: '04', title: 'Lead Lifecycle & Marketing Operations' },
    'event-brand-communications.html': { number: '05', title: 'Event & Brand Communications' },
    'posm-planner.html': { number: '06', title: 'POSM Planner' }
  };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MIN_LOADING_MS = reduceMotion ? 0 : 260;
  let closeTimer = 0;
  let settleTimer = 0;
  let activeUrl = '';
  let loadingStartedAt = 0;
  let loadGeneration = 0;
  let lastTrigger = null;
  let openerHadFocus = false;
  let closing = false;

  const caseRecord = url => {
    const file = new URL(url, window.location.href).pathname.split('/').pop();
    return cases[file] || { number: '—', title: 'Selected work' };
  };
  const forcePaint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const finishFrameLoad = async generation => {
    if (generation !== loadGeneration) return;
    try {
      const innerDoc = frame.contentDocument;
      if (innerDoc?.fonts?.ready) await innerDoc.fonts.ready.catch(() => {});
      await forcePaint();
    } catch (_) {
      // If the browser doesn't expose the iframe document, the native load event still counts.
    }
    const elapsed = performance.now() - loadingStartedAt;
    const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      if (generation !== loadGeneration || overlay.hidden) return;
      stage.dataset.loadState = 'ready';
      try {
        const innerDoc = frame.contentDocument;
        if (!innerDoc) return;
        innerDoc.addEventListener('keydown', event => {
          if (event.key === 'Escape' && !overlay.hidden) {
            event.preventDefault();
            closeOverlay();
          }
        });
        innerDoc.addEventListener('click', event => {
          const link = event.target.closest?.('a[href]');
          if (!link) return;
          const href = new URL(link.href, frame.src);
          if (href.origin !== window.location.origin) return;
          if (href.pathname.endsWith('/cv.html') && overlay.dataset.contentType === 'profile') {
            event.preventDefault();
            openDocument(href.href, lastTrigger, 'cv');
            return;
          }
          if (href.pathname === '/' || href.pathname.endsWith('/index.html')) {
            event.preventDefault();
            closeOverlay();
            if (href.hash) {
              history.replaceState(null, '', href.hash);
              requestAnimationFrame(() => document.querySelector(href.hash)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }));
            } else {
              history.replaceState(null, '', window.location.pathname + window.location.search);
              window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
            }
          }
        });
      } catch (_) {
        // Full-page navigation remains available for non-same-origin preview environments.
      }
    }, remaining);
  };

  const openDocument = (url, trigger, kind = 'case') => {
    const target = new URL(url, window.location.href);
    const validCase = target.origin === window.location.origin && target.pathname.includes('/case-studies/');
    const validCv = target.origin === window.location.origin && target.pathname.endsWith('/cv.html');
    const validProfile = target.origin === window.location.origin && target.pathname.endsWith('/about.html');
    if ((kind === 'case' && !validCase) || (kind === 'cv' && !validCv) || (kind === 'profile' && !validProfile)) {
      window.location.href = target.href;
      return;
    }

    lastTrigger = trigger || document.activeElement;
    openerHadFocus = Boolean(lastTrigger && typeof lastTrigger.focus === 'function');
    closing = false;
    window.clearTimeout(closeTimer);
    window.clearTimeout(settleTimer);
    loadGeneration += 1;
    const generation = loadGeneration;

    if (kind === 'cv') {
      titleEl.textContent = 'Curriculum Vitae';
      indexEl.textContent = 'PROFILE / CV';
      confidentialEl.textContent = 'PROFESSIONAL PROFILE';
      fullPageLink.href = 'cv.html';
      fullPageLink.textContent = 'OPEN CV PAGE ↗';
      fullPageLink.setAttribute('aria-label', 'Open the CV as a full page');
      savePdfLink.hidden = false;
      loadingLabel.textContent = 'Preparing curriculum vitae';
      frame.title = 'Curriculum vitae of Promit Mitra';
    } else if (kind === 'profile') {
      titleEl.textContent = 'Full Professional Profile';
      indexEl.textContent = 'PROFILE / ABOUT';
      confidentialEl.textContent = 'PROFESSIONAL OVERVIEW';
      fullPageLink.href = target.pathname;
      fullPageLink.textContent = 'OPEN PROFILE PAGE ↗';
      fullPageLink.setAttribute('aria-label', 'Open the professional profile as a full page');
      savePdfLink.hidden = true;
      loadingLabel.textContent = 'Preparing professional profile';
      frame.title = 'Full professional profile of Promit Mitra';
    } else {
      const record = caseRecord(target.href);
      titleEl.textContent = record.title;
      indexEl.textContent = `CASE ${record.number} / SELECTED WORK`;
      confidentialEl.textContent = 'CONFIDENTIAL DETAILS REMOVED';
      fullPageLink.href = target.pathname + target.hash;
      fullPageLink.textContent = 'OPEN FULL PAGE ↗';
      fullPageLink.setAttribute('aria-label', `Open ${record.title} as a full page`);
      savePdfLink.hidden = true;
      loadingLabel.textContent = 'Opening case study';
      frame.title = record.title;
    }

    const iframeUrl = new URL(target.href);
    iframeUrl.searchParams.set('overlay', '1');
    loadingStartedAt = performance.now();
    stage.dataset.loadState = 'loading';
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.dataset.contentType = kind;
    document.body.classList.add('case-overlay-open');

    overlay.classList.remove('is-open');
    // Commit the closed state so the backdrop blur and panel motion start from zero.
    void overlay.offsetWidth;
    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      closeButton.focus({ preventScroll: true });
    });

    if (activeUrl !== iframeUrl.href) {
      activeUrl = iframeUrl.href;
      frame.src = iframeUrl.href;
    } else {
      try { frame.contentWindow.scrollTo({ top: 0, behavior: 'instant' }); } catch (_) {}
      finishFrameLoad(generation);
    }
  };

  const closeOverlay = () => {
    if (closing || overlay.hidden) return;
    closing = true;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('case-overlay-open');
    const finish = () => {
      if (!closing) return;
      overlay.hidden = true;
      closing = false;
      if (openerHadFocus && lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true });
    };
    if (reduceMotion) finish();
    else {
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(finish, 440);
    }
  };

  work.addEventListener('click', event => {
    const link = event.target.closest('a.case-link, a.featured-cta');
    if (!link || !work.contains(link)) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openDocument(link.href, link, 'case');
  });

  cvTrigger?.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openDocument(new URL('cv.html', window.location.href).href, cvTrigger, 'cv');
  });

  profileTrigger?.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openDocument(new URL('about.html', window.location.href).href, profileTrigger, 'profile');
  });

  frame.addEventListener('load', () => finishFrameLoad(loadGeneration));
  closeButton.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) closeOverlay();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !overlay.hidden) {
      event.preventDefault();
      closeOverlay();
    }
    if (event.key === 'Tab' && !overlay.hidden && event.shiftKey && document.activeElement === closeButton) {
      event.preventDefault();
      (savePdfLink.hidden ? fullPageLink : savePdfLink).focus();
    } else if (event.key === 'Tab' && !overlay.hidden && !event.shiftKey && document.activeElement === fullPageLink) {
      event.preventDefault();
      (savePdfLink.hidden ? closeButton : savePdfLink).focus();
    } else if (event.key === 'Tab' && !overlay.hidden && !event.shiftKey && document.activeElement === savePdfLink) {
      event.preventDefault();
      closeButton.focus();
    }
  });

  work.querySelectorAll('a.case-link, a.featured-cta').forEach(link => {
    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-controls', 'case-overlay');
  });
  if (cvTrigger) {
    cvTrigger.setAttribute('aria-haspopup', 'dialog');
    cvTrigger.setAttribute('aria-controls', 'case-overlay');
  }
})();
