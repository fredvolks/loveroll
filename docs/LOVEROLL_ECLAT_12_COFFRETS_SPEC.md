# Éclat — spécification de jeu des douze coffrets

Version 1 — 27 octobre 2026 · Demande approuvée, implémentation à réaliser.

Ce fichier complète LR-ECLAT-001 du prompt maître. Il fixe les décisions de jeu. Work implémente les règles, données et textes ci-dessous; il ne crée pas de nouveaux objectifs, choix, scores, scènes, limites ou finales. Les décisions d’architecture, de mise en page responsive et de composants restent techniques, dans le système visuel de l’Accueil Android. Un manque fonctionnel réellement bloquant se signale précisément; il n’autorise pas à inventer une mécanique.

## A. Contrat commun, fixé pour les douze jeux

### A1. Périmètre et rythme

Les douze noms et identifiants sont conservés. Chaque coffret comprend huit scènes éditoriales, numérotées 1 à 8. Les durées disponibles sont 30, 60 et 90 minutes, indicatives et librement dépassables :

| Durée choisie | Scènes dans l’ordre | Budget indicatif par scène, dans cet ordre |
| --- | --- | --- |
| 30 min | 1, 3, 6, 8 | 5, 8, 12, 5 min |
| 60 min | 1, 2, 3, 5, 6, 8 | 5, 8, 12, 12, 15, 8 min |
| 90 min | 1, 2, 3, 4, 5, 6, 7, 8 | 5, 10, 15, 10, 15, 15, 10, 10 min |

Les scènes 1, 3, 6 et 8 portent un parcours complet. Les autres ajoutent une activité déterminée, jamais une information indispensable manquante dans le parcours court. Afficher « Étape X sur Y » selon le parcours choisi. Aucune attente imposée pour atteindre le budget annoncé; proposer une pause ou la suite lorsque le couple le souhaite. Aucune complétion métier automatique à la fin d’un temps indicatif Éclat.

Chaque coffret possède exactement deux variantes rédigées ici, V0 et V1. Première nouvelle séance : V0; ensuite alterner V1/V0 selon le nombre de séances de ce coffret effectivement commencées dans la nouvelle version. Choix calculé et enregistré une seule fois côté serveur; une reconnexion ne le recalcule pas. Ne pas présenter cette alternance comme des centaines d’histoires. Un couple peut explicitement choisir « Rejouer cette version » depuis son historique; l’interface annonce alors la répétition. Les anciennes séances restent liées à leur ancien contenu.

### A2. Deux personnes, un ou deux téléphones

Le créateur de la séance est A, son partenaire est B. Le rôle initial ne change pas selon le prénom, le genre, le tri d’identifiants ou la personne qui se reconnecte.

- Mode **Un téléphone** : choix explicite avant la séance. L’app présente « Écran pour A », masque le contenu lors de « Passer le téléphone », puis B touche « Je suis prêt ». Un petit jeu privé sur cet appareil partagé reste local et éphémère; ne pas écrire une réponse dans le compte serveur de B en utilisant l’identité de A. Les créations communes seules peuvent être enregistrées après l’accord des deux. Prévenir simplement qu’un appareil partagé ne garantit pas un secret absolu.
- Mode **Deux téléphones** : les deux comptes du même couple rejoignent la séance. Les réponses privées appartiennent uniquement à leur auteur. La révélation attend les deux validations explicites nécessaires au jeu; un appareil ne valide pas à la place de l’autre. Une saisie n’est pas une autorisation de partage.
- Pour une scène commune orale, le contrôleur de séance touche une seule fois « Continuer ensemble » après l’accord oral des deux. Les opérations serveur restent soumises aux droits du couple. Ce raccourci ne vaut pas consentement implicite à un contact ou partage privé.
- Dans les jeux nécessitant une révélation, chaque personne touche « Prêt à révéler » lorsque ses choix sont terminés. Révéler seulement les éléments annoncés. Aucune obligation d’enregistrer une note ni quatre confirmations identiques après chaque scène.

### A3. Commandes communes et protection des données

Toujours accessibles : **Pause**, **Passer ce moment**, aide contextuelle et retour. Pause conserve la séance et ne la clôt pas. « Arrêter cette séance » demande confirmation et clôt la séance comme interrompue, sans inventer de réussite; aucun effacement des archives. Changer d’onglet n’arrête pas le jeu.

« Passer ce moment » met fin à l’activité en cours, efface ses secrets temporaires non partagés et ouvre la scène suivante du parcours choisi. Aucun coût de passe, aucune pénalité, aucune mutation des défis D100. Si une donnée nécessaire à une branche a été passée, appliquer uniquement le repli précisé dans le coffret, sans afficher la réponse de l’autre. La scène 8 peut toujours terminer proprement la séance.

Pour une proposition de contact : présenter les trois réponses **Oui / Une autre proposition / Passer**; un Oui n’est valable que pour cette proposition et peut être retiré. En mode partagé, laisser les deux personnes confirmer oralement avant le bouton commun. En mode deux téléphones, les deux Oui sont nécessaires. Aucun chronomètre, correspondance ou historique ne remplace cet accord.

Les réponses orales ne sont pas enregistrées, transcrites ou analysées. Une note privée est facultative et n’est visible que pour son auteur; elle ne devient jamais automatiquement un souvenir commun. L’app n’évalue pas les émotions, la fidélité ou la qualité du couple. Les énigmes ont une solution de fiction; les réponses personnelles n’ont pas de bonne ou mauvaise réponse.

La finale offre **Terminer**, **Garder un souvenir**, **Rejouer plus tard**. Le souvenir commun facultatif comprend un titre libre de 80 caractères et une phrase libre de 280 caractères, avec aperçu et confirmation des deux avant sauvegarde. Pas de rappel, Push ou événement créé par défaut. Un souvenir n’est pas un score.

### A4. Types de scènes et textes

Les tableaux suivants sont les consignes à afficher, avec remplacement des seules variables indiquées. Les joueurs fournissent leurs propres réponses lorsque la consigne le demande; cela ne délègue aucune conception de jeu à Work. Les textes d’aide, boutons et annonces communs peuvent être relus grammaticalement sans changer leur sens; les consignes de jeu ne sont pas générées par une IA à l’exécution.

Types autorisés : **Commun** (activité orale, une progression commune), **Secret** (préparation privée, puis révélation voulue), **Choix** (options énumérées, conséquence définie), **Énigme** (données et solution fixées), **Minuteur** (facultatif, arrêt/pause/reprise), **Finale**. Chaque titre de scène apparaît avec sa consigne; les aides restent à la demande. Aucun achat ou accessoire spécialisé requis.

## 01 — Les cinq secrets · LR-ECLAT-01

**Promesse :** cinq enveloppes personnelles, des indices et une dernière invitation commune. Matériel : aucun. Variante de scénario du pilote précédemment appelé « Le rendez-vous secret »; ne pas créer un treizième coffret.

Pour chaque enveloppe, les deux personnes préparent leur réponse. L’ordre est A puis B pour les enveloppes impaires, B puis A pour les paires. Chacun peut donner jusqu’à trois indices, l’autre jusqu’à deux propositions; l’auteur décide ensuite de révéler ou de passer. Aucun point. L’app ne lit pas ni ne juge une réponse orale.

| Enveloppe | V0 — Nos souvenirs | V1 — Nos prochaines surprises |
| --- | --- | --- |
| 1 | Un petit moment heureux vécu ensemble, sans annoncer d’abord le lieu | Un endroit proche où tu aimerais passer une heure à deux |
| 2 | Une attention de l’autre qui t’a marqué | Une petite attention sans achat que tu aimerais préparer |
| 3 | Un objet ordinaire associé à un souvenir commun | Un objet de la maison qui pourrait servir à une surprise |
| 4 | Un souvenir qui te fait encore rire | Une activité légère que tu aimerais essayer ensemble |
| 5 | Une attention que tu aimerais retrouver cette semaine | Une invitation réaliste que tu souhaites proposer |

| Scène | Type | Consigne fixe |
| --- | --- | --- |
| 1 | Secret | « Ouvrez l’enveloppe 1. Préparez chacun votre réponse au thème affiché, puis faites-la découvrir avec vos indices. L’écriture est facultative. » |
| 2 | Commun | « Choisissez ensemble un nom pour votre boîte à secrets. Chacun propose un nom; retenez-en un ou assemblez les deux. » |
| 3 | Secret | « Ouvrez l’enveloppe 2. Décrivez votre attention par un objet, un lieu et un geste, sans nommer directement votre réponse. » |
| 4 | Commun | « Reprenez une réponse déjà révélée. Chacun invente un titre de film pour ce moment; choisissez votre titre commun. » |
| 5 | Commun | « Chacun imagine comment prolonger l’une des découvertes avec ce qui est déjà à la maison. Faites une proposition concrète, sans achat et sans obligation de la réaliser. » |
| 6 | Secret | « Ouvrez les enveloppes 3 puis 4. Pour chacune, faites vos deux tours d’indices et de révélation avant de passer à la suivante. » |
| 7 | Commun | « Choisissez votre indice préféré de la soirée. Transformez-le ensemble en une courte devinette qui vous ressemble. » |
| 8 | Finale | « Ouvrez l’enveloppe 5. Chacun propose son invitation. Retenez une proposition, combinez-les ou terminez simplement avec ce que vous avez découvert. » |

Finale après invitation commune : « Cinq enveloppes, et un nouveau moment à vous. Votre prochaine invitation reste un choix, jamais une obligation. » Sans invitation retenue : « Vos secrets ont ouvert la conversation. Vous pouvez refermer le coffret sans rien promettre. » Si une enveloppe est passée, aucune réponse n’est exigée pour continuer; la numérotation des cinq enveloppes reste visible, avec mention « Passée » sans score.

## 02 — Le double jeu · LR-ECLAT-02

**Promesse :** accomplir des missions légères, découvrir l’intention de l’autre, puis échanger les rôles. Matériel : deux petits objets distincts et du papier facultatif. Les deux savent dès le départ qu’ils jouent à des missions secrètes; elles ne continuent jamais hors de la séance.

Chaque manche suit : lire sa mission en privé → conversation/jeu oral → « Révéler nos missions ». La personne concernée confirme oralement si le mot ou le geste a eu lieu. Aucun classement ni analyse automatique. Une manche peut être terminée sans accomplir sa mission.

| Donnée | V0 | V1 |
| --- | --- | --- |
| Manche 1 | A essaie de faire prononcer « soleil » à B; B essaie de faire prononcer « lune » à A | A essaie de faire prononcer « cinéma » à B; B essaie de faire prononcer « musique » à A |
| Contrainte M1 | Pas le droit de prononcer son propre mot cible ni de demander directement de le répéter | Même contrainte |
| Manche 2 | Après inversion, A fait placer l’objet de B à gauche d’une feuille; B fait placer l’objet de A à droite | A fait placer l’objet de B sur une feuille; B fait placer l’objet de A à côté de la feuille |
| Contrainte M2 | Ne pas toucher l’objet de l’autre; proposer uniquement des déplacements volontaires | Même contrainte |
| Bonus long | Faire deviner « étoile » avec trois mots au maximum | Faire deviner « voyage » avec trois mots au maximum |

| Scène | Type | Consigne fixe |
| --- | --- | --- |
| 1 | Secret | « Découvrez votre mission de mots. Parlez d’un rendez-vous imaginaire; chacun tente sa mission sans annoncer son objectif. Révélez ensuite vos deux mots. » |
| 2 | Commun | « Chacun invente un pseudonyme et se présente en une phrase. Gardez ces noms seulement pour ce jeu. » |
| 3 | Secret | « Rejouez les missions de mots en échangeant les cibles : A reçoit celle de B et B celle de A. Changez votre conversation : vous préparez maintenant un cadeau imaginaire. » |
| 4 | Commun | « Chacun raconte deux petites anecdotes légères : une vraie et une inventée. L’autre propose laquelle est vraie; révélez sans compter de points. » |
| 5 | Commun | « Préparez deux objets et une feuille. Chacun présente son objet comme s’il s’agissait d’un accessoire extraordinaire, en trois phrases au maximum. » |
| 6 | Secret | « Lisez vos missions d’objets. Proposez les déplacements sans toucher l’objet de l’autre. Quand vous le décidez ensemble, révélez les missions. » |
| 7 | Commun | « Jouez le bonus affiché : chacun donne jusqu’à trois mots d’indices, sans prononcer la réponse cible. Puis échangez les rôles. » |
| 8 | Finale | « Chacun raconte la tentative qui l’a le plus amusé. Inventez ensemble un mot de passe de deux mots pour une prochaine soirée. Vous pouvez aussi terminer sans en garder. » |

Finale fixe : « Le double jeu est dévoilé. Ce qui compte reste votre façon de jouer ensemble. » Si une mission est passée ou un objet indisponible, proposer la mission orale de la scène 3 avec les mêmes cibles; ne pas générer une nouvelle mission. Le bonus n’est requis pour aucune solution.

## 03 — Le langage des sens · LR-ECLAT-03

**Promesse :** créer une ambiance commune à partir d’activités sensorielles simples. Aucune dégustation, diffusion de parfum, obscurité ou contact imposés. Le couple utilise ce qu’il possède; toutes les activités peuvent être décrites à voix haute plutôt que réalisées.

V0 : **Un refuge à deux**, objets proposés « tissu doux, petit objet lisse, verre ou tasse vide ». V1 : **Notre escale imaginaire**, objets proposés « feuille de papier, petit objet familier, coussin ». Ce sont des suggestions facultatives, jamais des prérequis.

| Scène | Type | Consigne fixe |
| --- | --- | --- |
| 1 | Commun | « Choisissez une place confortable. Chacun choisit une texture parmi les objets disponibles, la décrit sans la montrer puis la révèle. Si vous n’avez pas d’objet, décrivez une texture de mémoire. » |
| 2 | Commun | V0 : « Imaginez la lumière de votre refuge : bougie imaginaire, lampe douce ou lumière du matin. Choisissez-en une ensemble. » V1 : « Imaginez votre escale : lever de soleil, ciel étoilé ou fin d’après-midi. Choisissez une lumière ensemble. » |
| 3 | Commun | « Chacun produit deux sons légers avec ses mains ou un objet. L’autre essaie d’en identifier l’origine. Pas de bruit fort, de prise de son ou de recherche de performance. » |
| 4 | Commun | V0 : « Racontez chacun l’odeur d’un lieu où vous vous sentez bien. Rien à diffuser ou à sentir sur place. » V1 : « Décrivez l’odeur d’une saison qui vous plaît, puis imaginez où elle vous emmène. » |
| 5 | Commun | V0 : « Inventez ensemble une boisson imaginaire pour votre refuge : trois ingrédients symboliques et un nom. » V1 : « Inventez le menu symbolique de votre escale : une couleur, un son et une texture. » |
| 6 | Choix | « Choisissez ensemble : comparer vos textures / proposer un massage des mains / rester côte à côte en silence. » Comparer : chacun présente un objet ou sa description pendant un tour. Massage : accord des deux, deux minutes par personne, arrêt immédiat sur demande; alternative sans contact = décrire la texture. Silence : deux minutes indicatives, sans contact requis. |
| 7 | Commun | « Chacun choisit un son, une lumière et une texture de cette soirée. Dites ce que vous aimeriez retrouver une autre fois. » |
| 8 | Finale | « Donnez un nom à votre ambiance et choisissez ses trois éléments. Vous pouvez les garder en souvenir ou simplement les dire. » |

Finale : V0 « Votre refuge a maintenant une lumière, un son et une texture. Il peut vous retrouver quand vous le souhaitez. » V1 « Votre escale existe dans vos trois choix. Vous pouvez y revenir sans avoir à partir. » Si la scène 6 est passée, la finale utilise les choix déjà exprimés, sans inventer une préférence.

## 04 — Les portes de minuit · LR-ECLAT-04

**Promesse :** choisir une porte qui change réellement deux activités centrales et la finale. Le choix est commun et explicite : **Tendresse / Jeu / Mystère**. Aucun résultat aléatoire ni vote secret ne remplace un désaccord; le couple peut choisir ensemble une autre porte ou passer. Repli si le choix est passé : branche Jeu, annoncée avant de continuer.

V0 : **L’hôtel de minuit**. V1 : **Le jardin des étoiles**. Dans la version V1, les portes s’appellent « Allée Tendresse », « Allée Jeu », « Allée Mystère »; même fonction, scènes différentes ci-dessous.

| Scène | Type | Consigne fixe |
| --- | --- | --- |
| 1 | Choix | V0 : « Trois portes s’ouvrent dans l’hôtel : Tendresse, Jeu et Mystère. Choisissez ensemble la porte que vous voulez explorer. » V1 : « Trois allées traversent le jardin : Tendresse, Jeu et Mystère. Choisissez votre chemin. » |
| 2 | Commun | V0 : « Inventez le nom de votre hôtel et une particularité de sa réception. » V1 : « Inventez le nom du jardin et une particularité de son entrée. » |
| 3 | Commun | Jouer l’activité A de la branche, dans le tableau suivant. |
| 4 | Commun | V0 : « À la réception, chacun laisse un message imaginaire de cinq mots pour l’autre. Lisez-les à voix haute. » V1 : « Sur un banc, chacun laisse un message imaginaire de cinq mots pour l’autre. Lisez-les à voix haute. » |
| 5 | Choix | « Garder notre porte / Explorer une autre porte ». La seconde option permet de choisir l’une des deux autres; l’activité A reste dans l’historique, seule l’activité B et la finale suivent la nouvelle branche. |
| 6 | Commun | Jouer l’activité B de la branche actuellement choisie. |
| 7 | Commun | V0 : « Inventez l’objet que vous laisseriez dans la chambre comme souvenir de cette aventure. » V1 : « Inventez l’objet que vous cacheriez dans le jardin comme souvenir de cette aventure. » |
| 8 | Finale | Lire la finale de la branche actuelle, puis proposer le souvenir facultatif commun. |

| Branche | Activité A — V0 / V1 | Activité B — V0 / V1 | Finale — V0 / V1 |
| --- | --- | --- | --- |
| Tendresse | Raconter une attention quotidienne appréciée / Raconter une petite attention qui ferait du bien cette semaine | Chacun propose un mot à offrir demain / Chacun compose une invitation pour dix minutes à deux | « La porte s’ouvre sur une attention à offrir. » / « Votre allée mène à un petit rendez-vous choisi. » |
| Jeu | Inventer à tour de rôle la réception de l’hôtel, une phrase chacun pendant quatre tours / Inventer une créature bienveillante du jardin, une caractéristique chacun pendant quatre tours | Jouer une fausse publicité de trente secondes pour l’hôtel / Jouer une visite guidée de trente secondes de votre jardin | « Votre hôtel possède maintenant sa propre histoire. » / « Votre jardin possède maintenant ses propres merveilles. » |
| Mystère | A choisit en secret un objet visible et donne trois indices à B, puis inversion / A choisit en secret un lieu connu et donne trois indices à B, puis inversion | Composer une devinette commune dont la réponse est « rendez-vous » / Composer une devinette commune dont la réponse est « étoile » | « Vous repartez avec un rendez-vous caché dans les mots. » / « Vous repartez avec une étoile cachée dans les mots. » |

Une activité passée est simplement marquée passée. Il n’existe pas de branche « perdue », de finale meilleure ni de récompense liée au rapprochement.

## 05 — Comme au premier rendez-vous · LR-ECLAT-05

**Promesse :** refaire connaissance dans une mise en scène légère, puis se proposer une attention réelle ou imaginaire. Aucun personnage, faux profil ou trait psychologique généré par l’app.

| Donnée | V0 — Le café retrouvé | V1 — Le rendez-vous improvisé |
| --- | --- | --- |
| Question A | « Qu’est-ce qui te donne envie de prolonger une conversation ? » | « Quelle petite aventure aimerais-tu essayer un jour ? » |
| Question B | « Quel détail d’une première rencontre remarques-tu ? » | « Quelle activité gratuite te ferait sortir de la routine ? » |
| Question C | « Quel petit plaisir aimerais-tu faire découvrir ? » | « Quel endroit proche aimerais-tu regarder autrement ? » |
| Attention proposée A | Un petit mot / une boisson préparée avec ce qui est disponible / cinq minutes d’écoute | Un dessin improvisé / une invitation à marcher / cinq minutes de jeu de devinettes |

| Scène | Type | Consigne fixe |
| --- | --- | --- |
| 1 | Commun | « Imaginez que vous vous retrouvez pour un premier rendez-vous. Présentez-vous chacun avec votre prénom et une chose simple qui vous plaît aujourd’hui. » |
| 2 | Commun | V0 : « Inventez ensemble le nom du café et votre commande imaginaire. » V1 : « Choisissez le point de rencontre imaginaire : parc, quai ou petite place. Chacun décrit un détail. » |
| 3 | Commun | « Répondez à tour de rôle aux questions A et B affichées. A commence pour A, B commence pour B. Vous pouvez passer une question sans justification. » |
| 4 | Commun | « Chacun raconte une première impression dont il garde un souvenir agréable. Vous pouvez choisir une rencontre fictive si vous préférez. » |
| 5 | Commun | « Répondez à la question C, puis chacun demande un seul détail qu’il souhaite mieux comprendre. » |
| 6 | Choix | « A propose une attention parmi les trois affichées. B choisit Oui / Une autre proposition / Passer. Puis inversez les rôles. Une proposition peut rester imaginaire. » Ne rien commander, réserver ou acheter. |
| 7 | Commun | « Chacun compose une phrase qui donnerait envie de vous revoir. Dites-la à voix haute, sans noter la réponse de l’autre. » |
| 8 | Finale | « Choisissez : imaginer notre prochain rendez-vous / garder une phrase de ce soir / terminer ici. » Imaginer : titre libre facultatif, aucune réservation ou programmation automatique. Garder : souvenir commun A3. |

Finale fixe : « Vous vous connaissez déjà, mais il reste des façons de vous retrouver. Ce rendez-vous peut se terminer sans promesse. » Si une attention est refusée, elle n’apparaît pas comme un échec et n’est pas conservée comme préférence.

## 06 — L’enquête amoureuse · LR-ECLAT-06

**Promesse :** résoudre ensemble une invitation fictive en retrouvant un lieu, une heure et un code. Tout ce qui sert à la solution est écrit ci-dessous; aucun indice ni énigme à inventer par Work. Matériel : aucun. Les deux partenaires reçoivent des informations complémentaires; en mode partagé, ils lisent chacun leur dossier puis racontent ce qu’ils ont retenu. Ils peuvent toujours le relire.

### Dossiers fixés

V0 — **L’invitation de l’hôtel de minuit**. Message d’ouverture : « Une enveloppe vous attend dans l’hôtel. Pour la retrouver, déterminez le lieu, l’heure et le code du petit coffret. »

Tableau des lieux V0 : Jardin = fontaine oui, horloge non; Salon = fontaine non, horloge oui; Verrière = fontaine oui, horloge oui; Bibliothèque = fontaine non, horloge non.

- Indice privé A : « Le rendez-vous est dans un lieu avec une fontaine. La cloche a sonné à 21 h 10. Le code du coffret contient le chiffre 4. »
- Indice privé B : « Le rendez-vous est dans un lieu avec une horloge. Il commence vingt minutes après la cloche. Le code du coffret contient le chiffre 2. »
- Codes proposés : **247 / 481 / 629**.
- Solution : **Verrière · 21 h 30 · 247**.
- Lettre finale : « Votre vraie invitation était le temps pris pour chercher ensemble. Choisissez une petite attention à vous offrir après cette enquête. »

V1 — **Le courrier du jardin des étoiles**. Message d’ouverture : « Un courrier a été déposé dans le jardin. Retrouvez son lieu, son heure et le code de son écrin. »

Tableau des lieux V1 : Kiosque = lanterne oui, banc non; Roseraie = lanterne non, banc oui; Pavillon = lanterne oui, banc oui; Fontaine = lanterne non, banc non.

- Indice privé A : « Le courrier est près d’une lanterne. Le carillon a sonné à 20 h 15. Le code contient le chiffre 5. »
- Indice privé B : « Le courrier est près d’un banc. Le rendez-vous commence trente minutes après le carillon. Le code contient le chiffre 6. »
- Codes proposés : **315 / 562 / 627**.
- Solution : **Pavillon · 20 h 45 · 562**.
- Lettre finale : « Le jardin vous laisse un dernier choix : garder un souvenir de l’enquête ou inventer votre prochaine petite aventure. »

### Déroulement

| Scène | Type | Consigne fixe |
| --- | --- | --- |
| 1 | Secret | Lire le message d’ouverture, distribuer les deux dossiers privés et afficher le tableau public des lieux. « Chacun lit son dossier. Vous pouvez ensuite partager les indices à voix haute. » |
| 2 | Énigme | Bonus indépendant : V0 affiche « 14-15-21-19 » avec A=1…Z=26; réponse NOUS. V1 affiche « 4-5-21-24 » avec la même clé; réponse DEUX. Montrer la solution seulement sur demande; le bonus n’influence pas les trois réponses principales. |
| 3 | Énigme | « Croisez vos informations pour trouver le lieu et l’heure. » Sélectionner un lieu dans le tableau et une heure parmi : V0 21 h 10 / 21 h 20 / 21 h 30 / 21 h 40; V1 20 h 15 / 20 h 30 / 20 h 45 / 21 h 00. La validation correcte donne « Le lieu et l’heure correspondent aux deux dossiers. » |
| 4 | Commun | « Présentez une théorie volontairement farfelue en une phrase chacun, puis revenez aux indices du dossier. » Ce jeu de parole ne modifie pas la solution. |
| 5 | Énigme | Bonus indépendant : V0 affiche « ERTTEL AL ERVUO »; lire de droite à gauche → OUVRE LA LETTRE. V1 affiche « NIDRAJ EL SNAD » → DANS LE JARDIN. Les accents ne sont pas requis. |
| 6 | Énigme | « Trouvez le seul code qui satisfait vos deux indices. » Trois boutons correspondant aux codes du dossier. Une bonne réponse ouvre l’enveloppe; une autre répond « Ce code ne respecte pas les deux indices. Vous pouvez réessayer ou demander une aide. » |
| 7 | Commun | « Chacun raconte quel indice lui a permis de changer d’idée. Aucun compte de bonnes réponses : vous avez cherché ensemble. » |
| 8 | Finale | Afficher lieu, heure et code du dossier, puis la lettre finale. Si une énigme a été passée ou sa solution révélée, annoncer « Résolution avec aide » sans score ni défaite. |

Bouton Aide, pour la scène 3 : premier niveau « Cherchez le lieu qui possède les deux éléments de vos dossiers. Additionnez le délai à l’heure du signal. » Deuxième niveau = solution du lieu et de l’heure. Pour la scène 6 : premier niveau « Éliminez les codes qui ne contiennent pas les deux chiffres indiqués. » Deuxième niveau = solution du code. Aucun nombre d’essais maximum, aucune minuterie imposée, aucune donnée essentielle enfermée dans une scène facultative.

## 07 — À ta place · LR-ECLAT-07

**Promesse :** découvrir les préférences de l’autre grâce à cinq situations concrètes. Pour chaque question, chacun sélectionne sa réponse personnelle et prédit celle de l’autre parmi les trois options affichées. « Prêt à révéler » valide l’ensemble pour cette question. Une fois les deux prêts, afficher les réponses et prédictions avec « Comme tu l’imaginais » ou « Une découverte », jamais de score, pourcentage de compatibilité ou bilan des erreurs. Chaque question peut être passée; ne rien révéler dans ce cas.

| Question | V0 — Nos petits plaisirs | V1 — Nos petites aventures |
| --- | --- | --- |
| Q1 | « Pour une heure libre à deux ? » Marcher / Écouter de la musique / Jouer | « Pour un détour improvisé ? » Un parc / Une ruelle tranquille / Un point de vue |
| Q2 | « Pour recevoir une attention ? » Un petit mot / Une aide concrète / Du temps ensemble | « Pour préparer un souvenir ? » Une photo / Une phrase / Un petit objet symbolique |
| Q3 | « Pour une soirée tranquille ? » Une conversation / Un film choisi ensemble / Une création à deux | « Pour explorer un endroit ? » Suivre un chemin / Choisir au hasard à chaque croisement / Préparer deux arrêts |
| Q4 | « Pour une petite surprise ? » Un indice / Une invitation directe / Une découverte sur place | « Pour une prochaine sortie ? » La nature / La culture / Un jeu à deux |
| Q5 | « Pour terminer ce soir ? » Une chanson / Un mot doux / Un moment calme | « Pour garder l’envie de repartir ? » Choisir un lieu / Choisir une date indicative / Garder la surprise |

| Scène | Type | Consigne fixe |
| --- | --- | --- |
| 1 | Secret | « Choisissez vos réponses et vos prédictions pour Q1. Quand vous êtes prêts à les partager, révélez ensemble. Chacun peut expliquer ce qui l’attire aujourd’hui. » |
| 2 | Commun | « Chacun raconte une situation récente où sa préférence était différente. Une envie du jour ne définit pas une personne. » |
| 3 | Secret | « Jouez Q2 puis Q3. Révélez et échangez après chaque question, sans chercher à corriger la réponse de l’autre. » |
| 4 | Commun | « Chacun invente une situation légère où il aimerait essayer la réponse de l’autre. Racontez-la sans nouvelle prédiction enregistrée. » |
| 5 | Commun | « Choisissez une réponse déjà révélée. Chacun propose comment en faire une attention simple, puis laissez l’autre dire ce qu’il en pense. » |
| 6 | Secret | « Jouez Q4 puis Q5. Pour la dernière, chacun peut proposer une autre façon de terminer à voix haute. » Les trois options numériques restent celles de Q5; l’alternative orale n’est pas analysée. |
| 7 | Commun | « Chacun complète à voix haute : “Ce soir, j’ai découvert que tu…” Vous pouvez simplement dire “je passe”. » |
| 8 | Finale | « Choisissez ensemble une petite attention inspirée de vos réponses, ou terminez ici. Aucun résultat ne résume votre couple. » |

Finale fixe : « Vous n’avez pas besoin de penser pareil pour continuer à vous découvrir. » Le souvenir facultatif est une phrase commune; ne pas y copier automatiquement les réponses et prédictions privées. Si toutes les questions sont passées, le coffret peut se terminer avec ce même message, sans activité imposée.

## 08 — Notre bande originale · LR-ECLAT-08

**Promesse :** retrouver des souvenirs à travers des chansons choisies par les joueurs, puis composer une liste de cinq titres. L’app ne fournit pas de paroles, d’enregistrement musical commercial, de reconnaissance audio ni de connexion obligatoire à un service musical. Les joueurs peuvent rester sans musique et simplement raconter les titres.

Chaque thème : A choisit un titre et donne trois indices maximum, B fait deux propositions maximum; A révèle s’il le souhaite, puis inversion. Un indice peut concerner un souvenir, un style ou un instrument, sans citation de paroles nécessaire. Chacun peut noter son titre en privé; ces notes ne sont pas partagées par défaut.

| Thème | V0 — La bande originale de notre histoire | V1 — La bande originale de notre prochaine aventure |
| --- | --- | --- |
| T1 | Une chanson associée à une rencontre | Une chanson pour prendre le départ |
| T2 | Une chanson associée à un trajet | Une chanson pour explorer un lieu |
| T3 | Une chanson qui donne envie de sourire | Une chanson pour jouer ou improviser |
| T4 | Une chanson qui aide à ralentir | Une chanson pour une pause ensemble |
| T5 | Une chanson à retrouver un autre soir | Une chanson pour le retour |

| Scène | Type | Consigne fixe |
| --- | --- | --- |
| 1 | Secret | « Choisissez une chanson pour T1, faites vos deux tours d’indices puis racontez pourquoi elle vous est venue. Vous pouvez jouer sans lancer de musique. » |
| 2 | Commun | « Inventez le nom de votre radio à deux. Chacun prononce une phrase pour présenter l’émission de ce soir. » |
| 3 | Secret | « Jouez T2 puis T3, un thème après l’autre. Après chaque révélation, chacun raconte le souvenir ou la scène qui accompagne sa chanson. » |
| 4 | Commun | « Présentez une chanson déjà révélée comme si elle ouvrait un film sur vous deux. Décrivez la scène, sans devoir interpréter le morceau. » |
| 5 | Choix | « Écouter un titre que nous avons choisi / Raconter la scène en silence musical ». Première option : les joueurs démarrent volontairement leur propre source musicale; l’app n’en garantit ni disponibilité ni synchronisation. Seconde : chacun décrit un détail de sa scène. |
| 6 | Secret | « Jouez T4 puis T5. Pour chaque thème, dites si vous aimeriez retrouver cette chanson une autre fois. » |
| 7 | Commun | « Chacun joue le rôle de l’animateur de votre radio pendant trente secondes indicatives et présente son moment préféré de la soirée. » |
| 8 | Finale | « Choisissez jusqu’à cinq titres révélés pour votre bande originale. L’ordre est libre et chaque personne doit être d’accord avec la liste partagée. Vous pouvez terminer sans sauvegarder. » |

Finale V0 : « Votre histoire possède maintenant quelques titres à retrouver. » Finale V1 : « Votre prochaine aventure possède maintenant sa bande originale. » Une liste enregistrée ne contient que titre et artiste saisis par les joueurs, sans copie de fichiers. Aucun accès externe ou lecture ne démarre automatiquement. Si aucun titre n’est révélé, remplacer la proposition de liste par le souvenir commun A3.

## 09 — Le coffre des envies · LR-ECLAT-09

**Promesse :** découvrir une proposition que les deux ont spontanément choisie, sans exposer le reste. Ce jeu emploie uniquement les deux jeux de douze cartes ci-dessous. Aucun classement automatique de texte libre ou extension générée.

| Carte | V0 — Petites attentions | V1 — Petites aventures |
| --- | --- | --- |
| 1 | Préparer une boisson avec ce qui est disponible | Faire une promenade de dix minutes |
| 2 | Écrire un petit mot pour demain | Imaginer une sortie gratuite |
| 3 | Écouter une chanson choisie ensemble | Inventer une chasse à trois indices à la maison |
| 4 | Jouer à trois devinettes | Découvrir un endroit proche sur une carte sans réserver |
| 5 | Regarder un album de souvenirs choisi ensemble | Créer une petite carte postale imaginaire |
| 6 | Préparer un repas simple une autre fois | Inventer un pique-nique avec ce qu’on possède |
| 7 | Proposer un massage des mains | Proposer une danse lente ou un mouvement côte à côte |
| 8 | Se tenir la main un moment | Proposer un câlin ou une alternative sans contact |
| 9 | Partager cinq minutes d’écoute sans interruption | Raconter à tour de rôle une journée idéale sans achat |
| 10 | Dessiner un petit symbole pour l’autre | Donner une nouvelle fonction imaginaire à un objet |
| 11 | Passer dix minutes côte à côte sans téléphone | Observer ensemble ce qui est visible depuis une fenêtre |
| 12 | Choisir une attention à offrir cette semaine | Imaginer une invitation surprise sans fixer d’obligation |

Chaque personne marque de zéro à trois cartes **J’en ai envie**. Les autres restent **Pas maintenant**; elles ne sont pas révélées. « Valider ma sélection » autorise uniquement la comparaison, pas la réalisation. L’intersection des choix est calculée côté serveur et renvoie uniquement les cartes communes, dans l’ordre des numéros. Aucun nombre de refus, liste non commune, total personnel ou identité de l’auteur d’un refus n’est transmis au partenaire.

| Scène | Type | Consigne fixe |
| --- | --- | --- |
| 1 | Secret | « Choisissez en privé jusqu’à trois idées qui vous tentent aujourd’hui. Vous pouvez n’en choisir aucune. Seules les idées communes pourront apparaître. » Afficher les douze cartes de la variante. |
| 2 | Commun | « Chacun peut décrire à voix haute l’ambiance qu’il aimerait pour ce soir. Il n’est pas nécessaire de raconter ses cartes. » |
| 3 | Choix | Si intersection non vide : « Voici vos idées communes. Choisissez ensemble celle que vous voulez explorer. » Sélection commune parmi les cartes retournées. Si vide : « Aucune idée commune à révéler aujourd’hui. Vous pouvez discuter librement ou continuer sans proposition. » Boutons **Discuter cinq minutes / Continuer sans proposition**. |
| 4 | Commun | « Inventez un nom pour votre coffre. Chacun propose un mot; assemblez-les si vous en avez envie. » Ne pas demander d’indices sur les sélections privées. |
| 5 | Choix | Si carte retenue : « La vivre maintenant / En parler pour une autre fois / Passer ». Sans carte : conversation facultative « Quelle ambiance vous ferait du bien, sans parler des cartes ? » puis continuer. Aucun rappel automatique. |
| 6 | Choix | Si carte retenue : afficher sa consigne ci-dessous et demander l’accord pour cette proposition. Sans carte : « Choisissez une conversation calme ou un moment côte à côte sans contact; vous pouvez aussi passer. » |
| 7 | Commun | « Dites chacun ce qui a rendu le choix confortable pour vous. Vous pouvez passer et vos sélections restent privées. » |
| 8 | Finale | « Garder une invitation commune / Terminer sans souvenir ». Une invitation reprend uniquement la carte effectivement retenue et confirmée, avec phrase commune facultative. Effacer les sélections non partagées des données de séance à sa clôture, sans journal contenant leur contenu. |

Consigne de la scène 6 : « Vous avez choisi : {titre de la carte}. Décidez ensemble de la façon de la vivre. Vous pouvez adapter, préférer une version sans contact ou passer. » Les cartes 7 et 8 de chaque variante utilisent obligatoirement le protocole d’accord A3. Les autres activités exigent aussi un choix commun de participation. Aucune ouverture de carte, réservation, achat ou modification d’un réglage externe automatique.

Finale avec invitation : « Une envie commune devient une invitation, à votre rythme. » Sans invitation : « Le coffre peut se refermer sans rien dévoiler ni promettre. » Une intersection n’est jamais annoncée comme un consentement. Le mode partagé garde les sélections sur l’appareil jusqu’à la révélation commune, sans les persister dans le compte privé de la mauvaise personne.

## 10 — Le compte à rebours · LR-ECLAT-10

**Promesse :** des missions de création courtes, jouées ensemble avec des pauses. Bouton **Avec minuteur / Sans minuteur**, choix mémorisé pour la séance. Les temps ci-dessous mesurent seulement les manches, pas la durée complète de la soirée. À zéro, afficher « Le temps indicatif est écoulé » et proposer **Prolonger 1 minute / Voir la suite**; aucune soumission ou complétion automatique. Pause/reprise fiables; aucun score d’échec.

| Scène | Type | V0 — L’atelier express | V1 — L’impro express |
| --- | --- | --- | --- |
| 1 | Minuteur | « Trouvez ensemble cinq petites choses agréables à faire à deux, en alternant les réponses. » 90 secondes | « Imaginez cinq titres pour un film sur une soirée à deux, en alternant les réponses. » 90 secondes |
| 2 | Commun | « Choisissez une réponse de la manche précédente et racontez ce qui vous plaît dans cette idée. » | « Choisissez un titre et racontez chacun une scène qu’il vous évoque. » |
| 3 | Minuteur | « Créez une invitation de dix mots, à voix haute ou sur papier. Comptez ensemble et ajustez-la. » 120 secondes | « Inventez une publicité de trois phrases pour un objet ordinaire transformé en cadeau symbolique. » 120 secondes |
| 4 | Minuteur | « Trouvez trois objets et donnez à chacun un nom de lieu imaginaire. » 90 secondes | « Mimez chacun une activité légère que l’autre essaie de reconnaître. » 90 secondes par personne |
| 5 | Commun | « Faites une pause. Chacun choisit un détail de l’invitation qu’il aimerait conserver. » | « Faites une pause. Chacun choisit la phrase qui l’a le plus amusé. » |
| 6 | Minuteur | « Composez une carte postale imaginaire en alternant une phrase chacun pendant quatre tours. » 180 secondes | « Racontez une histoire en alternant un mot chacun pendant deux minutes, puis inventez ensemble sa dernière phrase. » 120 secondes, suivies d’une finale orale sans minuterie |
| 7 | Minuteur | « Reprenez votre carte postale et trouvez-lui trois titres possibles. » 90 secondes | « Imaginez une autre fin à votre histoire, en une phrase chacun. » 90 secondes |
| 8 | Finale | « Relisez ou racontez votre création préférée. Choisissez une petite idée à garder, ou terminez sans l’enregistrer. » | « Racontez votre histoire en quelques mots et choisissez son titre, ou terminez sans l’enregistrer. » |

Les nombres de mots, objets et phrases sont des contraintes de jeu vérifiées par les joueurs, pas une analyse automatique de leur texte ou de leur voix. Si une manche est passée, les suivantes repartent de leur propre consigne; lorsqu’elles se réfèrent à une création absente, afficher « Inventez maintenant une phrase de départ ensemble » avant la consigne. Ne pas générer cette phrase à la place des joueurs.

Finale V0 : « Le temps a donné l’élan; vos idées peuvent continuer sans chronomètre. » Finale V1 : « Votre improvisation est terminée. Le reste de la soirée vous appartient. »

## 11 — L’art de te séduire · LR-ECLAT-11

**Promesse :** préparer et offrir chacun une attention, dans un échange libre et concret. A organise le premier tour; B le second. Les propositions ne sont jamais des obligations. Une réponse **Une autre proposition** permet de choisir une autre des trois cartes de la variante, sans limite de refus; **Passer** termine le tour sans justification.

| Carte | V0 — Les petites attentions | V1 — Les petites invitations |
| --- | --- | --- |
| 1 | « Préparer un petit mot qui souligne une qualité ou une attention précise de l’autre. » | « Dessiner un petit symbole, puis raconter ce qu’il représente pour ce soir. » |
| 2 | « Préparer avec ce qui est disponible une boisson ou un petit espace confortable; aucun achat. » | « Proposer une courte promenade réelle ou imaginaire et décrire son premier arrêt. » |
| 3 | « Proposer une danse de deux minutes ou une écoute côte à côte sans contact. » | « Proposer cinq minutes où chacun raconte quelque chose pendant que l’autre écoute sans interrompre. » |

| Scène | Type | Consigne fixe |
| --- | --- | --- |
| 1 | Commun | « Chacun dit le type d’ambiance qui lui convient aujourd’hui : tendre, joueuse ou calme. Il est possible de ne rien préciser et de passer une proposition plus tard. » Cette indication est orale et ne classe pas automatiquement les joueurs. |
| 2 | Secret | « A prépare une invitation liée à l’une des trois cartes, sans encore annoncer son choix. B profite d’un instant calme. L’écriture est facultative. » |
| 3 | Choix | « A propose son attention. B choisit Oui / Une autre proposition / Passer. Si l’attention convient aux deux, vivez-la à votre rythme. » Carte 3 V0 : appliquer A3 avant tout contact; l’écoute sans contact reste une option complète. |
| 4 | Commun | « B peut dire un détail qu’il a apprécié dans la proposition, ou simplement passer. A écoute sans demander de justification. » |
| 5 | Secret | « B prépare maintenant une invitation liée à l’une des trois cartes. A profite d’un instant calme. Ne choisissez pas à la place de l’autre. » |
| 6 | Choix | « B propose son attention. A choisit Oui / Une autre proposition / Passer. Si l’attention convient aux deux, vivez-la à votre rythme. » Même règle de contact et d’alternative. |
| 7 | Commun | « Chacun complète à voix haute : “Une petite attention que j’aimerais offrir un jour…” Aucune promesse n’est nécessaire. » |
| 8 | Finale | « Choisissez ensemble : prolonger une attention / garder une phrase de ce soir / terminer ici. » Prolonger reprend une carte déjà acceptée après nouvel accord, sans lancer automatiquement une nouvelle activité. |

Dans la version 30 minutes, la préparation est intégrée aux scènes 3 et 6; les scènes 2 et 5 ne sont pas nécessaires. Dans la version 60 minutes, la préparation de A est intégrée à 3 et celle de B se déroule à 5. Ne pas exiger de note préparée pour ouvrir une proposition.

Finale avec attention prolongée : « Une attention choisie peut suffire à transformer un moment ordinaire. » Sinon : « Vous pouvez terminer ici et garder ce qui vous a fait du bien. » Aucun trophée lié au nombre de Oui, aucun historique de refus à exposer au partenaire.

## 12 — La nuit du hasard · LR-ECLAT-12

**Promesse :** créer et jouer ensemble une histoire à partir d’un décor, de rôles et d’une contrainte. Il s’agit d’un jeu créatif, sans points ni lecture psychologique. L’app fournit les éléments ci-dessous; les joueurs improvisent les paroles et les situations, sans génération de récit par Work ou une IA à l’exécution.

Trois tirages indépendants uniformes de 1 à 6, enregistrés côté serveur à la création : D = décor, R = rôles, C = contrainte. Employer une source aléatoire fiable, sans modifier les dés, probabilités ou quotas officiels de LoveRoll. Pas de relance automatique à l’actualisation; un bouton commun « Relancer cette scène » peut retirer uniquement la contrainte, après accord explicite. Chaque relance est conservée dans l’état de séance et ne coûte rien.

| Valeur | Décor V0 | Décor V1 | Rôles A / B | Contrainte |
| --- | --- | --- | --- | --- |
| 1 | Un hôtel au bord de la mer | Une petite gare de montagne | Hôte / Voyageur | Chaque personne introduit un objet ordinaire dans l’histoire |
| 2 | Un train de nuit | Un bateau à quai | Gardien d’une enveloppe / Personne qui la cherche | Une phrase sur deux doit commencer par « Et si… » |
| 3 | Un jardin éclairé de lanternes | Une serre sous les étoiles | Guide / Explorateur | Une couleur devient le mot-code d’un rendez-vous |
| 4 | Une bibliothèque après fermeture | Une petite salle de cinéma | Auteur d’une invitation / Destinataire curieux | Chaque personne donne un indice avant une réponse |
| 5 | Un café pendant la pluie | Une terrasse au lever du jour | Organisateur d’une surprise / Complice | Un objet possède une fonction imaginaire inattendue |
| 6 | Un atelier d’artiste | Un observatoire tranquille | Musicien imaginaire / Narrateur | Chaque personne invente un titre pour la scène |

V0 : objectif commun **retrouver une invitation perdue**. V1 : objectif commun **préparer une surprise à ouvrir demain**. Les rôles sont des personnages fictifs, jamais des pouvoirs sur le partenaire.

| Scène | Type | Consigne fixe |
| --- | --- | --- |
| 1 | Choix | Révéler les trois tirages et l’objectif de la variante. « Vous pouvez garder cette proposition ou relancer uniquement sa contrainte. Choisissez ensemble. » Une relance peut être demandée à chaque scène 1 ou 6; aucune limite commerciale ajoutée. |
| 2 | Commun | « Chacun décrit un détail du décor et présente son personnage en une phrase. Vous pouvez jouer oralement sans mise en scène physique. » |
| 3 | Commun | « Construisez le début de votre histoire en alternant une phrase chacun pendant quatre tours. Respectez l’objectif et essayez votre contrainte; vous pouvez l’abandonner oralement si elle gêne. » |
| 4 | Commun | « Chaque personnage trouve un objet ordinaire. Décrivez ce qu’il change dans l’histoire, une proposition chacun. » |
| 5 | Commun | « Échangez maintenant vos rôles pour la suite. Chacun raconte ce que son nouveau personnage a compris. » Dans le parcours court, l’inversion est annoncée au début de la scène 6. |
| 6 | Choix | « Choisissez : garder notre contrainte / tirer une nouvelle contrainte / jouer sans contrainte. Puis construisez le tournant de l’histoire, quatre tours de parole chacun. » Le décor, l’objectif et les rôles conservés dans la séance ne sont pas retirés. |
| 7 | Commun | « Chacun propose un détail qui aiderait l’histoire à se terminer. Retenez-les ensemble, sans vote ni note. » |
| 8 | Finale | « Inventez ensemble votre dernière scène : l’invitation est retrouvée (V0) ou la surprise est prête (V1). Donnez un titre à votre histoire si vous le souhaitez. » |

Finale V0 : « L’invitation a trouvé ses deux personnages. Votre histoire peut se poursuivre hors écran. » Finale V1 : « Votre surprise existe dans l’histoire que vous avez créée. Rien ne vous oblige à la transformer en promesse réelle. » Si le couple ne souhaite pas improviser une finale, afficher le texte fixe et permettre de terminer. Aucun nouveau tirage de décor ou rôle caché au cours d’une reconnexion.

## B. Finition produit : décisions déjà fixées

### B1. Présentation et cohérence

Le sélecteur conserve les intitulés **Notre soirée / Éclat**. Retirer l’aplat jaune, les reflets excessifs et la couronne répétée; employer la famille rubis de l’Accueil Android, un accent doré discret et le même état sélectionné que les autres contrôles. L’indication commerciale de l’abonnement apparaît à l’entrée/fiche si elle est utile, pas à chaque scène.

L’accueil Éclat propose **Jouer ensemble** (01,02,04,06,07,10,12), **Se retrouver** (01,05,08), **Se rapprocher** (03,09,11). Un coffret présent dans deux intentions garde le même identifiant, historique et accès. Les douze restent accessibles depuis **Tous les coffrets**, dans l’ordre 01 à 12. La première recommandation est le coffret non commencé de plus petit numéro; s’ils ont tous été commencés, proposer le moins récemment commencé, puis le plus petit numéro en cas d’égalité. Expliquer « À découvrir » ou « À retrouver », sans prétendre connaître les émotions du couple.

Chaque fiche affiche la promesse du coffret, le matériel indiqué, les durées 30/60/90, le choix un/deux téléphones et **Préparer notre soirée**. Le bouton **Commencer ensemble** crée une seule séance. Une séance active propose **Reprendre**; ne pas en créer une seconde à la place. L’utilisateur choisit la durée explicitement; la présélection affichée est 30 minutes pour un nouveau coffret, sinon la dernière durée choisie pour ce coffret.

Pendant le jeu : titre du coffret, étape courante, consigne et action principale contextuelle. Écriture et aides sont secondaires et ouvertes à la demande. Le statut privé/commun et la personne qui agit sont toujours explicites. Lire la consigne ne déclenche ni sauvegarde obligatoire, ni envoi de notification, ni achat. Conserver l’accessibilité et le défilement utile.

### B2. Réalisation et droits

Pas de modification de prix, d’activation de facturation, de nouvelle promesse de contenu mensuel ou de retrait d’un avantage acquis dans ce chantier. Vérifier les écrans d’offre existants et leur cohérence avec la disponibilité commerciale réelle. Les anciens coffrets et historiques restent accessibles; les nouvelles versions sont identifiées comme telles. Pas de réécriture rétroactive des séances ni des notes.

Work peut choisir les structures de données et composants pour implémenter fidèlement le contrat. Il ne peut pas remplacer les missions, raccourcir le nombre de coffrets, changer les routes de durée, ajouter un score ou un quota, transformer les choix privés en contenu partagé, modifier les énigmes ou inventer d’autres branches pour terminer plus vite. Toute correction éditoriale qui change une solution ou une règle est une décision produit à signaler.

Un pilote du coffret 01 valide le moteur et le parcours. Il ne clôt pas la mission : enchaîner ensuite les douze coffrets, par lots jouables, en conservant les tests proportionnés et les autorisations de livraison du maître. Le travail de design, d’intégration et de code reste à faire; la présence de ce fichier ne prouve pas une fonctionnalité livrée.

### B3. Acceptation par les quatre regards

| Regard | Preuve attendue pour chaque coffret |
| --- | --- |
| Designer | Parcours cohérent avec l’Accueil Android, écrans lisibles, boutons et boîtes homogènes, aucune finition laissée en ancien thème |
| Client abonné | Promesse comprise avant de commencer, accès honnête, préparation réaliste, séance complète et reprise fiable |
| Joueur | Essai humain du début à la finale, énigmes résolubles, conséquences compréhensibles, rythme évalué et envie de rejouer recueillie sans l’inventer |
| Codeur | État et contenu versionnés, droits et secrets protégés, branches conformes, double clic/reconnexion/deux appareils/mode partagé testés, aucune mutation des dés officiels |

Vérifier les 12 × 3 routes de durée et les deux variantes avec des contrôles adaptés; les tables fixées permettent cette validation sans tester manuellement chaque micro-changement. Faire la recette humaine par familles et coffrets au fur et à mesure. Une CI verte ne remplace pas le constat de plaisir ou de valeur; indiquer honnêtement les essais physiques et les essais de jeu restant à faire. Les états des douze coffrets restent distincts dans le suivi.
