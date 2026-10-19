package ca.desadeux.jeu;

import android.animation.ValueAnimator;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.res.ColorStateList;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Rect;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.RippleDrawable;
import android.text.Layout;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import androidx.core.view.ViewCompat;

/** The same restrained burgundy, rose lines and serif headings as the shared UI. */
public final class PremiumDialog {
 private static final int TEXT=0xfff5dcd8,MUTED=0xffccb3bf,ROSE=0xffd58ba3;
 private PremiumDialog(){}
 private static int dp(Activity a,float n){return Math.round(a.getResources().getDisplayMetrics().density*n);}
 private static GradientDrawable background(Activity a,int start,int end,float radius,int stroke){
  GradientDrawable shape=new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{start,end});
  shape.setCornerRadius(dp(a,radius));
  if(stroke!=0)shape.setStroke(dp(a,1),stroke);
  return shape;
 }
 private static TextView label(Activity a,String value,float size,int color){
  TextView text=new TextView(a);
  text.setText(value==null?"":value);text.setTextSize(size);text.setTextColor(color);
  text.setTypeface(Typeface.create("sans-serif",Typeface.NORMAL));
  text.setIncludeFontPadding(false);text.setGravity(Gravity.CENTER);
  return text;
 }
 private static LinearLayout.LayoutParams row(Activity a,int top){
  LinearLayout.LayoutParams params=new LinearLayout.LayoutParams(-1,-2);
  params.topMargin=dp(a,top);return params;
 }
 public static void info(Activity a,String title,String message){
  open(a,title,message,"Compris",null,null,null,null,false);
 }
 public static void confirm(Activity a,String title,String message,String yes,Runnable accept){
  open(a,title,message,yes,accept,"Annuler",null,null,false);
 }
 public static void choice(Activity a,String title,String message,String yes,Runnable accept,
  String no,Runnable cancel){
  open(a,title,message,yes,accept,no,cancel,null,false);
 }
 public static void updateAvailable(Activity a,String version,Runnable download){
  open(a,"Mise à jour disponible",
   "Téléchargez la nouvelle version de LoveRoll pour profiter des dernières améliorations.",
   "Télécharger",download,"Plus tard",null,"Version "+version,true);
 }
 private static void open(Activity a,String title,String message,String yes,Runnable accept,
  String no,Runnable cancel,String badge,boolean update){
  if(a.isFinishing()||a.isDestroyed())return;
  boolean compact=visibleFrame(a).height()<=dp(a,450);
  DialogPanel popup=new DialogPanel(a);
  popup.setPadding(dp(a,22),dp(a,compact?14:24),dp(a,22),dp(a,compact?12:18));
  popup.setBackground(background(a,0xff241019,0xff120910,22,0x887d4a5b));
  ViewCompat.setAccessibilityPaneTitle(popup,title);

  LinearLayout content=new LinearLayout(a);
  content.setOrientation(LinearLayout.VERTICAL);content.setGravity(Gravity.CENTER_HORIZONTAL);
  Emblem emblem=new Emblem(a,update);
  content.addView(emblem,new LinearLayout.LayoutParams(dp(a,compact?96:116),dp(a,compact?22:32)));

  TextView headline=label(a,title,compact?22:27,TEXT);
  headline.setTypeface(Typeface.create("serif",Typeface.NORMAL));
  headline.setLineSpacing(dp(a,compact?1:2),1f);
  ViewCompat.setAccessibilityHeading(headline,true);
  content.addView(headline,row(a,compact?8:16));

  if(badge!=null){
   TextView version=label(a,badge,12,ROSE);
   version.setLetterSpacing(.035f);version.setPadding(dp(a,12),dp(a,compact?4:6),dp(a,12),dp(a,compact?4:6));
   version.setBackground(background(a,0xff28151e,0xff201119,20,0x666c3e4f));
   LinearLayout.LayoutParams versionParams=new LinearLayout.LayoutParams(-2,-2);
   versionParams.topMargin=dp(a,compact?8:12);content.addView(version,versionParams);
  }
  TextView description=label(a,message,15,MUTED);
  description.setLineSpacing(dp(a,4),1f);
  content.addView(description,row(a,compact?12:18));

  BoundedScrollView scroll=new BoundedScrollView(a);
  if(BuildConfig.DEBUG)scroll.description=description;
  scroll.setFillViewport(false);scroll.setVerticalScrollBarEnabled(false);
  scroll.setOverScrollMode(View.OVER_SCROLL_NEVER);
  scroll.addView(content,new ScrollView.LayoutParams(-1,-2));
  popup.content=scroll;popup.addView(scroll,new LinearLayout.LayoutParams(-1,-2));

  LinearLayout actions=new LinearLayout(a);actions.setOrientation(LinearLayout.VERTICAL);
  actions.setPadding(0,dp(a,compact?12:22),0,0);
  popup.actions=actions;popup.addView(actions,new LinearLayout.LayoutParams(-1,-2));
  AlertDialog dialog=new AlertDialog.Builder(a).create();
  dialog.setView(popup,0,0,0,0);
  Button primary=makeButton(a,yes,true);
  actions.addView(primary,new LinearLayout.LayoutParams(-1,-2));
  primary.setOnClickListener(v->{dialog.dismiss();if(accept!=null)accept.run();});
  if(no!=null){
   Button secondary=makeButton(a,no,false);
   actions.addView(secondary,row(a,6));
   secondary.setOnClickListener(v->{dialog.dismiss();if(cancel!=null)cancel.run();});
  }
  dialog.setOnShowListener(ignored->{
   if(dialog.getWindow()!=null){
    dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
    dialog.getWindow().setDimAmount(.66f);
    int width=Math.min(dp(a,430),Math.max(1,visibleFrame(a).width()-dp(a,36)));
    dialog.getWindow().setLayout(width,ViewGroup.LayoutParams.WRAP_CONTENT);
   }
   if(ValueAnimator.areAnimatorsEnabled()){
    popup.setAlpha(0f);popup.setTranslationY(dp(a,8));
    popup.animate().alpha(1f).translationY(0f).setDuration(180).start();
   }
  });
  dialog.show();
 }
 private static Button makeButton(Activity a,String caption,boolean primary){
  Button button=new Button(a);
  button.setText(caption);button.setAllCaps(false);button.setTextSize(15);
  button.setTextColor(primary?TEXT:MUTED);
  button.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));
  button.setIncludeFontPadding(false);button.setGravity(Gravity.CENTER);
  button.setPadding(dp(a,16),dp(a,13),dp(a,16),dp(a,13));
  button.setMinHeight(dp(a,primary?52:44));button.setMinimumHeight(dp(a,primary?52:44));
  button.setMinWidth(0);button.setMinimumWidth(0);
  button.setSingleLine(false);button.setMaxLines(2);
  button.setStateListAnimator(null);button.setBackgroundTintList(null);
  GradientDrawable face=background(a,primary?0xff9b4864:0x0010070c,
   primary?0xff64283f:0x0010070c,14,primary?0xffb97b90:0);
  GradientDrawable mask=background(a,Color.WHITE,Color.WHITE,14,0);
  button.setBackground(new RippleDrawable(ColorStateList.valueOf(0x33e8b2c0),face,mask));
  return button;
 }
 private static Rect visibleFrame(Activity activity){
  Rect frame=new Rect();activity.getWindow().getDecorView().getWindowVisibleDisplayFrame(frame);
  if(frame.width()<=0||frame.height()<=0){
   frame.set(0,0,activity.getResources().getDisplayMetrics().widthPixels,
    activity.getResources().getDisplayMetrics().heightPixels);
  }
  return frame;
 }
 /** Content can shrink to the available screen; the real buttons keep their
  * measured height, including larger accessibility text. No guessed text height. */
 private static final class DialogPanel extends LinearLayout {
  private final Activity activity;
  private BoundedScrollView content;
  private LinearLayout actions;
  DialogPanel(Activity activity){super(activity);this.activity=activity;setOrientation(VERTICAL);}
  @Override protected void onMeasure(int widthSpec,int heightSpec){
   int limit=Math.max(1,visibleFrame(activity).height()-dp(activity,40));
   if(MeasureSpec.getMode(heightSpec)!=MeasureSpec.UNSPECIFIED)
    limit=Math.min(limit,MeasureSpec.getSize(heightSpec));
   int innerWidth=Math.max(0,MeasureSpec.getSize(widthSpec)-getPaddingLeft()-getPaddingRight());
   actions.measure(MeasureSpec.makeMeasureSpec(innerWidth,MeasureSpec.EXACTLY),
    MeasureSpec.makeMeasureSpec(0,MeasureSpec.UNSPECIFIED));
   content.maximumHeight=Math.max(0,limit-getPaddingTop()-getPaddingBottom()-actions.getMeasuredHeight());
   super.onMeasure(widthSpec,MeasureSpec.makeMeasureSpec(limit,MeasureSpec.AT_MOST));
  }
 }
 private static final class BoundedScrollView extends ScrollView {
  private int maximumHeight=Integer.MAX_VALUE;
  private TextView description;
  BoundedScrollView(Activity activity){super(activity);}
  @Override protected void onMeasure(int widthSpec,int heightSpec){
   int limit=maximumHeight;
   if(MeasureSpec.getMode(heightSpec)!=MeasureSpec.UNSPECIFIED)
    limit=Math.min(limit,MeasureSpec.getSize(heightSpec));
   super.onMeasure(widthSpec,MeasureSpec.makeMeasureSpec(limit,MeasureSpec.AT_MOST));
  }
  @Override protected void onLayout(boolean changed,int left,int top,int right,int bottom){
   super.onLayout(changed,left,top,right,bottom);
   reportReadability();
  }
  @Override protected void onScrollChanged(int left,int top,int oldLeft,int oldTop){
   super.onScrollChanged(left,top,oldLeft,oldTop);
   reportReadability();
  }
  /** Debug capture evidence comes from real laid-out text, without logging
   * message contents or adding test descriptions to accessibility output. */
  private void reportReadability(){
   if(!BuildConfig.DEBUG||description==null)return;
   Layout layout=description.getLayout();Rect visible=new Rect();
   if(layout==null||!description.getLocalVisibleRect(visible))return;
   int first=-1,last=-1,count=0,padding=description.getTotalPaddingTop();
   for(int i=0;i<layout.getLineCount();i++){
    boolean hasText=!description.getText().subSequence(layout.getLineStart(i),layout.getLineEnd(i)).toString().trim().isEmpty();
    if(hasText&&layout.getLineTop(i)+padding>=visible.top&&layout.getLineBottom(i)+padding<=visible.bottom){
     if(first<0)first=i;last=i;count++;
    }
   }
   int maximum=Math.max(0,getChildAt(0).getHeight()-getHeight()+getPaddingTop()+getPaddingBottom());
   Log.i("LoveRollDialogLayout","{\"id\":"+System.identityHashCode(this)+
    ",\"scrollY\":"+getScrollY()+",\"maxScrollY\":"+maximum+
    ",\"firstFullyVisibleLine\":"+first+",\"lastFullyVisibleLine\":"+last+
    ",\"fullyVisibleLines\":"+count+",\"totalLines\":"+layout.getLineCount()+
    ",\"descriptionVisibleHeightPx\":"+visible.height()+"}");
  }
 }
 /** Vector strokes keep the icon rose on every Android emoji/font setting. */
 private static final class Emblem extends View {
  private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Path symbol=new Path();
  Emblem(Activity activity,boolean update){
   super(activity);setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
   if(update){
    symbol.moveTo(12,3);symbol.lineTo(12,15);
    symbol.moveTo(7,10);symbol.lineTo(12,15);symbol.lineTo(17,10);
    symbol.moveTo(4,16);symbol.lineTo(4,21);symbol.lineTo(20,21);symbol.lineTo(20,16);
   }else{
    symbol.moveTo(12,21);
    symbol.cubicTo(9,18,2,12,2,7);symbol.cubicTo(2,1,9,0,12,6);
    symbol.cubicTo(15,0,22,1,22,7);symbol.cubicTo(22,12,15,18,12,21);
    symbol.close();
   }
  }
  @Override protected void onDraw(Canvas canvas){
   super.onDraw(canvas);
   float side=getHeight()*.82f,left=(getWidth()-side)/2f,top=(getHeight()-side)/2f;
   paint.setColor(0x667d4a5b);paint.setStrokeWidth(getResources().getDisplayMetrics().density);
   canvas.drawLine(0,getHeight()/2f,left-side*.55f,getHeight()/2f,paint);
   canvas.drawLine(left+side*1.55f,getHeight()/2f,getWidth(),getHeight()/2f,paint);
   canvas.save();canvas.translate(left,top);canvas.scale(side/24f,side/24f);
   paint.setColor(ROSE);paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(1.3f);
   paint.setStrokeCap(Paint.Cap.ROUND);paint.setStrokeJoin(Paint.Join.ROUND);
   canvas.drawPath(symbol,paint);canvas.restore();paint.setStyle(Paint.Style.FILL);
  }
 }
}
