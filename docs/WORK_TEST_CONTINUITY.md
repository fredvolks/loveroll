# LoveRoll — continuité Work et tests GitHub

Dernière mise à jour : 2026-10-26 (état vérifié par GitHub API).

## Reprise immédiate
1. Lire ce fichier, `docs/LOVEROLL_MASTER_PROMPT.md`, `docs/LOVEROLL_SUIVI.md`, `docs/LOVEROLL_NOUVELLES_DEMANDES.md` et `README.md`.
2. Consulter la PR #46 et ses runs **sur le SHA actuel** avant de conclure quoi que ce soit.
3. Réconcilier la branche LR-044 avec `main` après la fusion de la PR #45, sans écraser les règles LR-016, puis corriger les conflits.
4. Exécuter les tests locaux disponibles, pousser, suivre les workflows jusqu'à conclusion, examiner les journaux et corriger les régressions. Ne pas supprimer de tests.
5. Poursuivre les exigences ouvertes du prompt maître selon leur priorité et mettre à jour ce journal après chaque cycle.

## État confirmé
- Dépôt : `fredvolks/loveroll`.
- Branche active : `feat/lr044-settings-ux-20261026` ; SHA observé avant ce document : `eb7f9eb2e645f3b3f1833edc7364beb38231ab58`.
- Tâche : LR-044, refonte UX des Réglages, PR #46 (ouverte, brouillon, conflit avec `main`).
- Dernière modification : adaptation du test visuel des cinq rubriques ; commit `eb7f9eb`.
- Dernier SHA de PR #46 : aucun run retourné par la consultation GitHub à l'instant du contrôle. **Non testé** sur ce SHA.
- Run précédent #40314967708 (SHA `31cb5ec3d1ca9ba168d441608efd7bc7cdf0c077`) : **échec**, job web-tests #121545146934. Tests JS unitaires réussis dans les logs, échec ultérieur du workflow ; diagnostic à terminer sur les journaux complets.
- PR #45 LR-016 : fusionnée dans `main`, SHA fusion `433735821f541b44def5738f48c9691c2984d950`, run #40310468369 **success** ; migration SQL Supabase LoveRoll `ejsrqfpkgwraorrznjpm` appliquée avec réponse `success:true`. Ne pas confondre avec le projet Supabase PUNCH.
- Tentatives LR-044 précédentes : au moins trois runs échoués (#40312849676, #40313945011, #40314967708), corrections de tests historiques déjà commitées ; nouveau cycle après `eb7f9eb` non confirmé.

## Tableau des tâches
| Exigence | État | Preuve / prochaine étape |
|---|---|---|
| LR-016 quota mensuel | Code fusionné ; validation client réelle à confirmer | PR #45 ; migration appliquée ; tests verts |
| LR-044 menu Réglages | En cours, non fusionné | PR #46 ; résoudre conflit, tester navigation et visuels |
| Autres LR-xxx | À reprendre selon `docs/LOVEROLL_SUIVI.md` | Ne pas inventer d'état terminé |

## Règles de validation et d'autonomie
- Un workflow `queued`, `in_progress`, `waiting` ou absent n'est **jamais** un succès.
- Identifier run ID, SHA, étape fautive, cause, correction, tentative et résultat ; mettre à jour ce fichier.
- Conserver les tests et contrôles de sécurité, les données, les rôles et le comportement de production.
- Ne pas fusionner dans `main` sans autorisation explicite ; ne pas créer de boucle de workflows ni exposer de secrets.
- Une session ChatGPT/Work ne peut pas rester exécutée indéfiniment : la reprise dépend de ce document, des Actions indépendantes et des sessions ultérieures.
