package ca.desadeux.jeu;
import ca.desadeux.jeu.GameLogic.Category;
/** Suggested optional lengths, in whole minutes. No timer dictates consent or game progression. */
public final class EveningDurations {
 private EveningDurations(){}
 public static int minutes(Category category,int face){
  if(face<1||face>20)throw new IllegalArgumentException("Invalid D20 face");
  if(category==Category.SENSUEL){
   switch(face){
    case 4: case 17: return 10; // shoulder/back massage
    case 9: case 13: return 5;
    case 1: case 2: case 3: case 10: return 2;
    default:return 4;
   }
  }
  if(category==Category.SEXUEL){
   switch(face){
    case 5: case 12: case 14: return 10; // extended, consensual massage/attention
    case 7: case 11: case 15: return 7;
    default:return 5;
   }
  }
  return 4; // historical Coquin cards
 }
 public static String durationLabel(Category category,int face){
  return minutes(category,face)+" minutes";
 }
}
