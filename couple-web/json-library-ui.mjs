// Shared HTML controls for LoveRoll JSON library backup/import on phone and iPad.
import {editorialIcon,escapeHtml as esc} from './editorial-ui.mjs';
export function jsonInputId(kind){
 return kind==='special'?'special-events-json':kind==='advent'?'advent-2026-json':
  kind==='monthly'?'json-input-monthly':'json-input-evening';
}
export function jsonToolsPanel(kind,label,pending=null){
 return '<section class="json-tools" aria-label="Import et export JSON">'+
 '<div class="editorial-json-actions"><button type="button" class="editorial-row" data-action="json-export:'+kind+'">'+editorialIcon('upload')+'<strong>Exporter JSON</strong><b aria-hidden="true">›</b></button>'+
 '<label class="editorial-row json-file-button">'+editorialIcon('file')+'<strong>Choisir un fichier</strong><b aria-hidden="true">›</b><input type="file" data-json-file="'+kind+'" accept=".json,application/json,text/plain"></label></div>'+
 '<small id="json-file-name" role="status"></small><label>Ou coller le JSON<textarea id="'+jsonInputId(kind)+'" rows="5" spellcheck="false" placeholder="Collez votre fichier JSON ici"></textarea></label>'+
 '<p id="json-validation-error" class="editorial-error" role="alert" hidden></p>'+
 '<button type="button" class="settings-primary" data-action="json-preview:'+kind+'">Prévisualiser</button>'+
 (pending?.kind===kind?'<div class="json-preview">'+editorialIcon('check')+'<strong>'+esc(pending.summary.label)+'</strong>'+
 '<p>'+pending.summary.count+' éléments'+(pending.summary.total>pending.summary.count?' / '+pending.summary.total+' emplacements':'')+' · '+pending.summary.timers+' minuteur(s)</p><small>Fichier valide · aucun changement enregistré</small>'+(pending.fileName?'<small>'+esc(pending.fileName)+'</small>':'')+
 '<button type="button" class="settings-primary" data-action="json-apply:'+kind+'">Confirmer l’import</button>'+
 '<button type="button" class="settings-signout" data-action="json-cancel">Annuler</button></div>':'')+
 '<p class="editorial-note">'+editorialIcon('help')+'<span>Les anciens tirages restent conservés. Aucun compte, secret ou journal personnel n’est exporté.</span></p>'+
 (kind==='evening'?'<details class="settings-help-item"><summary>Format des restrictions</summary><p><code>both</code> : les deux · <code>him</code> : homme · <code>her</code> : femme. Champs <code>drawer_role</code> et <code>recipient_role</code>. La durée <code>timer_minutes</code> est facultative.</p></details>':'')+
 (kind==='special'?'<details class="settings-help-item"><summary>Format des minuteries</summary><p><code>minuteurs.D6_activite</code> et <code>minuteurs.D6_modificateur</code> : six durées en minutes, ou <code>null</code> pour désactiver une minuterie.</p></details>':'')+'</section>';
}
export async function exportJsonFile(filename,content){
 if(typeof window!=='undefined'&&window.LoveRollNativeAuth?.exportJson){
  window.LoveRollNativeAuth.exportJson(filename,content);return;
 }
 const url=URL.createObjectURL(new Blob([content],{type:'application/json;charset=utf-8'}));
 try{
  const link=document.createElement('a');
  link.href=url;link.download=filename;document.body.appendChild(link);
  link.click();link.remove();
 }finally{setTimeout(()=>URL.revokeObjectURL(url),10000);}
}
