package ca.desadeux.jeu;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.opengl.GLES20;
import android.opengl.GLUtils;
import android.opengl.GLSurfaceView;
import android.opengl.Matrix;
import android.os.SystemClock;
import android.view.MotionEvent;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import javax.microedition.khronos.egl.EGLConfig;
import javax.microedition.khronos.opengles.GL10;

/** Actual twenty-faced solid icosahedron rendered by the Android GPU (OpenGL ES 2). */
public final class PremiumD20View extends GLSurfaceView {
 private final Renderer20 renderer;
 private float touchX,touchY;
 public PremiumD20View(Context c){
  super(c);setEGLContextClientVersion(2);setEGLConfigChooser(8,8,8,8,16,0);
  setPreserveEGLContextOnPause(true);
  renderer=new Renderer20(this);
  setRenderer(renderer);setRenderMode(RENDERMODE_WHEN_DIRTY);
  requestRender();
 }
 public void setResult(int face){renderer.setResult(face);requestRender();}
 public void roll(int face,Runnable callback){
  renderer.roll(face,callback);setRenderMode(RENDERMODE_CONTINUOUSLY);
 }
 public boolean isRolling(){return renderer.rolling;}
 void settle(){post(()->{
  if(!renderer.rolling&&!renderer.inertia){
   setRenderMode(RENDERMODE_WHEN_DIRTY);requestRender();
  }
 });}
 @Override public boolean onTouchEvent(MotionEvent e){
  switch(e.getActionMasked()){
   case MotionEvent.ACTION_DOWN:
    touchX=e.getX();touchY=e.getY();renderer.stopInertia();return true;
   case MotionEvent.ACTION_MOVE:
    if(!renderer.rolling){
     renderer.drag((e.getX()-touchX)/Math.max(1,getWidth()),
       (e.getY()-touchY)/Math.max(1,getHeight()));
     setRenderMode(RENDERMODE_CONTINUOUSLY);
    }
    touchX=e.getX();touchY=e.getY();return true;
   case MotionEvent.ACTION_UP:
    renderer.release();performClick();return true;
   case MotionEvent.ACTION_CANCEL:
    renderer.release();return true;
  }
  return true;
 }
 @Override public boolean performClick(){super.performClick();return true;}

 static final class Renderer20 implements Renderer {
  private final PremiumD20View host;
  private static final int STRIDE=11*4,ATLAS=1024,CELL=192;
  private static final float TAU=(float)(2*Math.PI);
  private final Object lock=new Object();
  volatile boolean rolling=false,inertia=false;
  private float[] current=D20Math.orientation(1),from=current.clone(),to=current.clone();
  private float velX,velY;
  private long started,lastTick;
  private float bounce=0;
  private Runnable onFinish;
  private int program,backgroundProgram,texture,count;
  private int ap,an,auv,ab,umvp,urot,utext,uglow,bgp,bgtime;
  private FloatBuffer geometry,quad;
  private int width,height;
  private final float[] projection=new float[16],camera=new float[16],model=new float[16];
  private final float[] quatMatrix=new float[16],temp=new float[16],mv=new float[16],mvp=new float[16];
  Renderer20(PremiumD20View view){host=view;}
  void setResult(int face){
   if(face<1||face>20)throw new IllegalArgumentException("Invalid D20 face");
   synchronized(lock){if(!rolling){current=D20Math.orientation(face);inertia=false;}}
  }
  void roll(int face,Runnable finished){
   if(face<1||face>20)throw new IllegalArgumentException("Invalid D20 face");
   synchronized(lock){
    if(rolling)return;
    from=current.clone();to=D20Math.orientation(face);
    onFinish=finished;rolling=true;inertia=false;started=System.nanoTime();lastTick=started;
   }
  }
  void stopInertia(){synchronized(lock){inertia=false;velX=velY=0;}}
  void drag(float dx,float dy){
   synchronized(lock){
    if(rolling)return;
    velX=Math.max(-.14f,Math.min(.14f,dy*5.2f));
    velY=Math.max(-.14f,Math.min(.14f,dx*5.2f));
    current=D20Math.normalize(D20Math.mul(D20Math.axis(0,1,0,velY),
       D20Math.mul(D20Math.axis(1,0,0,velX),current)));
   }
  }
  void release(){synchronized(lock){if(!rolling)inertia=Math.abs(velX)+Math.abs(velY)>.005f;}}
  @Override public void onSurfaceCreated(GL10 unused,EGLConfig config){
   GLES20.glEnable(GLES20.GL_DEPTH_TEST);
   GLES20.glDepthFunc(GLES20.GL_LEQUAL);
   GLES20.glDisable(GLES20.GL_CULL_FACE);
   GLES20.glClearColor(.055f,.012f,.062f,1f);
   program=makeProgram(VERTEX,FRAGMENT);
   backgroundProgram=makeProgram(BGV,BGF);
   ap=GLES20.glGetAttribLocation(program,"aPos");
   an=GLES20.glGetAttribLocation(program,"aNormal");
   auv=GLES20.glGetAttribLocation(program,"aUV");
   ab=GLES20.glGetAttribLocation(program,"aBary");
   umvp=GLES20.glGetUniformLocation(program,"uMVP");
   urot=GLES20.glGetUniformLocation(program,"uRot");
   utext=GLES20.glGetUniformLocation(program,"uTexture");
   uglow=GLES20.glGetUniformLocation(program,"uGlow");
   bgp=GLES20.glGetAttribLocation(backgroundProgram,"aP");
   bgtime=GLES20.glGetUniformLocation(backgroundProgram,"uT");
   geometry=mesh();quad=buffer(new float[]{-1,-1,1,-1,-1,1,-1,1,1,-1,1,1});
   texture=atlas();
  }
  @Override public void onSurfaceChanged(GL10 unused,int w,int h){
   width=w;height=h;GLES20.glViewport(0,0,w,h);
   Matrix.perspectiveM(projection,0,46,(float)w/Math.max(1,h),.1f,20f);
   Matrix.setIdentityM(camera,0);Matrix.translateM(camera,0,0,0,-4.4f);
  }
  @Override public void onDrawFrame(GL10 unused){
   long now=System.nanoTime();float tSeconds=now*1e-9f;
   Runnable callback=null;boolean idle=false;float[] quaternion;
   synchronized(lock){
    if(rolling){
     float t=Math.min(1f,(now-started)/2_600_000_000f);
     float ease=1f-(float)Math.pow(1-t,3.5);
     float[] twirl=D20Math.mul(D20Math.axis(0,1,0,TAU*5*ease),
        D20Math.mul(D20Math.axis(1,0,0,TAU*4*ease),
        D20Math.axis(0,0,1,TAU*2*ease)));
     float[] body=slerp(from,to,t*t*(3-2*t));
     current=D20Math.normalize(D20Math.mul(twirl,body));
     bounce=.28f*(float)Math.sin(Math.PI*Math.min(1f,t/.66f));
     if(t>.68f)bounce+=.09f*(float)Math.abs(Math.sin((t-.68f)*25f))*((1-t)/.32f);
     bounce=Math.max(0,bounce);
     if(t>=1f){
      current=to.clone();bounce=0;rolling=false;idle=true;
      callback=onFinish;onFinish=null;
     }
    }else if(inertia){
     current=D20Math.normalize(D20Math.mul(D20Math.axis(0,1,0,velY),
        D20Math.mul(D20Math.axis(1,0,0,velX),current)));
     velX*=.89f;velY*=.89f;
     if(Math.abs(velX)+Math.abs(velY)<.002f){inertia=false;idle=true;}
    }
    quaternion=current.clone();lastTick=now;
   }
   GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT|GLES20.GL_DEPTH_BUFFER_BIT);
   GLES20.glDisable(GLES20.GL_DEPTH_TEST);
   GLES20.glUseProgram(backgroundProgram);
   GLES20.glUniform1f(bgtime,tSeconds);
   quad.position(0);
   GLES20.glVertexAttribPointer(bgp,2,GLES20.GL_FLOAT,false,0,quad);
   GLES20.glEnableVertexAttribArray(bgp);
   GLES20.glDrawArrays(GLES20.GL_TRIANGLES,0,6);
   GLES20.glDisableVertexAttribArray(bgp);
   GLES20.glEnable(GLES20.GL_DEPTH_TEST);
   GLES20.glUseProgram(program);
   quaternionMatrix(quaternion,quatMatrix);
   Matrix.setIdentityM(model,0);Matrix.translateM(model,0,0,bounce,0);
   Matrix.multiplyMM(temp,0,model,0,quatMatrix,0);
   Matrix.multiplyMM(mv,0,camera,0,temp,0);
   Matrix.multiplyMM(mvp,0,projection,0,mv,0);
   GLES20.glUniformMatrix4fv(umvp,1,false,mvp,0);
   GLES20.glUniformMatrix4fv(urot,1,false,quatMatrix,0);
   GLES20.glUniform1f(uglow,rolling?1.12f:1f);
   GLES20.glActiveTexture(GLES20.GL_TEXTURE0);
   GLES20.glBindTexture(GLES20.GL_TEXTURE_2D,texture);
   GLES20.glUniform1i(utext,0);
   geometry.position(0);GLES20.glVertexAttribPointer(ap,3,GLES20.GL_FLOAT,false,STRIDE,geometry);
   geometry.position(3);GLES20.glVertexAttribPointer(an,3,GLES20.GL_FLOAT,false,STRIDE,geometry);
   geometry.position(6);GLES20.glVertexAttribPointer(auv,2,GLES20.GL_FLOAT,false,STRIDE,geometry);
   geometry.position(8);GLES20.glVertexAttribPointer(ab,3,GLES20.GL_FLOAT,false,STRIDE,geometry);
   GLES20.glEnableVertexAttribArray(ap);GLES20.glEnableVertexAttribArray(an);
   GLES20.glEnableVertexAttribArray(auv);GLES20.glEnableVertexAttribArray(ab);
   GLES20.glDrawArrays(GLES20.GL_TRIANGLES,0,count);
   GLES20.glDisableVertexAttribArray(ap);GLES20.glDisableVertexAttribArray(an);
   GLES20.glDisableVertexAttribArray(auv);GLES20.glDisableVertexAttribArray(ab);
   if(idle)host.settle();
   if(callback!=null)host.post(callback);
  }
  private FloatBuffer mesh(){
   float[] numbers=new float[20*3*11];int p=0;
   float[][] bary={{1,0,0},{0,1,0},{0,0,1}};
   float[][] tuv={{.50f,.075f},{.08f,.91f},{.92f,.91f}};
   for(int face=1;face<=20;face++){
    int[] ind=D20Math.F[face-1];
    float[] normal=D20Math.normal(face);
    for(int k=0;k<3;k++){
     float[] v=D20Math.unit(D20Math.V[ind[k]]);
     numbers[p++]=v[0]*1.23f;numbers[p++]=v[1]*1.23f;numbers[p++]=v[2]*1.23f;
     numbers[p++]=normal[0];numbers[p++]=normal[1];numbers[p++]=normal[2];
     numbers[p++]=((face-1)%5*CELL +CELL*tuv[k][0])/ATLAS;
     numbers[p++]=((face-1)/5*CELL +CELL*tuv[k][1])/ATLAS;
     for(float c:bary[k])numbers[p++]=c;
    }
   }
   count=numbers.length/11;
   return buffer(numbers);
  }
  private int atlas(){
   Bitmap bmp=Bitmap.createBitmap(ATLAS,ATLAS,Bitmap.Config.ARGB_8888);
   Canvas canvas=new Canvas(bmp);Paint paint=new Paint(3);
   paint.setTypeface(Typeface.create("sans-serif-black",Typeface.BOLD));
   paint.setTextAlign(Paint.Align.CENTER);
   for(int f=0;f<20;f++){
    float left=f%5*CELL,top=f/5*CELL;
    float x=left+CELL*.50f,y=top+CELL*.65f;
    int value=f+1;
    paint.setTextSize(value>=10?49:61);
    paint.setStyle(Paint.Style.FILL);
    paint.setColor(0xFFFE93C8);
    paint.setShadowLayer(14,0,0,0xFFFF268A);
    canvas.drawText(Integer.toString(value),x,y,paint);
    paint.clearShadowLayer();
    paint.setColor(Color.WHITE);
    paint.setTextSize(value>=10?45:56);
    canvas.drawText(Integer.toString(value),x,y,paint);
   }
   int[] id=new int[1];GLES20.glGenTextures(1,id,0);
   GLES20.glBindTexture(GLES20.GL_TEXTURE_2D,id[0]);
   GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D,GLES20.GL_TEXTURE_MIN_FILTER,GLES20.GL_LINEAR);
   GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D,GLES20.GL_TEXTURE_MAG_FILTER,GLES20.GL_LINEAR);
   GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D,GLES20.GL_TEXTURE_WRAP_S,GLES20.GL_CLAMP_TO_EDGE);
   GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D,GLES20.GL_TEXTURE_WRAP_T,GLES20.GL_CLAMP_TO_EDGE);
   GLUtils.texImage2D(GLES20.GL_TEXTURE_2D,0,bmp,0);
   bmp.recycle();return id[0];
  }
  private static FloatBuffer buffer(float[] a){
   FloatBuffer b=ByteBuffer.allocateDirect(a.length*4).order(ByteOrder.nativeOrder()).asFloatBuffer();
   b.put(a);b.position(0);return b;
  }
  private static float[] slerp(float[] a,float[] b,float t){
   float dot=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];
   float[] end=b.clone();
   if(dot<0){dot=-dot;for(int i=0;i<4;i++)end[i]=-end[i];}
   if(dot>.9995f){
    float[] q=new float[4];for(int i=0;i<4;i++)q[i]=a[i]*(1-t)+end[i]*t;
    return D20Math.normalize(q);
   }
   float angle=(float)Math.acos(Math.max(-1,Math.min(1,dot)));
   float z=(float)Math.sin(angle);
   float wa=(float)Math.sin((1-t)*angle)/z,wb=(float)Math.sin(t*angle)/z;
   return new float[]{a[0]*wa+end[0]*wb,a[1]*wa+end[1]*wb,a[2]*wa+end[2]*wb,a[3]*wa+end[3]*wb};
  }
  private static void quaternionMatrix(float[] q,float[] m){
   Matrix.setIdentityM(m,0);
   float w=q[0],x=q[1],y=q[2],z=q[3];
   m[0]=1-2*(y*y+z*z);m[1]=2*(x*y+z*w);m[2]=2*(x*z-y*w);
   m[4]=2*(x*y-z*w);m[5]=1-2*(x*x+z*z);m[6]=2*(y*z+x*w);
   m[8]=2*(x*z+y*w);m[9]=2*(y*z-x*w);m[10]=1-2*(x*x+y*y);
  }
  private static int shader(int type,String source){
   int id=GLES20.glCreateShader(type);
   GLES20.glShaderSource(id,source);GLES20.glCompileShader(id);
   int[] ok=new int[1];GLES20.glGetShaderiv(id,GLES20.GL_COMPILE_STATUS,ok,0);
   if(ok[0]==0)throw new IllegalStateException("D20 shader: "+GLES20.glGetShaderInfoLog(id));
   return id;
  }
  private static int makeProgram(String v,String f){
   int vs=shader(GLES20.GL_VERTEX_SHADER,v),fs=shader(GLES20.GL_FRAGMENT_SHADER,f);
   int p=GLES20.glCreateProgram();GLES20.glAttachShader(p,vs);GLES20.glAttachShader(p,fs);
   GLES20.glLinkProgram(p);int[] ok=new int[1];
   GLES20.glGetProgramiv(p,GLES20.GL_LINK_STATUS,ok,0);
   if(ok[0]==0)throw new IllegalStateException("D20 program: "+GLES20.glGetProgramInfoLog(p));
   GLES20.glDeleteShader(vs);GLES20.glDeleteShader(fs);return p;
  }
  private static final String VERTEX=
   "uniform mat4 uMVP;uniform mat4 uRot;"+
   "attribute vec3 aPos;attribute vec3 aNormal;attribute vec2 aUV;attribute vec3 aBary;"+
   "varying vec3 vN;varying vec3 vBary;varying vec2 vUV;varying vec3 vPos;"+
   "void main(){vN=normalize((uRot*vec4(aNormal,0.)).xyz);"+
   "vPos=(uRot*vec4(aPos,1.)).xyz;vBary=aBary;vUV=aUV;gl_Position=uMVP*vec4(aPos,1.);}";
  private static final String FRAGMENT=
   "precision mediump float;uniform sampler2D uTexture;uniform float uGlow;"+
   "varying vec3 vN;varying vec3 vBary;varying vec2 vUV;varying vec3 vPos;"+
   "void main(){"+
   "vec3 n=normalize(vN);vec3 eye=normalize(vec3(0.,0.,4.)-vPos);"+
   "vec3 l=normalize(vec3(-.6,1.,1.4));"+
   "float diff=max(dot(n,l),0.);"+
   "float spec=pow(max(dot(n,normalize(l+eye)),0.),58.);"+
   "float fres=pow(1.-max(dot(n,eye),0.),2.6);"+
   "float e=min(vBary.x,min(vBary.y,vBary.z));"+
   "float line=1.-smoothstep(.008,.050,e);"+
   "float halo=1.-smoothstep(.006,.12,e);"+
   "vec3 resin=vec3(.027,.012,.038)+vec3(.115,.034,.081)*diff;"+
   "resin+=vec3(.78,.28,.51)*spec*.74+vec3(.34,.045,.18)*fres;"+
   "resin+=vec3(.95,.05,.36)*line*.66*uGlow+vec3(.38,.015,.13)*halo*.27;"+
   "vec4 number=texture2D(uTexture,vUV);"+
   "resin=mix(resin,number.rgb,number.a*.96);"+
   "gl_FragColor=vec4(min(resin,vec3(1.)),1.);}";
  private static final String BGV=
   "attribute vec2 aP;varying vec2 vP;void main(){vP=aP;gl_Position=vec4(aP,0.,1.);}";
  private static final String BGF=
   "precision mediump float;uniform float uT;varying vec2 vP;"+
   "void main(){float r=dot(vP,vP);float aura=exp(-3.6*r);"+
   "vec3 base=vec3(.044,.012,.057)+vec3(.095,.017,.060)*aura;"+
   "float shadow=exp(-((vP.x*vP.x)*8.+(vP.y+.62)*(vP.y+.62)*70.));"+
   "base*=1.-.55*shadow;gl_FragColor=vec4(base,1.);}";
 }
}
