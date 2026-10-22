// Navigate the same fixed settings screens as a person using Previous/Next.
exports.revealSetting=async function(page,selector){
 const target=page.locator(selector);
 if(!await target.count())return;
 for(let step=0;step<60;step++){
  if(!await target.evaluate(el=>!!el.closest('[data-screen-hidden]')))return;
  const next=page.getByRole('button',{name:'Suivant ▶',exact:true});
  if(await next.isVisible()&&await next.isEnabled())await next.click();
  else{
   const previous=page.getByRole('button',{name:'◀ Précédent',exact:true});
   if(!await previous.isVisible())throw Error('Unreachable setting '+selector);
   while(await previous.isEnabled())await previous.click();
  }
 }
 throw Error('Unreachable setting '+selector);
};
