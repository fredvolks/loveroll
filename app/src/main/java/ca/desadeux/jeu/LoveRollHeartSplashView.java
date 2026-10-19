package ca.desadeux.jeu;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.SystemClock;
import android.util.Xml;
import android.view.View;
import androidx.core.graphics.PathParser;
import org.xmlpull.v1.XmlPullParser;
import java.io.InputStream;

/** Immediate offline first frame, sharing the exact Web artwork. Decode once,
 * animate only the glass heart and three dots; auth/session logic stays outside. */
final class LoveRollHeartSplashView extends View {
 private static final long BEAT_MS=3000L;
 private static final String CAPTION="Chargement de votre espace…";
 private final Paint brush=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);
 private final Bitmap heart,decor;
 private final RectF frame=new RectF(),sprite=new RectF();
 private final float density;
 private final SharedLettering logo,caption;
 private boolean visibleAnimation=true;
 private RadialGradient glow;
 private LinearGradient decorFade,marbleFade;

 LoveRollHeartSplashView(Context context){
  super(context);
  density=getResources().getDisplayMetrics().density;
  BitmapFactory.Options options=new BitmapFactory.Options();options.inScaled=false;
  heart=BitmapFactory.decodeResource(getResources(),R.drawable.loveroll_glass_heart,options);
  decor=BitmapFactory.decodeResource(getResources(),R.drawable.loveroll_splash_satin,options);
  logo=new SharedLettering(context,"loveroll-wordmark-v127.svg");
  caption=new SharedLettering(context,"loveroll-loading-caption-v127.svg");
  setContentDescription(CAPTION);
  setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_YES);
 }
 /** The same outlined SVGs are used by the Web loader. Parse each once so
  * neither platform chooses its own font, tracking or text baseline. */
 private static final class SharedLettering {
  final Path path;
  final float width,height;
  final int color;
  SharedLettering(Context context,String asset){
   Path outline=null;float viewWidth=0,viewHeight=0;int fill=0;
   try(InputStream input=context.getAssets().open(asset)){
    XmlPullParser xml=Xml.newPullParser();xml.setInput(input,"UTF-8");
    for(int event=xml.getEventType();event!=XmlPullParser.END_DOCUMENT;event=xml.next()){
     if(event!=XmlPullParser.START_TAG)continue;
     if("svg".equals(xml.getName())){
      String[] box=xml.getAttributeValue(null,"viewBox").trim().split("\\s+");
      if(box.length!=4||Float.parseFloat(box[0])!=0||Float.parseFloat(box[1])!=0)
       throw new IllegalArgumentException("Unsupported lettering viewport");
      viewWidth=Float.parseFloat(box[2]);viewHeight=Float.parseFloat(box[3]);
     }else if("path".equals(xml.getName())){
      if(outline!=null)throw new IllegalArgumentException("Lettering must use one shared path");
      outline=PathParser.createPathFromPathData(xml.getAttributeValue(null,"d"));
      fill=android.graphics.Color.parseColor(xml.getAttributeValue(null,"fill"));
     }
    }
    if(outline==null||viewWidth<=0||viewHeight<=0)throw new IllegalArgumentException("Incomplete lettering");
   }catch(Exception error){throw new IllegalStateException("Invalid packaged LoveRoll lettering: "+asset,error);}
   path=outline;width=viewWidth;height=viewHeight;color=fill;
  }
 }
 private void drawLettering(Canvas canvas,SharedLettering lettering,float cx,float top,float height){
  float scale=height/lettering.height;
  canvas.save();canvas.translate(cx-lettering.width*scale/2f,top);canvas.scale(scale,scale);
  brush.setShader(null);brush.setAlpha(255);brush.setColor(lettering.color);
  canvas.drawPath(lettering.path,brush);canvas.restore();
 }
 private void cover(Canvas canvas,Bitmap image,float left,float top,float width,float height,int alpha,float positionY){
  float scale=Math.max(width/image.getWidth(),height/image.getHeight());
  float bw=image.getWidth()*scale,bh=image.getHeight()*scale;
  canvas.save();canvas.clipRect(left,top,left+width,top+height);
  frame.set(left+(width-bw)/2f,top+(height-bh)*positionY,left+(width+bw)/2f,top+(height-bh)*positionY+bh);
  brush.setShader(null);brush.setAlpha(alpha);canvas.drawBitmap(image,null,frame,brush);canvas.restore();brush.setAlpha(255);
 }
 @Override protected void onSizeChanged(int w,int h,int oldw,int oldh){
  super.onSizeChanged(w,h,oldw,oldh);
  glow=new RadialGradient(w*.5f,h*.43f,Math.min(w*.4f,h*.24f),
   new int[]{0x4d7b1d35,0x007b1d35},null,Shader.TileMode.CLAMP);
  decorFade=new LinearGradient(0,h*.6f,0,h*.72f,0xff10070c,0x0010070c,Shader.TileMode.CLAMP);
  marbleFade=new LinearGradient(0,h*.9f,0,h*.94f,0xff10070c,0x0010070c,Shader.TileMode.CLAMP);
 }
 @Override protected void onDraw(Canvas canvas){
  super.onDraw(canvas);
  float w=getWidth(),h=getHeight();if(w<=0||h<=0)return;
  canvas.drawColor(0xff10070c);
  boolean landscape=w>=h;
  cover(canvas,decor,0,landscape?h*.6f:0,w,landscape?h*.4f:h,landscape?184:255,landscape?.76f:1f);
  if(landscape){cover(canvas,decor,0,h*.9f,w,h*.1f,184,1f);brush.setShader(marbleFade);canvas.drawRect(0,h*.9f,w,h*.94f,brush);brush.setShader(null);}
  if(landscape){brush.setShader(decorFade);canvas.drawRect(0,h*.6f,w,h*.72f,brush);brush.setShader(null);}
  brush.setAlpha(255);brush.setShader(glow);canvas.drawRect(0,0,w,h,brush);brush.setShader(null);
  boolean animate=visibleAnimation&&ValueAnimator.areAnimatorsEnabled();
  long now=SystemClock.uptimeMillis();
  float size=Math.min(w*.44f,Math.min(h*.23f,236*density));
  float font=Math.max(42*density,Math.min(w*.108f,62*density));
  boolean shortScreen=h/density<=450;
  if(shortScreen){size=Math.min(h*.32f,145*density);font=34*density;}
  float captionFont=Math.max(14*density,Math.min(w*.028f,16*density));
  float logoGap=(shortScreen?4:12)*density,dotsTop=(shortScreen?13:23)*density;
  float dotsBottom=(shortScreen?8:13)*density,logoHeight=font*1.15f,captionHeight=captionFont*1.5f;
  float total=size+logoGap+logoHeight+dotsTop+8*density+dotsBottom+captionHeight;
  float top=h*(landscape?.47f:.48f)-total/2f;
  float beat=animate?1f+.018f*(1f-(float)Math.cos((now%BEAT_MS)*Math.PI*2/BEAT_MS))/2f:1f;
  float cx=w*.5f,cy=top+size*.56f+(size*.5f-size*.56f)*beat;
  sprite.set(cx-size*beat/2f,cy-size*beat/2f,cx+size*beat/2f,cy+size*beat/2f);
  brush.setAlpha(255);canvas.drawBitmap(heart,null,sprite,brush);
  float logoTop=top+size+logoGap;
  drawLettering(canvas,logo,cx,logoTop,logoHeight);
  float word=font*4.2f,gap=16*density,line=Math.max(28*density,Math.min(w*.1f,58*density));
  brush.setColor(0x99d58ba3);brush.setStrokeWidth(density);
  float rule=logoTop+font*.575f;
  canvas.drawLine(cx-word/2f-gap-line,rule,cx-word/2f-gap,rule,brush);
  canvas.drawLine(cx+word/2f+gap,rule,cx+word/2f+gap+line,rule,brush);
  float dots=logoTop+logoHeight+dotsTop+4*density;
  for(int i=0;i<3;i++){
   float phase=((now+1800L-i*600L)%1800L)/1800f;
   float light=animate?.28f+.72f*Math.max(0f,1f-Math.abs(phase-.3f)/.3f):(i==1?1f:.28f);
   brush.setColor(0xffe8a0b5);brush.setAlpha(Math.round(light*255));
   canvas.drawCircle(cx+(i-1)*18*density,dots,4*density,brush);
  }
  drawLettering(canvas,caption,cx,dots+4*density+dotsBottom,captionHeight);
  if(animate&&isShown())postInvalidateDelayed(33);
 }
 void resumeHeart(){visibleAnimation=true;setAlpha(1f);setVisibility(VISIBLE);invalidate();}
 void pauseHeart(){visibleAnimation=false;}
}
