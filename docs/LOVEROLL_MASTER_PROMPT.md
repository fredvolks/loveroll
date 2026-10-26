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
| CSS empilé / cohérence imparfaite potentielle entre pages | LR-010, LR-011, LR-030 | Inventorier les couleurs, titres, cartes, boutons et états dans Accueil ; créer des jetons et composants partagés, remplacer progressivement les divergences **réellement observées**, sans refaire l'Accueil et sans faux boutons-images. |
| Défis trop denses ou actions ambiguës | LR-012, LR-032 | Vérifier sur chaque état la catégorie, le destinataire, le texte, le timer, « Réalisé », « Sauter », « Suivant », ainsi que l'état de synchronisation ; réduire les clics sans changer l'attribution serveur. |
| Très petit écran / fort zoom : contenu piégé | LR-020, LR-023 | [PR #24](https://github.com/fredvolks/loveroll/pull/24) : calendrier défilable uniquement sous 650 px de hauteur CSS ; étendre les vérifications clavier, grand texte et safe areas aux autres pages, sans imposer le défilement partout. |
| Installation Safari iPhone non évidente | LR-020, LR-030 | Conserver un guide natif « Partager → Sur l'écran d'accueil » lisible sans défilement obligatoire ; ne pas promettre d'installation automatique ou de sonnerie en arrière-plan. |
| Écrans iPad et PC étirés / navigation, calendrier à clarifier | LR-021, LR-022, LR-024, LR-033 | Vérifier les largeurs max, cartes, boutons, dés et focus clavier ; garder les fonctions prévisibles. La navigation latérale et le calendrier en deux colonnes restent des changements de parcours à valider visuellement avant publication. |
| Audit sur code seulement, preuves physiques incomplètes | LR-030 à LR-043 | Captures comparatives Accueil, Soirée, Défi, Surprise, Calendrier ; préciser viewport/émulation/appareil, résultats CI, commit et risques. **Ne cocher aucun LR-xxx entier sans acceptation complète.** |

**Gestion des branches :** les PR #9, #21 et #23 sont distinctes. Leurs conflits documentaires avec `main` ont été résolus le 26 octobre par synchronisation du suivi ; les validations GitHub sont toujours requises avant toute fusion. La PR #24 est un lot isolé de mise en page et d'accessibilité, ouvert en brouillon ; ses tests et captures demeurent à vérifier.

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
