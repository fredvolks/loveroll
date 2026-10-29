# LoveRoll — SUIVI OFFICIEL DU PROMPT MAÎTRE

## Priorité immédiate ordonnée — audit global client/design/ergonomie (28 octobre 2026)

**LR-AUDIT-GLOBAL-20261028 — À EXÉCUTER.** Le propriétaire demande que l'audit de **toutes les pages, sous-pages, états et boutons**, ses corrections et les protections permanentes passent avant les nouveaux développements. Le bloc en tête du [prompt maître](LOVEROLL_MASTER_PROMPT.md), le [démarrage Work](LOVEROLL_WORK_START.md) et le [protocole complet](LOVEROLL_UX_UI_AUTONOME_WORKFLOW.md) décrivent ce mandat.

- **Décision enregistrée :** audits direction artistique, UX/ergonomie/accessibilité, client payant/couple dont un joueur peu technophile et QA ; un seul intégrateur applique les corrections.
- **Avancement applicatif :** aucune page nouvellement auditée, correction visuelle ou protection CI livrée par cette modification documentaire. Les preuves des chantiers antérieurs ci-dessous restent distinctes.
- **Prochaine action exacte :** relever la version réellement publiée et ses sources, établir/reprendre dans ce suivi l'inventaire page/état/objectif client/défaut/priorité/correction/preuve/statut, puis traiter les défauts bloquants et les composants communs avant les autres pages. Vérifier les formats téléphone/tablette/PC et conserver les entrées non vérifiées comme telles.



## Mise à jour vérifiée — travaux des 27–28 octobre 2026

> **Attention :** plusieurs chantiers ci-dessous restent en **PR brouillon, non publiés**. La correction Notifications #102 est fusionnée dans `main`; sa disponibilité finale sur Pages doit être vérifiée séparément. Les suites CI et les captures de navigateur ne remplacent pas une recette avec deux vrais comptes Supabase sur appareil réel. Ce résumé actualise les passages historiques plus bas; il ne modifie pas leurs cases de recette physique.

| Chantier prioritaire | Travail réellement dans GitHub | Reste impératif avant « terminé » |
| --- | --- | --- |
| **LR-028 · « As-tu envie de jouer ce soir ? »** | **Intégration fonctionnelle fusionnée** : [PR #115](https://github.com/fredvolks/loveroll/pull/115), Web 252, invitation A→B réelle, réponses Oui/Non/Peut-être/Ignorer, une invitation/jour/couple, quotas, questionnaire 200 défis, aucun D6 automatique, réception sur Accueil et Soirée sans Push, Realtime avec repli, notifications privées FCM/Web et cinq formats de captures. **Trois suites vertes sur le même SHA** : [SQL PostgreSQL 17](https://github.com/fredvolks/loveroll/actions/runs/40755271015), [Android natif](https://github.com/fredvolks/loveroll/actions/runs/40755271047), [Web/Chromium](https://github.com/fredvolks/loveroll/actions/runs/40755271010). [PR #116](https://github.com/fredvolks/loveroll/pull/116) fusionnée : mesure de mouvement D6 WebGL corrigée, toutes vérifications de PR vertes. | **Backend appliqué** au Supabase LoveRoll : migration `lr028_evening_invitation_20261028` vérifiée, RLS active, RPC authentifiées avec accès `anon` refusé, distributeur Edge `love-push-dispatch` v8 actif. **GitHub Pages Web 252 publié avec succès** : [run #40759845719](https://github.com/fredvolks/loveroll/actions/runs/40759845719), vérifications Accueil, Soirée, Expérience et étape Pages toutes vertes sur le SHA `2c7f8e46`. **APK natif** : la publication signée 0.13.14 reste bloquée par les secrets de signature d'origine absents du dépôt ([issue #117](https://github.com/fredvolks/loveroll/issues/117)), sans remplacer le certificat. **Recette physique A/B et réception Push** toujours à vérifier ; aucune préproduction distincte identifiée. |
| **LR-STUDIO-001 · Super Admin vrai jeu A/B** | [PR #97](https://github.com/fredvolks/loveroll/pull/97), deux comptes Supabase Auth indépendants et jetables, deux fenêtres du même LoveRoll, création/reprise/nouveau cycle/purge sécurisée en code, vrais états D6/D100/défis, 12 compteurs Éclat, atelier Venice, **historique complet des cartes officielles par pages de 10 et filtre A/B**, fermeture des anciennes sessions Auth si le duo change hors de la console. Contrôles Studio (SQL, contrats, captures synthétiques) et Venice verts au SHA `54716e7e`; suite Web du dernier SHA à confirmer. | **Aucune recette authentifiée réelle staging exécutée**. Obtenir un projet de préproduction LoveRoll désigné (le projet nommé « Test » n'est pas un staging LoveRoll), installer la base et les Edge Functions, tester A/B/iPad/PC/mobile, abandon/reprise, facturation sandbox et suppression Auth/SQL puis intégrer/publier. |
| **LR-ECLAT-001 · 12 coffrets Premium** | **[PR #107](https://github.com/fredvolks/loveroll/pull/107)** : consolidation **fusionnable** créée sur `main` Web 248, au lieu de la [PR historique #92](https://github.com/fredvolks/loveroll/pull/92) conflictuelle. Les **12 coffrets, 96 scènes, variantes, moteur V2, deux joueurs A/B et QA** sont repris; le vrai jeu appelle les RPC V2 seulement lorsque l'accès serveur est confirmé et conserve le repli V1. Version Web 251 codée dans la nouvelle branche, finale et données privées protégées. Suite éditoriale de #107 verte au dernier contrôle. | **PR brouillon non fusionnée ni publiée** : suite Web + PostgreSQL au dernier SHA à confirmer; vrai staging LoveRoll, 12 parcours complets A/B, UX iPad/Android/PC, confidentialité, consentements, accès Premium et migration réversible. Ne jamais fusionner #92 en parallèle ni installer la migration V2 en production avant cette recette. |
| **Android / mises à jour natives** | [PR #91](https://github.com/fredvolks/loveroll/pull/91), vérifications natives Android réussies; **correction codée et testée** du verrou quotidien des mises à jour (vérification silencieuse toutes les 30 min au maximum, bouton manuel toujours disponible) au SHA `c135e1eb`; contrôle de signature **en échec** car `LOVEROLL_ANDROID_SIGNING` n'est pas un JSON valide dans GitHub Actions. | Remettre un secret structuré correct **sans l'afficher ni le committer**; surtout ne pas publier une APK sous un certificat neuf comme mise à jour silencieuse d'une ancienne signature. Vérifier la continuité et les appareils physiques. |
| **Cache de mise à jour PWA** | [PR #105](https://github.com/fredvolks/loveroll/pull/105) **fusionnée dans `main`**, commit `a781184` : manifeste Web 248, script d'entrée, imports et service worker concordants. **Toute la CI de la PR est verte.** | Le workflow de publication Pages est automatique sur `main`, mais sa conclusion et la version effectivement servie sur le site public n'ont pas encore pu être vérifiées. |
| **Notifications Android / Web** | [PR #102](https://github.com/fredvolks/loveroll/pull/102) **fusionnée dans `main`**, commit `1c9d89e` : autorisations, quatre catégories, rappel du lundi, activation et tests des écrans 360 px réunis. **Toute la CI de PR est verte.** | Contrôler le déploiement GitHub Pages et la réception réelle/les permissions sur Samsung Android. L'interface Web n'accorde pas elle-même la permission Android ni ne corrige la signature native bloquée dans #91. |
| **LR-001 · D100 Soirée / Surprise** | [PR #101](https://github.com/fredvolks/loveroll/pull/101) déjà fusionnée/publiée, caméra ajustée pour parité visuelle ±3 %, tests automatiques Android/iPad réussis. | Vérification physique finale des dimensions, du socle et de la lisibilité de toutes les faces. |
| **LR-019 · 5 favoris personnels** | [PR #106](https://github.com/fredvolks/loveroll/pull/106) remplace la [PR #104](https://github.com/fredvolks/loveroll/pull/104) conflictuelle et reprend les fonctionnalités sur la base du `main` actuel : **5 favoris par membre** imposés en SQL, favoris sur vrais défis/archives, volet de retrait/remplacement, intégration D100, sécurité entre couples et cycle de 200 cartes. PostgreSQL 17, A/B Chromium et concurrence du cinquième cœur **verts** en workflow consolidé; les PR empilées #56–#60 sont conservées uniquement comme historique. | **PR brouillon, aucune migration production exécutée.** Suite Web finale à confirmer; vérification de compatibilité des quatre fonctions existantes, préproduction LoveRoll réelle, recette Auth à deux personnes et publication réversible indispensables. |

**Autres exigences à développer ou clôturer après ces lots :** Soirée temporaire Soft/Medium/Intense, 300 cartes et régénération Venice/quotas/paiement, LR-002/003 minuteries/calendrier, LR-016/017/018/026/027/028, Soirée Extra LR-045, Surprise/Geoapify, ambiance musicale, réglages/notifications Android, audit UX iPad/Android/iPhone/PC, matrices de tests et déploiements. Une PR ou une section écrite ne représente pas une livraison client.


## LR-001 — Régression : D100 Soirée plus petit que Surprise (27 octobre 2026)

- **État : correction Web 247 fusionnée et publiée; tests Chromium de parité réussis sur Android et iPad. Essais physiques non réalisés.**
- **Constat :** sur l'écran d'entrée « Soirée », le D100 est plus petit que le D100 de « Surprise », malgré la consigne d'identité visuelle. L'ancienne réduction motivée par un dé auparavant trop grand/coupé a laissé une ambiguïté dans l'acceptation UX.
- **Source normative :** [LR-001 du prompt maître](./LOVEROLL_MASTER_PROMPT.md#lr-001--d100-soirée-coupé-et-disproportionné), rectificatif du 27 octobre 2026. Ne pas réduire le dé de Surprise; reproduire sur Soirée sa taille apparente, le rendu WebGL et la relation au socle à viewport identique (**tolérance maximale ±3 %**).
- **Code livré :** [PR #101](https://github.com/fredvolks/loveroll/pull/101) fusionnée dans `main` (`185d9c7287c3314bb16104cb1808887778f59712`) ; ajustement de caméra du D100 WebGL, parité ±3 %, captures/comparaisons automatisées des mêmes viewports Android et iPad et protections de cadrage.
- **Preuves :** [six contrôles GitHub Actions verts](https://github.com/fredvolks/loveroll/actions/runs/40616419277) sur le SHA final `1de6a354` (dont Chromium D100 Android/iPad) ; [GitHub Pages publié et diagnostic réussi](https://github.com/fredvolks/loveroll/actions/runs/40618307286) pour `main` `185d9c7`. **Reste :** essai physique sur appareils et revue finale à l’œil; ne pas cocher 100 % terminé avant.


## Livraisons vérifiées — parité iPad / confirmation D100 (27 octobre 2026)

- **Web 237 — iPad/Android :** [PR #72 fusionnée](https://github.com/fredvolks/loveroll/pull/72), commit `735f31718d9151785bbf24f6551ef3148ce2db39`; image HD Android `loveroll-home-portrait-v202.webp` commune à Accueil et Soirée iPad, un seul socle photographié, vrais D6/D100 WebGL, tests portrait et paysage et captures Chromium. [GitHub Pages : succès avec contrôle du site réellement publié](https://github.com/fredvolks/loveroll/actions/runs/40495972734). Aucun essai physique iPad n'a été effectué dans cette livraison.
- **Web 238 — confirmation D100 :** [PR #75 fusionnée](https://github.com/fredvolks/loveroll/pull/75), commit `6bab625e0325bc33a44939ddb889e78da5bd455f`; dialogue de catégorie et préférence personnelle (LR-014) ; [CI complète : succès](https://github.com/fredvolks/loveroll/actions/runs/40496466211). Supabase officiel `ejsrqfpkgwraorrznjpm` : colonne de profil `confirm_evening_category boolean NOT NULL DEFAULT true` présente ; protection RLS personnelle conservée. [Pages Web 238 : publication et contrôle public réussis](https://github.com/fredvolks/loveroll/actions/runs/40497701367). Vérification physique sur les appareils des deux partenaires encore nécessaire.
- **Statuts distincts :** les tests Chromium et la réussite de Pages ne prouvent pas la vérification physique iPad/Android ; ne pas cocher « 100 % terminé » sans cet essai.

## Livraison confirmée — LR-015 / Web 234 (26 octobre 2026, Québec)

- **État : code, SQL et déploiement Web terminés ; essais physiques des deux partenaires encore à faire.**
- **Code :** [PR #54 fusionnée](https://github.com/fredvolks/loveroll/pull/54) dans `main`, commit `b529f7d0d271bd69838125a0410a720c3445001f`. Refonte Passer / Refuser / Repiger, repige atomique, exclusion/réintégration des cartes, retour des défis non terminés et compteurs/historique.
- **Supabase officiel LoveRoll :** `ejsrqfpkgwraorrznjpm`. Migrations appliquées et confirmées : `lr015_recycle_incomplete_on_close` (20261026235938), `lr015_cycle_exclusion_registry` (20261026235959), `lr015_atomic_respond_redraw` (20261027000020). Contrôle post-installation des fonctions, RLS et droits authenticated/anon réussi ; aucun statut de défi existant invalide détecté.
- **Validation SQL :** [PostgreSQL 17 isolé, concurrence, refus, quota, accès inter-couples](https://github.com/fredvolks/loveroll/actions/runs/40394905331) : **success** sur les migrations SQL exactes. Pas de test physique sur comptes LoveRoll réels.
- **Code intégré :** [39 étapes PR réussies](https://github.com/fredvolks/loveroll/actions/runs/40425919579) sur `fa374a906afeb6ee7dd88863398de499df4e55c1` ; [39 étapes main réussies](https://github.com/fredvolks/loveroll/actions/runs/40428253040) sur le merge `b529f7d0`.
- **GitHub Pages :** [déploiement + diagnostic production réussis](https://github.com/fredvolks/loveroll/actions/runs/40428252902). Test HTTP réel : code **200**, `app.js?v=20261026-web234`, **276597 octets**, SHA256 servi identique au fichier local `85e10159bcd12aa34f40199f5f295bc50fe72da0e9cf31edbc487cdbbec0f009`, syntaxe OK ; rendu Chromium `ready:true`, `PRODUCTION_LOGS []`, `CDP_PARSE []`. URL : https://fredvolks.github.io/loveroll/
- **Reste à essayer physiquement :** deux comptes partenaires simultanés sur iPhone/Android/tablette, passe jusqu'au quota, refus avec et sans exclusion, restauration, soirée close puis reprise/historique, cache PWA de chacun. Ne pas confondre test automatique et recette physique.

> Dernière initialisation : 2026-10-26. Toutes les cases sont **non cochées par défaut**, car aucune correction technique n'a été vérifiée dans le cadre de ce travail documentaire.

**Source des exigences :** [LOVEROLL_MASTER_PROMPT.md](./LOVEROLL_MASTER_PROMPT.md) · **Captures des anomalies :** [LOVEROLL_PREUVES_VISUELLES.md](./LOVEROLL_PREUVES_VISUELLES.md) · **Ajouter une idée :** [LOVEROLL_NOUVELLES_DEMANDES.md](./LOVEROLL_NOUVELLES_DEMANDES.md) · **Issues :** https://github.com/fredvolks/loveroll/issues

## Légende
- ☐ À faire ; ◐ En cours (l'indiquer dans la colonne Statut) ; ☑ Terminé **seulement après tests** ; ⚠ Bloqué ; 📝 Proposition à valider.
- Conserver les **identifiants LR-xxx** même lors d'un déplacement de priorité.
- Lors d'une correction : renseigner **PR / commit / test / capture** et date. Ne jamais cocher sans preuve.
- Le présent fichier est éditable directement dans GitHub ; ses mises à jour doivent demeurer versionnées.

## P0 — Bugs prioritaires

| OK | ID | Demande / preuve d'acceptation | Statut | PR / preuve |
|---|---|---|---|---|
| [ ] | LR-001 | D100 Soirée **entier**, proportionné comme Surprise, posé sur le socle, durant toutes les animations | ◐ Web 247 fusionné/publié : parité ±3 % sur comparaisons Chromium Android/iPad, vrai WebGL conservé ; essais physiques restant à effectuer | [PR #101 fusionnée](https://github.com/fredvolks/loveroll/pull/101) · [CI verte](https://github.com/fredvolks/loveroll/actions/runs/40616419277) · [Pages publiée](https://github.com/fredvolks/loveroll/actions/runs/40618307286) |
| [ ] | LR-002 | À 00:00, défi avec minuterie **réalisé automatiquement une seule fois** ; annulation/pause/saut exclus | ◐ En cours — validation serveur, reprise après fermeture et tests deux partenaires en cours ; non déployé | [PR nº 9](https://github.com/fredvolks/loveroll/pull/9) · `timed-evening-completion.test.mjs` · `evening-couple-flow-browser-check.cjs` (CI en cours) |
| [ ] | LR-003 | Calendrier et compteurs cohérents : en cours ≠ non réalisé définitif ; cycle/partenaires corrects | ◐ En cours — libellés actifs et correctif des taux mensuels fusionnés dans main ; vérification complète du cycle 200 incomplète | [PR nº 20 fusionnée](https://github.com/fredvolks/loveroll/pull/20) · [PR nº 23 fusionnée](https://github.com/fredvolks/loveroll/pull/23) · `evening-calendar.test.mjs` / `calendar-success-stats.test.mjs` |
| [ ] | LR-004 | Sonnerie des minuteries testée sur PWA Safari/iOS et Android, avec limites OS expliquées | ◐ En cours — sonnerie, préécoute et vibration Android codées (Web 229), tests physiques Safari/Android non effectués | [PR nº 8 fusionnée](https://github.com/fredvolks/loveroll/pull/8) · [PR nº 9](https://github.com/fredvolks/loveroll/pull/9) · `ios-install-sound-v229.test.mjs` |

## P1 — Design de référence Accueil

| OK | ID | Demande | Statut | PR / preuve |
|---|---|---|---|---|
| [ ] | LR-010 | Harmonisation couleurs/boutons/bulles/typographies/logo/navigation de toutes les pages avec Accueil | ◐ En cours — contrôles CI de la PR #26 réussis; jetons verre rubis tablette/PC corrigés, comparaison physique et harmonisation intégrale manquantes | [PR #26](https://github.com/fredvolks/loveroll/pull/26) · `ruby-surfaces-responsive.test.mjs` · `settings-menus-browser-check.cjs` |
| [ ] | LR-011 | Réglage des alignements, titres, cartes statistiques, calendrier, décor et socles | À faire | — |
| [ ] | LR-012 | Cartes de défis : catégorie, personne, consigne, minuterie et actions claires pour un couple | ◐ En cours — consignes longues rendues défilables dans la fiche mobile et accessibles au clavier; autres états et tests physiques restent à valider | [PR #31](https://github.com/fredvolks/loveroll/pull/31) · `evening-instructions.test.mjs` · `evening-instructions-browser-check.cjs` |
| [ ] | LR-013 | Catégorie non sélectionnée : incitation visuelle + instruction claire avant de brasser | ◐ En cours — contrôles CI de la PR #24 réussis; consigne liée au sélecteur, validation physique encore nécessaire | [PR #24](https://github.com/fredvolks/loveroll/pull/24) · `evening-d100-template.test.mjs` |
| [ ] | LR-014 | Soirée : confirmation de catégorie Sensuel/Sexuel/Au hasard avant lancer D100, option « Ne plus afficher », réactivation en Réglages par profil | ◐ Code et migration Supabase intégrés, tests automatiques complets réussis ; Pages Web238 publié et vérifié par Chromium ; essais physiques manquants | [PR #75 fusionnée](https://github.com/fredvolks/loveroll/pull/75) · [CI 40496466211](https://github.com/fredvolks/loveroll/actions/runs/40496466211) · [Pages 40497701367](https://github.com/fredvolks/loveroll/actions/runs/40497701367) |
| [ ] | LR-015 | Défis : Passer, Refuser avec choix de retrait du lot, repige, retour des défis non terminés à la clôture, historique conservé | ◐ **Publié Web 234** : migrations installées, GitHub Pages et tests automatiques réussis ; recette physique à deux partenaires restante | [PR #54 fusionnée](https://github.com/fredvolks/loveroll/pull/54) · [SQL](https://github.com/fredvolks/loveroll/actions/runs/40394905331) · [CI main](https://github.com/fredvolks/loveroll/actions/runs/40428253040) · [Pages + diagnostic public](https://github.com/fredvolks/loveroll/actions/runs/40428252902) |
| [ ] | LR-016 | Passes mensuelles : **3 par partenaire** par défaut, limite modifiable par l'admin du couple, blocage serveur à la limite, compteur visible ; refus toujours libre | ◐ **Serveur + interface existants et confirmés en production** : `couples.monthly_pass_limit` (0–30), RPC de lecture privée et de modification réservée au propriétaire ; `answer_challenge` délègue les passes à `love_respond_and_redraw`, sous verrou/repige atomique, avec refus non plafonné. Le vrai Web affiche le quota, le désactive à la limite, et les Réglages permettent de le changer. **PR #120 fusionnée** : actualisation en temps réel + repli si WebSocket dort, compteur personnel propre à chaque partenaire, tests A/B simulés, CI Web complète réussie. **Publication Pages : à confirmer pour le commit #120 ; essais physiques A/B à faire.** Ne jamais réappliquer la vieille migration #43, qui écraserait des RPC plus récentes. | [PR #120 fusionnée](https://github.com/fredvolks/loveroll/pull/120) · [Tests PR #120](https://github.com/fredvolks/loveroll/actions/runs/40762641792) · [ancienne PR #43](https://github.com/fredvolks/loveroll/pull/43) · [Issue #32](https://github.com/fredvolks/loveroll/issues/32) |
| [ ] | LR-017 | Adapter ce défi avec accord des deux, sans passer/refuser ni modifier les cartes globales | À faire — spécification approuvée, aucun code livré | [Prompt LR-017](./LOVEROLL_MASTER_PROMPT.md) · [Issue #35](https://github.com/fredvolks/loveroll/issues/35) |
| [ ] | LR-018 | Reprendre une soirée sur appareil mobile/tablette/PC, étapes et minuterie persistantes | ◐ **Implémentation existante dans `main`, non entièrement réceptionnée** : Accueil propose « Reprendre notre soirée » uniquement si une session officielle encore ouverte existe ; l'action recharge les données Supabase sans lancer de D6/D100, restaure uniquement la carte personnelle encore valide par signet local lié au compte et à la session, et réconcilie les minuteries conservées localement après suspension. [Test automatisé `evening-resume.test.mjs`](../couple-web/evening-resume.test.mjs), inclus dans CI. **Reste** : recette réelle de deux comptes A/B sur Android/iPad/Safari/PC, reconnexion et clôture depuis l'autre appareil, minuterie en arrière-plan et vérification sans duplication après expiration ; ne pas conclure terminé sur le seul test statique. | [Code de reprise](../couple-web/evening-resume.mjs) · [Parcours réel](../couple-web/app.js) · [Issue #36](https://github.com/fredvolks/loveroll/issues/36) |
| [ ] | LR-019 | ♥ Coups de cœur : favoris accessibles et remis dans la pige d'une prochaine soirée même réalisés, jamais immédiatement | ◐ Codé dans [PR #106](https://github.com/fredvolks/loveroll/pull/106) encore brouillon ; SQL/RLS isolés testés, aucune migration ni mise en production, recette authentifiée A/B manquante | [Prompt LR-019](./LOVEROLL_MASTER_PROMPT.md) · [Issue #37](https://github.com/fredvolks/loveroll/issues/37) |
| [ ] | LR-025 | Mode discrétion pour masquer les défis rapidement sans modifier leur état | ◐ Fonction masque locale conservée sur fiches de défis ; bouton flottant d'entrée Soirée retiré du rendu principal, styles et ancien test contraires corrigés dans [PR #108](https://github.com/fredvolks/loveroll/pull/108) (brouillon, CI en cours), sans preuve physique Android/iPad ni audit Push/audio final | [PR #108](https://github.com/fredvolks/loveroll/pull/108) · [PR #44](https://github.com/fredvolks/loveroll/pull/44) · `privacy-screen.test.mjs` · [Issue #38](https://github.com/fredvolks/loveroll/issues/38) |
| [ ] | LR-026 | Variété intelligente : limiter les défis ressemblants dans la même soirée | À faire — spécification approuvée, aucun code livré | [Prompt LR-026](./LOVEROLL_MASTER_PROMPT.md) · [Issue #39](https://github.com/fredvolks/loveroll/issues/39) |
| [ ] | LR-027 | Une seule action principale par étape, tous les boutons secondaires restent accessibles | ◐ **PR #124 en validation**, Web 254 : bouton D100 principal seulement au véritable tour du joueur, état texte pendant attente/brassage, « Voir mes défis » promu quand la pige est terminée, adaptations du gabarit D100 mobile/iPad, tests de régression et cache PWA. Aucune règle Supabase ni tirage modifié. **Non fusionné/non publié au moment de cette mise à jour** ; attendre la CI complète, la fusion, Pages et la recette visuelle réelle avant clôture. | [PR #124](https://github.com/fredvolks/loveroll/pull/124) · [Prompt LR-027](./LOVEROLL_MASTER_PROMPT.md) · [Issue #40](https://github.com/fredvolks/loveroll/issues/40) |
| [ ] | LR-028 | « As-tu envie de jouer ce soir ? » : invitation Push/in-app Oui/Non/Peut-être avant les deux D6 | **Code, serveur et CI intégrés/validés** : [PR #115](https://github.com/fredvolks/loveroll/pull/115) fusionnée, SQL Supabase active, Edge Push v8 active, [PR #116](https://github.com/fredvolks/loveroll/pull/116) fusionnée. **Web 252 déployé sur Pages** ([preuve](https://github.com/fredvolks/loveroll/actions/runs/40759845719)); **APK signée #117** et recette authentifiée A/B sur appareils réels encore en attente. | [Prompt LR-028](./LOVEROLL_MASTER_PROMPT.md) · [Issue #41](https://github.com/fredvolks/loveroll/issues/41) · [PR #115](https://github.com/fredvolks/loveroll/pull/115) |

## P1 — Responsive universel

| OK | ID | Demande | Statut | PR / preuve |
|---|---|---|---|---|
| [ ] | LR-020 | Android/S25 Ultra, petit Android, Safari iPhone et PWA : safe areas, pas de débordement | ◐ En cours — CI PR #24 réussie pour calendrier/hauteur Réglages; autres pages et appareils réels non vérifiés | [PR #24](https://github.com/fredvolks/loveroll/pull/24) · `settings-short-height-browser-check.cjs` · `evening-d100-template.test.mjs` |
| [ ] | LR-021 | iPad et tablette Android : portrait/paysage, grilles, calendrier, D100 au socle | ◐ Scènes Accueil/Soirée iPad vérifiées par navigateur aux deux orientations ; essai appareil réel et calendrier complet tablette restent à valider | [PR #72 fusionnée](https://github.com/fredvolks/loveroll/pull/72) · `ipad-romance-scene-browser-check.cjs` · [Pages Web237](https://github.com/fredvolks/loveroll/actions/runs/40495972734) |
| [ ] | LR-022 | PC/Mac : Chrome, Edge, Firefox, Safari ; 1280 à 2560 px et fenêtrage | À faire | — |
| [ ] | LR-023 | Breakpoints et hauteur utile, accessibilité/zoom, taille/caméra des dés 3D | ◐ En cours — correctif calendrier petite hauteur PR #24, D100 PR #21 ; matrice complète non vérifiée | [PR #24](https://github.com/fredvolks/loveroll/pull/24) · [PR #21](https://github.com/fredvolks/loveroll/pull/21) |
| [ ] | LR-024 | Navigation sur mobile/tablette/PC adaptée, sans surprendre les utilisateurs | À faire | — |

## P1 — Audit designer + couple

| OK | ID | Demande | Statut | PR / preuve |
|---|---|---|---|---|
| [ ] | LR-030 | Audit de **chaque page et état** (Accueil, Soirée, Défis, Éclat, Surprise, Avent, calendrier, réglages, admin, connexion) | ◐ En cours — audit initial fondé sur le code ; captures/tests réels manquants | [rapport préliminaire](./LOVEROLL_AUDIT_UX_UI_20261026.md) |
| [ ] | LR-031 | Rapport direction artistique : constat, impact, correction, priorité, effort, captures | ◐ En cours — audit initial fondé sur le code ; captures/tests réels manquants | [rapport préliminaire](./LOVEROLL_AUDIT_UX_UI_20261026.md) |
| [ ] | LR-032 | Rapport « couple » : clarté, enchaînement, ambiance, incompréhensions, clics | ◐ En cours — audit initial fondé sur le code ; captures/tests réels manquants | [rapport préliminaire](./LOVEROLL_AUDIT_UX_UI_20261026.md) |
| [ ] | LR-033 | Suggestions majeures proposées avant refonte du parcours / règles de jeu | À faire | — |

## P1 — Validation et livraison

| OK | ID | Demande | Statut | PR / preuve |
|---|---|---|---|---|
| [ ] | LR-040 | Tests logique/3D/sonneries/timers/calendrier/200 défis/idempotence | À faire | — |
| [ ] | LR-041 | Captures avant/après et matrice tests Android, iPhone, tablette portrait/paysage, PC | À faire | — |
| [ ] | LR-042 | Compte rendu réel, tests exécutés, traçabilité par LR-xxx, recommandations | À faire | — |
| [ ] | LR-043 | Pas de perte de données, de secrets ou de régression Premium ; déploiement contrôlé | À faire | — |

## Issues GitHub de réalisation
Chaque Issue contient les sous-tâches et permet les commentaires/captures. Les cases de ce fichier sont mises à jour **seulement avec preuves** :

| Lot | Issue | IDs |
|---|---|---|
| D100 de Soirée | [#11](https://github.com/fredvolks/loveroll/issues/11) | LR-001 |
| Minuteries et calendrier | [#12](https://github.com/fredvolks/loveroll/issues/12) | LR-002, LR-003 |
| Sons des minuteries | [#13](https://github.com/fredvolks/loveroll/issues/13) | LR-004 |
| Harmonie avec l'Accueil | [#14](https://github.com/fredvolks/loveroll/issues/14) | LR-010 à LR-013 |
| Confirmation de la catégorie D100 | [#27](https://github.com/fredvolks/loveroll/issues/27) | LR-014 |
| Passer / Refuser / repige des défis | [#29](https://github.com/fredvolks/loveroll/issues/29) | LR-015 |
| Plafond mensuel Passer configurable | [#32](https://github.com/fredvolks/loveroll/issues/32) | LR-016 |
| Responsive mobile, tablette, PC | [#15](https://github.com/fredvolks/loveroll/issues/15) | LR-020 à LR-024 |
| Audit et qualité | [#16](https://github.com/fredvolks/loveroll/issues/16) | LR-030 à LR-043 |

### Exécution de l'audit — 26 octobre 2026
L'[audit officiel](./LOVEROLL_AUDIT_UX_UI_20261026.md) est maintenant décomposé en corrections vérifiables dans le [prompt maître](./LOVEROLL_MASTER_PROMPT.md#exécution-des-corrections-de-laudit-du-26-octobre-2026). L'exigence « appliquer toutes les modifications de l'audit » **n'est pas encore entièrement terminée** : la PR P0 #23 sur les taux mensuels est fusionnée; les PR #9 et #21 restent à valider sur leurs branches respectives, et les tâches LR-010 à LR-012 (dont LR-010 désormais en cours sur PC/tablette) ainsi que la validation réelle multiplateforme restent ouvertes. La [PR #24](https://github.com/fredvolks/loveroll/pull/24), en brouillon, traite le guidage de catégorie et le calendrier sur petit écran/zoom. **Ne pas fusionner ou publier sur le seul état du document.**

**Publication du système documentaire :** [PR #10 fusionnée](https://github.com/fredvolks/loveroll/pull/10). Les Issues sont ouvertes et les corrections applicatives restent à vérifier/implémenter.

## Tableau de bord
- **36 exigences identifiées** : les 31 LR numériques existantes, LR-SURPRISE-001, LR-ACCUEIL-001, LR-JEU-001, LR-MUSIQUE-001 et LR-PIGE-001. Ce total ne mesure pas la proportion de code livrée.
- **Bilan historique initial : 0/31 cochées intégralement.** Ne pas employer ce chiffre comme avancement actuel; consulter les lignes de statut et les preuves. Les deux nouvelles exigences sont spécifiées, sans livraison applicative déclarée.
- Ces nombres décrivent le **statut documentaire initial**, **pas** un diagnostic que toute l'application est défectueuse.
- Les développeurs doivent vérifier l'existant et marquer « Déjà présent, vérifié » avec preuves si un point est déjà satisfait.

## Journal des modifications

| Date | Changement | Référence |
|---|---|---|
| 2026-10-26 | Prompt maître consolidé : reprise LR-014 à LR-019 et LR-025 à LR-028, ordre d'exécution et PR #31/#34/#43/#44 avec CI validés ; déploiements et validations physiques non déclarés terminés. | [Commit 6ba26bc](https://github.com/fredvolks/loveroll/commit/6ba26bc3c4811ae0bb008ad7f124f383b44ee9d8) |
| 2026-10-26 | Initialisation du suivi D100, minuterie, harmonisation, audit UX/UI et responsive PC/tablette/mobile | Prompt maître |
| 2026-10-26 | LR-003 : code audité, correctif de libellés ouvert/clôturé et tests unitaires ajoutés, sans modification de données. À vérifier en CI/visuel. | `fix/lr003-calendar-active-status-20261026` |

| 2026-10-26 | Premier audit professionnel « designer + couple » sur le code et les preuves : constats vs risques séparés, priorités et propositions à valider. Non terminé sans matrice visuelle complète. | [audit initial](./LOVEROLL_AUDIT_UX_UI_20261026.md) |

| 2026-10-26 | Synchronisation P0 du suivi officiel : LR-001 D100 PR 21, LR-002 timer PR 9, LR-003 calendrier PR 20 fusionnée et statistiques PR 23 en CI, LR-004 sonneries Web 229 livrées mais tests physiques non faits. Aucune tâche P0 cochée prématurément. | [PR nº 9](https://github.com/fredvolks/loveroll/pull/9) · [PR nº 20](https://github.com/fredvolks/loveroll/pull/20) · [PR nº 21](https://github.com/fredvolks/loveroll/pull/21) · [PR nº 23](https://github.com/fredvolks/loveroll/pull/23) |

| 2026-10-26 | Intégration des corrections de l'audit au maître ; PR #24 ouverte pour LR-013 et LR-020/023. Tests Node inscrits au CI, captures réelles manquantes ; zéro exigence déclarée terminée. | [PR #24](https://github.com/fredvolks/loveroll/pull/24) · [audit](./LOVEROLL_AUDIT_UX_UI_20261026.md) |
| 2026-10-26 | LR-010 : surfaces rubis de l'Accueil harmonisées sur tablette/PC par jetons CSS globaux (Réglages), tests Node et Chromium ajoutés. LR-020 : formulaire Réglages accessible sur hauteur fortement réduite; tests Chromium ajoutés. CI et appareils réels à valider. | [PR #26](https://github.com/fredvolks/loveroll/pull/26) · [PR #24](https://github.com/fredvolks/loveroll/pull/24) |

| 2026-10-26 | Nouvelle demande LR-014 : confirmer Sensuel/Sexuel/Au hasard avant de brasser le D100, « Ne plus afficher » par profil, réactivation Réglages. Spécification seulement, **non développée**. | [Prompt LR-014](./LOVEROLL_MASTER_PROMPT.md) |

| 2026-10-26 | Nouvelle demande LR-015 : Passer / Refuser un défi, choix de l'exclure du lot courant, repige et restitution des non réalisés à la fin de la soirée, historique et cycle de 200 préservés. **Demande non codée.** | [Prompt LR-015](./LOVEROLL_MASTER_PROMPT.md) |

| 2026-10-26 | LR-016 : plafond mensuel sécurisé en migration SQL dans PR #43 (non déployée), lecture RPC personnelle et réglage RPC admin ; UI/refus/repige et tests PostgreSQL simultanés manquants. | [PR #43](https://github.com/fredvolks/loveroll/pull/43) · [Prompt LR-016](./LOVEROLL_MASTER_PROMPT.md) |

## Issues de développement — nouveautés approuvées

| Exigence | Issue |
|---|---|
| LR-017 — Adapter | [#35](https://github.com/fredvolks/loveroll/issues/35) |
| LR-018 — Reprendre | [#36](https://github.com/fredvolks/loveroll/issues/36) |
| LR-019 — Coups de cœur | [#37](https://github.com/fredvolks/loveroll/issues/37) |
| LR-025 — Discrétion | [#38](https://github.com/fredvolks/loveroll/issues/38) |
| LR-026 — Variété | [#39](https://github.com/fredvolks/loveroll/issues/39) |
| LR-027 — Action principale | [#40](https://github.com/fredvolks/loveroll/issues/40) |
| LR-028 — Invitation à jouer | [#41](https://github.com/fredvolks/loveroll/issues/41) |

## Propositions UX/UI

La [revue rapide de code](./LOVEROLL_PROPOSITIONS_AMELIORATIONS_20261026.md) reste disponible ; les idées 3 à 8 du dernier échange et l'invitation à jouer sont maintenant **approuvées sous LR-017 à LR-019, LR-025 à LR-028**. Les autres idées demeurent des propositions non approuvées.

| 2026-10-26 | Ajout approuvé LR-017 à LR-019 et LR-025 à LR-028 : Adapter, Reprendre, Coups de cœur retournant à la pige, Discrétion, Variété, Action principale, invitation Oui/Non/Peut-être au D6. Documentation seulement. | [Prompt maître](./LOVEROLL_MASTER_PROMPT.md) |

## Comment travailler avec ChatGPT Work
Ouvrir le dépôt et fournir l'instruction suivante à Work :

> Reprends le projet GitHub fredvolks/loveroll. Lis docs/LOVEROLL_MASTER_PROMPT.md, docs/LOVEROLL_SUIVI.md et docs/LOVEROLL_NOUVELLES_DEMANDES.md, puis le code existant. Trie les nouvelles demandes, travaille par PR et corrige les exigences dans l'ordre P0 puis P1. Après chaque lot, mets à jour le statut, les preuves et la PR dans docs/LOVEROLL_SUIVI.md. Ne coche pas une tâche sans tests. N'efface ni ma demande ni le travail existant. Conserve l'accueil comme référence visuelle.

## Important
Pour suivre le travail en temps réel, utiliser aussi les **GitHub Issues et les Pull Requests** associées aux lots. Un fichier Markdown seul n'est pas actualisé automatiquement par le code ou CI. Ne jamais prétendre qu'une case cochée prouve un déploiement sans vérification du site publié.


## Surprise premium — demande approuvée du 26 octobre 2026

| Exigence | État | Preuve / prochaine étape |
|---|---|---|
| LR-SURPRISE-001 — D100, Geoapify, parcours premium et filtres facultatifs | À implémenter — documentation ajoutée uniquement | [Prompt officiel](./LOVEROLL_MASTER_PROMPT.md#lr-surprise-001--rendez-vous-surprise-premium-d100-et-geoapify). Budget et km vides = tous les budgets et toutes les distances, sans préférence luxe : mini-putt autant que sortie à 300 $. Corriger d'abord les trajets null, les pannes terminales et les états pending; puis livrer préférences, adaptation et planification avec tests et preuves visuelles. |

Aucun changement de tarifs ni déploiement applicatif n'est réalisé par cet ajout documentaire.


## Accueil / Soirée — demande approuvée du 26 octobre 2026

| Exigence | État | Preuve / prochaine étape |
|---|---|---|
| LR-ACCUEIL-001 — Accueil synthétique, Soirée pour jouer | Spécifié — à implémenter et vérifier | [Prompt officiel](./LOVEROLL_MASTER_PROMPT.md#lr-accueil-001--accueil-vue-densemble-et-raccourcis-soirée-parcours-de-jeu). Conserver D6 hebdomadaire/décor, afficher le quota réel et un raccourci vers Soirée; statut compact au lieu du tableau détaillé; carte Surprise/Éclat et bilan collectif. Aucune création de session ou lancer par simple navigation. |

### Revue de structure du prompt maître — 26 octobre 2026
- Ajout d'un guide en tête : rôle des documents, périmètre des onglets, ordre courant unique et suivi CI jusqu'à résultat final.
- Clarification des propositions déjà approuvées, du statut documentaire LR-014 et du statut historique des notes de PR.
- Les anciens ordres restent conservés comme contexte historique; le guide donne l'ordre courant.
- Les 31 exigences initiales sont conservées, avec les deux ajouts Accueil et Surprise. Le compteur initial 0/31 n'est plus présenté comme un avancement en temps réel.
- Audit documentaire uniquement : aucun état actuel de PR, CI, base ou déploiement n'a été certifié par cette revue.



## Défis existants et ambiance musicale — 26 octobre 2026

| Exigence | État | Prochaine étape |
|---|---|---|
| LR-JEU-001 — Préserver les textes, corriger attribution/progression et fiabiliser le jeu | Spécifié — à implémenter et vérifier | Inventaire/empreintes des textes et durées; correction des rôles self_draws; identité de carte distincte du D100; terminer refus/passes/favoris et import sans écrasement. [Prompt](./LOVEROLL_MASTER_PROMPT.md#lr-jeu-001--fiabiliser-les-défis-existants-sans-modifier-leurs-textes) |
| LR-MUSIQUE-001 — Musique facultative adaptée à chaque carte et au minuteur | Spécifié — à implémenter et vérifier | Métadonnées par carte, pistes originales/licenciées, démarrer/pause/reprise/reset, mute et volume indépendants du temps. Fondu des 5 dernières secondes jusqu'au silence à zéro : la musique remplace alors la sonnerie, sans double signal. Sans musique, sonnerie facultative; aucun son de remplacement après mute volontaire. [Prompt](./LOVEROLL_MASTER_PROMPT.md#lr-musique-001--ambiance-musicale-facultative-par-carte-liée-au-minuteur) |

**Verrou utilisateur :** titres, consignes et minuteries configurées des cartes conservés; l'attribution peut être corrigée. L'ajout des prompts ne constitue ni une modification des cartes ni un déploiement musical.


## Précision LR-019 — cinq favoris communs maximum (26 octobre 2026)
**État : spécification approuvée, à implémenter et vérifier.** [Prompt LR-019](./LOVEROLL_MASTER_PROMPT.md#lr-019--coups-de-cœur--un-favori-retourne-dans-la-pige-idée-no-5).
- Une liste commune de 5 cartes distinctes toutes catégories confondues; gestion par chacun des partenaires dans Réglages → Jeu → Nos coups de cœur.
- Ajout depuis ses anciens défis et ceux du partenaire, après clôture via le calendrier; aucune ouverture des cartes encore privées d'une soirée active.
- Au sixième ajout : notification dans l'app, choix du favori à retirer/remplacer, confirmation; remplacement atomique, compteur synchronisé et plafond serveur.
- Aucun favori ne garantit la pige, la personne qui accomplit ou reçoit le défi; probabilités, rôles femme/homme, exclusions et cycle conservés.
- Vérifier concurrence, doublons, remplacement/annulation/échec et listes existantes de plus de 5 sans suppression arbitraire.
Ajout documentaire uniquement : aucune carte ni donnée utilisateur modifiée.


### Précision LR-019 — retrait directement dans la notification
Demande approuvée : au sixième ajout, la notification interactive présente immédiatement les 5 favoris, titre/catégorie et un bouton « Retirer et ajouter le nouveau » sur chaque carte. Le remplacement atomique se fait depuis cette fenêtre sans passage par Réglages ni seconde confirmation obligatoire. Fermeture/Annuler conserve la liste. Inclure tests mobile, concurrence et erreurs réseau. **Spécification uniquement, pas encore implémentée.**


## LR-PIGE-001 — Cartes disponibles par catégorie dans Soirée
**État : spécifié, à implémenter et vérifier.** [Prompt officiel](./LOVEROLL_MASTER_PROMPT.md#lr-pige-001--soirée--cartes-encore-disponibles-par-catégorie).
Afficher près des catégories les cartes distinctes encore admissibles à la prochaine pige du joueur, calculées par le moteur serveur (rôles, bibliothèque, exclusions, favoris, cycle, mode). Actualiser avec les mutations et la synchronisation; distinguer chargement/erreur de zéro. Aucun changement de textes, probabilités, quotas ou historique. Tester les deux joueurs, concurrence, reprises et matrice responsive. Ajout documentaire uniquement.

## Journal de reprise autonome — 26 octobre 2026, cycle LR-003/LR-004/LR-015

| Exigence | Avancement prouvé (branche uniquement) | Restant / blocage |
|---|---|---|
| LR-001 | PR [#21](https://github.com/fredvolks/loveroll/pull/21), run [40336399686](https://github.com/fredvolks/loveroll/actions/runs/40336399686), SHA `b91a7ccf`, **success** | Fusion et contrôle production/appareils ; ne pas cocher |
| LR-002 | PR [#50](https://github.com/fredvolks/loveroll/pull/50), run [40337241207](https://github.com/fredvolks/loveroll/actions/runs/40337241207), SHA `aac3639d`, **success** | Fusion, vérification minuteur réel et migration de compatibilité ; ne pas cocher |
| LR-003 | PR [#51](https://github.com/fredvolks/loveroll/pull/51), run [40346544556](https://github.com/fredvolks/loveroll/actions/runs/40346544556), SHA `01266ab2`, **success** | Audit cycle/200 et test appareil, fusion ; ne pas cocher |
| LR-004 | PR [#52](https://github.com/fredvolks/loveroll/pull/52), run [40352112006](https://github.com/fredvolks/loveroll/actions/runs/40352112006), SHA `2cd20541`, **success** ; reprise du son après suspension audio | Tests Safari iPhone/PWA installée et Android physiques, limites OS ; ne pas cocher |
| LR-015 | PR [#53](https://github.com/fredvolks/loveroll/pull/53), run [40352784694](https://github.com/fredvolks/loveroll/actions/runs/40352784694), SHA `dcc6b97c`, **success** phase 1 | Nouveau commit `4e1c4e94` (capacité de pige/carte passée) en validation run [40354801803](https://github.com/fredvolks/loveroll/actions/runs/40354801803). RPC refus/exclusions/repige, tests PostgreSQL et UI encore à faire ; ne pas cocher |
| Continuité | PR [#47](https://github.com/fredvolks/loveroll/pull/47), run [40353308001](https://github.com/fredvolks/loveroll/actions/runs/40353308001), SHA `3d46ed19`, **success** | Ce journal produit un nouveau SHA CI ; automatisme `workflow_run` non actif sur main avant fusion autorisée |

**La réussite CI ne prouve ni le déploiement ni un test physique.** Le dernier déploiement Pages `main` confirmé reste en échec ([40316957313](https://github.com/fredvolks/loveroll/actions/runs/40316957313)). Aucun secret, authentification ou donnée personnelle modifiés. Suivre strictement la nouvelle tête de branche et les SHA lors de la reprise.


## Publication Web — reprise du 26 octobre 2026
- PR [#47](https://github.com/fredvolks/loveroll/pull/47) fusionnée : `5fe2fddf95b78e9bcb7dc65dcf82917760fcec99`; corrige le faux échec 5 boutons / 4 et aligne le test des PR avec Pages.
- Contrôles préalables : CI sur tête `ce43bb3` réussie, 3 tests locaux de finale et syntaxe de 223 scripts réussis.
- Version Web 232 : repères endpoint/app/HTML/service-worker harmonisés; tests des versions fondés sur leur cohérence plutôt que l'ancien numéro 229 figé. 21 tests locaux ciblés réussis.
- **Publication/recette publique de Web 232 à confirmer après le présent commit.** Consulter les runs du SHA réel. Les autres PR fonctionnelles restent distinctes; aucune n'est déclarée publiée par ce lot.

## LR-045 — Soirée Extra

| [ ] | LR-045 | Soirées Extra **illimitées** quand les dés hebdomadaires sont épuisés : même bouton Brasser le dé ; proposition Accepter/Refuser ; D6 de chaque partenaire pour le nombre de défis, puis D100 ; toutes les cartes éligibles remises dans la pige de **chaque Extra** sans toucher au cycle normal ; option ON/OFF réservée à l'admin du couple ; historique et synchro intacts | **Spécification approuvée seulement — code, tests et déploiement non réalisés** | [Exigence LR-045](./LOVEROLL_MASTER_PROMPT.md#lr-045--soirée-extra-illimitée-après-épuisement-des-dés-hebdomadaires-demande-approuvée-le-26-octobre-2026) |



## LR-046 — Orientation lisible des résultats D6 / D100 (26 octobre 2026)

- **Statut :** ◐ Correctif WebGL proposé, validation CI et publication à confirmer. Ne pas cocher avant le déploiement réellement vérifié.
- **Source :** capture Android du 26 octobre : le D6 résultat officiel 2 était trop tourné de côté et la face adjacente dominait visuellement.
- **Correctif :** orientations d'arrêt D6/D100 plus frontales, repère de gravure réel de chaque face, suppression du réglage spécial de la face 2. Valeurs serveur, probabilités, gravures, matériaux, socle et trajectoire inchangés.
- **Preuves prévues :** `couple-web/dice-face-readability-browser-check.cjs` (D6 1–6, D100 représentatifs; téléphone 360×700, tablette 820×1180, ordinateur 1366×768), `dice-roll-motion.test.mjs`, captures WebGL `LoveRoll-D6-D100-face-readability-*` de GitHub Actions, comparaison avec la capture initiale. Tests physiques sur les vrais appareils et comparaison avant/après à confirmer; captures CI « après » ne remplacent pas une capture « avant ».
- **Livraison :** branche `fix/d6-d100-face-readability-20261026` ; PR, CI, version Web, déploiement Pages et comportement public à renseigner après vérification.

## Refonte Éclat — douze coffrets approuvés le 27 octobre 2026

**LR-ECLAT-001 : spécification de jeu rédigée, développement non commencé dans cette intervention.** [Maître](./LOVEROLL_MASTER_PROMPT.md) · [Contrat de jeu détaillé](./LOVEROLL_ECLAT_12_COFFRETS_SPEC.md). Work implémente les décisions fixées; aucun nouveau gameplay à inventer. Les colonnes designer/client/joueur/codeur exigent des preuves propres au coffret; aucune case de livraison cochée par la seule rédaction de cette spécification.

| ID | Coffret | Spécification | Code / livraison | Recette designer / client / joueur / codeur |
| --- | --- | --- | --- | --- |
| LR-ECLAT-01 | Les cinq secrets | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | À faire | À réaliser et documenter |
| LR-ECLAT-02 | Le double jeu | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | À faire | À réaliser et documenter |
| LR-ECLAT-03 | Le langage des sens | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | À faire | À réaliser et documenter |
| LR-ECLAT-04 | Les portes de minuit | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | À faire | À réaliser et documenter |
| LR-ECLAT-05 | Comme au premier rendez-vous | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | À faire | À réaliser et documenter |
| LR-ECLAT-06 | L’enquête amoureuse | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | À faire | À réaliser et documenter |
| LR-ECLAT-07 | À ta place | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | À faire | À réaliser et documenter |
| LR-ECLAT-08 | Notre bande originale | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | À faire | À réaliser et documenter |
| LR-ECLAT-09 | Le coffre des envies | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | À faire | À réaliser et documenter |
| LR-ECLAT-10 | Le compte à rebours | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | À faire | À réaliser et documenter |
| LR-ECLAT-11 | L’art de te séduire | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | À faire | À réaliser et documenter |
| LR-ECLAT-12 | La nuit du hasard | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | À faire | À réaliser et documenter |
