(() => {
 const cards=[...document.querySelectorAll(".post-card")];
 const buttons=[...document.querySelectorAll("[data-filter]")];
 const search=document.querySelector("#post-search");
 const empty=document.querySelector(".empty-state");
 let active="all";
 const update=()=>{const q=(search?.value||"").trim().toLowerCase();let count=0;cards.forEach(card=>{const ok=(active==="all"||card.dataset.category===active)&&(!q||(card.dataset.search||"").includes(q));card.hidden=!ok;if(ok)count++;});if(empty)empty.hidden=count>0;};
 buttons.forEach(button=>button.addEventListener("click",()=>{active=button.dataset.filter||"all";buttons.forEach(b=>{const selected=b===button;b.classList.toggle("is-active",selected);b.setAttribute("aria-pressed",String(selected));});update();}));
 search?.addEventListener("input",update);
 document.addEventListener("keydown",e=>{if(e.key==="/"&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||"")){e.preventDefault();search?.focus();}if(e.key==="Escape"&&document.activeElement===search){search.value="";search.blur();update();}});
})();