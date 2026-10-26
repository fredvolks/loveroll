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
- Tentatives de correction de la présente branche : **1 correction du test**, **0 relance** au moment de la création de ce fichier.
- Tests locaux : non lancés (le conteneur local ne peut pas résoudre le domaine GitHub pour cloner le dépôt). Exécuter les vrais tests Node via GitHub Actions sur la PR ; ne pas prétendre qu'ils sont déjà verts.
- Runs nouveaux de la branche : **à découvrir après création de la PR**, noter les identifiants, SHA et conclusions ici avant de valider.

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
1. Ouvrir une **PR brouillon** de `fix/ci-continuity-pages-20261026` vers `main`.
2. Identifier les nouveaux runs sur son `head_sha` (les runs PR de GitHub peuvent aussi référencer un SHA de merge synthétique). Suivre les jobs, télécharger les journaux en cas d'échec, réparer et relancer.
3. Après un CI vert sur le code courant, ne pas fusionner sans autorisation ; laisser les liens de validation dans la PR et ce document.
4. Diagnostiquer séparément la PR Réglages #46, puis revenir aux P0 du prompt maître. Lorsqu'une session s'arrête, **reprendre par ce fichier et les runs en cours**, sans demander « continue » pour la même étape.
