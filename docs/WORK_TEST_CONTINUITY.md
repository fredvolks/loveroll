# LoveRoll — Continuité Work / GitHub Actions
> Actualisé le 2026-10-26 (America/Toronto). Les états ci-dessous sont une photographie, pas une garantie de réussite future.

## Reprise immédiate
1. Lire ce fichier, puis `LOVEROLL_MASTER_PROMPT.md`, `LOVEROLL_SUIVI.md`, `LOVEROLL_NOUVELLES_DEMANDES.md` et `README.md`.
2. Consulter la tête courante de **main** et de la branche de travail, les PR ouvertes et les derniers runs GitHub Actions. Vérifier chaque `head_sha` : un workflow réussi sur un ancien SHA ne valide pas la branche actuelle.
3. Suivre tous les runs encore `queued`, `waiting` ou `in_progress` jusqu'à une conclusion réelle. Récupérer les **jobs, étapes et journaux** des échecs.
4. Corriger la cause, exécuter les tests disponibles, pousser et vérifier le nouveau SHA. Ne jamais désactiver un test pour faire « passer » le CI.
5. Une fois les tests requis validés, poursuivre la prochaine tâche ouverte de `LOVEROLL_SUIVI.md`. Ne pas fusionner dans `main` sans autorisation.

## Branche et état de la tâche
- Dépôt : `fredvolks/loveroll`.
- Branche de travail : `fix/ci-continuity-pages-20261026` ([voir sa tête courante](https://github.com/fredvolks/loveroll/commits/fix/ci-continuity-pages-20261026)).
- Point de départ main (2026-10-26 07:41 EDT) : `433735821f541b44def5738f48c9691c2984d950`.
- Dernier commit de code/configuration avant rédaction de ce fichier : `594b74abc49405db8d4c20bd7ca44606855a59b6`. **Pour la dernière tête réelle, utiliser le lien de branche** : ce document ne peut pas prédire le SHA du commit qui le contient.
- Tâche active : remettre le déploiement Pages en état et éliminer l'écart de tests entre le CI des PR et celui du déploiement, puis continuer les P0 LoveRoll.
- Dernières modifications : test de fin de soirée ciblé sur le conteneur des **deux** actions finales, préservation du contrôle « Masquer » ; inclusion de ce test dans les PR ; workflow autonome de notification d'échecs persistants.
- Commits de la tranche : `0e5b4975bd2c7804f820d54b8518ffbcdc719c0b` (test) ; `11cd6d0693e9d3088d3dbc966274ae245ac1a108` (CI PR) ; `594b74abc49405db8d4c20bd7ca44606855a59b6` (incidents persistants).

## Cause racine du dernier déploiement échoué
- Workflow : « Déployer LoveRoll Web sur GitHub Pages », [run 40316957313](https://github.com/fredvolks/loveroll/actions/runs/40316957313), #408, événement `push`, SHA `433735821f541b44def5738f48c9691c2984d950`.
- État final confirmé : **failure** ; job `deploy` 121551850513, étape « Valider la PWA, l'authentification et l'adaptation mobile ».
- Journal exact : `couple-web/evening-finale-v99.test.mjs:10` → `AssertionError: 5 !== 4`. Il comptait tous les boutons de la vue alors que `premium-evening.mjs` contient maintenant le vrai contrôle de confidentialité `data-lr-privacy-hide` en plus des deux boutons de fin de soirée.
- Correction ciblée : vérifier exactement les **deux boutons du groupe `evening-finale-actions`** et la présence du bouton de confidentialité, plutôt que supprimer ce dernier ou augmenter arbitrairement un décompte de toute la page.
- Cause du faux signal : « LoveRoll connected web checks » ne lançait pas ce test contrairement au workflow Pages ; les PR et le push sur main pouvaient donc être verts tout en bloquant la publication.
- **Pas encore déployé** : ces changements sont sur une branche non fusionnée ; le déploiement main demeure en échec jusqu'au passage des validations, à l'autorisation de fusion et à un **nouveau run Pages terminé avec success**.

## Runs connus lors de l'inspection
| Run ID | Workflow | SHA | État final | Action |
|---|---|---|---|---|
| [40316957313](https://github.com/fredvolks/loveroll/actions/runs/40316957313) | Pages #408 | `43373582…` | Échec | Correction sur cette branche, confirmer la prochaine exécution main |
| [40316956813](https://github.com/fredvolks/loveroll/actions/runs/40316956813) | Web checks #618 | `43373582…` | Réussi | Ne couvre pas les changements de cette branche |
| [40314967708](https://github.com/fredvolks/loveroll/actions/runs/40314967708) | Web checks PR #617 | `31cb5ec3…` | Échec | Branche `feat/lr044-settings-ux-20261026` ; analyser son échec séparément, ne pas confondre avec le déploiement main |
- Tentatives de correction de la présente branche : **1 correction du test**, **1 premier run PR réussi**, **0 relance d'échec**.
- Tests locaux : non lancés (le conteneur local ne peut pas résoudre le domaine GitHub pour cloner le dépôt). Exécuter les vrais tests Node via GitHub Actions sur la PR ; ne pas prétendre qu'ils sont déjà verts.
- PR brouillon [#47](https://github.com/fredvolks/loveroll/pull/47), run [40325396667](https://github.com/fredvolks/loveroll/actions/runs/40325396667), numéro **619** : **completed / success** confirmé sur SHA `74aabbd9e639169126b7387f88c4d6c2630d42c9`. Toutes les étapes, dont tests de fin de soirée, WebGL, coffrets, responsive et Réglages, ont réussi. Toute modification ultérieure nécessite une nouvelle validation SHA.

## Automatisation indépendante de Work
- `couple-web-check.yml` : exécution sur `push main` et PR visant main ; comprend maintenant la régression de fin de soirée.
- `deploy-couple-web.yml` : publication **sur main uniquement** ; ne pas modifier les secrets ni les permissions de Pages. Un CI vert sur PR **n'est pas une preuve de déploiement**.
- `loveroll-persistent-ci-report.yml` : écoute les conclusions de Web checks et Pages sur `main` ; après **deux échecs consécutifs** du même workflow, crée ou met à jour **une seule Issue par workflow** contenant run IDs, SHA et étapes fautives. Ferme l'incident après réussite. Ne clone aucun code de PR, ne modifie aucun secret et ne relance/commit/déploie jamais automatiquement.
- Ce dernier workflow **ne fonctionnera qu'après fusion autorisée dans main**. Aucun GitHub Action ne peut garantir la poursuite d'une session Work fermée ; la persistance est assurée par les commits, checks et le présent fichier.

## Priorités du prompt maître (état de reprise)
1. **P0 LR-001** — D100 de Soirée entièrement visible et posé sur socle, PR #21 en vérification visuelle.
2. **P0 LR-002** — timer à 00:00 → validation métier idempotente ; PR #9 et tests 2 partenaires.
3. **P0 LR-003** — calendrier/statistiques cohérents, audit cycle 200 encore incomplet.
4. **P0 LR-004** — sonneries/minuteries iOS/Android, essais physiques non faits.
5. **P1 LR-010–014, LR-015–019, LR-020–028 et LR-030–043** — plusieurs PR partielles ouvertes ; voir le suivi maître pour le détail. **LR-044** : refonte mobile Réglages, PR #46 en échec CI lors de la première vérification ; ne pas déclarer terminée.

## Prochaine action exacte
1. PR #47 **ouverte et tests verts** pour son ancien SHA `74aabbd9...` ; le présent changement documentaire déclenche un **nouveau** SHA, vérifier la nouvelle exécution jusqu'à `completed / success` avant toute déclaration de validation.
2. **Ne pas fusionner dans main sans autorisation** ; l'échec Pages [#40316957313](https://github.com/fredvolks/loveroll/actions/runs/40316957313) reste non résolu en production. Incident [#48](https://github.com/fredvolks/loveroll/issues/48) créé pour conserver le suivi.
3. Diagnostiquer la PR Réglages #46 séparément : dernier échec confirmé `romantic-settings-surprise-browser-check.cjs:79`, `5 !== 6` sur l'attente des sections Réglages ; son SHA récent `51ade4ea...` n'avait pas de run concluant lors de l'analyse. Ne pas modifier un test sans vérifier si la navigation prévue a changé.
4. Revenir aux P0 du prompt maître. Lorsqu'une session s'arrête, **reprendre par ce fichier et les runs en cours**, sans demander « continue » pour la même étape.

## Journal de validation — 2026-10-26
- CI PR #47 / workflow #619, run 40325396667 : **réussite finale confirmée** (completed/success) ; HEAD exact `74aabbd9e639169126b7387f88c4d6c2630d42c9`. Contrôle du dernier test de fin de soirée inclus. Aucune fusion ni publication de production.
- Incident de déploiement documenté dans l'[Issue #48](https://github.com/fredvolks/loveroll/issues/48).
- Modification du seul suivi ci-dessous : impose de **recontrôler le nouveau SHA** après cette mise à jour documentaire.


## Reprise transversale — 26 octobre 2026, après les runs #620–#630
- **PR #47 (CI et Pages)** : SHA validé `40d73d890a7d761ebae372450674f00cf84fb20b`, run [#620 / 40327320514](https://github.com/fredvolks/loveroll/actions/runs/40327320514) **completed/success**. Le présent ajout au suivi crée un autre SHA : ne pas réutiliser abusivement cette réussite pour le nouveau HEAD. Correction Pages encore non fusionnée ; main et sa publication restent au dernier échec `40316957313`.
- **PR #46 (LR-044 Réglages)** : branche `feat/lr044-settings-ux-20261026`, réconciliée avec le quota LR-016 de main par merge commit `a32ba725c0a19c282c9d81cd5887c459bf03192c`. Run #621 / `40330852175` **failure** : contrôle Playwright `romantic-settings-surprise-browser-check.cjs:125` cherchait Notifications directement à la racine (nouveau parent : Mes préférences). Correction `c8bbcf632cbb7fed9e9879867784e3afed433d08`. Run #623 / `40332375899` **failure** : le premier parcours a réussi, mais `settings-menus-browser-check.cjs:6` utilisait encore l'ancien chemin direct. Nouveau HEAD `02d2b76e90b82b060b5d4cbbc9b68a4665bf34bd` : run #630 / `40334333357` **en cours au dernier contrôle**. Ne pas confondre réussite des étapes avec conclusion du run.
- **PR #21 (P0 LR-001 D100 Soirée)** : réconciliation main avec l'ancien D100 via `b2eb151728cd1e4f38c1e627bbefcd78cf565745` ; run #622 / `40331349332` **failure**, puis run #624 / `40332904733` **failure**, tous deux à `evening-d100-template-browser-check.cjs:22`. Symptôme réel sur 320 × 568 : logo Soirée y=43, logo Accueil y=9, titre Soirée y=93, donc chevauchement. Le commit de diagnostic `b6702aa0719f37d61fa00c491efe98a32635cc12` a déclenché run #628 / `40334218061` ; notre correctif CSS ciblé `9d8c61077947823213b904b0d261ed412a96c785` force l'alignement vertical en tête sur téléphones courts, run #629 / `40334243077` **en attente au dernier contrôle**. Contrôler géométrie 3D réelle et socle après l'en-tête, sans assouplir le test.
- **LR-002 minuteurs** : la PR #9 demeure incompatible avec main ; une nouvelle branche indépendante `feat/lr002-timer-rebased-20261026` exécute ses propres checks : run #626 / `40333856980` **failure** ; run #627 / `40334012020` **en cours**. Inspecter leurs conclusions et éviter les commits concurrents sur sa branche.
- **Autre travail parallèle** : `docs/lr045-soiree-extra-20261026` run #625 / `40333808240` en cours ; ne pas assimiler à une PR validée.
- **Nombre de cycles pertinents** : PR #46, runs #621 et #623 en échec, correctifs de chemin et #630 actif ; PR #21, runs #622 et #624 en échec, correction d'en-tête et #629 actif ; PR #47, runs #619 et #620 réussis avant cette mise à jour.
- **Tests locaux** : pas de clone complet local disponible dans cette session ; assertions de contenu et relecture des patches réalisées. Les résultats exécutables sont ceux de GitHub Actions uniquement. Aucun essai physique Android ou iOS n'est revendiqué.
- **Action exacte à la reprise** : consulter GitHub Actions pour les runs #625, #627, #628, #629 et #630, en vérifier SHA, job et étapes ; récupérer le journal de toute conclusion `failure`, corriger uniquement la branche correspondante et suivre la nouvelle exécution jusqu'au résultat final ; ne fusionner aucune PR dans main sans autorisation. Ensuite reprendre les P0 LR-001, LR-002, LR-003 et LR-004, puis les autres exigences du prompt maître.
