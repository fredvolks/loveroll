// Follow the actual named menu buttons; never expose hidden fields by force.
exports.revealSetting=async function(page,selector){
 const target=page.locator(selector).first();if(!await target.count())return;
 for(let attempt=0;attempt<12;attempt++){
  const hidden=await target.evaluate(el=>!!el.closest('[data-menu-hidden],[hidden]'));
  if(!hidden)return;
  const path=await target.evaluate(el=>el.closest('[data-settings-path]')?.dataset.settingsPath||'');
  const current=await page.locator('.settings-detail-body').first().getAttribute('data-settings-location')||'';
  // A parent route is on the way TO a nested leaf, not a wrong destination.
  // Back only if the current branch is genuinely outside the requested path.
  if(current&&current!==path&&!path.startsWith(current+'/')){
   await page.locator('.settings-back').click();continue;
  }
  const keys=path.split('/').filter(Boolean),done=current.split('/').filter(Boolean).length;
  if(keys[done])await page.locator('[data-settings-open="'+keys[done]+'"]').click();
  else throw Error('Unreachable setting '+selector+' in '+current+' -> '+path);
 }
 throw Error('Menu navigation did not reach '+selector);
};
