import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 privateMemoryPath,validateMemoryPhoto,jpegMemoryPhoto,
 safePrivatePhotoUrl,MEMORY_PHOTO_BUCKET,MAX_MEMORY_PHOTO_BYTES,confirmUploadedMemoryPhoto
} from './monthly-private-photo.mjs';
import {monthlyCompletionHtml} from './monthly-completion.mjs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const user='11111111-1111-4111-8111-111111111111';
const roll='22222222-2222-4222-8222-222222222222';
const photo='33333333-3333-4333-8333-333333333333';

test('private photo path belongs to authenticated author and official roll',()=>{
 assert.equal(privateMemoryPath(user,roll,photo),user+'/'+roll+'/'+photo+'.jpg');
 for(const invalid of ['../x','/other','not-a-uuid',''])
  assert.throws(()=>privateMemoryPath(user,invalid,photo),/invalide/);
 assert.equal(MEMORY_PHOTO_BUCKET,'loveroll-memories');
 assert.equal(MAX_MEMORY_PHOTO_BYTES,3*1024*1024);
});

test('oversized, untrusted, and non-image input is rejected before upload',()=>{
 assert.throws(()=>validateMemoryPhoto({type:'application/pdf',size:100}),/JPEG, PNG ou WebP/);
 assert.throws(()=>validateMemoryPhoto({type:'image/jpeg',size:0}),/12 Mo/);
 assert.throws(()=>validateMemoryPhoto({type:'image/jpeg',size:13*1024*1024}),/12 Mo/);
 assert.deepEqual(validateMemoryPhoto({type:'image/webp',size:123}),{type:'image/webp',size:123});
 assert.equal(safePrivatePhotoUrl('javascript:alert(1)'),null);
 assert.equal(safePrivatePhotoUrl('http://example.com/a.jpg'),null);
 assert.equal(safePrivatePhotoUrl('https://example.com/a.jpg'),'https://example.com/a.jpg');
});

test('image bytes are re-encoded to JPEG, not uploaded as original EXIF/GPS',async()=>{
 const originalBitmap=globalThis.createImageBitmap,originalDoc=globalThis.document;
 let encodedType='',calledDraw=false,closed=false;
 globalThis.createImageBitmap=async()=>({width:4096,height:2048,close(){closed=true;}});
 globalThis.document={createElement(type){
  assert.equal(type,'canvas');
  return {width:0,height:0,getContext(){return {
   fillRect(){},drawImage(){calledDraw=true;},
   set fillStyle(value){}
  };},toBlob(callback,mime){encodedType=mime;callback(new Blob(['jpeg-bytes'],{type:'image/jpeg'}));}};
 }};
 try{
  const jpeg=await jpegMemoryPhoto({type:'image/png',size:1400});
  assert.equal(jpeg.type,'image/jpeg');
  assert.equal(encodedType,'image/jpeg');
  assert.equal(calledDraw,true);
  assert.equal(closed,true);
 }finally{
  if(originalBitmap===undefined)delete globalThis.createImageBitmap;
  else globalThis.createImageBitmap=originalBitmap;
  if(originalDoc===undefined)delete globalThis.document;
  else globalThis.document=originalDoc;
 }
});

test('confirmed private photo survives preview failure',async()=>{
 let links=0,diagnostics=0;
 const saved=await confirmUploadedMemoryPhoto({
  link:async()=>{links++;return {photo_path:'owner/roll/image.jpg'};},
  preview:async()=>{throw Error('signed preview unavailable');},
  onPreviewError:error=>{
   diagnostics++;
   assert.match(error.message,/signed preview unavailable/);
  }
 });
 assert.deepEqual(saved,{photo_path:'owner/roll/image.jpg'});
 assert.equal(links,1);
 assert.equal(diagnostics,1);
});

test('an uncertain RPC failure does not attempt destructive photo rollback',async()=>{
 let previewCalls=0;
 await assert.rejects(()=>confirmUploadedMemoryPhoto({
  link:async()=>{throw Error('link response lost after server commit');},
  preview:async()=>{previewCalls++;}
 }),/link response lost/);
 assert.equal(previewCalls,0);
 const code=read('app.js');
 const start=code.indexOf("if(verb==='geo-photo-save')");
 const end=code.indexOf("if(verb==='geo-photo-delete')",start);
 const section=code.slice(start,end);
 assert.ok(start>0&&end>start);
 assert.match(section,/await confirmUploadedMemoryPhoto\(\{/);
 assert.match(section,/link:\(\)=>rpc\('save_love_monthly_photo'/);
 assert.match(section,/onPreviewError:error=>/);
 // A changed account can discard an upload BEFORE the linking RPC only.
 const afterLink=section.slice(section.indexOf('await confirmUploadedMemoryPhoto({'));
 assert.doesNotMatch(afterLink,/bucket\.remove\(\[path\]\)/);
});

test('signed URLs appear only when provided by authorized storage, never public URLs',()=>{
 const path=privateMemoryPath(user,roll,photo);
 const completion={completed_at:'2026-11-02T20:00:00Z'};
 const feedback=[{roll_id:roll,author_id:user,photo_path:path,rating:null,memory_text:''}];
 const base={available:true,viewerId:user,completion,feedback};
 const hidden=monthlyCompletionHtml(base);
 assert.match(hidden,/Ajouter une photo|Remplacer ma photo/);
 assert.doesNotMatch(hidden,/<img class="surprise-memory-photo"/);
 const photoHtml=monthlyCompletionHtml({...base,photoUrls:{[path]:'https://example.com/private?token=short'}});
 assert.match(photoHtml,/class="surprise-memory-photo"/);
 assert.match(photoHtml,/data-action="geo-photo-delete"/);
 assert.match(photoHtml,/referrerpolicy="no-referrer"/);
 assert.match(photoHtml,/id="geo-photo-input"/);
 assert.doesNotMatch(photoHtml,/public\/loveroll-memories/);
 assert.doesNotMatch(monthlyCompletionHtml({...base,photoUrls:{[path]:'javascript:alert(1)'}}),/src="javascript:/);
});

test('private SQL requires current duo, completion, author ownership and metadata manifest',()=>{
 const sql=read('migrations/20261102_lr_surprise_private_photos.sql');
 const base=read('migrations/20261102_lr_surprise_monthly_memories.sql');
 assert.match(sql,/storage\.buckets \(id,name,public,file_size_limit,allowed_mime_types\)/);
 assert.match(sql,/false,3145728,ARRAY\['image\/jpeg'\]/);
 assert.match(sql,/FOR INSERT TO authenticated WITH CHECK/);
 assert.match(sql,/owner_id=auth\.uid\(\)::text/);
 assert.match(sql,/completed\.roll_id=r\.id/);
 assert.match(sql,/FOR SELECT TO authenticated USING/);
 assert.match(sql,/f\.photo_path=storage\.objects\.name/);
 assert.match(sql,/couple_private\.is_member\(f\.couple_id\)/);
 assert.match(sql,/newcomer\.joined_at>f\.created_at/);
 assert.match(sql,/CREATE POLICY love_memory_photo_owner_read_active ON storage\.objects/);
 assert.match(sql,/FOR SELECT TO authenticated USING \(/);
 assert.match(sql,/owner_id=auth\.uid\(\)::text/);
 assert.match(sql,/original_member\.user_id=completed\.completed_by/);
 assert.match(sql,/newcomer\.joined_at>completed\.completed_at/);
 assert.match(sql,/\(storage\.foldername\(name\)\)\[1\]=auth\.uid\(\)::text/);
 assert.match(sql,/FOR DELETE TO authenticated USING/);
 assert.doesNotMatch(sql,/FOR UPDATE TO authenticated|public,true|CREATE POLICY .* TO public/);
 assert.match(base,/photo_path text/);
 assert.match(base,/save_love_monthly_photo/);
 assert.match(base,/delete_love_monthly_photo/);
 assert.match(base,/obj\.owner_id=auth\.uid\(\)::text/);
 assert.match(base,/photo_path=excluded\.photo_path/);
});

test('photo actions never change D100, publish a URL, or upload original bytes',()=>{
 const app=read('app.js');
 assert.match(app,/jpegMemoryPhoto\(file\)/);
 assert.match(app,/privateMemoryPath\(actor,rollId,crypto\.randomUUID\(\)\)/);
 assert.match(app,/bucket\.upload\(path,jpeg/);
 assert.match(app,/save_love_monthly_photo/);
 assert.match(app,/delete_love_monthly_photo/);
 assert.match(app,/createSignedUrl\(path,300\)/);
 assert.match(app,/geoPhotoMutationGate/);
 assert.match(app,/photoExpired/);
 assert.doesNotMatch(app,/getPublicUrl\(|storage\.from\(MEMORY_PHOTO_BUCKET\)\.upload\([^,]+,file/);
 const begin=app.indexOf("if(verb==='geo-photo-save')");
 const end=app.indexOf("if(verb==='geo-memory-save')",begin);
 assert.ok(begin>0&&end>begin);
 assert.doesNotMatch(app.slice(begin,end),/roll_couple_once|paid_by_host/);
});

test("cleanup SELECT is scoped to author's own current D100, not partner or former duo",()=>{
 const sql=read('migrations/20261102_lr_surprise_private_photos.sql');
 const start=sql.indexOf('CREATE POLICY love_memory_photo_owner_read_active');
 const end=sql.indexOf('CREATE POLICY love_memory_photo_owner_delete',start);
 assert.ok(start>0&&end>start);
 const scope=sql.slice(start,end);
 assert.match(scope,/owner_id=auth\.uid\(\)::text/);
 assert.match(scope,/m\.user_id=auth\.uid\(\)/);
 assert.match(scope,/r\.kind='monthly_activity'/);
 assert.match(scope,/newcomer\.joined_at>completed\.completed_at/);
 assert.doesNotMatch(scope,/OR true|USING \(true\)|bucket_id<>'loveroll-memories'/);
});
