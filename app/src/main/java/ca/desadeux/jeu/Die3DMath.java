package ca.desadeux.jeu;

/**
 * Pure-Java geometry contract shared by the OpenGL renderer and unit tests.
 * Standard D6 opposite face pairs: 1/6, 2/5, 3/4.
 */
public final class Die3DMath {
 private Die3DMath(){}
 public static int opposite(int face){
  check(face);return 7-face;
 }
 public static float[] normal(int face){
  switch(face){
   case 1:return new float[]{0,0,1};
   case 2:return new float[]{0,1,0};
   case 3:return new float[]{1,0,0};
   case 4:return new float[]{-1,0,0};
   case 5:return new float[]{0,-1,0};
   default:return new float[]{0,0,-1};
  }
 }
 private static void check(int face){
  if(face<1||face>6)throw new IllegalArgumentException("D6 result must be 1..6");
 }
 public static float[] targetQuaternion(int face){
  check(face);
  float[] q;
  switch(face){
   case 1:q=new float[]{1,0,0,0};break;
   case 2:q=axisAngle(1,0,0,(float)(Math.PI*.5));break;
   case 3:q=axisAngle(0,1,0,(float)(-Math.PI*.5));break;
   case 4:q=axisAngle(0,1,0,(float)(Math.PI*.5));break;
   case 5:q=axisAngle(1,0,0,(float)(-Math.PI*.5));break;
   default:q=axisAngle(0,1,0,(float)Math.PI);break;
  }
  return normalize(multiply(axisAngle(0,1,0,.36f),multiply(axisAngle(1,0,0,.27f),q)));
 }
 public static float[] rotate(float[] q,float[] v){
  float[] p=new float[]{0,v[0],v[1],v[2]};
  float[] tmp=multiply(q,p);
  float[] conjugate=new float[]{q[0],-q[1],-q[2],-q[3]};
  float[] output=multiply(tmp,conjugate);
  return new float[]{output[1],output[2],output[3]};
 }
 private static float[] axisAngle(float x,float y,float z,float angle){
  float s=(float)Math.sin(angle*.5);
  return new float[]{(float)Math.cos(angle*.5),x*s,y*s,z*s};
 }
 private static float[] multiply(float[] a,float[] b){
  return new float[]{a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],
    a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],
    a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],
    a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]};
 }
 private static float[] normalize(float[] q){
  float length=(float)Math.sqrt(q[0]*q[0]+q[1]*q[1]+q[2]*q[2]+q[3]*q[3]);
  return new float[]{q[0]/length,q[1]/length,q[2]/length,q[3]/length};
 }
}