
import {ECLAT_FIRST} from './eclat-scenes-a.mjs';
import {ECLAT_LAST} from './eclat-scenes-b.mjs';
export const ECLAT_COFFRETS=Object.freeze([...ECLAT_FIRST,...ECLAT_LAST]);
export const ECLAT_MOODS=Object.freeze({
 romantique:'Romantique',ludique:'Ludique',mystere:'Mystérieux',sensuel:'Sensuel',
 sensoriel:'Sensoriel',musique:'Musical',detente:'Détente',finale:'Finale'
});
export function eclatCoffret(id){return ECLAT_COFFRETS.find(c=>c.id===Number(id))||null;}
export function eclatStage(coffretId,chapterNumber,variantNumber){
 const c=eclatCoffret(coffretId);
 if(!c)return null;
 const i=Number(chapterNumber)-1;
 if(!Number.isInteger(i)||i<0||i>7)return null;
 const ch=c.chapters[i];
 const variant=Number(variantNumber);
 if(!Number.isInteger(variant)||variant<0||variant>3)return null;
 return {...ch,coffret:c,chapterNumber:i+1,variantNumber:variant,story:ch.variants[variant]};
}
export function validateEclatCatalogue(){
 if(ECLAT_COFFRETS.length!==12 || new Set(ECLAT_COFFRETS.map(c=>c.id)).size!==12)
  throw Error('Éclat: 12 coffrets différents requis');
 const unique=new Set();
 for(const c of ECLAT_COFFRETS){
  if(c.chapters.length!==8||c.finales.length!==3||c.choices.length!==3)
   throw Error('Éclat: coffret incomplet '+c.id);
  for(const ch of c.chapters){
   if(ch.variants.length!==4||ch.roles.length!==2||new Set(ch.variants).size!==4)
    throw Error('Éclat: variantes invalides '+c.id);
   for(const variant of ch.variants){
    const key=variant.normalize('NFKC').toLocaleLowerCase('fr').trim();
    if(unique.has(key))throw Error('Éclat: texte de scène réutilisé '+c.id);
    unique.add(key);
   }
  }
 }
 return {coffrets:12,chapters:96,variants:unique.size,finales:36};
}
validateEclatCatalogue();
