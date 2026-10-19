package ca.desadeux.jeu;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
public final class GameLogic {
 private static final SecureRandom R=new SecureRandom();
 public enum Category { SENSUEL, COQUIN, SEXUEL }
 public static int rollWeek(){ int x=R.nextInt(100);return x<50?1:x<75?2:x<87?3:x<95?4:x<99?5:6; }
 public static int d6(){return R.nextInt(6)+1;}
 public static int d20(){return R.nextInt(20)+1;}
 public static Category choose(Category wanted){
  int x=R.nextInt(100);if(x<70)return wanted;
  Category[] alt=new Category[2];int i=0;
  for(Category c:Category.values())if(c!=wanted)alt[i++]=c;
  return alt[x<85?0:1];
 }
 public static Category chooseRandom(){
  int x=R.nextInt(100);
  return x<30?Category.SENSUEL:x<60?Category.COQUIN:Category.SEXUEL;
 }
 public static String monday(){
  return LocalDate.now(ZoneId.of("America/Montreal")).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).toString();
 }
}
