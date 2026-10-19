package ca.desadeux.jeu;
import java.security.SecureRandom;
import ca.desadeux.jeu.GameLogic.Category;

/**
 * No challenge repeats for the same recipient in the current evening.
 * Active mode has 40 cards (Sensuel / Sexuel). Historical Coquin data remain supported.
 * Cards enter history as soon as they're drawn (accepted and passed both count).
 */
public final class ChallengePicker {
 private static final SecureRandom RANDOM=new SecureRandom();
 public static final int FACES=20;
 private ChallengePicker(){}
 public static final class Pick {
  public final Category category;
  public final int face;
  Pick(Category category,int face){this.category=category;this.face=face;}
 }
 public static long bit(Category cat,int face){
  if(face<1||face>FACES)throw new IllegalArgumentException("D20 face out of bounds");
  return 1L <<(cat.ordinal()*FACES +face-1);
 }
 public static boolean seen(long mask,Category cat,int face){return (mask & bit(cat,face))!=0;}
 public static long mark(long mask,Category cat,int face){return mask | bit(cat,face);}
 public static int remaining(long mask,Category cat){
  int available=0;
  for(int face=1;face<=FACES;face++)if(!seen(mask,cat,face))available++;
  return available;
 }
 public static int remaining(long mask){
  return remaining(mask,Category.SENSUEL)+remaining(mask,Category.SEXUEL);
 }
 private static final Category[] ACTIVE={Category.SENSUEL,Category.SEXUEL};
 public static Pick draw(Category preferred,long seenMask){return draw(preferred,false,seenMask);}
 public static Pick draw(Category preferred,boolean unusedRandomMode,long seenMask){
  // Each challenge uses the current preference; 88% selected, 12% the other.
  if(preferred!=Category.SENSUEL&&preferred!=Category.SEXUEL)preferred=Category.SENSUEL;
  int total=0;
  for(Category cat:ACTIVE)if(remaining(seenMask,cat)>0)
   total+=cat==preferred?88:12;
  if(total==0)return null;
  int ticket=RANDOM.nextInt(total);
  Category chosen=null;
  for(Category cat:ACTIVE){
   if(remaining(seenMask,cat)==0)continue;
   ticket-=cat==preferred?88:12;
   if(ticket<0){chosen=cat;break;}
  }
  if(chosen==null)throw new IllegalStateException("No category available");
  int k=RANDOM.nextInt(remaining(seenMask,chosen));
  for(int face=1;face<=20;face++){
   if(seen(seenMask,chosen,face))continue;
   if(k--==0)return new Pick(chosen,face);
  }
  throw new IllegalStateException("No face available");
 }
}
