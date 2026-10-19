package ca.desadeux.jeu;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.view.MotionEvent;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Software-rendered 3D solids with real perspective projection, live animated rotation and lighting. */
public class Dice3DView extends View {
 private final Paint p=new Paint(3);
 private static final SecureRandom RANDOM=new SecureRandom();
 private static final int NEON=Color.rgb(255,76,160);
 private int sides=6, result=1;
 private float ax=0.36f,ay=-0.45f,az=0.14f,downX,downY;
 private boolean rolling=false;
 private ValueAnimator animator;
 private float[][] vertices;
 private int[][] faces;
 private String[] labels;
 private final float GOLDEN=(float)((1+Math.sqrt(5))/2);
 private static class Poly {
  float[] xs,ys; float depth,light; int index; float x,y;
 }
 public Dice3DView(Context context){super(context);setLayerType(View.LAYER_TYPE_SOFTWARE,null);setSides(6);}
 public void setSides(int n){sides=n==20?20:6;makeGeometry();faceToCamera(result);invalidate();}
 public boolean isRolling(){return rolling;}
 public void setResult(int value){
  result=Math.max(1,Math.min(sides,value));
  if(!rolling)faceToCamera(result);
  invalidate();
 }
 /**
  * Precisely align the normal of the winning physical face towards the viewer.
  * The winning face does not merely receive a different painted label.
  */
 private void faceToCamera(int value){
  int[] indices=faces[Math.max(0,Math.min(faces.length-1,value-1))];
  float x=0,y=0,z=0;
  for(int i:indices){x+=vertices[i][0];y+=vertices[i][1];z+=vertices[i][2];}
  x/=indices.length;y/=indices.length;z/=indices.length;
  float rx=(float)Math.atan2(y,z);
  float yRot=(float)(y*Math.cos(rx)-z*Math.sin(rx));
  float zRot=(float)(y*Math.sin(rx)+z*Math.cos(rx));
  float ry=(float)-Math.atan2(x,zRot);
  ax=rx+0.05f;ay=ry-0.05f;az=0.12f;
 }
 public void roll(int value,Runnable end){
  if(rolling)return;
  result=value;
  final float x0=ax,y0=ay,z0=az;
  // Compute the real target geometry before the spin.
  faceToCamera(value);
  final float landingX=ax,landingY=ay,landingZ=az;
  ax=x0;ay=y0;az=z0;
  final float twopi=(float)(2*Math.PI);
  final float x1=landingX+twopi*4;
  final float y1=landingY+twopi*5;
  final float z1=landingZ+twopi*3;
  rolling=true;animator=ValueAnimator.ofFloat(0,1);
  animator.setDuration(2650);
  animator.setInterpolator(new DecelerateInterpolator(1.6f));
  animator.addUpdateListener(a->{
   float f=(float)a.getAnimatedValue();
   ax=x0+(x1-x0)*f; ay=y0+(y1-y0)*f; az=z0+(z1-z0)*f;invalidate();
  });
  animator.addListener(new android.animation.AnimatorListenerAdapter(){
   @Override public void onAnimationEnd(android.animation.Animator animation){
    ax=landingX;ay=landingY;az=landingZ;
    rolling=false;invalidate();if(end!=null)end.run();
   }
  });
  animator.start();
 }
 private void makeGeometry(){
  if(sides==6){
   vertices=new float[][]{
    {-1,-1,-1},{1,-1,-1},{1,1,-1},{-1,1,-1},
    {-1,-1,1},{1,-1,1},{1,1,1},{-1,1,1}
   };
   faces=new int[][]{
    {4,5,6,7},{1,0,3,2},{5,1,2,6},{0,4,7,3},{7,6,2,3},{0,1,5,4}
   };
  }else{
   float t=GOLDEN;
   vertices=new float[][]{
     {-1,t,0},{1,t,0},{-1,-t,0},{1,-t,0},
     {0,-1,t},{0,1,t},{0,-1,-t},{0,1,-t},
     {t,0,-1},{t,0,1},{-t,0,-1},{-t,0,1}
   };
   faces=new int[][]{
     {0,11,5},{0,5,1},{0,1,7},{0,7,10},{0,10,11},
     {1,5,9},{5,11,4},{11,10,2},{10,7,6},{7,1,8},
     {3,9,4},{3,4,2},{3,2,6},{3,6,8},{3,8,9},
     {4,9,5},{2,4,11},{6,2,10},{8,6,7},{9,8,1}
   };
  }
 }
 float[] rotate(float[] v){
  float x=v[0],y=v[1],z=v[2];
  float c=(float)Math.cos(ax),s=(float)Math.sin(ax);
  float yy=y*c-z*s,zz=y*s+z*c;y=yy;z=zz;
  c=(float)Math.cos(ay);s=(float)Math.sin(ay);
  float xx=x*c+z*s;zz=-x*s+z*c;x=xx;z=zz;
  c=(float)Math.cos(az);s=(float)Math.sin(az);
  xx=x*c-y*s;yy=x*s+y*c;return new float[]{xx,yy,z};
 }
 @Override protected void onDraw(Canvas canvas){
  super.onDraw(canvas);
  float w=getWidth(),h=getHeight();
  if(w<1||h<1)return;
  float cx=w/2,cy=h/2,unit=Math.min(w,h)*(sides==6?.24f:.20f);
  p.reset();p.setAntiAlias(true);
  p.setShader(new RadialGradient(cx,cy,Math.min(w,h)*.48f,
    new int[]{0x664C1738,0x303E102D,0x00000000},null,Shader.TileMode.CLAMP));
  canvas.drawCircle(cx,cy,Math.min(w,h)*.48f,p);p.setShader(null);
  // luminous movement halo
  p.setStyle(Paint.Style.STROKE);
  p.setStrokeWidth(unit*.018f);p.setColor(0x88FF68AC);
  canvas.save();canvas.rotate(-19,cx,cy);canvas.drawOval(cx-unit*1.58f,cy-unit*.66f,cx+unit*1.58f,cy+unit*.66f,p);canvas.restore();
  p.setStrokeWidth(unit*.035f);p.setColor(0x3BFF4DA0);
  canvas.save();canvas.rotate(-19,cx,cy);canvas.drawOval(cx-unit*1.61f,cy-unit*.69f,cx+unit*1.61f,cy+unit*.69f,p);canvas.restore();
  p.setStyle(Paint.Style.FILL);
  // perspective projection of actual 3D vertices
  float[][] pts=new float[vertices.length][3];
  for(int i=0;i<vertices.length;i++){
   float[] v=rotate(vertices[i]);
   float perspective=3.8f/(3.8f-v[2]*.24f);
   pts[i]=new float[]{cx+v[0]*unit*perspective,cy-v[1]*unit*perspective,v[2]};
  }
  List<Poly> polys=new ArrayList<>();
  for(int j=0;j<faces.length;j++){
   int[] f=faces[j];Poly poly=new Poly();poly.index=j;
   poly.xs=new float[f.length];poly.ys=new float[f.length];
   float avg=0,sx=0,sy=0;
   for(int k=0;k<f.length;k++){
    float[] v=pts[f[k]];poly.xs[k]=v[0];poly.ys[k]=v[1];
    avg+=v[2];sx+=v[0];sy+=v[1];
   }
   poly.depth=avg/f.length;poly.x=sx/f.length;poly.y=sy/f.length;
   float[] a=rotate(vertices[f[0]]),b=rotate(vertices[f[1]]),c=rotate(vertices[f[2]]);
   float ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2];
   float vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
   float nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
   float norm=(float)Math.sqrt(nx*nx+ny*ny+nz*nz);
   if(norm>.0001f){nx/=norm;ny/=norm;nz/=norm;}
   float vxcenter=(a[0]+b[0]+c[0])/3;
   float vycenter=(a[1]+b[1]+c[1])/3;
   float vzcenter=(a[2]+b[2]+c[2])/3;
   if(nx*vxcenter+ny*vycenter+nz*vzcenter<0){nx=-nx;ny=-ny;nz=-nz;}
   poly.light=Math.max(0.05f,Math.min(1f,.36f+.5f*(nx*-.4f+ny*.60f+nz*.65f)));
   polys.add(poly);
  }
  polys.sort(Comparator.comparingDouble(a->a.depth));
  Poly front=polys.get(polys.size()-1);
  for(Poly face:polys){
   Path path=new Path();path.moveTo(face.xs[0],face.ys[0]);
   for(int i=1;i<face.xs.length;i++)path.lineTo(face.xs[i],face.ys[i]);
   path.close();
   int c1=Color.rgb((int)(22+face.light*29),(int)(14+face.light*17),(int)(29+face.light*29));
   int c2=Color.rgb((int)(60+face.light*88),(int)(28+face.light*46),(int)(60+face.light*69));
   p.setStyle(Paint.Style.FILL);
   p.setShader(new LinearGradient(face.x,face.y-unit,face.x,face.y+unit,c2,c1,Shader.TileMode.CLAMP));
   canvas.drawPath(path,p);p.setShader(null);
   p.setColor(!rolling&&face.index==result-1?0xFFFFBADB:0xBBEFA0C5);
   p.setStyle(Paint.Style.STROKE);
   p.setStrokeWidth(!rolling&&face.index==result-1?unit*.026f:unit*.012f);
   p.setShadowLayer(unit*.04f,0,0,0xBBFF368C);
   canvas.drawPath(path,p);p.clearShadowLayer();
   p.setStyle(Paint.Style.FILL);
   // Only visible/front-facing faces have readable labels.
   if(face.depth<-.1f)continue;
   int label=face.index+1;
   if(sides==6){
    drawPips(canvas,face,label,unit);
   }else{
    float size=unit*.27f;
    p.setTextSize(size);p.setTypeface(Typeface.create("sans-serif-black",Typeface.BOLD));
    p.setTextAlign(Paint.Align.CENTER);p.setColor(Color.rgb(255,231,241));
    p.setShadowLayer(unit*.065f,0,0,NEON);
    canvas.drawText(String.valueOf(label),face.x,face.y+size*.36f,p);
    p.clearShadowLayer();
   }
  }
  if(rolling){
   p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(unit*.019f);
   p.setColor(0x55FF6BAB);canvas.drawCircle(cx,cy,unit*1.48f,p);p.setStyle(Paint.Style.FILL);
  }
 }
 private void pip(Canvas canvas,Poly face,float u,float v,float radius){
  // Bilinear interpolation keeps pips glued to each quadrilateral face.
  float x=(1-u)*(1-v)*face.xs[0]+u*(1-v)*face.xs[1]+u*v*face.xs[2]+(1-u)*v*face.xs[3];
  float y=(1-u)*(1-v)*face.ys[0]+u*(1-v)*face.ys[1]+u*v*face.ys[2]+(1-u)*v*face.ys[3];
  p.setStyle(Paint.Style.FILL);
  p.setColor(0xFFFFEAF3);
  p.setShadowLayer(radius*.55f,0,0,0xFFFF68A8);
  canvas.drawCircle(x,y,radius,p);
  p.clearShadowLayer();
 }
 private void drawPips(Canvas canvas,Poly face,int value,float unit){
  float r=unit*.083f;
  if(value%2==1)pip(canvas,face,.5f,.5f,r);
  if(value>=2){
   pip(canvas,face,.26f,.26f,r);
   pip(canvas,face,.74f,.74f,r);
  }
  if(value>=4){
   pip(canvas,face,.74f,.26f,r);
   pip(canvas,face,.26f,.74f,r);
  }
  if(value==6){
   pip(canvas,face,.26f,.50f,r);
   pip(canvas,face,.74f,.50f,r);
  }
 }
 @Override public boolean onTouchEvent(MotionEvent e){
  switch(e.getActionMasked()){
   case MotionEvent.ACTION_DOWN:downX=e.getX();downY=e.getY();return true;
   case MotionEvent.ACTION_MOVE:
    if(!rolling){ay+=(e.getX()-downX)*.008f;ax+=(e.getY()-downY)*.008f;invalidate();}
    downX=e.getX();downY=e.getY();return true;
   case MotionEvent.ACTION_UP:
    if(!rolling)faceToCamera(result);
    invalidate();performClick();return true;
  }return super.onTouchEvent(e);
 }
 @Override public boolean performClick(){super.performClick();return true;}
}
