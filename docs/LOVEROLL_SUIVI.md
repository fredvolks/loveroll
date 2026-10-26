# LoveRoll — SUIVI OFFICIEL DU PROMPT MAÎTRE
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
| [ ] | LR-001 | D100 Soirée **entier**, proportionné comme Surprise, posé sur le socle, durant toutes les animations | ◐ En cours — vrai canvas WebGL réduit selon largeur et hauteur ; animation en vérification CI, test physique non effectué | [PR nº 21](https://github.com/fredvolks/loveroll/pull/21) · `evening-d100-template-browser-check.cjs` (7 formats mobiles) · [bug initial](./LOVEROLL_PREUVES_VISUELLES.md#lr-001--d100-trop-gros-et-coupé) |
| [ ] | LR-002 | À 00:00, défi avec minuterie **réalisé automatiquement une seule fois** ; annulation/pause/saut exclus | ◐ En cours — validation serveur, reprise après fermeture et tests deux partenaires en cours ; non déployé | [PR nº 9](https://github.com/fredvolks/loveroll/pull/9) · `timed-evening-completion.test.mjs` · `evening-couple-flow-browser-check.cjs` (CI en cours) |
| [ ] | LR-003 | Calendrier et compteurs cohérents : en cours ≠ non réalisé définitif ; cycle/partenaires corrects | ◐ En cours — libellés actifs et correctif des taux mensuels fusionnés dans main ; vérification complète du cycle 200 incomplète | [PR nº 20 fusionnée](https://github.com/fredvolks/loveroll/pull/20) · [PR nº 23](https://github.com/fredvolks/loveroll/pull/23) · `evening-calendar.test.mjs` / `calendar-success-stats.test.mjs` |
| [ ] | LR-004 | Sonnerie des minuteries testée sur PWA Safari/iOS et Android, avec limites OS expliquées | ◐ En cours — sonnerie, préécoute et vibration Android codées (Web 229), tests physiques Safari/Android non effectués | [PR nº 8 fusionnée](https://github.com/fredvolks/loveroll/pull/8) · [PR nº 9](https://github.com/fredvolks/loveroll/pull/9) · `ios-install-sound-v229.test.mjs` |

## P1 — Design de référence Accueil

| OK | ID | Demande | Statut | PR / preuve |
|---|---|---|---|---|
| [ ] | LR-010 | Harmonisation couleurs/boutons/bulles/typographies/logo/navigation de toutes les pages avec Accueil | À faire | — |
| [ ] | LR-011 | Réglage des alignements, titres, cartes statistiques, calendrier, décor et socles | À faire | — |
| [ ] | LR-012 | Cartes de défis : catégorie, personne, consigne, minuterie et actions claires pour un couple | À faire | — |
| [ ] | LR-013 | Catégorie non sélectionnée : incitation visuelle + instruction claire avant de brasser | ◐ En cours — consigne repositionnée et associée au sélecteur, CI et vérification visuelle à effectuer | [PR #24](https://github.com/fredvolks/loveroll/pull/24) · `evening-d100-template.test.mjs` |
| [ ] | LR-014 | Soirée : confirmation de catégorie Sensuel/Sexuel/Au hasard avant lancer D100, option « Ne plus afficher », réactivation en Réglages par profil | À faire — spécification seulement | [Prompt maître LR-014](./LOVEROLL_MASTER_PROMPT.md#lr-014--confirmation-du-choix-de-catégorie-avant-de-brasser-le-d100-nouvelle-demande-du-26-octobre-2026) · Issue à créer · tests à réaliser |

## P1 — Responsive universel

| OK | ID | Demande | Statut | PR / preuve |
|---|---|---|---|---|
| [ ] | LR-020 | Android/S25 Ultra, petit Android, Safari iPhone et PWA : safe areas, pas de débordement | ◐ En cours — calendrier petit écran/zoom scrollable; autres pages et appareils réels non vérifiés | [PR #24](https://github.com/fredvolks/loveroll/pull/24) · `evening-d100-template.test.mjs` |
| [ ] | LR-021 | iPad et tablette Android : portrait/paysage, grilles, calendrier, D100 au socle | À faire | — |
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
| Responsive mobile, tablette, PC | [#15](https://github.com/fredvolks/loveroll/issues/15) | LR-020 à LR-024 |
| Audit et qualité | [#16](https://github.com/fredvolks/loveroll/issues/16) | LR-030 à LR-043 |

### Exécution de l'audit — 26 octobre 2026
L'[audit officiel](./LOVEROLL_AUDIT_UX_UI_20261026.md) est maintenant décomposé en corrections vérifiables dans le [prompt maître](./LOVEROLL_MASTER_PROMPT.md#exécution-des-corrections-de-laudit-du-26-octobre-2026). L'exigence « appliquer toutes les modifications de l'audit » **n'est pas encore entièrement terminée** : les conflits documentaires des trois PR P0 #9, #21 et #23 ont été levés, mais elles attendent la fin du CI et leurs validations restantes, et les tâches LR-010 à LR-012 ainsi que la validation réelle multiplateforme restent ouvertes. La [PR #24](https://github.com/fredvolks/loveroll/pull/24), en brouillon, traite le guidage de catégorie et le calendrier sur petit écran/zoom. **Ne pas fusionner ou publier sur le seul état du document.**

**Publication du système documentaire :** [PR #10 fusionnée](https://github.com/fredvolks/loveroll/pull/10). Les Issues sont ouvertes et les corrections applicatives restent à vérifier/implémenter.

## Tableau de bord
- **22 exigences** dans cette version (4 P0 + 18 P1).
- **0/22 cochées intégralement** : plusieurs corrections vérifiées partiellement, mais les critères complets restent ouverts (voir chaque PR et tests).
- Ces nombres décrivent le **statut documentaire initial**, **pas** un diagnostic que toute l'application est défectueuse.
- Les développeurs doivent vérifier l'existant et marquer « Déjà présent, vérifié » avec preuves si un point est déjà satisfait.

## Journal des modifications

| Date | Changement | Référence |
|---|---|---|
| 2026-10-26 | Initialisation du suivi D100, minuterie, harmonisation, audit UX/UI et responsive PC/tablette/mobile | Prompt maître |
| 2026-10-26 | LR-003 : code audité, correctif de libellés ouvert/clôturé et tests unitaires ajoutés, sans modification de données. À vérifier en CI/visuel. | `fix/lr003-calendar-active-status-20261026` |

| 2026-10-26 | Premier audit professionnel « designer + couple » sur le code et les preuves : constats vs risques séparés, priorités et propositions à valider. Non terminé sans matrice visuelle complète. | [audit initial](./LOVEROLL_AUDIT_UX_UI_20261026.md) |

| 2026-10-26 | Synchronisation P0 du suivi officiel : LR-001 D100 PR 21, LR-002 timer PR 9, LR-003 calendrier PR 20 fusionnée et statistiques PR 23 en CI, LR-004 sonneries Web 229 livrées mais tests physiques non faits. Aucune tâche P0 cochée prématurément. | [PR nº 9](https://github.com/fredvolks/loveroll/pull/9) · [PR nº 20](https://github.com/fredvolks/loveroll/pull/20) · [PR nº 21](https://github.com/fredvolks/loveroll/pull/21) · [PR nº 23](https://github.com/fredvolks/loveroll/pull/23) |

| 2026-10-26 | Intégration des corrections de l'audit au maître ; PR #24 ouverte pour LR-013 et LR-020/023. Tests Node inscrits au CI, captures réelles manquantes ; zéro exigence déclarée terminée. | [PR #24](https://github.com/fredvolks/loveroll/pull/24) · [audit](./LOVEROLL_AUDIT_UX_UI_20261026.md) |

| 2026-10-26 | Nouvelle demande LR-014 : confirmer Sensuel/Sexuel/Au hasard avant de brasser le D100, « Ne plus afficher » par profil, réactivation Réglages. Spécification seulement, **non développée**. | [Prompt LR-014](./LOVEROLL_MASTER_PROMPT.md) |

## Comment travailler avec ChatGPT Work
Ouvrir le dépôt et fournir l'instruction suivante à Work :

> Reprends le projet GitHub fredvolks/loveroll. Lis docs/LOVEROLL_MASTER_PROMPT.md, docs/LOVEROLL_SUIVI.md et docs/LOVEROLL_NOUVELLES_DEMANDES.md, puis le code existant. Trie les nouvelles demandes, travaille par PR et corrige les exigences dans l'ordre P0 puis P1. Après chaque lot, mets à jour le statut, les preuves et la PR dans docs/LOVEROLL_SUIVI.md. Ne coche pas une tâche sans tests. N'efface ni ma demande ni le travail existant. Conserve l'accueil comme référence visuelle.

## Important
Pour suivre le travail en temps réel, utiliser aussi les **GitHub Issues et les Pull Requests** associées aux lots. Un fichier Markdown seul n'est pas actualisé automatiquement par le code ou CI. Ne jamais prétendre qu'une case cochée prouve un déploiement sans vérification du site publié.
