package ca.desadeux.jeu;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import org.json.JSONObject;
import org.json.JSONArray;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.net.URL;
import java.net.HttpURLConnection;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Locale;

public final class UpdateManager {
 private static final String REPO="fredvolks/mon-wallet-android";
 private static final String PREFIX="des-a-deux-v";
 private static final String API="https://api.github.com/repos/"+REPO+"/releases?per_page=50";
 private static boolean working=false;
 public static void check(Activity a,boolean quiet){
  SharedPreferences prefs=a.getSharedPreferences("des_a_deux_game",Activity.MODE_PRIVATE);
  String today=LocalDate.now(ZoneId.of("America/Montreal")).toString();
  if(quiet&&today.equals(prefs.getString("last_success","")))return;
  if(working)return;
  working=true;
  new Thread(()->{
   try{
    String json=readText(API);
    JSONArray releases=new JSONArray(json);
    JSONObject best=null,asset=null;String version="";
    for(int i=0;i<releases.length();i++){
     JSONObject release=releases.getJSONObject(i);
     if(release.optBoolean("draft")||release.optBoolean("prerelease"))continue;
     String tag=release.optString("tag_name","");
     if(!tag.startsWith(PREFIX))continue;
     String current=tag.substring(PREFIX.length());
     JSONArray assets=release.optJSONArray("assets");
     if(assets==null)continue;
     for(int j=0;j<assets.length();j++){
      JSONObject item=assets.getJSONObject(j);
      String name=item.optString("name","").toLowerCase(Locale.ROOT);
      if(!name.startsWith("des-a-deux-")||!name.endsWith(".apk"))continue;
      if(best==null||compare(current,version)>0){best=release;asset=item;version=current;}
     }
    }
    prefs.edit().putString("last_success",today).apply();
    if(best==null||asset==null){if(!quiet)toast(a,"Aucune version publiée pour LoveRoll.");return;}
    if(compare(version,BuildConfig.VERSION_NAME)<=0){
     if(!quiet)toast(a,"LoveRoll est à jour (v"+BuildConfig.VERSION_NAME+").");return;
    }
    String url=asset.getString("browser_download_url");
    String expected=asset.optString("digest","").replace("sha256:","");
    if(!url.startsWith("https://github.com/"+REPO+"/releases/download/"+PREFIX))
     throw new SecurityException("source de mise à jour inconnue");
    String finalVersion=version;
    a.runOnUiThread(()->PremiumDialog.updateAvailable(a,finalVersion,
      ()->download(a,url,expected)));
   }catch(Exception e){if(!quiet)toast(a,"Vérification impossible : "+e.getMessage());}
   finally{working=false;}
  }).start();
 }
 private static int compare(String first,String second){
  String[] x=first.split("\\."),y=second.split("\\.");
  for(int i=0;i<Math.max(x.length,y.length);i++){
   int a=i<x.length?number(x[i]):0,b=i<y.length?number(y[i]):0;
   if(a!=b)return Integer.compare(a,b);
  }return 0;
 }
 private static int number(String a){
  try{return Integer.parseInt(a.replaceAll("[^0-9].*$",""));}catch(Exception ignored){return 0;}
 }
 private static String readText(String url) throws Exception {
  HttpURLConnection c=open(url);try{
   if(c.getResponseCode()!=200)throw new Exception("HTTP "+c.getResponseCode());
   ByteArrayOutputStream bytes=new ByteArrayOutputStream();
   try(InputStream input=c.getInputStream()){byte[] b=new byte[8192];int n;
    while((n=input.read(b))!=-1)bytes.write(b,0,n);}
   return new String(bytes.toByteArray(),StandardCharsets.UTF_8);
  }finally{c.disconnect();}
 }
 private static HttpURLConnection open(String url)throws Exception{
  HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection();
  c.setConnectTimeout(15000);c.setReadTimeout(30000);
  c.setInstanceFollowRedirects(true);
  c.setRequestProperty("User-Agent","Des-A-Deux-Android-Updater");
  return c;
 }
 private static void download(Activity a,String url,String expected){
  if(Build.VERSION.SDK_INT>=26&&!a.getPackageManager().canRequestPackageInstalls()){
   a.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
    Uri.parse("package:"+a.getPackageName())));
   toast(a,"Autorisez les installations, puis relancez la mise à jour.");return;
  }
  toast(a,"Téléchargement de la mise à jour en cours…");
  new Thread(()->{
   HttpURLConnection c=null;
   try{
    c=open(url);
    if(c.getResponseCode()!=200)throw new Exception("Téléchargement HTTP "+c.getResponseCode());
    File folder=new File(a.getCacheDir(),"updates");
    if(!folder.exists()&&!folder.mkdirs())throw new Exception("Espace de téléchargement inaccessible");
    File apk=new File(folder,"Des-a-Deux-update.apk");
    MessageDigest digest=MessageDigest.getInstance("SHA-256");
    long size=0;
    try(InputStream input=c.getInputStream();FileOutputStream output=new FileOutputStream(apk)){
     byte[] b=new byte[16384];int n;
     while((n=input.read(b))!=-1){
      output.write(b,0,n);digest.update(b,0,n);size+=n;
      if(size>120L*1024L*1024L)throw new Exception("Fichier trop volumineux");
     }
    }
    if(size<50_000)throw new Exception("APK incomplet");
    StringBuilder hex=new StringBuilder();
    for(byte b:digest.digest())hex.append(String.format(Locale.US,"%02x",b&0xff));
    if(!expected.isEmpty()&&!hex.toString().equalsIgnoreCase(expected)){
     apk.delete();throw new SecurityException("Empreinte SHA-256 invalide");
    }
    Uri uri=FileProvider.getUriForFile(a,a.getPackageName()+".fileprovider",apk);
    a.runOnUiThread(()->{
     try{
      Intent intent=new Intent(Intent.ACTION_VIEW);
      intent.setDataAndType(uri,"application/vnd.android.package-archive");
      intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
      a.startActivity(intent);
     }catch(Exception e){toast(a,"Impossible de lancer l'installation : "+e.getMessage());}
    });
   }catch(Exception e){toast(a,"Mise à jour impossible : "+e.getMessage());}
   finally{if(c!=null)c.disconnect();}
  }).start();
 }
 private static void toast(Activity a,String value){
  a.runOnUiThread(()->Toast.makeText(a,value,Toast.LENGTH_LONG).show());
 }
}
