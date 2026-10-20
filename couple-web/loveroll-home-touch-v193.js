/* LoveRoll native tactile buttons. Accessible pressed state; no screenshot hotspots. */
(()=>{
 const root=document.getElementById('app');if(!root)return;
 const match=e=>e.target?.closest?.('button.home-roll-button,button.home-next-month,.nav .nav-inner>button');
 const down=e=>{if(root.classList.contains('loveroll-real-home')){const b=match(e);if(b&&!b.disabled)b.classList.add('lr-pressed');}};
 const up=e=>{const b=match(e);if(b)setTimeout(()=>b.classList.remove('lr-pressed'),105);};
 root.addEventListener('pointerdown',down,{passive:true});
 root.addEventListener('pointerup',up,{passive:true});
 root.addEventListener('pointercancel',up,{passive:true});
 root.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter')down(e);});
 root.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter')up(e);});
})();