package ca.desadeux.jeu;
import org.junit.Test;
import static org.junit.Assert.*;
import ca.desadeux.jeu.GameLogic.Category;

public class PremiumDiceMathTest {
 @Test public void allSixPhysicalFacesHaveCorrectOpposites(){
  boolean[] seen=new boolean[7];
  for(int face=1;face<=6;face++){
   int opposite=Die3DMath.opposite(face);
   assertEquals(7,face+opposite);
   assertEquals(face,Die3DMath.opposite(opposite));
   seen[face]=true;
   float[] n=Die3DMath.normal(face);
   float[] o=Die3DMath.normal(opposite);
   assertEquals(-1f,n[0]*o[0]+n[1]*o[1]+n[2]*o[2],.00001f);
  }
  for(int i=1;i<=6;i++)assertTrue(seen[i]);
 }
 @Test public void finalOrientationLooksStraightAtWinningFace(){
  for(int face=1;face<=6;face++){
   float[] q=Die3DMath.targetQuaternion(face);
   float[] forward=Die3DMath.rotate(q,Die3DMath.normal(face));
   assertTrue("face "+face+" must point toward the camera",forward[2]>.875f);
   assertEquals(1.0f,(float)Math.sqrt(q[0]*q[0]+q[1]*q[1]+q[2]*q[2]+q[3]*q[3]),.0001f);
   float[] opposite=Die3DMath.rotate(q,Die3DMath.normal(7-face));
   assertTrue("opposite must point away from viewer",opposite[2]<-.875f);
  }
 }
 @Test public void sixFacesRemainDistinctAfterRotating(){
  for(int n=1;n<=6;n++){
   float[] q=Die3DMath.targetQuaternion(n);
   int front=0;
   for(int f=1;f<=6;f++){
    float[] v=Die3DMath.rotate(q,Die3DMath.normal(f));
    if(v[2]>.875f){front++;assertEquals(n,f);}
   }
   assertEquals("Only one physical face is the result",1,front);
  }
 }
 @Test public void gameProbabilityRegression(){
  int[] weekly=new int[7];int runs=200000;
  for(int i=0;i<runs;i++)weekly[GameLogic.rollWeek()]++;
  double[] expectations={0,.50,.25,.12,.08,.04,.01};
  for(int f=1;f<=6;f++)assertEquals(expectations[f],weekly[f]/(double)runs,.01);
  int[] category=new int[3];
  for(int i=0;i<runs;i++)category[GameLogic.choose(Category.COQUIN).ordinal()]++;
  assertEquals(.15,category[Category.SENSUEL.ordinal()]/(double)runs,.01);
  assertEquals(.70,category[Category.COQUIN.ordinal()]/(double)runs,.01);
  assertEquals(.15,category[Category.SEXUEL.ordinal()]/(double)runs,.01);
 }
}