package ca.desadeux.jeu;
import org.junit.Test;
import static org.junit.Assert.*;
public final class D20GeometryTest {
 @Test public void shapeHasExactlyTwentyDistinctOutwardFaces(){
  assertEquals(20,D20Math.F.length);
  assertEquals(12,D20Math.V.length);
  java.util.Set<String> sets=new java.util.HashSet<>();
  for(int face=1;face<=20;face++){
   int[] f=D20Math.F[face-1];
   assertEquals(3,f.length);
   assertTrue(f[0]!=f[1]&&f[1]!=f[2]&&f[0]!=f[2]);
   int[] copy=f.clone();java.util.Arrays.sort(copy);
   assertTrue(sets.add(java.util.Arrays.toString(copy)));
   float[] n=D20Math.normal(face);
   float[] a=D20Math.V[f[0]],b=D20Math.V[f[1]],c=D20Math.V[f[2]];
   float x=(a[0]+b[0]+c[0])/3,y=(a[1]+b[1]+c[1])/3,z=(a[2]+b[2]+c[2])/3;
   assertTrue("Face normal points outward",n[0]*x+n[1]*y+n[2]*z>0);
  }
 }
 @Test public void exactlyTheSelectedFacePointsTowardViewer(){
  for(int chosen=1;chosen<=20;chosen++){
   float[] q=D20Math.orientation(chosen);
   float[] n=D20Math.rotate(q,D20Math.normal(chosen));
   assertTrue("front facing D20 face "+chosen,n[2]>.995f);
   float norm=(float)Math.sqrt(q[0]*q[0]+q[1]*q[1]+q[2]*q[2]+q[3]*q[3]);
   assertEquals(1f,norm,.0001f);
   for(int other=1;other<=20;other++){
    float[] v=D20Math.rotate(q,D20Math.normal(other));
    if(chosen!=other)assertTrue("no other face as front as the winner",n[2]>v[2]+.0001f);
   }
  }
 }
 @Test public void quaternionDoesNotRotateDiceProbability(){
  for(int face=1;face<=20;face++){
   float[] orientation=D20Math.orientation(face);
   assertEquals(4,orientation.length);
  }
 }
}
