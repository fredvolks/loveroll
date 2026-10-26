# LoveRoll — SUIVI OFFICIEL DU PROMPT MAÎTRE
> Dernière initialisation : 2026-10-26. Toutes les cases sont **non cochées par défaut**, car aucune correction technique n'a été vérifiée dans le cadre de ce travail documentaire.

**Source des exigences :** [LOVEROLL_MASTER_PROMPT.md](./LOVEROLL_MASTER_PROMPT.md) · **Ajouter une idée :** [LOVEROLL_NOUVELLES_DEMANDES.md](./LOVEROLL_NOUVELLES_DEMANDES.md) · **Issues :** https://github.com/fredvolks/loveroll/issues

## Légende
- ☐ À faire ; ◐ En cours (l'indiquer dans la colonne Statut) ; ☑ Terminé **seulement après tests** ; ⚠ Bloqué ; 📝 Proposition à valider.
- Conserver les **identifiants LR-xxx** même lors d'un déplacement de priorité.
- Lors d'une correction : renseigner **PR / commit / test / capture** et date. Ne jamais cocher sans preuve.
- Le présent fichier est éditable directement dans GitHub ; ses mises à jour doivent demeurer versionnées.

## P0 — Bugs prioritaires

| OK | ID | Demande / preuve d'acceptation | Statut | PR / preuve |
|---|---|---|---|---|
| [ ] | LR-001 | D100 Soirée **entier**, proportionné comme Surprise, posé sur le socle, durant toutes les animations | À faire | — |
| [ ] | LR-002 | À 00:00, défi avec minuterie **réalisé automatiquement une seule fois** ; annulation/pause/saut exclus | À faire | — |
| [ ] | LR-003 | Calendrier et compteurs cohérents : en cours ≠ non réalisé définitif ; cycle/partenaires corrects | À faire | — |
| [ ] | LR-004 | Sonnerie des minuteries testée sur PWA Safari/iOS et Android, avec limites OS expliquées | À faire | — |

## P1 — Design de référence Accueil

| OK | ID | Demande | Statut | PR / preuve |
|---|---|---|---|---|
| [ ] | LR-010 | Harmonisation couleurs/boutons/bulles/typographies/logo/navigation de toutes les pages avec Accueil | À faire | — |
| [ ] | LR-011 | Réglage des alignements, titres, cartes statistiques, calendrier, décor et socles | À faire | — |
| [ ] | LR-012 | Cartes de défis : catégorie, personne, consigne, minuterie et actions claires pour un couple | À faire | — |
| [ ] | LR-013 | Catégorie non sélectionnée : incitation visuelle + instruction claire avant de brasser | À faire | — |

## P1 — Responsive universel

| OK | ID | Demande | Statut | PR / preuve |
|---|---|---|---|---|
| [ ] | LR-020 | Android/S25 Ultra, petit Android, Safari iPhone et PWA : safe areas, pas de débordement | À faire | — |
| [ ] | LR-021 | iPad et tablette Android : portrait/paysage, grilles, calendrier, D100 au socle | À faire | — |
| [ ] | LR-022 | PC/Mac : Chrome, Edge, Firefox, Safari ; 1280 à 2560 px et fenêtrage | À faire | — |
| [ ] | LR-023 | Breakpoints et hauteur utile, accessibilité/zoom, taille/caméra des dés 3D | À faire | — |
| [ ] | LR-024 | Navigation sur mobile/tablette/PC adaptée, sans surprendre les utilisateurs | À faire | — |

## P1 — Audit designer + couple

| OK | ID | Demande | Statut | PR / preuve |
|---|---|---|---|---|
| [ ] | LR-030 | Audit de **chaque page et état** (Accueil, Soirée, Défis, Éclat, Surprise, Avent, calendrier, réglages, admin, connexion) | À faire | — |
| [ ] | LR-031 | Rapport direction artistique : constat, impact, correction, priorité, effort, captures | À faire | — |
| [ ] | LR-032 | Rapport « couple » : clarté, enchaînement, ambiance, incompréhensions, clics | À faire | — |
| [ ] | LR-033 | Suggestions majeures proposées avant refonte du parcours / règles de jeu | À faire | — |

## P1 — Validation et livraison

| OK | ID | Demande | Statut | PR / preuve |
|---|---|---|---|---|
| [ ] | LR-040 | Tests logique/3D/sonneries/timers/calendrier/200 défis/idempotence | À faire | — |
| [ ] | LR-041 | Captures avant/après et matrice tests Android, iPhone, tablette portrait/paysage, PC | À faire | — |
| [ ] | LR-042 | Compte rendu réel, tests exécutés, traçabilité par LR-xxx, recommandations | À faire | — |
| [ ] | LR-043 | Pas de perte de données, de secrets ou de régression Premium ; déploiement contrôlé | À faire | — |

## Tableau de bord
- **21 exigences** dans cette version (4 P0 + 17 P1).
- **0/21 démontrées comme terminées dans le cadre de ce suivi initial.**
- Ces nombres décrivent le **statut documentaire initial**, **pas** un diagnostic que toute l'application est défectueuse.
- Les développeurs doivent vérifier l'existant et marquer « Déjà présent, vérifié » avec preuves si un point est déjà satisfait.

## Journal des modifications

| Date | Changement | Référence |
|---|---|---|
| 2026-10-26 | Initialisation du suivi D100, minuterie, harmonisation, audit UX/UI et responsive PC/tablette/mobile | Prompt maître |

## Comment travailler avec ChatGPT Work
Ouvrir le dépôt et fournir l'instruction suivante à Work :

> Reprends le projet GitHub fredvolks/loveroll. Lis docs/LOVEROLL_MASTER_PROMPT.md, docs/LOVEROLL_SUIVI.md et docs/LOVEROLL_NOUVELLES_DEMANDES.md, puis le code existant. Trie les nouvelles demandes, travaille par PR et corrige les exigences dans l'ordre P0 puis P1. Après chaque lot, mets à jour le statut, les preuves et la PR dans docs/LOVEROLL_SUIVI.md. Ne coche pas une tâche sans tests. N'efface ni ma demande ni le travail existant. Conserve l'accueil comme référence visuelle.

## Important
Pour suivre le travail en temps réel, utiliser aussi les **GitHub Issues et les Pull Requests** associées aux lots. Un fichier Markdown seul n'est pas actualisé automatiquement par le code ou CI. Ne jamais prétendre qu'une case cochée prouve un déploiement sans vérification du site publié.
