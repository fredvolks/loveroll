// One viewport coordinate system for the photograph, pedestal and dice contact.
export function fitSharedStage(root){
 const split=Math.max(230,innerHeight-215);
 root.style.setProperty('--home-scene-split',split+'px');
 root.style.setProperty('--home-scene-top-image-height',split/.438+'px');
 root.style.setProperty('--home-scene-bottom-image-height',(innerHeight-split)/.562+'px');
 root.style.setProperty('--home-scene-contact',split*.342/.438+'px');
}
