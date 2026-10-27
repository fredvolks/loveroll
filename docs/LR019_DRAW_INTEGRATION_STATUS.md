# LR-019 — PR empilée sur LR-015 / état de reprise

Branche : `feat/lr019-favorites-draw-lr015-20261026`.
Dépendance obligatoire : PR #54 / branche `feat/lr015-cycle-exclusions-20261026`, SHA de base `fc6265b88c3e364131a918d7c0bfc5e469ad6162`, et PR #56 / socle LR-019.

## Inclus
- Migration sécurisée des favoris de PR #56.
- Intégration du prédicat de soirée future dans les trois filtres du tirage D100 (capacité, choix, remise à zéro de la pige) et dans le remplacement LR-015.
- Exclusions par couple/cycle et contrôle des rôles sont conservés et prioritaires; la vérification « déjà tiré pendant cette soirée » demeure obligatoire.
- Fixture PostgreSQL 17 avec tirage authentique sur la base LR-015 + cœur ancien + historique complet.

## Limites bloquantes
- **Ne pas fusionner ni appliquer à Supabase tant que les PR #54 et #56, la migration, les statistiques uniques du cycle de 200 et la recette multiclient ne sont pas compatibles et validées.**
- Cette branche est un lot de dépendance: pas de bouton UI, pas de déploiement, aucun changement d'identifiants des cartes ni d'historiques. La prise en compte des réalisations uniques du cycle n'est pas corrigée par cette migration. Un cœur rejoué ne doit pas augmenter le compteur « cartes uniques » sans audit complémentaire.
- Test réel PostgreSQL et intégration Web sur le dernier SHA doivent être confirmés avant toute déclaration de réussite.

## Exécutions
- PR #54 SHA `fc6265b88c3e364131a918d7c0bfc5e469ad6162` : PostgreSQL 40394905331 et Web 40394905315 terminés avec succès.
- PR #56 base `6e37bf63cbef93e989322443bb72bc3d1bdc63e2` : PostgreSQL 40404810676 réussi, Web 40404810686 en cours à la création.
- Présent lot : premier run à récupérer après commit et PR.

## Prochaine action exacte
Identifier le run, le SHA et les jobs. Lire les journaux des échecs, reproduire/corriger et pousser sans attendre. Ne pas modifier `main`. Ensuite auditer le compteur unique des 200 défis et les interactions LR-015 sous deux sessions réelles.

## Compteur unique du cycle LR-019
- Correctif SQL : `love_cycle_status` et `finish_couple_session` comptent les paires distinctes `(category,card_id)` du cycle, et non les réalisations répétées.
- Test PostgreSQL isolé à cible réduite 2 : deux réalisations de la même carte = 1 carte unique; une nouvelle carte distincte ouvre le bilan.
- Compatible seulement après revue des autres définitions de RPC, statut/refus LR-015 et confidentialité ; aucun déploiement.
- Nouveau commit et runs à contrôler sur le SHA exact. Les validations précédentes ne couvrent pas ce changement.

## Résultats validés de cette branche
- SHA fonctionnel `fb8d40a8f751796c3ac30e790bc7ff4130aadb72`, workflow PostgreSQL [#40407237367](https://github.com/fredvolks/loveroll/actions/runs/40407237367) **completed/success**.
- Régressions corrigées : fixture avec couple absent au premier run, ajout du couple fictif; priorité d'exclusion testée; compteurs cycle basés sur cartes distinctes même si un cœur revient.
- Le présent ajout modifie le SHA et nécessite une nouvelle exécution SQL. Dépendance sur #54/#56 toujours obligatoire, aucun merge/migration production.
