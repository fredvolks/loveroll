package ca.desadeux.jeu;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient.FileChooserParams;
import androidx.core.content.FileProvider;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.credentials.CredentialManager;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.CredentialManagerCallback;
import androidx.core.content.ContextCompat;

import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import org.json.JSONObject;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;

import java.security.SecureRandom;
import android.util.Base64;

/**
 * LoveRoll signed-in experience stays inside the installed Android app.
 * Auth Google uses Android Credential Manager, NEVER an embedded Google OAuth web page.
 * This screen reuses the existing connected site and Supabase account, without moving,
 * clearing, or modifying PrivateJournal / legacy SharedPreferences.
 */
public final class ConnectedLoveRollActivity extends Activity {
 private android.widget.FrameLayout splashHost;
 private View nativeLoadError;
 private boolean pageLoadFailed;
 private long navigationSerial;
 private long splashCommittedSerial=-1;
 private long splashReadySerial=-1;
 private String startedNavigationUrl;
 private String retryDestination;
 private boolean splashPending=true;
 private boolean splashHandoffRequested;
 private String nativeStartupScript;
 private void showNativeLoadFailure(){
  if(pageLoadFailed||splashHost==null||web==null||isFinishing()||isDestroyed())return;
  pageLoadFailed=true;pageReady=false;
  splashPending=false;splashHandoffRequested=false;
  web.setVisibility(View.INVISIBLE);
  web.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
  if(nativeSplash!=null){nativeSplash.animate().cancel();nativeSplash.pauseHeart();nativeSplash.setVisibility(View.GONE);}
  float d=getResources().getDisplayMetrics().density;
  LinearLayout panel=new LinearLayout(this);panel.setOrientation(LinearLayout.VERTICAL);
  panel.setGravity(Gravity.CENTER);panel.setPadding((int)(28*d),(int)(24*d),(int)(28*d),(int)(24*d));
  panel.setBackgroundColor(Color.rgb(16,7,12));
  TextView title=new TextView(this);title.setText("LoveRoll");title.setTextColor(0xfff5dcd8);
  title.setTextSize(34);title.setTypeface(android.graphics.Typeface.create("serif",android.graphics.Typeface.ITALIC));
  title.setGravity(Gravity.CENTER);panel.addView(title);
  TextView message=new TextView(this);message.setText("La page n’a pas pu s’ouvrir. Vos comptes, invitations et données restent enregistrés.");
  message.setTextSize(16);message.setTextColor(0xffccb3bf);message.setGravity(Gravity.CENTER);
  message.setPadding(0,(int)(24*d),0,(int)(24*d));panel.addView(message);
  Button retry=new Button(this);retry.setText("Réessayer");retry.setTextColor(0xfffff2f2);retry.setTextSize(16);retry.setAllCaps(false);
  android.graphics.drawable.GradientDrawable button=new android.graphics.drawable.GradientDrawable(
   android.graphics.drawable.GradientDrawable.Orientation.TL_BR,new int[]{0xffefa4b7,0xffb73863,0xff6b183d});
  button.setCornerRadius(28*d);retry.setBackground(button);
  panel.addView(retry,new LinearLayout.LayoutParams(-1,(int)(56*d)));
  retry.setOnClickListener(v->{splashHost.removeView(panel);nativeLoadError=null;pageLoadFailed=false;
   if(nativeSplash!=null){
    nativeSplash.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_YES);
    nativeSplash.resumeHeart();
   }
   web.setVisibility(View.VISIBLE);web.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
   web.loadUrl(retryDestination==null?SITE:retryDestination);});
  panel.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_ASSERTIVE);
  nativeLoadError=panel;splashHost.addView(panel,new android.widget.FrameLayout.LayoutParams(-1,-1));
 }
 private boolean isCurrentSplashNavigation(long serial){
  if(serial!=navigationSerial||serial!=splashCommittedSerial||pageLoadFailed||web==null||nativeSplash==null||
    isFinishing()||isDestroyed())return false;
  String url=web.getUrl();
  return url!=null&&isTrusted(Uri.parse(url));
 }
 private void observeNativeStartup(WebView view,long serial){
  if(view!=web||!splashPending||!isCurrentSplashNavigation(serial))return;
  try{
   if(nativeStartupScript==null){
    try(InputStream input=getAssets().open("loveroll-native-startup.js");
        ByteArrayOutputStream output=new ByteArrayOutputStream()){
     byte[] buffer=new byte[4096];int count;
     while((count=input.read(buffer))!=-1)output.write(buffer,0,count);
     nativeStartupScript=new String(output.toByteArray(),StandardCharsets.UTF_8);
    }
   }
   view.evaluateJavascript("("+nativeStartupScript+"\n)("+serial+");",null);
  }catch(IOException error){
   android.util.Log.e("LoveRollStartup","Native startup observer could not load",error);
   showNativeLoadFailure();
  }
 }
 private void finishNativeStartup(long serial){
  if(!splashPending||!isCurrentSplashNavigation(serial))return;
  splashReadySerial=serial;
  // DOM readiness can arrive before onPageFinished. Remember it without
  // changing the existing document/auth readiness used by other native actions.
  if(!pageReady||splashHandoffRequested)return;
  splashHandoffRequested=true;
  final WebView destination=web;
  // The observer reports the real DOM, then this callback guarantees that
  // destination is painted. A document-finished event alone may still be a loader.
  destination.postVisualStateCallback(serial,new WebView.VisualStateCallback(){
   @Override public void onComplete(long requestId){
    if(destination!=web||!pageReady||!splashPending||!isCurrentSplashNavigation(serial))return;
    splashPending=false;
    web.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_AUTO);
    nativeSplash.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
    nativeSplash.animate().cancel();
    nativeSplash.animate().alpha(0f).setDuration(200).withEndAction(()->{
     if(!pageReady||splashPending||!isCurrentSplashNavigation(serial))return;
     nativeSplash.pauseHeart();nativeSplash.setVisibility(View.GONE);
     nativeSplash.setAlpha(1f);
    }).start();
   }
  });
 }
 private static final String TRUSTED_HOST = "fredvolks.github.io";
 private static final String TRUSTED_PATH = "/mon-wallet-android/";
 private static final String SITE = "https://" + TRUSTED_HOST + TRUSTED_PATH;
 // Public OAuth client ID (not a client secret); must match Supabase Google provider.
 private static final String GOOGLE_WEB_CLIENT_ID =
  "158439565502-3cj6kjdntrec6enjpllbi2tknie278hb.apps.googleusercontent.com";
 private WebView web;
 private LoveRollHeartSplashView nativeSplash;
 private ValueCallback<Uri[]> jsonChooser;
 private static final int JSON_PICKER_REQUEST=8625;
 private volatile boolean pageReady = false;
 private boolean authInProgress = false;
 private String pendingGoogleResult;
 private final SecureRandom random = new SecureRandom();

 private volatile boolean firebaseReady=false;
 private void initializeLoveRollFirebase(){
  try{
   if(BuildConfig.FIREBASE_APP_ID.isEmpty()||BuildConfig.FIREBASE_API_KEY.isEmpty()||
     BuildConfig.FIREBASE_SENDER_ID.isEmpty()||BuildConfig.FIREBASE_PROJECT_ID.isEmpty())return;
   FirebaseOptions options=new FirebaseOptions.Builder()
    .setApplicationId(BuildConfig.FIREBASE_APP_ID)
    .setApiKey(BuildConfig.FIREBASE_API_KEY)
    .setGcmSenderId(BuildConfig.FIREBASE_SENDER_ID)
    .setProjectId(BuildConfig.FIREBASE_PROJECT_ID).build();
   if(FirebaseApp.getApps(this).isEmpty())FirebaseApp.initializeApp(this,options);
   firebaseReady=true;
  }catch(Exception ex){firebaseReady=false;}
 }
 private void requestRemotePushToken(){
  if(!firebaseReady){show("Firebase n’est pas encore configuré pour cet APK.");return;}
  if(Build.VERSION.SDK_INT>=33&&checkSelfPermission("android.permission.POST_NOTIFICATIONS")
    !=android.content.pm.PackageManager.PERMISSION_GRANTED){
   requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},6832);return;
  }
  FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task->{
   if(!task.isSuccessful()||task.getResult()==null){
    show("Impossible d’obtenir le jeton de notifications Firebase.");return;
   }
   String token=task.getResult();
   getSharedPreferences("loveroll_native_push",MODE_PRIVATE).edit()
     .putString("device_token",token).apply();
   if(web!=null&&pageReady&&isTrusted(Uri.parse(web.getUrl())))
    web.evaluateJavascript("window.dispatchEvent(new CustomEvent('loveroll-native-push-token',{detail:{token:"+
      JSONObject.quote(token)+"}}));",null);
  });
 }
 private void publishWeeklyReminderState(String message,boolean failure){
  // Permission results and reminder actions run on the UI thread. Refresh the
  // trusted page inline, using the same stored preference as the bridge getter.
  if(web!=null&&pageReady){
   String url=web.getUrl();
   if(url!=null&&isTrusted(Uri.parse(url))){
    boolean enabled=LoveRollWeeklyReminderReceiver.isEnabled(this);
    web.evaluateJavascript("window.dispatchEvent(new CustomEvent('loveroll-native-notification-state',{detail:{weeklyEnabled:"+
      enabled+",message:"+JSONObject.quote(message)+"}}));",null);
    return;
   }
  }
  if(failure&&!isFinishing()&&!isDestroyed())show(message);
 }
 private final class NativeAuthBridge {
  // This is presentation readiness only; document/auth readiness stays separate.
  @JavascriptInterface public void splashReady(long serial){
   runOnUiThread(()->finishNativeStartup(serial));
  }
  @JavascriptInterface public void googleSignIn() {
   runOnUiThread(() -> beginGoogleSignIn());
  }
  @JavascriptInterface public void closeLoveRoll() {
   runOnUiThread(() -> finish());
  }
  @JavascriptInterface public void openLegacyOffline() {
   runOnUiThread(() -> {
    if(web==null||!pageReady||!isTrusted(Uri.parse(web.getUrl())))return;
    Intent previous=new Intent(ConnectedLoveRollActivity.this,MainActivity.class)
     .setData(Uri.parse("loveroll://offline"));
    startActivity(previous);
   });
  }
  @JavascriptInterface public void checkForUpdates() {
   runOnUiThread(() -> {
    if(web==null||!pageReady||!isTrusted(Uri.parse(web.getUrl())))return;
    UpdateManager.check(ConnectedLoveRollActivity.this,false);
   });
  }
  // Expose only the actually installed package version to the account settings page.
  @JavascriptInterface public String appVersion() {
   try {
    android.content.pm.PackageInfo installed=getPackageManager().getPackageInfo(getPackageName(),0);
    return installed.versionName==null?"":installed.versionName;
   }catch(Exception ignored){return "";}
  }
  // Android shares the personal invitation using the system chooser (Messenger supported).
  @JavascriptInterface public void openShare(String message) {
   runOnUiThread(() -> {
    if(web==null||!pageReady||!isTrusted(Uri.parse(web.getUrl())))return;
    try {
     Intent share=new Intent(Intent.ACTION_SEND);
     share.setType("text/plain");
     share.putExtra(Intent.EXTRA_TEXT,message==null?"":message);
     startActivity(Intent.createChooser(share,"Partager mon invitation LoveRoll"));
    } catch(Exception ignored){show("Partage non disponible sur cet appareil.");}
   });
  }
  // Export a JSON file through Android's native share/save picker.
  @JavascriptInterface public void exportJson(String filename,String content){
   runOnUiThread(()->{
    if(web==null||!pageReady||!isTrusted(Uri.parse(web.getUrl())))return;
    if(content==null||content.length()>250000||filename==null||
      !filename.matches("loveroll-[a-z0-9-]{2,64}\\.json")){show("Export JSON invalide.");return;}
    try{
     File dir=new File(getCacheDir(),"jsonexports");
     if(!dir.exists()&&!dir.mkdirs())throw new Exception("Dossier indisponible");
     File file=new File(dir,filename);
     try(FileOutputStream out=new FileOutputStream(file)){
      out.write(content.getBytes(StandardCharsets.UTF_8));
     }
     Uri uri=FileProvider.getUriForFile(ConnectedLoveRollActivity.this,
      getPackageName()+".fileprovider",file);
     Intent share=new Intent(Intent.ACTION_SEND);
     share.setType("application/json");
     share.putExtra(Intent.EXTRA_STREAM,uri);
     share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
     startActivity(Intent.createChooser(share,"Sauvegarder ou partager mon JSON LoveRoll"));
    }catch(Exception e){show("Export JSON impossible : "+e.getMessage());}
   });
  }
  @JavascriptInterface public boolean nativePushConfigured(){return firebaseReady;}
  @JavascriptInterface public String nativePushToken(){
   // JavaScriptInterface runs on a background thread: never read web.getUrl() here.
   // pageReady is cached by the trusted top-level WebViewClient on the UI thread.
   if(!pageReady||!firebaseReady)return "";
   try{
    return getSharedPreferences("loveroll_native_push",MODE_PRIVATE)
     .getString("device_token","");
   }catch(RuntimeException e){
    android.util.Log.w("LoveRollPush","Could not read FCM device token",e);
    return "";
   }
  }
  @JavascriptInterface public void enableRemotePush(){
   runOnUiThread(()->{
    if(web!=null&&pageReady&&isTrusted(Uri.parse(web.getUrl())))requestRemotePushToken();
   });
  }
  @JavascriptInterface public void disableRemotePush(){
   runOnUiThread(()->{
    if(!firebaseReady)return;
    FirebaseMessaging.getInstance().deleteToken().addOnCompleteListener(task->{
     if(task.isSuccessful())getSharedPreferences("loveroll_native_push",MODE_PRIVATE)
       .edit().remove("device_token").apply();
    });
   });
  }
  @JavascriptInterface public void enableWeeklyReminder(){
   runOnUiThread(()->{
    if(web==null||!pageReady||!isTrusted(Uri.parse(web.getUrl())))return;
    if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(
     "android.permission.POST_NOTIFICATIONS")!=android.content.pm.PackageManager.PERMISSION_GRANTED){
     requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},6831);
    }else{
     LoveRollWeeklyReminderReceiver.setEnabled(ConnectedLoveRollActivity.this,true);
     publishWeeklyReminderState("Rappel LoveRoll activé chaque lundi à 9 h.",false);
    }
   });
  }
  @JavascriptInterface public void disableWeeklyReminder(){
   runOnUiThread(()->{
    if(web==null||!pageReady||!isTrusted(Uri.parse(web.getUrl())))return;
    LoveRollWeeklyReminderReceiver.setEnabled(ConnectedLoveRollActivity.this,false);
    publishWeeklyReminderState("Rappel LoveRoll désactivé.",false);
   });
  }
  @JavascriptInterface public boolean weeklyReminderEnabled(){
   return LoveRollWeeklyReminderReceiver.isEnabled(ConnectedLoveRollActivity.this);
  }
  // Email is composed in the user's chosen email app, never auto-sent.
  @JavascriptInterface public void openEmail(String recipient,String subject,String body){
   runOnUiThread(()->{
    if(web==null||!pageReady||!isTrusted(Uri.parse(web.getUrl())))return;
    if(recipient==null||recipient.length()>254||!android.util.Patterns.EMAIL_ADDRESS.matcher(recipient).matches()){
     show("Adresse courriel invalide.");return;
    }
    try {
     Intent email=new Intent(Intent.ACTION_SENDTO);
     email.setData(Uri.parse("mailto:"));
     email.putExtra(Intent.EXTRA_EMAIL,new String[]{recipient});
     email.putExtra(Intent.EXTRA_SUBJECT,subject==null?"Invitation LoveRoll":subject);
     email.putExtra(Intent.EXTRA_TEXT,body==null?"":body);
     startActivity(Intent.createChooser(email,"Envoyer mon invitation LoveRoll"));
    }catch(Exception e){show("Aucune application courriel disponible. Utilisez Copier le lien.");}
   });
  }
  // Free SMS share: opens the system composer, never sends silently.
  @JavascriptInterface public void openSms(String message) {
   runOnUiThread(() -> {
    if(web==null || !pageReady || !isTrusted(Uri.parse(web.getUrl())))return;
    try {
     Intent sms = new Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:"));
     sms.putExtra("sms_body", message == null ? "" : message);
     startActivity(sms);
    } catch(Exception ignored) {show("Aucune application SMS disponible.");}
   });
  }
 }
 
 @Override public void onCreate(Bundle savedInstanceState) {
  super.onCreate(savedInstanceState);
  initializeLoveRollFirebase();
  getWindow().setStatusBarColor(Color.rgb(16,7,12));
  getWindow().setNavigationBarColor(Color.rgb(16,7,12));
  LinearLayout layout = new LinearLayout(this);
  layout.setOrientation(LinearLayout.VERTICAL);
  layout.setBackgroundColor(Color.rgb(16,7,12));
  getWindow().setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
  // Android 15 enforces edge-to-edge for target 35. Give the WebView the
  // actual safe viewport; CSS env() in a WebView does not include system bars.
  if(Build.VERSION.SDK_INT>=30){
   getWindow().setDecorFitsSystemWindows(false);
   layout.setOnApplyWindowInsetsListener((view,insets)->{
    android.graphics.Insets safe=insets.getInsets(android.view.WindowInsets.Type.systemBars()
     |android.view.WindowInsets.Type.displayCutout()|android.view.WindowInsets.Type.ime());
    view.setPadding(safe.left,safe.top,safe.right,safe.bottom);
    return android.view.WindowInsets.CONSUMED;
   });
  }else layout.setFitsSystemWindows(true);
  // Shared LoveRoll web app is the only visible UI; no duplicate native header or tabs.
  web = new WebView(this);
  if(BuildConfig.DEBUG)WebView.setWebContentsDebuggingEnabled(true);
  web.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
  web.setBackgroundColor(Color.rgb(16,7,12));
  web.setOverScrollMode(View.OVER_SCROLL_NEVER);
  WebSettings settings = web.getSettings();
  settings.setJavaScriptEnabled(true);
  settings.setDomStorageEnabled(true);
  // Online LoveRoll is the same live HTML/JS on PC and Android. Older WebView
  // disk HTTP entries can keep the old Soirée null-items error and off-center
  // Surprise dice even after GitHub Pages has been corrected.
  // Bypass ONLY the HTTP resource cache; retain cookies, Supabase auth,
  // Web Storage/IndexedDB, account state and all couple data.
  settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
  // One-time resource-cache refresh for this native APK build. clearCache()
  // does not clear cookies, DOM storage, shared preferences or user data.
  android.content.SharedPreferences webAssets=
   getSharedPreferences("loveroll_web_assets",MODE_PRIVATE);
  if(webAssets.getInt("refreshed_at_native_build",0)<BuildConfig.VERSION_CODE){
   web.clearCache(true);
   webAssets.edit().putInt("refreshed_at_native_build",BuildConfig.VERSION_CODE).apply();
  }
  settings.setAllowFileAccess(false);
  settings.setAllowContentAccess(false);
  settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  settings.setJavaScriptCanOpenWindowsAutomatically(false);
  settings.setSupportMultipleWindows(false);
  if(Build.VERSION.SDK_INT>=26) settings.setSafeBrowsingEnabled(true);
  web.addJavascriptInterface(new NativeAuthBridge(),"LoveRollNativeAuth");
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
    if(jsonChooser!=null){jsonChooser.onReceiveValue(null);jsonChooser=null;}
    if(!pageReady||!isTrusted(Uri.parse(web.getUrl()))){callback.onReceiveValue(null);return true;}
    jsonChooser=callback;
    try{
     Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT);
     pick.setType("*/*");
     pick.addCategory(Intent.CATEGORY_OPENABLE);
     pick.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"application/json","text/plain"});
     startActivityForResult(pick,JSON_PICKER_REQUEST);
    }catch(Exception e){jsonChooser.onReceiveValue(null);jsonChooser=null;show("Choix du fichier indisponible.");}
    return true;
   }
  });
  web.setWebViewClient(new WebViewClient() {
   @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
    if(!request.isForMainFrame()) return false;
    Uri url=request.getUrl();
    if("loveroll".equals(url.getScheme()) && "offline".equals(url.getHost())) {
     startActivity(new Intent(ConnectedLoveRollActivity.this, MainActivity.class)
      .setData(url).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP));
     finish();
     return true;
    }
    if(isTrusted(url))return false;
    if("https".equals(url.getScheme())||"mailto".equals(url.getScheme())) {
     if(request.hasGesture())try {
      startActivity(new Intent(Intent.ACTION_VIEW,url));
     }catch(Exception ignored){show("Impossible d’ouvrir ce lien.");}
    }
    return true;
   }
   @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap favicon) {
    pageReady=false;
    splashPending=true;splashHandoffRequested=false;
    splashCommittedSerial=-1;splashReadySerial=-1;startedNavigationUrl=url;
    web.setVisibility(View.VISIBLE);web.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
    pageLoadFailed=false;
    if(nativeLoadError!=null){splashHost.removeView(nativeLoadError);nativeLoadError=null;}
    if(isTrusted(Uri.parse(url)))retryDestination=url;
    long serial=++navigationSerial;
    view.postDelayed(()->{
     if(serial==navigationSerial&&splashPending&&!isFinishing()&&!isDestroyed())showNativeLoadFailure();
    },18000);
    if(nativeSplash!=null){
     nativeSplash.animate().cancel();
     nativeSplash.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_YES);
     nativeSplash.resumeHeart();
    }
   }
   @Override public void onPageCommitVisible(WebView view,String url){
    if(view!=web||pageLoadFailed||url==null||!url.equals(startedNavigationUrl)||
      !isTrusted(Uri.parse(url)))return;
    // A cancelled load can still receive onPageFinished. Only an actual
    // document commit may install the observer, whose document binding is fixed.
    // Compare the started URL: history.replaceState may already have cleaned
    // invitation/auth parameters from getUrl() without changing the document.
    splashCommittedSerial=navigationSerial;
    observeNativeStartup(view,navigationSerial);
   }
   @Override public void onPageFinished(WebView view,String url) {
    if(pageLoadFailed)return;
    pageReady=isTrusted(Uri.parse(url));
    // Never stamp this callback's current serial onto a possibly outgoing DOM.
    // Finish only a destination already reported by the committed document.
    if(pageReady&&splashReadySerial==navigationSerial)finishNativeStartup(navigationSerial);
    if(pageReady&&pendingGoogleResult!=null) {
     String result=pendingGoogleResult;pendingGoogleResult=null;
     sendGoogleResult(result);
    }
   }
   @Override public void onReceivedError(WebView view,WebResourceRequest request,android.webkit.WebResourceError error){
    if(request.isForMainFrame())showNativeLoadFailure();
   }
   @Override public void onReceivedHttpError(WebView view,WebResourceRequest request,android.webkit.WebResourceResponse response){
    if(request.isForMainFrame()&&response.getStatusCode()>=400)showNativeLoadFailure();
   }
  });
  android.widget.FrameLayout bridge=new android.widget.FrameLayout(this);
  splashHost=bridge;
  bridge.addView(web,new android.widget.FrameLayout.LayoutParams(-1,-1));
  nativeSplash=new LoveRollHeartSplashView(this);
  bridge.addView(nativeSplash,new android.widget.FrameLayout.LayoutParams(-1,-1));
  layout.addView(bridge,new LinearLayout.LayoutParams(-1,0,1));
  setContentView(layout);
  layout.requestApplyInsets();
  String pushed=getIntent().getStringExtra("push_section");
  String destination=getIntent().getStringExtra("destination");
  String suffix="";
  if(destination!=null&&destination.startsWith("settings")){
   String section=destination.contains(":")?destination.substring(destination.indexOf(":")+1):"";
   if(section.matches("[a-z]{0,24}"))
    suffix="?settings=1"+(section.isEmpty()?"":"&section="+section);
   else suffix="?settings=1";
  } else if("auth".equals(destination))suffix="?auth=1";
  // Route notification taps only to known sections, never to remote URLs.
  if(pushed!=null&&pushed.matches("home|session|special|advent"))
   suffix="?open="+pushed;
  // Distinct top-level document URL on native upgrade. It must not strip
  // invitation IDs, OAuth callbacks or the authenticated browser session.
  suffix+=(suffix.isEmpty()?"?":"&")+"apk_build="+BuildConfig.VERSION_CODE;
  web.loadUrl(SITE+suffix);
  if(getSharedPreferences("des_a_deux_game",MODE_PRIVATE).getBoolean("auto_update",true))
   UpdateManager.check(this,true);
 }
 @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] grants){
  super.onRequestPermissionsResult(requestCode,permissions,grants);
  if(requestCode==6832){
   if(grants.length>0&&grants[0]==android.content.pm.PackageManager.PERMISSION_GRANTED)
    requestRemotePushToken();
   else show("Autorisation Android des notifications refusée.");
   return;
  }
  if(requestCode==6831){
   if(grants.length>0&&grants[0]==android.content.pm.PackageManager.PERMISSION_GRANTED){
    LoveRollWeeklyReminderReceiver.setEnabled(this,true);
    publishWeeklyReminderState("Rappel LoveRoll activé chaque lundi à 9 h.",false);
   }else publishWeeklyReminderState("Notifications non autorisées. Modifiez les réglages Android.",true);
  }
 }
 @Override protected void onNewIntent(Intent intent){
  super.onNewIntent(intent);
  setIntent(intent);
  if(previewNativeDialog(intent))return;
  String section=intent.getStringExtra("push_section");
  if(web!=null&&section!=null&&section.matches("home|session|special|advent"))
   web.loadUrl(SITE+"?open="+section+"&apk_build="+BuildConfig.VERSION_CODE);
 }
 // An emulator-only entry point exercises the real native dialog layout and
 // callbacks without release lookup, downloads, installations or account writes.
 private boolean previewNativeDialog(Intent intent){
  if(!BuildConfig.DEBUG||intent==null)return false;
  String preview=intent.getStringExtra("loveroll_debug_dialog");
  if("update".equals(preview)){
   String version=intent.getStringExtra("loveroll_debug_version");
   PremiumDialog.updateAvailable(this,version==null?BuildConfig.VERSION_NAME:version,
    ()->android.util.Log.i("LoveRollDialogQA","download callback"));
  }else if("info".equals(preview)){
   PremiumDialog.info(this,"Notifications LoveRoll",
    "Retrouvez les rappels de votre espace à deux dans les paramètres de notifications.");
  }else if("long".equals(preview)){
   String paragraph="Vous pouvez choisir les rappels de votre espace à deux et ajuster vos préférences dans les réglages de LoveRoll.\n\n";
   StringBuilder message=new StringBuilder();
   for(int i=0;i<8;i++)message.append(paragraph);
   PremiumDialog.choice(this,"Notifications LoveRoll",message.toString().trim(),
    "Continuer",()->android.util.Log.i("LoveRollDialogQA","accept callback"),
    "Annuler",()->android.util.Log.i("LoveRollDialogQA","cancel callback"));
  }else return false;
  return true;
 }
 @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
  super.onActivityResult(requestCode,resultCode,data);
  if(requestCode==JSON_PICKER_REQUEST&&jsonChooser!=null){
   Uri selected=resultCode==RESULT_OK&&data!=null?data.getData():null;
   jsonChooser.onReceiveValue(selected==null?null:new Uri[]{selected});
   jsonChooser=null;
  }
 }
 private boolean isTrusted(Uri url) {
  return url!=null&&"https".equals(url.getScheme())&&TRUSTED_HOST.equals(url.getHost())
   &&url.getEncodedPath()!=null&&url.getEncodedPath().startsWith(TRUSTED_PATH);
 }
 private int dp(int n){return Math.round(getResources().getDisplayMetrics().density*n);}
 private void show(String value){Toast.makeText(this,value,Toast.LENGTH_LONG).show();}
 private String randomNonce(){
  byte[] bytes=new byte[32];random.nextBytes(bytes);
  return Base64.encodeToString(bytes,Base64.NO_WRAP|Base64.NO_PADDING|Base64.URL_SAFE);
 }
 private void beginGoogleSignIn() {
  if(authInProgress||web==null||!pageReady||!isTrusted(Uri.parse(web.getUrl())))return;
  authInProgress=true;
  try{
  // Supabase hashes the raw nonce before comparing with Google's ID-token claim.
  // Google MUST receive SHA-256 hex; Supabase MUST receive the original nonce.
  final String nonce=randomNonce();
  final String googleNonce=GoogleNonce.sha256Hex(nonce);
  final GetSignInWithGoogleOption option =
   new GetSignInWithGoogleOption.Builder(GOOGLE_WEB_CLIENT_ID).setNonce(googleNonce).build();
  final GetCredentialRequest request=new GetCredentialRequest.Builder()
   .addCredentialOption(option).build();
  CredentialManager.create(this).getCredentialAsync(
   this,request,new CancellationSignal(),ContextCompat.getMainExecutor(this),
   new CredentialManagerCallback<GetCredentialResponse,GetCredentialException>(){
    @Override public void onResult(GetCredentialResponse response){
     authInProgress=false;
     if(!(response.getCredential() instanceof CustomCredential)){
      deliverError("Réponse de connexion Google inattendue.");return;
     }
     CustomCredential credential=(CustomCredential)response.getCredential();
     if(!GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())){
      deliverError("Compte Google non reconnu.");return;
     }
     try{
      String token=GoogleIdTokenCredential.createFrom(credential.getData()).getIdToken();
      JSONObject data=new JSONObject();
      data.put("token",token);
      data.put("nonce",nonce);
      deliver(data);
      }catch(Exception e){
      android.util.Log.w("LoveRollAuth","Cannot decode Google ID token",e);
      deliverError("Identité Google reçue, mais jeton invalide. Réessayez ou utilisez votre mot de passe.");
     }
    }
    @Override public void onError(GetCredentialException error){
     authInProgress=false;
     String kind=error.getType()==null?"unknown":error.getType();
     android.util.Log.w("LoveRollAuth","CredentialManager: "+kind);
     String lower=kind.toLowerCase(java.util.Locale.ROOT);
     if(lower.contains("cancel"))deliverError("Connexion Google annulée. Réessayez.");
     else if(lower.contains("no_credential"))
      deliverError("Aucun compte Google disponible dans Android. Essayez votre mot de passe LoveRoll.");
     else deliverError("Google Android a refusé la connexion ("+kind+"). Vérifiez Google Play Services ou utilisez votre mot de passe LoveRoll.");
    }
   });
  }catch(RuntimeException error){
   authInProgress=false;
   android.util.Log.w("LoveRollAuth","Google credential request unavailable",error);
   deliverError("Connexion Google Android indisponible. Vérifiez Google Play Services ou connectez-vous avec votre mot de passe.");
  }
 }
 private void deliverError(String message){
  try{JSONObject o=new JSONObject();o.put("error",message);deliver(o);}catch(Exception ignored){}
 }
 private void deliver(JSONObject result){deliver(result.toString());}
 private void deliver(String result){
  if(web==null)return;
  if(!pageReady){pendingGoogleResult=result;return;}
  sendGoogleResult(result);
 }
 private void sendGoogleResult(String result){
  if(web==null||!isTrusted(Uri.parse(web.getUrl())))return;
  web.evaluateJavascript(
   "window.dispatchEvent(new CustomEvent('loveroll-native-google-result',{detail:"+result+"}));",null);
 }
 @Override public void onBackPressed(){
  // The PWA switches tabs without creating WebView history entries. Give it the
  // first chance to dismiss a dialog or move back to its parent subpage.
  if(web!=null&&web.getUrl()!=null&&isTrusted(Uri.parse(web.getUrl()))){
   web.evaluateJavascript("window.loveRollHandleBack && window.loveRollHandleBack()===true",
    result->{
     if("true".equals(result))return;
     if(web!=null&&web.canGoBack())web.goBack();
     else finish();
    });
  }else if(web!=null&&web.canGoBack())web.goBack();
  else finish();
 }
 @Override public void onDestroy(){
  if(web!=null){
   web.removeJavascriptInterface("LoveRollNativeAuth");
   web.stopLoading();
   web.destroy();web=null;
  }
  super.onDestroy();
 }
}
