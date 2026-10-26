# LoveRoll — PROMPT MAÎTRE OFFICIEL
> Version documentaire 2026-10-26 · Dépôt officiel : [fredvolks/loveroll](https://github.com/fredvolks/loveroll) · Statut initial : **demandé / à auditer**, pas « terminé ».

## Comment utiliser ce document
Ce document est la **source de vérité des demandes** concernant le correctif du D100, les minuteries, la cohérence graphique et le responsive. Il ne signifie **pas** que ces exigences sont implémentées. Chaque exigence possède un identifiant LR-xxx repris dans [LOVEROLL_SUIVI.md](./LOVEROLL_SUIVI.md).

- Ajouter des demandes dans [LOVEROLL_NOUVELLES_DEMANDES.md](./LOVEROLL_NOUVELLES_DEMANDES.md) ou ouvrir une **Issue** GitHub ; ne pas effacer les demandes anciennes.
- Lors du prochain développement, lire ce document, le suivi, les nouvelles demandes, le README et le code réel avant de modifier quoi que ce soit.
- Pour chaque demande, documenter fichier, PR, tests et capture **avant** de passer à « Terminé ». Ne pas inventer un état d'avancement.
- Ne pas modifier silencieusement les règles commerciales, les abonnements, la progression ou le contenu des défis.

## Identité et périmètre
**Produit :** LoveRoll, expérience romantique à deux sur Android et PWA (Safari iPhone/iPad, navigateurs PC/tablettes). **Dépôt :** fredvolks/loveroll, et non le dépôt historique Mon Wallet. **Code :** PWA dans `couple-web/`, Android dans `app/`. La page **Accueil actuelle** est la **référence graphique et fonctionnelle** : rubis, bordeaux, rose et doré, rideaux, chandelles, roses, marbre, logo LoveRoll, effets de verre et boutons Premium.

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

**Statut de cette demande :** **À faire — ajout au cahier des charges uniquement**, aucune fonction n'est déclarée implémentée par la mise à jour documentaire. Conserver LR-013 et toutes les règles de catégorie existantes.


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

**État : À faire — spécification uniquement.** Cette mise à jour du prompt n'implémente pas la fonctionnalité.

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

Une [revue rapide de code avec 7 propositions d'amélioration à valider](./LOVEROLL_PROPOSITIONS_AMELIORATIONS_20261026.md) complète la présente spécification LR-016. **Ces propositions ne sont pas encore des exigences approuvées** et ne doivent pas être codées automatiquement.

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

## Ordre d'exécution souhaité
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
