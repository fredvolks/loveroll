// Named settings destinations. Form nodes stay mounted so changing a submenu
// never drops an edit or changes what an existing Save action submits.
let previousRoute='',previousPath=[];
const q=(root,selector)=>[...root.querySelectorAll(selector)];
const field=(root,id)=>root.querySelector('#'+id)?.closest('label');
const nodes=(...values)=>values.flat(Infinity).filter(Boolean);
export function organizeSettingsMenus(root){
 if(!root.querySelector('.settings-account-overview'))root.classList.remove('settings-account-full');
 const body=root.querySelector('.settings-detail-body,.editorial-workspace .editorial-content');
 if(!root.classList.contains('loveroll-settings-page')||!body){previousRoute='';previousPath=[];return;}
 if(body.dataset.menusReady)return;
 body.dataset.menusReady='true';body.classList.add('settings-detail-body');
 const route=body.dataset.settingsPage||root.querySelector('.editorial-title h1')?.textContent||'';
 const find=s=>q(body,s),f=id=>field(body,id),a=name=>body.querySelector('[data-action="'+name+'"]');
 const entry=(key,label,items,extra={})=>({key,label,nodes:nodes(items),...extra});
 const link=(selector)=>{const node=body.querySelector(selector);return node?{key:'',label:node.innerText,node}:null;};
 const direct=selector=>find(selector).map(node=>({key:'',label:node.innerText,node}));
 let tree=[];
 if(route==='compte'){
  // The entire account is one editable view; retain the original save handlers.
  body.classList.add('settings-account-overview');
  root.classList.add('settings-account-full');
  const group=body.querySelector('.settings-premium-glass-group');
  const signout=body.querySelector('[data-action="signout"]');
  if(group&&signout)group.append(signout);
  const note=body.querySelector('.loveroll-style-select small');
  if(note){note.classList.add('settings-account-style-note');body.querySelector('.settings-birthday-edit')?.after(note);}
  previousRoute=route;previousPath=[];root._settingsMenuBack=()=>false;
  return;
 }
 if(route==='couple'&&body.querySelector('.settings-duo-card'))tree=[
  entry('duo','Notre duo',[find('.settings-duo-card'),find(':scope>.tiny-note'),a('cycle-reopen')]),
  entry('date','Notre anniversaire',[find('.settings-date-outer'),a('save-couple-date')]),
  entry('association','Gérer notre association',find('.settings-danger-zone'))
 ];
 else if(route==='couple'&&body.querySelector('.partner-invite-panel'))tree=[
  entry('invitation','Préparer mon invitation',find('.partner-invite-status,.partner-invite-fields')),
  entry('partager','Partager mon invitation',nodes(find('.partner-invite-share,.invite-copy-manual'),a('confirm-invite-sent'))),
  entry('options','Gérer le lien',find('.partner-invite-options')),
  entry('apercu','Aperçu de l’invitation',find('.partner-invite-preview'))
 ];
 else if(route==='jeu')tree=[...direct(':scope>.settings-link-row'),
  entry('categories','Catégories visibles',find('.settings-category-options')),
  // LR-015: the menu refactor moves original rows to a hidden source.
  // Register the gated excluded-cards destination as a real visible leaf;
  // otherwise the button exists in DOM but cannot be tapped on mobile.
  link('.settings-advanced [data-action="settings-page:excluded-cards"]'),
  link('.settings-advanced [data-action="settings-page:admin"]')
 ];
 else if(route==='notifications')tree=[
  entry('appareil','Sur cet appareil',[find('.notification-summary,.notification-actions,.notification-feedback,.notification-privacy')]),
  entry('alertes','Choisir mes alertes',find('.notification-choices,.notification-feedback')),
  entry('rappel','Rappel du lundi',find('.notification-local'))
 ];
 else if(route==='application')tree=[
  entry('application','Application et mises à jour',find('.settings-app-group:first-child')),
  entry('aide','Aide et fonctionnement',find('.settings-app-group:last-child'))
 ];
 else if(route==='monde'){
  const cards=find('.world-prefs-card'),duo=cards[1],personal=cards[0];
  tree=[entry('personnel','Langue et devise',personal),
   entry('depart','Point de départ',[f('world-origin'),a('world-gps'),find('#world-gps-status'),a('save-world-duo')]),
   entry('deplacements','Nos déplacements',[f('world-radius'),f('world-local-enabled'),a('save-world-duo')]),
   entry('localisation','À propos de la localisation',duo?q(duo,':scope>p'):[])];
 }
 else if(route==='admin'){
  const children=[...body.children],cycle=children.findIndex(el=>el.tagName==='H3'&&el.textContent.startsWith('Notre cycle'));
  const mode=body.querySelector('.admin-sexual-card-mode');
  tree=[entry('tirages','Tirages et réinitialisation',children.slice(0,cycle<0?1:cycle)),
   entry('cycle','Notre cycle de défis',cycle<0?[]:children.slice(cycle,children.indexOf(mode))),
   {key:'cartes',label:'Origine des défis',children:[
    entry('mode','Choisir le mode des cartes',mode?q(mode,':scope>h3,:scope>label,:scope>button'):[]),
    entry('explications','Comprendre les deux modes',mode?q(mode,':scope>p'):[])
   ]},
   {key:'probabilites',label:'Probabilités des dés',children:[
    entry('semaine','Dé de la semaine',find('[data-dice-weight="weekly"] .admin-dice-weight-editor')),
    entry('soiree','Dé de la soirée',find('[data-dice-weight="evening"] .admin-dice-weight-editor')),
    entry('categories','Sensuel et Sexuel',find('[data-category-weights] .admin-dice-weight-editor'))
   ]},
   {key:'occasions',label:'Destinataires des occasions',children:find(':scope>details:not([data-dice-weight]):not([data-category-weights]) .muted-line').map((row,i)=>entry('occasion-'+i,row.querySelector('strong')?.textContent||'Occasion',row))}
  ];
 }
 else if(route==='aide'){const topics=find('.settings-help-item');tree=[{key:'compte',label:'Compte et application',children:[0,7,8,9].map(i=>entry('sujet-'+i,topics[i]?.querySelector('summary')?.textContent||'Aide',topics[i]))},{key:'jeux',label:'Jeux et activités',children:[1,2,3,4,5,6].map(i=>entry('sujet-'+i,topics[i]?.querySelector('summary')?.textContent||'Aide',topics[i]))}];}
 else if(route==='aide-des')tree=[
  entry('rituel','Le rituel de la semaine',find(':scope>p:nth-child(1)')),
  entry('categories','Catégories et probabilités',find(':scope>p:nth-child(2)')),
  entry('surprises','Surprises, dons et cycles',find(':scope>p:nth-child(3)'))
 ];
 else if(body.querySelector('.settings-referral-card')){
  const card=body.querySelector('.settings-referral-card');
  tree=[entry('partager','Partager mon lien',q(card,':scope>label,:scope>input,:scope>.settings-referral-actions')),
   entry('credits','Nos crédits',q(card,':scope>.settings-referral-progress-head,:scope>.settings-referral-progress-track,:scope>.settings-referral-due,:scope>.settings-referral-wallets')),
   entry('statistiques','Nos invitations',q(card,':scope>.settings-referral-stats,:scope>p')),
   {key:'regles',label:'Comment ça fonctionne',children:[
    entry('gagner','Gagner des crédits',q(card,':scope>details>p').slice(0,3)),
    entry('utiliser','Utiliser nos crédits',q(card,':scope>details>p').slice(3,5)),
    entry('conditions','Conditions du programme',q(card,':scope>details>p').slice(5))
   ]}];
 }
 // Editors have named tasks too; no numbered screens or automatic slicing.
 else if(body.querySelector('.editorial-form')){
  const form=body.querySelector('form.editorial-form')||body.querySelector('.editorial-form');
  const textFields=q(form,'label').filter(el=>el.querySelector('input[type=text],input:not([type]),textarea')&&!el.closest('.editorial-timer'));
  const selection=q(form,'label').filter(el=>el.querySelector('select[data-editor-select]'));
  const save=q(form,':scope>button');
  const timer=q(form,'.editorial-timer');
  tree=[entry('choix','Choisir quoi modifier',nodes(selection,q(form,'.editorial-segments'))),
   entry('texte','Titre et consigne',nodes(textFields.slice(0,2),save)),
   entry('description','Description',textFields.length>2?nodes(textFields.slice(2),save):[]),
   entry('personnes','Qui peut piger ou recevoir ?',nodes(q(form,':scope>fieldset'),save)),
   entry('minuteur','Minuteur',nodes(timer,save)),
   entry('evenement','Nom et date de l’événement',find(':scope>div.editorial-form')),
   entry('destinataire','Personne concernée',find(':scope>.editorial-separated:not(form):not(.editorial-form)')),
   ...direct(':scope>.editorial-row')];
 }
 else if(body.querySelector('.json-tools')){
  const json=body.querySelector('.json-tools');
  tree=[entry('fichier','Importer un fichier',nodes(q(json,'.editorial-json-actions .json-file-button,#json-file-name,#json-validation-error'),q(json,'[data-action^="json-preview:"]'))),
   entry('coller','Coller le JSON',nodes(q(json,':scope>label,#json-validation-error'),q(json,'[data-action^="json-preview:"]'))),
   entry('exporter','Exporter et formats',nodes(q(json,'.editorial-json-actions button,:scope>p.editorial-note,:scope>details'))),
   entry('apercu','Vérifier l’import',q(json,'.json-preview'))];
 }
 else if(body.querySelector('.editorial-card-list')){
  // A searchable selector replaces the long 100-card list.
  const list=body.querySelector('.editorial-card-list'),buttons=q(list,'button');
  const picker=document.createElement('label');picker.className='settings-card-selector';picker.textContent='Carte à modifier';
  const select=document.createElement('select');select.id='settings-card-choice';select.setAttribute('data-draft-ignore','');select.setAttribute('aria-label','Carte à modifier');
  const blank=document.createElement('option');blank.value='';blank.textContent='Choisir une carte';select.append(blank);
  buttons.forEach((button,i)=>{const option=document.createElement('option');option.value=button.dataset.cardId;option.textContent=button.innerText.replace(/\s+/g,' ').replace(/›$/,'').trim();select.append(option);});
  const filter=()=>{for(const option of [...select.options].slice(1)){option.hidden=buttons.find(button=>button.dataset.cardId===option.value)?.hidden;}if(select.selectedOptions[0]?.hidden)select.value='';};
  body.querySelector('#custom-card-search')?.addEventListener('input',()=>requestAnimationFrame(filter));body.querySelector('#custom-card-filter')?.addEventListener('change',()=>requestAnimationFrame(filter));
  select.addEventListener('change',()=>{if(select.value!=='')buttons.find(button=>button.dataset.cardId===select.value)?.click();});picker.append(select);list.before(picker);
  tree=[entry('cartes','Modifier une carte',nodes(find('.editorial-segments,.editorial-library-count,.editorial-library-filters'),picker)),
   entry('tirage','Règle de tirage',find('.editorial-draw-rule')),...direct(':scope>.editorial-row')];
 }
 else if(body.querySelector('.editorial-event-list'))tree=[entry('evenements','Choisir un événement',find('.editorial-event-list')),...direct(':scope>.editorial-row')];
 tree=tree.filter(Boolean);
 function prune(items){return items.filter(item=>{if(item.children){item.children=prune(item.children);return item.children.length;}return item.node||item.nodes?.length;});}
 tree=prune(tree);if(!tree.length)return;
 body.classList.add('has-settings-menus');
 const title=root.querySelector('.editorial-title h1'),baseTitle=title?.textContent||'Réglages';
 const source=document.createElement('div');source.className='settings-menu-source';source.append(...body.childNodes);body.append(source);
 const menu=document.createElement('nav');menu.className='settings-submenu-list';menu.setAttribute('aria-label',baseTitle);body.prepend(menu);
 let originalNodes=[...source.querySelectorAll('*')];
 function assign(items,path=[]){for(const item of items){const next=[...path,item.key].filter(Boolean);if(item.children)assign(item.children,next);else if(item.node){item.node.dataset.settingsPath=path.join('/');}else for(const node of item.nodes)if(!node.dataset.settingsPath)node.dataset.settingsPath=next.join('/');}}
 assign(tree);
 let path=route===previousRoute?[...previousPath]:[];
 if(source.querySelector('.json-preview'))path=['apercu'];
 const back=root.querySelector('.settings-back'),backHtml=back?.innerHTML;
 function locate(){let items=tree,current=null,valid=[];for(const key of path){current=items.find(item=>item.key===key);if(!current)break;valid.push(key);items=current.children||[];}path=valid;return {current,items};}
 function show(){
  const {current,items}=locate();const leaf=current&&!current.children;
  previousRoute=route;previousPath=[...path];body.dataset.settingsLocation=path.join('/');
  if(title)title.textContent=current?.label||baseTitle;
  menu.hidden=!!leaf;source.hidden=!leaf;
  if(leaf){const chosen=current.nodes;for(const el of originalNodes){if(menu.contains(el))continue;el.toggleAttribute('data-menu-hidden',!chosen.some(node=>node===el||node.contains(el)||el.contains(node)));}for(const details of q(source,'details'))details.open=true;}
  else{
   menu.replaceChildren();
   for(const item of items){
    if(item.node){item.node.removeAttribute('data-menu-hidden');q(item.node,'[data-menu-hidden]').forEach(el=>el.removeAttribute('data-menu-hidden'));menu.append(item.node);continue;}
    const button=document.createElement('button');button.type='button';button.className='settings-submenu-row lr-surface';button.dataset.settingsOpen=item.key;
    const text=document.createElement('span');text.textContent=item.label;const arrow=document.createElement('b');arrow.setAttribute('aria-hidden','true');arrow.textContent='›';button.append(text,arrow);
    button.addEventListener('click',()=>{path.push(item.key);show();});menu.append(button);
   }
  }
  if(back){if(path.length){back.innerHTML='<span aria-hidden="true">‹</span><span></span>';back.lastElementChild.textContent=path.length>1?tree.find(item=>item.key===path[0])?.label||baseTitle:baseTitle;}else back.innerHTML=backHtml;}
 }
 const goBack=()=>{if(!body.isConnected||!path.length)return false;path.pop();show();return true;};
 back?.addEventListener('click',event=>{if(path.length){event.preventDefault();event.stopImmediatePropagation();goBack();}},true);
 root._settingsMenuBack=goBack;show();
 // JSON validation may add content without rebuilding the editor.
 const observer=new MutationObserver(()=>{
  if(!body.isConnected){observer.disconnect();return;}
  if(route==='Importer / exporter'){
   const preview=source.querySelector('.json-preview'),error=source.querySelector('#json-validation-error:not([hidden])');
   if(preview&&!tree.find(item=>item.key==='apercu')){originalNodes=[...source.querySelectorAll('*')];tree.push(entry('apercu','Vérifier l’import',preview));assign(tree);path=['apercu'];show();}
   if(error){const item=tree.find(item=>item.key==='coller');if(item&&!item.nodes.includes(error))item.nodes.push(error);}
  }
 });observer.observe(source,{childList:true,subtree:true});
}
