
/* LoveRoll Eclat — 12 authored, distinct, repeatable couple experiences.
 * Scenes contain original content, separate from the D100 and official 200 challenges.
 * Each row: scene title ¦ musical mood ¦ four distinct story variants.
 */
export function makeCoffret(id,title,subtitle,music,choices,finales,scenes,roles){
 const rows=scenes.trim().split('\n').map(line=>line.trim().split('¦').map(v=>v.trim()));
 const jobs=roles.trim().split('\n').map(line=>line.trim().split('¦').map(v=>v.trim()));
 if(rows.length!==8||jobs.length!==8||rows.some(r=>r.length!==6)||jobs.some(r=>r.length!==2))
  throw Error('Éclat: scénarisation invalide pour le coffret '+id);
 return Object.freeze({id,title,subtitle,music,choices,finales,
  chapters:rows.map((r,i)=>Object.freeze({title:r[0],mood:r[1],variants:r.slice(2),roles:jobs[i]}))});
}
export const ECLAT_FIRST=[
makeCoffret(1,'Les cinq secrets','Cinq enveloppes, mille découvertes','mystere',
 ['Je préfère la douceur','J\'ai envie de jouer','Surprenez-moi'],
 ['Votre dernier secret est un projet commun : choisissez un petit rendez-vous que vous réaliserez ensemble.','La dernière enveloppe vous invite à inventer votre propre rituel secret, rien qu\'à vous.','Chacun offre à l\'autre une invitation mystérieuse à ouvrir lors de votre prochaine soirée.'],
 `Le sceau de la première enveloppe¦mystere¦Écrivez chacun un souvenir où l’autre vous a surpris agréablement, sans le nommer.¦Choisissez une petite attention de l’autre qui vous est restée en tête.¦Pensez à un instant imprévu qui vous a fait rire ensemble.¦Décrivez un endroit où vous aimeriez revivre un moment à deux.
Un indice inattendu¦romantique¦Laissez un indice sur le lieu de votre premier vrai tête-à-tête.¦Imaginez un objet ordinaire qui représente votre complicité; faites-le deviner.¦Inventez un titre mystérieux pour l’une de vos plus belles journées.¦Choisissez trois mots pour décrire votre relation sans utiliser « amour ».
Le message sous le ruban¦ludique¦Chacun cache un compliment dans une devinette de deux phrases.¦Faites deviner une qualité de l’autre à l’aide de trois indices farfelus.¦Transformez un souvenir tendre en faux titre de film à deviner.¦Décrivez votre partenaire comme un personnage de roman, sans dire son prénom.
La boîte à réponses¦romantique¦Chacun termine « J’aime quand tu… » avec un détail vraiment personnel.¦Écrivez une question que vous n’avez jamais osé poser sur vos premières rencontres.¦Échangez un souvenir que vous aimeriez photographier si vous pouviez revenir en arrière.¦Dites chacun un petit geste que vous aimeriez recevoir plus souvent.
La clé des curiosités¦mystere¦Choisissez un désir d’aventure non réalisé et faites-en deviner le thème.¦Imaginez une journée sans téléphone; cachez la première destination à l’autre.¦Proposez trois idées de petites surprises, dont une complètement improbable.¦Inventez un code secret pour demander un moment à deux dans la semaine.
La confidence lumineuse¦sensuel¦Racontez quelle ambiance de lumière vous donne envie de vous rapprocher.¦Choisissez entre une chanson lente, une danse ou un moment de détente côte à côte.¦Imaginez un geste d’affection simple que vous souhaiteriez offrir ce soir.¦Partagez un souvenir d’un instant où un regard a tout changé.
Le secret inversé¦ludique¦Essayez de deviner le compliment que l’autre espère entendre.¦Devinez quelle petite surprise l’autre préparerait avec dix dollars.¦Inventez chacun une fausse confidence drôle et une vraie; faites deviner laquelle est vraie.¦Choisissez entre un rendez-vous improvisé, un message surprise ou une danse.
La dernière enveloppe¦finale¦Écrivez chacun une promesse réaliste à tenir avant le prochain mois.¦Choisissez ensemble une nouvelle tradition de dix minutes par semaine.¦Inventez un nom pour ce soir et gardez-le comme souvenir.¦Offrez une invitation secrète à réaliser avant votre prochain coffret.`,
 `Choisis en silence ton souvenir; laisse l’autre trouver le premier indice.¦Écoute l’indice puis tente une seule hypothèse avant la révélation.
Écris une devinette sur un lieu ou un objet.¦Observe les indices et propose deux réponses possibles.
Prépare le compliment énigmatique sans le prononcer directement.¦Essaie de décoder le compliment puis échangez les rôles.
Exprime un souhait simple et personnel.¦Accueille la réponse sans la corriger; ajoute ensuite la tienne.
Cache ton idée derrière trois mots.¦Choisis quel mot tu veux dévoiler en premier.
Propose un moment confortable pour les deux.¦Indique ce qui te plairait également, sans obligation.
Tente de lire les intentions de l’autre.¦Révèle un indice supplémentaire si la devinette semble difficile.
Prépare le dernier mot du coffret.¦Partage ton ressenti et décide si tu veux garder ce souvenir.`),
makeCoffret(2,'Le double jeu','Deux rôles secrets qui changent de mains','ludique',
 ['Coopérer','Faire durer le suspense','Miser sur la surprise'],
 ['Vous avez démasqué le double jeu : chacun invente un surnom secret pour le prochain rendez-vous.','Dernier retournement : choisissez ensemble une mission légère à réaliser demain.','Vous gagnez à deux : inventez votre propre code pour demander une soirée surprise.'],
 `Distribution des rôles¦mystere¦L’un devient le mystérieux invitant; l’autre l’enquêteur qui doit découvrir l’intention.¦L’un invente une identité de bal masqué; l’autre doit deviner sa particularité.¦L’un prépare une mission de trois indices, l’autre un contre-indice inattendu.¦L’un imagine une rencontre de cinéma; l’autre choisit le décor secret.
Le faux alibi¦ludique¦Raconte une anecdote vraie et une inventée; ton partenaire choisit laquelle croire.¦Décris trois endroits où tu pourrais organiser un rendez-vous; un seul te tente vraiment.¦Présente un indice qui pointe vers le mauvais objet, puis corrige avec humour.¦Invente un mot de passe de couple et cache-le dans une phrase.
L'échange de missions¦ludique¦Ton rôle est de provoquer un éclat de rire en moins de deux minutes.¦Ton rôle est de trouver un compliment sans aucun adjectif.¦Ton rôle est de faire choisir une chanson sans prononcer son titre.¦Ton rôle est de transformer un objet banal en cadeau symbolique.
Le pacte des masques¦mystere¦Les deux inventent une règle absurde pour leur prochain dîner et négocient une exception.¦Formulez une promesse farfelue et sa version réalisable.¦Choisissez chacun une couleur secrète qui deviendra un indice.¦Imaginez le nom d’un lieu fictif réservé à vos rendez-vous.
La mise à l'épreuve¦ludique¦Faites une partie de « qui connaît le mieux nos petites habitudes » sans compter les points.¦Interprétez en silence une émotion que l’autre doit reconnaître.¦Invente une mini-enquête à partir de trois objets visibles autour de vous.¦Créez une fausse publicité drôle pour votre couple.
Le choix du complice¦sensuel¦Choisissez ensemble une ambiance douce et testez-la cinq minutes.¦Proposez un moment de proximité confortable et laissez chacun choisir sa place.¦Imaginez une danse où un seul mène la première minute puis les rôles changent.¦Inventez un signe discret pour demander un câlin ou une pause.
Le dévoilement des intentions¦romantique¦Racontez ce qui vous touche le plus quand l’autre prend une initiative.¦Devinez ce que l’autre apprécierait recevoir comme petit mot demain.¦Échangez les rôles et donnez chacun une invitation imaginaire.¦Choisissez une attention que vous voudriez vraiment réaliser.
La dernière mascarade¦finale¦Révélez vos pseudonymes et inventez la prochaine scène de votre histoire.¦Composez ensemble une phrase secrète pour annoncer une envie de rendez-vous.¦Décidez qui organisera la prochaine surprise et quel indice il pourra donner.¦Gardez un seul indice du jeu pour construire un nouveau mystère.`,
 `Incarne le personnage secret et donne son premier indice.¦Devine sa motivation sans chercher à tout dévoiler.
Présente ton alibi avec conviction.¦Pose deux questions avant de révéler ta supposition.
Exécute ton objectif caché avec délicatesse.¦Observe puis propose ta propre mission de remplacement.
Annonce le pacte initial.¦Propose l’amendement qui le rend meilleur pour vous deux.
Choisis la première épreuve.¦Accorde un joker amical puis inversez les rôles.
Décris une proposition qui respecte vos limites.¦Choisis librement si tu veux l’accepter, l’adapter ou passer.
Demande à l’autre sa véritable intention.¦Réponds avec un exemple concret et honnête.
Retire ton masque fictif et révèle ton choix final.¦Ajoute un retournement joyeux pour clôturer le jeu.`),
makeCoffret(3,'Le langage des sens','Un voyage guidé par l’ambiance','sensoriel',
 ['Douceur','Curiosité','Laisser l’ambiance choisir'],
 ['Le dernier sens était l’écoute : choisissez une chanson à retrouver ensemble demain.','Votre rituel sensoriel devient une tradition : créez une ambiance que vous pourrez refaire.','Une dernière minute sans écran : profitez simplement du moment et terminez à votre rythme.'],
 `Le salon transformé¦detente¦Baissez légèrement les lumières et choisissez chacun une texture agréable à toucher.¦Ouvrez une fenêtre un instant et écoutez les bruits du soir.¦Imaginez un refuge idéal et décrivez sa lumière et ses couleurs.¦Choisissez une couverture ou un coussin confortable et installez-vous ensemble.
Le jeu des sons¦romantique¦Faites découvrir une chanson importante et racontez pourquoi elle compte.¦Chacun invente trois sons doux avec des objets ordinaires; devinez leur origine.¦Fermez les yeux quelques secondes pour écouter l’ambiance choisie.¦Créez une petite mélodie en tapotant doucement des doigts.
Le goût des souvenirs¦ludique¦Racontez un repas partagé dont vous vous souvenez encore.¦Imaginez ensemble le menu de votre rendez-vous idéal sans parler du prix.¦Décrivez un goût qui vous rappelle un voyage ou une saison.¦Choisissez une boisson et inventez-lui un nom de cocktail romantique sans obligation d’alcool.
Les mains racontent¦sensuel¦Proposez un massage des mains de deux minutes, seulement si vous le souhaitez tous les deux.¦Essayez de dessiner une petite forme du doigt sur la paume consentante de l’autre.¦Comparez vos textures préférées parmi trois tissus ou objets doux.¦Tenez-vous la main un moment ou choisissez une alternative sans contact.
Le voyage des parfums¦detente¦Associez un parfum familier à un souvenir joyeux, sans rien diffuser.¦Racontez l’odeur d’un endroit où vous aimeriez retourner.¦Imaginez votre parfum d’ambiance idéal et décrivez-le chacun en trois mots.¦Choisissez une fleur, une saison et une matière pour inventer votre décor préféré.
Le rythme partagé¦sensuel¦Bougez doucement sur une musique instrumentale, côte à côte ou enlacés si vous le souhaitez.¦Choisissez une danse lente ou un mouvement drôle et tentez-le ensemble.¦L’un choisit une pulsation en tapant du doigt; l’autre la transforme en rythme.¦Alternez une minute d’écoute silencieuse et une minute de danse improvisée.
L'instant suspendu¦romantique¦Dites-vous chacun ce que vous appréciez dans votre façon de vous retrouver.¦Imaginez un lieu de détente où vous pourriez passer une journée sans programme.¦Choisissez un regard, un mot ou un geste de tendresse à offrir librement.¦Partagez une émotion que la musique de ce soir vous a inspirée.
Votre signature sensorielle¦finale¦Choisissez les trois éléments de l’ambiance que vous aimeriez garder.¦Inventez une recette de soirée parfaite en cinq ingrédients symboliques.¦Racontez ce qui vous a surpris dans vos préférences respectives.¦Donnez un nom à votre ambiance et gardez-la pour un prochain coffret.`,
 `Sélectionne une lumière et un élément du décor.¦Choisis un endroit où tu te sens bien et indique ce que tu préfères.
Démarre une écoute musicale volontaire.¦Décris une émotion ou un souvenir qui te vient.
Propose un souvenir gastronomique.¦Réponds avec ton propre souvenir ou ton envie de découverte.
Demande si un contact léger est bienvenu.¦Confirme librement, propose un autre geste ou passe.
Décris ton univers olfactif sans imposer de parfum.¦Associe-le à une saison ou à un souvenir.
Choisis un rythme confortable pour toi.¦Décide si tu danses, regardes ou écoutes seulement.
Offre un mot chaleureux.¦Réponds avec un détail sincère à ton tour.
Compose l’ambiance finale.¦Choisis ce que vous voudrez conserver pour plus tard.`),
makeCoffret(4,'Les portes de minuit','Trois chemins, des issues imprévisibles','mystere',
 ['Porte tendresse','Porte jeu','Porte mystère'],
 ['La porte finale s’ouvre sur une lettre à écrire à deux pour votre prochaine aventure.','Derrière la dernière porte : chacun choisit un indice de votre futur rendez-vous.','Le passage secret conduit à une pause libre pour profiter simplement de votre soirée.'],
 `Le couloir des choix¦mystere¦Une porte porte le symbole d’une étoile; imaginez ce qu’elle pourrait révéler.¦Une porte porte le symbole d’une plume; inventez son histoire.¦Une porte porte le symbole d’une clé; choisissez une énigme pour l’ouvrir.¦Une porte porte le symbole d’un cœur; devinez sa surprise cachée.
La première serrure¦ludique¦Trois indices décrivent un souvenir commun; à vous de le retrouver.¦Chaque personne imagine une question à laquelle seul le couple peut répondre.¦Inventez un mot de passe constitué de deux qualités complémentaires.¦Complétez une phrase cachée sur votre premier fou rire ensemble.
La salle aux reflets¦romantique¦Partagez une chose que vous admirez discrètement chez l’autre.¦Décrivez votre premier rendez-vous comme si c’était une scène de film.¦Imaginez une photo de vous dans dix ans et racontez son décor.¦Échangez un compliment que vous n’avez jamais formulé ainsi.
L'embranchement invisible¦mystere¦Choisissez de suivre une piste musicale ou une piste de souvenirs.¦Décidez ensemble si le prochain indice sera une devinette ou un petit geste.¦Chacun propose une destination fictive, puis vous en mélangez les détails.¦Inventez trois signes cachés qu’un seul de vous saura reconnaître.
La salle des histoires¦ludique¦Composez à deux une histoire romantique en alternant une phrase chacun.¦Transformez une rencontre imaginaire en comédie avec trois rebondissements.¦Imaginez un bal masqué et donnez chacun un rôle inattendu.¦Inventez un dialogue où deux inconnus découvrent qu’ils se connaissent déjà.
La porte velours¦sensuel¦Choisissez un éclairage doux et un petit moment de proximité souhaité par les deux.¦Faites deviner une musique avec trois mots avant de l’écouter ensemble.¦Chacun indique une attention tendre qu’il aurait plaisir à recevoir.¦Imaginez une danse où chacun décide librement de sa distance.
Le passage secret¦mystere¦Chacun écrit une invitation secrète d’une ligne, puis vous choisissez laquelle vivre plus tard.¦Faites deviner le lieu d’un souvenir à partir d’un seul objet.¦Découvrez quelle petite aventure commune vous aimeriez improviser.¦Choisissez une tradition nocturne à inventer ensemble.
La douzième cloche¦finale¦Donnez un titre à la porte que vous voudriez rouvrir.¦Composez un message mystérieux à vous envoyer lors d’une future soirée.¦Choisissez une petite surprise qui sera révélée dans une semaine.¦Terminez par une phrase à deux, chacun écrivant la moitié.`,
 `Présente les symboles possibles sans imposer de chemin.¦Choisis le symbole qui te parle et explique pourquoi si tu veux.
Cache ton souvenir derrière trois indices.¦Décide quel indice tu souhaites découvrir en premier.
Partage une qualité que tu vois chez l’autre.¦Offre un souvenir qui complète cette image.
Imagine le premier embranchement.¦Choisis la piste que vous suivrez ensemble.
Lance la première phrase de votre scène.¦Ajoute un rebondissement librement.
Demande quel degré de proximité convient.¦Choisis de participer, d’adapter ou de rester simplement à l’écoute.
Propose une piste de surprise future.¦Choisis un indice à conserver pour la prochaine soirée.
Révèle ta porte favorite.¦Décide avec l’autre de la dernière phrase.`),
makeCoffret(5,'Comme au premier rendez-vous','Revivre la magie des premières fois','romantique',
 ['Rire ensemble','Se souvenir','Créer demain'],
 ['Vous venez de vous offrir un nouveau premier rendez-vous : choisissez sa suite dans la vraie vie.','Dernier rendez-vous imaginaire : préparez chacun une invitation pour le mois prochain.','Une nouvelle tradition commence : un soir par mois, vous faites comme si vous veniez de vous rencontrer.'],
 `L'arrivée au rendez-vous¦romantique¦Présentez-vous comme si vous vous rencontriez ce soir dans un café imaginaire.¦Inventez chacun une phrase d’approche drôle, puis choisissez la plus attendrissante.¦Racontez ce que vous avez pensé lors de votre toute première rencontre.¦Imaginez la tenue ou l’objet insolite qui aurait changé votre premier rendez-vous.
Les questions oubliées¦ludique¦Demandez chacun quel était son rêve à dix ans.¦Découvrez une petite passion de jeunesse que l’autre connaît mal.¦Posez une question sur votre première impression respective.¦Racontez quelle activité vous auriez adoré partager plus tôt.
Le café imaginaire¦romantique¦Inventez la carte de boissons d’un café réservé à votre couple.¦Choisissez le dessert qui représente le mieux votre relation.¦Décrivez le plus beau décor pour un rendez-vous improvisé.¦Imaginez une terrasse cachée et donnez-lui un nom.
La balade inattendue¦mystere¦Chacun choisit une direction imaginaire et raconte ce qui s’y trouve.¦Imaginez un détour qui vous mène à un souvenir commun.¦Proposez une escapade gratuite que vous pourriez faire bientôt.¦Créez une mini chasse au trésor de trois objets présents autour de vous.
L'interview renversée¦ludique¦Devinez la réponse de l’autre à une question sur ses goûts actuels.¦Dites chacun ce qui vous surprend encore chez votre partenaire.¦Rejouez un entretien absurde pour obtenir un second rendez-vous.¦Choisissez une qualité qui aurait suffi à vous rendre curieux.
Une danse pour commencer¦sensuel¦Choisissez une chanson lente et dansez une minute, si vous en avez envie.¦Échangez un compliment puis restez ensemble en silence quelques instants.¦Inventez une façon originale de demander une prochaine danse.¦Décidez d’une attention tendre que vous aimeriez offrir.
Les invitations croisées¦romantique¦Chacun prépare une invitation à un rendez-vous possible dans les sept jours.¦Inventez deux sorties surprises, une gratuite et une gourmande.¦Choisissez une activité commune que vous n’avez jamais essayée.¦Décrivez un dimanche parfait sans contrainte d’horaire.
La suite de notre histoire¦finale¦Écrivez une phrase qui pourrait ouvrir le prochain chapitre de votre couple.¦Choisissez ensemble un rendez-vous facile à réaliser prochainement.¦Déposez une promesse d’attention simple pour la semaine.¦Imaginez ce que vous vous raconteriez après dix nouveaux rendez-vous.`,
 `Commence une présentation spontanée.¦Réponds comme si tu découvrais cette personne.
Pose une question curieuse et légère.¦Réponds sincèrement, puis pose une question en retour.
Propose un décor et une gourmandise imaginaire.¦Ajoute un détail surprenant au café rêvé.
Décris le début du chemin.¦Imagine ce que vous trouverez en avançant.
Devine un choix de l’autre.¦Révèle ta véritable préférence sans noter la réponse.
Choisis un moment de rapprochement facultatif.¦Indique ce qui te met à l’aise pour participer.
Rédige ton invitation en secret.¦Prépare aussi la tienne avant la révélation.
Lis la première phrase de la suite.¦Choisis la prochaine action réaliste du couple.`),
makeCoffret(6,"L'enquête amoureuse",'Résoudre une affaire de cœur à deux','mystere',
 ['Analyser les indices','Suivre l’intuition','Improviser'],
 ['Affaire classée : le trésor recherché était un prochain moment à deux que vous venez de choisir.','Le coupable du mystère était le hasard : ouvrez ensemble une nouvelle mission secrète une prochaine fois.','Vous avez résolu l’énigme : écrivez un faux rapport d’enquête tendre sur vos découvertes.'],
 `Le dossier disparu¦mystere¦Votre premier indice est le souvenir d’un endroit aimé; retrouvez lequel.¦Une lettre anonyme parle d’un objet du quotidien; identifiez-le à deux.¦Le dossier contient trois dates importantes; choisissez celle à raconter.¦Un témoin fictif a entendu un rire familier; retrouvez le souvenir associé.
Les témoins secrets¦ludique¦Interrogez-vous tour à tour sur une habitude surprenante.¦L’un invente un témoin loufoque, l’autre le questionne.¦Décrivez un geste tendre comme s’il s’agissait d’un indice crucial.¦Inventez une scène de crime absurde où les biscuits ont disparu.
Le code du coffre¦mystere¦Choisissez trois mots-clés qui décrivent votre bonheur commun.¦Créez un code à partir du nom de votre lieu favori.¦Inventez une suite de quatre symboles ayant une signification secrète.¦Faites deviner un chiffre lié à un souvenir, sans révéler de donnée privée.
La piste musicale¦romantique¦Une chanson cache une émotion; dites chacun laquelle vous ressentez.¦Faites deviner une chanson importante avec trois indices.¦Inventez un refrain tendre de deux phrases.¦Choisissez le style musical qui accompagnerait votre enquête imaginaire.
Les indices contradictoires¦ludique¦Chacun raconte deux versions amusantes d’un même souvenir.¦Choisissez trois descriptions d’un objet; une seule est vraie.¦Imaginez des indices qui accusent faussement un coussin ou une tasse.¦Échangez des hypothèses volontairement improbables pour déclencher un rire.
Le suspect idéal¦romantique¦Décrivez votre partenaire comme un héros de roman policier romantique.¦Chacun révèle une qualité qui rend l’autre irremplaçable dans votre équipe.¦Inventez votre duo de détectives et leurs talents complémentaires.¦Choisissez une compétence que vous aimeriez apprendre ensemble.
Le retournement¦mystere¦Votre véritable enquête porte sur une sortie rêvée; imaginez-la.¦L’ultime indice devient une lettre secrète de reconnaissance.¦La piste mène à une surprise réalisable à la maison.¦Choisissez trois options de finale et mélangez vos idées.
Le rapport final¦finale¦Rédigez une conclusion d’enquête joyeuse en deux phrases.¦Décernez-vous chacun un titre de détective amoureux.¦Décidez quelle énigme vous aimeriez inventer pour un prochain jeu.¦Terminez avec un indice que l’autre découvrira lors d’une future soirée.`,
 `Présente le dossier sans divulguer ta réponse.¦Formule une hypothèse puis écoute un indice.
Incarne un témoin et raconte ton histoire.¦Pose trois questions non accusatoires.
Compose une partie du code secret.¦Trouve la seconde moitié sans la deviner au hasard.
Choisis un son ou une chanson comme indice.¦Explique ce que cette musique évoque pour toi.
Présente une hypothèse extravagante.¦Réponds par une hypothèse encore plus drôle.
Décris une qualité de ton coéquipier.¦Révèle un talent que tu voudrais partager.
Propose le dernier indice.¦Choisis la finale la plus amusante pour vous deux.
Rédige la première phrase du rapport.¦Complète-la et décidez si vous la conservez.`)
];
