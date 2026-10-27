// One viewport coordinate system for the photograph, pedestal and dice contact.
export function fitSharedStage(root){
 const split=Math.max(230,innerHeight-215);
 root.style.setProperty('--home-scene-split',split+'px');
 root.style.setProperty('--home-scene-top-image-height',split/.438+'px');
 root.style.setProperty('--home-scene-bottom-image-height',(innerHeight-split)/.562+'px');
 root.style.setProperty('--home-scene-contact',split*.342/.438+'px');
}

/* iPad/desktop: scale the SAME Android HD photograph without stretching it.
   Its photographed marble contact is at 34.2% of the source image height. */
export function fitTabletRomanceStage(root){
 const win=root.ownerDocument.defaultView;
 if(!win?.matchMedia('(min-width:768px)').matches)return;
 const width=root.getBoundingClientRect().width||win.innerWidth;
 const height=win.innerHeight;
 // Source photographed artwork: 941 x 1672. Cover the full tablet width.
 const photoHeight=width*1672/941;
 const contact=height*(win.matchMedia('(orientation:landscape)').matches?.45:.405);
 const offset=contact-photoHeight*.342;
 root.style.setProperty('--home-scene-top-image-height',photoHeight+'px');
 root.style.setProperty('--home-scene-contact',contact+'px');
 root.style.setProperty('--lr-ipad-scene-offset',offset+'px');
}
