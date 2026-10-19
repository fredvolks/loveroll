package ca.desadeux.jeu;
import java.time.LocalDate;
import java.time.Year;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.time.DayOfWeek;

/** Local Android occasion preview. The authenticated shared version uses Supabase. */
public final class LoveOccasions {
 private LoveOccasions(){}
 public static final String[] KEYS={
  "valentine","anniversary","mothers_day","fathers_day","my_birthday","partner_birthday"
 };
 public static final String[] LABELS={
  "Saint-Valentin","Anniversaire de couple","Fête des Mères",
  "Fête des Pères","Mon anniversaire","Anniversaire de mon partenaire"
 };
 public static final String[][] SURPRISES={
  {"Lingerie surprise","Préparer une tenue qui vous plaît et en discuter avec votre partenaire, sans obligation."},
  {"Danse privée","Choisir une musique et offrir une danse de séduction, si vous en avez envie."},
  {"Spa privé à deux","Préparer serviettes chaudes, bain relaxant et moment sans écrans."},
  {"Soirée des envies","Chacun exprime une envie et une limite, puis vous choisissez ensemble ce qui vous plaît."},
  {"Massage à l’huile","Une détente réciproque avec une huile adaptée et les préférences de chacun."},
  {"Rendez-vous secret","Envoyer une invitation mystérieuse avec heure et ambiance, puis prévoir la gardienne."},
  {"Strip-tease léger","Préparer une petite performance de séduction, seulement si la personne est à l’aise."},
  {"Coffret lingerie","Choisir ensemble une tenue ou un accessoire romantique sans pression de le porter."},
  {"Parler de désirs","Échanger librement sur vos préférences intimes, même les envies de plaisir oral, sans attente."},
  {"Jeu de rôles","Imaginer deux personnages et choisir ensemble les limites du scénario."},
  {"Nuit sans horaires","Organiser une gardienne et une parenthèse sans les obligations de la maison."},
  {"L’enveloppe audacieuse","Écrire chacun trois envies, puis tirer une proposition qui vous convient à tous les deux."},
  {"Baisers au hasard","Un jeu léger de baisers et de compliments au rythme des deux partenaires."},
  {"Ambiance tamisée","Lumière chaude, playlist favorite et dessert à partager."},
  {"Zéro téléphone","Un souper intime à deux sans interruptions, avec une surprise choisie ensemble."},
  {"Nouvelle tenue","Essayer une tenue élégante ou séduisante, avec liberté de changer d’idée."},
  {"L’autre choisit","Offrir deux choix d’attentions romantiques; votre partenaire sélectionne ce qui lui plaît."},
  {"Menu des envies","Créer une liste de moments tendres, sensuels ou plus audacieux, sans obligation."},
  {"Matinée amoureuse","Une gardienne pour quelques heures, un brunch et du temps de qualité en couple."},
  {"Carte blanche consensuelle","Laisser l’autre proposer une surprise, avec des limites discutées et le droit de refuser."}
 };
 public static String dateKey(int idx){return KEYS[idx];}
 public static String title(int idx){return LABELS[idx];}
 public static LocalDate date(int idx,int year,String mmdd){
  if(idx==0)return LocalDate.of(year,2,14);
  if(idx==2)return LocalDate.of(year,5,1).with(TemporalAdjusters.dayOfWeekInMonth(2,DayOfWeek.SUNDAY));
  if(idx==3)return LocalDate.of(year,6,1).with(TemporalAdjusters.dayOfWeekInMonth(3,DayOfWeek.SUNDAY));
  if(mmdd==null||!mmdd.matches("\\d{2}-\\d{2}"))return null;
  try{
   int m=Integer.parseInt(mmdd.substring(0,2)),d=Integer.parseInt(mmdd.substring(3,5));
   if(m==2&&d==29&&!Year.isLeap(year))d=28;
   return LocalDate.of(year,m,d);
  }catch(RuntimeException e){return null;}
 }
 public static int activeYear(int index,LocalDate now,String mmdd){
  for(int year=now.getYear()-1;year<=now.getYear()+1;year++){
   LocalDate day=date(index,year,mmdd);
   if(day==null)continue;
   long days=ChronoUnit.DAYS.between(now,day);
   if(days>=-7&&days<=14)return year;
  }
  return -1;
 }
 public static int d6(){return GameLogic.d6();}
}
