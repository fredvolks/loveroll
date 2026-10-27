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
 // On Soirée the inactive decorative D100 is taller and needs extra air
 // under the heading. Landscape also needs a lower contact so the REAL D100
 // is legible rather than reduced to a tiny icon on the large marble.
 // Keep the Home/Android-approved anchor untouched.
 const isEvening=root.classList.contains('loveroll-evening-page');
 // Preserve the approved portrait crop from Android at all times; pushing
 // the photo down exposes a flat maroon strip across the iPad header.
 // A taller landscape needs a LOWER photographed marble so the real D100
 // remains readable (without replacing/scaling the photographic asset).
 const landscape=win.matchMedia('(orientation:landscape)').matches;
 // On landscape inactive Soirée the decorative D100 has a large silhouette.
 // Lower the REAL photographic marble far enough to reveal its top under
 // the headings. This does not create a maroon strip: the landscape source
 // is taller than the viewport and its calculated offset remains negative.
 const inactiveEvening=isEvening&&!!root.querySelector('.evening-premium-view.is-inactive');
 const contactRatio=landscape?(inactiveEvening?.66:isEvening?.56:.45):.405;
 const contact=height*contactRatio;
 const offset=contact-photoHeight*.342;
 root.style.setProperty('--home-scene-top-image-height',photoHeight+'px');
 root.style.setProperty('--home-scene-contact',contact+'px');
 root.style.setProperty('--lr-ipad-scene-offset',offset+'px');
}
