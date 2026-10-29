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
 const basePhotoHeight=width*1672/941;
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
 // The decorative D100 now uses centered-photo camera fitting, so keep
 // the photographed marble ABOVE the start/summary controls in landscape.
 const inactiveEvening=isEvening&&!!root.querySelector('.evening-premium-view.is-inactive');
 const activeEveningD100=isEvening&&!!root.querySelector('.evening-premium-view.has-evening-d100-template');
 const alignedEveningD100=inactiveEvening||activeEveningD100;
 const contactRatio=landscape?(inactiveEvening?.49:isEvening?.56:.45):.405;
 // The active D100 has a category row ABOVE the theater, unlike Surprise.
 // Its former 40.5dvh photo contact left only 211px for a 440px stage:
 // the actual ruby mesh shrank to 207px, against Surprise's 321px.
 // Lower the SAME photographed marble enough for the real WebGL silhouette,
 // both before the soirée starts and while the D100 is playable.
 const hero=inactiveEvening?root.querySelector('.evening-finale-hero'):
  activeEveningD100?root.querySelector('.evening-d100-theater'):null;
 const stage=hero?.querySelector('.love3d-stage');
 const heroBounds=hero?.getBoundingClientRect();
 const stageBounds=stage?.getBoundingClientRect();
 const neededContact=heroBounds&&stageBounds?.width>0?
  heroBounds.top+stageBounds.width*.735+8:0;
 const contact=alignedEveningD100?Math.max(height*contactRatio,
  Math.min(height*.70,neededContact)):height*contactRatio;
 // Extend the same HD photo behind the lowered marble, never add a second
 // scenic layer or move the WebGL die independently of its photographed base.
 const photoHeight=alignedEveningD100?Math.max(basePhotoHeight,contact/.342):basePhotoHeight;
 const offset=contact-photoHeight*.342;
 root.style.setProperty('--home-scene-top-image-height',photoHeight+'px');
 root.style.setProperty('--home-scene-contact',contact+'px');
 root.style.setProperty('--lr-ipad-scene-offset',offset+'px');
}
