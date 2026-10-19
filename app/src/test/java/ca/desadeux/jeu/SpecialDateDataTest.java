package ca.desadeux.jeu;
import org.junit.Test;
import static org.junit.Assert.*;
import java.time.LocalDate;

public class SpecialDateDataTest {
 @Test public void exactlyTwentyCuratedOutingsForParentsInQuebec(){
  assertEquals(20,SpecialDateData.ACTIVITIES.length);
  java.util.Set<String> titles=new java.util.HashSet<>();
  for(int i=0;i<20;i++){
   String[] item=SpecialDateData.ACTIVITIES[i];
   assertEquals(6,item.length);
   assertTrue("title "+i,item[0].length()>4);
   assertTrue("description "+i,item[3].length()>35);
   assertTrue("babysitter time "+i,item[2].contains("h"));
   assertTrue(titles.add(item[0]));
   assertEquals(item[0],SpecialDateData.title(new SpecialDateData.Draw(i+1,false,false)));
  }
 }
 @Test public void monthlyRandomizationAndIndependentFiftyFiftyChoices(){
  final int n=200000;
  int[] faces=new int[21];
  int fred=0,optionB=0,both=0;
  for(int i=0;i<n;i++){
   SpecialDateData.Draw d=SpecialDateData.draw();
   faces[d.face]++;
   if(d.fredInvites)fred++;
   if(d.optionB)optionB++;
   if(d.fredInvites&&d.optionB)both++;
   assertNotEquals(SpecialDateData.inviter(d),SpecialDateData.invited(d));
  }
  for(int i=1;i<=20;i++)assertEquals("face "+i,0.05,faces[i]/(double)n,.005);
  assertEquals(.5,fred/(double)n,.01);
  assertEquals(.5,optionB/(double)n,.01);
  assertEquals(.25,both/(double)n,.01);
 }
 @Test public void restaurantOutingsTriggerAnExtraSixSidedFiftyFiftyRoll(){
  int[] restaurants={1,3,7,13,18};
  for(int face=1;face<=20;face++){
   boolean known=false;
   for(int f:restaurants)if(face==f)known=true;
   assertEquals("restaurant flag "+face,known,SpecialDateData.isRestaurant(face));
  }
  int known=0,newPlace=0;
  for(int i=0;i<150000;i++){
   int face=GameLogic.d6();
   if(SpecialDateData.restaurantIsNew(face))newPlace++;else known++;
  }
  assertEquals(.5,newPlace/(double)(known+newPlace),.012);
  for(int face=1;face<=3;face++)assertFalse(SpecialDateData.restaurantIsNew(face));
  for(int face=4;face<=6;face++)assertTrue(SpecialDateData.restaurantIsNew(face));
  assertEquals("RESTO CONNU",SpecialDateData.restaurantChoiceLabel(1));
  assertEquals("NOUVEAU RESTO",SpecialDateData.restaurantChoiceLabel(6));
  for(int face:restaurants){
   String a=SpecialDateData.option(new SpecialDateData.Draw(face,true,false),LocalDate.of(2026,10,13));
   String b=SpecialDateData.option(new SpecialDateData.Draw(face,true,true),LocalDate.of(2026,10,13));
   assertNotEquals(a,b);
   assertTrue(a.length()>15&&b.length()>15);
  }
 }
 @Test public void monthRolloverAndSameMonthStable(){
  assertEquals("2026-10",SpecialDateData.monthKey(LocalDate.of(2026,10,1)));
  assertEquals("2026-10",SpecialDateData.monthKey(LocalDate.of(2026,10,31)));
  assertEquals("2026-11",SpecialDateData.monthKey(LocalDate.of(2026,11,1)));
  assertEquals("2027-01",SpecialDateData.monthKey(LocalDate.of(2027,1,1)));
 }
 @Test public void seasonalVariantUpdatesWithoutChangingFace(){
  SpecialDateData.Draw a=new SpecialDateData.Draw(20,true,false);
  SpecialDateData.Draw b=new SpecialDateData.Draw(20,false,true);
  String winter=SpecialDateData.option(a,LocalDate.of(2026,1,15));
  String spring=SpecialDateData.option(a,LocalDate.of(2026,4,15));
  String summer=SpecialDateData.option(a,LocalDate.of(2026,7,15));
  String autumn=SpecialDateData.option(a,LocalDate.of(2026,10,15));
  assertNotEquals(winter,spring);
  assertNotEquals(spring,summer);
  assertNotEquals(summer,autumn);
  assertNotEquals(winter,SpecialDateData.option(b,LocalDate.of(2026,1,15)));
  assertEquals(20,a.face);
  assertEquals(0,SpecialDateData.season(LocalDate.of(2026,12,10)));
  assertEquals(1,SpecialDateData.season(LocalDate.of(2026,3,10)));
  assertEquals(2,SpecialDateData.season(LocalDate.of(2026,8,10)));
  assertEquals(3,SpecialDateData.season(LocalDate.of(2026,11,10)));
 }
}
