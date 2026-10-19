// Six stable event slots, shared between both partners, without resetting historical rolls.
export function surpriseSlot(kind,owner=null){
 return kind==='birthday'?'birthday:'+String(owner||''):String(kind||'');
}
export function surpriseCustom(settings,kind,owner=null){
 const item=settings?.surprise_event_overrides?.[surpriseSlot(kind,owner)];
 return item&&typeof item==='object'&&!Array.isArray(item)?item:{};
}
export function surpriseTitle(settings,kind,owner,defaultTitle){
 const title=surpriseCustom(settings,kind,owner).title;
 return typeof title==='string'&&title.trim()?title.trim():defaultTitle;
}
export function validAnnualDate(iso){
 if(typeof iso!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(iso))return false;
 const date=new Date(iso+'T12:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===iso;
}


// Date shown to Quebec users in the keyboard editor (storage stays ISO).
export function displaySurpriseDate(iso){
 return validAnnualDate(iso)?iso.slice(8,10)+'/'+iso.slice(5,7)+'/'+iso.slice(0,4):'';
}
export function formatSurpriseDateInput(raw){
 const digits=String(raw??'').replace(/\D/g,'').slice(0,8);
 if(digits.length<=2)return digits;
 if(digits.length<=4)return digits.slice(0,2)+'/'+digits.slice(2);
 return digits.slice(0,2)+'/'+digits.slice(2,4)+'/'+digits.slice(4);
}
export function parseSurpriseDateInput(raw){
 const text=String(raw??'').trim();
 if(validAnnualDate(text))return text;
 const match=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
 if(!match)return null;
 const iso=match[3]+'-'+match[2].padStart(2,'0')+'-'+match[1].padStart(2,'0');
 return validAnnualDate(iso)?iso:null;
}
