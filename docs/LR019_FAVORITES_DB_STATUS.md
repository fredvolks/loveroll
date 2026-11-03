# LR-019 — Favoris du couple : étape base de données

**État : première tranche non déployée, PR brouillon. PostgreSQL et Web validés sur le commit de code `35a4e9e`; toute modification ultérieure de SHA doit être recontrôlée.**

## Inclus
- Table des coups de cœur par couple / catégorie / identifiant / membre, historique d'attribution et maintien des deux cœurs indépendants.
- RPC d'ajout/retrait idempotent, lecture partagée aux membres du couple; accès SQL direct désactivé, contrôle d'identité et d'appartenance.
- Une carte de l'historique peut conserver son cœur même si elle n'est plus dans le catalogue actif; cela ne la rend pas tirable.
- Fixture PostgreSQL isolée vérifiant les accès entre couples, l'archivage, la lecture des deux membres, les validations et les doubles appuis.

- Prédicat de réadmissibilité temporelle : une carte marquée pendant une soirée ne revient pas dans cette même soirée. Une autre soirée active du couple peut consulter la règle, après sa date de début. Ce prédicat n'effectue aucun tirage.

## Exclu volontairement de cette tranche
- **Aucun changement au tirage D100**, à LR-015 (Passer/Refuser), au cycle de 200, aux pourcentages, à la confidentialité ou aux cartes.
- Aucun bouton UI exposé. Aucune migration Supabase exécutée; aucune carte utilisateur ni donnée de production touchée.
- L'intégration future doit explicitement rendre le favori admissible **uniquement à partir de la soirée suivante**, tout en conservant le contrôle anti-doublon dans la soirée, les exclusions LR-015 prioritaires et les statistiques d'unicité du cycle.
- Tests à deux véritables comptes Supabase, synchronisation client, essais physiques et audit de migration de production restent nécessaires.

## Continuité
Branche : `feat/lr019-favorites-db-20261026`. Point de départ : `main` au SHA `e17cfcdd2b083d408719bd594bd9facc8822cffe`.
Tâche en cours : validation du socle LR-019.
Dernière modification : migration et contrôle PostgreSQL isolé.
Résultats exacts : première tentative PostgreSQL [40397251196](https://github.com/fredvolks/loveroll/actions/runs/40397251196) **failure** : assertion de fixture `1/0` optimisée comme constante. Correction ciblée `35a4e9e` avec contrôle PL/pgSQL explicite, sans supprimer la protection. Deuxième tentative [40397393873](https://github.com/fredvolks/loveroll/actions/runs/40397393873) **completed/success**, 8/8 étapes. Web [40397393546](https://github.com/fredvolks/loveroll/actions/runs/40397393546) **completed/success**, 35/35 étapes, tous deux sur SHA `35a4e9e1557e795c85d37688fa9c50daf2177276`.
Dernière modification : ce suivi documentaire produit un **nouveau SHA** ; consulter le prochain run Web sur cette nouvelle tête et ne pas extrapoler la réussite du SHA précédent.
Prochaine action : identifier le run exact et son SHA, analyser tout échec, corriger la branche, vérifier `completed/success`. Puis intégrer séparément le moteur et les composants UI sur une base compatible avec LR-015.
Prompt maître : LR-001..004 en PR, LR-015 #54 en cours, LR-019 première tranche seulement. Le registre central `docs/WORK_TEST_CONTINUITY.md` est en PR #47, non présent sur le `main` actuel.

## Étape suivante
- Vérifier le run PostgreSQL et Web du présent changement, avec tests même soirée / soirée future / session extérieure. Ne pas présenter le prédicat comme le moteur de pige intégré.
