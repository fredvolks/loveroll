package ca.desadeux.jeu;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.view.View;

/** Lightweight outlined illustrations for LoveRoll's premium native landing. No emoji fonts. */
public final class LoveRollWelcomeIcon extends View {
 private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
 private final int icon;
 public LoveRollWelcomeIcon(Context c,int type){super(c);icon=type;setLayerType(View.LAYER_TYPE_SOFTWARE,null);}
 private void stroke(int color,float width){
  p.reset();p.setAntiAlias(true);p.setColor(color);p.setStyle(Paint.Style.STROKE);
  p.setStrokeWidth(width);p.setStrokeCap(Paint.Cap.ROUND);p.setStrokeJoin(Paint.Join.ROUND);
 }
 private void heart(Canvas c,float x,float y,float scale){
  Path h=new Path();h.moveTo(x,y+scale*.84f);
  h.cubicTo(x-scale*1.25f,y+scale*.16f,x-scale*.95f,y-scale*.69f,x,y-scale*.24f);
  h.cubicTo(x+scale*.95f,y-scale*.69f,x+scale*1.25f,y+scale*.16f,x,y+scale*.84f);
  c.drawPath(h,p);
 }
 @Override protected void onDraw(Canvas canvas){
  super.onDraw(canvas);
  int pink=0xFFFF7FB5;
  float size=Math.min(getWidth(),getHeight()),scale=size/48f;
  canvas.save();canvas.translate((getWidth()-48*scale)/2,(getHeight()-48*scale)/2);
  canvas.scale(scale,scale);
  stroke(0x44FA56A4,7);canvas.drawCircle(24,24,18,p);
  stroke(pink,2.1f);
  if(icon==0){ // two dice
   canvas.drawRoundRect(new RectF(6,15,30,39),5,5,p);
   canvas.drawRoundRect(new RectF(19,7,42,30),5,5,p);
   canvas.drawCircle(13,24,2.3f,p);canvas.drawCircle(22,31,2.3f,p);
   heart(canvas,31,17,4.0f);
  }else if(icon==1){heart(canvas,19,23,12);heart(canvas,29,23,12);
  }else if(icon==2){
   canvas.drawRoundRect(new RectF(7,12,41,41),5,5,p);
   canvas.drawLine(7,21,41,21,p);canvas.drawLine(16,8,16,15,p);canvas.drawLine(32,8,32,15,p);
   heart(canvas,24,29,6);
  }else if(icon==3){
   canvas.drawRoundRect(new RectF(11,22,37,42),5,5,p);
   canvas.drawArc(new RectF(16,7,32,32),180,180,false,p);
   heart(canvas,24,30,5);
  }else if(icon==4){ // flame
   Path flame=new Path();flame.moveTo(24,42);flame.cubicTo(6,38,6,22,23,6);
   flame.cubicTo(20,20,38,17,31,11);flame.cubicTo(48,29,40,41,24,42);canvas.drawPath(flame,p);
  }else if(icon==5){heart(canvas,24,24,16);
  }else if(icon==6){
   canvas.drawCircle(24,24,17,p);canvas.drawLine(24,12,24,24,p);canvas.drawLine(24,24,33,29,p);
  }else{
   canvas.drawRoundRect(new RectF(8,8,40,40),10,10,p);heart(canvas,24,24,11);
  }
  canvas.restore();
 }
}
