(() => {

 /* Blog article Lenis initialization */
 if (window.Lenis && !window.portfolioLenis && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  window.portfolioLenis = new window.Lenis({
   autoRaf: true, anchors: true, smoothWheel: true,
   lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1
  });
 }
 /* Scroll-linked cover dissolve and blue progress rail */
 const coverHero = document.querySelector(".article-hero");
 const coverImage = document.querySelector(".article-cover");
 let fadeFrame = 0;
 const updateArticleScrollEffects = () => {
  fadeFrame = 0;
  const doc = document.documentElement;
  const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
  const progress = Math.max(0, Math.min(1, window.scrollY / maxScroll));
  doc.style.setProperty("--article-scroll-progress", progress);
  doc.style.setProperty("--article-scroll-pct", `${(progress * 100).toFixed(2)}%`);
  if (coverHero && coverImage && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
   const rect = coverHero.getBoundingClientRect();
   const travel = Math.max(1, rect.height * 1.05);
   const coverProgress = Math.max(0, Math.min(1, (window.innerHeight * 0.18 - rect.top) / travel));
   const fade = 55 + coverProgress * 35;
   coverImage.style.setProperty("--cover-fade", `${fade.toFixed(1)}%`);
  }
 };
 const requestArticleScrollEffects = () => {
  if (!fadeFrame) fadeFrame = window.requestAnimationFrame(updateArticleScrollEffects);
 };
 window.addEventListener("scroll", requestArticleScrollEffects, { passive: true });
 window.addEventListener("resize", requestArticleScrollEffects, { passive: true });
 updateArticleScrollEffects();



 const title=document.querySelector("[data-type-title]");
 if(!title)return;
 if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 const full=title.textContent;
 title.textContent="";
 title.setAttribute("aria-label",full);
 let i=0;
 const tick=()=>{title.textContent=full.slice(0,i++);if(i<=full.length)window.setTimeout(tick,i<5?85:24);};
 const begin=()=>window.setTimeout(tick,180);
 if("IntersectionObserver" in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();begin();}},{threshold:.25});observer.observe(title);}else begin();
 document.querySelector("[data-back-top]")?.addEventListener("click",e=>{e.preventDefault();window.scrollTo({top:0,behavior:"smooth"});});
})();