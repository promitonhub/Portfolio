(() => {
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