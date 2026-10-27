// Never turn an unreachable Geoapify road matrix entry into a 0 km route.
export function verifiedRoadMetres(value){
 if(value===null||value===undefined||typeof value==='boolean')return null;
 if(typeof value!=='number'&&typeof value!=='string')return null;
 if(typeof value==='string'&&!value.trim())return null;
 const metres=Number(value);
 return Number.isFinite(metres)&&metres>=0?metres:null;
}
export function verifiedMatrixCandidates(candidates,matrix,radiusKm){
 if(!Array.isArray(candidates)||!Array.isArray(matrix))return [];
 let cap=null;
 if(radiusKm!==null&&radiusKm!==undefined){
  if((typeof radiusKm!=='number'&&typeof radiusKm!=='string')||
     (typeof radiusKm==='string'&&!radiusKm.trim()))return [];
  cap=Number(radiusKm);
  if(!Number.isFinite(cap)||cap<0)return [];
 }
 return candidates.map((p,i)=>{
  const meters=verifiedRoadMetres(matrix[i]?.distance);
  return meters===null?null:{p,meters};
 }).filter(v=>v!==null&&(cap===null||v.meters<=cap*1000));
}
