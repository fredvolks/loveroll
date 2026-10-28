# LoveRoll — accélération sûre du CI des dés WebGL

**Objectif :** réduire la durée totale des vérifications visuelles sans supprimer de
test ni faire passer une PR dont un test aurait échoué.

Le workflow `.github/workflows/couple-web-check.yml` conserve les groupes
`entry` et `experience`, mais répartit les **12 vérifications de dés existantes**
dans trois nouveaux groupes parallèles :

| Groupe | Vérifications conservées |
| --- | --- |
| `dice-core` | Géométrie D100 compacte, informations D100 desktop (Web 251), confirmation LR-014, Soirée étape 1, consignes complètes, stabilité WebGL en changeant de catégorie |
| `dice-stage` | Image HD unique iPad, maillage D100 Soirée/Surprise, parcours réel à deux, sept dimensions de D100/socle |
| `dice-faces` | Interaction tactile D6, toutes les faces D6 et exemples de gravures D100, dé hebdomadaire 3D sur iPad |

Les preuves photographiques iPad sont récupérées dans le groupe
`dice-stage`, avec `if: always()` pour conserver les captures même en cas
d'échec. Les artefacts de chaque groupe portent un nom différent.

## Barrières inchangées

- `fail-fast: false` : les autres groupes ne sont pas abandonnés lorsqu'un
  groupe échoue; les résultats restants restent exploitables.
- `web-tests` dépend toujours de `changes`, `static-tests` et de **toute**
  la matrice `browser-tests`.
- La réussite exige `BROWSER_RESULT=success` pour tous les groupes.
  Un échec, une annulation ou un groupe non exécuté ne devient pas un succès.
- Le test `couple-web/ci-dice-parallel-contract.test.mjs`, inclus aux tests
  statiques, empêche la disparition silencieuse d'une des 12 étapes officielles.
- Les exigences de tests Android, iPhone, iPad, PC et 3D restent en vigueur;
  ce changement ne prétend pas remplacer la recette sur appareils physiques.

Il s'agit d'une **optimisation de durée d'exécution**, pas d'une baisse de
couverture ni d'un relâchement des règles de mise en production. Le coût en
minutes GitHub peut varier selon l'usage de ressources parallèles.
