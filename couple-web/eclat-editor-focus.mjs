// Retain the active private textarea across harmless Éclat view refreshes.
// Never recover focus across an account, duo, chapter or entitlement change.
export function captureEclatEditorFocus(root,activeElement,scope){
 if(!scope||!root?.contains?.(activeElement)||
    !activeElement?.matches?.('textarea[data-eclat-field]'))return null;
 const kind=activeElement.dataset?.eclatField;
 if(kind!=='note'&&kind!=='clue'||!activeElement.id)return null;
 return {scope,id:activeElement.id,kind,
  start:activeElement.selectionStart,end:activeElement.selectionEnd,
  direction:activeElement.selectionDirection,
  detailsOpen:activeElement.closest?.('details')?.open===true};
}

export function restoreEclatEditorFocus(root,snapshot,scope){
 if(!snapshot||!scope||snapshot.scope!==scope)return false;
 const field=[...(root?.querySelectorAll?.('textarea[data-eclat-field]')||[])]
  .find(node=>node.id===snapshot.id&&
   node.dataset?.eclatField===snapshot.kind&&!node.disabled);
 if(!field)return false;
 const details=field.closest?.('details');
 if(details&&snapshot.detailsOpen)details.open=true;
 try{field.focus({preventScroll:true});}
 catch{field.focus();}
 if(Number.isInteger(snapshot.start)&&Number.isInteger(snapshot.end)){
  try{field.setSelectionRange(snapshot.start,snapshot.end,snapshot.direction||'none');}
  catch{/* Selection APIs can be limited on older mobile WebViews. */}
 }
 return true;
}
