package ca.desadeux.jeu;
import org.junit.Test;
import static org.junit.Assert.*;
import java.time.LocalDate;
public class LoveOccasionsTest {
 @Test public void twentyUniqueMutuallyOptionalSurprises(){
  assertEquals(20,LoveOccasions.SURPRISES.length);
  java.util.Set<String> seen=new java.util.HashSet<>();
  for(String[] item:LoveOccasions.SURPRISES){
   assertEquals(2,item.length);
   assertTrue(item[1].length()>35);
   assertTrue(seen.add(item[0]));
  }
 }
 @Test public void canadianHolidaysAndLeapDays(){
  assertEquals(LocalDate.of(2026,2,14),LoveOccasions.date(0,2026,""));
  assertEquals(LocalDate.of(2026,5,10),LoveOccasions.date(2,2026,""));
  assertEquals(LocalDate.of(2026,6,21),LoveOccasions.date(3,2026,""));
  assertEquals(LocalDate.of(2028,2,29),LoveOccasions.date(4,2028,"02-29"));
  assertEquals(LocalDate.of(2026,2,28),LoveOccasions.date(4,2026,"02-29"));
  assertNull(LoveOccasions.date(1,2026,"02-30"));
 }
 @Test public void fourteenDayPlanningWindowSevenDayGrace(){
  assertEquals(2026,LoveOccasions.activeYear(0,LocalDate.of(2026,1,31),""));
  assertEquals(2026,LoveOccasions.activeYear(0,LocalDate.of(2026,2,21),""));
  assertEquals(-1,LoveOccasions.activeYear(0,LocalDate.of(2026,1,30),""));
  assertEquals(-1,LoveOccasions.activeYear(0,LocalDate.of(2026,2,22),""));
  assertEquals(2026,LoveOccasions.activeYear(1,LocalDate.of(2026,10,13),"10-20"));
 }
 @Test public void eventHostsUseEvenDistribution(){
  int a=0,b=0;
  for(int i=0;i<20000;i++){
   int roll=LoveOccasions.d6();
   if(roll<=3)a++;else b++;
  }
  assertEquals(.5,a/(double)(a+b),.025);
 }
}
