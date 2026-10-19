package ca.desadeux.jeu;
import org.junit.Test;
import static org.junit.Assert.*;
import ca.desadeux.jeu.GameLogic.Category;
public class GameRulesTest {
 @Test public void weeklyRollHasExpectedWeightedRange(){
  int[] count=new int[7]; int runs=180000;
  for(int i=0;i<runs;i++){int n=GameLogic.rollWeek();assertTrue(n>=1&&n<=6);count[n]++;}
  double[] expected={0,.50,.25,.12,.08,.04,.01};
  for(int i=1;i<=6;i++) assertEquals("week face "+i,expected[i],(double)count[i]/runs,.015);
 }
 @Test public void surpriseDistributionAndFaceCount(){
  for(Category category:Category.values()){
   int[] counts=new int[3]; int runs=120000;
   for(int i=0;i<runs;i++){counts[GameLogic.choose(category).ordinal()]++;}
   for(Category actual:Category.values()){
    double expectation=actual==category?.70:.15;
    assertEquals(category+" to "+actual,expectation,(double)counts[actual.ordinal()]/runs,.015);
   }
   assertEquals(20,GameData.cards[category.ordinal()].length);
   for(int i=1;i<=20;i++)assertEquals(3,GameData.get(category,i).length);
  }
  for(int i=0;i<100;i++){assertTrue(GameLogic.d6()>=1&&GameLogic.d6()<=6);assertTrue(GameLogic.d20()>=1&&GameLogic.d20()<=20);}
 }

 @Test public void everyPersonGetsUniqueCardsEvenWhenTheyPass(){
  long fredSeen=0L,emilieSeen=0L;
  for(int i=0;i<40;i++){
   ChallengePicker.Pick f=ChallengePicker.draw(Category.SENSUEL,fredSeen);
   assertNotNull("Fred draw "+i,f);
   assertFalse(ChallengePicker.seen(fredSeen,f.category,f.face));
   fredSeen=ChallengePicker.mark(fredSeen,f.category,f.face);
   ChallengePicker.Pick e=ChallengePicker.draw(Category.SEXUEL,emilieSeen);
   assertNotNull("Émilie draw "+i,e);
   assertFalse(ChallengePicker.seen(emilieSeen,e.category,e.face));
   emilieSeen=ChallengePicker.mark(emilieSeen,e.category,e.face);
   assertEquals(39-i,ChallengePicker.remaining(fredSeen));
   assertEquals(39-i,ChallengePicker.remaining(emilieSeen));
  }
  assertNull(ChallengePicker.draw(Category.SENSUEL,fredSeen));
  assertNull(ChallengePicker.draw(Category.SEXUEL,emilieSeen));
  assertEquals(40,Long.bitCount(fredSeen));
  assertEquals(40,Long.bitCount(emilieSeen));
  // Histories are independent: a card seen by one remains available to the other.
  assertEquals(40,ChallengePicker.remaining(0L));
 }
 @Test public void acceptedAndPassedShareSameExcludedHistory(){
  long mask=0;
  ChallengePicker.Pick first=ChallengePicker.draw(Category.SENSUEL,mask);
  mask=ChallengePicker.mark(mask,first.category,first.face); // passed
  ChallengePicker.Pick second=ChallengePicker.draw(Category.COQUIN,mask);
  assertNotNull(second);
  assertFalse(first.category==second.category&&first.face==second.face);
  mask=ChallengePicker.mark(mask,second.category,second.face); // accepted
  assertEquals(38,ChallengePicker.remaining(mask));
 }
 @Test public void categoryOddsRemainWeightedWhenAllAvailable(){
  int[] counts=new int[3];
  int runs=60000;
  for(int i=0;i<runs;i++){
   ChallengePicker.Pick pick=ChallengePicker.draw(Category.SENSUEL,0L);
   counts[pick.category.ordinal()]++;
  }
  assertEquals(.88,(double)counts[0]/runs,.015);
  assertEquals(0.,(double)counts[1]/runs,.001);
  assertEquals(.12,(double)counts[2]/runs,.015);
 }

 @Test public void twoCategoryOddsAndFortyNeverRepeat(){
  int[] hits=new int[3];int n=120000;
  for(int i=0;i<n;i++)hits[ChallengePicker.draw(Category.SEXUEL,0L).category.ordinal()]++;
  assertEquals(.12,hits[Category.SENSUEL.ordinal()]/(double)n,.012);
  assertEquals(0,hits[Category.COQUIN.ordinal()]);
  assertEquals(.88,hits[Category.SEXUEL.ordinal()]/(double)n,.012);
  long history=0L;
  for(int i=0;i<40;i++){
   ChallengePicker.Pick pick=ChallengePicker.draw(Category.SEXUEL,history);
   assertNotNull(pick);
   assertNotEquals(Category.COQUIN,pick.category);
   assertFalse(ChallengePicker.seen(history,pick.category,pick.face));
   history=ChallengePicker.mark(history,pick.category,pick.face);
  }
  assertEquals(40,Long.bitCount(history));
  assertNull(ChallengePicker.draw(Category.SENSUEL,history));
 }
 @Test public void categorySelectionRenormalizesWhenOneDeckIsEmpty(){
  long mask=0;
  for(int i=1;i<=20;i++)mask=ChallengePicker.mark(mask,Category.SEXUEL,i);
  for(int i=0;i<200;i++){
   ChallengePicker.Pick p=ChallengePicker.draw(Category.SEXUEL,true,mask);
   assertNotNull(p);assertEquals(Category.SENSUEL,p.category);
  }
 }
 @Test public void eachChallengeIncludesDuration(){
  assertEquals(10,EveningDurations.minutes(Category.SENSUEL,4));
  assertEquals(10,EveningDurations.minutes(Category.SEXUEL,5));
  for(Category category:Category.values())for(int face=1;face<=20;face++){
   int minutes=EveningDurations.minutes(category,face);
   assertTrue(minutes>=1&&minutes<=15);
  }
 }
 @Test public void allSixtyCardsProvideActionAndConcreteExample(){
  java.util.Set<String> seen=new java.util.HashSet<>();
  for(Category category:Category.values()){
   for(int face=1;face<=20;face++){
    String[] card=GameData.get(category,face);
    assertEquals(3,card.length);
    assertTrue(card[0].length()>=4);
    assertTrue(card[1].length()>25);
    assertTrue(card[2].length()>25);
    assertTrue("All challenges must be distinct by category and title",
      seen.add(category.name()+":"+card[0]));
    assertTrue("Example required for "+card[0],card[2].startsWith("Exemple : "));
   }
  }
  assertEquals(60,seen.size());
 }
 @Test public void adventCalendarLocksAllCasesBeforeDecember(){
  java.time.LocalDate november=java.time.LocalDate.of(2026,11,30);
  assertEquals(0,AdventData.unlockedCount(november));
  for(int day=1;day<=25;day++){
   assertFalse(AdventData.unlocked(day,november));
   assertNull(AdventData.revealedActivity(day,november));
  }
  assertEquals(0,AdventData.unlockedCount(java.time.LocalDate.of(2026,10,13)));
  assertEquals(0,AdventData.unlockedCount(java.time.LocalDate.of(2027,1,1)));
 }
 @Test public void adventCalendarNeverRevealsFutureDay(){
  for(int current=1;current<=25;current++){
   java.time.LocalDate date=java.time.LocalDate.of(2026,12,current);
   assertEquals(current,AdventData.unlockedCount(date));
   for(int day=1;day<=25;day++){
    assertEquals(day<=current,AdventData.unlocked(day,date));
    if(day<=current)assertNotNull(AdventData.revealedActivity(day,date));
    else assertNull(AdventData.revealedActivity(day,date));
   }
  }
  assertEquals(25,AdventData.unlockedCount(java.time.LocalDate.of(2026,12,31)));
 }
 @Test public void adventSpecialChallengeFallsOnSaturdayBeforeChristmas(){
  assertEquals(19,AdventData.specialSaturday(2026));
  for(int year=2026;year<=2040;year++){
   int special=AdventData.specialSaturday(year);
   java.time.LocalDate date=java.time.LocalDate.of(year,12,special);
   assertTrue(date.getDayOfMonth()<25);
   assertEquals(java.time.DayOfWeek.SATURDAY,date.getDayOfWeek());
   assertTrue(AdventData.activity(special,year)[0].contains("Deux moments"));
   assertTrue(AdventData.isTogether(special,year));
   assertNull(AdventData.revealedActivity(special,date.minusDays(1)));
   assertNotNull(AdventData.revealedActivity(special,date));
  }
 }
 @Test public void adventHasTwentyFiveDetailedActivitiesAndRoleSwaps(){
  assertEquals(25,AdventData.days.length);
  for(int day=1;day<=25;day++){
   String[] item=AdventData.activity(day,2026);
   assertEquals(4,item.length);
   for(String field:item)assertFalse(field.trim().isEmpty());
   assertTrue(item[3].startsWith("Exemple : "));
   if(AdventData.isTogether(day,2026)){
    assertEquals("Fred et Émilie",AdventData.giver(day,false,2026));
    assertEquals(AdventData.instruction(day,false,2026),AdventData.instruction(day,true,2026));
   }else{
    assertNotEquals(AdventData.giver(day,false,2026),AdventData.giver(day,true,2026));
    assertEquals(AdventData.giver(day,false,2026),AdventData.recipient(day,true,2026));
    assertEquals(AdventData.recipient(day,false,2026),AdventData.giver(day,true,2026));
   }
  }
 }
}
