# LoveRoll — PROMPT MAÎTRE OFFICIEL
> Version documentaire 2026-10-26 · Dépôt officiel : [fredvolks/loveroll](https://github.com/fredvolks/loveroll) · Statut initial : **demandé / à auditer**, pas « terminé ».


## Guide de lecture et règles de coordination — consolidation du 26 octobre 2026
- **Demandes et critères :** ce prompt. **Avancement courant et preuves :** [suivi officiel](./LOVEROLL_SUIVI.md). **Entrées non triées :** [nouvelles demandes](./LOVEROLL_NOUVELLES_DEMANDES.md). Les notes de PR ci-dessous sont des instantanés datés; vérifier le dernier état GitHub avant toute décision.
- **Accueil :** vue d'ensemble, D6 hebdomadaire et raccourcis (LR-ACCUEIL-001). **Soirée :** déroulement du jeu, dés individuels, défis et minuteries (LR-014 à LR-028). **Surprise :** rendez-vous mensuel, lieux et planification (LR-SURPRISE-001). **Éclat :** expérience/coffrets existants, avec leurs droits actuels.
- **Demandes approuvées :** les sections identifiées de ce document, y compris LR-017 à LR-019, LR-025 à LR-028, LR-SURPRISE-001 et LR-ACCUEIL-001. Les autres suggestions d'un rapport restent des propositions. LR-033 n'impose pas de redemander l'autorisation pour une exigence déjà approuvée ici.
- **Conflits :** appliquer les précisions explicites des nouvelles sections uniquement à leur périmètre. LR-019 précise l'exception des favoris à LR-015; les exclusions volontaires restent prioritaires. LR-SURPRISE-001 autorise budget/km null sans préférence luxe. LR-ACCUEIL-001 précise le rôle fonctionnel de l'Accueil tout en conservant sa référence graphique.
- **Un seul ordre d'exécution courant :** (1) récupérer l'état réel de main/branches/PR/CI et préserver les travaux; (2) finaliser les correctifs P0 LR-001 à LR-004 et les erreurs de fiabilité Geoapify documentées sous LR-SURPRISE-001; (3) intégrer les lots déjà ouverts compatibles, puis LR-015/016 ensemble pour le parcours et les quotas; (4) LR-018, LR-019, LR-017, LR-025, LR-026/027/028 selon leurs dépendances; (5) LR-ACCUEIL-001 puis la suite du parcours LR-SURPRISE-001; (6) compléter harmonisation et audit. Responsive, sécurité, tests et preuves s'appliquent à chaque lot, pas seulement à la fin. Les anciens ordres plus bas servent de contexte historique.
- **Exécution continue pendant la session :** enchaîner les lots autorisés sans réclamer « continue ». Après un push, identifier les workflows, les suivre jusqu'à leur état final, analyser les journaux en cas d'échec et corriger. Un test lancé n'est pas une livraison. Déployer les lots compatibles et validés dans le périmètre autorisé; vérifier la version et le parcours publiés. Un blocage d'appareil physique se note explicitement et n'empêche pas les autres travaux indépendants. Ne pas prétendre poursuivre après la fin de session.
- **États distincts :** spécifié / implémenté / testé (automatique, émulation, appareil réel) / fusionné / déployé et vérifié. Une fusion ou une CI verte ne vaut pas validation physique. Ne pas inventer de progression à partir du nombre de commits.
- **Repères :** [P0](#p0--correctifs-fonctionnels), [Accueil](#lr-accueil-001--accueil-vue-densemble-et-raccourcis-soirée-parcours-de-jeu), [Surprise](#lr-surprise-001--rendez-vous-surprise-premium-d100-et-geoapify), [suivi](./LOVEROLL_SUIVI.md).

## Comment utiliser ce document
Ce document est la **source de vérité des demandes** LoveRoll : jeu, Accueil, Soirée, Surprise/Geoapify, minuteries, confidentialité, cohérence graphique et responsive. Il ne signifie **pas** que ces exigences sont implémentées. Chaque exigence possède un identifiant LR-xxx repris dans [LOVEROLL_SUIVI.md](./LOVEROLL_SUIVI.md).

- Ajouter des demandes dans [LOVEROLL_NOUVELLES_DEMANDES.md](./LOVEROLL_NOUVELLES_DEMANDES.md) ou ouvrir une **Issue** GitHub ; ne pas effacer les demandes anciennes.
- Lors du prochain développement, lire ce document, le suivi, les nouvelles demandes, le README et le code réel avant de modifier quoi que ce soit.
- Pour chaque demande, documenter fichier, PR, tests et capture **avant** de passer à « Terminé ». Ne pas inventer un état d'avancement.
- Ne pas modifier silencieusement les règles commerciales, les abonnements, la progression ou le contenu des défis.

## Identité et périmètre
**Produit :** LoveRoll, expérience romantique à deux sur Android et PWA (Safari iPhone/iPad, navigateurs PC/tablettes). **Dépôt :** fredvolks/loveroll, et non le dépôt historique Mon Wallet. **Code :** PWA dans `couple-web/`, Android dans `app/`. La page **Accueil actuelle** est la **référence graphique** (les responsabilités fonctionnelles sont précisées sous LR-ACCUEIL-001) : rubis, bordeaux, rose et doré, rideaux, chandelles, roses, marbre, logo LoveRoll, effets de verre et boutons Premium.

### Rôles attendus de l'agent exécutant
Travailler simultanément comme développeur senior Web/Android/PWA/WebGL, directeur artistique haut de gamme, expert UX/UI/accessibilité, testeur QA multiplateforme et **couple utilisateur** (un partenaire expérimenté et un peu moins technophile). Identifier les vrais irritants d'usage, pas uniquement les anomalies CSS. Faire des propositions vérifiables, avec priorité et raison, en conservant l'ambiance romantique.

## P0 — Correctifs fonctionnels

### LR-001 — D100 Soirée coupé et disproportionné
**Constat photographié :** dans l'onglet Soirée, le D100 déborde en haut, masque son propre sommet et prend trop de place entre « Notre soirée / Éclat Premium » et le socle.

**Exigences :**
- Utiliser la **taille et le cadrage du D100 de Surprise** comme référence, pas une échelle arbitraire.
- Garder le D100 entier visible **avant, pendant et après** toutes ses rotations/animations.
- Le centrer sur le vrai socle en marbre ; poser visuellement le dé sur le socle, jamais en lévitation ou enterré.
- Préserver matériau rubis, polygones/numéros, interaction 3D, hasard et animation existante ; pas d'image plate de remplacement.
- Adapter **caméra, champ de vision, espace de rendu, limites de rotation et échelle** à la largeur **et à la hauteur disponible**, aux safe areas et aux contrôles proches.
- Ne pas cacher la géométrie coupée derrière `overflow: hidden` ; traiter la cause et prévoir une marge pendant l'animation.
- Ne pas déplacer chandelles/lanterne dans les plis du tissu d'une façon incohérente si le décor est ajusté.

**Acceptation :** aucun sommet du D100 coupé sur S25 Ultra, iPhone Safari, petite largeur, tablette portrait/paysage et PC ; aucun chevauchement de boutons ; dé proportionné au socle.

### LR-002 — Minuterie à zéro => défi automatiquement « Réalisé »
Lorsqu'une **minuterie réellement lancée et liée à un défi** atteint normalement **00:00**, déclencher **la même action métier existante** que « Défi réalisé », sans seconde confirmation manuelle :
1. marquer une seule fois le défi « Réalisé » ;
2. créditer le partenaire effectivement assigné ;
3. actualiser progression du cycle de 200, statistiques du couple, historique et calendrier ;
4. synchroniser l'état serveur/entre appareils ;
5. afficher confirmation sobre « Défi accompli ♥ » et, si prévu, sonnerie respectant les capacités/restrictions de plateforme.

**Ne pas** valider si pause, annulation, saut, abandon avant zéro. Si déja réalisé, refuser la deuxième validation. Préserver la fin fiable lorsque l'application quitte l'avant-plan : stocker instant/état de fin, réconcilier au retour, ne pas dépendre d'un seul callback de timer en arrière-plan. Garantir idempotence de la transition et résistance à reconnexion/rechargement/clic double/concurrence de deux appareils.

### LR-003 — Calendrier / états / compteurs cohérents
Sur capture octobre 2026 : une soirée affiche « En cours » tout en présentant « 2 non réalisés » par partenaire. **Auditer** si ces libellés sont justes au moment de la capture ; distinguer :
- à venir, attribué/en cours, réalisé, sauté, définitivement non réalisé, soirée clôturée ;
- défis en cours **≠** défis définitivement non réalisés ;
- nombre de soirées possibles, soirées clôturées, progression du cycle et réalisations par partenaire.

Toutes les vues doivent dériver d'une logique métier identique ; ne pas réécrire l'historique. Conserver la règle existante de plafonnement du nombre de soirées possibles avant la remise à zéro du lundi.

### LR-004 — Sonneries des minuteries et fiabilité
Auditer audio/timers sur PWA iPhone Safari, PWA installée et Android. Après une interaction autorisant l'audio, tenter une sonnerie appropriée à 00:00 ; gérer silencieux/vibration/limitations de navigateur sans fausse promesse d'une alerte audio garantie en arrière-plan. Vérifier que les sons configurés correspondent aux **minuteries des défis**, pas à une sonnerie arbitraire.

## P1 — Identité visuelle LoveRoll

### LR-010 — Accueil = référence officielle
Harmoniser **toutes** les pages avec les vrais éléments de l'Accueil : typographies, tailles et lignes de titre, logo, sous-titres, rubis/bordeaux/rose/or, images d'ambiance, transparences, bordures lumineuses, arrondis, reflets, dégradés, boutons, switches, pictogrammes, états d'interaction, cartes et onglets. Ne pas inventer un autre thème, ni teintes rose fluo discordantes.

Créer/renforcer les **tokens et composants partagés** : en-tête LoveRoll, boutons rubis/dorés, bulles verre, sélecteurs, statistiques, dialogues, navigation, confirmations, états actifs/verrouillés. Les boutons restent des **vrais éléments HTML/app interactifs** avec effet de pression, pas des photographies de boutons.

### LR-011 — Hiérarchie, centrage et décor
- Contrôler alignement horizontal **et vertical** des textes, symboles, chevrons/flèches, rond et boutons.
- Éviter titres coupés, blocs trop denses, décor qui interfère avec texte, grands panneaux opaques.
- Sur calendrier, alléger l'encombrement des bulles et rendre la synthèse + l'état sélectionné lisibles sans changer les statistiques.
- Préserver fidélité visuelle du D6/D100, du socle, du tissu rouge, des roses, lanternes et chandelles.
- Garder une cohérence d'un écran à l'autre jusque dans les modales, placeholders, erreurs et chargements.

### LR-012 — Expérience des cartes / défis
Rendre en un regard : catégorie, partenaire désigné, texte du défi, minuterie et action principale. Éviter que des écrans surchargés cassent l'ambiance. Améliorer les transitions, confirmer les complétions de manière discrète, réduire les clics et préserver la compréhension des actions « Réalisé », « Sauter » et « Suivant ».

### LR-013 — Catégorie non sélectionnée
En l'absence de catégorie pour le défi/D100, la zone doit suggérer **visuellement qu'il faut choisir**, et un appui sur « Brasser le dé » doit afficher une instruction **claire** : choisir d'abord la catégorie. Aucune catégorie pré-cochée si la mécanique actuelle prévoit un choix explicite. Ne pas déclencher le hasard avant sélection.


### LR-014 — Confirmation du choix de catégorie avant de brasser le D100 (nouvelle demande du 26 octobre 2026)

**Suivi du développement (26 octobre 2026) :** [PR #34](https://github.com/fredvolks/loveroll/pull/34), branche `feat/lr014-confirm-evening-category-20261026`. Modal HTML réelle, pourcentages calculés selon la catégorie, annulation sans RPC, rappel réactivable par compte, tests Node/Chromium et migration additive `couple-web/migrations/20261026_evening_category_confirmation.sql`. **Statut : en cours**, CI finale, migration appliquée au bon projet Supabase et vérification physique non confirmées. Après migration, la préférence est enregistrée dans `couple_profiles` sous RLS; avant migration, seule la persistance locale par utilisateur est active.

**But produit :** dans l'onglet **Soirée**, lorsque l'utilisateur a choisi une catégorie et touche **« Brasser le dé »**, afficher d'abord une **étape de confirmation élégante** afin d'éviter un tirage dans la mauvaise catégorie. Permettre au joueur de ne plus revoir cette confirmation.

**Contexte réel :** les trois choix actuels sont **Sensuel**, **Sexuel** et **Au hasard**. « Sensuel » ou « Sexuel » utilise les pourcentages configurés de la catégorie choisie et de l'autre catégorie ; « Au hasard » utilise une répartition égale entre les deux, selon la logique métier en place. **Ne jamais confondre ces catégories avec les intensités personnelles Soft/Medium/Intense.**

**Parcours obligatoire :**

1. Aucun choix de catégorie : maintenir **LR-013** : expliquer « Choisis une catégorie avant de brasser le dé. ». Ne pas ouvrir l'écran de confirmation et ne réaliser aucun tirage.
2. Catégorie sélectionnée, avertissement activé : au toucher de « Brasser le dé », **ne pas lancer immédiatement le dé** ni appeler le tirage serveur. Afficher un **écran de confirmation de catégorie** dans Soirée (modal plein écran adaptée aux téléphones, dialogue centré ou panneau élégant sur tablette/PC, sans perdre la soirée en cours).
3. Exemple de microtexte : titre **« Confirmer notre choix »** ; question **« Tu veux brasser le dé dans cette catégorie ? »** ; carte centrale **« Catégorie : Sensuel »**, **« Catégorie : Sexuel »** ou **« Catégorie : Au hasard »** selon le choix réel. Montrer un résumé court et exact des probabilités applicables, lu depuis la configuration active plutôt qu'inscrit en dur (notamment 50/50 pour « Au hasard »).
4. Actions : bouton principal **« Confirmer et brasser »** (rubis LoveRoll) ; bouton secondaire **« Modifier la catégorie »** qui ferme la confirmation, revient au sélecteur et permet de changer de catégorie **sans aucun tirage**. La fermeture via retour, Échap ou croix est équivalente à une annulation, sans consommer de tirage.
5. Option de préférence : **case à cocher, non cochée par défaut, « Ne plus afficher ce message »**. La cocher ne doit enregistrer le choix de ne plus afficher **qu'après** un appui réussi sur **« Confirmer et brasser »**, jamais après une annulation.
6. Si la préférence est activée, les prochains appuis sur « Brasser le dé » passent directement à la **même procédure de tirage existante**, mais **exigent toujours une catégorie sélectionnée** et respectent toutes les autres protections d'accès, de tour, de quota et d'état du jeu.
7. Ajouter dans **Réglages → Préférences de jeu** (ou section équivalente déjà existante) une option explicite **« Confirmer ma catégorie avant le lancer du D100 »** pour réactiver/désactiver cette étape à tout moment, sans toucher aux choix de catégories ni aux tirages.
8. Enregistrer la préférence **par profil/compte utilisateur**, **pas pour tout le couple**. La conserver après actualisation, fermeture/reconnexion et, si le stockage de profil existant le permet, la synchroniser entre les appareils connectés de cet utilisateur. Employer la couche de stockage préférences existante plutôt qu'une nouvelle architecture parallèle ; ne pas écrire de données sensibles côté client.

**Anti-régression / qualité :**
- Aucun dé ne tourne, résultat ne s'affiche, défi ne se consomme et aucun appel de tirage ne part **avant confirmation** (quand l'étape est active).
- Après validation, le D100 3D existant brasse normalement : **un seul lancer officiel**, mêmes probabilités, mêmes attributions et même historique. Protéger contre double appui, latence réseau et concurrence de partenaires, en réutilisant les protections serveur existantes.
- Si la catégorie change pendant la confirmation (mise à jour externe / autre action), ne pas valider une catégorie devenue obsolète : afficher la valeur courante ou demander une nouvelle confirmation.
- La confirmation **n'est pas** un nouvel écran de choix d'intensité ou un second système de tirage.
- Design **strictement calqué sur l'Accueil** : velours rubis, bulles de verre raffinées, dorure discrète, typographie LoveRoll, boutons réellement interactifs, alignements impeccables. Ne pas copier une image de bouton ni ajouter une page sans rapport avec l'univers.
- Responsive Samsung S25 Ultra, petit Android, Safari iPhone/PWA, iPad/tablette portrait/paysage, PC/Mac ; aucun texte/bouton coupé, focus et navigation clavier accessibles, retour propre au déclencheur, pas de défilement inutile dans le parcours principal.
- La nouvelle étape s'applique **uniquement** au lancer de catégorie de l'onglet **Soirée** ; ne pas ajouter de confirmation aux autres dés/Surprise/Accueil sans demande explicite.

**Tests d'acceptation à automatiser et visualiser :**
1. Pas de catégorie → message de sélection sans confirmation ni lancer.
2. Chacun des trois choix → texte et probabilités exacts ; confirmation puis **un** lancer.
3. Annulation / retour / modifier → zéro lancer, catégorie modifiable.
4. « Ne plus afficher » décoché → confirmation à chaque nouveau lancer autorisé.
5. « Ne plus afficher » coché puis **confirmé** → futurs lancers autorisés sans fenêtre, mais toujours avec catégorie.
6. Case cochée puis annulation → préférence inchangée.
7. Réactivation dans Réglages → confirmation réapparaît au prochain lancer.
8. Préférence isolée entre Fred et Émilie, persistante entre sessions ; vérifier multi-appareils selon le stockage disponible.
9. Double-clic/double-tap, lenteur réseau, états de tour/quota refusés → pas de tirage doublé.
10. Captures et tests navigation/safe areas Android, iPhone, iPad et PC.

**Statut documentaire LR-014 :** spécification approuvée, travail partiel référencé plus haut. Consulter le suivi et GitHub pour l'avancement courant; ni cette spécification ni une PR ne prouvent une livraison. Conserver LR-013 et toutes les règles de catégorie existantes.


### LR-015 — Défis : « Passer », « Refuser », exclusion volontaire et retour dans la pige (nouvelle demande du 26 octobre 2026)

**Objectif utilisateur :** pendant **Soirée**, chaque partenaire peut librement **passer** ou **refuser** un défi. En cas de refus, LoveRoll demande **s'il faut retirer ce défi du lot des prochains tirages** ; chaque défi **non complété à la fin de la soirée** redevient éligible à la pige, sauf exclusion explicitement choisie. Aucun défi n'est jamais imposé.

#### Les trois actions sur une carte
- **« Défi réalisé »** : conserver la validation existante et les compteurs. Un défi réellement accompli ne retourne **pas** immédiatement dans la pige du cycle ; il suit les règles déjà approuvées du cycle de 200 défis.
- **« Passer ce défi »** : action sans culpabilisation ni justification. Le défi n'est **pas réalisé** et ne crédite **aucune** progression ; proposer de repiger un défi de remplacement dans le même emplacement/turn, en respectant les permissions et les mécanismes existants. Le défi passé **reste dans le lot admissible** pour plus tard (ne pas le repiger immédiatement pendant la même soirée si cela produit un retour en boucle), et retrouve l'éligibilité après la soirée s'il n'est pas complété.
- **« Refuser ce défi »** : afficher une boîte de confirmation distincte, sobre et non culpabilisante :
  - Titre : **« Tu préfères un autre défi ? »**
  - Texte : **« Veux-tu retirer ce défi des prochaines piges pour le cycle en cours ? »**
  - Choix explicites : **« Oui, retirer du lot »** ou **« Non, le garder dans le lot »** ; bouton **« Annuler »**.
  - Dans les deux cas confirmés, marquer cette occurrence comme **refusée / non réalisée**, autoriser **une repige de remplacement** sans créditer un défi accompli. Si **Oui**, marquer la carte exclue des futurs tirages pour le **cycle actuel du couple** ; si **Non**, elle retourne au lot admissible ultérieurement, comme un défi passé. **Annuler** ne change rien et ne consomme aucune tentative.

**Portée de l'exclusion :** par défaut, elle concerne **le couple et le cycle de 200 défis en cours**, pas la banque de défis partagée entre utilisateurs LoveRoll, pas les autres couples, et pas une suppression permanente de contenu. Prévoir dans **Réglages → Options avancées → Défis retirés** un écran permettant au couple de consulter et **réintégrer** les défis exclus ; conserver le motif d'action « refusé » sans demander de justification personnelle. Lors d'une remise à zéro explicite du cycle de 200, les exclusions temporaires sont levées pour le nouveau cycle, sauf si une autre règle déjà validée dans le code est plus restrictive : en cas de conflit, ne pas changer silencieusement la règle existante, le signaler dans l'audit et la PR.

#### À la fermeture de la soirée : remettre les défis non réalisés dans la pige
- Quand la soirée est **clôturée**, chaque carte **attribuée, commencée, passée ou refusée sans exclusion** qui n'a **pas** été validée « Réalisée » redevient éligible au tirage d'une soirée ultérieure **dans son même lot et sa même catégorie**.
- Un défi **refusé avec « Oui, retirer du lot »** demeure exclu jusqu'à réintégration explicite ou réinitialisation de cycle. Un défi **réalisé** demeure compté une seule fois, sans réintroduction avant les règles de renouvellement du cycle.
- Lorsqu'une carte n'est **pas encore terminée alors que la soirée est ouverte**, elle reste « À faire / En cours », **pas** définitivement « Non réalisée » ; ne pas repiger une carte active dans la même soirée.
- À la clôture, conserver **l'historique immuable** de ce qui a été attribué, passé, refusé, non terminé, réalisé ou exclu : **remettre dans la pige ne doit jamais effacer l'événement passé dans le calendrier**.
- Si l'application ferme ou le réseau coupe avant la clôture, préserver l'état de soirée en cours ; appliquer la restitution à la vraie clôture métier, avec reprise fiable, et **une seule fois** (idempotence).
- Garder le nombre de défis **alloués** à chaque partenaire constant lorsqu'un défi est remplacé : une repige ne doit pas consommer **une soirée supplémentaire**, ni inventer des défis accomplis. Respecter les règles d'attribution, de tour, de catégorie et les quotas déjà prévus.
- Les défis personnels et personnalisés restent **privés au couple** et exclus du pool global. Ne jamais modifier le contenu original d'un défi ni propager son exclusion à d'autres couples.

#### Cas de contrôle et d'épuisement des lots
- Ne **jamais** repiger automatiquement la carte qui vient d'être passée/refusée au cours de **la même soirée** ; utiliser la liste des cartes disponibles, et tenir compte des catégories tirées, des préférences déjà configurées et des règles de non-répétition.
- Si plus aucun défi admissible n'est disponible dans le lot/catégorie, présenter un message clair et les possibilités déjà autorisées (« Réintégrer un défi retiré » ou revenir plus tard), sans boucle infinie, exception silencieuse, ni validation forcée d'un défi.
- Ne jamais changer l'équilibre existant des catégories Sensuel / Sexuel / Au hasard ni les proportions de tirage, sans instruction supplémentaire.
- Les deux partenaires doivent voir le **même état officiel** après synchronisation. Empêcher la double repige, le double enregistrement, les réponses concurrentes et les incohérences de calendrier lorsque chacun utilise son appareil.

#### UX/UI — aligné sur l'Accueil
- Sur chaque carte du défi, placer clairement **« Réalisé »**, **« Passer »** et **« Refuser »** ; les actions secondaires restent sobres, sans mettre les partenaires sous pression.
- Dialogues et boutons **réels** dans les bulles rubis/verre et les typographies de l'Accueil, et non de fausses images de boutons.
- Messages après action : **« Défi passé — il pourra revenir plus tard »**, **« Défi retiré du lot pour ce cycle »**, **« Défi conservé dans la pige »**, suivant le vrai choix.
- Confirmation de refus accessible au tactile et au clavier, gestion correcte du retour/fermeture et du focus ; aucun bouton masqué sur Samsung S25 Ultra, iPhone, iPad/tablette portrait/paysage ou PC.

#### Interactions avec les exigences existantes
- **LR-002 :** un minuteur qui atteint naturellement **00:00** valide le défi comme réalisé. Si le partenaire **passe/refuse/annule** le défi d'abord, arrêter/désactiver son minuteur et empêcher que sa fin tardive ne valide le défi.
- **LR-003 :** calendrier et statistiques distinguent **passé**, **refusé**, **exclu**, **non terminé**, **réalisé**, **soirée en cours/clôturée**. Seuls les défis **réalisés** augmentent la progression du cycle de 200.
- **LR-012 :** intégrer les actions sans surcharger les écrans ni dégrader la lisibilité et l'ambiance.
- **LR-014 :** le dialogue de refus est **indépendant** de la confirmation de catégorie avant le D100. Lors d'une repige, conserver la catégorie et les mécanismes de choix déjà valides ; ne pas introduire un second tirage aléatoire concurrent au serveur.
- Conserver tous les autres mécanismes déjà présents (défis par partenaire, intensités, tirages serveur, permissions, transfert, historique, paiements, reset du cycle).

#### Tests d'acceptation indispensables
1. **Passer** une carte : pas de crédit, remplacement dans le même emplacement, pas de re-sortie immédiate ; carte redevient admissible à une soirée ultérieure.
2. **Refuser → Oui** : carte exclue du cycle du couple, remplacement autorisé, toujours absente des futures piges du cycle ; réintégration manuelle possible.
3. **Refuser → Non** : remplacement autorisé, carte garde sa place dans le lot éligible après la soirée.
4. **Refuser → Annuler** : aucune mutation ni repige.
5. **Clore** avec des cartes encore à faire/en cours : toutes les **non réalisées non exclues** redeviennent éligibles ; événements historiques toujours visibles.
6. **Réalisé / minuteur arrivé à zéro** : pas de restitution dans la pige avant renouvellement de cycle ; compteur incrémenté une seule fois.
7. **Minuteur en cours puis Passer/Refuser** : callback tardif de fin de minuteur **sans** validation fantôme.
8. **Deux partenaires** : indépendance des événements de carte, cohérence des quotas, concurrence maîtrisée, synchronisation.
9. **Double clic / reconnexion / fermeture et réouverture** : idempotence et aucune duplication.
10. **Cycle renouvelé, défis personnalisés, lot épuisé** : protections et comportements explicites.
11. **Captures avant/après** et vérification responsive/accessibilité sur mobile, tablette, PC.

**État documentaire : À FAIRE — le présent prompt ne constitue pas du code livré.** Commencer par auditer les statuts/tables/RPC existants et modifier de façon rétrocompatible pour conserver les données et l'historique.


### LR-016 — Limite mensuelle configurable de défis « Passer » (nouvelle demande du 26 octobre 2026)

**Demande officielle :** chaque partenaire peut utiliser **« Passer ce défi » au maximum 3 fois par mois**, par défaut. **L'admin du couple** (propriétaire du duo / permission administrateur déjà existante) peut modifier ce maximum dans ses Réglages, et la règle s'applique aux deux partenaires. Préserver les libertés et mécanismes **LR-015** pour les défis refusés et non terminés.

**Audit du code existant (à revalider au moment de coder) :** `migrations/20261018_play_style_and_pass_quota.sql` calcule déjà **3 passes « gratuites » par personne/mois** via `love_calendar_pass_quota`, mais les passes suivantes deviennent **« pénalisées » dans les statistiques** et ne sont pas bloquées ; `calendar-success-stats.mjs` utilise `free_pass` pour exclure les trois premières du dénominateur de réussite ; `app.js` expose « Passer ce défi » dans les cartes et émet `answer_challenge(...,'passed')` sans plafond visible. Ne pas dupliquer ce quota avec un compteur local : **faire évoluer la source de vérité serveur existante**, préserver son historique, ses valeurs et les statistiques passées.

#### Règle de quota
1. **Valeur par défaut : 3 passes / mois / partenaire** — et non 3 pour les deux réunis, ni 3 par soirée ni 3 par défi. Les **dons de défis** (3 par mois actuellement) sont une fonctionnalité distincte ; ne pas les toucher.
2. Une passe est consommée **une seule fois lorsqu'un défi est effectivement marqué « Passé » et que la repige/remplacement associé est accepté** par la transaction serveur. Ni ouverture du dialogue, ni annulation, ni échec de réseau, ni double-tap ne doivent consommer une passe.
3. Compteur de la période : mois calendrier du **1er à 00:00 au dernier jour à 23:59:59**, sur le fuseau horaire déjà utilisé pour le duo (`America/Toronto` dans la logique actuelle). Remise à zéro automatique au début du mois suivant ; mois historique conservés. Aucun reset par fermeture de soirée ou reconnexion.
4. **Admin du couple uniquement** : dans **Réglages → Jeu → Défis → Limite mensuelle de passes**, ajouter un contrôle numérique validé **0 à 30**, valeur initiale 3, accompagné de « par partenaire et par mois » et d'un aperçu clair (ex. « 3 passes permises par personne chaque mois »). La limite 0 désactive **Passer** mais pas **Refuser**. L'autre partenaire voit la limite mais ne peut pas la modifier.
5. Les changements de limite sont **immédiats** et synchronisés : si l'admin passe de 3 à 5 avec 3 passes utilisées, il reste 2 ; s'il passe à 1 avec 2 passes déjà utilisées, il reste 0, **sans retirer rétroactivement les deux passes ni falsifier les statistiques historiques**. Une modification ultérieure ne restaure pas artificiellement des passes déjà consommées.
6. Afficher près du bouton **« Passer ce défi »** un compteur fidèle à la source serveur, par partenaire : **« Passes ce mois : 1 / 3 »**, puis **« Limite atteinte : 3 / 3 »**. Le compteur doit être rafraîchi après action, changement de limite, première ouverture de session et synchronisation de l'autre appareil.
7. Lorsque le plafond est atteint, **désactiver « Passer »** et expliquer le motif (« Tu as utilisé tes 3 passes pour ce mois. Tu pourras de nouveau passer le 1er du mois prochain, ou choisir de refuser ce défi. »). Ne pas cacher la carte, ne pas supprimer la possibilité de **Refuser** et ne jamais présenter une réalisation comme obligatoire.
8. **Refuser** un défi est toujours possible, **sans limite mensuelle**, pour préserver le consentement et le confort des partenaires. La repige d'un refus (avec ou sans exclusion de la banque) suit **LR-015** et **ne consomme pas** de passe. Afficher des libellés clairs pour qu'il soit évident que « Passer » (quota d'usage) est distinct de « Refuser » (libre choix). Ne jamais inciter l'utilisateur à accepter un défi qui le met mal à l'aise, et ne pas imposer de justification.
9. La repige suite à une passe, lorsqu'elle est autorisée, conserve **la même place dans le quota D6 de la soirée** ; elle ne crée pas une soirée ou un défi réalisé supplémentaire. Respecter tours, catégorie, attribution des partenaires, probabilités, exclus LR-015, historique et cycle 200.
10. Les défis **non terminés** à la clôture retournent à la pige selon LR-015, **sans être comptés comme une passe** ; terminer normalement une carte ou faire arriver sa minuterie à zéro n'en consomme aucune. Les anciens défis « Passé » continuent d'apparaître dans le calendrier et de revenir en pige suivant LR-015.

#### Technique, migration et sécurité
- Respecter **l'identifiant du couple, celui du partenaire, le mois et l'identifiant de défi**. Vérifier côté Supabase, sous transaction/verrouillage approprié, **le nombre de passes effectivement consommées avant de changer un état en « passed »**. Ne pas faire confiance à un bouton désactivé, au seul stockage local ou à une valeur de quota envoyée par le client.
- Si besoin, ajouter un journal transactionnel append-only, idempotent et unique par action, pour distinguer clairement **passé / refusé / annulé / réalisé / restitué** sans perdre les passages passés lors des réintroductions dans le lot. Éviter de recalculer à partir d'un statut courant devenu différent.
- Remplacer la notion statistique existante de « 3 gratuites puis pénalisées » par la nouvelle **limite bloquante paramétrable pour les nouvelles actions**, sans réécrire les historiques ni modifier arbitrairement les taux déjà publiés. Documenter la transition pour les mois en cours (historique existant reconnu ; pas de remise à zéro opportuniste).
- Autoriser la modification du paramètre **uniquement au compte admin** sur le serveur (pas seulement un champ masqué). Utiliser les permissions existantes `owner_user_id` et la synchronisation temps réel si elle est disponible.
- Reprendre la logique métier commune à toutes les vues de carte et les parcours d'administration : pas de contournement entre écran Soirée, liste personnelle, reprise après fermeture, plusieurs appareils ou endpoint RPC direct.
- Aucun impact sur la limite **des dons**, sur les droits Premium, sur la logique des catégories et sur les règles de confidentialité des défis du couple.

#### Tests d'acceptation
1. Défaut 3 : 0/3, 1/3, 2/3, 3/3 ; **quatrième Passe refusé sans mutation**.
2. Chaque partenaire a un compteur distinct, pour un seul paramètre de plafond partagé au couple.
3. Refus avec exclusion et sans exclusion : **toujours possible**, même à 3/3 ; repige LR-015 ; aucune passe débitée.
4. Modification admin 3→5 et 3→1 prend effet immédiatement ; modification par partenaire non admin **refusée côté serveur** ; historique intact.
5. **0** passe configurée interdit seulement Passer ; **30** passe configurées admises au maximum, validation des valeurs négatives, non numériques ou hors limites.
6. Transition au 1er du mois **America/Toronto** (incluant DST et changement d'année) : compteur remis à zéro, anciens mois conservés.
7. Double-tap simultané, deux appareils, rafraîchissement et latence réseau → comptabilisation atomique et unique.
8. Échec de repige/transaction → aucune passe perdue ni défi échangé partiellement ; reprise fiable.
9. Cycle 200, passage sans complétion, clôture, minuterie finie à zéro, calendrier et statistiques : aucune incohérence.
10. Captures et tests accessibilité responsive Android, Safari iPhone, tablette portrait/paysage, PC, avec les vrais boutons du design Accueil.

**État : En cours — [PR #43](https://github.com/fredvolks/loveroll/pull/43) (migration serveur proposée, CI réussie).** Déploiement SQL, Réglages UI, compteurs visibles, refus/repige LR-015 et validation PostgreSQL transactionnelle encore manquants. **Ne pas déployer cette tranche seule ni déclarer LR-016 terminée.**


## Améliorations approuvées — idées 3 à 8 + « As-tu envie de jouer ce soir ? » (26 octobre 2026)

**Périmètre :** ces exigences remplacent le statut « propositions à valider » des idées **3 à 8** du dernier audit, mais **pas** les idées 1 et 2. En plus, l'invitation à jouer est approuvée. Ne pas supprimer les exigences préexistantes LR-001 à LR-016, LR-020 à LR-024, LR-030 à LR-043. Les changements ci-dessous constituent un **cahier des charges, pas du code déjà livré**. Page **Accueil = référence graphique**.

### LR-017 — Adapter ce défi (idée no 3)
**Parcours :** Soirée → carte du défi → bouton secondaire **« Adapter ce défi »**. Il ouvre une bulle LoveRoll avec consigne d'origine, proposition facultative d'ajustement (texte ou durée) et boutons **« Proposer l'adaptation »**, **« Accepter »**, **« Garder le défi original »** ou **« Annuler »**. L'autre partenaire doit pouvoir approuver librement avant toute substitution.

**Règles :**
- Modification **pour l'occurrence actuelle et ce couple seulement** ; jamais de changement des 100/200 cartes de bibliothèque, de l'algorithme ou du contenu d'autres couples.
- Une adaptation ne consomme **aucune passe mensuelle** (LR-016), n'est ni un refus (LR-015), ni une nouvelle pige, ni une complétion.
- Conserver la carte originale et le titre/catégorie D100 d'origine dans l'historique. Ne pas exposer des propositions privées hors du couple. L'un ou l'autre peut refuser l'adaptation sans pression ou conséquence.
- Si la minuterie doit changer, l'accord précède sa nouvelle configuration ; aucune validation de carte ne peut être provoquée par un ancien compte à rebours.
- UI mobile/tablette/PC accessible ; testé avec accord, refus, annulation, reconnexion et deux appareils.

### LR-018 — Reprendre notre soirée (idée no 4)
**Parcours :** lorsqu'une soirée est **ouverte** sur le serveur, proposer sur Accueil/Soirée un accès **« Reprendre notre soirée »**. Le bouton ramène exactement au stade en cours sans créer une seconde soirée.

**Règles :**
- Restaurer les D6 déjà lancés, la progression, les D100, l'état des cartes et le tour actuel depuis **la source officielle serveur** ; préserver la confidentialité de la liste individuelle de défis.
- Restaurer la sélection de défi locale si elle est toujours valide, sinon montrer la liste du joueur. Ne pas refaire un tirage ni changer les quotas.
- Minuteur persisté : conserver démarrage, pause, durée restante et échéance quand ces données existent. En cas de fin naturelle à 00:00 pendant absence, effectuer une seule complétion LR-002 au retour ; jamais après annulation/refus/passe.
- Gérer perte du réseau, reconnexion, fermeture forcée, PWA installée, un partenaire qui a clôturé la soirée depuis un autre appareil ; montrer l'état de synchronisation.
- Ne pas promettre de notification ou sonnerie garantie en arrière-plan iPhone Safari.

### LR-019 — Coups de cœur : un favori RETOURNE DANS LA PIGE (idée no 5)
**Règle non négociable : lorsqu'un défi est ajouté aux coups de cœur, il doit pouvoir ressortir dans une pige future, MÊME S'IL A DÉJÀ ÉTÉ RÉALISÉ.** Il ne doit pas rester bloqué jusqu'à la fin des 200 défis comme une carte ordinaire.

**UI :**
- Chaque carte de défi, et les cartes conservées dans l'historique, offrent un bouton réel **« ♡ Coup de cœur » / « ♥ Retirer des coups de cœur »**.
- Créer un accès facile **« Nos coups de cœur »** avec liste par catégorie (Sensuel/Sexuel), nom du défi, dernière réalisation et possibilité de le retirer. Le favori est rattaché au **couple**, avec attribution de qui l'a marqué ; visible aux deux membres du couple uniquement, jamais aux autres couples.
- Un appui n'enregistre aucun nouveau défi « Réalisé », n'ouvre pas une nouvelle soirée, ne consomme pas de passe, ne remet pas automatiquement la carte sur l'écran actif.

**Moteur de pige :**
1. Marquer un favori rend cette carte **éligible dès une prochaine soirée**, et non dans la soirée où elle a été pigée ou mise en favori. Éviter qu'elle ressorte immédiatement après un passage/refus/adaptation.
2. Les favoris participent à la **pige aléatoire officielle D100** sous leurs catégories et probabilités existantes, **pas uniquement dans un tirage spécial**. Ne pas garantir qu'un favori ressortira à la prochaine soirée, ni augmenter sa pondération sans consentement ultérieur.
3. Un favori demeure admissible à nouveau après chacune de ses futures réalisations tant qu'il conserve son cœur et qu'il n'est pas autrement bloqué par une exclusion explicite. Le retrait du cœur lui rend le régime habituel des cartes non favorites.
4. **Ne pas compter deux fois la même carte comme « nouvel élément unique du cycle de 200 »** seulement parce qu'on rejoue un coup de cœur déjà terminé ; distinguer « réalisations totales » et « défis uniques du cycle » dans les statistiques. Auditer la définition métier actuelle du cycle de 200 avant de modifier ses compteurs ; préserver la progression acquise et les règles des cycles.
5. Les exclusions volontaires de LR-015 **prévalent** sur le cœur : un défi explicitement exclu du lot ne revient pas dans la pige à cause d'un ancien favori. Ajouter éventuellement « Réintégrer ce défi » par geste explicite de l'admin/couple.
6. Conserver les archives et l'historique de chaque réalisation, la confidentialité par couple et les données des deux partenaires. SQL/RPC idempotents, anti-doublons et anti-repige le même soir.
7. Tester **favori avant réalisation**, **favori après réalisation**, **favori déjà vu**, retrait, exclusions, catégorie, probabilités, cycles, deux membres et reprise; comparer base et comportement D100.

**Remise en pige exceptionnelle déjà effectuée séparément pour le couple demandeur (26 octobre 2026) :** les entrées de blocage des cartes précédemment tirées ont été réinitialisées de façon ciblée, sans altérer les défis archivés, les comptes ni la soirée active. Cette opération **ne marque pas les cartes en favoris**. Il ne faut **pas la répéter** ni l'appliquer à d'autres couples. Les informations de compte et de base personnelle doivent rester hors de ce dépôt public ; conserver le détail uniquement dans les résultats de la session d'administration autorisée.

### LR-025 — Mode discrétion / cacher le jeu (idée no 6)
- Dans les fiches de défis/Soirée, proposer un bouton discret **« Masquer »** et éventuellement un raccourci tactile pour masquer immédiatement l'activité affichée.
- L'écran de confidentialité doit cacher **titres, catégories sensibles, consignes, progression intime et éventuellement noms de cartes**. Afficher à la place un écran neutre LoveRoll (logo et bouton **« Revenir au jeu »**) sans notifications ou previews explicites.
- Le mode doit préserver l'état courant : ne pas effacer, valider, passer ou refuser un défi, ni déclencher ou relancer un minuteur ; documenter la gestion visible de celui déjà lancé.
- Supprimer les extraits de défis des notifications Push, titres d'onglets, widgets et aperçus d'application sensibles **lorsque l'API/plateforme le permet**, ne pas promettre une capture d'écran ou multitâche protégée si le navigateur ne permet pas cela.
- Synchronisation : préférence de présentation **locale à l'appareil**, sans masquer de force l'écran du partenaire.
- Tests : retour, verrouillage, actualisation, changement d'onglet, Android/iOS/PC, accessibilité.

**Avancement LR-025 :** [PR #44](https://github.com/fredvolks/loveroll/pull/44), mode masqué local, boutons dans Soirée et cartes, tests Node/Chromium. Encore en brouillon, CI et confidentialité Push/audio/tests physiques à confirmer ; **pas de publication confirmée**.

### LR-026 — Variété intelligente sans répétitions de défis semblables (idée no 7)
- Empêcher autant que possible de proposer deux fois de suite, dans une **même soirée**, des cartes quasiment identiques en activité ou instructions.
- Mettre en place des **tags structurés explicites** (thème, durée, type d'activité, intensité, matériel si requis) ou déduire une similarité locale maîtrisée ; ne pas baser la sécurité métier sur une requête IA probabiliste payante non prévue.
- Construire le filtrage à partir des **cartes admissibles** uniquement ; respecter **catégorie tirée, droits, préférences, rôles, règles de non-répétition et exclusions** ainsi que les mécanismes de hasard D100 existants.
- Si les candidats admissibles sont rares, utiliser un repli transparent pour éviter de bloquer la soirée ou de biaiser secrètement les probabilités.
- Ne jamais éliminer définitivement une carte de la bibliothèque sur simple ressemblance ; les favoris LR-019 restent dans la pige future.
- Tester doublons exacts, quasi-similaires, catégories mixtes, lots épuisés, favoris, custom cards et stabilité multi-appareils.

### LR-027 — Un seul bouton principal par étape (idée no 8)
- Harmoniser la hiérarchie de l'onglet Soirée en n'affichant **qu'une action visuellement dominante** correspondant à l'état réel : **« Brasser mon D6 »**, **« En attente de ton partenaire »** (état, non bouton trompeur), **« Brasser le D100 »**, **« Voir mon défi »**, **« Commencer »**, **« Terminer le défi »** ou **« Reprendre notre soirée »** selon étape.
- Les actions secondaires **« Adapter »**, **« Passer »**, **« Refuser »**, **« Coup de cœur »**, **« Masquer »** restent présentes et faciles à utiliser (pas cachées dans un menu inaccessible).
- Synchroniser le libellé et son état avec le serveur. Ne jamais afficher « Terminer » pour un défi déjà réalisé, ni masquer « Refuser » en raison du plafond de Passer LR-016.
- Design calqué sur l'Accueil : vrais boutons rubis/dorés réactifs, alignements, même typographie, pas de faux boutons en image. Responsive S25 Ultra, petit Android, iPhone, iPad portrait/paysage, PC et clavier.
- Préserver le bouton de confirmation de catégorie LR-014 lors de « Brasser le D100 ».

### LR-028 — Invitation à deux « As-tu envie de jouer ce soir ? » (nouvelle idée)
**Placement :** dans **Soirée**, tant que les **deux partenaires n'ont pas encore lancé leur D6 personnel** pour déterminer le nombre de défis, afficher à celui qui souhaite jouer un bouton **« As-tu envie de jouer ce soir ? ♥ »**. Ne l'afficher que si le couple est associé et que l'autre partenaire est réellement éligible à lancer son D6 pour la soirée. Ne pas changer le nombre de soirées permis ou les règles de fermeture.

**Parcours de l'invitation :**
1. Un partenaire touche le bouton ; le serveur crée une invitation **dans le couple exact** et cible **l'autre membre exclusivement**.
2. Envoyer une **notification Push** via le système existant si ce partenaire a activé les notifications et possède un appareil compatible ; garder **en toute circonstance** une invitation visible **dans l'application** en cas de Push refusé, désactivé, retardé ou indisponible. Ne pas promettre de livraison système Push universelle, surtout sur Safari non installé.
3. Texte de notification discret (pas de titres de défis) : **« ♥ Une invitation LoveRoll t'attend »**. Dans l'application : **« [Prénom] a envie de jouer ce soir. Et toi ? »** avec trois vraies actions **« Oui ♥ » / « Non, pas ce soir » / « Peut-être plus tard »**.
4. **Oui :** enregistrer la réponse et ouvrir **directement l'onglet Soirée à l'étape D6**. Le partenaire invité peut **lancer lui-même son D6 immédiatement** si ses vérifications d'accès et de tour l'autorisent. **Ne jamais lancer le D6 à sa place, sans son toucher** et ne pas créer un nouveau résultat ou contourner les protections serveur.
5. **Non :** répondre poliment à l'autre partenaire (**« Pas ce soir ♥ »**), sans lancer de dé, sans pénalité, sans créer une soirée ni supprimer ses activités. Fermer l'invitation.
6. **Peut-être :** notifier sobrement **« Peut-être plus tard »**, maintenir l'invitation en attente ou la reporter avec une expiration raisonnable ; aucune relance automatique insistante, ni deuxième notification sans une nouvelle action volontaire.
7. Si l'invitant a déjà lancé son D6, l'invité doit encore lancer **son propre D6** ; si l'invitant ne l'a pas lancé, chacun le fait à son tour selon les règles existantes. Aucune révélation anticipée de résultats secrets.
8. Une seule invitation active pour ce **couple + soirée/jour**, dédoublonnage des clics, prévention de spam, statut visible à l'expéditeur (envoyée, oui, non, peut-être, expirée). Si tous les D6 sont déjà lancés, si la soirée est terminée ou si l'invitation devient obsolète, le système doit afficher le bon état sans relancer de dé.
9. Ne pas rendre la réponse « Oui » obligatoire pour accéder normalement à la soirée : le partenaire peut toujours lancer son dé via le parcours de base. Le consentement et la disponibilité de chacun priment ; possibilité d'ignorer ou d'archiver l'invitation.
10. Enregistrer demandes/réponses de manière privée, avec contrôles serveur sur le couple et le destinataire, mécanisme de synchronisation et permissions Push déjà existants ; aucune information intime dans la notification.
11. Tests : oui/non/peut-être, Push activé/désactivé, PWA Safari, Android, invité déjà lancé, invitant déjà lancé, lien profond vers Soirée, double invitation et deux appareils, expiration, non-affichage après les deux D6, respect des quotas.

### Règles transversales et livraison LR-017 à LR-019 / LR-025 à LR-028
- Conserver **LR-015** (refus toujours libre, exclusions) et **LR-016** (3 passes par mois personnalisables), statistiques exactes, cycle 200, règles de confidentialité, sélection de catégorie/confirmation LR-014 et tirages officiels serveur.
- Conserver la page Accueil comme design system unique ; animations sobres, vraie accessibilité clavier/tactile, PWA/Safari/iOS/Android/tablette/PC.
- Travailler par PR ; tests serveur et front, captures avant/après ; tenir **LOVEROLL_SUIVI.md** à jour et ne rien marquer ✅ sans preuve. Ne pas déclarer la nouvelle fonctionnalité implémentée simplement parce qu'elle figure dans ce document.

## P1 — Responsive **mobile + tablette + PC**

### LR-020 — Téléphones Android / iPhone
Tester S25 Ultra, petit Android, iPhone récent et petit format, Safari web/iPhone, PWA ajoutée à l'écran d'accueil, Chrome Android. Respecter safe areas et navigation système, orientation pertinente, clavier, clavier agrandi, contenu long. Barre de navigation accessible, zone tactile confortable, textes non coupés. **Objectif :** aucune page principale nécessitant de défiler dans les conditions mobiles cibles ; préférer zones secondaires/dialogues adaptés sans supprimer le contenu. Accessibilité et gros caractères prévalent sur un « zéro scroll » absolu.

### LR-021 — Tablettes portrait/paysage
Couvrir iPad mini/standard/Air/Pro et tablettes Samsung Android, navigateur et PWA si applicable :
- ne pas étirer un layout téléphone sur grand écran ;
- grilles en 2 colonnes quand cela clarifie, largeur maximale des cartes, marges élégantes, taille contrôlée des dés ;
- D100/D6 ancrés au socle, jamais gigantesques ; calendrier élargi, possibilité « dates + détail » côte à côte en paysage ;
- interactions tactiles et boutons confortables, sans espace mort excessif.

### LR-022 — PC / Mac / navigateurs
Tester Chrome, Edge, Firefox, Safari macOS à **1280×720, 1366×768, 1440×900, 1920×1080, 2560×1440**, plus fenêtre redimensionnée et zoom. Adapter la disposition pour un bureau **premium**, pas une application mobile artificiellement agrandie : max-width, colonnes adaptatives, arrière-plan non étiré, décor conservé, bonne lisibilité. Supporter clic souris, glisser-déposer/rotation 3D, pavé tactile, focus clavier. La molette doit continuer à fonctionner normalement ; pas de zoom/capture de gestes involontaire.

### LR-023 — Règles techniques responsive
Breakpoints **indicatifs** <600 / 600–899 / 900–1199 / 1200–1599 / ≥1600 px, à corriger selon le contenu réel. S'appuyer aussi sur hauteur utile, safe areas, orientation, densité et zoom. Ne pas choisir une taille 3D uniquement à partir de la largeur. Tester les composants dans chaque état. Préserver mêmes données/mécaniques sur chaque appareil.

### LR-024 — Navigation multiplateforme
Mobile : navigation basse actuelle. Tablettes/PC : proposer (avant refonte importante) navigation inférieure plus aérée, horizontale ou latérale selon les tests UX ; les lieux des fonctionnalités restent prévisibles.

## P1 — Audit UX/UI complet « designer + couple »

### LR-030 — Audit écran par écran
Analyser **tous états et sous-écrans** :
- **Accueil :** dé hebdomadaire, chances 1–6, brasser, surprise mensuelle, « Ce soir », statistiques, onglets ;
- **Soirée :** Notre soirée / Éclat Premium, D100, socle, démarrage, activité, clôture, résultats ;
- **Défis :** cartes, intensités, partenaire, consignes, timer/son, saut, réalisation, suivant, progression ;
- **Éclat :** coffrets et activités, transitions, timers, états Premium/verrouillés ;
- **Surprise, Avent :** dés, événements, navigation, disponibilité ;
- **Calendrier :** mois, date, états, soirées, réalisation par partenaire, statistiques ;
- **Réglages, profil, options avancées, administration**, plus inscription/connexion, vide, erreur, chargement, modal, paiement.
Lire le code **réel** et faire des captures si possible ; ne pas inventer des défauts non observés.

### LR-031 — Questions du professionnel
Évaluer hiérarchie, alignement, lisibilité, contraste, proportions, espaces, boutons, accessibilité, fluidité, navigation, cohérence Accueil, impression « application Premium payante ». Donner chaque fois : **constat / impact / correction précise / priorité / effort / capture**.

### LR-032 — Questions du couple
Simuler un partenaire familier du téléphone et un partenaire moins technophile. Peut-on comprendre quoi faire sans explication ? Est-ce clair à qui appartient le défi ? Les instructions, catégories et minuteries sont-elles évidentes ? La soirée peut-elle se faire sans confusions ni trop de clics ? L'app favorise-t-elle l'envie de revenir ? Le calendrier reflète-t-il exactement ce qu'ils ont vécu ? Chercher les interruptions de l'ambiance et les états ambigus.

### LR-033 — Conception sans régression
Suggérer des idées de design et navigation importantes dans le rapport, mais **obtenir validation avant tout changement majeur de parcours ou règles**. Corriger directement uniquement les bugs, l'alignement, le rendu responsive et l'uniformisation évidente déjà demandés.

## P1 — Qualité, tests, livraison

### LR-040 — Tests fonctionnels réels
Scénarios au minimum : 6 faces/animations D100 pertinentes, début/milieu/fin animation ; timer zéro, pause, annulation, saut, défi déjà fini ; fermeture/reprise ; changement d'appareil ; synchronisation ; stats, calendrier, cycle 200 ; pas de double incrément ; sonneries iOS/Android ; catégories non sélectionnées ; Premium inchangé.

### LR-041 — Matrice visuelle multiplateforme
Captures avant/après des pages Accueil/Soirée/Défi/Calendrier/Surprise sur **Android grand/petit, iPhone Safari/PWA, tablette portrait/paysage, ordinateur 1366×768 et 1920×1080** ; compléter Firefox/Safari/Edge lorsque possible. Les 3D ne doivent jamais être coupées ou flotter. Différencier émulation et test sur vrai appareil ; ne pas prétendre avoir testé un appareil absent.

### LR-042 — Traçabilité et rapports
Pour chaque exigence LR-xxx, garder le statut dans [LOVEROLL_SUIVI.md](./LOVEROLL_SUIVI.md) avec preuve : PR/commit, noms des tests, captures, limites. Rapport d'audit : **Page | Problème observé | Proposition | Priorité | Effort | État**. Pas de statut « terminé » sur la foi d'une compilation seule.

### LR-043 — Sécurité, données, déploiement
Respecter authentification, compte couple, autorisations Premium, synchronisation, données des utilisateurs et abonnements. Ne pas écraser de données de production, ni exposer les secrets Android/Supabase. La publication GitHub Pages/Android est **distincte** d'un changement documentaire ; ne pas publier une application non testée.

## Audit en cours

Une [revue rapide de code](./LOVEROLL_PROPOSITIONS_AMELIORATIONS_20261026.md) complète cette spécification. Ses idées 3 à 8 ont été approuvées et détaillées sous LR-017 à LR-019 et LR-025 à LR-027; l'invitation est approuvée sous LR-028. Les autres propositions restent à valider, sauf exigence explicite ultérieure de ce document.

Le [rapport UX/UI du 26 octobre 2026](./LOVEROLL_AUDIT_UX_UI_20261026.md) est un constat technique **provisoire** (designer + couple). Il complète ce prompt sans changer ses exigences. Les nouvelles demandes à traiter dans [LOVEROLL_NOUVELLES_DEMANDES.md](./LOVEROLL_NOUVELLES_DEMANDES.md) restent prioritaires lors des revues futures.

## Exécution des corrections de l'audit du 26 octobre 2026

**Instruction additionnelle reçue le 26 octobre :** appliquer les corrections recommandées par l'[audit UX/UI](./LOVEROLL_AUDIT_UX_UI_20261026.md), **sans effacer les exigences existantes**. Une correction en PR, même avec tests automatiques, n'est pas équivalente à une validation physique ou à un déploiement.

| Constats / recommandations audit | Exigences existantes | Exécution et contrôle exigés |
|---|---|---|
| D100 Soirée trop grand et coupé | LR-001, LR-023, LR-041 | Finaliser [PR #21](https://github.com/fredvolks/loveroll/pull/21), recaler canvas et caméra, comparer Surprise, vérifier rotation et contact socle sur chaque format. |
| Minuterie Soirée terminée mais défi pas crédité | LR-002, LR-040, LR-043 | Finaliser [PR #9](https://github.com/fredvolks/loveroll/pull/9), transitions serveur idempotentes, reprise après suspension et deux partenaires ; aucune validation pour pause, saut ou annulation. |
| Calendrier en cours « non réalisés », taux mensuels ambigus | LR-003, LR-040 | Conserver la correction de libellés déjà fusionnée en [PR #20](https://github.com/fredvolks/loveroll/pull/20) ; [PR #23](https://github.com/fredvolks/loveroll/pull/23) fusionnée le 26 octobre ; tester encore ouverts/clôturés et cycle 200, sans modifier le plafonnement hebdomadaire D6. |
| Minuteries et réglages de son peu découvrables | LR-004, LR-010, LR-030 | Conserver le menu « Notifications → Sonneries des minuteurs », essai sonore après geste utilisateur, confirmation visuelle ; tests réels Safari/Android et limites OS affichées. |
| Catégorie D100 pas assez explicite | LR-013, LR-012 | [PR #24](https://github.com/fredvolks/loveroll/pull/24) : consigne dans la seconde rangée sans déplacer trois boutons, liaison accessible, suppression au choix ; non-présélection et interdiction du tirage serveur avant choix restent obligatoires. |
| CSS empilé / cohérence imparfaite potentielle entre pages | LR-010, LR-011, LR-030 | [PR #26](https://github.com/fredvolks/loveroll/pull/26) : variables de surfaces rubis de l'Accueil partagées sur iPad/PC pour les menus Réglages (tests Node + Chromium) ; poursuivre l'inventaire couleurs, titres, cartes, boutons et états, sans refaire l'Accueil et sans faux boutons-images. |
| Défis trop denses ou actions ambiguës | LR-012, LR-032 | [PR #31](https://github.com/fredvolks/loveroll/pull/31) : rendre les longues consignes lisibles dans la fiche sans rogner les commandes (focus clavier + défilement interne) ; vérifier encore catégorie, destinataire, timer, « Réalisé », « Passer », « Suivant » et synchronisation à chaque état, sans changer l'attribution serveur. |
| Très petit écran / fort zoom : contenu piégé | LR-020, LR-023 | [PR #24](https://github.com/fredvolks/loveroll/pull/24) : calendrier défilable sous 650 px et Réglages accessibles à hauteur tactile ≤ 560 px (clavier/zoom) ; vérifier les autres pages, safe areas et tests physiques sans imposer le défilement partout. |
| Installation Safari iPhone non évidente | LR-020, LR-030 | Conserver un guide natif « Partager → Sur l'écran d'accueil » lisible sans défilement obligatoire ; ne pas promettre d'installation automatique ou de sonnerie en arrière-plan. |
| Écrans iPad et PC étirés / navigation, calendrier à clarifier | LR-021, LR-022, LR-024, LR-033 | Vérifier les largeurs max, cartes, boutons, dés et focus clavier ; garder les fonctions prévisibles. La navigation latérale et le calendrier en deux colonnes restent des changements de parcours à valider visuellement avant publication. |
| Audit sur code seulement, preuves physiques incomplètes | LR-030 à LR-043 | Captures comparatives Accueil, Soirée, Défi, Surprise, Calendrier ; préciser viewport/émulation/appareil, résultats CI, commit et risques. **Ne cocher aucun LR-xxx entier sans acceptation complète.** |

**Gestion des branches :** la PR #23 a été fusionnée dans `main` après succès des tests GitHub. Les PR #9 et #21 restent distinctes et leurs états actuels de fusion/CI doivent être vérifiés avant une publication. La PR #24 est un lot isolé de mise en page et d'accessibilité, ouvert en brouillon ; ses tests et captures demeurent à vérifier.

## Reprise intégrée — 26 octobre 2026 : nouvelles demandes et état des PR

**Ne pas recommencer le projet.** Le prompt maître reste la source officielle ; cette section complète l'ordre d'exécution initial en tenant compte des exigences approuvées LR-014 à LR-019 et LR-025 à LR-028. Aucune PR ouverte n'est une preuve de déploiement en production.

| Exigence | Travail présent | Validation restante |
| --- | --- | --- |
| LR-012 | [PR #31](https://github.com/fredvolks/loveroll/pull/31), lecture des consignes longues dans le CSS actif, CI réussi | Conflit de fusion à résoudre, QA appareils, fusion/déploiement |
| LR-014 | [PR #34](https://github.com/fredvolks/loveroll/pull/34), confirmation de catégorie D100, CI réussi | Conflit de fusion à résoudre, QA multi-profils, fusion/déploiement |
| LR-015 | Spécification approuvée | RPC atomique Passer/Refuser/repige, exclusion et réintégration des non réalisés, tests concurrence |
| LR-016 | [PR #43](https://github.com/fredvolks/loveroll/pull/43), plafond serveur 3/mois/personne configurable 0–30, CI réussi | Intégration Réglages, compteurs, cohérence LR-015, validation DB, déploiement SQL |
| LR-017–019 | Spécifications approuvées | Adapter par consentement, reprise serveur, favoris rééligibles aux soirées futures |
| LR-025 | [PR #44](https://github.com/fredvolks/loveroll/pull/44), écran neutre local et boutons Masquer, CI réussi | Vérification physique iOS/Android, confidentialité des notifications/audio, fusion/déploiement |
| LR-026–028 | Spécifications approuvées | Variété de pige, hiérarchie d'action, invitation Oui/Non/Peut-être avec stockage privé et Push facultatif |

**Ordre de continuation historique (consulter le guide de coordination pour l'ordre courant) :**
1. Résoudre les conflits et valider les PR P0/P1 déjà ouvertes, sans fusionner à l'aveugle. Conserver les tests visuels du D100 et de l'Accueil.
2. Terminer LR-015 côté SQL/RPC avant d'exposer des boutons Passer/Refuser : aucun nouveau défi fantôme, pas de dépassement de quota, un seul tour, exclusion par couple et conservation de l'historique.
3. Intégrer LR-016 côté UI et tests de concurrence, en conservant Refuser illimité même après 3 passes ; déployer la migration seulement avec une version client compatible.
4. Livrer LR-018 (reprise fidèle), puis LR-019 (coups de cœur rejouables, sans doublons du cycle de 200), puis LR-017 (adaptations avec consentement).
5. Livrer LR-025 après vérification réelle, puis LR-026/027 et LR-028 (invitation à jouer) avec contrôle serveur et confidentialité.
6. Mettre à jour `docs/LOVEROLL_SUIVI.md` et les captures après chaque lot ; marquer terminé uniquement si le scénario réel est démontré.

**Contraintes permanentes :** le bouton Passer consomme un quota mensuel propre au destinataire, Refuser reste libre ; les favoris ne deviennent éligibles qu'à partir d'une prochaine soirée et ne contournent jamais les exclusions ; l'invitation Oui n'exécute pas le D6 à la place du partenaire ; masquer le jeu ne modifie pas ses données. Conserver les tarifs, abonnements, comptes, thèmes, dés 3D et le visuel Accueil sans modification hors demande explicite.

## Ordre d'exécution initial — historique, complété par le guide de coordination
1. Identifier code réel et branches, établir captures initiales, figer les régressions.
2. **P0 : LR-001 à LR-004** (D100, timers, calendrier, audio) avec tests.
3. **P1 : LR-010 à LR-013** (harmonisation et cartes) sur la base Accueil.
4. **P1 : LR-020 à LR-024** (smartphone/tablette/PC).
5. **P1 : LR-030 à LR-033** (audit designer + couple, propositions).
6. **P1 : LR-040 à LR-043** (validation, rapport, suivi et traçabilité).

## Format attendu de la restitution
- anomalies **réellement reproduites** avec pages/captures ;
- changements effectués avec fichiers exacts, PR et SHA ;
- tests exécutés, **pass/fail/non exécuté** ;
- tableau LR-xxx avec états honnêtes ;
- recommandations UX/UI **sans les faire passer pour des correctifs appliqués** ;
- risques résiduels et prochaine action.

> **Directives impératives :** pas de refonte totale ; ne pas demander « continue » après chaque bloc ; ne pas interrompre sans nécessité ; conserver l'identité LoveRoll et les règles du jeu ; Accueil = source visuelle ; un dé rendu complet et posé sur son socle ; une minuterie qui arrive à 00:00 valide **une seule fois** le défi associé.


## LR-SURPRISE-001 — Rendez-vous surprise premium, D100 et Geoapify
**Demande approuvée le 26 octobre 2026 — à implémenter et vérifier. Cette section précise les règles antérieures incompatibles concernant les filtres de distance et de budget.**

### Mission et périmètre
Améliorer le parcours Surprise existant pour fournir au couple une sortie pertinente, facile à adapter et à planifier. Conserver Geoapify pour les lieux réels, le D100 mensuel, le D6 qui désigne qui invite/organise, les événements spéciaux, les tirages officiels et leur historique. Ne pas recommencer le module. Donner une expérience premium à cet onglet sans modifier les tarifs, Stripe ou les droits des abonnements existants dans ce lot. Les 20 $/mois évoqués servent de niveau d'exigence produit, pas d'instruction de changement de prix.

### 1. Budget et kilomètres entièrement facultatifs — règle ferme
- Les champs « Budget maximal pour deux » et « Distance maximale aller simple (km) » peuvent rester vides, indépendamment.
- Vide signifie **aucun plafond choisi par le couple** pour ce critère. Stocker null, le transmettre comme null et le préserver après sauvegarde/rechargement. Ne jamais remplacer silencieusement par 125 km, 100 $, zéro ou une autre valeur par défaut.
- Les deux champs vides signifient **toutes les possibilités**, pas « All in », pas une préférence luxe, coûteuse ou lointaine. Une promenade, un café, un mini-putt et une sortie à 300 $ restent tous admissibles; les sorties modestes et proches ne doivent pas être éliminées ou déclassées parce que les champs sont vides.
- Affichage : « Toutes les distances » et « Tous les budgets ». Aucun libellé « All in », « sans limite de dépenses » ou promotion automatique vers le haut de gamme.
- Un montant rempli est un plafond pour deux, dans la devise affichée; 0 $ signifie activité gratuite et reste distinct de null. Préciser les frais inclus ou inconnus; ne pas garantir une gratuité totale si transport, stationnement ou autres frais sont inconnus.
- Une distance remplie est un plafond de trajet routier aller simple, et non la distance à vol d'oiseau. Refuser les valeurs invalides avec un message clair.
- Aucun tarif absent ne doit devenir 0 $. Si le budget est plafonné et le coût inconnu, ne pas présenter le lieu comme respectant ce plafond : chercher une option documentée ou demander explicitement si le couple accepte une proposition au prix à vérifier.
- Lever les plafonds métier existants incompatibles dans le formulaire, la normalisation, le RPC, le schéma et la fonction Geoapify. Conserver séparément les limites techniques de requêtes et les protections de coûts.
- Sans plafond de distance, utiliser une recherche progressive bornée techniquement, sans balayage mondial ni appels sans limite. Présenter honnêtement la portée réellement explorée; ne pas la faire passer pour un choix du couple ou une recherche exhaustive. Le point de départ reste nécessaire pour une recherche géographique.
- Aucune réservation ni dépense automatique.

### 2. Écran Surprise et parcours du couple
- Conserver le décor rouge, le socle, l'identité visuelle, les dés 3D et la navigation existante.
- Avant tirage : titre « Notre rendez-vous du mois », mois et état « À découvrir », grand D100 complet posé sur son socle, bouton « Brasser notre surprise ».
- Ajouter une ligne compacte des préférences avec « Modifier » : point de départ, distance ou « Toutes les distances », budget ou « Tous les budgets ». Aucun questionnaire obligatoire chaque mois.
- Après tirage : faire du rendez-vous l'information principale; réduire le dé sans supprimer le résultat officiel. États partagés : à planifier, prévu, réalisé, avec règles serveur et historique.
- Carte : titre concret, lieu réellement trouvé, distance vérifiée, durée de trajet si disponible, description courte et prochaine action « Choisir notre date ».
- Fiche : adresse, GPS, site officiel, réservation externe si disponible, préparation utile, informations de prix/horaires/disponibilités explicitement à vérifier lorsqu'elles ne sont pas confirmées. Ne pas inventer de photo, service, tarif ou lien.
- Conserver « Nos événements » et le D6 « Qui organise notre rendez-vous ? ».
- La personne qui invite propose une date; son partenaire peut accepter ou proposer une autre date. Distinguer accord du couple et réservation externe déclarée confirmée. Les permissions de réservation restent celles de l'hôte.
- Ajouter « On l'a fait ♥ », appréciation et souvenir/photo facultatifs avec confidentialité du duo.
- Après découverte, une carte secondaire « Un moment à deux cette semaine » peut fournir une idée simple complémentaire, sans nouveau D100 officiel ni modification de ses quotas. Elle ne doit pas surcharger l'écran.

### 3. Qualité des idées et adaptation
- Simplifier les titres du catalogue et créer une variété réelle; ne pas compter un simple changement de titre comme une nouvelle expérience.
- Le lieu final doit correspondre à l'activité annoncée. « Mini-golf » ne peut pas aboutir à un centre sportif générique ou des quilles sans adaptation explicite. Vérifier les catégories; si le service précis reste inconnu, employer un titre honnête.
- Geoapify fournit les lieux; LoveRoll compose le rendez-vous et peut ajouter une petite mission complice facultative, sans prétendre que l'établissement la fournit.
- « Adapter la sortie » : autre lieu, déjà visité, fermé, trop loin, trop cher, variante adaptée. Préserver le D100, l'hôte et l'historique; ne pas consommer les passes des défis de soirée.
- Enregistrer les appréciations et éviter les répétitions de lieux; conserver la diversité des catégories et des coûts sans favoriser les activités chères.
- Une modification des préférences ne remplace jamais silencieusement un rendez-vous déjà réservé.

### 4. Correctifs de fiabilité prioritaires
- Rejeter les distances null/absentes/non numériques de la matrice Geoapify avant conversion : un trajet absent n'est jamais 0 km.
- Séparer panne temporaire, recherche en cours et aucun résultat. Une panne ne doit plus rendre le mois définitivement indisponible.
- Relances bornées avec attente, cache et verrou serveur; ne pas multiplier les appels payants si les deux partenaires ouvrent simultanément.
- Rafraîchir les états pending jusqu'au résultat ou à une erreur récupérable, avec arrêt du suivi à la fermeture/changement de compte.
- Préremplir la date locale existante lors de la modification d'une réservation.
- Annoncer un rappel uniquement selon son état réellement programmé et les préférences de notifications. Une simple planification ne doit pas promettre un rappel réservé aux réservations confirmées.
- Conserver les clés côté serveur, l'isolation par couple et les contrôles de l'hôte.

### 5. Critères de validation et livraison
Tester au minimum : deux champs vides, chaque champ vide séparément, budget 0, budget 300, distance plafonnée, valeurs invalides, sauvegarde/rechargement des null, prix inconnu, variété avec filtres vides, absence de trajet, panne puis reprise, double ouverture, aucun lieu, adaptation sans nouveau tirage, date/rappel modifiés et synchronisation entre partenaires.
Vérifier visuellement sur Android S25 Ultra, iPhone, tablette et PC : D100 complet sur socle, lisibilité, formulaire utilisable, boutons accessibles et absence de débordement.
Livrer par lots vérifiés dans le dépôt existant, suivre les tests GitHub jusqu'au résultat final et mettre à jour le suivi avec preuves. Distinguer documentation ajoutée, code implémenté, tests réussis et déploiement réellement vérifié. Ne pas cocher cette exigence comme réalisée après le seul ajout de ce prompt.


## LR-ACCUEIL-001 — Accueil : vue d'ensemble et raccourcis; Soirée : parcours de jeu
**Demande approuvée le 26 octobre 2026 — spécification à implémenter et vérifier.** Cette section retient la proposition simplifiée finale et remplace toute proposition antérieure faisant de l'Accueil un deuxième écran de jeu.

### But et séparation des responsabilités
L'Accueil permet de comprendre où en est le couple et d'accéder à la prochaine étape. L'onglet Soirée reste le lieu où l'on joue.
- Conserver sur Accueil : D6 hebdomadaire partagé, résultat officiel, quota hebdomadaire restant, statut compact de la soirée, carte Surprise/Éclat et petit bilan mensuel.
- Conserver dans Soirée : création/démarrage de soirée, invitation LR-028 et ses réponses, D6 personnels, D100 des défis, choix/confirmation de catégorie, listes privées, cartes, adaptation, passer/refuser, favoris, minuteries, complétion et clôture.
- Les raccourcis d'Accueil ouvrent la bonne étape de Soirée sans lancer un dé, créer une session, envoyer une invitation ou changer un état métier automatiquement.
- Réutiliser les sources serveur et règles existantes; ne pas créer un deuxième moteur d'état ou des compteurs concurrents.

### Écran et action principale
Préserver décor rouge, logo, typographie, boutons rubis, vrai D6 3D, socle/tissu, navigation et ambiance actuelle. Conserver les probabilités et les règles de tirage. Aucun remplacement par une image plate.
1. Avant tirage officiel : « Cette semaine, on joue ? » et « Brasser notre dé ». Un tirage commun par semaine, protections serveur et double-tap existantes.
2. Après tirage : résultat toujours visible et progression lisible, par exemple « 3 soirées cette semaine · 2 disponibles ». Calculer le disponible selon les quotas officiels, y compris sessions actives et règle journalière; ne pas confondre disponible cette semaine et démarrable aujourd'hui.
3. Remplacer le gros bouton inerte « Déjà brassé cette semaine, revenez la semaine prochaine » par un raccourci « Aller à notre soirée »; si une soirée est ouverte, « Reprendre notre soirée »; si le quota est épuisé, « Voir nos soirées » ouvre l'historique. Mentionner sobrement la prochaine disponibilité lorsque pertinente, sans promettre une nouvelle soirée le même jour.
4. Un retour dans Soirée retrouve l'état officiel, même si le partenaire a avancé ou clôturé depuis un autre appareil; aucun nouveau tirage ou quota consommé par navigation.
5. Le D6 montré avant tirage reste clairement une prévisualisation, jamais un résultat acquis.

### Carte compacte « Ce soir »
- Remplacer le tableau détaillé par partenaire et les tirets « — / Restants : — » par un statut clair et un accès à Soirée.
- Exemples selon état réel : « Aucune soirée commencée », « Une invitation vous attend », « En attente du partenaire », « Soirée en cours », « Notre soirée est terminée ♥ ».
- Distinguer chargement, absence de soirée et problème réseau. Un chargement ne doit pas apparaître comme zéro activité.
- Ne pas montrer ici les consignes, cartes, catégories intimes ou résultats individuels encore secrets; les détails de progression par joueur restent dans Soirée.
- Ne pas dire « Ce soir » pour une session ancienne laissée ouverte : proposer la reprise avec un libellé honnête.
- Le refus et le consentement ne sont jamais assimilés à une faute ou à une perte de points par cette synthèse.

### Carte mensuelle et bilan
- Faire évoluer la carte Surprise selon l'état LR-SURPRISE-001 : à découvrir, choisir qui invite, à planifier, date prévue, réalisé. Ne plus garder systématiquement « Surprise du mois disponible » après réalisation.
- Après réalisation explicite du rendez-vous (pas après le seul tirage), cette place peut présenter Éclat conformément à la demande existante; Surprise reste accessible par son onglet et les droits Éclat existants s'appliquent. Aucun changement tarifaire.
- Bilan mensuel discret, collectif et cliquable : défis réalisés ensemble et soirées partagées; exemple uniquement illustratif, aucune valeur codée en dur. Le détail conserve les informations existantes via une vue de bilan/calendrier.
- Si la série actuelle est affichée, la nommer « Semaines consécutives »; ne pas la présenter comme le total des semaines actives du mois.
- Vérifier et documenter la date métier servant au classement mensuel des défis réalisés, notamment les sessions qui traversent minuit ou un changement de mois. Ne pas réécrire l'historique ni inventer une date de complétion absente.
- Préserver distinction réalisations totales/défis uniques du cycle, favoris LR-019 et confidentialité LR-025.

### Acceptation et livraison
Tester : avant/après D6 hebdomadaire; quota partiel/épuisé; verrou journalier; invitation en attente; un seul D6 personnel lancé (pas de révélation); deux D6 lancés; session ouverte/ancienne/clôturée ailleurs; retour/rechargement/deux comptes; offline/chargement; changement de semaine/mois America/Toronto; Surprise à chaque étape; droits Éclat.
Vérifier qu'un raccourci ne produit aucune mutation métier; le jeu est effectué dans Soirée. Valider les compteurs avec la logique partagée.
Captures avant/après sur S25 Ultra, petit Android, Safari iPhone/PWA, tablette portrait/paysage et PC. Aucune coupe du dé, aucun flottement du socle, texte lisible et contrôles accessibles. Pas de défilement inutile en format cible; accessibilité et gros caractères restent prioritaires (LR-020).
Mettre à jour le suivi avec code, tests et preuves de publication; ne pas déclarer ce parcours livré après la seule mise à jour du prompt.
