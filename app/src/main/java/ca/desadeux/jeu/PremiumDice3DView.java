package ca.desadeux.jeu;

import android.app.ActivityManager;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BlurMaskFilter;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.opengl.GLES20;
import android.opengl.GLUtils;
import android.opengl.GLSurfaceView;
import android.opengl.Matrix;
import android.os.SystemClock;
import android.view.MotionEvent;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.util.Random;
import javax.microedition.khronos.egl.EGLConfig;
import javax.microedition.khronos.opengles.GL10;

/**
 * Genuine GPU-rendered rounded 3D die: six opaque textured faces,
 * beveled geometry, depth-tested lighting, specular reflections,
 * finger-driven quaternion rotation and physically suggested tumbling.
 *
 * The game engine chooses the weighted result before roll(); the
 * orientation is then aligned to that EXACT physical face.
 */
public final class PremiumDice3DView extends GLSurfaceView {
 private final Engine engine;
 private float lastX,lastY,lastTime;
 private boolean touching=false;
 public PremiumDice3DView(Context context){
  super(context);
  setEGLContextClientVersion(2);
  setEGLConfigChooser(8,8,8,8,16,0);
  setPreserveEGLContextOnPause(true);
  engine=new Engine(this);
  setRenderer(engine);
  setRenderMode(RENDERMODE_WHEN_DIRTY);
  requestRender();
 }
 public static boolean supported(Context c){
  ActivityManager am=(ActivityManager)c.getSystemService(Context.ACTIVITY_SERVICE);
  return am!=null&&am.getDeviceConfigurationInfo().reqGlEsVersion>=0x20000;
 }
 public void setResult(int value){engine.setResult(value);requestRender();}
 public void roll(int value,Runnable done){engine.startRoll(value,done);setRenderMode(RENDERMODE_CONTINUOUSLY);}
 void idle(){
  post(()->{
   if(!engine.isAnimating()){
    setRenderMode(RENDERMODE_WHEN_DIRTY);
    requestRender();
   }
  });
 }
 @Override public boolean onTouchEvent(MotionEvent event){
  final float x=event.getX(),y=event.getY();
  switch(event.getActionMasked()){
   case MotionEvent.ACTION_DOWN:
    lastX=x;lastY=y;lastTime=SystemClock.uptimeMillis();
    touching=true;engine.stopManualInertia();
    return true;
   case MotionEvent.ACTION_MOVE:
    if(touching&&!engine.isRolling()){
     float dx=(x-lastX)/Math.max(1,getWidth()),dy=(y-lastY)/Math.max(1,getHeight());
     long now=SystemClock.uptimeMillis();
     float time=Math.max(12f,now-lastTime);
     engine.drag(dx,dy,time);
     lastX=x;lastY=y;lastTime=now;
     setRenderMode(RENDERMODE_CONTINUOUSLY);
    }
    return true;
   case MotionEvent.ACTION_CANCEL:
   case MotionEvent.ACTION_UP:
    touching=false;engine.release();
    performClick();
    return true;
  }
  return true;
 }
 @Override public boolean performClick(){super.performClick();return true;}

 static final class Engine implements GLSurfaceView.Renderer {
  private final PremiumDice3DView view;
  private final Object lock=new Object();
  private final Random rng=new Random();
  private static final int GRID=24;
  private static final int STRIDE=8*4;
  // Real die: opposite values always sum to seven.
  // physical outward normal +Z/-Z/+X/-X/+Y/-Y maps to 1/6/3/4/2/5.
  private static final int[] FACES={1,6,3,4,2,5};
  private static final float[] ID={1,0,0,0};
  private float[] rotation=ID.clone(),from=ID.clone(),goal=ID.clone();
  private float[] finalTarget=ID.clone();
  private volatile boolean rolling=false,manual=false;
  private volatile float spinVelocityX=0f,spinVelocityY=0f;
  private int result=1;
  private long startNs=0,lastFrameNs=0;
  private float bob=0f;
  private Runnable completed;
  private boolean finishedCallback=false;
  private int cubeProgram,bgProgram,cubeCount,texId;
  private int cubePos,cubeNormal,cubeUv,cubeMatrix,cubeNormalMatrix,cubeTexture,cubeTime;
  private int bgPosition,bgTime,bgLift;
  private FloatBuffer mesh,quad;
  private int width,height;
  private final float[] proj=new float[16],viewMat=new float[16],rotMat=new float[16];
  private final float[] model=new float[16],temp=new float[16],mv=new float[16],mvp=new float[16];

  Engine(PremiumDice3DView die){view=die;rotation=orientationFor(1);}
  boolean isRolling(){return rolling;}
  boolean isAnimating(){return rolling||manual;}
  void stopManualInertia(){
   synchronized(lock){manual=false;spinVelocityX=0;spinVelocityY=0;}
  }
  void setResult(int value){
   if(value<1||value>6)throw new IllegalArgumentException("D6 result must be 1-6");
   synchronized(lock){
    result=value;
    if(!rolling){rotation=orientationFor(value);finalTarget=rotation.clone();manual=false;}
   }
  }
  void startRoll(int value,Runnable callback){
   if(value<1||value>6)throw new IllegalArgumentException("D6 result must be 1-6");
   synchronized(lock){
    if(rolling)return;
    result=value;
    from=rotation.clone();
    finalTarget=orientationFor(value);
    goal=finalTarget.clone();
    completed=callback;
    finishedCallback=false;
    startNs=System.nanoTime();
    lastFrameNs=startNs;
    manual=false;
    rolling=true;
   }
  }
  void drag(float dx,float dy,float elapsedMs){
   synchronized(lock){
    if(rolling)return;
    // Local arcball-style yaw and pitch. A swipe is never a new roll.
    float angleY=dx*5.5f,angleX=dy*5.5f;
    rotation=normalize(mul(axisAngle(0,1,0,angleY),mul(axisAngle(1,0,0,angleX),rotation)));
    spinVelocityY=Math.max(-3.6f,Math.min(3.6f,angleY/(elapsedMs/1000f)));
    spinVelocityX=Math.max(-3.6f,Math.min(3.6f,angleX/(elapsedMs/1000f)));
   }
  }
  void release(){
   synchronized(lock){if(!rolling){manual=Math.abs(spinVelocityX)+Math.abs(spinVelocityY)>.06f;}}
   if(manual)view.setRenderMode(GLSurfaceView.RENDERMODE_CONTINUOUSLY);
   else view.requestRender();
  }
  @Override public void onSurfaceCreated(GL10 ignored,EGLConfig config){
   GLES20.glClearColor(.04f,.012f,.065f,1f);
   GLES20.glEnable(GLES20.GL_DEPTH_TEST);
   GLES20.glDepthFunc(GLES20.GL_LEQUAL);
   GLES20.glDisable(GLES20.GL_CULL_FACE);
   cubeProgram=program(CUBE_VERTEX,CUBE_FRAGMENT);
   bgProgram=program(BG_VERTEX,BG_FRAGMENT);
   cubePos=GLES20.glGetAttribLocation(cubeProgram,"aPos");
   cubeNormal=GLES20.glGetAttribLocation(cubeProgram,"aNormal");
   cubeUv=GLES20.glGetAttribLocation(cubeProgram,"aUv");
   cubeMatrix=GLES20.glGetUniformLocation(cubeProgram,"uMVP");
   cubeNormalMatrix=GLES20.glGetUniformLocation(cubeProgram,"uModel");
   cubeTexture=GLES20.glGetUniformLocation(cubeProgram,"uTex");
   cubeTime=GLES20.glGetUniformLocation(cubeProgram,"uTime");
   bgPosition=GLES20.glGetAttribLocation(bgProgram,"aPos");
   bgTime=GLES20.glGetUniformLocation(bgProgram,"uTime");
   bgLift=GLES20.glGetUniformLocation(bgProgram,"uLift");
   mesh=createMesh();
   quad=buffer(new float[]{-1,-1,1,-1,-1,1,-1,1,1,-1,1,1});
   texId=createHeartsTexture();
   GLES20.glEnable(GLES20.GL_BLEND);
   GLES20.glBlendFunc(GLES20.GL_SRC_ALPHA,GLES20.GL_ONE_MINUS_SRC_ALPHA);
  }
  @Override public void onSurfaceChanged(GL10 gl,int w,int h){
   width=w;height=h;
   GLES20.glViewport(0,0,w,h);
   Matrix.perspectiveM(proj,0,48f,(float)w/Math.max(h,1),.1f,25f);
   Matrix.setIdentityM(viewMat,0);
   Matrix.translateM(viewMat,0,0f,0f,-4.75f);
  }
  @Override public void onDrawFrame(GL10 ignored){
   long now=System.nanoTime();
   float time=now/1_000_000_000f;
   boolean shouldIdle=false;
   Runnable callback=null;
   float[] snapshot;
   synchronized(lock){
    if(rolling){
     float t=Math.min(1f,(now-startNs)/2_750_000_000f);
     // Fast irregular tumble, settling into the chosen physical face.
     float eased=1f-(float)Math.pow(1f-t,3.8);
     float angleX=(float)(Math.PI*2*5)*eased+0.13f*(float)Math.sin(17*t)*(1-t);
     float angleY=(float)(Math.PI*2*4)*eased+0.17f*(float)Math.sin(23*t)*(1-t);
     float angleZ=(float)(Math.PI*2*3)*eased;
     float[] spinning=mul(axisAngle(0,1,0,angleY),mul(axisAngle(1,0,0,angleX),axisAngle(0,0,1,angleZ)));
     float blend=(float)(t*t*(3-2*t));
     float[] base=slerp(from,goal,blend);
     rotation=normalize(mul(spinning,base));
     // Lift, land and make two small damped bounces.
     float flight=.23f*(float)Math.sin(Math.PI*Math.min(1,t/.67f));
     float bounce=t>.64f?.095f*(float)Math.abs(Math.sin((t-.64f)*22f))*((1-t)/.36f):0f;
     bob=Math.max(0,flight)+bounce;
     if(t>=1f){
      rotation=goal.clone();bob=0;rolling=false;shouldIdle=true;
      if(!finishedCallback){finishedCallback=true;callback=completed;completed=null;}
     }
    }else if(manual){
     float dt=Math.min(.05f,Math.max(.001f,(now-lastFrameNs)/1_000_000_000f));
     rotation=normalize(mul(axisAngle(0,1,0,spinVelocityY*dt),
                 mul(axisAngle(1,0,0,spinVelocityX*dt),rotation)));
     float friction=(float)Math.pow(.91f,dt*60f);
     spinVelocityX*=friction;spinVelocityY*=friction;
     if(Math.abs(spinVelocityX)+Math.abs(spinVelocityY)<.024f){
      spinVelocityX=0;spinVelocityY=0;manual=false;shouldIdle=true;
     }
    }
    lastFrameNs=now;
    snapshot=rotation.clone();
   }
   GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT|GLES20.GL_DEPTH_BUFFER_BIT);
   GLES20.glDisable(GLES20.GL_DEPTH_TEST);
   GLES20.glUseProgram(bgProgram);
   GLES20.glUniform1f(bgTime,time);
   GLES20.glUniform1f(bgLift,bob);
   quad.position(0);
   GLES20.glVertexAttribPointer(bgPosition,2,GLES20.GL_FLOAT,false,0,quad);
   GLES20.glEnableVertexAttribArray(bgPosition);
   GLES20.glDrawArrays(GLES20.GL_TRIANGLES,0,6);
   GLES20.glDisableVertexAttribArray(bgPosition);
   GLES20.glEnable(GLES20.GL_DEPTH_TEST);
   GLES20.glUseProgram(cubeProgram);
   rotationMatrix(snapshot,rotMat);
   Matrix.setIdentityM(model,0);Matrix.translateM(model,0,0f,bob,0f);
   Matrix.multiplyMM(temp,0,model,0,rotMat,0);
   Matrix.multiplyMM(mv,0,viewMat,0,temp,0);
   Matrix.multiplyMM(mvp,0,proj,0,mv,0);
   GLES20.glUniformMatrix4fv(cubeMatrix,1,false,mvp,0);
   GLES20.glUniformMatrix4fv(cubeNormalMatrix,1,false,rotMat,0);
   GLES20.glUniform1f(cubeTime,time);
   GLES20.glActiveTexture(GLES20.GL_TEXTURE0);
   GLES20.glBindTexture(GLES20.GL_TEXTURE_2D,texId);
   GLES20.glUniform1i(cubeTexture,0);
   mesh.position(0);
   GLES20.glVertexAttribPointer(cubePos,3,GLES20.GL_FLOAT,false,STRIDE,mesh);
   mesh.position(3);
   GLES20.glVertexAttribPointer(cubeNormal,3,GLES20.GL_FLOAT,false,STRIDE,mesh);
   mesh.position(6);
   GLES20.glVertexAttribPointer(cubeUv,2,GLES20.GL_FLOAT,false,STRIDE,mesh);
   GLES20.glEnableVertexAttribArray(cubePos);
   GLES20.glEnableVertexAttribArray(cubeNormal);
   GLES20.glEnableVertexAttribArray(cubeUv);
   GLES20.glDrawArrays(GLES20.GL_TRIANGLES,0,cubeCount);
   GLES20.glDisableVertexAttribArray(cubePos);
   GLES20.glDisableVertexAttribArray(cubeNormal);
   GLES20.glDisableVertexAttribArray(cubeUv);
   if(shouldIdle)view.idle();
   if(callback!=null){Runnable finalCallback=callback;view.post(finalCallback);}
  }
  private static FloatBuffer buffer(float[] array){
   FloatBuffer b=ByteBuffer.allocateDirect(array.length*4).order(ByteOrder.nativeOrder()).asFloatBuffer();
   b.put(array);b.position(0);return b;
  }
  private FloatBuffer createMesh(){
   // Surface of a box with a true rounded bevel: Minkowski sum of a smaller
   // opaque box and a sphere. Normals are derived from the bevel geometry.
   float[] data=new float[6*GRID*GRID*6*8];
   int k=0;
   final float step=2f/GRID;
   for(int face=0;face<6;face++){
    for(int j=0;j<GRID;j++)for(int i=0;i<GRID;i++){
     float u0=-1+i*step,u1=u0+step;
     float v0=-1+j*step,v1=v0+step;
     float[][] points={
      vertex(face,u0,v0),vertex(face,u1,v0),vertex(face,u0,v1),
      vertex(face,u0,v1),vertex(face,u1,v0),vertex(face,u1,v1)
     };
     for(float[] v:points)for(float f:v)data[k++]=f;
    }
   }
   cubeCount=data.length/8;
   return buffer(data);
  }
  private float[] vertex(int face,float u,float v){
   float x=0,y=0,z=0;
   switch(face){
    case 0:x=u;y=v;z=1;break; // 1
    case 1:x=-u;y=v;z=-1;break; // 6
    case 2:x=1;y=v;z=-u;break; // 3
    case 3:x=-1;y=v;z=u;break; // 4
    case 4:x=u;y=1;z=-v;break; // 2
    case 5:x=u;y=-1;z=v;break; // 5
   }
   final float inner=.81f;
   float cx=Math.max(-inner,Math.min(inner,x));
   float cy=Math.max(-inner,Math.min(inner,y));
   float cz=Math.max(-inner,Math.min(inner,z));
   float nx=x-cx,ny=y-cy,nz=z-cz;
   float len=(float)Math.sqrt(nx*nx+ny*ny+nz*nz);
   nx/=len;ny/=len;nz/=len;
   x=cx+.19f*nx;y=cy+.19f*ny;z=cz+.19f*nz;
   float tu=(u+1)*.5f,tv=(v+1)*.5f;
   // Atlas is 3 columns by 2 rows with one face pattern per tile.
   float atlasU=(face%3+tu)/3f;
   float atlasV=(face/3+tv)/2f;
   return new float[]{x,y,z,nx,ny,nz,atlasU,atlasV};
  }
  private int createHeartsTexture(){
   int cell=256;
   Bitmap bitmap=Bitmap.createBitmap(cell*3,cell*2,Bitmap.Config.ARGB_8888);
   Canvas canvas=new Canvas(bitmap);
   for(int f=0;f<6;f++){
    canvas.save();
    canvas.translate((f%3)*cell,(f/3)*cell);
    int n=FACES[f];
    float[][] marks=locations(n);
    float size=n==1?54:n<4?29:n<6?25:23;
    for(float[] point:marks)drawHeart(canvas,point[0]*cell,point[1]*cell,size);
    canvas.restore();
   }
   int[] tex=new int[1];GLES20.glGenTextures(1,tex,0);
   GLES20.glBindTexture(GLES20.GL_TEXTURE_2D,tex[0]);
   GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D,GLES20.GL_TEXTURE_MIN_FILTER,GLES20.GL_LINEAR_MIPMAP_LINEAR);
   GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D,GLES20.GL_TEXTURE_MAG_FILTER,GLES20.GL_LINEAR);
   GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D,GLES20.GL_TEXTURE_WRAP_S,GLES20.GL_CLAMP_TO_EDGE);
   GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D,GLES20.GL_TEXTURE_WRAP_T,GLES20.GL_CLAMP_TO_EDGE);
   GLUtils.texImage2D(GLES20.GL_TEXTURE_2D,0,bitmap,0);
   GLES20.glGenerateMipmap(GLES20.GL_TEXTURE_2D);
   bitmap.recycle();return tex[0];
  }
  private static float[][] locations(int n){
   switch(n){
    case 1:return new float[][]{{.5f,.5f}};
    case 2:return new float[][]{{.28f,.28f},{.72f,.72f}};
    case 3:return new float[][]{{.27f,.27f},{.5f,.5f},{.73f,.73f}};
    case 4:return new float[][]{{.27f,.27f},{.73f,.27f},{.27f,.73f},{.73f,.73f}};
    case 5:return new float[][]{{.27f,.27f},{.73f,.27f},{.5f,.5f},{.27f,.73f},{.73f,.73f}};
    default:return new float[][]{{.27f,.25f},{.73f,.25f},{.27f,.5f},{.73f,.5f},{.27f,.75f},{.73f,.75f}};
   }
  }
  private static void drawHeart(Canvas c,float cx,float cy,float r){
   Path p=new Path();
   p.moveTo(cx,cy+r*.87f);
   p.cubicTo(cx-r*1.62f,cy-r*.08f,cx-r*.90f,cy-r*1.23f,cx,cy-r*.42f);
   p.cubicTo(cx+r*.90f,cy-r*1.23f,cx+r*1.62f,cy-r*.08f,cx,cy+r*.87f);
   p.close();
   Paint paint=new Paint(3);
   paint.setStyle(Paint.Style.FILL);
   paint.setColor(Color.argb(170,255,31,133));
   paint.setMaskFilter(new BlurMaskFilter(r*.58f,BlurMaskFilter.Blur.NORMAL));
   c.drawPath(p,paint);
   paint.setMaskFilter(null);
   paint.setColor(0xFFF65AAB);c.drawPath(p,paint);
   paint.setColor(0xFFFFC9EB);
   paint.setStyle(Paint.Style.STROKE);
   paint.setStrokeWidth(Math.max(1,r*.10f));c.drawPath(p,paint);
  }
  private static int shader(int type,String source){
   int s=GLES20.glCreateShader(type);GLES20.glShaderSource(s,source);
   GLES20.glCompileShader(s);int[] status=new int[1];
   GLES20.glGetShaderiv(s,GLES20.GL_COMPILE_STATUS,status,0);
   if(status[0]==0)throw new IllegalStateException("3D shader: "+GLES20.glGetShaderInfoLog(s));
   return s;
  }
  private static int program(String vert,String frag){
   int v=shader(GLES20.GL_VERTEX_SHADER,vert),f=shader(GLES20.GL_FRAGMENT_SHADER,frag);
   int p=GLES20.glCreateProgram();GLES20.glAttachShader(p,v);GLES20.glAttachShader(p,f);
   GLES20.glLinkProgram(p);int[] status=new int[1];
   GLES20.glGetProgramiv(p,GLES20.GL_LINK_STATUS,status,0);
   if(status[0]==0)throw new IllegalStateException("3D program: "+GLES20.glGetProgramInfoLog(p));
   GLES20.glDeleteShader(v);GLES20.glDeleteShader(f);return p;
  }
  private static float[] orientationFor(int value){
   return Die3DMath.targetQuaternion(value);
  }
  private static float[] axisAngle(float x,float y,float z,float angle){
   float s=(float)Math.sin(angle*.5);
   return new float[]{(float)Math.cos(angle*.5),x*s,y*s,z*s};
  }
  private static float[] mul(float[] a,float[] b){
   return new float[]{
    a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],
    a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],
    a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],
    a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]
   };
  }
  private static float[] normalize(float[] q){
   float l=(float)Math.sqrt(q[0]*q[0]+q[1]*q[1]+q[2]*q[2]+q[3]*q[3]);
   return new float[]{q[0]/l,q[1]/l,q[2]/l,q[3]/l};
  }
  private static float[] slerp(float[] a,float[] b,float t){
   float dot=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];
   float[] end=b.clone();
   if(dot<0){dot=-dot;for(int i=0;i<4;i++)end[i]=-end[i];}
   if(dot>.9995f){
    float[] q=new float[4];for(int i=0;i<4;i++)q[i]=a[i]*(1-t)+end[i]*t;
    return normalize(q);
   }
   float theta=(float)Math.acos(Math.max(-1,Math.min(1,dot)));
   float s=(float)Math.sin(theta);
   float w1=(float)Math.sin((1-t)*theta)/s,w2=(float)Math.sin(t*theta)/s;
   return new float[]{a[0]*w1+end[0]*w2,a[1]*w1+end[1]*w2,a[2]*w1+end[2]*w2,a[3]*w1+end[3]*w2};
  }
  private static void rotationMatrix(float[] q,float[] m){
   Matrix.setIdentityM(m,0);
   float w=q[0],x=q[1],y=q[2],z=q[3];
   m[0]=1-2*(y*y+z*z);m[1]=2*(x*y+z*w);m[2]=2*(x*z-y*w);
   m[4]=2*(x*y-z*w);m[5]=1-2*(x*x+z*z);m[6]=2*(y*z+x*w);
   m[8]=2*(x*z+y*w);m[9]=2*(y*z-x*w);m[10]=1-2*(x*x+y*y);
  }
  private static final String CUBE_VERTEX=
   "uniform mat4 uMVP; uniform mat4 uModel;"+
   "attribute vec3 aPos; attribute vec3 aNormal; attribute vec2 aUv;"+
   "varying vec3 vNormal; varying vec3 vPos; varying vec2 vUv;"+
   "void main(){ vNormal=normalize((uModel*vec4(aNormal,0.)).xyz);"+
   " vPos=(uModel*vec4(aPos,1.)).xyz; vUv=aUv; gl_Position=uMVP*vec4(aPos,1.); }";
  private static final String CUBE_FRAGMENT=
   "precision mediump float; uniform sampler2D uTex; uniform float uTime;"+
   "varying vec3 vNormal; varying vec3 vPos; varying vec2 vUv;"+
   "void main(){"+
   " vec3 n=normalize(vNormal);vec3 eye=normalize(vec3(.0,.05,4.5)-vPos);"+
   " vec3 l1=normalize(vec3(-.7,.95,1.5));vec3 l2=normalize(vec3(.9,.3,1.2));"+
   " float d1=max(dot(n,l1),0.);float d2=max(dot(n,l2),0.);"+
   " float fres=pow(1.-max(dot(n,eye),0.),3.);"+
   " float spec=pow(max(dot(n,normalize(l1+eye)),0.),62.);"+
   " float spec2=pow(max(dot(n,normalize(l2+eye)),0.),105.);"+
   " vec3 base=vec3(.029,.013,.038)+vec3(.072,.025,.059)*d1+vec3(.044,.014,.050)*d2;"+
   " base+=vec3(.52,.15,.32)*fres*.68;"+
   " base+=vec3(.96,.56,.76)*spec*.66+vec3(.80,.18,.39)*spec2*.29;"+
   " vec4 logo=texture2D(uTex,vUv);"+
   " vec3 ink=vec3(1.0,.19,.55)*logo.a*1.04+logo.rgb*logo.a*.68;"+
   " gl_FragColor=vec4(min(base+ink,vec3(1.)),1.); }";
  private static final String BG_VERTEX=
   "attribute vec2 aPos; varying vec2 vUv;"+
   "void main(){vUv=aPos*.5+.5;gl_Position=vec4(aPos,0.,1.);}";
  private static final String BG_FRAGMENT=
   "precision mediump float; varying vec2 vUv; uniform float uTime;uniform float uLift;"+
   "void main(){vec2 p=vUv-.5;"+
   " float light=exp(-8.*(p.x*p.x*1.05+p.y*p.y*1.5));"+
   " float plush=sin(vUv.x*12.+sin(vUv.y*6.)*1.3)*.012;"+
   " float fold=sin(vUv.x*17.+vUv.y*11.)*.009;"+
   " vec3 bg=mix(vec3(.032,.009,.033),vec3(.12,.027,.067),vUv.y*.38+light*.5);"+
   " bg+=vec3(.10,.005,.035)*(plush+fold);"+
   " float halo=exp(-14.*(p.x*p.x+p.y*p.y*1.55));"+
   " bg+=vec3(.22,.011,.081)*halo*.32;"+
   " vec2 shadow=(vUv-vec2(.50,.255));"+
   " float radius=1.+uLift*.35;"+
   " float sh=exp(-((shadow.x*shadow.x/(.06*radius))+(shadow.y*shadow.y/(.006*radius))));"+
   " bg*=1.-.65*sh;"+
   " float rim=1.-smoothstep(.24,.71,length(p));bg*=1.-.28*(1.-rim);"+
   " gl_FragColor=vec4(bg,1.); }";
 }
}
