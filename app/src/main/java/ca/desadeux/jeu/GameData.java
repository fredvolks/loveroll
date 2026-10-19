package ca.desadeux.jeu;
import ca.desadeux.jeu.GameLogic.Category;
public final class GameData {
 /** Card format: short title, unambiguous action from giver to receiver, concrete example. */
 public static final String[][][] cards = new String[][][]{
  {
   {"Le regard complice", "Regarde la personne qui reçoit dans les yeux pendant une minute, sans téléphone ni distraction.", "Exemple : assis face à face, prenez-vous les mains et gardez le regard jusqu'à la fin du minuteur."},
   {"Un vrai long baiser", "Offre un baiser lent et prolongé, sans chercher à passer à l'étape suivante.", "Exemple : choisissez une chanson douce et embrassez-vous jusqu'à la fin du refrain."},
   {"Baisers dans le cou", "Demande si la nuque lui plaît, puis dépose quelques baisers légers.", "Exemple : trois petits baisers à gauche, puis trois à droite, selon ses préférences."},
   {"Massage des épaules", "Offre cinq minutes de massage relaxant, avec une pression choisie par l'autre.", "Exemple : commence près des épaules et demande « plus doux ou plus ferme ? »."},
   {"Danse rapprochée", "Invite la personne qui reçoit à une danse lente, à la distance qui lui convient.", "Exemple : une chanson entière dans le salon, sans regarder vos téléphones."},
   {"Trois compliments précis", "Nomme trois détails que tu apprécies chez l'autre, sans te répéter.", "Exemple : son sourire au réveil, sa façon de rire et son regard."},
   {"Baisers surprise", "Propose trois baisers surprises sur des zones non intimes choisies ensemble.", "Exemple : la main, le front et la joue, les yeux fermés si elle ou il le souhaite."},
   {"Souvenir de couple", "Raconte un souvenir heureux et demande à l'autre ce qu'il en retient.", "Exemple : reparlez de votre premier rendez-vous et du moment le plus drôle."},
   {"Caresse du dos", "Propose une minute de caresses légères sur le dos ou les bras.", "Exemple : trace des petits cercles du bout des doigts sur les omoplates."},
   {"Chuchotement", "Murmure une attention ou une envie tendre à l'oreille de l'autre.", "Exemple : « J'aimerais qu'on se réserve une soirée juste pour nous. »"},
   {"Premier baiser revisité", "Refaites votre premier baiser, comme si vous aviez un premier rendez-vous.", "Exemple : demande « Je peux t'embrasser ? », puis recréez la scène."},
   {"L'odeur préférée", "Dis quelle odeur ou quel parfum chez l'autre te plaît.", "Exemple : son parfum après la douche ou l'odeur d'un chandail qu'il ou elle porte."},
   {"Câlin de deux minutes", "Propose un câlin confortable sans aucune attente pour la suite.", "Exemple : assis dans le divan, restez enlacés le temps de deux minutes."},
   {"Choix de douceur", "Offre un choix entre deux attentions, puis réalise celle retenue.", "Exemple : « Tu préfères un massage des mains ou cinq baisers ? »"},
   {"Petits frissons", "Propose des effleurements sur les avant-bras, les épaules ou le dos.", "Exemple : passe lentement le bout des doigts sur les avant-bras."},
   {"Rendez-vous inventé", "Décris une sortie romantique que tu pourrais vraiment organiser.", "Exemple : souper à la maison, bougies et une playlist choisie ensemble."},
   {"Approche au ralenti", "Approche ton visage lentement du sien et attends son accord pour un baiser.", "Exemple : un sourire, une pause, puis un baiser si l'autre en a envie."},
   {"Geste irrésistible", "Dis un geste concret de l'autre que tu trouves séduisant.", "Exemple : « J'aime quand tu viens te coller contre moi sans raison. »"},
   {"Massage guidé", "Laisse la personne qui reçoit guider la pression et l'endroit du massage.", "Exemple : elle ou il place doucement ta main sur la nuque ou les épaules."},
   {"Carte tendresse", "Laisse l'autre choisir parmi deux gestes tendres de cette catégorie.", "Exemple : offrir trois baisers ou un câlin de cinq minutes."}
  },
  {
   {"Un vêtement en moins", "Propose de retirer un vêtement de ton choix, uniquement si vous êtes à l'aise.", "Exemple : enlève ton chandail en gardant le contact visuel."},
   {"Baiser à la carte", "Demande où la personne aimerait recevoir un baiser, puis offre-le.", "Exemple : joue, cou ou épaule; l'autre choisit."},
   {"Danse de séduction", "Offre une courte danse privée, sans obligation de te déshabiller.", "Exemple : choisis une chanson entraînante et danse pendant une minute."},
   {"Bandeau et baisers", "Propose un bandeau pour une série de baisers non intimes, avec possibilité d'arrêter.", "Exemple : un baiser sur la main, la joue puis le cou."},
   {"Massage à l'huile", "Offre cinq minutes de massage avec une huile adaptée à la peau.", "Exemple : sur le dos, dans une pièce chaude, en demandant si la pression convient."},
   {"Tentation sans contact", "Joue à te rapprocher sans embrasser pendant vingt secondes.", "Exemple : souris à quelques centimètres, puis demande si un baiser est bienvenu."},
   {"Une envie à partager", "Raconte une activité coquine qui t'intrigue et demande l'avis de l'autre.", "Exemple : une soirée déguisée, une danse privée ou un bain à deux."},
   {"Première rencontre", "Invente une petite scène où vous faites semblant de vous rencontrer.", "Exemple : « Bonsoir, est-ce que cette place est libre ? » dans votre salon."},
   {"Trois mots séduisants", "Dis trois choses attirantes à l'oreille de la personne qui reçoit.", "Exemple : « ton regard », « ton sourire », « ta façon de m'embrasser »."},
   {"Choix du vêtement", "Offre le choix entre retirer un vêtement ou donner un baiser prolongé.", "Exemple : « Tu choisis la surprise : le chandail ou le baiser ? »"},
   {"Enlacés sur une chanson", "Choisis une chanson et restez très proches jusqu'à sa fin.", "Exemple : danse collée en gardant les bras autour de l'autre."},
   {"Miroir de séduction", "Fais un geste de séduction, puis invite l'autre à le reproduire.", "Exemple : un regard soutenu, un mouvement de danse ou un baiser sur la main."},
   {"Massage en alternance", "Offre un court massage, puis propose d'inverser les rôles.", "Exemple : trois minutes chacun sur les épaules et la nuque."},
   {"Trois baisers choisis", "Laisse l'autre choisir trois endroits non intimes pour recevoir des baisers.", "Exemple : épaule, main et cou, dans l'ordre décidé."},
   {"Phrase à compléter", "Commence une phrase coquine et laisse l'autre dire la suite.", "Exemple : « Ce soir, j'aimerais qu'on essaie… »; écouter sans juger."},
   {"Danse sans paroles", "Séduis l'autre par le regard et les mouvements, sans parler pendant une chanson.", "Exemple : invite d'un geste, prends sa main, puis danse."},
   {"Surprise les yeux fermés", "Propose une surprise douce, puis précise ce qui est permis avant de commencer.", "Exemple : un baiser sur l'épaule ou un massage des mains."},
   {"Invitation secrète", "Invente une invitation coquine réalisable ce soir.", "Exemple : glisse un billet « Rendez-vous dans le salon à 21 h »."},
   {"Le choix de deux minutes", "Offre deux minutes d'une attention choisie par l'autre.", "Exemple : massage des épaules, caresses sur le dos ou baisers sur le cou."},
   {"Le défi préféré", "La personne qui reçoit choisit une activité coquine parmi deux propositions.", "Exemple : une danse privée d'une minute ou cinq minutes de massage."}
  },
  {
   {"Déshabillage à deux", "Propose un moment de déshabillage progressif, seulement si vous le souhaitez tous les deux.", "Exemple : chaque personne décide elle-même quels vêtements retirer et à quel rythme."},
   {"Préliminaires préférés", "Demande quels préliminaires plaisent à l'autre et propose de commencer par ceux-là.", "Exemple : « Qu'est-ce qui te ferait envie ce soir ? » avant de commencer."},
   {"Proposition de sexe oral", "Propose d'offrir ou de recevoir du sexe oral; la personne qui reçoit choisit librement.", "Exemple : pose la question clairement; un non mène simplement au prochain défi."},
   {"Position choisie ensemble", "Propose une position sexuelle confortable et laissez l'autre accepter ou suggérer autre chose.", "Exemple : choisissez quelque chose de familier plutôt qu'une nouveauté compliquée."},
   {"Plaisir mutuel", "Propose un moment de plaisir partagé où chacun communique ses envies.", "Exemple : demande d'abord ce qui est agréable et ce qu'il vaut mieux éviter."},
   {"Intimité sous la douche", "Propose de déplacer un moment intime dans la douche si c'est confortable et sécuritaire.", "Exemple : commence par une douche chaude partagée et décidez de la suite."},
   {"Prendre l'initiative", "Offre de guider le prochain moment sexuel en restant attentif aux réactions de l'autre.", "Exemple : commence par demander « Tu préfères que je prenne les devants ? »."},
   {"Sans pénétration", "Propose une expérience sexuelle sans pénétration et choisissez ensemble ce qui vous convient.", "Exemple : parlez de vos préférences avant de commencer; aucune activité n'est imposée."},
   {"Jouet intime", "Propose d'utiliser un jouet intime que vous possédez et connaissez déjà.", "Exemple : choisissez-en un ensemble et vérifiez que vous êtes tous deux à l'aise."},
   {"Autre pièce", "Propose de changer d'endroit pour un moment intime, uniquement dans un lieu privé.", "Exemple : chambre ou salon, selon ce qui vous rend à l'aise."},
   {"Un fantasme à raconter", "Raconte un fantasme que tu souhaites simplement partager, sans obligation de le réaliser.", "Exemple : commence par « Une idée que j'ai déjà imaginée, c'est… »."},
   {"L'autre choisit", "Propose deux activités intimes que vous aimez et laisse l'autre choisir ou refuser.", "Exemple : « Tu préfères une longue séance de baisers ou un moment plus intime ? »"},
   {"Rôles inversés", "Propose que la personne habituellement plus réservée prenne l'initiative.", "Exemple : elle ou il choisit le moment, l'ambiance ou la première activité."},
   {"Lumière au choix", "Propose un éclairage différent pour votre intimité, en respectant le confort de chacun.", "Exemple : lumière tamisée, bougies LED ou lumière éteinte."},
   {"Bandeau intime", "Propose un bandeau pendant un moment intime, en définissant les limites à l'avance.", "Exemple : convenez d'un mot d'arrêt et commencez doucement."},
   {"Une nouveauté consensuelle", "Chacun suggère une petite nouveauté sexuelle réaliste; retenez uniquement une envie commune.", "Exemple : changez le moment de la journée ou la façon de créer l'ambiance."},
   {"Rythme préféré", "Demande si l'autre préfère un moment lent ou plus passionné, puis respectez ce choix.", "Exemple : parlez du rythme avant de poursuivre."},
   {"Désir secret", "Invite la personne qui reçoit à nommer une activité intime qu'elle aimerait davantage.", "Exemple : pose une question ouverte et écoute sans argumenter."},
   {"Carte blanche encadrée", "Propose une activité sexuelle parmi vos habitudes préférées; l'autre peut accepter, modifier ou passer.", "Exemple : choisis une idée simple et demande son accord explicite."},
   {"Finale à deux", "Choisissez ensemble comment terminer la soirée, que ce soit avec ou sans activité sexuelle.", "Exemple : un câlin, des préliminaires ou un moment sexuel souhaité par les deux."}
  }
 };
 public static String[] get(Category category,int face){
  return cards[category.ordinal()][face-1];
 }
}
