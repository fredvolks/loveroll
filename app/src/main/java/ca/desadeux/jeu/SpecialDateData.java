package ca.desadeux.jeu;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;

/**
 * Exactly 20 equally likely outcomes every month.
 * Independent fair (50/50) rolls for who invites and variation A/B.
 * Data is static/offline; no outing is booked or paid for by the app.
 */
public final class SpecialDateData {
 private SpecialDateData(){}
 private static final SecureRandom RANDOM=new SecureRandom();
 public static final ZoneId ZONE=ZoneId.of("America/Montreal");
 public static final String[][] ACTIVITIES={
  {"Souper en amoureux", "Restaurant dans Québec", "3–4 h", "Réserver une table pour deux, sans les enfants. Choisir l'ambiance plutôt que le restaurant le plus cher.", "Retourner dans un resto que vous aimez déjà.", "Essayer une nouvelle adresse choisie au hasard dans Québec."},
  {"Spa nordique", "Québec ou environs", "4–5 h", "Prévoir une vraie plage de détente à deux, idéalement avec réservation et gardienne.", "Revisiter un spa que vous connaissez.", "Essayer un autre spa ou une formule différente."},
  {"Brunch prolongé", "Québec", "2–3 h", "Une sortie de jour peut être plus simple à organiser avec trois enfants.", "Retourner à votre brunch préféré.", "Découvrir un nouveau café-brunch."},
  {"Spectacle ou théâtre", "Québec", "3–4 h", "Choisir une représentation à une heure compatible avec la gardienne.", "Voir un type de spectacle que vous aimez déjà.", "Essayer un genre ou une petite salle inconnue."},
  {"Soirée humour", "Québec", "3–4 h", "Une sortie légère pour rire ensemble et décompresser.", "Aller voir un humoriste que vous appréciez.", "Découvrir une soirée de relève humoristique."},
  {"Cinéma + dessert", "Québec", "3–4 h", "Séance en amoureux suivie d'une pâtisserie ou d'un café.", "Choisir un film dans votre genre favori.", "Choisir un film hors de vos habitudes."},
  {"Restaurant dégustation", "Québec", "3–4 h", "Faire de la découverte culinaire le centre de la soirée, sans pression.", "Retourner dans un restaurant de dégustation que vous connaissez déjà.", "Choisir une nouvelle adresse gastronomique que vous ne connaissez pas encore."},
  {"Cours de cuisine à deux", "Québec", "3–4 h", "Réserver un atelier conçu pour les adultes; vérifier les dates.", "Apprendre à cuisiner un plat que vous aimez.", "Découvrir un style culinaire jamais essayé."},
  {"Jeu d'évasion en duo", "Québec", "2–3 h", "Vérifier qu'une salle accepte bien deux participants avant de réserver.", "Essayer un thème d'énigmes classique.", "Choisir une aventure différente ou plus immersive."},
  {"Musée ou exposition", "Québec", "2–3 h", "Un après-midi culturel suivi d'un café, pratique si la gardienne reste peu de temps.", "Voir une exposition dans un musée connu.", "Visiter une exposition ou galerie jamais vue."},
  {"Massage en duo", "Québec", "2–3 h", "Réserver un massage en couple si le service est offert à la date choisie.", "Choisir une formule détente familière.", "Essayer un nouveau lieu ou un autre type de massage."},
  {"Salon de thé ou café chic", "Québec", "2–3 h", "Prendre le temps de discuter sans les enfants, puis marcher un peu.", "Retourner à votre café préféré.", "Trouver un nouvel endroit calme et chaleureux."},
  {"Balade Vieux-Québec + resto", "Vieux-Québec", "3–4 h", "Marcher dans les rues historiques puis souper; adapter la marche à la météo.", "Retourner dans un restaurant que vous connaissez dans le Vieux-Québec.", "Découvrir un nouveau restaurant dans le Vieux-Québec."},
  {"Bistro + jeu de société", "Québec", "2–3 h", "Choisir un café-jeux ou apporter un petit jeu dans un lieu qui le permet.", "Rejouer à un jeu que vous aimez.", "Découvrir un jeu conçu pour deux adultes."},
  {"Cocktails ou mocktails", "Québec", "2–3 h", "S'offrir une soirée d'ambiance avec boissons alcoolisées ou non; prévoir un retour sécuritaire.", "Retourner dans un lounge que vous aimez.", "Découvrir un nouveau bar à cocktails ou mocktails."},
  {"Quilles ou billard + bouchée", "Québec", "2–3 h", "Un défi amical suivi d'une petite sortie gourmande.", "Choisir l'activité où vous êtes à l'aise.", "Laisser le hasard choisir entre quilles et billard."},
  {"Traversier + panorama", "Québec–Lévis", "2–4 h", "Profiter de la vue sur le fleuve, avec plan B intérieur si la météo est mauvaise.", "Aller-retour en traversier et café.", "Découvrir un endroit agréable sur la rive opposée."},
  {"Souper fondue ou tapas", "Québec", "3–4 h", "Un repas qui vous laisse du temps pour parler ensemble.", "Retourner dans un restaurant de fondue ou tapas déjà connu.", "Essayer un nouveau restaurant de tapas ou de fondue."},
  {"Mini-escapade locale", "Région de Québec", "4–6 h", "Une demi-journée sans nuitée pour simplifier la garde des enfants.", "Retourner dans un coin de la région que vous aimez.", "Découvrir un village ou un attrait à courte distance."},
  {"Rendez-vous de saison", "Québec et environs", "3–5 h", "L'activité du mois s'adapte automatiquement à la saison.", "VERSION_SAISON_A", "VERSION_SAISON_B"}
 };
 private static final String[][] SEASONAL={
  {"Patinage ou marche hivernale avec boisson chaude.", "Raquette facile suivie d'un café réconfortant."},
  {"Promenade printanière et arrêt gourmand.", "Sortie cabane à sucre pour deux si la saison et les disponibilités le permettent."},
  {"Terrasse ou pique-nique dans un parc de la région.", "Balade gourmande sur l'Île d'Orléans."},
  {"Marche au milieu des couleurs d'automne suivie d'un resto.", "Sortie verger ou marché saisonnier suivie d'un café."}
 };
 public static final class Draw {
  public final int face;
  public final boolean fredInvites;
  public final boolean optionB;
  public Draw(int f,boolean inviter,boolean b){
   if(f<1||f>20)throw new IllegalArgumentException("Face must be 1-20");
   face=f;fredInvites=inviter;optionB=b;
  }
 }
 /** Outings that require a separate fair restaurant discovery roll. */
 public static boolean isRestaurant(int face){
  return face==1||face==3||face==7||face==13||face==18;
 }
 /** 1-3 = familiar restaurant, 4-6 = new one. Each has 50% probability. */
 public static boolean restaurantIsNew(int d6Face){
  if(d6Face<1||d6Face>6)throw new IllegalArgumentException("D6 face must be 1..6");
  return d6Face>=4;
 }
 public static String restaurantChoiceLabel(int d6Face){
  return restaurantIsNew(d6Face)?"NOUVEAU RESTO":"RESTO CONNU";
 }
 public static Draw draw(){
  return new Draw(RANDOM.nextInt(20)+1,RANDOM.nextBoolean(),RANDOM.nextBoolean());
 }
 public static String monthKey(LocalDate date){
  return YearMonth.from(date).toString();
 }
 public static String monthKeyNow(){return monthKey(LocalDate.now(ZONE));}
 public static int season(LocalDate date){
  int m=date.getMonthValue();
  if(m==12||m<=2)return 0; // winter
  if(m<=5)return 1; // spring
  if(m<=8)return 2; // summer
  return 3; // autumn
 }
 public static String inviter(Draw d){return d.fredInvites?"Fred":"Émilie";}
 public static String invited(Draw d){return d.fredInvites?"Émilie":"Fred";}
 public static String title(Draw d){return ACTIVITIES[d.face-1][0];}
 public static String location(Draw d){return ACTIVITIES[d.face-1][1];}
 public static String childcare(Draw d){return ACTIVITIES[d.face-1][2];}
 public static String description(Draw d){return ACTIVITIES[d.face-1][3];}
 public static String option(Draw d,LocalDate date){
  if(d.face==20)return SEASONAL[season(date)][d.optionB?1:0];
  return ACTIVITIES[d.face-1][d.optionB?5:4];
 }
 public static String label(Draw d){return d.optionB?"OPTION B":"OPTION A";}
 public static String monthLabel(LocalDate date){
  String[] names={"janvier","février","mars","avril","mai","juin",
   "juillet","août","septembre","octobre","novembre","décembre"};
  return names[date.getMonthValue()-1]+" "+date.getYear();
 }
}
