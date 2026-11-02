// Browser-only processing for optional private couple memories.
// Always strip original EXIF/GPS by decoding and re-encoding into JPEG.
export const MEMORY_PHOTO_BUCKET='loveroll-memories';
export const MAX_MEMORY_UPLOAD_BYTES=12*1024*1024;
export const MAX_MEMORY_PHOTO_BYTES=3*1024*1024;
export const MEMORY_PHOTO_SIZE=1600;

export function privateMemoryPath(userId,rollId,photoId){
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(![userId,rollId,photoId].every(x=>typeof x==='string'&&uuid.test(x)))
  throw Error('Référence de photo invalide.');
 return userId.toLowerCase()+'/'+rollId.toLowerCase()+'/'+photoId.toLowerCase()+'.jpg';
}
export function validateMemoryPhoto(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))
  throw Error('Choisissez une photo JPEG, PNG ou WebP.');
 if(!Number.isFinite(file.size)||file.size<1||file.size>MAX_MEMORY_UPLOAD_BYTES)
  throw Error('La photo originale doit être inférieure à 12 Mo.');
 return file;
}
export async function jpegMemoryPhoto(file){
 validateMemoryPhoto(file);
 let image=null;
 let objectUrl=null;
 try{
  if(typeof createImageBitmap==='function'){
   image=await createImageBitmap(file);
  }else{
   objectUrl=URL.createObjectURL(file);
   image=await new Promise((resolve,reject)=>{
    const el=new Image();
    el.onload=()=>resolve(el);
    el.onerror=()=>reject(Error('Impossible de lire cette photo.'));
    el.src=objectUrl;
   });
  }
  const width=image.width,height=image.height;
  if(!width||!height||width>15000||height>15000)
   throw Error('Dimensions de la photo non prises en charge.');
  const ratio=Math.min(1,MEMORY_PHOTO_SIZE/Math.max(width,height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(width*ratio));
  canvas.height=Math.max(1,Math.round(height*ratio));
  const context=canvas.getContext('2d',{alpha:false});
  if(!context)throw Error('Conversion de la photo non disponible.');
  context.fillStyle='#ffffff';
  context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(image,0,0,canvas.width,canvas.height);
  const jpeg=await new Promise((resolve,reject)=>{
   canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Conversion JPEG impossible.')),'image/jpeg',0.8);
  });
  if(jpeg.size<1||jpeg.size>MAX_MEMORY_PHOTO_BYTES)
   throw Error('Photo trop volumineuse après conversion (maximum 3 Mo).');
  return jpeg;
 }finally{
  image?.close?.();
  if(objectUrl)URL.revokeObjectURL(objectUrl);
 }
}
export function safePrivatePhotoUrl(value){
 try{
  const u=new URL(value);
  return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;
 }catch{return null;}
}
