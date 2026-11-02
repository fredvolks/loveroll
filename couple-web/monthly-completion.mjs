// LR-SURPRISE-001: shared completion, private-to-couple individual memories.
// Never confirms venue booking, pays money or modifies the D100/D6.
import {safePrivatePhotoUrl} from './monthly-private-photo.mjs';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function monthlyCompletionHtml({available=false,completion=null,feedback=[],photoUrls={},viewerId=null,locale='fr-CA'}={}){
 if(!available||!viewerId)return '';
 if(!completion)return '<section class="surprise-completion" aria-label="Notre sortie réalisée">'+
  '<strong>Et après notre rendez-vous ?</strong>'+
  '<p>Quand vous aurez profité de votre sortie, gardez un souvenir à deux.</p>'+
  '<button type="button" data-action="geo-complete" class="surprise-primary">On l’a fait ♥</button>'+
  '<small>Cette action enregistre le moment dans LoveRoll, pas auprès de l’établissement.</small></section>';
 const my=feedback.find(r=>r.author_id===viewerId)||null;
 const others=feedback.filter(r=>r.author_id!==viewerId);
 const myPhoto=my?.photo_path?safePrivatePhotoUrl(photoUrls[my.photo_path]):null;
 const opts=[['','Choisir (facultatif)'],['1','1/5'],['2','2/5'],['3','3/5'],['4','4/5'],['5','5/5']];
 const options=opts.map(([value,label])=>'<option value="'+value+'"'+(String(my?.rating??'')===value?' selected':'')+'>'+label+'</option>').join('');
 let stamp='Sortie réalisée';
 try{stamp=new Intl.DateTimeFormat(locale,{dateStyle:'long'}).format(new Date(completion.completed_at));}catch{}
 return '<section class="surprise-completion" aria-label="Souvenirs de notre sortie">'+
  '<strong>♥ On l’a fait !</strong><p>'+esc(stamp)+'</p>'+
  '<label for="geo-memory-rating">Mon appréciation</label>'+
  '<select id="geo-memory-rating">'+options+'</select>'+
  '<label for="geo-memory-text">Mon souvenir (facultatif)</label>'+
  '<textarea id="geo-memory-text" maxlength="500" rows="3" placeholder="Votre moment préféré…">'+esc(my?.memory_text||'')+'</textarea>'+
  '<button type="button" data-action="geo-memory-save" class="surprise-primary">Garder mon souvenir</button>'+
  '<div class="surprise-memory-photo-tools">'+
   '<label for="geo-photo-input">Ma photo souvenir (facultative)</label>'+
   (myPhoto?'<img class="surprise-memory-photo" alt="Ma photo souvenir" loading="lazy" referrerpolicy="no-referrer" src="'+esc(myPhoto)+'">':'')+
   '<input id="geo-photo-input" type="file" accept="image/jpeg,image/png,image/webp">'+
   '<button type="button" data-action="geo-photo-save" class="surprise-geo-text-button">'+
    (my?.photo_path?'Remplacer ma photo':'Ajouter une photo')+'</button>'+
   (my?.photo_path?'<button type="button" data-action="geo-photo-delete" class="surprise-geo-text-button">Retirer ma photo</button>':'')+
   '<small>Photo JPEG privée, redimensionnée et réencodée sans métadonnées GPS. 3 Mo maximum. Aucune publication publique.</small>'+
  '</div>'+
  '<small>Vos souvenirs sont visibles seulement par les membres actuels de votre duo.</small>'+
  (others.length?'<div class="surprise-partner-memories"><strong>De notre autre moitié</strong>'+
   others.map(r=>'<div class="surprise-partner-memory">'+
    '<p>'+(r.rating?'Appréciation '+esc(r.rating)+'/5 · ':'')+esc(r.memory_text||'')+'</p>'+
    (r.photo_path&&safePrivatePhotoUrl(photoUrls[r.photo_path])?
     '<img class="surprise-memory-photo" alt="Photo souvenir de mon partenaire" loading="lazy" referrerpolicy="no-referrer" src="'+esc(safePrivatePhotoUrl(photoUrls[r.photo_path]))+'">':'')+
   '</div>').join('')+'</div>':'')+
  '</section>';
}
