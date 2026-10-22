// Paginate the real form nodes: hidden screens retain values and action bindings.
export function fitSettingsScreens(root){
 if(!root.classList.contains('loveroll-settings-page'))return;
 const body=root.querySelector('.settings-detail-body,.editorial-workspace .editorial-content');
 if(!body||body.dataset.screensReady)return;
 body.dataset.screensReady='true';body.classList.add('settings-detail-body');
 const content=body.parentElement;
 const pager=document.createElement('nav');pager.className='settings-screen-pager';
 pager.setAttribute('aria-label','Pages des réglages');
 const previous=document.createElement('button'),next=document.createElement('button'),status=document.createElement('span');
 previous.type=next.type='button';previous.textContent='◀ Précédent';next.textContent='Suivant ▶';status.setAttribute('aria-live','polite');
 pager.append(previous,status,next);content.append(pager);
 let pages=[],index=0,observer,mutation,lastNotice,busy=false;
 function layout(){
  if(!body.isConnected){observer?.disconnect();mutation?.disconnect();return;}
  if(busy)return;busy=true;
  body.querySelectorAll('[data-screen-hidden]').forEach(el=>el.removeAttribute('data-screen-hidden'));
  pager.hidden=false;
  const budget=body.clientHeight;
  const style=getComputedStyle(body);
  const available=budget-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-14;
  if(budget<80){busy=false;return;}
  const units=[];
  function collect(el){
   const children=[...el.children];
   if(el.getBoundingClientRect().height>available&&children.length>1&&!el.matches('label,button,select,textarea,.push-option,.month-day-inputs'))children.forEach(collect);
   else units.push(el);
  }
  [...body.children].forEach(collect);
  const ancestors=new Set();
  for(const el of units)for(let p=el.parentElement;p&&p!==body;p=p.parentElement)ancestors.add(p);
  function show(list){
   const active=new Set(list);
   units.forEach(el=>el.toggleAttribute('data-screen-hidden',!active.has(el)));
   [...ancestors].reverse().forEach(el=>el.toggleAttribute('data-screen-hidden',!list.some(item=>el.contains(item))));
  }
  pages=[];let group=[];
  for(const unit of units){
   const candidate=[...group,unit];show(candidate);
   if(group.length&&body.scrollHeight>budget+1){pages.push(group);group=[unit];}else group=candidate;
  }
  if(group.length)pages.push(group);
  const notice=body.querySelector('.json-preview,#json-validation-error:not([hidden])');
  if(notice&&notice!==lastNotice){const page=pages.findIndex(list=>list.some(el=>el===notice||el.contains(notice)||notice.contains(el)));if(page>=0)index=page;}
  lastNotice=notice;
  index=Math.min(index,Math.max(0,pages.length-1));
  body._showSettingsScreen=()=>{
   show(pages[index]||[]);status.textContent=(index+1)+' / '+pages.length;
   previous.disabled=index===0;next.disabled=index>=pages.length-1;
   pager.hidden=pages.length<2;
  };
  body._showSettingsScreen();busy=false;
 }
 previous.addEventListener('click',()=>{index--;body._showSettingsScreen();previous.focus({preventScroll:true});});
 next.addEventListener('click',()=>{index++;body._showSettingsScreen();next.focus({preventScroll:true});});
 body.addEventListener('toggle',()=>requestAnimationFrame(layout),true);
 body.addEventListener('input',event=>{if(event.target.matches('input[type=search],#custom-card-search,input[type=checkbox]'))requestAnimationFrame(layout);});
 mutation=new MutationObserver(()=>requestAnimationFrame(layout));mutation.observe(body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open']});
 observer=new ResizeObserver(layout);observer.observe(body);layout();document.fonts.ready.then(layout);
}
