/* LoveRoll — show the user's pixel-matched approved reference only while
   the real data already matches its initial state. No fake data, no new draws. */
(()=>{
 const baselineOdds=['50%','25%','12%','8%','4%','1%'];
 const baselineStats=['0','0 / 0','—','0'];
 const eligible=app=>{
  if(!app?.classList.contains('loveroll-real-home'))return false;
  if(!matchMedia('(max-width:767px) and (orientation:portrait)').matches)return false;
  const die=app.querySelector('.home-die-platform canvas[data-dice-preview="true"]');
  const weekly=app.querySelector('.home-roll-button[data-action="roll:weekly"]:not(:disabled)');
  const surprise=app.querySelector('.home-next-month strong');
  const title=app.querySelector('.home-title h2');
  const odds=[...app.querySelectorAll('.home-weight > span:last-child')].map(x=>x.textContent.trim());
  const stats=[...app.querySelectorAll('.home-stat-card strong')].map(x=>x.textContent.trim());
  const summary=[...app.querySelectorAll('.home-challenge-stats .home-summary-value > strong')].map(x=>x.textContent.trim());
  const partners=[...app.querySelectorAll('.home-challenge-stats small')].map(x=>x.textContent.trim());
  return !!(die&&weekly&&surprise?.textContent.trim()==='Brasser notre surprise'&&
   title?.textContent.trim()==='Cette semaine, on joue ?'&&
   odds.length===6&&odds.every((x,i)=>x===baselineOdds[i])&&
   stats.length===4&&stats.every((x,i)=>x===baselineStats[i])&&
   summary.length===3&&summary.every(x=>x==='—')&&
   partners.some(x=>/Fred/.test(x))&&partners.some(x=>/Émilie/.test(x))&&
   app.querySelectorAll('.nav button').length===5);
 };
 const app=document.getElementById('app');
 if(!app)return;
 const sync=()=>{const yes=eligible(app);if(app.classList.contains('approved-home-idle')!==yes)app.classList.toggle('approved-home-idle',yes);};
 let queued=false;
 const observer=new MutationObserver(()=>{
  if(queued)return;queued=true;
  queueMicrotask(()=>{queued=false;sync();});
 });
 observer.observe(app,{childList:true,subtree:true,characterData:true,attributes:true,
  attributeFilter:['disabled','data-dice-preview']});
 window.addEventListener('resize',sync);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
 sync();
})();
