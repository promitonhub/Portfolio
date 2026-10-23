(() => {
  "use strict";
  const root = document.documentElement;
  const systemQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(min-width: 701px) and (hover: hover) and (pointer: fine)");
  let fullMotionOverride = false;
  try { fullMotionOverride = localStorage.getItem("promit-motion-mode") === "full" && finePointer.matches; } catch (_) {}
  root.dataset.motionMode = fullMotionOverride ? "full" : "system";
  window.portfolioShouldReduceMotion = () => !fullMotionOverride && systemQuery.matches;

  const addControl = () => {
    const navTools = document.querySelector(".site-header .nav-tools");
    const articleTools = document.querySelector(".article-nav-actions");
    const host = navTools || articleTools;
    if (!host || host.querySelector(".motion-preference-toggle")) return;
    if (!systemQuery.matches && !fullMotionOverride) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "motion-preference-toggle";
    button.textContent = fullMotionOverride ? "MOTION: FULL" : "ENABLE MOTION";
    button.setAttribute("aria-label", fullMotionOverride ? "Return to system motion preference" : "Enable full motion for this website");
    button.title = fullMotionOverride ? "Return to your macOS/browser motion preference" : "Use the full portfolio animations on this device";
    button.addEventListener("click", () => {
      try {
        if (fullMotionOverride) localStorage.removeItem("promit-motion-mode");
        else localStorage.setItem("promit-motion-mode", "full");
      } catch (_) {
        window.alert("This browser blocked site storage. Allow site storage, then try again.");
        return;
      }
      window.location.reload();
    });
    host.insertBefore(button, host.firstElementChild);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addControl, { once: true });
  else addControl();
  systemQuery.addEventListener?.("change", () => {
    if (!fullMotionOverride) root.dataset.motionMode = "system";
  });

  // Opt-in diagnostic: add ?motion-diagnostics=1 to any URL or run
  // portfolioMotionDiagnostics() in the browser console for a compact report.
  window.portfolioMotionDiagnostics = () => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const heroTitle = document.querySelector(".hero-title-dissolve");
    const asciiOutput = heroTitle?.querySelector(".ascii-dissolve-output");
    const portrait = document.querySelector(".hero-ascii-art");
    const report = {
      url: location.href,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      viewport: `${innerWidth}x${innerHeight}`,
      devicePixelRatio: devicePixelRatio,
      motionPreference: query.matches ? "reduce" : "no-preference",
      siteMotionMode: root.dataset.motionMode || "unset",
      reducedMotionDecision: Boolean(window.portfolioShouldReduceMotion?.()),
      lenisLibraryLoaded: Boolean(window.Lenis),
      lenisInstanceCreated: Boolean(window.portfolioLenis),
      fontsStatus: document.fonts?.status || "unsupported",
      heroTitlePresent: Boolean(heroTitle),
      asciiOutputPresent: Boolean(asciiOutput),
      asciiOutputDisplay: asciiOutput ? getComputedStyle(asciiOutput).display : "not present",
      portraitPresent: Boolean(portrait),
      portraitBounds: portrait ? `${Math.round(portrait.getBoundingClientRect().width)}x${Math.round(portrait.getBoundingClientRect().height)}` : "not present",
      intersectionObserver: "IntersectionObserver" in window,
      resizeObserver: "ResizeObserver" in window,
      animationCount: document.getAnimations?.().length ?? "unsupported",
      cssAnimations: [...document.querySelectorAll("*")].filter(el => getComputedStyle(el).animationName !== "none").length,
      cssTransitions: [...document.querySelectorAll("*")].filter(el => getComputedStyle(el).transitionDuration.split(",").some(v => parseFloat(v) > 0)).length,
      pageHidden: document.hidden,
      lastScriptError: window.__portfolioLastScriptError || "not captured"
    };
    console.group("Portfolio Mac motion diagnostics");
    console.table(report);
    console.log("Full report JSON:", JSON.stringify(report, null, 2));
    console.groupEnd();
    return report;
  };
  if (new URLSearchParams(location.search).get("motion-diagnostics") === "1") {
    const log = () => { try { window.portfolioMotionDiagnostics(); } catch (error) { console.error("Motion diagnostics failed", error); } };
    if (document.readyState === "complete") log();
    else window.addEventListener("load", log, { once: true });
  }
  window.addEventListener("error", event => {
    window.__portfolioLastScriptError = event.message || "resource/runtime error";
  });
  window.addEventListener("unhandledrejection", event => {
    window.__portfolioLastScriptError = String(event.reason?.message || event.reason || "unhandled rejection");
  });
})();
