# LoveRoll — Registre de livraison progressive (2 novembre 2026)

**But :** publier les lots validés, conserver les données réelles et arrêter de compter plusieurs PR historiques comme des fonctionnalités différentes.

Ce document est un état de triage, **pas une autorisation de déployer une migration ou un certificat Android**. Une fusion ou un lancement Supabase exige un contrôle sur le SHA courant, une recette de permissions, puis la preuve du workflow et de la version réellement publiée. Pour GitHub Pages, le workflow `.github/workflows/deploy-couple-web.yml` se déclenche sur les modifications `couple-web/**` dans `main`; les tests et contrôles du site public doivent réussir.

## 1. Lots à livrer dans cet ordre

| Ordre | PR | Situation / règle |
| --- | --- | --- |
| Livré dans `main` | [#183](https://github.com/fredvolks/loveroll/pull/183) — reprise et progression D6 | Squash `15e524b`; 3 workflows PR réussis avant fusion. **Pages à vérifier séparément**, une fusion n'est pas une preuve de publication. |
| Suivant | [#185](https://github.com/fredvolks/loveroll/pull/185) — Accueil | Web 267 préparé, CTA Soirée non-mutant, statut Surprise, vue « Notre soirée », tests révisés; fusion après **tous** les contrôles du dernier SHA, dont navigateur et UI. |
| Puis sécurité | [#131](https://github.com/fredvolks/loveroll/pull/131) — invitations ancien duo | Branche ancienne divergente. Rebaser/réconcilier sur `main`, tester ACL + A/B, appliquer migration avant frontend dépendant. |
| Puis lots progressifs | [#184](https://github.com/fredvolks/loveroll/pull/184) — Surprise / Geoapify | Large PR (37 fichiers; migrations pour retries, rayon, budget, date, photos). Ne pas fusionner en bloc tant que les tests browser et la revue SQL/RLS A/B ne sont pas verts. Prévoir lots serveur/migrations compatibles puis Web/PWA. |
| Ensuite | [#68](https://github.com/fredvolks/loveroll/pull/68), [#43](https://github.com/fredvolks/loveroll/pull/43) | Passer/refuser, quotas; réconcilier contrats SQL déjà en place et non écraser les textes des cartes. |
| Ensuite | [#135](https://github.com/fredvolks/loveroll/pull/135), [#106](https://github.com/fredvolks/loveroll/pull/106), [#176](https://github.com/fredvolks/loveroll/pull/176) | Adapter défi, 5 favoris **communs**, variété D100. Intégrer en chaîne sur le dernier `main` pour éviter les variantes incompatibles. |
| Plus gros lots | [#107](https://github.com/fredvolks/loveroll/pull/107), [#97](https://github.com/fredvolks/loveroll/pull/97) | Éclat V2 et Studio deux comptes; dépendances Supabase, consentement, droits Premium, recettes réelles. |
| Isolés | [#91](https://github.com/fredvolks/loveroll/pull/91), [#46](https://github.com/fredvolks/loveroll/pull/46) | Android nouvelle signature (installation propre) et Réglages UX, tests propres à chaque support. |

## 2. PR anciennes / concurrentes : NE PAS fusionner toutes

- **Adaptation LR-017** : comparer [#121](https://github.com/fredvolks/loveroll/pull/121) à [#135](https://github.com/fredvolks/loveroll/pull/135). Une seule version finale; conserver les détails uniques et l'accord explicite du partenaire.
- **Favoris LR-019** : [#56](https://github.com/fredvolks/loveroll/pull/56), [#57](https://github.com/fredvolks/loveroll/pull/57), [#58](https://github.com/fredvolks/loveroll/pull/58), [#60](https://github.com/fredvolks/loveroll/pull/60) et [#106](https://github.com/fredvolks/loveroll/pull/106). La règle approuvée est **5 favoris communs au duo**, pas 5 personnels chacun. Ne pas fusionner une ancienne variante incompatible.
- **Variété LR-026** : [#125](https://github.com/fredvolks/loveroll/pull/125) et [#176](https://github.com/fredvolks/loveroll/pull/176); choisir un seul mécanisme serveur, sans modifier les chances ou l'admissibilité D100.
- **Éclat V2** : [#92](https://github.com/fredvolks/loveroll/pull/92) et [#107](https://github.com/fredvolks/loveroll/pull/107); retenir uniquement la version rebasée testée contre le `main` actuel.
- **Anciennes PWA/correctifs** : [#9](https://github.com/fredvolks/loveroll/pull/9), [#17](https://github.com/fredvolks/loveroll/pull/17), [#24](https://github.com/fredvolks/loveroll/pull/24); comparer les fichiers à `main` avant toute fermeture ou fusion pour ne pas perdre une correction originale.

## 3. Critères de sortie d'un lot

1. Diff vérifié contre le `main` actuel; aucune PR concurrente incompatible.
2. Tests isolés et toutes vérifications obligatoires réussies **sur le SHA final**; refus des suites rouge/annulées comme preuve.
3. Pour SQL/Storage/Edge : identités et rôles réels, RLS, compatibilité API, migration réversible ou plan de récupération, environnement isolé A/B avant production. Aucun appel externe payant involontaire.
4. Fusion protégée avec `expected_head_sha`; workflow GitHub Pages terminé, version `web-version.json` et cache service worker à jour, site public vérifié avant d'annoncer « déployé ».
5. Fermer les PR remplacées **après** intégration de leur code utile et conservation de la traçabilité; ne pas supprimer les branches sans raison.
