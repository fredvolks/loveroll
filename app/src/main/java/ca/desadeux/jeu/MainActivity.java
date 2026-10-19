package ca.desadeux.jeu;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.util.DisplayMetrics;
import android.os.Handler;
import android.os.Looper;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.RippleDrawable;
import android.content.res.ColorStateList;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import org.json.JSONObject;
import org.json.JSONArray;
import java.util.List;
import java.util.UUID;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import ca.desadeux.jeu.GameLogic.Category;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

public final class MainActivity extends Activity {
 static final int BG=0xFF110B19,SURFACE=0xFF261527,CARD2=0xFF35182F;
 static final int PINK=0xFFFF4F9B,PALE=0xFFFFDDED,WHITE=0xFFFFF5FA,MUTED=0xFFBBA7B8;
 static final int GREEN=0xFF6BE0A7;
 SharedPreferences prefs;
 PrivateJournal journal;
 LocalDate journalMonth=LocalDate.now(ZoneId.of("America/Montreal")).withDayOfMonth(1);
 LocalDate selectedJournalDate=LocalDate.now(ZoneId.of("America/Montreal"));
 int selectedLoveOccasion=0;
 String feedbackPerson="Fred";
 int feedbackRating=0,orgasmChoice=-1,likedChoice=-1,nextChoice=-1,goodChoice=-1,weakChoice=-1;
 LinearLayout root,page,nav;
 ScrollView scroll;
 Dice3DView dice;
 PremiumDice3DView gpuDice;
 PremiumD20View gpuD20;
 String tab="home",player="Émilie";
 int adventSelected=1;
 Category selected=Category.SENSUEL;
 Handler timerHandler=new Handler(Looper.getMainLooper());
 Runnable timerTask;
 TextView timerDisplay;
 boolean randomMode=false;
 boolean rolling=false;
 int width=0;
 int dp(float x){return Math.round(getResources().getDisplayMetrics().density*x);}
 @Override public void onCreate(Bundle bundle){
  super.onCreate(bundle);
  WindowCompat.setDecorFitsSystemWindows(getWindow(),false);
  getWindow().setStatusBarColor(Color.TRANSPARENT);
  getWindow().setNavigationBarColor(Color.TRANSPARENT);
  prefs=getSharedPreferences("des_a_deux_game",MODE_PRIVATE);
  // A deep link from the public landing opens existing local data without
  // asking for a second account or touching any stored challenge history.
  Uri incoming=getIntent()!=null?getIntent().getData():null;
  if(incoming!=null&&"loveroll".equals(incoming.getScheme())&&"offline".equals(incoming.getHost())){
   prefs.edit().putBoolean("loveroll_legacy_offline",true).apply();
  }
  journal=new PrivateJournal(this);
  try{
   selected=Category.valueOf(prefs.getString("selected","SENSUEL"));
   if(selected==Category.COQUIN)selected=Category.SENSUEL;
  }catch(Exception e){selected=Category.SENSUEL;}
  randomMode=false;
  prefs.edit().putString("selected",selected.name()).putBoolean("random_mode",false).apply();
  if(!GameLogic.monday().equals(prefs.getString("week",""))){
   prefs.edit().putString("week",GameLogic.monday()).putInt("goal",-1).putInt("done",0)
    .putBoolean("active",false).putBoolean("pending",false)
    .putInt("fred_target",-1).putInt("emilie_target",-1)
     .putInt("fred_completed",0).putInt("emilie_completed",0)
    .putLong("fred_seen",0L).putLong("emilie_seen",0L).apply();
  }
  // One-time v0.2.1 migration: preserve weekly roll but replace the old single D6 session.
  if(prefs.getInt("duo_setup_version",0)!=1){
   prefs.edit().putInt("duo_setup_version",1)
    .putBoolean("active",false).putBoolean("pending",false)
    .putInt("fred_target",-1).putInt("emilie_target",-1)
    .putInt("fred_completed",0).putInt("emilie_completed",0).apply();
  }
  if(prefs.getBoolean("pending",false)){
   String previous=prefs.getString("card_player","Émilie");
   try{
    Category category=Category.valueOf(prefs.getString("actual","COQUIN"));
    int face=prefs.getInt("face",1);
    String key=previous.equals("Fred")?"fred_seen":"emilie_seen";
    prefs.edit().putLong(key,ChallengePicker.mark(prefs.getLong(key,0L),category,face)).apply();
   }catch(Exception ignored){}
  }
  LocalDate localToday=LocalDate.now(ZoneId.of("America/Montreal"));
  int defaultDay=localToday.getMonthValue()==12?Math.min(25,localToday.getDayOfMonth()):1;
  adventSelected=Math.max(1,Math.min(25,prefs.getInt("advent_selected",defaultDay)));
  player=prefs.getString("player","Émilie");
  if(!player.equals("Fred")&&!player.equals("Émilie")){
   player="Émilie";prefs.edit().putString("player",player).apply();
  }
  try{selected=Category.valueOf(prefs.getString("selected","COQUIN"));}catch(Exception ignored){}
  randomMode=prefs.getBoolean("random_mode",false);
  if(prefs.getBoolean("loveroll_legacy_offline",false)){tab="home";draw();}
  else{tab="welcome";drawWelcome();}
  if(prefs.getBoolean("auto_update",true))UpdateManager.check(this,true);
 }
 GradientDrawable shape(int top,int bottom,int radius,int stroke){
  GradientDrawable g=new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{top,bottom});
  g.setCornerRadius(dp(radius));if(stroke!=0)g.setStroke(dp(1),stroke);
  return g;
 }
 void pad(View v,int x,int y){v.setPadding(dp(x),dp(y),dp(x),dp(y));}
 void addText(LinearLayout target,String value,int size,int color,boolean strong,int bottom){
  TextView t=new TextView(this);t.setText(value);t.setTextColor(color);t.setTextSize(size);
  if(strong)t.setTypeface(Typeface.create("sans-serif",Typeface.BOLD));
  t.setLineSpacing(dp(1),1.0f);
  LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,ViewGroup.LayoutParams.WRAP_CONTENT);
  lp.bottomMargin=dp(bottom);target.addView(t,lp);
 }
 TextView text(String value,int size,int color,boolean strong){
  TextView tv=new TextView(this);tv.setText(value);tv.setTextSize(size);tv.setTextColor(color);
  if(strong)tv.setTypeface(Typeface.create("sans-serif-medium",Typeface.BOLD));
  return tv;
 }
 void gap(LinearLayout target,int amount){
  View v=new View(this);target.addView(v,new LinearLayout.LayoutParams(1,dp(amount)));
 }
 LinearLayout vertical(){LinearLayout l=new LinearLayout(this);l.setOrientation(1);return l;}
 LinearLayout horizontal(){LinearLayout l=new LinearLayout(this);l.setOrientation(0);l.setGravity(Gravity.CENTER_VERTICAL);return l;}
 LinearLayout card(String title,String subtitle){
  LinearLayout c=vertical();c.setBackground(shape(SURFACE,CARD2,18,0x4CFF6FA4));pad(c,14,11);
  LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,ViewGroup.LayoutParams.WRAP_CONTENT);
  lp.bottomMargin=dp(9);page.addView(c,lp);
  if(title!=null)addText(c,title,16,PALE,true,subtitle==null?0:3);
  if(subtitle!=null)addText(c,subtitle,12,MUTED,false,0);
  return c;
 }
 void heading(String big,String subtitle){
  addText(page,big,24,WHITE,true,2);
  if(subtitle!=null)addText(page,subtitle,13,MUTED,false,9);
 }
 void section(String title){gap(page,5);addText(page,title,16,PINK,true,7);}
 void addButton(LinearLayout dest,String title,boolean highlighted,Runnable action){
  Button b=new Button(this);b.setAllCaps(false);b.setText(title);b.setTextSize(14);
  b.setTextColor(highlighted?WHITE:PALE);
  b.setTypeface(Typeface.create("sans-serif-medium",Typeface.BOLD));
  b.setBackground(shape(highlighted?0xFFFF4A9A:0xFF47243D,highlighted?0xFFC82870:0xFF2F1A31,16,highlighted?0x99FFB6D8:0x66F26B9C));
  LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(46));lp.topMargin=dp(7);
  dest.addView(b,lp);b.setOnClickListener(v->{if(!rolling)action.run();});
 }
 void chip(LinearLayout target,String title,boolean active,Runnable action,int weight){
  TextView v=text(title,13,active?WHITE:PALE,true);v.setGravity(Gravity.CENTER);
  v.setPadding(dp(5),dp(7),dp(5),dp(7));
  v.setBackground(shape(active?0xFFD02D77:0xFF3B263C,active?0xFF822353:0xFF241628,13,active?PINK:0x554B3A4C));
  LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,dp(38),weight);
  lp.rightMargin=dp(6);target.addView(v,lp);v.setOnClickListener(q->{if(!rolling)action.run();});
 }
 void showDice(int sides,int result){
  FrameLayout frame=new FrameLayout(this);
  frame.setBackground(shape(0xFF220D24,0xFF180E22,26,0x335A3558));
  float screenDp=getResources().getDisplayMetrics().heightPixels/getResources().getDisplayMetrics().density;
  int diceDp=Math.max(164,Math.min(213,Math.round(screenDp*.235f)));
  LinearLayout.LayoutParams fl=new LinearLayout.LayoutParams(-1,dp(diceDp));
  fl.bottomMargin=dp(8);
  page.addView(frame,fl);
  dice=null;gpuDice=null;gpuD20=null;
  if(sides==20&&PremiumDice3DView.supported(this)){
   gpuD20=new PremiumD20View(this);
   gpuD20.setResult(result);
   frame.addView(gpuD20,new FrameLayout.LayoutParams(-1,-1));
  }else if(sides==6&&PremiumDice3DView.supported(this)){
   gpuDice=new PremiumDice3DView(this);
   gpuDice.setResult(result);
   frame.addView(gpuDice,new FrameLayout.LayoutParams(-1,-1));
  }else{
   // Fallback only for devices without OpenGL ES 2.0, or the existing D20.
   dice=new Dice3DView(this);dice.setSides(sides);dice.setResult(result);
   frame.addView(dice,new FrameLayout.LayoutParams(-1,-1));
  }
  TextView caption=text("GLISSE POUR TOURNER LE DÉ",10,0xFFFFC4DF,true);
  caption.setGravity(Gravity.CENTER);
  caption.setBackgroundColor(0x5516071A);
  FrameLayout.LayoutParams cp=new FrameLayout.LayoutParams(-1,dp(24),Gravity.BOTTOM);
  frame.addView(caption,cp);
  caption.setOnClickListener(v->{
   Toast.makeText(this,"Brasse le dé avec le bouton pour obtenir un résultat officiel.",Toast.LENGTH_SHORT).show();
  });
 }
 void roll(int value,Runnable end){
  if(rolling||(dice==null&&gpuDice==null&&gpuD20==null))return;
  rolling=true;
  vibrate(36);
  Runnable finished=()->{
   rolling=false;vibrate(85);end.run();
  };
  if(gpuD20!=null)gpuD20.roll(value,finished);
  else if(gpuDice!=null)gpuDice.roll(value,finished);
  else dice.roll(value,finished);
 }
 void showResultDialog(String symbol,String title,String description,String buttonTitle){
  LinearLayout popup=vertical();
  popup.setPadding(dp(24),dp(23),dp(24),dp(20));
  popup.setBackground(shape(0xFF39182F,0xFF190F25,26,0x99FF83BD));
  TextView badge=text(symbol,32,PINK,true);
  badge.setGravity(Gravity.CENTER);
  popup.addView(badge,new LinearLayout.LayoutParams(-1,dp(48)));
  TextView result=text(title,25,WHITE,true);
  result.setGravity(Gravity.CENTER);
  LinearLayout.LayoutParams t=new LinearLayout.LayoutParams(-1,-2);t.bottomMargin=dp(12);
  popup.addView(result,t);
  TextView details=text(description,14,PALE,false);
  details.setGravity(Gravity.CENTER);
  details.setLineSpacing(dp(3),1f);
  popup.addView(details,new LinearLayout.LayoutParams(-1,-2));
  AlertDialog d=new AlertDialog.Builder(this).setView(popup).create();
  Button confirm=new Button(this);
  confirm.setAllCaps(false);
  confirm.setText(buttonTitle);
  confirm.setTextSize(15);
  confirm.setTypeface(Typeface.create("sans-serif-medium",Typeface.BOLD));
  confirm.setTextColor(WHITE);
  confirm.setBackground(shape(0xFFFF4E9C,0xFFBE276D,16,0x99FFC3DC));
  LinearLayout.LayoutParams bp=new LinearLayout.LayoutParams(-1,dp(49));
  bp.topMargin=dp(20);popup.addView(confirm,bp);
  confirm.setOnClickListener(v->d.dismiss());
  d.setOnShowListener(ignore->{
   if(d.getWindow()!=null){
    d.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
    d.getWindow().setDimAmount(.72f);
    d.getWindow().setLayout((int)(getResources().getDisplayMetrics().widthPixels*.89f),
      ViewGroup.LayoutParams.WRAP_CONTENT);
   }
   popup.setAlpha(0f);popup.setScaleX(.93f);popup.setScaleY(.93f);
   popup.animate().alpha(1).scaleX(1).scaleY(1).setDuration(260).start();
  });
  d.show();
 }
 void vibrate(long ms){
  try{Vibrator v=(Vibrator)getSystemService(Context.VIBRATOR_SERVICE);
   if(v!=null&&v.hasVibrator())v.vibrate(VibrationEffect.createOneShot(ms,VibrationEffect.DEFAULT_AMPLITUDE));
  }catch(Exception ignored){}
 }

 static final String LOVEROLL_WEB="https://fredvolks.github.io/mon-wallet-android/";
 // Keep registration and login inside the installed app.
 void openConnectedLoveRoll(){openConnectedLoveRoll("auth");}
 void openConnectedLoveRoll(String destination){
  prefs.edit().putBoolean("loveroll_web_chosen",true).apply();
  Intent intent=new Intent(this,ConnectedLoveRollActivity.class);
  intent.putExtra("destination",destination);
  startActivity(intent);
 }

 void premiumWelcomeButton(LinearLayout container,String text,boolean primary,Runnable action){
  Button b=new Button(this);
  b.setText(text);b.setAllCaps(false);b.setTextSize(12.5f);
  b.setTypeface(Typeface.create("sans-serif-medium",Typeface.BOLD));b.setTextColor(WHITE);
  GradientDrawable shape=new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT,
   primary?new int[]{0xFFFF438F,0xFFF5207B,0xFFC51E6B}:new int[]{0xFF29152A,0xFF1B1024});
  shape.setCornerRadius(dp(21));
  shape.setStroke(dp(1),primary?0xFFFFAFD2:0xFFAA5681);
  b.setBackground(new RippleDrawable(ColorStateList.valueOf(0x44FFFFFF),shape,null));
  b.setElevation(dp(primary?4:1));
  LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(48));
  lp.topMargin=dp(5);container.addView(b,lp);b.setOnClickListener(v->action.run());
 }

 int welcomeAvailableDp(){
  DisplayMetrics metrics=getResources().getDisplayMetrics();
  if(Build.VERSION.SDK_INT>=30){
   android.view.WindowMetrics wm=getWindowManager().getCurrentWindowMetrics();
   android.graphics.Insets inset=wm.getWindowInsets().getInsets(
    android.view.WindowInsets.Type.systemBars());
   return Math.round((wm.getBounds().height()-inset.top-inset.bottom)/metrics.density);
  }
  DisplayMetrics dm=new DisplayMetrics();
  getWindowManager().getDefaultDisplay().getMetrics(dm);
  return Math.round(dm.heightPixels/dm.density);
 }
 LinearLayout welcomeMiniFeature(String title,String detail,int icon){
  LinearLayout c=horizontal();c.setPadding(dp(7),dp(6),dp(7),dp(6));
  c.setGravity(Gravity.CENTER_VERTICAL);
  c.setBackground(shape(0xFF35172F,0xFF1B0D20,14,0x88994470));
  LoveRollWelcomeIcon picture=new LoveRollWelcomeIcon(this,icon);
  c.addView(picture,new LinearLayout.LayoutParams(dp(36),dp(36)));
  LinearLayout textCol=vertical();textCol.setPadding(dp(5),0,0,0);
  TextView heading=text(title,13,WHITE,true);
  heading.setTypeface(Typeface.create("serif",Typeface.BOLD));
  textCol.addView(heading,new LinearLayout.LayoutParams(-1,-2));
  TextView desc=text(detail,11,PALE,false);
  textCol.addView(desc,new LinearLayout.LayoutParams(-1,-2));
  c.addView(textCol,new LinearLayout.LayoutParams(0,-2,1));
  return c;
 }
 void welcomeFeatureRow(LinearLayout dest,
  String aTitle,String aText,int ai,String bTitle,String bText,int bi){
  LinearLayout row=horizontal();
  LinearLayout.LayoutParams r=new LinearLayout.LayoutParams(-1,dp(69));
  r.bottomMargin=dp(5);dest.addView(row,r);
  LinearLayout a=welcomeMiniFeature(aTitle,aText,ai);
  LinearLayout b=welcomeMiniFeature(bTitle,bText,bi);
  LinearLayout.LayoutParams pa=new LinearLayout.LayoutParams(0,-1,1);
  pa.rightMargin=dp(3);row.addView(a,pa);
  LinearLayout.LayoutParams pb=new LinearLayout.LayoutParams(0,-1,1);
  pb.leftMargin=dp(3);row.addView(b,pb);
 }
 void drawWelcome(){
  // Six-zone one-screen layout, based on app content height after both system
  // bars. ScrollView is retained to support large fonts / smaller phones.
  final int available=welcomeAvailableDp();
  final boolean standardFont=getResources().getConfiguration().fontScale<=1.12f;
  final int sceneHeight=standardFont&&available>=690?
   Math.min(163,Math.max(118,(int)(available*.185f))):125;
  root=vertical();
  root.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
     new int[]{0xFF1E0C23,0xFF130919,0xFF08050E}));
  scroll=new ScrollView(this);
  scroll.setFillViewport(true);scroll.setVerticalScrollBarEnabled(false);
  page=vertical();page.setPadding(dp(12),dp(4),dp(12),dp(8));
  scroll.addView(page);root.addView(scroll,new LinearLayout.LayoutParams(-1,-1));
  ViewCompat.setOnApplyWindowInsetsListener(root,(v,insets)->{
   int top=insets.getInsets(WindowInsetsCompat.Type.statusBars()).top;
   int bottom=insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
   root.setPadding(0,top,0,bottom);
   return insets;
  });
  setContentView(root);ViewCompat.requestApplyInsets(root);
  // A/B/C: brand, photographic hero and TWO authentication actions only.
  LinearLayout hero=vertical();
  hero.setPadding(dp(11),dp(7),dp(11),dp(8));
  hero.setBackground(shape(0xFF3C1429,0xFF180C1D,18,0x99CB5285));
  page.addView(hero,new LinearLayout.LayoutParams(-1,-2));
  TextView logo=text("LoveRoll",39,WHITE,true);
  logo.setTypeface(Typeface.create("serif",Typeface.BOLD_ITALIC));
  SpannableString logoSpans=new SpannableString("LoveRoll");
  logoSpans.setSpan(new ForegroundColorSpan(0xFFFF75B0),4,8,Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
  logo.setText(logoSpans);logo.setGravity(Gravity.CENTER);
  hero.addView(logo,new LinearLayout.LayoutParams(-1,dp(43)));
  TextView signature=text("JEUX · DÉFIS · DATES · NOUS",9,PALE,true);
  signature.setGravity(Gravity.CENTER);signature.setLetterSpacing(.16f);
  hero.addView(signature,new LinearLayout.LayoutParams(-1,dp(17)));
  ImageView art=new ImageView(this);
  art.setImageResource(R.drawable.loveroll_hero);
  art.setScaleType(ImageView.ScaleType.FIT_CENTER);
  art.setAdjustViewBounds(false);
  LinearLayout.LayoutParams img=new LinearLayout.LayoutParams(-1,dp(sceneHeight));
  hero.addView(art,img);
  TextView title=text("Votre aventure à deux commence ici.",26,WHITE,true);
  title.setTypeface(Typeface.create("serif",Typeface.BOLD));
  SpannableString titleParts=new SpannableString("Votre aventure à deux commence ici.");
  titleParts.setSpan(new ForegroundColorSpan(0xFFFF6EA8),22,titleParts.length(),
    Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
  title.setText(titleParts);title.setLineSpacing(0,1.0f);
  hero.addView(title,new LinearLayout.LayoutParams(-1,-2));
  addText(hero,"Défis sensuels, soirées surprises et moments complices à partager.",
    13,PALE,false,4);
  premiumWelcomeButton(hero,"♡  CRÉER MON COMPTE GRATUITEMENT →",true,()->openConnectedLoveRoll());
  premiumWelcomeButton(hero,"J'AI DÉJÀ UN COMPTE · ME CONNECTER →",false,()->openConnectedLoveRoll());
  TextView note=text("♢  Connexion sécurisée pour Android et iPhone.",11,MUTED,false);
  note.setGravity(Gravity.CENTER);
  LinearLayout.LayoutParams np=new LinearLayout.LayoutParams(-1,-2);
  np.topMargin=dp(5);hero.addView(note,np);
  // D: real two-column/two-row compact functionality grid.
  gap(page,6);
  welcomeFeatureRow(page,"Dés à deux","Défis synchronisés.",0,
    "Votre match","Votre couple connecté.",1);
  welcomeFeatureRow(page,"Calendrier","Vos dates importantes.",2,
    "Espace privé","Rien qu'à vous.",3);
  // E: one emotional banner instead of repeated marketing sections.
  LinearLayout slogan=vertical();
  slogan.setPadding(dp(10),dp(7),dp(10),dp(7));
  slogan.setBackground(shape(0xFF46162F,0xFF260C22,14,0x88994470));
  LinearLayout.LayoutParams sp=new LinearLayout.LayoutParams(-1,-2);
  sp.topMargin=dp(1);page.addView(slogan,sp);
  TextView motto=text("Plus qu'un jeu, votre histoire à deux. ♡",18,WHITE,true);
  motto.setTypeface(Typeface.create("serif",Typeface.BOLD));
  SpannableString mottoSpans=new SpannableString("Plus qu'un jeu, votre histoire à deux. ♡");
  mottoSpans.setSpan(new ForegroundColorSpan(0xFFFF78B2),15,mottoSpans.length(),
    Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
  motto.setText(mottoSpans);motto.setGravity(Gravity.CENTER);
  slogan.addView(motto);
  TextView tagline=text("Complicité, surprises et frissons à votre rythme.",12,PALE,false);
  tagline.setGravity(Gravity.CENTER);slogan.addView(tagline);
  // F: functional recovery of existing local data + safety notice.
  TextView offline=text("Retrouver mes anciennes données hors ligne  ›",11,PALE,false);
  offline.setGravity(Gravity.CENTER);
  LinearLayout.LayoutParams op=new LinearLayout.LayoutParams(-1,dp(44));
  page.addView(offline,op);offline.setOnClickListener(v->{
   prefs.edit().putBoolean("loveroll_legacy_offline",true).apply();
   tab="home";draw();
  });
  offline.setContentDescription("Ouvrir mes anciennes données locales non synchronisées");
  TextView legal=text("Réservé aux adultes de 18 ans et plus. Chaque activité est facultative.",
     10,MUTED,false);
  legal.setGravity(Gravity.CENTER);
  page.addView(legal,new LinearLayout.LayoutParams(-1,-2));
 }
 void draw(){
  clearTimerTicker();
  if(gpuDice!=null){gpuDice.onPause();gpuDice=null;}
  if(gpuD20!=null){gpuD20.onPause();gpuD20=null;}
  dice=null;
  root=vertical();root.setBackgroundColor(BG);
  scroll=new ScrollView(this);scroll.setFillViewport(false);
  scroll.setVerticalScrollBarEnabled(false);
  page=vertical();page.setPadding(dp(17),dp(12),dp(17),dp(9));
  scroll.addView(page);
  root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
  nav=horizontal();nav.setBackground(shape(0xFF221326,0xFF1A1021,0,0));pad(nav,9,6);
  root.addView(nav,new LinearLayout.LayoutParams(-1,dp(64)));
  ViewCompat.setOnApplyWindowInsetsListener(root,(v,insets)->{
   int top=insets.getInsets(WindowInsetsCompat.Type.statusBars()).top;
   int bottom=insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
   root.setPadding(0,top,0,0);
   nav.setPadding(dp(9),dp(4),dp(9),dp(5)+bottom);
   ViewGroup.LayoutParams params=nav.getLayoutParams();
   int desired=dp(58)+bottom;
   if(params.height!=desired){params.height=desired;nav.setLayoutParams(params);}
   return insets;
  });
  setContentView(root);
  ViewCompat.requestApplyInsets(root);
  switch(tab){
   case "game":drawGame();break;
   case "library":drawLibrary();break;
   case "advent":drawAdvent();break;
   case "special":drawSpecial();break;
   case "occasions":drawOccasions();break;
   case "occasion_detail":drawOccasionDetail();break;
   case "settings":drawSettings();break;
   case "journal":drawJournal();break;
   case "intimacy":drawIntimacyEditor();break;
   case "feedback":drawFeedback();break;
   case "feedback_answer":drawFeedbackAnswer();break;
   case "privacy":drawPrivacy();break;
   case "rules":drawRules();break;
   case "updater":drawUpdater();break;
   default:drawHome();break;
  }
  drawNav();
 }
 void drawNav(){
  for(String[] item:new String[][]{{"home","⌂","Accueil"},{"game","⚄","Soirée"},{"special","✦","Défi spécial"},{"advent","🎁","Avent"},{"settings","⚙","Réglages"}}){
   LinearLayout col=vertical();col.setGravity(Gravity.CENTER);
   boolean active=tab.equals(item[0])||(item[0].equals("special")&&(tab.equals("occasions")||tab.equals("occasion_detail")))||
    (item[0].equals("game")&&(tab.equals("feedback")||tab.equals("feedback_answer")||tab.equals("journal")||tab.equals("intimacy")))||
    (item[0].equals("settings")&&java.util.Arrays.asList("library","privacy","rules","updater").contains(tab));
   TextView icon=text(item[1],item[0].equals("advent")?22:24,active?PINK:MUTED,false);icon.setGravity(Gravity.CENTER);col.addView(icon);
   TextView name=text(item[2],item[0].equals("special")?10:11,active?PALE:MUTED,active);name.setGravity(Gravity.CENTER);col.addView(name);
   LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,-1,1);
   nav.addView(col,lp);col.setOnClickListener(v->{if(rolling)return;tab=item[0];draw();});
  }
 }
 void drawHome(){
  heading("♡  LOVEROLL","Un jeu intime, juste pour vous deux");
  addText(page,"LE RITUEL DE LA SEMAINE",12,PINK,true,6);
  int goal=prefs.getInt("goal",-1),done=prefs.getInt("done",0);
  showDice(6,goal>0?goal:1);
  if(goal>0){
   LinearLayout official=card("✦  RÉSULTAT OFFICIEL    "+goal+" SOIRÉE"+(goal>1?"S":""),null);
   addText(official,"Enregistré jusqu'à lundi  ·  Face "+goal,12,MUTED,false,0);
  }
  if(goal<0){
   LinearLayout intro=card("🎲  Le dé hebdomadaire","Choisissez le nombre de soirées de la semaine par un tirage pondéré.");
   LinearLayout chips=horizontal();intro.addView(chips);
   for(String p:new String[]{"1×\n50%","2×\n25%","3×\n12%","4×\n8%","5×\n4%","6×\n1%"}){
    TextView v=text(p,11,PALE,true);v.setGravity(Gravity.CENTER);
    v.setBackground(shape(0xFF49223B,0xFF2F1730,9,0x337A4A69));
    LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,dp(41),1);lp.rightMargin=dp(3);
    chips.addView(v,lp);
   }
   addButton(intro,"🎲  BRASSER LE DÉ HEBDOMADAIRE",true,()->{
    if(prefs.getInt("goal",-1)>0)return;
    int n=GameLogic.rollWeek();
    if(!prefs.edit().putInt("goal",n).commit()){
     Toast.makeText(this,"Impossible d'enregistrer le tirage. Réessayez.",Toast.LENGTH_LONG).show();
     return;
    }
    roll(n,()->{
     draw();
     showResultDialog("♥",""+n+" SOIRÉE"+(n>1?"S":""),"Votre tirage est enregistré jusqu'à lundi. C'est un jeu, jamais une obligation.","C'EST PARTI !");
    });
   });
  }else{
   LinearLayout c=card("♥  "+goal+" soirée(s) cette semaine","Votre progression commune");
   addText(c,"PROGRESSION  "+done+" / "+goal,13,WHITE,true,4);
   progress(c,goal==0?0:(float)Math.min(done,goal)/goal);
   addButton(c,"COMMENCER UNE SOIRÉE   →",true,()->{tab="game";draw();});
  }
  LinearLayout info=card("♥  Votre rituel   ·   2 catégories de défis",null);
  addText(info,"SEMAINE  →  soirées     ·     D6 × 2  →  défis reçus",12,PALE,true,2);
  addText(info,"DÉFIS  →  Sensuel  ·  Sexuel",12,MUTED,false,0);
 }
 void progress(LinearLayout dest,float fraction){
  FrameLayout track=new FrameLayout(this);
  track.setBackground(shape(0xFF56314C,0xFF56314C,10,0));
  LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(9));dest.addView(track,lp);
  View fill=new View(this);fill.setBackground(shape(PINK,0xFFBF3278,10,0));
  track.addView(fill,new FrameLayout.LayoutParams(-1,-1));
  track.post(()->{ViewGroup.LayoutParams p=fill.getLayoutParams();
    p.width=Math.max(0,(int)(track.getWidth()*fraction));fill.setLayoutParams(p);});
 }
 void resetEvening(){
  prefs.edit().putBoolean("active",false).putBoolean("pending",false).putBoolean("accepted",false)
   .putInt("fred_target",-1).putInt("emilie_target",-1)
   .putInt("fred_completed",0).putInt("emilie_completed",0)
   .putLong("fred_seen",0L).putLong("emilie_seen",0L).apply();
 }
 String seenKey(String who){return who.equals("Fred")?"fred_seen":"emilie_seen";}
 long seenMask(String who){return prefs.getLong(seenKey(who),0L);}
 void offerChallenge(String receiver){
  long history=seenMask(receiver);
  ChallengePicker.Pick next=ChallengePicker.draw(selected,false,history);
  if(next==null){
   PremiumDialog.info(this,"40 défis proposés à "+receiver,
    "Aucun défi inédit ne reste pour cette personne ce soir. Vous pouvez terminer ou recommencer la soirée.");
   return;
  }
  long nextNo=prefs.getLong("evening_roll_seq",0L)+1;
  prefs.edit().putLong("evening_roll_seq",nextNo)
   .remove("evening_timer_key").remove("evening_timer_end").remove("evening_timer_left")
   .putLong(seenKey(receiver),ChallengePicker.mark(history,next.category,next.face))
   .putBoolean("pending",true).putBoolean("accepted",false)
   .putString("actual",next.category.name()).putString("card_player",receiver)
   .putInt("face",next.face).apply();
  roll(next.face,()->{
   draw();
   if(next.category!=selected)
    Toast.makeText(this,"SURPRISE ! Catégorie "+categoryName(next.category),Toast.LENGTH_LONG).show();
  });
 }
 int target(String who){return prefs.getInt(who.equals("Fred")?"fred_target":"emilie_target",-1);}
 int completed(String who){return prefs.getInt(who.equals("Fred")?"fred_completed":"emilie_completed",0);}
 String other(String who){return who.equals("Fred")?"Émilie":"Fred";}
 void setReceiver(String who){
  player=who;prefs.edit().putString("player",who).apply();draw();
 }
 void duoProgress(){
  int f=target("Fred"),e=target("Émilie");
  LinearLayout c=card("♥  Qui donne, qui reçoit ?",null);
  if(e>0){
   addText(c,"♡  Émilie reçoit "+completed("Émilie")+"/"+e+"     ·     Fred donne "+e,14,WHITE,true,4);
   if(prefs.getBoolean("active",false))progress(c,(float)completed("Émilie")/e);
  }else addText(c,"♡  Émilie reçoit : à brasser   ·   Fred donne",13,MUTED,false,4);
  gap(c,3);
  if(f>0){
   addText(c,"♡  Fred reçoit "+completed("Fred")+"/"+f+"     ·     Émilie donne "+f,14,WHITE,true,4);
   if(prefs.getBoolean("active",false))progress(c,(float)completed("Fred")/f);
  }else addText(c,"♡  Fred reçoit : à brasser   ·   Émilie donne",13,MUTED,false,0);
 }
 void showGameD20(int value,boolean pending,Category actual,String receiver,int done,int total){
  LinearLayout hero=horizontal();
  hero.setBackground(shape(0xFF231126,0xFF32182E,19,0x66FC6AAB));
  hero.setPadding(dp(6),dp(6),dp(10),dp(6));
  LinearLayout.LayoutParams hp=new LinearLayout.LayoutParams(-1,dp(164));
  hp.bottomMargin=dp(8);
  page.addView(hero,hp);
  FrameLayout die=new FrameLayout(this);
  LinearLayout.LayoutParams dp20=new LinearLayout.LayoutParams(0,-1,.47f);
  hero.addView(die,dp20);
  gpuDice=null;gpuD20=null;dice=null;
  if(PremiumDice3DView.supported(this)){
   gpuD20=new PremiumD20View(this);
   gpuD20.setResult(value);
   die.addView(gpuD20,new FrameLayout.LayoutParams(-1,-1));
  }else{
   dice=new Dice3DView(this);dice.setSides(20);dice.setResult(value);
   die.addView(dice,new FrameLayout.LayoutParams(-1,-1));
  }
  LinearLayout detail=vertical();
  detail.setGravity(Gravity.CENTER_VERTICAL);
  detail.setPadding(dp(8),0,0,0);
  hero.addView(detail,new LinearLayout.LayoutParams(0,-1,.53f));
  addText(detail,pending?categoryName(actual).toUpperCase(java.util.Locale.CANADA_FRENCH)+" · FACE "+value:"D20 · DÉFIS",13,PINK,true,7);
  if(pending)addText(detail,"Pour : "+receiver+"\nDe : "+other(receiver),14,WHITE,true,7);
  else addText(detail,"Brassez pour découvrir le prochain défi.",13,PALE,false,7);
  addText(detail,done+" / "+total+" réalisés",14,WHITE,true,5);
  progress(detail,(float)done/Math.max(1,total));
 }
 void compactCoupleProgress(int fred,int emilie){
  LinearLayout box=vertical();box.setPadding(dp(12),dp(9),dp(12),dp(10));
  box.setBackground(shape(SURFACE,CARD2,16,0x55FF78B1));
  LinearLayout.LayoutParams outside=new LinearLayout.LayoutParams(-1,-2);
  outside.bottomMargin=dp(8);page.addView(box,outside);
  LinearLayout row=horizontal();box.addView(row);
  for(String receiver:new String[]{"Émilie","Fred"}){
   LinearLayout entry=vertical();
   LinearLayout.LayoutParams cell=new LinearLayout.LayoutParams(0,-2,1);
   if(receiver.equals("Émilie"))cell.rightMargin=dp(9);
   row.addView(entry,cell);
   int goal=receiver.equals("Émilie")?emilie:fred;
   int done=completed(receiver);
   addText(entry,receiver+" reçoit "+done+"/"+goal,13,WHITE,true,2);
   addText(entry,other(receiver)+" donne "+goal,11,MUTED,false,5);
   progress(entry,(float)done/Math.max(1,goal));
  }
 }
 void pairButton(LinearLayout target,String caption,boolean primary,Runnable callback){
  Button b=new Button(this);
  b.setAllCaps(false);b.setText(caption);b.setTextSize(12);
  b.setTypeface(Typeface.create("sans-serif-medium",Typeface.BOLD));
  b.setTextColor(primary?WHITE:PALE);
  b.setBackground(shape(primary?0xFFFF4998:0xFF3D2639,
    primary?0xFFC62D76:0xFF241729,14,primary?0x99FFD1E6:0x77F270AD));
  LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,dp(49),1);
  lp.rightMargin=dp(5);target.addView(b,lp);
  b.setOnClickListener(v->{if(!rolling)callback.run();});
 }
 void clearTimerTicker(){
  if(timerTask!=null)timerHandler.removeCallbacks(timerTask);
  timerTask=null;timerDisplay=null;
 }
 long remainingTimer(){
  long deadline=prefs.getLong("evening_timer_end",0L);
  return deadline>0?Math.max(0,deadline-System.currentTimeMillis()):
    Math.max(0,prefs.getLong("evening_timer_left",0L));
 }
 String clockFormat(long millis){
  long sec=(millis+999)/1000;
  return String.format(java.util.Locale.CANADA_FRENCH,"%02d:%02d",sec/60,sec%60);
 }
 void signalTimer(){
  if(prefs.getBoolean("evening_timer_notified",false))return;
  prefs.edit().putBoolean("evening_timer_notified",true).apply();
  String signal=prefs.getString("evening_timer_signal","sound");
  if(signal.equals("vibrate"))vibrate(350);
  else{
   try{
    ToneGenerator tone=new ToneGenerator(AudioManager.STREAM_NOTIFICATION,48);
    tone.startTone(ToneGenerator.TONE_PROP_BEEP2,650);
    timerHandler.postDelayed(tone::release,800);
   }catch(Exception ignored){vibrate(250);}
  }
  Toast.makeText(this,"♡ Minuteur terminé. Vous choisissez si vous poursuivez.",Toast.LENGTH_LONG).show();
 }
 void updateTimerDisplay(){
  if(timerDisplay==null)return;
  long rem=remainingTimer();
  timerDisplay.setText("⏱  "+clockFormat(rem));
  long deadline=prefs.getLong("evening_timer_end",0);
  if(deadline>0&&rem==0){
   prefs.edit().putLong("evening_timer_end",0).putLong("evening_timer_left",0).apply();
   signalTimer();
  }
 }
 void startTimerTicker(){
  if(timerTask!=null)timerHandler.removeCallbacks(timerTask);
  timerTask=new Runnable(){@Override public void run(){
   if(timerDisplay==null)return;
   updateTimerDisplay();
   timerHandler.postDelayed(this,500);
  }};
  timerHandler.post(timerTask);
 }
 void drawEveningTimer(LinearLayout card,String receiver,Category category,int face){
  String id=receiver+"_"+category.name()+"_"+face+"_"+prefs.getLong("evening_roll_seq",0L);
  long duration=EveningDurations.minutes(category,face)*60000L;
  if(!id.equals(prefs.getString("evening_timer_key",""))){
   prefs.edit().putString("evening_timer_key",id).putLong("evening_timer_end",0L)
    .putLong("evening_timer_left",duration).putBoolean("evening_timer_notified",false).apply();
  }
  addText(card,"MINUTEUR · "+EveningDurations.durationLabel(category,face),12,PINK,true,8);
  timerDisplay=text("⏱  "+clockFormat(remainingTimer()),26,WHITE,true);
  timerDisplay.setGravity(Gravity.CENTER);
  card.addView(timerDisplay,new LinearLayout.LayoutParams(-1,dp(48)));
  LinearLayout controls=horizontal();card.addView(controls);
  boolean running=prefs.getLong("evening_timer_end",0L)>0;
  pairButton(controls,running?"Ⅱ  PAUSE":"▶  DÉMARRER",true,()->{
   long end=prefs.getLong("evening_timer_end",0L);
   if(end>0){
    prefs.edit().putLong("evening_timer_left",Math.max(0,end-System.currentTimeMillis()))
     .putLong("evening_timer_end",0L).apply();
   }else{
    long left=remainingTimer();
    if(left<=0)left=duration;
    prefs.edit().putLong("evening_timer_left",left)
     .putLong("evening_timer_end",System.currentTimeMillis()+left)
     .putBoolean("evening_timer_notified",false).apply();
   }
   draw();
  });
  pairButton(controls,"↻  RECOMMENCER",false,()->{
   prefs.edit().putLong("evening_timer_end",0L).putLong("evening_timer_left",duration)
    .putBoolean("evening_timer_notified",false).apply();
   draw();
  });
  LinearLayout modes=horizontal();card.addView(modes);
  String current=prefs.getString("evening_timer_signal","sound");
  chip(modes,"♫ Son doux","sound".equals(current),()->{
   prefs.edit().putString("evening_timer_signal","sound").apply();draw();
  },1);
  chip(modes,"〰 Vibration","vibrate".equals(current),()->{
   prefs.edit().putString("evening_timer_signal","vibrate").apply();draw();
  },1);
  addText(card,"La durée est une suggestion; chacun peut interrompre le défi. Le signal de fin retentit quand LoveRoll est ouvert.",11,MUTED,false,6);
  startTimerTicker();
 }
 void drawGame(){
  heading("🔥  Votre soirée","Chacun décide de son rythme et reçoit ses propres défis");
  if(!prefs.getBoolean("active",false)&&!prefs.getString("last_feedback_session","").isEmpty()){
   LinearLayout completed=card("♥  Votre dernière soirée",
    "Soirée enregistrée. Prenez quelques instants pour partager vos trois réponses.");
   addButton(completed,"RÉPONDRE À NOS 3 QUESTIONS",true,()->{tab="feedback";draw();});
  }
  LinearLayout journals=card("♡  Nos calendriers et statistiques","Vos moments enregistrés, anciens et nouveaux.");
  addButton(journals,"OUVRIR LE JOURNAL INTIME",false,()->openJournal());
  if(prefs.getInt("goal",-1)<0){
   card("D'abord le dé hebdomadaire","Brassez le dé hebdomadaire à l'accueil avant de commencer.");
   addButton(page,"ALLER À L'ACCUEIL",true,()->{tab="home";draw();});
   return;
  }
  int fred=target("Fred"),emilie=target("Émilie");
  boolean active=prefs.getBoolean("active",false);
  if(!active){
   addText(page,"ÉTAPE 2 / 3   ·   DEUX D6 INDIVIDUELS",12,PINK,true,6);
   int last=prefs.getInt("setup_last_face",1);
   showDice(6,last);
   String lastReceiver=prefs.getString("setup_last_receiver","");
   if(!lastReceiver.isEmpty()&&(fred>0||emilie>0))
    addText(page,"🎯  "+lastReceiver+" reçoit "+last+" défi"+(last>1?"s":""),15,PINK,true,6);
   LinearLayout explanation=card("🎲  Un dé chacun",null);
   addText(explanation,"Chacun brasse le nombre de défis qu'il reçoit (1 à 6). L'autre les offre.",13,PALE,false,2);
   addText(explanation,"Ex. Émilie reçoit 4 → Fred donne 4.",12,MUTED,false,0);
   duoProgress();
   if(emilie<0){
    addButton(page,"🎲  ÉMILIE BRASSE : JE REÇOIS…",true,()->{
     int n=GameLogic.d6();
     if(!prefs.edit().putInt("emilie_target",n).putInt("setup_last_face",n)
       .putString("setup_last_receiver","Émilie").commit())return;
     roll(n,()->{
      draw();
      showResultDialog("♥","ÉMILIE REÇOIT "+n,
       "Fred lui offre "+n+" défi"+(n>1?"s":"")+" pendant la soirée.","CONTINUER");
     });
    });
   }
   if(fred<0){
    addButton(page,"🎲  FRED BRASSE : JE REÇOIS…",true,()->{
     int n=GameLogic.d6();
     if(!prefs.edit().putInt("fred_target",n).putInt("setup_last_face",n)
       .putString("setup_last_receiver","Fred").commit())return;
     roll(n,()->{
      draw();
      showResultDialog("♥","FRED REÇOIT "+n,
       "Émilie lui offre "+n+" défi"+(n>1?"s":"")+" pendant la soirée.","CONTINUER");
     });
    });
   }
   if(fred>0&&emilie>0){
    LinearLayout summary=card("♡  Votre programme de soirée",
       (fred+emilie)+" défis au total. À chacun son rythme.");
    addButton(summary,"♥  COMMENCER LA SOIRÉE",true,()->{
     prefs.edit().putBoolean("active",true).putBoolean("pending",false).apply();
     player=completed("Émilie")<emilie?"Émilie":"Fred";
     prefs.edit().putString("player",player).apply();draw();
    });
   }
   addButton(page,"↻  RECOMMENCER LES DEUX D6",false,()->confirmResetEvening());
   return;
  }
  int fredDone=completed("Fred"),emilieDone=completed("Émilie");
  int total=fred+emilie,done=fredDone+emilieDone;
  addText(page,"ÉTAPE 3 / 3   ·   D20 DES DÉFIS",12,PINK,true,5);
  boolean pending=prefs.getBoolean("pending",false);
  Category actual=Category.valueOf(prefs.getString("actual","COQUIN"));
  int face=prefs.getInt("face",1);
  String receiver=prefs.getString("card_player","Émilie");
  showGameD20(pending?face:20,pending,actual,receiver,done,total);
  compactCoupleProgress(fred,emilie);
  if(pending){
   String giver=other(receiver);
   String[] result=GameData.get(actual,face);
   LinearLayout resultCard=card("♥ "+categoryName(actual)+" · Face "+face,null);
   addText(resultCard,giver+" OFFRE  →  "+receiver+" REÇOIT",14,PINK,true,6);
   addText(resultCard,result[0],20,WHITE,true,5);
   addText(resultCard,result[1],14,PALE,false,6);
   addText(resultCard,"Exemple : "+result[2].replaceFirst("^Exemple : ",""),12,MUTED,false,7);
   addText(resultCard,"Défis proposés à "+receiver+" : "+
    (40-ChallengePicker.remaining(seenMask(receiver)))+" / 40",11,MUTED,false,7);
   drawEveningTimer(resultCard,receiver,actual,face);
   LinearLayout actions=horizontal();resultCard.addView(actions);
   if(!prefs.getBoolean("accepted",false)){
    pairButton(actions,"✓  ACCEPTER",true,()->{
     prefs.edit().putBoolean("accepted",true).apply();draw();
    });
    pairButton(actions,"↻  PASSER · NOUVEAU",false,()->offerChallenge(receiver));
   }else{
    pairButton(actions,"✓  DÉFI TERMINÉ",true,()->{
     String key=receiver.equals("Fred")?"fred_completed":"emilie_completed";
     prefs.edit().putInt(key,completed(receiver)+1)
      .putBoolean("pending",false).putBoolean("accepted",false).apply();draw();
    });
    pairButton(actions,"↻  CHANGER D'AVIS",false,()->offerChallenge(receiver));
   }
  }else if(done<total){
   if(target(player)<0||completed(player)>=target(player)){
    player=emilieDone<emilie?"Émilie":"Fred";
    prefs.edit().putString("player",player).apply();
   }
   LinearLayout selection=card("Qui reçoit le prochain défi ?",null);
   LinearLayout who=horizontal();selection.addView(who);
   if(emilieDone<emilie)
    chip(who,"Émilie",player.equals("Émilie"),()->setReceiver("Émilie"),1);
   if(fredDone<fred)
    chip(who,"Fred",player.equals("Fred"),()->setReceiver("Fred"),1);
   addText(selection,other(player)+" propose à "+player,13,PALE,false,5);
   addText(selection,"CHOIX DE LA CATÉGORIE",11,PINK,true,6);
   LinearLayout choices=horizontal();selection.addView(choices);
   for(Category cat:new Category[]{Category.SENSUEL,Category.SEXUEL}){
    chip(choices,categoryName(cat),selected==cat,()->{
     selected=cat;randomMode=false;
     prefs.edit().putString("selected",cat.name()).putBoolean("random_mode",false).apply();draw();
    },1);
   }
   addText(selection,"88 % dans la catégorie choisie · 12 % dans l'autre",12,MUTED,false,3);
   addButton(selection,"🎲  "+other(player).toUpperCase()+" BRASSE LE D20",true,
     ()->offerChallenge(player));
  }else{
   LinearLayout finish=card("♥  Tous les défis sont réalisés",
    "Vous avez complété les défis prévus pour vous deux.");
   addButton(finish,"TERMINER ET DONNER NOTRE AVIS",true,()->{
    String session=PrivateJournal.newId();
    boolean saved=prefs.edit().putInt("done",prefs.getInt("done",0)+1)
     .putString("last_feedback_session",session)
     .putString("last_feedback_date",LocalDate.now(ZoneId.of("America/Montreal")).toString())
     .commit();
    if(!saved){Toast.makeText(this,"Impossible d'enregistrer la soirée.",Toast.LENGTH_LONG).show();return;}
    resetEvening();
    feedbackPerson="Fred";feedbackRating=0;likedChoice=-1;nextChoice=-1;
    tab="feedback";draw();
   });
  }
  addButton(page,"Arrêter la soirée sans la compter",false,()->confirmResetEvening());
  addText(page,"Chacun peut refuser, modifier ou interrompre un défi. Passer ne réduit jamais le nombre restant.",
    11,MUTED,false,0);
 }
 void confirmResetEvening(){
  PremiumDialog.confirm(this,"Recommencer cette soirée ?",
   "Les dés et la progression de la soirée seront remis à zéro. Le dé hebdomadaire restera inchangé.",
   "RECOMMENCER",()->{resetEvening();draw();});
 }
 String categoryName(Category c){
  switch(c){case COQUIN:return "Coquin";case SEXUEL:return "Sexuel";default:return "Sensuel";}
 }

 String specialPrefix(LocalDate date){return "special_"+SpecialDateData.monthKey(date)+"_";}
 SpecialDateData.Draw specialSaved(LocalDate date){
  String p=specialPrefix(date);
  int face=prefs.getInt(p+"face",-1);
  if(face<1||face>20)return null;
  return new SpecialDateData.Draw(face,prefs.getBoolean(p+"fred",false),
    prefs.getBoolean(p+"optionB",false));
 }
 void drawSpecial(){
  LocalDate now=LocalDate.now(SpecialDateData.ZONE);
  String prefix=specialPrefix(now);
  SpecialDateData.Draw saved=specialSaved(now);
  int hostD6=saved==null?0:prefs.getInt(prefix+"host_face",0);
  boolean restaurant=saved!=null&&SpecialDateData.isRestaurant(saved.face);
  int restoD6=restaurant?prefs.getInt(prefix+"restaurant_variant_face",0):0;
  heading("✦  Défi spécial","Un rendez-vous surprise en amoureux, une fois par mois");
  addText(page,"RENDEZ-VOUS DE "+SpecialDateData.monthLabel(now).toUpperCase(java.util.Locale.CANADA_FRENCH),
    12,PINK,true,7);
  if(saved==null)showDice(20,20);
  else if(hostD6==0||restaurant&&restoD6==0)showDice(6,hostD6==0?1:restoD6>0?restoD6:1);
  else showDice(20,saved.face);
  if(saved==null){
   LinearLayout intro=card("♡  Votre rendez-vous mensuel",
    "20 idées de sortie autour de Québec, adaptées à vos horaires de parents.");
   addText(intro,"① D20 : activité du mois, 1 chance sur 20",13,PALE,true,5);
   addText(intro,"② D6 : qui invite et paie ? Fred ou Émilie, 50/50",13,PALE,true,5);
   addText(intro,"③ Si restaurant : D6 connu ou nouveau, 50/50",13,PALE,true,5);
   addText(intro,"Prévoir 2 à 6 heures de gardienne selon la sortie. Rien n'est réservé automatiquement.",12,MUTED,false,7);
   addButton(intro,"🎲  BRASSER LE D20 DU MOIS",true,()->{
    if(!SpecialDateData.monthKeyNow().equals(SpecialDateData.monthKey(now))){draw();return;}
    if(specialSaved(LocalDate.now(SpecialDateData.ZONE))!=null)return;
    SpecialDateData.Draw pick=SpecialDateData.draw();
    boolean ok=prefs.edit().putInt(prefix+"face",pick.face)
      .putBoolean(prefix+"fred",false)
      .putBoolean(prefix+"optionB",pick.optionB)
      .putInt(prefix+"host_face",0).putInt(prefix+"restaurant_variant_face",0)
      .putString(prefix+"date",now.toString()).putBoolean(prefix+"done",false).commit();
    if(!ok){Toast.makeText(this,"Impossible d'enregistrer le tirage.",Toast.LENGTH_LONG).show();return;}
    roll(pick.face,()->{
     draw();showResultDialog("✦",SpecialDateData.title(pick),
       "Votre activité est choisie. Brassez maintenant le D6 pour décider qui invite à 50/50.",
       "CHOISIR QUI INVITE");
    });
   });
  }else{
   LinearLayout result=card("✦  "+SpecialDateData.title(saved)+" · D20 FACE "+saved.face,null);
   if(hostD6==0){
    addText(result,"♡  ÉTAPE 2 · QUI INVITE ?",16,PINK,true,7);
    addText(result,"1–3 : Fred invite · 4–6 : Émilie invite",14,PALE,true,7);
    addText(result,"La personne choisie organise la sortie et prend en charge l'invitation, selon votre budget commun.",12,MUTED,false,8);
    addButton(result,"🎲  BRASSER LE D6 : QUI INVITE ?",true,()->{
     if(!SpecialDateData.monthKeyNow().equals(SpecialDateData.monthKey(now))){draw();return;}
     if(prefs.getInt(prefix+"host_face",0)>0)return;
     int n=GameLogic.d6();boolean fred=n<=3;
     if(!prefs.edit().putInt(prefix+"host_face",n).putBoolean(prefix+"fred",fred).commit()){
      Toast.makeText(this,"Tirage non enregistré.",Toast.LENGTH_LONG).show();return;
     }
     roll(n,()->{
      draw();
      showResultDialog("♥",fred?"FRED INVITE ÉMILIE":"ÉMILIE INVITE FRED",
       "D6 : "+n+" · Invitation enregistrée pour ce mois. "+
        (restaurant?"Brassez encore une fois pour choisir le type de restaurant.":"Votre sortie est prête à organiser."),
       "CONTINUER");
     });
    });
   }else{
    addText(result,"♥  "+SpecialDateData.inviter(saved).toUpperCase(java.util.Locale.CANADA_FRENCH)+
      " INVITE "+SpecialDateData.invited(saved).toUpperCase(java.util.Locale.CANADA_FRENCH)+
      "  ·  D6 FACE "+hostD6,15,PINK,true,8);
    if(restaurant&&restoD6==0){
     addText(result,"♡  ÉTAPE 3 · RESTO CONNU OU NOUVEAU ?",15,PINK,true,5);
     addText(result,"D6 : 1–3 resto connu · 4–6 nouveau resto (50/50).",13,PALE,false,8);
     addButton(result,"🎲  BRASSER LE DÉ DU RESTAURANT",true,()->{
      if(!SpecialDateData.monthKeyNow().equals(SpecialDateData.monthKey(now))){draw();return;}
      if(prefs.getInt(prefix+"restaurant_variant_face",0)>0)return;
      int n=GameLogic.d6();boolean isNew=SpecialDateData.restaurantIsNew(n);
      if(!prefs.edit().putInt(prefix+"restaurant_variant_face",n).putBoolean(prefix+"optionB",isNew).commit()){
       Toast.makeText(this,"Tirage non enregistré.",Toast.LENGTH_LONG).show();return;
      }
      roll(n,()->{
       draw();showResultDialog("♥",SpecialDateData.restaurantChoiceLabel(n),
        "D6 : "+n+"\n"+SpecialDateData.option(
          new SpecialDateData.Draw(saved.face,saved.fredInvites,isNew),now),"C'EST NOTÉ");
      });
     });
    }else{
     if(restaurant)addText(result,"🎯  "+SpecialDateData.restaurantChoiceLabel(restoD6)+
       " · D6 FACE "+restoD6,15,PINK,true,6);
     addText(result,SpecialDateData.option(saved,now),16,WHITE,true,7);
    }
    if(!restaurant||restoD6>0){
     addText(result,SpecialDateData.description(saved),13,PALE,false,7);
     addText(result,"📍 "+SpecialDateData.location(saved)+" · Gardienne : "+SpecialDateData.childcare(saved),
       12,MUTED,false,8);
     if(prefs.getBoolean(prefix+"done",false)){
      addText(result,"✓ Sortie réalisée",14,GREEN,true,5);
      addButton(result,"↻  MARQUER COMME À ORGANISER",false,()->{
       prefs.edit().putBoolean(prefix+"done",false).apply();draw();
      });
     }else{
      addButton(result,"✓  SORTIE RÉALISÉE",true,()->{
       prefs.edit().putBoolean(prefix+"done",true).apply();draw();
      });
     }
    }
   }
   addText(page,"🔒 L'activité, la personne qui invite et le restaurant restent enregistrés jusqu'au mois prochain.",12,MUTED,false,8);
  }
  LinearLayout eventsCard=card("💘 Nos fêtes et anniversaires",
   "Saint-Valentin, anniversaire de couple, fête des Mères, fête des Pères et anniversaires personnels.");
  addButton(eventsCard,"🎲  ÉVÉNEMENTS SPÉCIAUX →",true,()->{tab="occasions";draw();});
  StringBuilder history=new StringBuilder();
  for(int n=1;n<=12;n++){
   LocalDate previous=now.minusMonths(n);
   SpecialDateData.Draw d=specialSaved(previous);
   if(d==null)continue;
   history.append("•  ").append(SpecialDateData.monthLabel(previous))
    .append(" : ").append(SpecialDateData.title(d))
    .append(prefs.getInt(specialPrefix(previous)+"host_face",0)>0?
     " · "+SpecialDateData.inviter(d)+" invite":"")
    .append(prefs.getBoolean(specialPrefix(previous)+"done",false)?" ✓":"").append("\n");
  }
  if(history.length()>0){
   LinearLayout past=card("♡  Historique des sorties",null);
   addText(past,history.toString().trim(),12,PALE,false,0);
  }
 }

 String occasionMd(int index){
  return prefs.getString("loveroll_occasion_md_"+LoveOccasions.dateKey(index),"");
 }
 String occasionPref(int index,int year){return "loveroll_occasion_"+LoveOccasions.dateKey(index)+"_"+year+"_";}
 void drawOccasions(){
  LocalDate now=LocalDate.now(SpecialDateData.ZONE);
  heading("💘  Événements spéciaux","Des surprises pour vos grandes occasions");
  addText(page,"Un D20 et un D6 par événement. Chaque surprise est facultative, vous fixez ensemble vos limites.",13,PALE,false,7);
  for(int i=0;i<LoveOccasions.KEYS.length;i++){
   final int idx=i;String md=occasionMd(i);
   LocalDate next=LoveOccasions.date(i,now.getYear(),md);
   int activeYear=LoveOccasions.activeYear(i,now,md);
   if(next!=null&&next.isBefore(now)&&activeYear<0)next=LoveOccasions.date(i,now.getYear()+1,md);
   LinearLayout c=card("♡  "+LoveOccasions.title(i),next==null?"Date à préciser dans Réglages":
    "Prochaine fête : "+next+" · Tirage de 14 jours avant à 7 jours après.");
   if(activeYear>=0){
    addText(c,"✦ Le tirage est ouvert !",13,PINK,true,4);
    addButton(c,"OUVRIR CETTE SURPRISE  →",true,()->{selectedLoveOccasion=idx;tab="occasion_detail";draw();});
   }else if(next!=null)addText(c,"🔒 À découvrir bientôt",12,MUTED,false,2);
   else addButton(c,"DÉFINIR LA DATE",false,()->{tab="settings";draw();});
  }
  addButton(page,"←  RETOUR AU DÉFI SPÉCIAL",false,()->{tab="special";draw();});
 }
 void drawOccasionDetail(){
  LocalDate now=LocalDate.now(SpecialDateData.ZONE);
  int i=selectedLoveOccasion,yr=LoveOccasions.activeYear(i,now,occasionMd(i));
  if(yr<0){tab="occasions";draw();return;}
  String prefix=occasionPref(i,yr);
  int face=prefs.getInt(prefix+"face",0),host=prefs.getInt(prefix+"host",0);
  heading("💘  "+LoveOccasions.title(i),"Une surprise à deux, comme vous l'aimez");
  if(face==0)showDice(20,20);
  else if(host==0)showDice(6,1);
  else showDice(20,face);
  LinearLayout card=card("✦  Votre surprise officielle",null);
  if(face==0){
   addText(card,"Un D20 choisit parmi 20 propositions sensuelles et romantiques.",13,PALE,false,7);
   addButton(card,"🎲  BRASSER LE D20",true,()->{
    if(LoveOccasions.activeYear(i,LocalDate.now(SpecialDateData.ZONE),occasionMd(i))!=yr){draw();return;}
    if(prefs.getInt(prefix+"face",0)>0)return;
    int picked=GameLogic.d20();
    if(!prefs.edit().putInt(prefix+"face",picked).commit()){Toast.makeText(this,"Erreur d'enregistrement",Toast.LENGTH_LONG).show();return;}
    roll(picked,()->{draw();showResultDialog("♡",LoveOccasions.SURPRISES[picked-1][0],
      "Un D6 décidera ensuite qui prépare la surprise. Chacun peut adapter ou refuser une proposition.","CONTINUER");});
   });
  }else{
   addText(card,LoveOccasions.SURPRISES[face-1][0],19,PINK,true,7);
   addText(card,LoveOccasions.SURPRISES[face-1][1],14,PALE,false,8);
   addText(card,"D20 FACE "+face,12,MUTED,true,5);
   if(host==0){
    addText(card,"🎲 D6 : 1 à 3 = premier partenaire · 4 à 6 = deuxième partenaire.",13,PALE,false,6);
    addButton(card,"🎲  QUI ORGANISE CETTE SURPRISE ?",true,()->{
     if(prefs.getInt(prefix+"host",0)>0)return;
     int d6=LoveOccasions.d6();
     if(!prefs.edit().putInt(prefix+"host",d6).commit()){Toast.makeText(this,"Erreur d'enregistrement",Toast.LENGTH_LONG).show();return;}
     roll(d6,()->{draw();showResultDialog("♥","Surprise à organiser",
       "Résultat D6 : "+d6+" · "+(d6<=3?"Premier partenaire":"Deuxième partenaire")+
       " organise la surprise.","C'EST NOTÉ");});
    });
   }else{
    addText(card,"♥  "+(host<=3?"Premier partenaire":"Deuxième partenaire")+
      " organise · D6 FACE "+host,16,PINK,true,6);
    addText(card,"Cette version Android conserve le tirage localement. Le nom et la synchronisation des comptes sont disponibles dans le futur espace web connecté.",12,MUTED,false,6);
   }
  }
  addText(page,"Un tirage par occasion et par année. Rien n'est une obligation, et vous êtes libres de dire non.",12,MUTED,false,8);
  addButton(page,"←  ÉVÉNEMENTS",false,()->{tab="occasions";draw();});
 }
 void drawLibrary(){
  heading("♡  Les défis","Réglages  ›  40 défis actifs · anciennes cartes conservées");
  addButton(page,"←  RETOUR AUX RÉGLAGES",false,()->{tab="settings";draw();});
  section("Explorer les catégories");
  LinearLayout row=horizontal();page.addView(row);
  for(Category c:new Category[]{Category.SENSUEL,Category.SEXUEL})chip(row,categoryName(c),selected==c,()->{
   selected=c;prefs.edit().putString("selected",c.name()).apply();draw();
  },1);
  gap(page,16);
  addText(page,categoryName(selected).toUpperCase()+"  ·  20 FACES",12,PINK,true,13);
  for(int i=1;i<=20;i++){
   String[] item=GameData.get(selected,i);
   LinearLayout c=card(String.format(java.util.Locale.CANADA_FRENCH,"%02d  ♥  %s",i,item[0]),"À faire : "+item[1]);
   addText(c,"Exemple : "+item[2].replaceFirst("^Exemple : ",""),13,MUTED,false,5);
   addText(c,"⏱ "+EveningDurations.durationLabel(selected,i)+" · Minuteur intégré pendant la soirée",12,PINK,true,0);
  }
 }

 LocalDate adventToday(){return LocalDate.now(ZoneId.of("America/Montreal"));}
 int adventYear(){return adventToday().getYear();}
 String adventKey(int day,String kind){return "advent_"+adventYear()+"_"+day+"_"+kind;}
 boolean adventDone(int day){
  return AdventData.unlocked(day,adventToday())&&prefs.getBoolean(adventKey(day,"done"),false);
 }
 boolean adventSwap(int day){return prefs.getBoolean(adventKey(day,"swapped"),false);}
 int adventProgress(){
  int done=0;
  for(int day=1;day<=AdventData.unlockedCount(adventToday());day++)if(adventDone(day))done++;
  return done;
 }
 void drawAdvent(){
  LocalDate today=adventToday();
  int unlocked=AdventData.unlockedCount(today);
  int year=today.getYear();
  heading("🎁  Calendrier de l'Avent","25 surprises qui deviennent de plus en plus coquines");
  addText(page,"DÉCEMBRE "+year+"  ·  UN JOUR, UNE CASE À DÉCOUVRIR",12,PINK,true,8);
  LinearLayout intro=card("♥  "+adventProgress()+" / 25 cases réalisées",
   "Un seul calendrier pour Fred et Émilie. Chaque surprise s'ouvre uniquement à partir de sa date.");
  progress(intro,adventProgress()/25f);
  if(unlocked==0){
   LinearLayout waiting=card("🔒  Calendrier encore fermé",
    "Rendez-vous le 1er décembre "+year+" pour dévoiler la première surprise.");
   addText(waiting,"Les 25 activités resteront secrètes jusque-là. Impossible d'ouvrir une case en avance.",14,PALE,false,0);
  }else if(unlocked<25){
   card("🎁  Cases 1 à "+unlocked+" disponibles",
    "La prochaine case se débloque le "+(unlocked+1)+" décembre. Les suivantes restent secrètes.");
  }else{
   card("🎁  Toutes les cases sont débloquées",
    "Vous pouvez revoir les surprises des jours précédents et cocher celles réalisées.");
  }
  for(int row=0;row<5;row++){
   LinearLayout week=horizontal();page.addView(week);
   for(int col=0;col<5;col++){
    final int day=row*5+col+1;
    final boolean available=AdventData.unlocked(day,today);
    String label=available?(adventDone(day)?"✓ "+day:"🎁 "+day):"🔒 "+day;
    chip(week,label,available&&adventSelected==day,()->{
     if(!AdventData.unlocked(day,adventToday())){
      Toast.makeText(this,"La case "+day+" sera dévoilée le "+day+" décembre.",Toast.LENGTH_LONG).show();
      return;
     }
     adventSelected=day;
     prefs.edit().putInt("advent_selected",day).apply();
     draw();
    },1);
   }
   gap(page,7);
  }
  if(unlocked==0){
   gap(page,13);
   card("♥  Le suspense fait partie du jeu",
    "Le contenu des cases et le défi du samedi spécial seront révélés seulement le jour venu.");
   return;
  }
  if(adventSelected<1||adventSelected>unlocked){
   adventSelected=unlocked;
   prefs.edit().putInt("advent_selected",adventSelected).apply();
  }
  int day=adventSelected;
  String[] item=AdventData.revealedActivity(day,today);
  if(item==null)return; // Never show unopened day contents, even if an old selection is stored.
  boolean together=AdventData.isTogether(day,year);
  String giver=AdventData.giver(day,adventSwap(day),year);
  String receiver=AdventData.recipient(day,adventSwap(day),year);
  gap(page,13);
  LinearLayout chosen=card("🎁  CASE "+day+" / 25  ·  "+item[0],null);
  if(together){
   addText(chosen,"♥  ACTIVITÉ ENSEMBLE : FRED + ÉMILIE",16,PINK,true,9);
  }else{
   addText(chosen,"🎁  QUI OFFRE : "+giver.toUpperCase(java.util.Locale.CANADA_FRENCH),16,PINK,true,7);
   addText(chosen,"♡  QUI REÇOIT : "+receiver.toUpperCase(java.util.Locale.CANADA_FRENCH),16,WHITE,true,9);
  }
  addText(chosen,"À FAIRE",12,PINK,true,6);
  addText(chosen,AdventData.instruction(day,adventSwap(day),year),17,WHITE,false,12);
  addText(chosen,"EXEMPLE",12,PINK,true,5);
  addText(chosen,AdventData.example(day,adventSwap(day),year).replaceFirst("^Exemple : ",""),15,MUTED,false,12);
  if(!together){
   addButton(chosen,"↔  INVERSER FRED ET ÉMILIE",false,()->{
    if(!AdventData.unlocked(day,adventToday()))return;
    prefs.edit().putBoolean(adventKey(day,"swapped"),!adventSwap(day)).apply();
    draw();
   });
  }
  if(!adventDone(day)){
   addButton(chosen,"✓  MARQUER CETTE CASE TERMINÉE",true,()->{
    if(!AdventData.unlocked(day,adventToday()))return;
    prefs.edit().putBoolean(adventKey(day,"done"),true).apply();
    draw();
   });
  }else{
   addText(chosen,"✓ Cette activité a été réalisée.",15,GREEN,true,6);
   addButton(chosen,"↻  REMETTRE À FAIRE",false,()->{
    if(!AdventData.unlocked(day,adventToday()))return;
    prefs.edit().putBoolean(adventKey(day,"done"),false).apply();draw();
   });
  }
  addText(page,"Chaque proposition est facultative. Vous pouvez la modifier, la remettre à plus tard ou passer sans justification.",13,MUTED,false,16);
  if(adventProgress()==25)
   card("♥  25 moments accomplis !","Le calendrier sera renouvelé en décembre prochain.");
 }

 List<JournalStats.Entry> loadJournalStats(){
  try{return journal.stats();}
  catch(Exception e){throw new IllegalStateException("Impossible d'ouvrir le journal chiffré : "+e.getMessage(),e);}
 }
 void openJournal(){
  journalMonth=LocalDate.now(ZoneId.of("America/Montreal")).withDayOfMonth(1);
  selectedJournalDate=LocalDate.now(ZoneId.of("America/Montreal"));
  tab="journal";draw();
 }
 void smallStatistic(LinearLayout row,String title,String value){
  LinearLayout cell=vertical();cell.setGravity(Gravity.CENTER);
  cell.setPadding(dp(5),dp(12),dp(5),dp(11));
  cell.setBackground(shape(SURFACE,CARD2,14,0x55E870AA));
  LinearLayout.LayoutParams cp=new LinearLayout.LayoutParams(0,-2,1);cp.rightMargin=dp(5);
  row.addView(cell,cp);
  TextView main=text(value,23,WHITE,true);main.setGravity(Gravity.CENTER);
  cell.addView(main);
  TextView label=text(title,11,MUTED,false);label.setGravity(Gravity.CENTER);cell.addView(label);
 }
 void drawJournal(){
  heading("♡  Notre journal","Calendrier intime et statistiques privées");
  addText(page,"ENREGISTREMENT LOCAL CHIFFRÉ · AUCUN PARTAGE INTERNET",11,PINK,true,9);
  List<JournalStats.Entry> entries;
  try{entries=loadJournalStats();}
  catch(Exception e){
   card("🔒 Journal inaccessible",e.getMessage());
   addButton(page,"RETOUR AUX RÉGLAGES",false,()->{tab="settings";draw();});return;
  }
  LocalDate today=LocalDate.now(ZoneId.of("America/Montreal"));
  LinearLayout metrics=horizontal();page.addView(metrics);
  smallStatistic(metrics,"Cette semaine",""+JournalStats.week(entries,today));
  smallStatistic(metrics,"Ce mois",""+JournalStats.month(entries,today));
  smallStatistic(metrics,"Cette année",""+JournalStats.year(entries,today));
  gap(page,8);
  LinearLayout rating=card("★  Note moyenne des soirées",null);
  if(JournalStats.ratedCount(entries)>0)
   addText(rating,String.format(java.util.Locale.CANADA_FRENCH,"%.1f / 5 étoiles  ·  %d réponses",JournalStats.meanRating(entries),JournalStats.ratedCount(entries)),18,PINK,true,2);
  else addText(rating,"Aucun avis pour l'instant · note sur 5 après chaque soirée.",13,MUTED,false,2);
  addText(page,"CALENDRIER DES MOMENTS INTIMES",13,PINK,true,8);
  LinearLayout monthRow=horizontal();page.addView(monthRow);
  chip(monthRow,"‹",false,()->{journalMonth=journalMonth.minusMonths(1);draw();},1);
  TextView month=text(journalMonth.getMonth().getDisplayName(java.time.format.TextStyle.FULL,new java.util.Locale("fr","CA"))+
   " "+journalMonth.getYear(),16,WHITE,true);
  month.setGravity(Gravity.CENTER);monthRow.addView(month,new LinearLayout.LayoutParams(0,dp(38),3));
  chip(monthRow,"›",false,()->{journalMonth=journalMonth.plusMonths(1);draw();},1);
  gap(page,8);
  LinearLayout days=vertical();
  days.setPadding(dp(8),dp(8),dp(4),dp(8));
  days.setBackground(shape(SURFACE,CARD2,18,0x55E870AA));
  page.addView(days,new LinearLayout.LayoutParams(-1,-2));
  LinearLayout headings=horizontal();days.addView(headings);
  for(String dayName:new String[]{"L","M","M","J","V","S","D"}){
   TextView label=text(dayName,12,MUTED,true);label.setGravity(Gravity.CENTER);
   headings.addView(label,new LinearLayout.LayoutParams(0,dp(24),1));
  }
  int offset=journalMonth.getDayOfWeek().getValue()-1;
  int length=journalMonth.lengthOfMonth();
  int rows=(offset+length+6)/7;
  for(int week=0;week<rows;week++){
   LinearLayout line=horizontal();days.addView(line);
   for(int i=0;i<7;i++){
    int day=week*7+i-offset+1;
    if(day<1||day>length){line.addView(new View(this),new LinearLayout.LayoutParams(0,dp(43),1));continue;}
    LocalDate date=journalMonth.withDayOfMonth(day);
    int count=JournalStats.dayCount(entries,date);
    String label=(count>0?"♥\n":"")+day;
    TextView cell=text(label,count>0?12:14,date.equals(selectedJournalDate)?WHITE:count>0?PINK:PALE,count>0);
    cell.setGravity(Gravity.CENTER);
    cell.setBackground(shape(date.equals(selectedJournalDate)?0xFF9D285F:0xFF311C33,
     date.equals(selectedJournalDate)?0xFF7A2555:0xFF231428,10,
     date.equals(selectedJournalDate)?PINK:0));
    LinearLayout.LayoutParams cp=new LinearLayout.LayoutParams(0,dp(43),1);cp.rightMargin=dp(3);cp.bottomMargin=dp(4);
    line.addView(cell,cp);
    cell.setOnClickListener(v->{selectedJournalDate=date;draw();});
   }
  }
  int selectedCount=JournalStats.dayCount(entries,selectedJournalDate);
  LinearLayout chosen=card("♡  "+selectedJournalDate+"   ·   "+selectedCount+" relation"+(selectedCount>1?"s":""),null);
  addText(chosen,"Les journées roses contiennent une entrée. Les jours vides ne signifient rien sur votre vie intime.",12,MUTED,false,5);
  try{
   JSONArray all=journal.all();
   for(int i=all.length()-1;i>=0;i--){
    JSONObject item=all.getJSONObject(i);
    if(!item.optString("type").equals("relation")||!item.optString("date").equals(selectedJournalDate.toString()))continue;
    addText(chosen,"♥  "+item.optString("orgasm","Non indiqué"),13,PALE,true,3);
    addText(chosen,"Point fort : "+item.optString("good","—")+"  ·  À améliorer : "+item.optString("weak","—"),12,MUTED,false,3);
    if(!item.optString("note","").isEmpty())addText(chosen,item.optString("note"),12,PALE,false,4);
    final String id=item.optString("id");
    addButton(chosen,"SUPPRIMER CETTE ENTRÉE",false,()->PremiumDialog.confirm(this,
      "Supprimer cette relation ?","Cette action ne pourra pas être annulée.","SUPPRIMER",()->{
       try{journal.remove(id);draw();}catch(Exception ex){journalError(ex);}
      }));
   }
  }catch(Exception ex){addText(chosen,"Détails non disponibles : "+ex.getMessage(),12,PINK,false,0);}
  addButton(page,"♥  AJOUTER UNE RELATION À CETTE DATE",true,()->{
   orgasmChoice=-1;goodChoice=-1;weakChoice=-1;tab="intimacy";draw();
  });
  addButton(page,"★  QUESTIONNAIRES DE SOIRÉE",false,()->{tab="feedback";draw();});
  addButton(page,"←  RETOUR AUX RÉGLAGES",false,()->{tab="settings";draw();});
 }
 void journalError(Exception e){
  PremiumDialog.info(this,"Impossible d'enregistrer",e.getMessage()==null?"Erreur inconnue":e.getMessage());
 }
 void drawIntimacyEditor(){
  heading("♥  Nouvelle entrée","Journal intime · "+selectedJournalDate);
  LinearLayout intro=card("Avec votre partenaire",null);
  addText(intro,"Fred et Émilie · Saisie volontaire. Une entrée = une relation enregistrée.",13,PALE,false,5);
  addText(page,"QUI A EU UN ORGASME ?",13,PINK,true,9);
  String[] orgasm={"Fred","Émilie","Les deux","Aucun","Non précisé"};
  for(int r=0;r<orgasm.length;r+=3){
   LinearLayout line=horizontal();page.addView(line);
   for(int i=r;i<Math.min(r+3,orgasm.length);i++){
    final int idx=i;chip(line,orgasm[i],orgasmChoice==i,()->{orgasmChoice=idx;draw();},1);
   }
   gap(page,6);
  }
  addText(page,"POINT FORT DE CE MOMENT",13,PINK,true,8);
  String[] positive={"Complicité","Tendresse","Communication","Plaisir","Nouveauté"};
  for(int row=0;row<2;row++){
   LinearLayout line=horizontal();page.addView(line);
   for(int i=row*3;i<Math.min(row*3+3,positive.length);i++){
    final int idx=i;chip(line,positive[i],goodChoice==i,()->{goodChoice=idx;draw();},1);
   }
   gap(page,6);
  }
  addText(page,"QU'EST-CE QU'ON POURRAIT AMÉLIORER ?",13,PINK,true,8);
  String[] improve={"Rien","Plus de temps","Plus de douceur","Varier davantage","En parler"};
  for(int row=0;row<2;row++){
   LinearLayout line=horizontal();page.addView(line);
   for(int i=row*3;i<Math.min(row*3+3,improve.length);i++){
    final int idx=i;chip(line,improve[i],weakChoice==i,()->{weakChoice=idx;draw();},1);
   }
   gap(page,6);
  }
  EditText note=new EditText(this);note.setSingleLine(false);
  note.setHint("Note facultative (privée sur ce téléphone)");
  note.setHintTextColor(MUTED);note.setTextColor(WHITE);note.setTextSize(14);
  note.setMinLines(2);note.setMaxLines(4);
  note.setBackground(shape(SURFACE,CARD2,13,0x668C4F73));note.setPadding(dp(10),dp(6),dp(10),dp(6));
  page.addView(note,new LinearLayout.LayoutParams(-1,dp(80)));
  addButton(page,"ENREGISTRER CETTE RELATION",true,()->{
   if(orgasmChoice<0||goodChoice<0||weakChoice<0){
    Toast.makeText(this,"Choisis une réponse pour les trois questions.",Toast.LENGTH_SHORT).show();return;
   }
   try{
    JSONObject event=new JSONObject();
    event.put("id",PrivateJournal.newId());event.put("type","relation");
    event.put("date",selectedJournalDate.toString());
    event.put("partner","Fred et Émilie");
    event.put("orgasm",orgasm[orgasmChoice]);event.put("good",positive[goodChoice]);
    event.put("weak",improve[weakChoice]);
    event.put("note",note.getText().toString().trim());
    journal.upsert(event);journalMonth=selectedJournalDate.withDayOfMonth(1);tab="journal";draw();
   }catch(Exception e){journalError(e);}
  });
  addButton(page,"ANNULER",false,()->{tab="journal";draw();});
 }
 void drawFeedback(){
  String session=prefs.getString("last_feedback_session","");
  heading("★  Notre avis sur la soirée","Trois questions rapides, une réponse chacun");
  if(session.isEmpty()){
   card("Aucune soirée récente à évaluer","Terminez une soirée de défis pour remplir vos questionnaires.");
   addButton(page,"←  NOTRE JOURNAL",false,()->{tab="journal";draw();});return;
  }
  String date=prefs.getString("last_feedback_date","");
  addText(page,"SOIRÉE DU "+date,12,PINK,true,8);
  JSONArray responses;
  try{responses=journal.all();}catch(Exception e){card("Journal inaccessible",e.getMessage());return;}
  for(String person:new String[]{"Fred","Émilie"}){
   boolean answered=false;
   for(int i=0;i<responses.length();i++){
    JSONObject x=responses.optJSONObject(i);
    if(x!=null&&("survey_"+session+"_"+person).equals(x.optString("id")))answered=true;
   }
   LinearLayout profile=card(person+(answered?"   ✓ Réponse enregistrée":"   · À répondre"),null);
   if(answered)addText(profile,"Sa réponse est sauvegardée dans le journal.",12,GREEN,false,0);
   addButton(profile,(answered?"MODIFIER L'AVIS DE ":"RÉPONDRE POUR ")+person.toUpperCase(),!answered,()->{
    feedbackPerson=person;feedbackRating=0;likedChoice=-1;nextChoice=-1;tab="feedback_answer";draw();
   });
  }
  addText(page,"Chacun répond en son nom. Sur ce téléphone, il n'y a pas encore de compte personnel ni de confidentialité entre les réponses; l'accès iPhone nécessite la synchronisation sécurisée.",12,MUTED,false,12);
  addButton(page,"♡  VOIR LE JOURNAL ET LES STATS",true,()->{tab="journal";draw();});
  addButton(page,"←  ACCUEIL",false,()->{tab="home";draw();});
 }
 void drawFeedbackAnswer(){
  heading("★  Avis d'après-soirée","Questionnaire de "+feedbackPerson+" · trois réponses");
  addText(page,"1 · NOTE GÉNÉRALE DE LA SOIRÉE",13,PINK,true,7);
  LinearLayout stars=horizontal();page.addView(stars);
  for(int n=1;n<=5;n++){
   final int idx=n;chip(stars,(feedbackRating>=n?"★":"☆")+n,feedbackRating==n,
    ()->{feedbackRating=idx;draw();},1);
  }
  gap(page,13);
  addText(page,"2 · CE QUE J'AI PRÉFÉRÉ",13,PINK,true,7);
  String[] liked={"Complicité","Tendresse","Les défis","L'ambiance","Les surprises"};
  for(int row=0;row<2;row++){
   LinearLayout line=horizontal();page.addView(line);
   for(int i=row*3;i<Math.min(row*3+3,liked.length);i++){
    final int idx=i;chip(line,liked[i],likedChoice==i,()->{likedChoice=idx;draw();},1);
   }
   gap(page,6);
  }
  gap(page,8);
  addText(page,"3 · POUR LA PROCHAINE FOIS",13,PINK,true,7);
  String[] next={"Rien à changer","Plus de douceur","Plus de temps","Plus de surprises","Rythme différent"};
  for(int row=0;row<2;row++){
   LinearLayout line=horizontal();page.addView(line);
   for(int i=row*3;i<Math.min(row*3+3,next.length);i++){
    final int idx=i;chip(line,next[i],nextChoice==i,()->{nextChoice=idx;draw();},1);
   }
   gap(page,6);
  }
  addButton(page,"✓  ENREGISTRER MON AVIS",true,()->{
   if(feedbackRating<1||likedChoice<0||nextChoice<0){
    Toast.makeText(this,"Réponds aux trois questions.",Toast.LENGTH_SHORT).show();return;
   }
   try{
    String session=prefs.getString("last_feedback_session","");
    if(session.isEmpty())return;
    JSONObject answer=new JSONObject();
    answer.put("id","survey_"+session+"_"+feedbackPerson);
    answer.put("type","survey");answer.put("session",session);
    answer.put("who",feedbackPerson);answer.put("rating",feedbackRating);
    answer.put("liked",liked[likedChoice]);answer.put("next",next[nextChoice]);
    answer.put("date",prefs.getString("last_feedback_date",LocalDate.now().toString()));
    journal.upsert(answer);tab="feedback";draw();
   }catch(Exception e){journalError(e);}
  });
  addButton(page,"←  RETOUR AUX DEUX QUESTIONNAIRES",false,()->{tab="feedback";draw();});
 }
 void settingsBack(){tab="settings";draw();}
 void settingTile(String title,String description,String action,Runnable click){
  LinearLayout c=card(title,description);
  addButton(c,action,false,click);
 }
 // Compact premium settings rows. Every tappable item performs an action.
 LinearLayout settingsGroup(String symbol,String title,String subtitle){
  LinearLayout group=vertical();
  group.setBackground(shape(0xFF371B32,0xFF211325,19,0x995E3451));
  LinearLayout.LayoutParams gp=new LinearLayout.LayoutParams(-1,-2);
  gp.bottomMargin=dp(11);page.addView(group,gp);
  LinearLayout header=horizontal();header.setPadding(dp(11),dp(8),dp(11),dp(8));
  header.setMinimumHeight(dp(57));
  TextView glyph=text(symbol,24,PINK,true);glyph.setGravity(Gravity.CENTER);
  glyph.setBackground(shape(0xFF512341,0xFF35192F,11,0x775B3450));
  header.addView(glyph,new LinearLayout.LayoutParams(dp(39),dp(39)));
  LinearLayout names=vertical();names.setPadding(dp(10),0,0,0);
  addText(names,title,16,WHITE,true,1);
  if(subtitle!=null)addText(names,subtitle,11,MUTED,false,0);
  header.addView(names,new LinearLayout.LayoutParams(0,-2,1));
  TextView chevron=text("⌃",22,PINK,true);chevron.setGravity(Gravity.CENTER);
  header.addView(chevron,new LinearLayout.LayoutParams(dp(30),dp(38)));
  group.addView(header);
  View separator=new View(this);separator.setBackgroundColor(0x55684259);
  group.addView(separator,new LinearLayout.LayoutParams(-1,dp(1)));
  LinearLayout content=vertical();content.setPadding(dp(10),dp(2),dp(10),dp(8));
  group.addView(content);
  header.setClickable(true);header.setFocusable(true);
  header.setContentDescription(title+" : afficher ou masquer les options");
  header.setOnClickListener(v->{
   boolean shown=content.getVisibility()==View.VISIBLE;
   content.setVisibility(shown?View.GONE:View.VISIBLE);
   chevron.setText(shown?"⌄":"⌃");
   separator.setVisibility(shown?View.GONE:View.VISIBLE);
  });
  return content;
 }
 void settingsRow(LinearLayout section,String symbol,String title,String description,Runnable action){
  LinearLayout row=horizontal();row.setGravity(Gravity.CENTER_VERTICAL);
  row.setPadding(dp(3),dp(7),dp(2),dp(7));row.setMinimumHeight(dp(55));
  TextView glyph=text(symbol,20,0xFFFF93C5,true);glyph.setGravity(Gravity.CENTER);
  glyph.setBackground(shape(0xFF4B253E,0xFF311928,10,0x555B3C53));
  row.addView(glyph,new LinearLayout.LayoutParams(dp(36),dp(36)));
  LinearLayout detail=vertical();detail.setPadding(dp(10),0,dp(3),0);
  addText(detail,title,14,WHITE,true,2);
  addText(detail,description,11,MUTED,false,0);
  row.addView(detail,new LinearLayout.LayoutParams(0,-2,1));
  TextView arrow=text(action==null?"":"›",23,0xFFF5A9D1,false);
  arrow.setGravity(Gravity.CENTER);
  row.addView(arrow,new LinearLayout.LayoutParams(dp(24),dp(38)));
  section.addView(row,new LinearLayout.LayoutParams(-1,-2));
  if(action!=null){
   row.setClickable(true);row.setFocusable(true);
   row.setBackground(new RippleDrawable(ColorStateList.valueOf(0x44FF77B4),null,null));
   row.setContentDescription(title+". "+description);
   row.setOnClickListener(v->{if(!rolling)action.run();});
  }
  View line=new View(this);line.setBackgroundColor(0x445F3750);
  LinearLayout.LayoutParams lineLp=new LinearLayout.LayoutParams(-1,dp(1));
  lineLp.leftMargin=dp(46);section.addView(line,lineLp);
 }
 void openDeviceNotificationSettings(){
  try{
   Intent intent=new Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS);
   intent.putExtra(android.provider.Settings.EXTRA_APP_PACKAGE,getPackageName());
   startActivity(intent);
  }catch(Exception e){
   PremiumDialog.info(this,"Notifications","Impossible d’ouvrir les paramètres Android. Ouvrez Paramètres du téléphone, Applications, LoveRoll, Notifications.");
  }
 }
 void pushNotReady(){
  PremiumDialog.info(this,"Notifications LoveRoll",
   "Les rappels automatiques ne sont pas encore disponibles. Vos préférences ne seront pas présentées comme activées avant la configuration du service push gratuit. Aucun SMS automatique payant n’est utilisé.");
 }
 void drawSettings(){
  heading("⚙  Réglages","Compte, couple, notifications et confidentialité");

  LinearLayout account=settingsGroup("♙","Compte","Votre identité et vos connexions");
  settingsRow(account,"♙","Profil et prénom","Gérer mon nom et les informations de mon compte",()->openConnectedLoveRoll("settings:compte"));
  settingsRow(account,"▣","Connexion Google / courriel","Ouvrir mon compte connecté sans Chrome",()->openConnectedLoveRoll("settings:compte"));
  settingsRow(account,"◎","Langue","Français (Canada)",()->PremiumDialog.info(this,"Langue","LoveRoll est actuellement disponible en français (Canada)."));

  LinearLayout couple=settingsGroup("♥","Couple","Partenaire, invitations et anniversaires");
  settingsRow(couple,"♡","Mon couple et invitations","Statut, envoi SMS, Messenger ou courriel",()->openConnectedLoveRoll("settings:couple"));
  settingsRow(couple,"▦","Date du couple","Gérer notre date et nos anniversaires",()->openConnectedLoveRoll("settings:couple"));
  settingsRow(couple,"▤","Journal partagé et accès","Consulter les règles de synchronisation",()->openConnectedLoveRoll("settings:confidentialite"));

  LinearLayout alerts=settingsGroup("♧","Notifications","Rappels et autorisations");
  settingsRow(alerts,"♧","Autorisations Android","Ouvrir les notifications de LoveRoll sur le téléphone",this::openDeviceNotificationSettings);
  settingsRow(alerts,"⚄","Rappel du dé hebdomadaire","Push automatique à configurer",this::pushNotReady);
  settingsRow(alerts,"♥","Activités et événements","Push automatique à configurer",this::pushNotReady);
  settingsRow(alerts,"✉","Invitation acceptée","Push automatique à configurer",this::pushNotReady);

  LinearLayout application=settingsGroup("▦","Application","Mises à jour et affichage");
  settingsRow(application,"⌂","Écran d’accueil","LoveRoll est déjà installé comme application Android",()->
   PremiumDialog.info(this,"LoveRoll sur Android","L’APK LoveRoll est déjà installé. Vous pouvez lancer l’application depuis son icône, sans l’ajouter une deuxième fois."));
  settingsRow(application,"↻","Mises à jour de l’APK","Rechercher une version signée plus récente",()->{tab="updater";draw();});
  settingsRow(application,"◉","Apparence et thème","Thème LoveRoll bourgogne et rose",()->
   PremiumDialog.info(this,"Apparence","Thème sombre premium LoveRoll. D’autres thèmes pourront être ajoutés dans une future version."));

  LinearLayout privacy=settingsGroup("♢","Confidentialité et sécurité","Protéger votre journal et votre espace");
  settingsRow(privacy,"♢","Journal chiffré local","Sécurité et conservation des anciennes données",()->{tab="privacy";draw();});
  settingsRow(privacy,"♡","Protection du journal partagé","Accès au journal du couple connecté",()->openConnectedLoveRoll("settings:confidentialite"));
  settingsRow(privacy,"▤","Suppression des données","Gérer les données stockées sur ce téléphone",()->{tab="privacy";draw();});

  LinearLayout game=settingsGroup("⚄","Jeu et personnalisation","Règles et cartes du couple");
  settingsRow(game,"⚄","Règles des dés","Tirages, probabilités et réinitialisation",()->{tab="rules";draw();});
  settingsRow(game,"♡","Cartes et défis personnalisés","Configurer la bibliothèque du couple",()->openConnectedLoveRoll("settings:jeu"));

  LinearLayout help=settingsGroup("?","Aide","Informations et assistance");
  settingsRow(help,"?","Comment inviter mon partenaire","Guide pour SMS, Messenger et courriel",()->
   PremiumDialog.info(this,"Inviter votre partenaire",
    "Dans Réglages > Couple, choisissez Mon couple et invitations. Préparez un lien personnel, puis partagez-le par Messenger, SMS ou courriel. Votre partenaire l’ouvre sur iPhone, se connecte avec le courriel invité et accepte. L’envoi doit être confirmé dans la messagerie."));
  settingsRow(help,"♡","Compte connecté et iPhone","Comment fonctionne la synchronisation",()->
   PremiumDialog.info(this,"LoveRoll à deux",
    "Android et iPhone utilisent le même espace de couple Supabase. Vos anciennes données hors ligne restent distinctes. Utilisez l’espace connecté pour les éléments partagés."));
  settingsRow(help,"ⓘ","Version de LoveRoll","v"+BuildConfig.VERSION_NAME+" · APK Android",()->
   PremiumDialog.info(this,"LoveRoll","Version Android "+BuildConfig.VERSION_NAME+". Vérifiez les mises à jour dans Réglages > Application."));
 }
 void drawRules(){
  heading("🎲  Règles du jeu","Comment fonctionnent nos tirages");
  card("Dé hebdomadaire","1× 50 % · 2× 25 % · 3× 12 % · 4× 8 % · 5× 4 % · 6× 1 %");
  card("D6 et D20","Chacun a son D6. Pour chaque D20 : Sensuel ou Sexuel, 88 % pour le choix, 12 % pour l'autre.");
  card("Les défis ne se répètent pas","Une proposition, même passée, ne ressort pas pour la même personne pendant sa soirée.");
  card("Calendrier de l'Avent","Les 25 cases s'ouvrent uniquement à leur date en décembre.");
  section("↻  Réinitialisation");
  LinearLayout reset=card("Rebrasser le dé hebdomadaire","Efface le résultat de la semaine et la progression en cours, pas le journal intime.");
  addButton(reset,"RÉINITIALISER LA SEMAINE",false,()->PremiumDialog.confirm(this,"Réinitialiser la semaine ?",
    "Le tirage et la progression de la semaine seront remis à zéro. Le journal chiffré restera intact.",
    "RÉINITIALISER",()->{
      prefs.edit().putInt("goal",-1).putInt("done",0)
       .putBoolean("active",false).putBoolean("pending",false).putBoolean("accepted",false)
       .putInt("fred_target",-1).putInt("emilie_target",-1)
       .putInt("fred_completed",0).putInt("emilie_completed",0)
       .putLong("fred_seen",0L).putLong("emilie_seen",0L).apply();
      tab="home";draw();
    }));
  addButton(page,"←  RETOUR AUX RÉGLAGES",false,()->settingsBack());
 }
 void drawUpdater(){
  heading("↻  Mises à jour","Gardez LoveRoll à jour");
  LinearLayout c=card("✦  Recherche automatique","Une vérification est effectuée au lancement.");
  CheckBox auto=new CheckBox(this);auto.setText("Rechercher les nouvelles versions");
  auto.setTextColor(PALE);auto.setButtonTintList(ColorStateList.valueOf(PINK));
  auto.setChecked(prefs.getBoolean("auto_update",true));
  auto.setOnCheckedChangeListener((v,b)->prefs.edit().putBoolean("auto_update",b).apply());
  c.addView(auto);
  String last=prefs.getString("last_success","");
  addText(c,last.isEmpty()?"Aucune vérification enregistrée":"Dernière vérification : "+last,12,MUTED,false,4);
  addText(c,"Source : GitHub Releases · signature Android conservée.",12,MUTED,false,9);
  addButton(c,"RECHERCHER UNE MISE À JOUR",true,()->UpdateManager.check(this,false));
  addText(c,"Android demandera toujours une confirmation avant l'installation.",12,MUTED,false,0);
  addButton(page,"←  RETOUR AUX RÉGLAGES",false,()->settingsBack());
 }
 void drawPrivacy(){
  heading("🔒  Vie privée","Vos données, vos choix");
  card("Chiffré sur cet appareil","Le journal intime est enregistré avec AES-256-GCM et une clé Android Keystore, sans téléchargement sur un serveur.");
  card("Partage avec iPhone","Non disponible dans cette version. Les deux questionnaires peuvent être remplis séparément sur ce téléphone, mais les réponses ne sont pas des comptes authentifiés.");
  card("À savoir","Une sauvegarde ou désinstallation peut rendre les données locales irrécupérables. Aucune synchronisation en ligne n'est activée.");
  section("Supprimer mes données");
  LinearLayout erase=card("Effacer tout le journal intime","Supprime les relations enregistrées et les questionnaires. N'efface pas les dés, les défis ni le calendrier de l'Avent.");
  addButton(erase,"EFFACER DÉFINITIVEMENT LE JOURNAL",false,()->PremiumDialog.confirm(this,
   "Effacer toutes les données intimes ?",
   "Cette action supprimera définitivement toutes les relations et les évaluations des soirées enregistrées sur ce téléphone. Aucune copie en ligne n'existe.",
   "OUI, TOUT EFFACER",()->{
    try{journal.eraseAll();prefs.edit().remove("last_feedback_session").remove("last_feedback_date").apply();
     settingsBack();
    }catch(Exception e){journalError(e);}
   }));
  addButton(page,"←  RETOUR AUX RÉGLAGES",false,()->settingsBack());
 }
 @Override protected void onPause(){
  if(timerTask!=null)timerHandler.removeCallbacks(timerTask);
  timerTask=null;
  if(gpuDice!=null)gpuDice.onPause();
  if(gpuD20!=null)gpuD20.onPause();
  super.onPause();
 }
 @Override protected void onResume(){
  super.onResume();
  if(timerDisplay!=null)startTimerTicker();
  if(gpuDice!=null)gpuDice.onResume();
  if(gpuD20!=null)gpuD20.onResume();
 }
 @Override public void onBackPressed(){
  if(tab.equals("intimacy")){tab="journal";draw();}
  else if(tab.equals("feedback_answer")){tab="feedback";draw();}
  else if(tab.equals("occasion_detail")){tab="occasions";draw();}
  else if(tab.equals("occasions")){tab="special";draw();}
  else if(tab.equals("journal")||tab.equals("feedback")){tab="game";draw();}
  else if(tab.equals("library")||tab.equals("privacy")||tab.equals("rules")||tab.equals("updater")){
   tab="settings";draw();
  }else if(!tab.equals("home")){tab="home";draw();}
  else super.onBackPressed();
 }
}
