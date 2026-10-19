import * as THREE from 'https://esm.sh/three@0.167.1';
import {numeralOutlines} from './dice-numerals.mjs';

// The marks are cavities in the original face, with opaque white inlays below
// its surface. They are not glowing decals floating above transparent glass.
const pipLayout={1:[[0,0]],2:[[-1,1],[1,-1]],3:[[-1,1],[0,0],[1,-1]],
 4:[[-1,1],[1,-1],[1,1],[-1,-1]],
 5:[[-1,1],[1,-1],[1,1],[-1,-1],[0,0]],
 6:[[-1,1],[1,-1],[1,1],[-1,-1],[-1,0],[1,0]]};

function heartShape(x,y,size){
 const p=new THREE.Shape();
 p.moveTo(0,-.48);p.bezierCurveTo(-.16,-.25,-.5,.02,-.5,.25);
 p.bezierCurveTo(-.5,.65,-.08,.67,0,.36);
 p.bezierCurveTo(.08,.67,.5,.65,.5,.25);
 p.bezierCurveTo(.5,.02,.16,-.25,0,-.48);
 const points=p.getPoints(12).map(v=>v.multiplyScalar(size).add(new THREE.Vector2(x,y)));
 return new THREE.Shape(points);
}

function numberShapes(value,height){
 const text=String(value),total=[...text].reduce((sum,ch)=>sum+numeralOutlines[ch].advance,0);
 const scale=height/1550,path=new THREE.ShapePath();let cursor=-total/2;
 for(const ch of text){
  for(const [op,...v] of numeralOutlines[ch].path){
   const points=[];for(let i=0;i<v.length;i+=2)points.push((v[i]+cursor)*scale,(v[i+1]-750)*scale);
   if(op==='m')path.moveTo(...points);
   else if(op==='l')path.lineTo(...points);
   else if(op==='q')path.quadraticCurveTo(...points);
   else if(op==='c')path.bezierCurveTo(...points);
   else path.currentPath.closePath();
  }
  cursor+=numeralOutlines[ch].advance;
 }
 return path.toShapes();
}

export function faceMarks(sides,value,pips,neutral){
 if(sides!==6)return numberShapes(value,sides===100?.115:sides===35?.16:.225);
 if(neutral)return [heartShape(0,0,.78)];
 if(pips)return pipLayout[value].map(([x,y])=>{
  const shape=new THREE.Shape();shape.absarc(x*.385,y*.385,.102,0,Math.PI*2,false);
  shape.userData={pip:true,x:x*.385,y:y*.385,radius:.102};return shape;
 });
 return pipLayout[value].map(([x,y])=>heartShape(x*.385,y*.385,.235));
}

export function engravedFace(corners,normal,marks){
 const center=corners.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).divideScalar(corners.length);
 const rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
 const inverse=rotation.clone().invert();
 const outline=corners.map(p=>{const q=p.clone().sub(center).applyQuaternion(inverse);return new THREE.Vector2(q.x,q.y);});
 if(!THREE.ShapeUtils.isClockWise(outline))outline.reverse();
 // Three-digit results and narrow irregular D100 faces need a measured fit.
 // Keep every glyph inside its own face, with a visible glass margin.
 const edges=outline.map((p,i)=>{const q=outline[(i+1)%outline.length],outward=new THREE.Vector2(p.y-q.y,q.x-p.x).normalize();return {outward,distance:outward.dot(p)};});
 let fit=1;const margin=.012;
 for(const mark of marks)for(const point of mark.getPoints(10))for(const edge of edges){
  const projected=edge.outward.dot(point);if(projected>0)fit=Math.min(fit,(edge.distance-margin)/projected);
 }
 if(fit<1)marks=marks.map(mark=>{
  const shape=new THREE.Shape(mark.getPoints(10).map(p=>p.multiplyScalar(fit)));
  shape.holes=mark.holes.map(h=>new THREE.Path(h.getPoints(10).map(p=>p.multiplyScalar(fit))));
  if(mark.userData?.pip)shape.userData={pip:true,x:mark.userData.x*fit,y:mark.userData.y*fit,radius:mark.userData.radius*fit};
  return shape;
 });
 let clearance=Infinity;
 for(const mark of marks)for(const point of mark.getPoints(10))for(const edge of edges)clearance=Math.min(clearance,edge.distance-edge.outward.dot(point));
 const face=new THREE.Shape(outline),islands=[];
 for(const mark of marks){
  face.holes.push(new THREE.Path(mark.getPoints(10)));
  for(const counter of mark.holes)islands.push(new THREE.Shape(counter.getPoints(10)));
 }
 const glassPositions=[],glassNormals=[],inkPositions=[],inkNormals=[];
 const pushTriangle=(positions,normals,a,b,c,na,nb=na,nc=na)=>{
  if(b.clone().sub(a).cross(c.clone().sub(a)).dot(na.clone().add(nb).add(nc))<0){[b,c]=[c,b];[nb,nc]=[nc,nb];}
  for(const [p,n] of [[a,na],[b,nb],[c,nc]]){
   positions.push(...p.clone().applyQuaternion(rotation).add(center).toArray());
   normals.push(...n.clone().applyQuaternion(rotation).toArray());
  }
 };
 const flat=(shape,z,positions,normals)=>{
  const geo=new THREE.ShapeGeometry(shape,10).toNonIndexed(),p=geo.getAttribute('position');
  for(let i=0;i<p.count;i+=3){
   const points=[0,1,2].map(j=>new THREE.Vector3(p.getX(i+j),p.getY(i+j),z));
   pushTriangle(positions,normals,...points,new THREE.Vector3(0,0,1));
  }
  geo.dispose();
 };
 flat([face,...islands],0,glassPositions,glassNormals);
 let depth=0;
 for(const mark of marks){
  if(mark.userData?.pip){
   const {x,y,radius:r}=mark.userData;depth=Math.max(depth,.044);
   // A polished glass lip surrounds a genuinely concave, opaque white bowl.
   const segments=40,rings=6;
   for(let ring=0;ring<rings;ring++)for(let i=0;i<segments;i++){
    const radius0=r*(1-ring/rings),radius1=r*(1-(ring+1)/rings);
    const point=(radius,angle)=>new THREE.Vector3(x+radius*Math.cos(angle),y+radius*Math.sin(angle),-.044*(1-(radius/r)**2));
    const shade=(radius,angle)=>new THREE.Vector3(-.088*radius/r**2*Math.cos(angle),-.088*radius/r**2*Math.sin(angle),1).normalize();
    const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;
    const ps=ring===0?glassPositions:inkPositions,ns=ring===0?glassNormals:inkNormals;
    pushTriangle(ps,ns,point(radius0,a),point(radius0,b),point(radius1,b),shade(radius0,a),shade(radius0,b),shade(radius1,b));
    pushTriangle(ps,ns,point(radius0,a),point(radius1,b),point(radius1,a),shade(radius0,a),shade(radius1,b),shade(radius1,a));
   }
  }else{
   const recess=.004;depth=Math.max(depth,recess);
   flat(mark,-recess,inkPositions,inkNormals);
   for(const path of [mark,...mark.holes]){
    const points=path.getPoints(10);if(points[0].distanceToSquared(points.at(-1))<1e-12)points.pop();
    for(let i=0;i<points.length;i++){
     const p=points[i],q=points[(i+1)%points.length];
     const a=new THREE.Vector3(p.x,p.y,0),b=new THREE.Vector3(q.x,q.y,0),c=new THREE.Vector3(q.x,q.y,-recess),d=new THREE.Vector3(p.x,p.y,-recess);
     const n=new THREE.Vector3(q.y-p.y,p.x-q.x,0).normalize();
     pushTriangle(glassPositions,glassNormals,a,b,c,n);pushTriangle(glassPositions,glassNormals,a,c,d,n);
    }
   }
  }
 }
 return {glassPositions,glassNormals,inkPositions,inkNormals,depth,marks:marks.length,clearance};
}
