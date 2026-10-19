package ca.desadeux.jeu;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONArray;
import org.json.JSONObject;

/** AES-256-GCM encrypted local journal. No cloud upload, no Android backup. */
public final class PrivateJournal {
 private static final String KEY="des_a_deux_private_journal_aes_v1";
 private static final byte[] MAGIC={'D','2','J','1'};
 private static final int IV_BYTES=12;
 private final AtomicFile file;
 private final Context app;
 public PrivateJournal(Context c){
  app=c.getApplicationContext();
  file=new AtomicFile(new File(app.getFilesDir(),"private_journal_v1.enc"));
 }
 private SecretKey secret()throws Exception{
  KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
  java.security.Key key=ks.getKey(KEY,null);
  if(key instanceof SecretKey)return (SecretKey)key;
  KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
  generator.init(new KeyGenParameterSpec.Builder(KEY,
   KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
   .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
   .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
   .setKeySize(256).build());
  return generator.generateKey();
 }
 public synchronized JSONArray all()throws Exception{
  if(!file.getBaseFile().exists())return new JSONArray();
  byte[] encrypted;
  try(InputStream input=file.openRead();java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream()){
   byte[] b=new byte[4096];int n;while((n=input.read(b))!=-1)bytes.write(b,0,n);
   encrypted=bytes.toByteArray();
  }
  if(encrypted.length<4+IV_BYTES+16)throw new SecurityException("Journal chiffré incomplet");
  for(int i=0;i<4;i++)if(encrypted[i]!=MAGIC[i])throw new SecurityException("Format du journal inconnu");
  byte[] iv=java.util.Arrays.copyOfRange(encrypted,4,4+IV_BYTES);
  byte[] contents=java.util.Arrays.copyOfRange(encrypted,4+IV_BYTES,encrypted.length);
  Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
  cipher.init(Cipher.DECRYPT_MODE,secret(),new GCMParameterSpec(128,iv));
  String json=new String(cipher.doFinal(contents),java.nio.charset.StandardCharsets.UTF_8);
  return new JSONArray(json);
 }
 private void write(JSONArray entries)throws Exception{
  Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
  cipher.init(Cipher.ENCRYPT_MODE,secret());
  byte[] iv=cipher.getIV();
  byte[] data=cipher.doFinal(entries.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
  java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream();
  bytes.write(MAGIC);bytes.write(iv);bytes.write(data);
  FileOutputStream stream=null;
  try{
   stream=file.startWrite();
   stream.write(bytes.toByteArray());
   file.finishWrite(stream);
  }catch(Exception e){
   if(stream!=null)file.failWrite(stream);
   throw e;
  }
 }
 public synchronized void upsert(JSONObject newEntry)throws Exception{
  String id=newEntry.optString("id","");
  if(id.trim().isEmpty())throw new IllegalArgumentException("ID required");
  JSONArray previous=all(),next=new JSONArray();
  for(int i=0;i<previous.length();i++){
   JSONObject item=previous.getJSONObject(i);
   if(!id.equals(item.optString("id")))next.put(item);
  }
  next.put(newEntry);write(next);
 }
 public synchronized void remove(String id)throws Exception{
  JSONArray current=all(),next=new JSONArray();
  for(int i=0;i<current.length();i++){
   JSONObject item=current.getJSONObject(i);
   if(!id.equals(item.optString("id")))next.put(item);
  }
  write(next);
 }
 public synchronized void eraseAll()throws Exception{
  if(!file.getBaseFile().exists())return;
  write(new JSONArray());
  file.delete();
 }
 public List<JournalStats.Entry> stats()throws Exception{
  JSONArray entries=all();
  List<JournalStats.Entry> result=new ArrayList<>();
  for(int i=0;i<entries.length();i++){
   JSONObject row=entries.getJSONObject(i);
   result.add(new JournalStats.Entry(row.optString("id"),row.optString("type"),
    row.optString("date"),row.optString("who"),row.optString("session"),
    row.optInt("rating",0)));
  }
  return result;
 }
 public static String newId(){return UUID.randomUUID().toString();}
}
