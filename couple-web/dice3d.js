import * as THREE from 'https://esm.sh/three@0.167.1';
import {ROLL_TOTAL_MS,makeForwardRoll,rollAngles,rollProgress,rollOffset} from './dice-roll-motion.mjs';
import {RoundedBoxGeometry} from 'https://esm.sh/three@0.167.1/examples/jsm/geometries/RoundedBoxGeometry.js';
import {ConvexGeometry} from 'https://esm.sh/three@0.167.1/examples/jsm/geometries/ConvexGeometry.js';
import {faceMarks,engravedFace} from './dice-engraving.mjs';
/** Safari/Chrome WebGL die. Values come from the shared server, never from animation. */
const pool=new Set();
// A genuine convex 35-faced die. The polar dual of a 35-vertex convex hull
// has one planar polygonal face per original vertex (no duplicate side labels).
function manySidedGeometry(count=35){
 const goldenAngle=Math.PI*(3-Math.sqrt(5));
 const points=Array.from({length:count},(_,i)=>{
  const y=1-2*(i+.5)/count,ring=Math.sqrt(Math.max(0,1-y*y)),a=i*goldenAngle;
  return new THREE.Vector3(Math.cos(a)*ring,y,Math.sin(a)*ring);
 });
 const hull=new ConvexGeometry(points),position=hull.getAttribute('position');
 const triangles=[];
 for(let i=0;i<position.count;i+=3){
  const a=new THREE.Vector3().fromBufferAttribute(position,i),
   b=new THREE.Vector3().fromBufferAttribute(position,i+1),
   c=new THREE.Vector3().fromBufferAttribute(position,i+2);
  const outward=b.clone().sub(a).cross(c.clone().sub(a)).normalize(),
   center=a.clone().add(b).add(c).multiplyScalar(1/3);
  if(outward.dot(center)<0)outward.negate();
  const dist=outward.dot(a);
  if(dist<.01)throw Error('Invalid polyhedral die hull');
  triangles.push({vertices:[a,b,c],dual:outward.divideScalar(dist)});
 }
 hull.dispose();
 const vertices=[],normals=[],segments=[],sideNormals=new Map(),labelCenters=new Map(),polygons=[];
 for(let i=0;i<count;i++){
  const outward=points[i].clone().normalize();
  const corners=triangles.filter(tri=>
   tri.vertices.some(v=>v.distanceToSquared(points[i])<1e-7))
   .map(tri=>tri.dual.clone());
  if(corners.length<3)throw Error('Incomplete polyhedral die face '+(i+1));
  const center=corners.reduce((a,v)=>a.add(v),new THREE.Vector3())
   .divideScalar(corners.length);
  const u=new THREE.Vector3(0,1,0).cross(outward).normalize();
  if(u.lengthSq()<.1)u.set(1,0,0).cross(outward).normalize();
  const v=outward.clone().cross(u).normalize();
  corners.sort((a,b)=>Math.atan2(a.clone().sub(center).dot(v),a.clone().sub(center).dot(u))-
   Math.atan2(b.clone().sub(center).dot(v),b.clone().sub(center).dot(u)));
  for(let j=0;j<corners.length;j++){
   const a=corners[j],b=corners[(j+1)%corners.length];
   segments.push(...a.toArray(),...b.toArray());
  }
  for(let j=1;j<corners.length-1;j++){
   const a=corners[0],b=corners[j],c=corners[j+1];
   // Reverse the fan if needed so external normal and lighting face out.
   const cross=b.clone().sub(a).cross(c.clone().sub(a));
   const tri=cross.dot(outward)>=0?[a,b,c]:[a,c,b];
   for(const p of tri){vertices.push(...p.toArray());normals.push(...outward.toArray());}
  }
  polygons.push({corners:corners.map(p=>p.clone()),normal:outward.clone(),value:i+1});
  sideNormals.set(i+1,outward);
  labelCenters.set(i+1,center.clone().addScaledVector(outward,.055));
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 const edges=new THREE.BufferGeometry();
 edges.setAttribute('position',new THREE.Float32BufferAttribute(segments,3));
 return {geo,edges,normals:sideNormals,labelCenters,polygons};
}


/**
 * True rounded polyhedron (convex body ⊕ small sphere), not a wireframe or
 * smooth-shaded fake. The original N planar faces remain flat. Narrow
 * cylindrical edge fillets and spherical vertex caps create a rounded,
 * watertight-looking glossy silhouette with PBR lighting.
 *
 * Each original face is translated to q + bevel * outwardNormal where
 * q=(1-shrink)*point. Adjacent faces connect through normal-arc strips;
 * all normal arcs are completed by round vertex caps.
 * Supabase results / dice-face indexing are entirely unaffected.
 */
function roundedPolyhedron(polygons,{bevel=.105,shrink=.075,steps=6,surface}={}){
 const positions=[],shades=[];
 const vertices=new Map(),edges=new Map();
 const pointKey=p=>p.toArray().map(n=>Math.round(n*10000)).join(',');
 const q=p=>p.clone().multiplyScalar(1-shrink);
 const keyVertices=new Map();
 const insertVertex=p=>{
  const key=pointKey(p);
  if(!keyVertices.has(key))keyVertices.set(key,p.clone());
  return key;
 };
 const arc=(na,nb,t)=>{
  const angle=na.angleTo(nb);
  if(angle<1e-8)return na.clone();
  const a=Math.sin((1-t)*angle)/Math.sin(angle),b=Math.sin(t*angle)/Math.sin(angle);
  return na.clone().multiplyScalar(a).addScaledVector(nb,b).normalize();
 };
 const tri=(a,b,c,na,nb,nc)=>{
  // Keep every patch outward-facing even when face ring winds differently.
  const middle=na.clone().add(nb).add(nc).normalize();
  if(b.clone().sub(a).cross(c.clone().sub(a)).dot(middle)<0){
   [b,c]=[c,b];[nb,nc]=[nc,nb];
  }
  for(const [p,n] of [[a,na],[b,nb],[c,nc]]){
   positions.push(...p.toArray());shades.push(...n.toArray());
  }
 };
 for(const face of polygons){
  const n=face.normal.clone().normalize();
  const corners=face.corners;
  // Planar face interiors are retained so every die still has N genuine faces.
  const center=corners.reduce((acc,p)=>acc.add(p),new THREE.Vector3()).divideScalar(corners.length);
  const middle=q(center).addScaledVector(n,bevel);
  const shifted=corners.map(p=>q(p).addScaledVector(n,bevel));
  if(surface){const carved=surface(shifted,n,face.value);positions.push(...carved.glassPositions);shades.push(...carved.glassNormals);}
  else for(let j=0;j<shifted.length;j++)tri(middle,shifted[j],shifted[(j+1)%shifted.length],n,n,n);
  for(let j=0;j<corners.length;j++){
   const a=insertVertex(corners[j]),b=insertVertex(corners[(j+1)%corners.length]);
   const sorted=a<b?[a,b]:[b,a],key=sorted.join(':');
   if(!edges.has(key))edges.set(key,{a:keyVertices.get(sorted[0]),b:keyVertices.get(sorted[1]),normals:[]});
   edges.get(key).normals.push(n.clone());
   for(const vertexKey of [a,b]){
    if(!vertices.has(vertexKey))vertices.set(vertexKey,{position:keyVertices.get(vertexKey),normals:[]});
    if(!vertices.get(vertexKey).normals.some(old=>old.distanceToSquared(n)<1e-8))
      vertices.get(vertexKey).normals.push(n.clone());
   }
  }
 }
 // A real swept round fillet around each original polyhedron edge.
 for(const edge of edges.values()){
  if(edge.normals.length!==2)throw Error('Non-manifold die edge');
  const [na,nb]=edge.normals,qa=q(edge.a),qb=q(edge.b);
  for(let j=0;j<steps;j++){
   const n0=arc(na,nb,j/steps),n1=arc(na,nb,(j+1)/steps);
   const a=qa.clone().addScaledVector(n0,bevel);
   const b=qb.clone().addScaledVector(n0,bevel);
   const cc=qb.clone().addScaledVector(n1,bevel);
   const d=qa.clone().addScaledVector(n1,bevel);
   tri(a,b,cc,n0,n0,n1);tri(a,cc,d,n0,n1,n1);
  }
 }
 // Smooth corner caps complete the junction of all round bevels.
 for(const corner of vertices.values()){
  const centerNormal=corner.position.clone().normalize();
  const base=q(corner.position),ns=corner.normals;
  const u=new THREE.Vector3(0,1,0).cross(centerNormal);
  if(u.lengthSq()<.01)u.set(1,0,0).cross(centerNormal);
  u.normalize();
  const v=centerNormal.clone().cross(u).normalize();
  ns.sort((a,b)=>Math.atan2(a.dot(v),a.dot(u))-Math.atan2(b.dot(v),b.dot(u)));
  const apex=base.clone().addScaledVector(centerNormal,bevel);
  for(let i=0;i<ns.length;i++){
   const na=ns[i],nb=ns[(i+1)%ns.length];
   for(let j=0;j<steps;j++){
    const n0=arc(na,nb,j/steps),n1=arc(na,nb,(j+1)/steps);
    tri(apex,base.clone().addScaledVector(n0,bevel),
      base.clone().addScaledVector(n1,bevel),centerNormal,n0,n1);
   }
  }
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.setAttribute('normal',new THREE.Float32BufferAttribute(shades,3));
 geo.computeBoundingSphere();
 return geo;
}
function twentyPolygons(geo){
 const p=geo.getAttribute('position'),faces=[];
 for(let i=0;i<p.count;i+=3){
  const corners=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,i+j));
  const center=corners.reduce((a,v)=>a.add(v),new THREE.Vector3()).divideScalar(3);
  const n=corners[1].clone().sub(corners[0])
    .cross(corners[2].clone().sub(corners[0])).normalize();
  if(n.dot(center)<0)n.negate();
  faces.push({value:i/3+1,corners,normal:n});
 }
 if(faces.length!==20)throw Error('D20 must contain exactly 20 faces');
 return faces;
}

// Soft studio reflections give transparent glass visible edges on the existing
// satin photograph. This environment belongs to one renderer and is disposed
// with it; the photograph, die geometry and official face orientation stay put.
function glassEnvironment(renderer){
 const studio=new THREE.Scene();studio.background=new THREE.Color(0x24050c);
 const shape=document.createElement('canvas');shape.width=64;shape.height=128;
 const ctx=shape.getContext('2d');
 const cross=ctx.createLinearGradient(0,0,64,0);
 cross.addColorStop(0,'rgba(255,255,255,0)');
 cross.addColorStop(.25,'rgba(255,255,255,.85)');
 cross.addColorStop(.5,'white');
 cross.addColorStop(.75,'rgba(255,255,255,.85)');
 cross.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=cross;ctx.fillRect(0,0,64,128);
 ctx.globalCompositeOperation='destination-in';
 const ends=ctx.createLinearGradient(0,0,0,128);
 ends.addColorStop(0,'rgba(255,255,255,0)');ends.addColorStop(.12,'white');
 ends.addColorStop(.88,'white');ends.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=ends;ctx.fillRect(0,0,64,128);
 const softbox=new THREE.CanvasTexture(shape);softbox.colorSpace=THREE.SRGBColorSpace;
 const panels=[];
 for(const [color,power,w,h,position] of [
  [0xffeadc,5,1.2,3.6,[-2.1,.15,2.8]],
  [0xffe6df,4,.62,3.1,[2.3,.45,2.4]],
  [0xfff6ed,3,2.6,.7,[0,2.35,2.6]],
  [0xffffff,1.8,1.2,1.4,[-1.4,1.4,3.5]],
  [0xffe8d4,7,.24,4,[-3,.2,-1.6]],
  [0xfff1df,7,.24,4,[3,.2,-1.6]],
  [0xffd6c0,.45,2.4,4,[-3,.2,-1.6]],
  [0xffe5d3,.45,2.4,4,[3,.2,-1.6]],
  [0xffd9c3,5,3,.9,[0,-2,-1.1]],
  [0x8d1c35,1.5,4,4,[0,.5,-4]]
 ]){
  const material=new THREE.MeshBasicMaterial({map:softbox,
   color:new THREE.Color(color).multiplyScalar(power),side:THREE.DoubleSide,
   transparent:true,depthWrite:false});
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);
  panel.position.set(...position);panel.lookAt(0,0,0);studio.add(panel);panels.push(panel);
 }
 const generator=new THREE.PMREMGenerator(renderer);
 const target=generator.fromScene(studio,.025,.1,20);
 generator.dispose();
 for(const panel of panels){panel.geometry.dispose();panel.material.dispose();}
 softbox.dispose();
 return target;
}

// Three's physical transmission must see the satin photograph. The CSS image
// is projected into its offscreen refraction pass only; the canvas remains
// clear outside the die, including at resize and after a retained DOM refresh.
function crystalBackdrop(renderer,scene,canvas,onLoad){
 const pixel=new THREE.DataTexture(new Uint8Array([38,3,10,255]),1,1);pixel.needsUpdate=true;pixel.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.ShaderMaterial({uniforms:{photo:{value:pixel},crop:{value:new THREE.Vector4(1,1,0,0)}},
  vertexShader:'varying vec2 photoUv; void main(){photoUv=uv;gl_Position=vec4(position.xy,0.999,1.0);}',
  fragmentShader:'uniform sampler2D photo; uniform vec4 crop; varying vec2 photoUv; void main(){gl_FragColor=vec4(texture2D(photo,photoUv*crop.xy+crop.zw).rgb,1.0);}',
  depthWrite:false,depthTest:false,colorWrite:false,toneMapped:false});
 const proxy=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);proxy.frustumCulled=false;proxy.renderOrder=-1000;
 proxy.onBeforeRender=()=>{material.colorWrite=renderer.getRenderTarget()!==null;};scene.add(proxy);
 let target=null,source='',texture=null,loaded=false,disposed=false;
 const sync=()=>{
  target=canvas.parentElement;
  while(target&&getComputedStyle(target).backgroundImage==='none')target=target.parentElement;
  const style=target?getComputedStyle(target):null;
  const url=style?.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1]||new URL('./assets/ritual-satin-v115.webp',import.meta.url).href;
  if(url!==source){
   source=url;loaded=false;texture?.dispose();
   texture=new THREE.TextureLoader().load(url,()=>{if(disposed)return;loaded=true;sync();onLoad();},undefined,()=>{loaded=false;});
   texture.colorSpace=THREE.SRGBColorSpace;material.uniforms.photo.value=texture;
  }
  if(!loaded||!texture.image)return;
  const c=canvas.getBoundingClientRect(),r=(target||canvas).getBoundingClientRect();
  const iw=texture.image.width,ih=texture.image.height,scale=Math.max(r.width/iw,r.height/ih);
  const width=iw*scale,height=ih*scale;
  const px=(parseFloat(style?.backgroundPositionX)||50)/100,py=(parseFloat(style?.backgroundPositionY)||62)/100;
  const left=r.left+(r.width-width)*px,top=r.top+(r.height-height)*py;
  material.uniforms.crop.value.set(c.width/width,c.height/height,(c.left-left)/width,1-(c.top+c.height-top)/height);
 };
 return {sync,state:()=>({loaded,source}),dispose:()=>{disposed=true;scene.remove(proxy);proxy.geometry.dispose();material.dispose();texture?.dispose();pixel.dispose();}};
}

const cubeFaces=[[1,[0,0,1]],[6,[0,0,-1]],[2,[0,1,0]],[5,[0,-1,0]],[3,[1,0,0]],[4,[-1,0,0]]];
function engravedCube(surface){
 const original=new RoundedBoxGeometry(1.8,1.8,1.8,9,.30),p=original.getAttribute('position'),n=original.getAttribute('normal');
 const positions=[],normals=[];
 for(let i=0;i<p.count;i+=3){
  // Keep the original rounded box's bevels, corners and silhouette exactly.
  const flat=cubeFaces.some(([,axis])=>[0,1,2].every(j=>new THREE.Vector3().fromBufferAttribute(n,i+j).dot(new THREE.Vector3(...axis))>.999999));
  if(!flat)for(let j=0;j<3;j++){positions.push(p.getX(i+j),p.getY(i+j),p.getZ(i+j));normals.push(n.getX(i+j),n.getY(i+j),n.getZ(i+j));}
 }
 original.dispose();
 for(const [value,axis] of cubeFaces){
  const normal=new THREE.Vector3(...axis),rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
  const corners=[[-.6,-.6],[.6,-.6],[.6,.6],[-.6,.6]].map(([x,y])=>new THREE.Vector3(x,y,.9).applyQuaternion(rotation));
  const carved=surface(corners,normal,value);positions.push(...carved.glassPositions);normals.push(...carved.glassNormals);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.computeBoundingSphere();return geo;
}

function geometry(sides,pips=false,neutral=false){
 const group=new THREE.Group(),normals=new Map();
 const inkPositions=[],inkNormals=[],engravings=[];
 const surface=(corners,normal,value)=>{
  const carved=engravedFace(corners,normal,faceMarks(sides,value,pips,neutral));
  inkPositions.push(...carved.inkPositions);inkNormals.push(...carved.inkNormals);
  engravings.push({face:value,depth:carved.depth,marks:carved.marks,clearance:carved.clearance});return carved;
 };
 const custom=sides===35||sides===100?manySidedGeometry(sides):null;
 const original20=sides===20?new THREE.IcosahedronGeometry(1.16,0):null;
 const polygons=custom?custom.polygons:sides===20?twentyPolygons(original20):null;
 const geo=polygons?roundedPolyhedron(polygons,{bevel:sides===20?.13:.095,shrink:sides===20?.095:.07,steps:8,surface}):engravedCube(surface);
 original20?.dispose();
 custom?.geo.dispose();
 custom?.edges.dispose();
 const mat=new THREE.MeshPhysicalMaterial({
  color:0xffffff,metalness:0,roughness:.025,
  clearcoat:1,clearcoatRoughness:.025,
  specularIntensity:1,ior:1.52,transmission:1,thickness:1.9,
  attenuationColor:0xa62d42,attenuationDistance:2.4,envMapIntensity:1.15,
  side:THREE.FrontSide,flatShading:false,transparent:false,opacity:1,depthWrite:true
 });
 // Clear rose crystal: the photograph is refracted by the real face normals,
 // with ruby absorption and warm polished edges matching the loading heart.
 mat.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vPolishBend;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
vPolishBend = normalMatrix * (position - normal * dot(position,normal));`);
  shader.fragmentShader='varying vec3 vPolishBend;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <transmission_fragment>',THREE.ShaderChunk.transmission_fragment.replace('material.thickness = thickness;',
   'material.thickness = thickness * mix(0.05,1.0,pow(clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),1.8));'));
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
normal=normalize(normal+vPolishBend*0.42);`).replace('#include <clearcoat_normal_fragment_maps>',`#include <clearcoat_normal_fragment_maps>
clearcoatNormal=normalize(clearcoatNormal+vPolishBend*0.42);`).replace('#include <opaque_fragment>',`
float crystalFacing = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
outgoingLight += vec3(0.06,0.0005,0.005) * pow(crystalFacing,2.0);
#include <opaque_fragment>
`);
 };
 mat.customProgramCacheKey=()=> 'loveroll-heart-crystal-engraved';
 group.add(new THREE.Mesh(geo,mat));
 // A continuous optical back wall gives the volume a clean internal rim.
 // Refracting through the reverse of engraved text would make ghost digits.
 const backGeometry=polygons?roundedPolyhedron(polygons,{bevel:sides===20?.13:.095,shrink:sides===20?.095:.07,steps:8}):new RoundedBoxGeometry(1.8,1.8,1.8,9,.30);
 const backMaterial=mat.clone();backMaterial.side=THREE.DoubleSide;
 backMaterial.onBeforeCompile=mat.onBeforeCompile;backMaterial.customProgramCacheKey=mat.customProgramCacheKey;
 const opticalBack=new THREE.Mesh(backGeometry,backMaterial);opticalBack.renderOrder=-1;
 opticalBack.onBeforeRender=renderer=>{const refraction=renderer.getRenderTarget()!==null;backMaterial.colorWrite=refraction;backMaterial.depthWrite=refraction;backGeometry.setDrawRange(0,refraction?Infinity:0);};
 group.add(opticalBack);
 // No wireframe: smooth bevel geometry and PBR specular highlights are the
 // only visible transitions between the glass faces on D6, D20 and D100.
 const layout=sides===6?cubeFaces:null;
 for(let value=1;value<=sides;value++){
  let normal;
  const polygon=polygons?.[value-1];
  if(polygon){normal=polygon.normal.clone();}
  else if(layout){normal=new THREE.Vector3(...layout.find(row=>row[0]===value)[1]);}
  normals.set(value,normal);
 }
 const inkGeometry=new THREE.BufferGeometry();inkGeometry.setAttribute('position',new THREE.Float32BufferAttribute(inkPositions,3));inkGeometry.setAttribute('normal',new THREE.Float32BufferAttribute(inkNormals,3));
 const ink=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.32,metalness:0,emissive:0xffffff,emissiveIntensity:.4,envMapIntensity:.8,transparent:false,opacity:1,side:THREE.FrontSide});
 const inlay=new THREE.Mesh(inkGeometry,ink);
 // Foreground inlays cannot be fed back into the glass refraction buffer:
 // doing so would duplicate their silhouettes in neighbouring faces.
 inlay.onBeforeRender=renderer=>{const foreground=renderer.getRenderTarget()===null;ink.colorWrite=foreground;ink.depthWrite=foreground;inkGeometry.setDrawRange(0,foreground?Infinity:0);};
 group.add(inlay);
 return {group,normals,engravings,material:mat,ink};
}
export function dieOn(canvas,sides,value,rolling){
 let renderer;try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});canvas.dataset.webglReady='true';canvas.closest('.home-die-platform, .love3d-stage')?.classList.add('webgl-ready');}catch{return ()=>{};}
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
 const layoutSize=()=>{
  const bounds=canvas.getBoundingClientRect();
  return {width:Math.max(1,Math.round(bounds.width||canvas.clientWidth||124)),
   height:Math.max(1,Math.round(bounds.height||canvas.clientHeight||124))};
 };
 const initialSize=layoutSize();
 renderer.setSize(initialSize.width,initialSize.height,false);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.25;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,15);camera.position.z=(sides===6?5.25:4.15)/Math.min(1.4,Math.max(.8,Number(canvas.dataset.diceZoom)||1));
 camera.aspect=initialSize.width/initialSize.height;camera.updateProjectionMatrix();
 let previousWidth=initialSize.width,previousHeight=initialSize.height;
 const resizeDie=()=>{
  const {width,height}=layoutSize();
  if(width===previousWidth&&height===previousHeight)return;
  previousWidth=width;previousHeight=height;
  renderer.setSize(width,height,false);
  camera.aspect=width/height;camera.updateProjectionMatrix();
  if(typeof alignPodium==='function')alignPodium();
  if(typeof request==='function')request();
 };
 const resizeObserver=typeof ResizeObserver==='function'?
  new ResizeObserver(resizeDie):null;
 resizeObserver?.observe(canvas);
 const podiumObserver=typeof ResizeObserver==='function'?new ResizeObserver(()=>{alignPodium();request();}):null;
 window.addEventListener('resize',resizeDie);
 const glass=glassEnvironment(renderer);scene.environment=glass.texture;
 const backdrop=crystalBackdrop(renderer,scene,canvas,()=>request());
 scene.add(new THREE.AmbientLight(0xffe1eb,.12));
 const key=new THREE.PointLight(0xffe7ef,2,12);key.position.set(-2,3.2,3.3);scene.add(key);
 const rim=new THREE.PointLight(0xffb3d0,1.5,9);rim.position.set(3,-1,1.9);scene.add(rim);
 const white=new THREE.DirectionalLight(0xfff0fa,.25);white.position.set(1.3,3,4);scene.add(white);
 const neutral=canvas.dataset.diceUnrolled==='true'&&sides===6;
 let preview=canvas.dataset.dicePreview==='true'&&sides===6;
 const built=geometry(sides,canvas.dataset.diceMarkers==='pips',neutral);scene.add(built.group);
 // A soft contact shadow stays on the stage while the die rises and settles.
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(1.08,40),
  new THREE.MeshBasicMaterial({color:0x08030b,transparent:true,opacity:.28,depthWrite:false}));
 shadow.position.set(0,-1.16,-.68);shadow.scale.set(1,.25,1);
 scene.add(shadow);
 // A server-confirmed face owns the final quaternion. Do not ever restore
 // the initial mesh rotation after a live D100 throw.
 const tilt=new THREE.Quaternion().setFromEuler(sides===6?
  new THREE.Euler(.16,-.18,-.02):new THREE.Euler(.075,-.09,0));
 const podiumSelector='.home-die-theater,.surprise-main-die-scene,.evening-user-die>.love3d,.evening-die-row,.evening-finale-hero';
 let podium=canvas.closest(podiumSelector);
 const orientationFor=face=>{
  const normal=built.normals.get(Number(face));
  return normal?new THREE.Quaternion().setFromUnitVectors(normal,
   new THREE.Vector3(0,0,1)).premultiply(tilt):null;
 };
 let target=orientationFor(value)||orientationFor(1);
 built.group.quaternion.copy(target);
 function projectedBounds(){
  built.group.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
  built.group.traverse(object=>{
   const vertices=object.geometry?.getAttribute('position');
   if(!vertices||!object.isMesh)return;
   const point=new THREE.Vector3();
   for(let i=0;i<vertices.count;i++){
    point.fromBufferAttribute(vertices,i).applyMatrix4(object.matrixWorld).project(camera);
    left=Math.min(left,(point.x+1)/2);right=Math.max(right,(point.x+1)/2);
    top=Math.min(top,(1-point.y)/2);bottom=Math.max(bottom,(1-point.y)/2);
   }
  });
  return {left,right,top,bottom};
 }
 function alignPodium(){
  // UI refreshes retain this canvas but replace its surrounding DOM.
  // Rebind the photograph even when the canvas size has not changed.
  const current=canvas.closest(podiumSelector);
  if(current!==podium){
   if(podium)podiumObserver?.unobserve(podium);
   podium=current;if(podium)podiumObserver?.observe(podium);
  }
  if(!podium)return;
  const stage=canvas.parentElement,pose=built.group.quaternion.clone(),position=built.group.position.clone();
  built.group.quaternion.copy(target);built.group.position.set(0,0,0);
  stage.style.transform='none';camera.zoom=1;camera.updateProjectionMatrix();
  const sceneRect=podium.getBoundingClientRect(),rect=canvas.getBoundingClientRect();
  if(sceneRect.height<1||rect.height<1||rect.width<1){built.group.quaternion.copy(pose);built.group.position.copy(position);return;}
  const scale=Math.max(sceneRect.width/1536,sceneRect.height/1024);
  const podiumStyle=getComputedStyle(podium);
  const percent=parseFloat(podiumStyle.backgroundPositionY)/100||.62;
  // Home reserves visible air above the mesh; other podiums keep their 4px inset.
  const headroom=Math.max(4,parseFloat(podiumStyle.getPropertyValue('--dice-headroom'))||4);
  // The center of the marble top is at y=678 in the existing 1536x1024 artwork.
  const contact=sceneRect.top+(sceneRect.height-1024*scale)*percent+678*scale;
  let bounds=projectedBounds();
  // Keep the entire real mesh above the marble, including short phone scenes.
  camera.zoom=Math.min(1,(contact-sceneRect.top-headroom)/((bounds.bottom-bounds.top)*rect.height),
   (sceneRect.width-12)/((bounds.right-bounds.left)*rect.width));
  camera.updateProjectionMatrix();bounds=projectedBounds();
  built.group.quaternion.copy(pose);built.group.position.copy(position);built.group.updateMatrixWorld(true);
  const delta=contact-(rect.top+bounds.bottom*rect.height);
  stage.style.transform='translateY('+delta.toFixed(2)+'px)';
  canvas.dataset.podiumContact=String(contact-sceneRect.top);
 }
 let frame=0,drag=false,x=0,y=0,vx=0,vy=0,shown=true,lastFrame=0,renderedFrames=0;
 let returnStart=null,returnTime=0;
 const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 let duration=rolling&&!reduceMotion?ROLL_TOTAL_MS:0,start=performance.now();
 const euler=new THREE.Euler(0,0,0,'XYZ');
 let trajectory=null;
 function prepareMotion(continueFromFace=false){
  if(!duration){
   canvas.dataset.spinning='false';
   trajectory=null;built.group.quaternion.copy(target);
   built.group.position.set(0,0,0);return;
  }
  // Preserve the visible starting orientation during a live reroll.
  // Only the movement is randomized: Supabase owns the official face.
  const previous=new THREE.Euler().setFromQuaternion(built.group.quaternion,'XYZ');
  const seed=new Uint32Array(9);crypto.getRandomValues(seed);
  const random=[...seed].map(n=>n/4294967296);
  const resting=new THREE.Euler().setFromQuaternion(target,'XYZ');
  trajectory=makeForwardRoll([resting.x,resting.y,resting.z],random,
   continueFromFace?[previous.x,previous.y,previous.z]:null);
  euler.set(...trajectory.start);
  built.group.quaternion.setFromEuler(euler);
  built.group.position.set(0,0,0);
 }
 alignPodium();podiumObserver?.observe(podium||canvas);
 if(duration)prepareMotion();
 function step(now){
  frame=0;if(!shown||document.hidden)return;
  const dt=lastFrame?Math.min(.05,Math.max(0,(now-lastFrame)/1000)):0;
  lastFrame=now;
  const elapsed=duration?Math.min(duration,Math.max(0,now-start)):0;
  const t=duration?elapsed/duration:1;
  if(t<1){
   // Three continuous, forward-only Euler rotations. Never slerp or snap
   // backwards to the result: the planned trajectory already ends EXACTLY
   // on the official face, after 3s fast spin + 1.5s natural slowdown.
   const angles=rollAngles(trajectory,elapsed);
   euler.set(angles[0],angles[1],angles[2]);
   built.group.quaternion.setFromEuler(euler);
   const offset=rollOffset(trajectory,elapsed);
   built.group.position.set(offset.x,offset.y,0);
  }else if(duration){
   // Keep the official 3D face locked after its last animation frame.
   built.group.quaternion.copy(target);built.group.position.set(0,0,0);
   canvas.dataset.spinning='false';
  }else if(!drag&&returnStart){
   const tReturn=reduceMotion?1:Math.min(1,(now-returnTime)/480);
   built.group.quaternion.slerpQuaternions(returnStart,target,1-Math.pow(1-tReturn,3));
   if(tReturn>=1){built.group.quaternion.copy(target);returnStart=null;}
  }else if(!drag){
   // Previews stay fixed. Only a confirmed roll or an explicit drag moves a die.
   built.group.rotateY(vx);built.group.rotateX(vy);
   const dragFactor=Math.exp(-5*dt);vx*=dragFactor;vy*=dragFactor;
  }
  const elevation=built.group.position.y;
  shadow.material.opacity=.32/(1+elevation*4);
  shadow.scale.x=1+elevation*.9;
  shadow.scale.y=.25+elevation*.14;
  shadow.position.x=built.group.position.x;
  backdrop.sync();renderer.render(scene,camera);
  renderedFrames++;
  if(t<1||drag||returnStart||Math.abs(vx)+Math.abs(vy)>.003)request();
 }
 const request=()=>{if(!frame)frame=requestAnimationFrame(step);};
 const rollTo=face=>{
  const selected=orientationFor(face);
  if(!selected)return false;
  target=selected;canvas.dataset.face=String(face);
  preview=false;delete canvas.dataset.dicePreview;
  canvas.dataset.spinning='true';
  canvas.setAttribute('aria-label','Dé arrêté sur '+face+' après le brassage');
  duration=reduceMotion?0:ROLL_TOTAL_MS;
  start=performance.now();
  drag=false;returnStart=null;vx=vy=0;lastFrame=0;
  alignPodium();prepareMotion(true);
  request();
  return true;
 };
 // Allow LoveRoll to launch the next server-confirmed throw on the SAME
 // WebGL canvas, without teardown, blank frame, or replaying the idle face.
 canvas.loveRollDie={rollTo,readState:()=>{
  // Read-only geometry diagnostics: verify the actual model, never a text overlay.
  let frontFace=null,best=-Infinity;
  for(const [face,normal] of built.normals){
   const facing=normal.clone().applyQuaternion(built.group.quaternion).z;
   if(facing>best){best=facing;frontFace=face;}
  }
  return {face:Number(canvas.dataset.face),frontFace,quaternion:built.group.quaternion.toArray(),renderedFrames,
   spinning:canvas.dataset.spinning==='true',optics:{...backdrop.state(),transmission:built.material.transmission,roughness:built.material.roughness,inkOpacity:built.ink.opacity,inkTransparent:built.ink.transparent,engravings:built.engravings}};
 },projectedBounds,refresh:()=>{resizeDie();alignPodium();backdrop.sync();renderer.render(scene,camera);renderedFrames++;request();}};
 const down=e=>{
  if(duration&&performance.now()-start<duration)return;
  drag=true;returnStart=null;x=e.clientX;y=e.clientY;vx=vy=0;
  canvas.setPointerCapture(e.pointerId);request();
 };
 const move=e=>{if(!drag)return;const dx=e.clientX-x,dy=e.clientY-y;x=e.clientX;y=e.clientY;
  vx=dx*.013;vy=dy*.013;built.group.rotateY(vx);built.group.rotateX(vy);request();};
 const up=()=>{
  if(!drag)return;
  drag=false;vx=vy=0;
  // Manual inspection never changes the server's official value: return the
  // displayed face to its known resting orientation.
  returnStart=built.group.quaternion.clone();returnTime=performance.now();
  request();
 };
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
 canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 const obs=new IntersectionObserver(entries=>{const old=shown;
  shown=entries[0]?.isIntersecting!==false;if(shown&&!old){lastFrame=0;request();}
 });
 obs.observe(canvas);
 const onVisible=()=>{if(!document.hidden){lastFrame=0;request();}};
 document.addEventListener('visibilitychange',onVisible);request();
 const clean=()=>{if(frame)cancelAnimationFrame(frame);obs.disconnect();
  if(canvas.loveRollDie?.rollTo===rollTo)delete canvas.loveRollDie;
  resizeObserver?.disconnect();podiumObserver?.disconnect();window.removeEventListener('resize',resizeDie);
  document.removeEventListener('visibilitychange',onVisible);
  canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);
  canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);
  built.group.traverse(obj=>{obj.geometry?.dispose();if(obj.material){
    for(const mat of Array.isArray(obj.material)?obj.material:[obj.material]){
     mat.map?.dispose();mat.dispose();
    }
  }});
  backdrop.dispose();scene.environment=null;glass.dispose();renderer.dispose();pool.delete(clean);
 };
 pool.add(clean);return clean;
}
export function clearDice(){for(const d of [...pool])d();}
