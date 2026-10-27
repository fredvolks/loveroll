# LoveRoll — PROMPT MAÎTRE OFFICIEL
> Version documentaire 2026-10-27 · Dépôt officiel : [fredvolks/loveroll](https://github.com/fredvolks/loveroll) · Statut initial : **demandé / à auditer**, pas « terminé ».



## MODE PRIORITAIRE — DÉVELOPPEMENT LOCAL PAR LOTS COHÉRENTS (27 octobre 2026)

**Décision approuvée : accélérer LoveRoll en réalisant le travail dans un espace local avant un push groupé.** Cette méthode prévaut sur les anciennes habitudes de petites PR/commits et de relances CI répétées. Elle ne change **aucune** mécanique approuvée, protection de données, exigence de recette, prix ou autorisation.

**Entrée d'exécution courte :** [LOVEROLL_WORK_START.md](./LOVEROLL_WORK_START.md). Au démarrage, lire cette routine, puis seulement les parties nécessaires du présent maître, du [suivi](./LOVEROLL_SUIVI.md) et des spécifications liées. Ne pas parcourir à nouveau 900 lignes à chaque action.

1. **Un seul diagnostic préalable ciblé.** `git fetch origin --prune`, partir du dernier `origin/main` et regarder les PR ouvertes, leurs bases, fichiers affectés, CI et éventuelles migrations. Ne pas modifier ni rebâtir les branches déjà prises par une autre livraison. Vérifier une fois la compatibilité, puis coder.
2. **Local d'abord, GitHub à la fin.** Sur une branche de travail isolée, réaliser toutes les modifications liées au même parcours dans le clone local (ou espace de travail local équivalent). Tester, corriger et réutiliser les modules existants sans pousser à chaque ajustement. Les commits de sauvegarde locaux sont autorisés; **un seul push final planifié** lorsque le lot est cohérent et vérifié. Si le clone local est réellement impossible dans l'environnement disponible, utiliser le connecteur GitHub pour un **commit multi-fichiers groupé** et l'indiquer explicitement; ne pas prétendre avoir testé localement.
3. **Dimension des lots.** Un lot contient plusieurs tâches complémentaires d'un même parcours, avec état utilisable de bout en bout. Exemples : tous les écrans et transitions d'un même correctif Soirée; présentation, édition, persistance et erreurs d'un sous-parcours Surprise; pour Éclat, développer d'abord les fondations sûres réutilisables, puis viser **trois lots de quatre coffrets (01–04, 05–08, 09–12)** suivant [les douze règles de jeu figées](./LOVEROLL_ECLAT_12_COFFRETS_SPEC.md). Les quatre coffrets d'un lot doivent fonctionner réellement avant de les déclarer livrés. Scinder un lot si les risques, migrations ou dépendances rendent cette frontière non sûre. Ne pas inventer le gameplay.
4. **Contrôles pendant le codage.** Lancer la syntaxe et les tests unitaires pertinents localement à mesure que le lot se construit; tests des vraies transitions métier et cas d'échec avant push. Pour un changement visuel, faire une seule recette responsive groupée sur les formats concernés; pour une mutation d'état, synchronisation, RLS, tirage, paiement ou timer, vérifier les permissions, la concurrence et les échecs. Ne pas affaiblir/désactiver les tests existants pour gagner du temps.
5. **Un cycle distant par livraison.** Après tests locaux réussis, pousser, créer/mettre à jour **une PR cohérente**, attendre **tous les checks GitHub obligatoires du SHA final**, corriger les échecs à la source, puis fusionner si les protections et dépendances l'autorisent. Ne pas produire de multiples PR pour un bouton, une marge, un import et une note de suivi du même parcours. Éviter de repousser du code sans nécessité pendant une validation GitHub en cours. Aucun merge d'un SHA échoué ou de résultats périmés.
6. **Publication réelle et reprise.** Vérifier que le workflow Pages est vert et que la version, les assets et le démarrage sont réellement servis. Les Edge Functions Supabase, migrations et APK Android nécessitent leurs déploiements et validations **distincts**; Pages seul ne les publie pas. Préserver le projet Supabase officiel LoveRoll `ejsrqfpkgwraorrznjpm`, sans toucher aux projets d'autres applications. Enregistrer une fois le statut et les preuves du lot dans le suivi sans refaire démarrer la CI uniquement pour la note. Puis commencer le prochain lot autorisé durant la session disponible, sans redemander « continue ».
7. **Mesurer ce qui compte.** Nombre de parcours terminés, qualité observée et régressions évitées; pas nombre de commits, PR ou workflows. Distinguer implémenté, testé localement, CI verte, fusionné, publié et validé sur appareils physiques. Aucun travail asynchrone n'est présumé après la fin de session.

**Interdictions maintenues :** aucune fusion contournant une protection, aucun `force push` destructif, aucun secret dans Git, aucune mise à jour de tarifs ni action de facturation implicite, aucun lancement non validé de migrations ou de modifications de sécurité. Les exigences et l'ordre métier du maître restent applicables.

## Mode d'exécution prioritaire — livraisons par lots et vérifications proportionnées (27 octobre 2026)

**Demande approuvée : accélérer les modifications en supprimant les vérifications répétées après chaque micro-ajout.** Cette section remplace les anciennes consignes de cadence, d'audit, de captures et de compte rendu incompatibles, y compris dans les passations. Elle conserve toutes les exigences produit, la confidentialité, les protections GitHub et les contrôles obligatoires.

1. **Démarrage ciblé.** À la reprise, lire les consignes courantes, le dernier état utile du suivi et les sections du maître nécessaires à la demande. Vérifier une fois les branches/PR/CI pertinentes et le code concerné. Ne pas relire l'historique entier ni refaire l'audit de toute l'application avant chaque correction. Les anciens numéros de PR et incidents ne deviennent des priorités que s'ils sont encore actifs.
2. **Terminer un lot fonctionnel avant la recette.** Regrouper les petites modifications liées au même écran ou parcours dans une branche/PR cohérente : implémenter, ajuster, puis valider le lot. Ne pas créer systématiquement un commit, une PR, un cycle CI, une version et un rapport pour chaque bouton, marge, libellé ou ligne CSS. Garder séparées les modifications indépendantes ou risquées; ne pas accumuler une refonte massive.
3. **Vérifications locales ciblées.** Pendant l'implémentation, utiliser les contrôles rapides utiles (syntaxe, test de la logique touchée, aperçu). À la fin du lot, tester le parcours modifié et ses dépendances directes. Une correction visuelle ne nécessite pas de refaire les tests de paiement, quotas ou migrations inchangés. Un changement de minuterie, autorisation, tirage, synchronisation ou données exige les scénarios métier et de concurrence concernés. Ne pas créer de tests qui vérifient seulement la présence d'une ligne CSS ou d'un texte source.
4. **Recette visuelle groupée.** Pour CSS, décor, caméra ou responsive : contrôler les écrans et formats affectés, avec une capture de référence et le rendu final utile. Pour la parité iPad/Android, comparer ces deux formats et les orientations concernées; étendre aux autres formats si un composant partagé change. La matrice complète LR-041 se fait à la livraison d'une modification transversale ou lors d'un audit dédié, jamais après chaque micro-ajustement. Conserver les critères d'acceptation fonctionnels de la demande.
5. **Une validation finale par lot, sans doublons volontaires.** Avant fusion, laisser terminer tous les contrôles GitHub requis sur la révision attendue par les protections. Réutiliser les résultats locaux encore applicables; ne pas relancer manuellement les mêmes suites déjà réussies sans modification pertinente, échec ou doute précis. Une retouche documentaire seule n'oblige pas à refaire manuellement la recette applicative; elle ne permet pas de présenter une ancienne CI comme exécutée sur le nouveau SHA. Les checks automatiques déclenchés ou requis restent respectés.
6. **Aucune boucle documentation → CI → documentation.** Mettre à jour le suivi une fois par lot avec résultat, référence du code testé, preuves utiles et limites. Un run sait fournir son statut : ne pas committer une nouvelle note uniquement pour annoncer la réussite du commit documentaire précédent. Ne pas relancer une CI pour produire une preuve identique. Réserver les rapports d'audit complets aux demandes d'audit; restitution ordinaire courte.
7. **Attendre utilement et livrer.** Après un push du lot, suivre les runs pertinents jusqu'à leur conclusion avec des consultations espacées, sans scruter les mêmes journaux à répétition. Pendant l'attente, avancer un travail indépendant compatible sans modifier la révision en validation. En cas d'échec, lire les étapes fautives, corriger la cause et vérifier la correction; aucun test désactivé ou affaibli pour publier. Puis fusionner et publier selon les autorisations existantes, vérifier le démarrage et le parcours livré, et enchaîner sans demander « continue ». Ne pas annoncer un travail poursuivi après la session.
8. **Appareils et états honnêtes.** Indiquer ce qui a été testé en émulation et sur appareil réel. L'absence d'un appareil physique ne bloque pas à elle seule un lot vérifié par les moyens disponibles, sauf risque précis dépendant de cet appareil; conserver la validation physique restante au suivi et ne pas déclarer l'exigence entièrement acceptée avant ses critères complets.
9. **Pipeline : optimisation distincte et mesurée.** Si la CI complète reste lente, relever les durées et les doublons avant de proposer ou réaliser un lot dédié au pipeline : partage des commandes, cache des dépendances, jobs indépendants, sélection de tests selon les dépendances démontrées. Ne pas supprimer une couverture nécessaire, contourner une protection ou transformer un échec bloquant en simple avertissement pour gagner du temps. Cette révision du prompt ne modifie pas les workflows.

**Critère de réussite :** un parcours utilisable livré et vérifié, avec moins de cycles de validation et de documentation redondants. Le nombre de commits, tests, PR ou captures n'est pas une mesure de progression.

## Priorité immédiate — rétablir la publication Web et terminer les lots (26 octobre 2026)

**Instruction de livraison approuvée :** dans le périmètre des exigences déjà approuvées, l'agent peut sortir les PR de brouillon, intégrer les dépendances compatibles, résoudre les conflits, fusionner après les validations requises et publier les lots fonctionnels sans redemander « continue » ou une autorisation de fusion déjà couverte par cette instruction. Les protections GitHub et les contrôles de sécurité continuent de s'appliquer. Aucun contournement de contrôle requis, changement de prix ou opération destructive n'est autorisé par ce paragraphe.

1. **Priorité P0 de livraison :** réparer le pipeline Pages avant d'accumuler d'autres fonctionnalités. La PR #47 corrige le décompte obsolète des boutons de fin de soirée; vérifier sa tête, son diff, les tests et ses dépendances, intégrer la correction puis suivre le vrai déploiement main jusqu'à sa conclusion. Son numéro est un repère historique : revalider son état réel.
2. **Un lot validé va jusqu'à la livraison :** contrôler une fois la compatibilité serveur/client, les migrations et les droits concernés par le lot; sortir de brouillon lorsque prêt; fusionner; suivre les workflows; vérifier le site publié. Ne pas garder un lot prêt en brouillon pour la seule raison qu'aucune seconde permission n'a été demandée.
3. **Ne pas tout fusionner ensemble :** conserver les travaux ouverts, ordonner les PR empilées, publier des lots complets et indépendants. Une dépendance manquante ou un vrai risque est documenté précisément; poursuivre les lots indépendants.
4. **Tests proportionnés :** exécuter les vérifications utiles au changement et tous les contrôles requis. Réutiliser les résultats du même code lorsqu'ils restent valides; ne pas recommencer un audit global ni relancer une suite identique sans changement pertinent, échec ou doute concret. Ne pas désactiver un test pour publier.
5. **Versions honnêtes :** pour une livraison applicative, harmoniser le numéro Web affiché, le manifeste de version et les clés de cache pertinentes selon la convention du projet. Ne pas incrémenter une version pour masquer un déploiement absent. Vérifier les assets et le comportement servis, pas seulement le JSON.
6. **Compte rendu :** fournir version réellement servie, commit publié, workflow final, parcours accessibles et limites restantes. Une CI de PR verte ou une modification documentaire n'est pas un déploiement.
7. **Notes historiques :** les anciennes mentions « garder main inchangé », « ne pas fusionner sans autorisation » ou « attendre une autorisation » dans les passations décrivent leur contexte initial. Cette instruction constitue l'autorisation pour les lots approuvés et validés de son périmètre; elle ne remplace pas une protection GitHub, un blocage technique ou une demande d'approbation réellement nouvelle.

## Guide de lecture et règles de coordination — consolidation du 26 octobre 2026
- **Demandes et critères :** ce prompt. **Avancement courant et preuves :** [suivi officiel](./LOVEROLL_SUIVI.md). **Entrées non triées :** [nouvelles demandes](./LOVEROLL_NOUVELLES_DEMANDES.md). Les notes de PR ci-dessous sont des instantanés datés; vérifier le dernier état GitHub avant toute décision.
- **Accueil :** vue d'ensemble, D6 hebdomadaire et raccourcis (LR-ACCUEIL-001). **Soirée :** déroulement du jeu, dés individuels, défis et minuteries (LR-014 à LR-028). **Surprise :** rendez-vous mensuel, lieux et planification (LR-SURPRISE-001). **Éclat :** refonte complète des douze coffrets approuvée sous LR-ECLAT-001, avec leurs droits actuels et la [spécification de jeu obligatoire](./LOVEROLL_ECLAT_12_COFFRETS_SPEC.md).
- **Demandes approuvées :** les sections identifiées de ce document, y compris LR-017 à LR-019, LR-025 à LR-028, LR-SURPRISE-001 et LR-ACCUEIL-001. LR-ECLAT-001 et les douze jeux détaillés dans sa spécification sont également approuvés. Les autres suggestions d'un rapport restent des propositions. LR-033 n'impose pas de redemander l'autorisation pour une exigence déjà approuvée ici.
- **Conflits :** appliquer les précisions explicites des nouvelles sections uniquement à leur périmètre. LR-019 précise l'exception des favoris à LR-015; les exclusions volontaires restent prioritaires. LR-SURPRISE-001 autorise budget/km null sans préférence luxe. LR-ACCUEIL-001 précise le rôle fonctionnel de l'Accueil tout en conservant sa référence graphique.
- **Un seul ordre d'exécution courant :** (1) récupérer l'état réel de main/branches/PR/CI et préserver les travaux; (2) finaliser les correctifs P0 LR-001 à LR-004 et les erreurs de fiabilité Geoapify documentées sous LR-SURPRISE-001; (3) intégrer les lots déjà ouverts compatibles, puis LR-015/016 ensemble pour le parcours et les quotas; (4) LR-018, LR-019, LR-017, LR-025, LR-026/027/028 selon leurs dépendances; (5) LR-ACCUEIL-001 puis la suite du parcours LR-SURPRISE-001; (6) compléter harmonisation et audit. Responsive, sécurité, tests et preuves s'appliquent à chaque lot, pas seulement à la fin. Les anciens ordres plus bas servent de contexte historique.
- **Exécution continue pendant la session :** enchaîner les lots autorisés sans réclamer « continue ». Après un push, identifier les workflows, les suivre jusqu'à leur état final, analyser les journaux en cas d'échec et corriger. Un test lancé n'est pas une livraison. Déployer les lots compatibles et validés dans le périmètre autorisé; vérifier la version et le parcours publiés. Un blocage d'appareil physique se note explicitement et n'empêche pas les autres travaux indépendants. Ne pas prétendre poursuivre après la fin de session.
- **États distincts :** spécifié / implémenté / testé (automatique, émulation, appareil réel) / fusionné / déployé et vérifié. Une fusion ou une CI verte ne vaut pas validation physique. Ne pas inventer de progression à partir du nombre de commits.
- **Repères :** [P0](#p0--correctifs-fonctionnels), [Accueil](#lr-accueil-001--accueil-vue-densemble-et-raccourcis-soirée-parcours-de-jeu), [Surprise](#lr-surprise-001--rendez-vous-surprise-premium-d100-et-geoapify), [suivi](./LOVEROLL_SUIVI.md).

## Comment utiliser ce document
Ce document est la **source de vérité des demandes** LoveRoll : jeu, Accueil, Soirée, Surprise/Geoapify, minuteries, confidentialité, cohérence graphique et responsive. Il ne signifie **pas** que ces exigences sont implémentées. Chaque exigence possède un identifiant LR-xxx repris dans [LOVEROLL_SUIVI.md](./LOVEROLL_SUIVI.md).

- Ajouter des demandes dans [LOVEROLL_NOUVELLES_DEMANDES.md](./LOVEROLL_NOUVELLES_DEMANDES.md) ou ouvrir une **Issue** GitHub ; ne pas effacer les demandes anciennes.
- À la reprise, appliquer le démarrage ciblé du mode d'exécution prioritaire; lire les demandes courantes et le code utile au lot, puis conserver ce contexte durant son exécution.
- Mettre à jour le suivi une fois par lot : demandes couvertes, fichiers/PR, tests réellement exécutés et captures utiles pour les changements visuels. Passer à « Terminé » uniquement avec acceptation complète; ne pas inventer d'avancement.
- Ne pas modifier silencieusement les règles commerciales, les abonnements, la progression ou le contenu des défis.

## Identité et périmètre
**Produit :** LoveRoll, expérience romantique à deux sur Android et PWA (Safari iPhone/iPad, navigateurs PC/tablettes). **Dépôt :** fredvolks/loveroll, et non le dépôt historique Mon Wallet. **Code :** PWA dans `couple-web/`, Android dans `app/`. La page **Accueil actuelle** est la **référence graphique** (les responsabilités fonctionnelles sont précisées sous LR-ACCUEIL-001) : rubis, bordeaux, rose et doré, rideaux, chandelles, roses, marbre, logo LoveRoll, effets de verre et boutons Premium.

### Rôles attendus de l'agent exécutant
Travailler simultanément comme développeur senior Web/Android/PWA/WebGL, directeur artistique haut de gamme, expert UX/UI/accessibilité, testeur QA multiplateforme et **couple utilisateur** (un partenaire expérimenté et un peu moins technophile). Identifier les vrais irritants d'usage, pas uniquement les anomalies CSS. Faire des propositions vérifiables, avec priorité et raison, en conservant l'ambiance romantique.

## P0 — Correctifs fonctionnels

### LR-001 — D100 Soirée coupé et disproportionné
**Constat photographié :** dans l'onglet Soirée, le D100 déborde en haut, masque son propre sommet et prend trop de place entre « Notre soirée / Éclat Premium » et le socle.

**Précision approuvée le 27 octobre 2026 — première page Soirée :** cette correction vise explicitement **l’écran d’entrée avant « Commencer notre soirée »**, avec « 200 défis à vivre à deux » et le sélecteur Notre soirée / Éclat, illustré par la nouvelle capture Android. Ne pas limiter le correctif au D100 des défis après démarrage. Le dé de présentation y est trop gros et son sommet est coupé : **réduire son emprise visuelle**, retrouver le dé entier avec une marge de respiration et un socle visible, sans qu’il écrase le titre, le sélecteur, le bouton de démarrage ou le bilan/calendrier. Vérifier aussi le rendu après démarrage pour conserver une cohérence des étapes.
La réduction concerne le cadrage et l’échelle de rendu sur cet écran; conserver le vrai modèle 3D, ses faces/gravures, son comportement et les résultats officiels. Cette précision autorise cet ajustement de taille malgré la consigne de conservation de dimension du lot d’orientation LR-046, dont le périmètre est distinct. Ne pas créer un nouveau tirage en ajustant l’aperçu.

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
**Référence propriétaire précisée le 27 octobre 2026 : l’Accueil Android sert de repère visuel à toute l’application, sur Android, iPhone, iPad et ordinateur.** Préserver son identité appréciée et relever sa version, son rendu et ses fichiers actifs avant de décliner les autres écrans.

Harmoniser **toutes** les pages avec les vrais éléments de l'Accueil : typographies, tailles et lignes de titre, logo, sous-titres, rubis/bordeaux/rose/or, images d'ambiance, transparences, bordures lumineuses, arrondis, reflets, dégradés, boutons, switches, pictogrammes, états d'interaction, cartes et onglets. Ne pas inventer un autre thème, ni teintes rose fluo discordantes.

Créer/renforcer les **tokens et composants partagés** : en-tête LoveRoll, boutons rubis/dorés, bulles verre, sélecteurs, statistiques, dialogues, navigation, confirmations, états actifs/verrouillés. Les boutons restent des **vrais éléments HTML/app interactifs** avec effet de pression, pas des photographies de boutons.

#### Directive approuvée — une seule identité LoveRoll et des Réglages compréhensibles (27 octobre 2026)

**Demande produit à réaliser et vérifier :** revoir l’ensemble des pages pour que le couple reconnaisse une seule application cohérente. Adopter simultanément le regard du designer, du développeur et du client qui paie son abonnement : comprendre immédiatement l’écran, trouver l’action utile et avoir plaisir à revenir. Cette addition décrit le travail attendu; elle ne déclare aucune refonte déjà livrée.

**1. Figer la référence et le système commun.**
- Prendre l’**Accueil Android** comme référence pour rubis/bordeaux/rose/doré, typographie, logo, iconographie, traitement des titres, boutons, sélecteurs, cartes, transparences, bordures, arrondis, ombres, espacements, états et transitions. Relever les valeurs et composants réellement actifs; ne pas inventer une nouvelle palette ou redessiner l’Accueil pour justifier un autre thème.
- Consigner une référence courte et versionnée : capture utile de l’Accueil, fichiers/assets utilisés et tokens communs. Distinguer un rendu observé sur Android d’une émulation. Si l’appareil n’est pas accessible, utiliser les sources Android/WebView pertinentes et déclarer la comparaison physique restante.
- Réutiliser les composants existants et centraliser les variantes justifiées. Corriger ou consolider les styles responsables des écarts au lieu d’empiler des surcharges CSS indépendantes par onglet. Chaque nouveau composant doit appartenir au système commun.
- Conserver la même identité sur tous les appareils, avec une disposition adaptée à leur espace. Les scènes concernées utilisent les mêmes assets HD Android, roses, velours et socle cohérent; préserver les vrais dés 3D. Un écran de formulaire peut employer des surfaces plus calmes et lisibles sans reproduire tout le décor héro de l’Accueil.

**2. Réexaminer toutes les pages et leurs états.**
Couvrir Accueil, Soirée (D6, D100, catégories, cartes, minuteries, fin de soirée), Surprise, Éclat, Avent, calendrier, profils, Réglages et leurs sous-pages, invitations, connexion/inscription, abonnement/paiement et administration accessible. Inclure menus, dialogues, confirmations, chargement, vide, erreur et accès restreint.
Pour chaque parcours, vérifier hiérarchie, densité, vocabulaire, navigation/retour, visibilité de l’action principale et cohérence avec la référence. Enlever les doublons de présentation sans retirer de fonction. Un changement d’onglet ne doit pas donner l’impression d’entrer dans une autre application.
Traiter en priorité **le parcours Réglages des deux partenaires**, puis harmoniser les autres parcours selon les écarts observés et leurs dépendances; un défaut critique de sécurité ou de fonctionnement reste prioritaire.

**2 bis. Périmètre exhaustif — du raccourci installé au plus petit contrôle.**
La revue couvre **toutes les surfaces LoveRoll**, y compris celles visibles avant l’Accueil ou accessibles seulement après une interaction. Ne pas s’arrêter aux grands onglets ni considérer les anciens composants comme exemptés.

- **Icônes et installation :** icône Android du lanceur/bureau (variantes adaptatives utiles), icônes PWA et maskable, icône Safari « Sur l’écran d’accueil » sur iPhone/iPad, raccourcis de bureau compatibles, favicon et icône d’onglet. Employer l’identité/logo approuvés, avec cadrage, contraste, marges et netteté adaptés à chaque usage; synchroniser les déclarations du manifeste, les références HTML/apple-touch-icon et les ressources Android concernées. Garder le même nom et la même identité reconnaissable; ne pas inventer un autre logo.
- **Ouverture et attente :** splash Android natif, lancement PWA/Safari installé, écran Web de chargement, attente d’authentification/synchronisation, retour dans l’app, rechargement, hors ligne, mise à jour, récupération et erreur de démarrage. La capture fournie le 27 octobre montrant le cœur, le tissu bordeaux et « Chargement de votre espace… » désigne **un écran d’attente à réexaminer**, pas une nouvelle référence remplaçant l’Accueil Android. Repérer et remplacer les éléments d’ancien thème responsables des ruptures visuelles; assurer une transition cohérente jusqu’à l’Accueil, sans flash blanc, logo discordant, superposition de splash ou attente artificiellement prolongée.
- **Navigation secondaire :** mini-onglets, sous-onglets, barres de catégories, segments, menus déroulants/contextuels, accordéons, sous-menus, badges, compteurs, infobulles, panneaux latéraux, tiroirs et feuilles qui remontent du bas de l’écran. Harmoniser formes, tailles, couleurs, alignements, libellés et états actif/inactif/verrouillé.
- **Boîtes et messages :** notifications internes, bannières, petits messages temporaires, alertes, erreurs, confirmations, invitations, avertissements, consentements et fenêtres modales. Préserver la priorité des messages et la confidentialité; harmoniser l’icône, le titre, la description, les commandes, le focus et la fermeture. Pour les notifications système, harmoniser les éléments réellement configurables, dont icône et identité, sans exposer de contenu intime.
- **Choix et saisies :** toutes les boîtes de choix, listes de sélection simples/multiples, pickers, boutons radio, cases à cocher, interrupteurs, curseurs, champs texte/nombre, choix de date/heure/durée, catégories, styles, langue/devise et commandes de volume. Même vocabulaire graphique et comportement prévisible : sélection visible, validation/annulation explicites lorsque nécessaires, valeur conservée, erreurs lisibles et navigation clavier/tactile fonctionnelle.
- **Micro-états :** pressé, survol, focus, sélectionné, désactivé, lecture seule, chargement, vide, succès, échec et contenu long. Examiner aussi les boutons secondaires, liens de retour, croix de fermeture, flèches, indicateurs de progression et commandes rarement ouvertes, sur les deux comptes du couple.

**Méthode de couverture :** tenir un inventaire unique par famille et parcours, avec emplacement/composant, portée personnelle/commune, écart observé, correction et preuve utile. Ouvrir les sous-écrans et déclencher les états concernés; une capture de la page principale ne prouve pas la cohérence de ses fenêtres cachées. Réutiliser les composants communs pour corriger toute une famille plutôt que refaire chaque instance séparément. L’inventaire d’ensemble est réalisé au début puis actualisé au fil des lots, sans recommencer tout l’audit à chaque retouche.

**Limites de personnalisation à respecter :** harmoniser tout ce que l’application contrôle. Les dialogues et claviers du système, interfaces Safari/Android, autorisations et pages de prestataires externes conservent leurs contraintes natives; vérifier leurs points d’entrée, nom, icônes et paramètres configurables. Ne pas promettre leur habillage intégral ni remplacer une interface native fiable par une imitation fragile uniquement pour la couleur. Lorsqu’une icône installée ou un splash reste en cache système, distinguer l’asset publié du rendu réellement rafraîchi et documenter la manipulation nécessaire sans supprimer les données de l’utilisateur.

**Acceptation transversale :** sur chaque plateforme concernée, vérifier le parcours icône → ouverture/attente → Accueil → onglet/sous-onglet → boîte ou choix → confirmation/erreur/retour; contrôler la cohérence de l’identité, l’accessibilité et le fonctionnement. Examiner l’installation existante et la mise à jour des ressources/cache concernés, pas seulement une page ouverte dans un navigateur propre. Livrer progressivement par familles/parcours compatibles et conserver les contrôles proportionnés du mode accéléré. L’harmonisation globale reste partielle tant que des surfaces recensées n’ont pas été examinées; indiquer les limites d’appareils ou de plateforme au lieu d’annoncer « tout harmonisé » sur la seule base de quelques captures.

**3. Reprendre Réglages comme un parcours complet.**
Inventorier une seule fois les options réelles : emplacement actuel, fonction, stockage, portée personnelle/commune et permission. Proposer une arborescence courte, puis vérifier une maquette cohérente avant l’implémentation. Base approuvée, à rapprocher des fonctions existantes :

| Entrée | Contenu attendu |
| --- | --- |
| Mon profil | Identité et compte personnel |
| Notre couple | Partenaire, invitation et gestion du duo |
| Notre jeu | Préférences communes, catégories, favoris, limites et options de soirée |
| Sons et notifications | Ambiances, sonneries, rappels et préférences personnelles ou communes explicitement indiquées |
| Abonnement | Forfait, facturation et gestion autorisée |
| Aide | Explications, assistance et informations utiles |

- Afficher sur la première page les entrées et une description courte; ouvrir les options détaillées dans leur section. Éviter la succession de grands formulaires et d’accordéons imbriqués. Regrouper les réglages avancés sans enterrer les fonctions courantes.
- Donner à chaque option un seul emplacement canonique; un raccourci éventuel ouvre le même formulaire. Conserver les liens et accès existants utiles.
- Les deux partenaires reconnaissent la même arborescence. Adapter les commandes aux permissions réelles et expliquer un accès en lecture seule ou réservé à l’admin; aucun droit nouveau accordé par simple changement d’interface.
- Distinguer clairement **« Pour moi »** et **« Pour notre couple »**. Pour un réglage partagé, indiquer « Ce changement s’applique à vous deux ». Ne pas recopier un réglage commun en deux préférences personnelles divergentes, ni modifier les préférences privées du partenaire.
- Préserver les valeurs enregistrées, les règles de jeu, les textes/durées des cartes, les rôles, les tarifs et les abonnements. Écriture visible et fiable, confirmation sobre, erreur compréhensible et retour au bon écran; aucune sauvegarde annoncée avant sa réussite.
- Utiliser des libellés ordinaires, des contrôles confortables, du contraste et des espacements réguliers. Préserver défilement utile, clavier, zoom et gros caractères. Le couple doit trouver et comprendre un réglage courant sans tutoriel.

**4. Livraison et maintien de la cohérence.**
Cette demande **autorise la réorganisation de Réglages décrite ci-dessus et l’harmonisation graphique** dans ce périmètre, conformément aux autorisations de livraison existantes; elle précise LR-033 et n’exige pas une nouvelle permission pour chaque déplacement ou composant. Tout changement non prévu des règles métier conserve ses propres exigences d’approbation.
Faire un inventaire/une revue d’ensemble au début de ce chantier, puis livrer des parcours complets avec composants communs. Appliquer le mode d’exécution prioritaire : validation par lot, pas d’audit global ou de matrice complète après chaque micro-ajout.
À la recette du parcours concerné : comparer avant/après avec l’Accueil Android, tester les deux comptes et les droits, la portée des réglages, leur sauvegarde/rechargement, la navigation et les formats touchés. Revoir la matrice multiplateforme à la consolidation de l’harmonisation transversale. Consigner brièvement code/PR, contrôles exécutés, captures utiles et limites dans le suivi de LR-010/LR-011/LR-030; ne pas déclarer l’ensemble terminé sur la foi d’un seul onglet.
Pour tout ajout futur, justifier son emplacement et réutiliser le système commun, puis revoir l’écran complet et son parcours. Une fonction nouvelle ne doit pas dégrader progressivement la cohérence retrouvée.

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

**Suivi réel (27 octobre 2026) :** [PR #75 fusionnée](https://github.com/fredvolks/loveroll/pull/75) (Web 238, commit `6bab625e0325bc33a44939ddb889e78da5bd455f`). Dialogue HTML Sensuel/Sexuel/Au hasard, pourcentages tirés des réglages, annulation sans lancer, anti-double-appui, case personnelle « Ne plus afficher » et réactivation dans Réglages, sans modifier les dés WebGL ni les tirages serveur. [CI complète réussie](https://github.com/fredvolks/loveroll/actions/runs/40496466211). Migration additive `couple-web/migrations/20261026_evening_category_confirmation.sql` vérifiée dans Supabase LoveRoll `ejsrqfpkgwraorrznjpm` : colonne `couple_profiles.confirm_evening_category` booléenne NOT NULL DEFAULT true avec politique RLS `profiles_own_update` inchangée. **Fusionné, testé automatiquement et déployé sur Pages ([run 40497701367](https://github.com/fredvolks/loveroll/actions/runs/40497701367) : succès) ; recette physique à faire.** Les anciennes PR #34 et #73 ont été clôturées comme doublons, sans supprimer leurs branches.

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


#### Précision approuvée — maximum 5 favoris communs, remplacement et calendrier (26 octobre 2026)

Cette précision complète LR-019 et prévaut sur toute formulation antérieure suggérant une liste de favoris illimitée.

**Liste commune et plafond**
- Le couple dispose d'une seule liste de **5 défis favoris maximum, toutes catégories confondues** (Sensuel + Sexuel, sans multiplier le plafond par catégorie, partenaire, appareil ou soirée). Conserver la portée commune du favori déjà définie dans LR-019.
- Chacun des deux partenaires peut ajouter, retirer ou remplacer un favori, dans Réglages ou depuis une carte accessible. Ce droit n'est pas réservé à l'admin. Enregistrer qui a ajouté la carte sans en faire une réservation pour cette personne.
- Compter des définitions de cartes distinctes par identifiant stable/catégorie/version pertinente, jamais les faces aléatoires du D100 ou les occurrences du calendrier. La même carte favorite dans plusieurs soirées n'occupe qu'une place.
- Afficher un compteur « Nos coups de cœur · 3/5 ». Un cœur déjà présent permet de retirer le favori, sans doublon.

**Ajout après une soirée et depuis le calendrier**
- Après une soirée clôturée, chacun peut consulter les défis historiques de soi ou du partenaire déjà autorisés dans le calendrier commun et les ajouter aux favoris. « Défis passés » signifie ici anciens défis; ne pas limiter cette fonction au statut « Passé ».
- Depuis Calendrier → soirée clôturée → défis de [partenaire], proposer « ♡ Ajouter aux favoris » / « ♥ Retirer des favoris ». Même possibilité sur ses propres cartes et dans le bilan de fin de soirée.
- Respecter les droits de lecture historiques existants : aucune révélation de la liste privée, des cartes encore secrètes ou des résultats d'une soirée ouverte pour permettre cet ajout. Les notes privées demeurent privées.
- Conserver titre, consigne, attribution et historique; l'ajout d'un cœur ne marque jamais un défi réalisé et ne consomme aucune passe, aucun défi ni aucune soirée.
- Si une carte historique n'existe plus dans le catalogue actif, expliquer qu'elle est indisponible; ne pas recréer ou publier automatiquement son texte privé, ni promettre sa repige.

**Quand les 5 places sont occupées — notification interactive avec retrait direct**
- Au sixième ajout, ouvrir **directement une fenêtre de notification dans l'app** : « Vous avez déjà 5 défis en favoris. Lequel voulez-vous retirer pour ajouter ce nouveau défi ? ».
- **Afficher immédiatement les 5 favoris dans cette même notification**, chacun avec son titre, sa catégorie, un accès à sa consigne et un bouton de retrait visible sur sa propre ligne. Afficher aussi le titre de la nouvelle carte à ajouter et le compteur 5/5.
- Le couple ne doit pas avoir à toucher « Voir nos favoris », ouvrir une deuxième fenêtre, aller dans Réglages ou rechercher lui-même la carte à retirer.
- Bouton de chaque carte : **« Retirer et ajouter le nouveau »**, avec un nom accessible qui précise la carte retirée et celle ajoutée. Un seul appui volontaire effectue le remplacement directement depuis la notification; aucune seconde confirmation obligatoire.
- Effectuer retrait + ajout dans une seule transaction serveur : si la nouvelle carte n'est plus admissible ou si le remplacement échoue, conserver l'ancien favori. Afficher un état de chargement contre le double appui puis la liste officielle actualisée et une confirmation sobre de réussite; gérer une réponse perdue par relecture serveur plutôt que répéter aveuglément.
- Bouton **« Annuler »** ou fermeture sans choix : aucune carte supprimée et aucun ajout. Aucun retrait automatique ou préselectionné.
- Si le partenaire modifie la liste pendant l'affichage, actualiser les 5 cartes depuis l'état officiel. Ne jamais retirer une carte différente de celle explicitement sélectionnée. Si une place s'est libérée, proposer « Ajouter ce défi ».
- L'interface est une notification interactive / modale LoveRoll, pas un toast éphémère ni une notification système Push. Sur petit écran, la liste peut défiler dans la fenêtre tout en gardant les commandes accessibles; les 5 favoris sont présents dans la fenêtre dès son ouverture.
- La gestion depuis Réglages reste disponible en complément. Synchroniser compteur et cœurs sur les deux comptes. Aucun Push sensible ni message externe pour ce quota.

**Réglages et tirage**
- Ajouter **Réglages → Jeu → Nos coups de cœur** (ou emplacement équivalent dans l'arborescence officielle), avec les 5 cartes, leur catégorie, le compteur et les commandes de retrait/remplacement.
- Texte explicatif : « Un favori peut revenir dans une prochaine pige. Il ne garantit pas qui le pigera, qui fera le défi ou qui le recevra. Les règles d'attribution restent applicables. »
- Conserver les règles LR-019 : retour possible dès une prochaine soirée même après réalisation, aucune garantie de sortie ni pondération supérieure, pas de repige dans la soirée courante, exclusions volontaires prioritaires et absence de double crédit de carte unique.
- Conserver en particulier les restrictions femme → homme / homme → femme et les autres rôles configurés. Un cœur ajouté sur la carte du partenaire ne transfère pas ses rôles à la personne qui l'a marqué.
- Retirer le favori rend à la carte son régime normal; cela n'efface pas les réalisations, ne réinitialise pas le cycle et ne garantit pas qu'elle pourra ressortir.

**Contrôles et migration**
- Imposer le plafond côté serveur, avec contrôle d'appartenance au couple, unicité et verrou transactionnel. Deux ajouts simultanés à 4/5 ne doivent jamais produire 6 favoris. Double-clic et nouvelle tentative sont idempotents.
- Si une liste existante dépasse déjà 5, conserver ses données et demander aux membres de choisir les 5 à garder; bloquer les nouveaux ajouts tant que la sélection n'est pas régularisée. Ne pas supprimer arbitrairement des favoris historiques.
- Tester 0→5, sixième ajout, retrait, remplacement/annulation/échec, doublon de carte historique, mélange des catégories, deux membres/deux appareils, cartes des deux partenaires dans le calendrier après clôture, refus d'accès à un autre couple, restrictions d'attribution et non-révélation d'une soirée ouverte.
- Inscrire preuves et état réel au suivi. Cette précision est une spécification, pas une fonctionnalité déjà livrée.

### LR-025 — Mode discrétion / cacher le jeu (idée no 6)
- **Modification propriétaire approuvée le 27 octobre 2026 : retirer le bouton flottant « Masquer » en haut à gauche**, visible sur la première page Soirée de la capture. Il est jugé inutile à cet emplacement et encombre l’en-tête. Ne pas le remplacer par un autre bouton ou pictogramme flottant au même endroit; le logo, le titre et la navigation retrouvent leur espace.
- Cette demande concerne le contrôle permanent de l’en-tête, pas la suppression de toute la confidentialité : conserver le mode discrétion et son accès discret dans les fiches sensibles lorsqu’il est pertinent, sans réintroduire le bouton flottant sur les écrans d’entrée. Les anciennes exigences ou tests imposant sa présence en haut à gauche doivent évoluer pour vérifier ce nouveau comportement et le maintien des protections utiles.
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
- Les actions secondaires **« Adapter »**, **« Passer »**, **« Refuser »**, **« Coup de cœur »** et le mode **« Masquer »** lorsqu’il est pertinent sur une fiche sensible restent accessibles; respecter LR-025 : aucun bouton Masquer flottant en haut à gauche des écrans d’entrée.
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
**Audit dédié ou consolidation de livraison :** analyser les états et sous-écrans ci-dessous progressivement, sans recommencer cet audit global lors d'une correction ciblée :
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
Catalogue de régression : exécuter les scénarios concernés par le lot et ses dépendances; réserver la suite complète aux changements transversaux et aux audits dédiés. Scénarios : 6 faces/animations D100 pertinentes, début/milieu/fin animation ; timer zéro, pause, annulation, saut, défi déjà fini ; fermeture/reprise ; changement d'appareil ; synchronisation ; stats, calendrier, cycle 200 ; pas de double incrément ; sonneries iOS/Android ; catégories non sélectionnées ; Premium inchangé.

### LR-041 — Matrice visuelle multiplateforme
Matrice de référence pour une modification transversale ou un audit dédié; pour un lot ciblé, vérifier les pages et formats affectés selon le mode d'exécution prioritaire. Captures avant/après des pages Accueil/Soirée/Défi/Calendrier/Surprise sur **Android grand/petit, iPhone Safari/PWA, tablette portrait/paysage, ordinateur 1366×768 et 1920×1080** ; compléter Firefox/Safari/Edge lorsque possible. Les 3D ne doivent jamais être coupées ou flotter. Différencier émulation et test sur vrai appareil ; ne pas prétendre avoir testé un appareil absent.

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


## LR-JEU-001 — Fiabiliser les défis existants sans modifier leurs textes
**Demande approuvée le 26 octobre 2026 — spécification, à implémenter et vérifier.** Complète LR-015 à LR-019, LR-026, LR-ACCUEIL-001 et LR-SURPRISE-001, sans redéfinir silencieusement leurs règles.

### Verrou de contenu — règle prioritaire
Conserver exactement les titres et les consignes de toutes les cartes existantes, y compris les cartes sexuelles personnelles/importées et les modèles standard. Ne pas les réécrire, édulcorer, remplacer ni supprimer. Conserver les minuteries configurées et les instantanés historiques. L'autorisation de ce lot porte sur le fonctionnement, l'attribution et les métadonnées techniques ajoutées séparément. Une incohérence éditoriale se signale au propriétaire, sans modification automatique du texte.
Avant toute mutation, établir un inventaire avec identifiants stables, version et empreinte des textes. Après changement, comparer les empreintes afin de prouver que titres/consignes sont inchangés. Ne pas publier les cartes privées dans le dépôt, les logs, les rapports ou les fixtures.

### 1. Attribution et disponibilité des cartes
Auditer les règles réellement actives en base et le parcours self_draws. Distinguer clairement : personne qui touche le dé, personne qui propose/offre, personne qui accomplit et personne qui reçoit l'attention.
Corriger les associations drawer_role / recipient_role / offered_by / recipient pour que les cartes compatibles avec les deux personnes ne soient plus exclues parce que le mode « piger pour soi » vérifie deux rôles différents contre la même personne.
L'audit en lecture seule a trouvé 43 cartes à rôles croisés sur le modèle MEDIUM de 100 cartes; c'est un constat du 26 octobre, à revérifier avant correction. L'attribution doit aussi correspondre aux verbes de la consigne existante : ne pas modifier ces verbes pour contourner un filtre.
Préserver confidentialité des listes individuelles, règles de tours/dons, choix de catégorie, probabilités et contrôles serveur. Appliquer les corrections aux nouveaux tirages; ne pas réassigner rétroactivement les défis historiques ou actifs sans traitement explicite et vérifié.

### 2. Progression, favoris et clôture
Utiliser l'identifiant stable de la carte et sa catégorie/version pour les cartes uniques, jamais la face aléatoire du D100. Distinguer réalisations totales, cartes uniques découvertes/réalisées et favoris rejoués. Avant de modifier le compteur officiel du cycle de 200, réconcilier les règles existantes et LR-019, documenter la définition retenue et préserver les acquis; aucune remise à zéro opportuniste.
Terminer les parcours LR-015/016 : 3 passes/mois/personne par défaut, paramétrables par l'admin; Refuser toujours libre; remplacement atomique et exclusions volontaires prioritaires. Aucune passe de soirée consommée pour adapter un lieu Surprise.
Une soirée interrompue conserve les réalisations dans son historique; distinguer clairement son statut et ce qui est crédité au cycle ou au quota. Ne pas falsifier les soirées antérieures.
Livrer les coups de cœur LR-019, l'adaptation LR-017 et les métadonnées LR-026 en conservant les textes originaux. Toute adaptation proposée par le couple reste une occurrence séparée, consentie et traçable.

### 3. Sélection utile et gestion du contenu
Ajouter séparément des métadonnées utiles (préparation, matériel, durée indicative, thème, effort, ambiance musicale) sans faire passer leur classification pour une nouvelle consigne. Préserver les réglages et probabilités approuvés; rendre visibles les filtres réellement appliqués. Ne pas utiliser une requête IA externe payante pour transmettre ou classer des cartes privées sans autorisation spécifique.
Permettre un import avec prévisualisation : validation de structure, identifiants, doublons, attribution et minuteries; traiter les conflits sans écraser les textes ou archives. L'utilisateur reste maître du contenu sexuel.
Le présent lot ne promet pas de production régulière de nouvelles cartes sexuelles. Les nouveaux contenus romantiques/non explicites et les expériences Éclat peuvent être enrichis indépendamment, en conservant les cartes existantes.
La séparation Accueil/Soirée, le parcours Surprise/Geoapify et les tarifs restent ceux déjà approuvés. Un éventuel mode libre en plus du quota officiel reste une proposition à valider séparément.

### Validation
Comparer avant/après : textes et durées inchangés; cartes à rôles croisés admissibles aux bons utilisateurs; confidentialité; catégories et probabilités; double tirage; même carte avec deux faces D100 et deux cartes avec la même face; favoris; refus après épuisement des passes; arrêt/reprise/clôture; import et échec transactionnel. Tester les vrais RPC et les deux comptes, en plus des tests frontend.
Mettre à jour le suivi avec preuves, sans annoncer l'implémentation sur la foi de ce prompt.

## LR-MUSIQUE-001 — Ambiance musicale facultative par carte, liée au minuteur
**Demande approuvée le 26 octobre 2026 — spécification, à implémenter et vérifier.** Ajouter une ambiance adaptée aux défis sans modifier leurs textes, leurs durées ou leur attribution métier.

### Expérience et classification des cartes
- Examiner les bibliothèques réellement utilisées : standard, styles, cartes personnelles/importées et cartes personnalisées. Ne pas se limiter aux 25 cartes de secours du fichier JS.
- Ajouter à chaque définition de carte une métadonnée musicale séparée : aucune, douce/romantique, détente, sensuelle instrumentale, ludique ou rythmée, selon le contexte réel. Ne pas déduire l'ambiance du seul mot « Sexuel » ou du seul niveau d'intensité.
- « Aucune » est une valeur valide et recommandée lorsque musique, dialogue ou écoute d'une autre chanson risquent de se gêner, ou lorsque la classification n'est pas fiable. Ne pas fabriquer de paroles ou de nouvelles consignes sexuelles.
- Préserver les choix de musique du couple lors d'une mise à jour des métadonnées; permettre une modification simple de l'ambiance de la carte sans toucher au texte.
- Sur chaque carte, afficher un petit contrôle accessible « ♫ Ambiance : [nom] », « Activer / Couper la musique » et un volume discret. L'interface garde la priorité au défi et au minuteur. Même pour une carte sans ambiance, indiquer « Sans musique » et permettre un choix manuel facultatif.
- L'ambiance est désactivée par défaut avant un premier accord volontaire. Mémoriser ensuite la préférence par utilisateur/appareil, avec possibilité de couper à tout moment. Choisir une ambiance ne démarre pas la lecture.

### Synchronisation avec le minuteur
1. **Démarrer** : si musique activée et ambiance disponible, démarrer l'audio sur le geste qui lance le minuteur. Précharger raisonnablement; si le média n'est pas prêt, le minuteur démarre quand même et l'écran reste utilisable.
2. **Pause** : mettre l'audio en pause avec le minuteur; **Reprendre** reprend les deux. Aucune deuxième piste superposée après plusieurs appuis.
3. **Fin musicale progressive** : lorsque l'ambiance est utilisée, sa disparition remplace la sonnerie de fin par défaut. Baisser progressivement son volume pendant les 5 dernières secondes (ou le temps restant s'il est inférieur), jusqu'au silence à 00:00. Ne pas ajouter de mélodie d'alarme par-dessus ni repartir sur une nouvelle boucle. Le signal visuel de fin reste présent; les vibrations respectent leurs préférences existantes.
4. **Recommencer** : arrêter/remettre l'audio au début, réinitialiser le minuteur et attendre le prochain appui sur Démarrer.
5. **Couper la musique / volume zéro** : agir uniquement sur l'ambiance; le minuteur continue. Réactiver pendant le compte à rebours ne redémarre pas sa durée. Ne jamais réactiver une musique dont le minuteur est terminé.
6. **Défi réalisé manuellement, passé, refusé, annulé, clôture de soirée ou déconnexion** : arrêter immédiatement l'ambiance liée à ce défi. Un changement de carte ou de compte ne laisse pas une piste orpheline; il ne valide ni n'annule le défi par simple navigation.
7. **Carte sans minuteur** : conserver « Sans minuteur ». Musique manuelle facultative, avec arrêt explicite et nettoyage à la sortie; ne pas inventer une durée pour déclencher une complétion.
8. **Actualisation/suspension/reprise** : réconcilier avec l'échéance existante. À échéance dépassée, aucune musique ne repart. Respecter le geste nécessaire pour réautoriser le son. Ne pas stocker de secrets ni de consignes privées dans les paramètres audio.
9. La musique ne devient jamais une preuve de réalisation. Conserver la transition métier idempotente LR-002, les exceptions pause/annulation/refus et les permissions. Un événement audio ended/error ne valide pas un défi.

### Sonnerie, appareils et discrétion
- **Règle approuvée : musique utilisée = signal de fin musical**, par fondu progressif jusqu'au silence; aucune sonnerie supplémentaire par défaut. Sans musique utilisée, conserver la sonnerie habituelle facultative selon le réglage existant. Si l'utilisateur coupe la musique pendant le défi, ne pas faire surgir une sonnerie de remplacement à zéro. Si la lecture n'a jamais pu commencer, le repli éventuel vers la sonnerie doit respecter le choix explicite de l'utilisateur; aucun son forcé. Une option avancée de sonnerie supplémentaire reste désactivée par défaut et exige une activation volontaire. Tout réglage général silencieux reste respecté.
- Utiliser la même source temporelle que le minuteur, sans créer un deuxième compte à rebours audio indépendant. Programmer le fondu à partir de son échéance, pas de la fin naturelle du fichier. Pause : suspendre le fondu et mémoriser le volume choisi; reprise : recalculer le fondu selon le temps restant; reset : annuler l'ancien fondu. Une modification du volume dans les dernières secondes doit conserver la descente vers zéro. Réutiliser/améliorer les modules existants plutôt qu'ajouter un moteur concurrent.
- Prévenir les lectures simultanées non voulues : l'audio est local au téléphone volontairement choisi; aucune lecture distante déclenchée chez le partenaire. Désigner un seul appareil d'ambiance pour la soirée lorsque nécessaire. Tester deux comptes/deux appareils/deux onglets.
- Une seule ambiance active sur un appareil; arrêter proprement ou effectuer une transition contrôlée entre défi et Éclat. Libérer ressources, écouteurs et pistes au changement de contexte.
- Mode discrétion LR-025 : arrêter ou rendre silencieuse l'ambiance immédiatement sur l'appareil masqué, sans relancer le son à la sortie du masque sans action volontaire.
- iPhone Safari/PWA, Android WebView/PWA et PC : gérer lecture bloquée, appel téléphonique, interruption audio, écouteurs/Bluetooth, veille et écran verrouillé. Ne pas promettre musique continue ni arrêt programmé garanti en arrière-plan lorsque la plateforme suspend la page. Au retour, l'état audio doit correspondre au minuteur.
- Si la musique échoue, le défi, la minuterie et la progression fonctionnent toujours. Message discret, aucune boucle de notifications.

### Catalogue audio et qualité
Utiliser des compositions originales ou des pistes disposant de droits explicites compatibles avec une application commerciale, documentés par asset. Vérifier les licences et les éventuelles obligations d'attribution. Ne pas engager de dépense ou souscrire de service sans autorisation.
Prévoir un petit catalogue de qualité, partagé entre cartes (plusieurs variantes d'ambiances), instrumental par défaut, volume initial bas, transitions douces et boucles sans coupure audible. Vérifier à l'écoute sur téléphone et écouteurs; une simple correspondance de tags ne prouve pas la qualité musicale.
Limiter poids, consommation réseau/batterie et préchargement; versionner les assets. L'absence de réseau ne doit pas bloquer le jeu. Ne pas transmettre les contenus des cartes à un tiers pour choisir une piste.
Aucun abonnement musical externe requis pour jouer. Ne pas présenter le générateur d'ambiance Éclat actuel comme un catalogue musical nouveau tant que sa qualité et sa variété n'ont pas été vérifiées.

### Tests et livraison
- Start/pause/reprise/reset, échéance à zéro, fin manuelle, passer/refuser/annuler, changement de carte, changement de compte, clôture, discrétion, double-tap et deux appareils.
- Couper/remettre la musique pendant le compte à rebours sans modifier le temps, ni déclencher une complétion ou une sonnerie supplémentaire. Vérifier le fondu des 5 dernières secondes, pause/reprise pendant le fondu, reset, changement de volume, silence à zéro et absence de double signal; sans musique, vérifier la sonnerie facultative. Un mute volontaire ne déclenche jamais une alarme de remplacement.
- Carte sans minuteur, ambiance aucune, média court/long/en boucle, échec réseau/décodage, lecture bloquée, retour après échéance et préférence conservée.
- Tests d'intégration sur les vrais contrôles et tests d'écoute documentés; distinguer émulation et appareils physiques réellement testés.
- Contrôle d'intégrité des titres, consignes, minuteries configurées et instantanés des cartes avant/après.
- Livrer par lots compatibles avec suivi CI jusqu'à son état final; renseigner les preuves dans LOVEROLL_SUIVI.md et vérifier le parcours publié. Cette addition documentaire ne vaut ni musique intégrée ni fonctionnalité déployée.


## LR-PIGE-001 — Soirée : cartes encore disponibles par catégorie
**Demande approuvée le 26 octobre 2026 — spécification à implémenter et vérifier.**

### Placement et affichage
Dans l'onglet **Soirée**, à l'étape des défis / du D100, afficher en permanence un petit compteur près de chaque choix de catégorie :
- **Sensuel · 42 cartes disponibles**
- **Sexuel · 28 cartes disponibles**
Ces chiffres sont illustratifs, jamais codés en dur. Employer une formulation claire comme « Disponibles pour ta prochaine pige » pour distinguer ces nombres du quota de défis personnels restant à jouer, du résultat D100 et de la progression des 200.
Garder le compteur visible avant et après chaque tirage sans ouvrir Réglages. Ne pas encombrer la fiche ni déplacer le dé hors du socle. Si « Au hasard » affiche un total, utiliser la somme exacte des cartes admissibles des deux catégories, sans transformer ce total en probabilité.

### Sens du compteur et règles de calcul
- Compter les **cartes distinctes réellement admissibles** au prochain tirage de la personne concernée, dans le couple, cycle, bibliothèque et mode de soirée actifs. Les nombres peuvent être différents sur les deux comptes en raison des rôles et historiques; ne pas imposer un faux compteur commun.
- Réutiliser le même calcul serveur que le moteur de pige : catégories et styles actifs, cartes personnalisées remplies, attribution/rôles (dont femme → homme et homme → femme), permissions, règles de non-répétition, exclusions volontaires, tirages déjà réservés/attribués dans la soirée et règles de favoris LR-019.
- Une carte retirée volontairement du lot n'est pas comptée. Un favori ne compte qu'une fois et n'est compté que lorsqu'il est effectivement rééligible; le cœur ne contourne pas l'exclusion ni l'interdiction de repige dans la même soirée.
- Le retour dans la pige des cartes passées/refusées/non terminées suit LR-015 et le mode de soirée actif. Ne pas annoncer une carte disponible avant que le moteur ne l'autorise réellement. Distinguer un tirage spécial offert si ses règles d'admissibilité diffèrent.
- Compter par identifiant stable de carte et catégorie, jamais par face D100, nombre total d'emplacements éditables ou nombre d'occurrences historiques.
- Ce compteur décrit le bassin; si ce n'est pas le tour du joueur ou si son quota est atteint, conserver le vrai état d'accès. Un bassin non vide n'autorise pas un tirage interdit.
- Si une bibliothèque s'épuise, ne pas la réinitialiser pour simplement afficher un compteur. Respecter les conditions de renouvellement officielles et expliquer honnêtement l'état « Aucune carte disponible » / « Renouvellement du lot prévu », selon le moteur réel.
- Ne pas changer les probabilités approuvées pour les faire correspondre aux quantités affichées. La proportion de cartes n'est pas nécessairement la probabilité de catégorie.

### Actualisation, confidentialité et erreurs
Mettre à jour après tirage, remplacement, clôture/retour en pige, modification d'exclusion, favoris, rôles ou bibliothèque et changement de cycle, ainsi qu'après une action du partenaire qui affecte le bassin. Réconcilier après reconnexion et retour dans la page.
Une lecture de compteur ne lance pas de dé, ne consomme rien et ne modifie ni historique ni progression. Retourner des agrégats autorisés côté serveur, sans exposer les textes ou identités de cartes privées du partenaire, ni les futurs résultats.
Chargement : « … »; erreur : « Indisponible » avec réessai discret. Ne pas afficher 0 ou une ancienne valeur comme un nombre confirmé si la lecture échoue. Empêcher les réponses tardives d'un autre couple/joueur/cycle de remplacer le compteur courant.
Limiter les requêtes en réutilisant la synchronisation et les réponses de jeu existantes; éviter un appel à chaque image de l'animation ou seconde du minuteur.

### Tests et acceptation
Comparer compteurs et véritables bassins du moteur : deux catégories, rôles croisés, deux partenaires, cartes personnalisées, exclusions, favori réalisé rééligible à une prochaine soirée, non-répétition dans la soirée, passage/refus/remplacement, clôture, bibliothèque épuisée, changement de cycle et mode normal/extra si ce mode existe.
Tester deux appareils, concurrence, reconnexion, chargement/erreur et réponses réseau obsolètes. Vérifier absence de mutation à la lecture et maintien des probabilités/quotas.
Captures Android S25 Ultra, iPhone/PWA, tablette et PC : compteurs lisibles, pluriel/singulier corrects, aucun dé coupé et aucun débordement.
Inscrire preuves et avancement dans le suivi; cette demande documentaire n'est pas une fonctionnalité déjà déployée.

## LR-045 — Soirée Extra illimitée après épuisement des dés hebdomadaires (demande approuvée le 26 octobre 2026)

**Statut : spécification approuvée, non implémentée.** Ajouter à l'application existante sans supprimer ni remplacer les soirées normales, leur D6, leur calendrier, leur historique, le cycle habituel de cartes ni les contrôles de rôles.

### Parcours utilisateur obligatoire
1. Le couple conserve **le même bouton « Brasser le dé » de la section Soirée**. Ne pas ajouter de deuxième bouton d'entrée « Extra » sur l'accueil. Tant que les dés de la semaine sont disponibles, le parcours normal demeure inchangé.
2. **Seulement lorsque le nombre de dés/soirées hebdomadaires disponibles est épuisé**, si l'option « Autoriser les Soirées Extra » est activée par l'administrateur du couple, le clic sur ce bouton présente une fenêtre de confirmation claire :
   - « Vous avez utilisé tous vos dés de la semaine. Voulez-vous jouer une Soirée Extra ? Pour cette soirée, toutes les cartes redeviennent disponibles dans la pige. »
   - Deux vrais boutons accessibles : **« Refuser »** et **« Accepter »**.
3. **Refuser** ferme la fenêtre sans créer de soirée, sans brasser de dé, sans consommer de quota, sans effacer de données et sans modifier le tour en cours.
4. **Accepter** démarre une **nouvelle Soirée Extra distincte**. **On recommence d'abord par piger le nombre de défis avec les D6 des deux partenaires**, puis on pige effectivement les défis avec le D100 et suit le jeu ordinaire (catégories, tours, confirmations, chronomètres, validation, etc.). Aucun défi ne doit être automatiquement pré-pigé à l'acceptation.
5. **Toutes les cartes éligibles de la bibliothèque du jeu sont remises dans la pige pour chaque Soirée Extra**, y compris celles pigées ou terminées auparavant. Cela signifie **une pige indépendante propre à la Soirée Extra**, et NON un effacement, une remise à zéro ou une modification du cycle normal de 200 cartes, de la progression, des favoris, des défis précédents ou des statistiques historiques. Les règles existantes de sécurité, catégories, consentement et indisponibilité restent applicables. Chaque soirée Extra repart avec sa propre pige fraîche.
6. **Nombre de Soirées Extra : illimité**, sans limite quotidienne, hebdomadaire ou mensuelle ajoutée. Après une soirée Extra terminée, un nouveau clic sur le **même bouton** lorsque le quota normal est toujours épuisé repropose une nouvelle Soirée Extra, avec ses D6 pour déterminer les nouveaux nombres de défis puis une nouvelle pige de toutes les cartes éligibles.
7. Les défis, dates, partenaires, catégories et résultats de chaque Soirée Extra sont enregistrés et synchronisés comme les soirées normales, avec un indicateur distinct **« Soirée Extra »** dans les vues d'historique/calendrier et statistiques. Les soirées Extra **ne dépensent pas** de dés hebdomadaires, **ne recréditent pas** ceux de la semaine et ne transforment pas les autres soirées en Extra.
8. **Réglage admin du couple** : interrupteur explicite « Autoriser les Soirées Extra » dans les Réglages du jeu, modifiable uniquement par l'administrateur/créateur du couple (contrôle serveur, non uniquement visuel). Si désactivé, aucune proposition ni création de Soirée Extra ; l'épuisement hebdomadaire conserve le comportement existant. L'état initial de cette nouvelle option doit être **désactivé** pour ne pas activer silencieusement la fonctionnalité chez les couples existants.
9. Une seule Soirée Extra active par couple à la fois ; une double pression ou des actions simultanées de deux partenaires ne doivent jamais produire deux soirées identiques. Après fermeture/reconnexion, reprendre la soirée Extra active et ses D6/tours sans repiger accidentellement. Si l'admin désactive le mode durant une soirée déjà en cours, ne pas supprimer cette soirée ni ses données ; interdire seulement le lancement de nouvelles extras.
10. Le jeu et son API doivent distinguer explicitement les modes `normal` et `extra`, appliquer les autorisations côté serveur, utiliser des opérations idempotentes et conserver une piste d'audit. Ne pas contourner le contrôle d'accès par appel RPC direct.

### Tests d'acceptation requis avant de cocher LR-045
- Avec du quota hebdomadaire restant : clic sur « Brasser le dé » → soirée normale sans confirmation Extra.
- Quota épuisé et mode OFF : aucune Soirée Extra proposée ou créée, notamment côté API.
- Quota épuisé et mode ON : fenêtre d'information ; Refuser = aucune écriture ; Accepter = exactement une nouvelle Extra.
- Après Accepter : **D6 des partenaires avant toute pige D100** ; défi obtenu normalement ; toutes les cartes éligibles de la session Extra y compris celles déjà vues dans la progression normale.
- Terminer deux Extras successives dans la même journée : fonctionnement illimité et remise à disposition des cartes à chacune ; progression normale et compteurs hebdomadaires intacts.
- Double clic, deux partenaires simultanés, actualisation, hors ligne/reconnexion : aucun doublon, données synchronisées, reprise correcte.
- Historique/calendrier et rapports identifient les extras sans effacer/modifier les soirées précédentes ; permissions admin testées ; vieux clients compatibles ou bloqués proprement.
- Captures responsive Android/iPhone/tablette/PC de la confirmation et des écrans D6/D100 ; tests automatisés et validation réelle GitHub Actions sur le SHA final. Ne marquer « terminé » qu'après code, validations et preuves.

**Implémentation :** auditer d'abord les compteurs hebdomadaires, le serveur Supabase, le D6 des partenaires, le cycle de cartes et l'architecture des Réglages ; ensuite réaliser en PR dédiée avec migration compatible si nécessaire. Cette section exprime la demande produit et n'atteste d'aucun développement livré.



## LR-046 — Résultats D6 et D100 immédiatement lisibles sur les vrais dés WebGL (26 octobre 2026)

- Après tout tirage officiel, présenter la face gagnante comme surface visuelle principale, presque face caméra; conserver un angle modéré montrant le dessus et un côté (volume naturel). Le D6 ne doit plus montrer deux faces avec une importance comparable. Le D100 doit exposer ses chiffres gravés à l'endroit et faciles à reconnaître, y compris les valeurs à deux et trois chiffres.
- Calculer la pose d'arrivée à partir de la **normale géométrique de chaque face** et du repère utilisé pour graver ses points/chiffres; pas de traitement propre au seul résultat 2. La caméra sur photographie a une élévation différente de celle d'une scène ordinaire.
- Utiliser comme cible de la décélération existante le quaternion définitif; ne jamais corriger la face par un saut de rotation après le freinage. Verrouiller cette pose durant l'affichage, les rafraîchissements UI, la restauration d'une valeur officielle et le rechargement.
- Ne **jamais** modifier la valeur officielle Supabase, les probabilités, la correspondance des faces, les tirages, les modèles, les matériaux rubis, les gravures, la dimension, le centrage ni le contact avec le marbre. Pas d'overlay de résultat servant à masquer un défaut WebGL.
- Acceptation : D6 1–6 et plusieurs faces D100 (dont 1, 2, 9, 10, 47, 99, 100) testés sur téléphone, tablette et PC; le résultat officiel est bien la face physique dominante, inscriptions droites; captures réelles avant/après et preuve d'absence de régression du socle, de l'animation et de la persistance. Livrer sur main selon les autorisations en vigueur après CI et confirmer la version effectivement publiée.


## Complément approuvé — notifications Android et mises à jour Web/APK (27 octobre 2026)

**Spécification à implémenter et vérifier, liée à LR-004/LR-028/LR-043 et au parcours Réglages.** L’utilisateur ne peut pas ajuster ses alertes sur Android et doute de leur réception. Il souhaite une application qui récupère les mises à jour disponibles de façon fiable. Ne pas présenter cet ajout documentaire comme une réparation livrée.

### Diagnostic initial à compléter sur le parcours réel
Le code de `notificationSettingsMarkup` désactive les interrupteurs lorsque l’appareil n’est pas considéré actif. `organizeSettingsMenus` sépare « Choisir mes alertes » de « Sur cet appareil », où se trouvent l’état et les actions d’activation : la page des choix peut donc afficher des contrôles bloqués sans explication ni action de résolution. Cela explique le blocage visible, sans établir à lui seul la cause de l’inactivité ni prouver une panne du serveur.
Le gestionnaire Android contrôle déjà les Releases à l’ouverture, mais limite actuellement les vérifications silencieuses réussies à une par jour. Vérifier le comportement de l’APK réellement distribué, pas seulement les sources Web ou une compilation locale.

### Notifications compréhensibles et réellement vérifiables
- Présenter sur le même parcours l’état de réception sur **ce téléphone**, l’activation/réparation, les choix d’alertes et le test personnel. Aucun interrupteur inerte sans explication visible et action utile.
- Permettre de préparer/enregistrer les catégories d’alertes indépendamment de l’activation de la réception, en indiquant clairement que les choix sont conservés mais que les notifications ne sont pas encore actives. Modifier une préférence n’accorde jamais une permission Android et ne doit pas activer silencieusement la réception.
- Distinguer préférence du compte, autorisation Android effective et canaux, configuration native Firebase/FCM, jeton de cet appareil et son association serveur, puis envoi/réception. L’existence d’un jeton ou un succès d’envoi serveur ne prouve pas une notification affichée.
- En cas de refus ou blocage système, expliquer la cause et proposer l’accès aux réglages Android appropriés lorsque disponible. Réconcilier l’état au retour des réglages. En cas de configuration native absente/incompatible, indiquer honnêtement le besoin d’un APK corrigé ou la configuration manquante; ne pas afficher une activation réussie.
- Vérifier inscription, renouvellement du jeton, changement de compte, déconnexion, accès par utilisateur et prévention des doublons entre rappel local du lundi et push distant. Le réglage d’un partenaire ne remplace pas celui de l’autre.
- Le bouton de test vise uniquement l’utilisateur qui le demande. Distinguer test demandé, accepté pour envoi et réception réellement observée; conserver une alerte/invitation dans l’application si le push est indisponible. Aucun contenu intime ni jeton complet dans les journaux, notifications ou rapports publics.
- Vérifier les catégories hebdomadaire, invitation, mensuelle et événements, avec préférences OFF respectées. Examiner les déclencheurs et la chaîne serveur correspondante sans envoyer de notifications non sollicitées aux autres utilisateurs.

### Politique de mises à jour adaptée
- **Web :** les correctifs d’interface et de logique Web doivent parvenir à l’app Android/WebView et à la PWA via le mécanisme de version/cache. Vérifier les nouvelles versions à l’ouverture et à une reprise pertinente; appliquer un changement à un moment sûr, sans perdre formulaire, invitation, session, dé lancé ou minuteur. Aucune boucle de rechargement.
- **APK :** publier une nouvelle version native quand les ressources ou le code Android changent (notifications natives, permissions, icônes, splash, pont WebView, correcteur de mise à jour). Une retouche Web seule ne nécessite pas de reconstruire et réinstaller l’APK.
- Vérifier la disponibilité d’un nouvel APK à chaque ouverture réelle, avec déduplication, délai raisonnable entre tentatives/reprises et reprise après échec réseau; retirer le verrou quotidien qui peut empêcher de voir une version publiée plus tard le même jour. Éviter une requête à chaque rafraîchissement UI ou seconde du minuteur.
- Présenter séparément version Web et version Android installées, dernière vérification et état réel. Garder un contrôle manuel « Vérifier les mises à jour ». Ne jamais annoncer l’APK à jour sur la seule base de la version Web.
- Pour chaque livraison native : versionCode strictement croissant, versionName/tag cohérents, nouvelle Release stable et APK signé avec le certificat existant; ne pas écraser éternellement un tag fixe pour distribuer des binaires différents. Conserver comptes et données, vérifier le fichier et la compatibilité avec l’installation existante.
- Préparer/proposer l’installation via le parcours Android autorisé et reprendre correctement après autorisation d’installation. Ne pas promettre une installation silencieuse forcée sur un téléphone ordinaire. Aucune désinstallation ni nouvelle clé de signature pour résoudre un échec.

### Recette et état de livraison
Tester dans un lot cohérent : préférences enregistrables avant activation, permission accordée/refusée/révoquée puis restaurée, FCM indisponible, jeton non enregistré/renouvelé, deux comptes/deux appareils et absence de doubles rappels. Confirmer au moins un test de réception réellement observé sur Android, app en avant-plan puis arrière-plan/fermée selon les capacités réelles, avant d’annoncer les notifications réparées.
Pour les mises à jour : Web seul, nouvelle version native, absence de nouvelle version, sortie native plus tard le même jour, panne réseau, autorisation d’installation et mise à jour par-dessus l’APK existant sans perte de données. Distinguer pipeline vert, APK publié/installé et essai physique.
Appliquer la validation proportionnée par lot; documenter les blocages de configuration/signature ou l’absence d’appareil sans fausse attestation de fonctionnement.

## LR-ECLAT-001 — Refonte complète des douze coffrets Éclat et valeur Premium

**Demande propriétaire approuvée le 27 octobre 2026 — conception de jeu fixée, à implémenter et vérifier.** Refaire **les douze coffrets**, leur présentation et leur déroulement pour qu’Éclat mérite son prix. Les concepts ci-dessous constituent le périmètre approuvé; un pilote peut valider le moteur et l’ergonomie, mais ne réduit pas la mission à un seul coffret ni à six expériences. Ne pas déclarer cette refonte livrée après le seul ajout de ce prompt ou un changement du bouton.

### Mission et regards obligatoires
Agir comme **designer, client abonné, joueur et développeur** pendant le même travail, avec un résultat concret pour chaque regard :
- **Designer :** identité LoveRoll cohérente, hiérarchie claire, sobriété, confort de lecture et belles transitions. L’Accueil Android reste la référence officielle.
- **Client qui paie :** comprendre ce qui est inclus, pourquoi choisir une expérience et ce qu’elle apporte; bénéficier d’une séance aboutie, fiable et rejouable. La valeur doit venir de l’expérience et du contenu, pas d’une couronne, d’une couleur dorée ou d’un compteur de textes.
- **Joueur :** des règles immédiatement compréhensibles, de vraies interactions, du rythme, des découvertes et une finale satisfaisante. Le téléphone facilite le moment à deux et laisse de la place au jeu hors écran.
- **Développeur :** système maintenable et partagé, contenu structuré/versionné, progression fiable, confidentialité, permissions et reprise sans doublons. Le succès des tests techniques ne démontre pas à lui seul que le jeu est plaisant.

Éclat devient **« Une soirée à deux, prête à vivre »** : expériences suivies avec début, progression et finale. Conserver la distinction avec Notre soirée (dés/défis) et Surprise (rendez-vous/activités); aucun nouveau quota ni effet sur leurs tirages.

### Spécification de jeu obligatoire — Work exécute, sans inventer
La [spécification des douze coffrets](./LOVEROLL_ECLAT_12_COFFRETS_SPEC.md) est une extension normative de ce maître. Elle fixe **les 96 scènes, deux variantes par coffret, les routes de 30/60/90 minutes, les règles, données, choix, branches, aides, réponses d’énigmes et finales**. L’implémenter telle qu’écrite; les résumés ci-dessous n’autorisent pas à remplacer ce contenu par d’autres scénarios. En cas d’écart entre une formulation générale de ce maître et ce contrat détaillé, le contrat détaillé prévaut pour le gameplay Éclat.
**Interdiction de déléguer à Work des décisions de jeu :** ne pas lui laisser « inventer une enquête », « créer des missions », « choisir les règles », « ajouter des variantes » ou « décider d’un score ». Les décisions techniques et de présentation restent possibles dans l’identité Android approuvée, sans changement de mécanique. Un véritable manque bloquant se signale; ne pas le combler par une invention silencieuse.
Le nouveau contenu est fixé sous la version éditoriale `eclat_spec_v1_20261027`. Une séance commencée reste attachée à sa version. Garder les anciens contenus pour les archives/séances correspondantes; la nouvelle interface ne doit pas annoncer les anciens nombres de variantes comme si toutes avaient été réécrites.

### Les douze coffrets à réaliser
Pour chacun : implémenter les textes, règles, scènes, choix, conséquences, variantes, aides et finales du fichier normatif. Un titre ou une liste d’idées ne constitue pas un jeu fini.

1. **LR-ECLAT-01 — Les cinq secrets.** Cinq enveloppes successives : chacun prépare un souvenir ou une réponse, propose des indices et choisit sa révélation. Les découvertes alimentent une dernière enveloppe commune. Écriture facultative, possibilité de jouer oralement; aucune confidence dévoilée automatiquement. Les cinq enveloppes doivent avoir une fonction réelle dans le scénario.
2. **LR-ECLAT-02 — Le double jeu.** Missions secrètes complémentaires : l’un cherche à provoquer une situation légère, l’autre découvre son intention. Inverser les rôles et faire évoluer les missions selon les événements du jeu. Donner de vrais objectifs, des indices et une révélation; aucune surveillance ou manipulation du partenaire hors de la séance consentie.
3. **LR-ECLAT-03 — Le langage des sens.** Parcours sensoriel concret : reconnaître un objet au toucher, associer un son à un souvenir, choisir une lumière ou une texture, créer une ambiance commune. Prévoir le matériel ordinaire et des alternatives selon les capacités et préférences; aucun contact, dégustation, parfum ou fermeture des yeux imposés.
4. **LR-ECLAT-04 — Les portes de minuit.** Aventure à embranchements où chaque porte mène à une scène et une activité réellement différentes : tendresse, jeu ou mystère. Les choix changent le chemin et sa finale. Écrire les branches, leur cohérence et leurs points de jonction; trois boutons suivis du même texte ne satisfont pas la demande.
5. **LR-ECLAT-05 — Comme au premier rendez-vous.** Mise en scène d’une nouvelle rencontre : invitation, questions inattendues, petites découvertes, attention choisie et proposition d’un prochain rendez-vous. Donner des rôles légers, des situations concrètes et un rythme; éviter une simple succession de questions génériques.
6. **LR-ECLAT-06 — L’enquête amoureuse.** Véritable enquête fictive coopérative : chacun détient certains indices, confronte plusieurs pistes et contribue à résoudre une énigme. Fournir dossier, éléments à découvrir, indices progressifs, aides et dénouement logique. La solution doit être vérifiable à partir des indices; aucune accusation réelle, analyse de fidélité ou évaluation de la relation.
7. **LR-ECLAT-07 — À ta place.** Prédire les préférences de l’autre dans des situations concrètes, puis révéler les réponses choisies et vivre une activité inspirée de la découverte. Alterner les rôles et les types de situations. Les surprises ouvrent la discussion; aucun score de compatibilité, bonne réponse morale ou classement des partenaires.
8. **LR-ECLAT-08 — Notre bande originale.** Deviner une chanson grâce à des indices, retrouver un souvenir musical, choisir le morceau d’une scène et composer une trace commune de la soirée. Fournir le jeu même sans lecture musicale intégrée. Ne pas promettre un catalogue commercial ou exiger un abonnement musical externe; respecter les droits des pistes éventuellement fournies.
9. **LR-ECLAT-09 — Le coffre des envies.** Sélection privée d’idées d’attentions, d’aventures ou de rapprochement, puis découverte volontaire des propositions communes et choix d’un moment à vivre. Ne pas révéler les envies non partagées, les refus ou leur auteur par le texte, les compteurs ou les réponses serveur. Une correspondance ne vaut jamais consentement à réaliser une activité : confirmation libre avant toute proposition vécue.
10. **LR-ECLAT-10 — Le compte à rebours.** Petites missions coopératives à rythme réel : invitation en dix mots, énigme rapide, improvisation ou création à deux. Alterner séquences joueuses et pauses calmes. Minuteur utile, lisible, facultatif et suspendable; aucun échec relationnel ou passage forcé à une activité parce qu’un temps est écoulé.
11. **LR-ECLAT-11 — L’art de te séduire.** Chacun devient à son tour l’organisateur d’une invitation ou d’une attention. Préparation courte, proposition, réaction libre du partenaire et finale commune; variantes adaptées aux envies mutuelles. Prévoir de vraies activités à vivre et permettre adaptation, refus ou pause sans pénalité.
12. **LR-ECLAT-12 — La nuit du hasard.** Aventure improvisée où des symboles déterminent décor, rôles et règle de jeu. Le couple crée et joue une histoire dont les tirages suivants modifient les contraintes et le dénouement. Structurer les combinaisons pour rester compréhensible; le hasard doit transformer l’activité et non simplement afficher une consigne quelconque. Ces tirages restent indépendants des dés officiels de LoveRoll.

### Présentation et choix d’une expérience
- Remplacer le gros traitement jaune/or jugé cheap par une entrée **rubis/bordeaux élégante** de la même famille que Notre soirée, avec accents dorés discrets. Éviter les reflets excessifs, couronnes répétées et l’insistance sur « PREMIUM ». Garder l’accès et le niveau d’abonnement compréhensibles sans créer un nouveau thème.
- Organiser l’exploration autour de **Jouer ensemble / Se retrouver / Se rapprocher**, avec les douze coffrets accessibles. Une recommandation expliquée peut aider à démarrer; pas de fausse personnalisation.
- Une fiche explique ce que le couple va vivre, la mécanique, la durée, la préparation et le matériel, puis propose une action principale claire. Prévoir galerie, fiche, préparation, jeu, attente utile, pause/reprise et finale dans la même direction visuelle.
- Pendant la séance : en-tête compact, consigne courte, rôle évident et action contextuelle claire. Afficher notes, indices supplémentaires et règles détaillées à la demande. Préserver clavier, zoom, gros caractères et défilement utile; ne pas rapetisser l’expérience pour satisfaire artificiellement « tout sur un écran ».
- Harmoniser aussi tous les sous-onglets, sélecteurs, messages et boîtes selon LR-010. La décoration accompagne le jeu sans concurrencer la lecture.

### Règles communes de gameplay et contenu
- **Douze mécaniques identifiables.** Éviter le même formulaire et les mêmes confirmations répétés sous douze thèmes. Une enquête, une devinette, une création et un rituel sensoriel doivent proposer des interactions adaptées.
- Réduire les validations administratives; ne pas imposer systématiquement préparer/enregistrer → jouer → terminer → choisir une ambiance → attendre → confirmer sur chaque téléphone à chaque étape. La synchronisation intervient là où le jeu a besoin des deux partenaires.
- Écriture facultative sauf nécessité explicitement annoncée de la mécanique; réponse orale possible. Une panne de sauvegarde d’une note facultative ne doit pas bloquer toute activité orale ni annoncer à tort sa sauvegarde.
- Les choix ont des effets concrets sur une scène, une activité, un rôle, un indice ou une finale. Écrire les conséquences, gérer les branches sans issue et rendre les aides accessibles.
- Prévoir **un téléphone partagé et deux téléphones**, en expliquant les passages de main et les révélations. Ne pas prétendre qu’un appareil partagé garantit le secret; masquer les réponses avant de le transmettre et respecter les choix de partage.
- Les durées 30/60/90 minutes existantes restent compatibles; rendre la séance courte facile à choisir et donner un contenu/rythme réellement adapté aux versions longues. Ne pas étirer une petite consigne pour prétendre fournir 90 minutes de jeu.
- Préparation réaliste, absence d’achat obligatoire non annoncé, pause/adaptation/passage libres. Chaque coffret a une conclusion écrite et satisfaisante; souvenir, phrase commune ou invitation pour une autre fois uniquement si le couple le souhaite.
- Variantes réellement rejouables : autres indices, situations, missions, branches ou finales cohérentes. Une différence textuelle ou une simple sélection aléatoire ne prouve pas la variété vécue. Éviter les répétitions injustifiées à l’aide de l’historique autorisé.
- Musique et guidage sonore facultatifs; qualité à vérifier à l’écoute sur les appareils concernés, droits documentés et arrêt propre à la sortie. Le générateur d’accords existant n’est pas une preuve de qualité musicale. Aucun service musical ni API d’IA payante nécessaire par défaut.

### Valeur d’abonnement et continuité
La refonte doit justifier **le prix actuel par une expérience complète et soignée**, sans modifier automatiquement tarifs, facturation ou avantages contractuels. Vérifier la cohérence entre offre affichée, droits réellement accordés et activation/paiement disponibles. Ne pas conserver un texte « bientôt disponible » si le service correspondant est effectivement vendu, ni annoncer un paiement fonctionnel sans preuve.
La raison de revenir vient de la qualité, de la variété, de la reprise, des souvenirs volontaires et du renouvellement réel. Une sélection hebdomadaire parmi les coffrets existants n’est pas une nouveauté. Proposer un rythme de nouveaux contenus seulement après validation des moyens de production; aucune promesse mensuelle impossible à tenir ni faux contenu inédit.
Préserver les douze identités, les accès acquis, les notes privées, les historiques et les séances déjà commencées. Versionner les nouveaux scénarios et garder une séance liée à sa version. Cette demande autorise la réécriture des nouveaux scénarios **Éclat** dans ce périmètre, sans réécrire les archives ni les textes/durées des cartes officielles D100, des cartes personnelles ou des autres modules protégés.

### Architecture et réalisation
Réutiliser et faire évoluer le moteur partagé, les composants et les contrôles serveur existants. Définir des types de scènes adaptés, des branches explicites, les conditions de révélation et un état de session autorisé côté serveur. Pas de moteur concurrent par coffret ou de simple progression locale faisant autorité. Conserver isolation du couple, confidentialité des réponses, idempotence et compatibilité entre clients.
Commencer par le parcours complet **Les cinq secrets / Le rendez-vous secret** comme pilote possible de la nouvelle approche, puis enchaîner les autres mécaniques et les **douze coffrets** jusqu’au périmètre complet. « Le rendez-vous secret » est ici une direction de scénario du coffret 01, pas un treizième coffret à ajouter par erreur. Une maquette ou un pilote réussi ne clôt pas LR-ECLAT-001.
Livrer par lots jouables et compatibles, selon les autorisations de fusion/déploiement existantes. Appliquer le mode accéléré : tests ciblés pendant la réalisation, contrôles requis par lot et recette globale à la consolidation; pas de micro-PR ou de vérification exhaustive après chaque retouche.

### Acceptation — designer, client, joueur et codeur
Pour **chacun des douze identifiants**, renseigner un état réel et les preuves utiles dans le suivi :
1. **Designer :** comparaison à l’Accueil Android, hiérarchie, contrôles et états cohérents sur téléphone et tablette/PC concernés; aucune finition laissée en ancien thème. Captures utiles du parcours et distinction émulation/appareil.
2. **Client :** bénéfice et préparation compréhensibles avant démarrage, accès/offre honnêtes, durée raisonnablement conforme à la séance essayée, reprise et conclusion abouties. Ni couronne ni nombre de variantes ne servent de preuve de valeur.
3. **Joueur :** essai du début à la finale par deux personnes, dont une moins technophile lorsque possible; règles compréhensibles, choix perceptibles, branches résolubles, rythme et envie de rejouer évalués. Les tests automatiques ne remplacent pas cet essai; le noter restant s’il n’a pas été réalisé.
4. **Codeur :** tests pertinents sur état, branches, autorisations, réponses privées, double action, deux appareils, mode partagé, rechargement/reconnexion, pause/reprise et changement de compte. Une défaillance de sauvegarde ou une réponse réseau tardive ne doit ni perdre silencieusement une séance ni révéler une réponse privée.
5. **Complet :** règles, scènes, variantes et finales écrites et jouables; interface intégrée, CI et livraison vérifiées, limites déclarées. Les douze coffrets doivent être suivis séparément. Un catalogue de titres, une galerie relookée, des textes uniques ou un seul coffret terminé ne valent pas refonte complète.
