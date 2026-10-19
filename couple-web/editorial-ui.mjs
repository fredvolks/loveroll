import {ritualHeadingHtml} from './brand.mjs?v=20261017-ritual130';
export const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function editorialIcon(key){
 const paths={heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-8.8 1.6 5.5 5.5 0 0 0-8.8-1.6c-4.1 4.2 1.2 10.2 8.8 15.4 7.6-5.2 12.9-11.2 8.8-15.4Z"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 8-3 8-3 10h18c0-2-3-2-3-10ZM10 21h4"/>',
 book:'<path d="M12 5v16M12 5C8 2 5 3 2 4v15c3-1 6-2 10 2 4-4 7-3 10-2V4c-3-1-6-2-10 1Z"/>',
 lock:'<rect x="5" y="10" width="14" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 15v3"/>',
 phone:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4M11 19h2"/>',
 home:'<path d="m3 10 9-8 9 8v12h-7v-7h-4v7H3Z"/>',
 globe:'<circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4" ry="10"/><path d="M2 12h20"/>',
 reset:'<path d="M3 9a9 9 0 1 1 0 6M3 3v6h6"/>',
 help:'<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5M12 17v1"/>',
 dice:'<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="7.5" cy="7.5" r=".7"/><circle cx="12" cy="12" r=".7"/><circle cx="16.5" cy="16.5" r=".7"/>',
 star:'<path d="m12 2 3 7 7 .8-5.3 4.8 1.5 7-6.2-3.7L5.8 22l1.5-7.4L2 9.8 9 9Z"/>',
 calendar:'<rect x="3" y="5" width="18" height="17" rx="2"/><path d="M7 2v6M17 2v6M3 11h18M7 16h2M13 16h2"/>',
 moon:'<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>',
 sync:'<path d="M4 8a9 9 0 0 1 15-3l2 3h-6M20 16a9 9 0 0 1-15 3l-2-3h6M21 2v6M3 22v-6"/>',
 upload:'<path d="M12 16V2m-5 5 5-5 5 5M5 11H3v11h18V11h-2"/>',
 file:'<path d="M14 2H5v20h14V7ZM14 2v6h5M8 12h8M8 16h8"/>',
 check:'<circle cx="12" cy="12" r="10"/><path d="m6 12 4 4 8-9"/>',
 shield:'<path d="m12 2 9 4v6c0 5-6 9-9 10-3-1-9-5-9-10V6Z"/>',
 search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 7 7"/>',
 clock:'<circle cx="12" cy="13" r="9"/><path d="M10 1h4M12 8v6l3 2"/>',
 mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 5 10 8L22 5"/>',
 user:'<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3Z"/>',
 edit:'<path d="m15 3 6 6M3 21l2-7L17 2l5 5L10 19Z"/>',
 unlink:'<path d="m3 3 18 18M7 6 5 8a5 5 0 0 0 7 7M17 18l2-2a5 5 0 0 0-7-7M8 17l-2 2M16 7l2-2"/>'};
 return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">'+(paths[key]||paths.heart)+'</svg>';
}
export function editorialHeader(action='settings-page:',parent='Réglages'){
 return '<header class="settings-page-header">'+(action?'<button class="settings-back" data-action="'+escapeHtml(action)+'"><span aria-hidden="true">‹</span><span>'+escapeHtml(parent)+'</span></button>':'')+ritualHeadingHtml('NOTRE RITUEL À DEUX')+'</header>';
}
export function editorialPage(title,body,{back='settings-page:jeu',parent='Cartes et activités',subtitle='',badge='',kind='form'}={}){
 return '<section class="settings-editorial editorial-workspace editorial-page-'+kind+'">'+editorialHeader(back,parent)+
 '<div class="settings-editorial-content"><div class="editorial-title"><h1>'+escapeHtml(title)+'</h1>'+
 (badge?'<small class="editorial-badge">'+editorialIcon('shield')+escapeHtml(badge)+'</small>':'')+'</div>'+
 (subtitle?'<p class="settings-detail-intro">'+escapeHtml(subtitle)+'</p>':'')+
 '<div class="editorial-content">'+body+'</div></div></section>';
}
export function editorialRow(title,detail='',action='',icon='heart',extra=''){
 const tag=action?'button':'div';
 return '<'+tag+' class="editorial-row" '+(action?'type="button" data-action="'+escapeHtml(action)+'"':'')+' '+extra+'>'+
 '<span class="editorial-row-icon">'+editorialIcon(icon)+'</span><span><strong>'+escapeHtml(title)+'</strong>'+
 (detail?'<small>'+escapeHtml(detail)+'</small>':'')+'</span>'+(action?'<b aria-hidden="true">›</b>':'')+'</'+tag+'>';
}
export const editorButton=(action,label,secondary=false)=>'<button type="button" data-action="'+escapeHtml(action)+'" class="'+(secondary?'settings-secondary':'settings-primary')+'">'+label+'</button>';
export function timerFields(prefix,minutes,label='Ajouter un minuteur'){
 return '<div class="editorial-timer"><label class="push-option"><span>'+editorialIcon('clock')+escapeHtml(label)+'</span><input type="checkbox" role="switch" id="'+prefix+'-timer-enabled"'+(minutes?' checked':'')+'></label>'+
 '<label class="editorial-timer-duration"'+(!minutes?' hidden':'')+'>Durée (minutes)<input id="'+prefix+'-minutes" type="number" inputmode="numeric" min="1" max="60" value="'+(minutes||5)+'"></label></div>';
}
export function roleChoice(name,current='both'){
 return '<div class="editorial-person-choices" role="group" aria-label="'+(name==='custom-drawer'?'Qui peut piger':'Qui peut recevoir')+'">'+
 ['both','him','her'].map(role=>'<label><input type="radio" id="'+name+'-'+role+'" name="'+name+'" value="'+role+'"'+(current===role?' checked':'')+'><span>'+({both:'Les deux',him:'Homme',her:'Femme'}[role])+'</span></label>').join('')+'</div>';
}
