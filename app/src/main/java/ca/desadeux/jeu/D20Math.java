package ca.desadeux.jeu;
/** Pure Java physical icosahedron with outward face normals and stable landing quaternions. */
public final class D20Math {
 private D20Math(){}
 public static final float T=(float)((1+Math.sqrt(5))/2);
 public static final float[][] V={
  {-1,T,0},{1,T,0},{-1,-T,0},{1,-T,0},
  {0,-1,T},{0,1,T},{0,-1,-T},{0,1,-T},
  {T,0,-1},{T,0,1},{-T,0,-1},{-T,0,1}
 };
 public static final int[][] F={
  {0,11,5},{0,5,1},{0,1,7},{0,7,10},{0,10,11},
  {1,5,9},{5,11,4},{11,10,2},{10,7,6},{7,1,8},
  {3,9,4},{3,4,2},{3,2,6},{3,6,8},{3,8,9},
  {4,9,5},{2,4,11},{6,2,10},{8,6,7},{9,8,1}
 };
 public static float[] unit(float[] v){
  float m=(float)Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]);
  return new float[]{v[0]/m,v[1]/m,v[2]/m};
 }
 public static float[] normal(int face){
  check(face);int[] id=F[face-1];
  float[] a=V[id[0]],b=V[id[1]],c=V[id[2]];
  float ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2];
  float vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  float[] n=unit(new float[]{uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx});
  float[] center={(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3,(a[2]+b[2]+c[2])/3};
  if(dot(n,center)<0){n[0]*=-1;n[1]*=-1;n[2]*=-1;}
  return n;
 }
 private static float dot(float[] a,float[] b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
 private static void check(int face){if(face<1||face>20)throw new IllegalArgumentException("D20 face must be 1..20");}
 public static float[] quat(float[] a,float[] b){
  float[] v=unit(a),w=unit(b);
  float d=dot(v,w);
  if(d<-.999f){
   float[] axis=Math.abs(v[0])<.8f?new float[]{1,0,0}:new float[]{0,1,0};
   float[] cross=cross(v,axis);cross=unit(cross);
   return new float[]{0,cross[0],cross[1],cross[2]};
  }
  float[] c=cross(v,w);
  return normalize(new float[]{1+d,c[0],c[1],c[2]});
 }
 private static float[] cross(float[] a,float[] b){return new float[]{a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]};}
 public static float[] axis(float x,float y,float z,float a){float s=(float)Math.sin(a*.5);return new float[]{(float)Math.cos(a*.5),x*s,y*s,z*s};}
 public static float[] mul(float[] a,float[] b){
  return new float[]{a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],
    a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],
    a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],
    a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]};
 }
 public static float[] normalize(float[] q){
  float m=(float)Math.sqrt(q[0]*q[0]+q[1]*q[1]+q[2]*q[2]+q[3]*q[3]);
  return new float[]{q[0]/m,q[1]/m,q[2]/m,q[3]/m};
 }
 public static float[] rotate(float[] q,float[] p){
  float[] z=mul(mul(q,new float[]{0,p[0],p[1],p[2]}),new float[]{q[0],-q[1],-q[2],-q[3]});
  return new float[]{z[1],z[2],z[3]};
 }
 public static float[] orientation(int face){
  check(face);
  // Face's real outward normal points into the camera.
  float[] q=quat(normal(face),new float[]{0,0,1});
  int id=F[face-1][0];
  float[] apex=rotate(q,V[id]);
  float angle=(float)Math.atan2(apex[0],apex[1]);
  q=mul(axis(0,0,1,angle),q);
  // Small perspective yaw/pitch still leave the selected face the frontmost.
  return normalize(mul(axis(0,1,0,.07f),mul(axis(1,0,0,-.055f),q)));
 }
}
