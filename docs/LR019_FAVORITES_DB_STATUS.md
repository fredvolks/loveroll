# LR-019 — Favoris du couple : étape base de données

**État : première tranche non déployée, PR brouillon, à valider avec PostgreSQL 17.**

## Inclus
- Table des coups de cœur par couple / catégorie / identifiant / membre, historique d'attribution et maintien des deux cœurs indépendants.
- RPC d'ajout/retrait idempotent, lecture partagée aux membres du couple; accès SQL direct désactivé, contrôle d'identité et d'appartenance.
- Une carte de l'historique peut conserver son cœur même si elle n'est plus dans le catalogue actif; cela ne la rend pas tirable.
- Fixture PostgreSQL isolée vérifiant les accès entre couples, l'archivage, la lecture des deux membres, les validations et les doubles appuis.

## Exclu volontairement de cette tranche
- **Aucun changement au tirage D100**, à LR-015 (Passer/Refuser), au cycle de 200, aux pourcentages, à la confidentialité ou aux cartes.
- Aucun bouton UI exposé. Aucune migration Supabase exécutée; aucune carte utilisateur ni donnée de production touchée.
- L'intégration future doit explicitement rendre le favori admissible **uniquement à partir de la soirée suivante**, tout en conservant le contrôle anti-doublon dans la soirée, les exclusions LR-015 prioritaires et les statistiques d'unicité du cycle.
- Tests à deux véritables comptes Supabase, synchronisation client, essais physiques et audit de migration de production restent nécessaires.

## Continuité
Branche : `feat/lr019-favorites-db-20261026`. Point de départ : `main` au SHA `e17cfcdd2b083d408719bd594bd9facc8822cffe`.
Tâche en cours : validation du socle LR-019.
Dernière modification : migration et contrôle PostgreSQL isolé.
Résultats et tentatives : **à compléter après le prochain run GitHub Actions** ; ne pas présumer d'une réussite.
Prochaine action : identifier le run exact et son SHA, analyser tout échec, corriger la branche, vérifier `completed/success`. Puis intégrer séparément le moteur et les composants UI sur une base compatible avec LR-015.
Prompt maître : LR-001..004 en PR, LR-015 #54 en cours, LR-019 première tranche seulement. Le registre central `docs/WORK_TEST_CONTINUITY.md` est en PR #47, non présent sur le `main` actuel.
