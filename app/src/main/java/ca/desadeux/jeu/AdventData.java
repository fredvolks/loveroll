package ca.desadeux.jeu;
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.Month;
import java.time.temporal.TemporalAdjusters;

/**
 * Shared Advent calendar. Content only unlocks on the matching date in December.
 * The last Saturday strictly before December 25 has a special consensual challenge.
 */
public final class AdventData {
 public static final String FRED="FRED",EMILIE="EMILIE",TOGETHER="ENSEMBLE";
 /** Fields: title, who gives, instruction, concrete example. */
 public static final String[][] days={
  {"Premier rapprochement", "ENSEMBLE", "Prenez dix minutes ensemble sans téléphone. Choisissez un geste tendre que vous aimez tous les deux.", "Exemple : écoutez une chanson en vous tenant dans les bras."},
  {"Massage détente pour Émilie", "FRED", "Fred offre cinq minutes de massage du dos ou des épaules à Émilie.", "Exemple : Émilie choisit la pression et la durée qui lui conviennent."},
  {"Trois baisers pour Fred", "EMILIE", "Émilie propose trois baisers à Fred, aux endroits non intimes qu'il préfère.", "Exemple : la joue, la nuque et le front, si Fred en a envie."},
  {"Danse collée", "ENSEMBLE", "Invitez-vous à danser lentement et profitez d'un moment sans distraction.", "Exemple : une chanson complète dans le salon, serrés l'un contre l'autre."},
  {"Massage pour Fred", "EMILIE", "Émilie propose à Fred un massage relaxant de cinq minutes.", "Exemple : commencer par les épaules et laisser Fred guider les mouvements."},
  {"Baisers dans le cou", "FRED", "Fred propose à Émilie une minute de baisers doux dans le cou.", "Exemple : commencer par lui demander si elle préfère un baiser ou un câlin."},
  {"Le compliment séduisant", "ENSEMBLE", "Dites-vous chacun trois détails physiques ou gestes que vous trouvez attirants.", "Exemple : un sourire, une façon de regarder l'autre ou un baiser."},
  {"Danse de séduction de Fred", "FRED", "Fred offre une courte danse de séduction à Émilie.", "Exemple : une chanson et, s'il en a envie, un chandail en moins."},
  {"Murmure coquin", "EMILIE", "Émilie propose à Fred une idée coquine qu'elle aimerait explorer.", "Exemple : parler d'une soirée avec musique, lumière tamisée ou un bain."},
  {"Strip-tease léger", "EMILIE", "Émilie propose une danse privée avec déshabillage à son rythme.", "Exemple : choisir une chanson et décider librement si elle retire un vêtement."},
  {"Jeu de la tentation", "FRED", "Fred invite Émilie à un jeu de séduction : rapprochez-vous sans vous embrasser pendant quelques secondes.", "Exemple : se regarder vingt secondes avant de demander un baiser."},
  {"Douche ensemble", "ENSEMBLE", "Proposez de prendre une douche chaude ensemble et décidez librement de la suite.", "Exemple : préparez deux serviettes chaudes et profitez du moment."},
  {"Massage plus sensuel", "FRED", "Fred offre à Émilie un massage sensuel de dix minutes, selon ses limites.", "Exemple : huile adaptée à la peau, lumière douce et choix des zones massées par Émilie."},
  {"Le désir caché", "EMILIE", "Émilie raconte à Fred un désir intime qu'elle aimerait partager un jour.", "Exemple : suggérer une nouvelle ambiance ou une activité que vous n'avez pas essayée."},
  {"Préliminaires préférés", "ENSEMBLE", "Échangez sur les préliminaires que vous aimez et choisissez-en un si l'envie est partagée.", "Exemple : chacun nomme deux attentions qu'il aime recevoir."},
  {"Le choix du jouet", "FRED", "Fred propose d'intégrer un jouet intime que vous connaissez déjà.", "Exemple : Émilie choisit si cela lui fait envie et lequel utiliser, ou passe le défi."},
  {"Une invitation sexuelle", "EMILIE", "Émilie propose à Fred une activité sexuelle qu'ils apprécient tous les deux.", "Exemple : demander clairement ce qui lui ferait plaisir, sans insister en cas de refus."},
  {"Une attention intime", "FRED", "Fred propose à Émilie un moment de préliminaires ou de sexe oral, selon leurs envies communes.", "Exemple : laisser Émilie choisir une attention, une alternative, ou passer."},
  {"Une soirée passionnée", "ENSEMBLE", "Choisissez ensemble une activité sexuelle qui vous fait envie, ou un moment très tendre.", "Exemple : chacun dit ce qu'il souhaite pour ce soir et vous retenez uniquement une envie commune."},
  {"Strip-tease et surprise", "EMILIE", "Émilie propose à Fred une danse de déshabillage et une surprise intime de son choix.", "Exemple : une chanson, quelques gestes de séduction, et une pause si elle le souhaite."},
  {"Changement de décor", "FRED", "Fred propose un moment intime dans une autre pièce privée de la maison.", "Exemple : préparer une ambiance confortable au salon puis demander si cela convient."},
  {"Plaisir à deux", "ENSEMBLE", "Proposez un moment de plaisir mutuel avec une activité sexuelle voulue par les deux.", "Exemple : chacun explique ce qui lui plaît et ce qu'il ne veut pas essayer."},
  {"Un fantasme réalisable", "EMILIE", "Émilie propose un fantasme simple à réaliser ensemble, ou simplement à discuter.", "Exemple : un scénario de rencontre imaginaire ou une soirée différente."},
  {"Le choix de la nuit", "FRED", "Fred propose à Émilie une soirée intime à son rythme, avec une option de son choix.", "Exemple : choisir ensemble entre un massage prolongé, des préliminaires ou un moment sexuel."},
  {"Le cadeau final", "ENSEMBLE", "Chacun choisit une envie intime à proposer à l'autre. Gardez seulement ce qui vous tente mutuellement.", "Exemple : une longue soirée de baisers et de préliminaires, un jouet ou une activité sexuelle choisie à deux."}
 };
 private static final String[] SATURDAY_SPECIAL={
  "Deux moments d'amour aujourd'hui",
  TOGETHER,
  "Défi spécial du dernier samedi avant Noël : proposez de faire l'amour deux fois aujourd'hui, seulement si vous en avez tous les deux envie. Rien n'est dû ni obligatoire.",
  "Exemple : un premier moment intime le matin et un autre le soir, ou remplacez l'un ou les deux par des câlins si vous préférez."
 };
 private AdventData(){}
 /** Saturday in Dec 18–24, strictly before Christmas day. */
 public static int specialSaturday(int year){
  return LocalDate.of(year,12,25).with(TemporalAdjusters.previous(DayOfWeek.SATURDAY)).getDayOfMonth();
 }
 public static String[] activity(int day,int year){
  checkDay(day);
  return day==specialSaturday(year)?SATURDAY_SPECIAL:days[day-1];
 }
 public static int unlockedCount(LocalDate today){
  return today.getMonth()==Month.DECEMBER?Math.min(25,today.getDayOfMonth()):0;
 }
 public static boolean unlocked(int day,LocalDate today){
  return day>=1&&day<=unlockedCount(today);
 }
 private static void checkDay(int day){
  if(day<1||day>25)throw new IllegalArgumentException("Day must be 1 through 25");
 }
 public static boolean isTogether(int day,int year){
  return activity(day,year)[1].equals(TOGETHER);
 }
 public static String giver(int day,boolean swapped,int year){
  String code=activity(day,year)[1];
  if(code.equals(TOGETHER))return "Fred et Émilie";
  return (code.equals(FRED)!=swapped)?"Fred":"Émilie";
 }
 public static String recipient(int day,boolean swapped,int year){
  if(isTogether(day,year))return "Fred et Émilie";
  return giver(day,swapped,year).equals("Fred")?"Émilie":"Fred";
 }
 private static String swapNames(String v){
  return v.replace("Fred","__SWAP_NAME__").replace("Émilie","Fred").replace("__SWAP_NAME__","Émilie");
 }
 public static String instruction(int day,boolean swapped,int year){
  String content=activity(day,year)[2];
  return swapped&&!isTogether(day,year)?swapNames(content):content;
 }
 public static String example(int day,boolean swapped,int year){
  String content=activity(day,year)[3];
  return swapped&&!isTogether(day,year)?swapNames(content):content;
 }
 // Explicit date checks are required by the UI before ANY activity text is read.
 public static String[] revealedActivity(int day,LocalDate today){
  return unlocked(day,today)?activity(day,today.getYear()):null;
 }
}
