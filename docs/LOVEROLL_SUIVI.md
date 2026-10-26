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
| [ ] | LR-003 | Calendrier et compteurs cohérents : en cours ≠ non réalisé définitif ; cycle/partenaires corrects | ◐ En cours — libellés actifs et correctif des taux mensuels fusionnés dans main ; vérification complète du cycle 200 incomplète | [PR nº 20 fusionnée](https://github.com/fredvolks/loveroll/pull/20) · [PR nº 23 fusionnée](https://github.com/fredvolks/loveroll/pull/23) · `evening-calendar.test.mjs` / `calendar-success-stats.test.mjs` |
| [ ] | LR-004 | Sonnerie des minuteries testée sur PWA Safari/iOS et Android, avec limites OS expliquées | ◐ En cours — sonnerie, préécoute et vibration Android codées (Web 229), tests physiques Safari/Android non effectués | [PR nº 8 fusionnée](https://github.com/fredvolks/loveroll/pull/8) · [PR nº 9](https://github.com/fredvolks/loveroll/pull/9) · `ios-install-sound-v229.test.mjs` |

## P1 — Design de référence Accueil

| OK | ID | Demande | Statut | PR / preuve |
|---|---|---|---|---|
| [ ] | LR-010 | Harmonisation couleurs/boutons/bulles/typographies/logo/navigation de toutes les pages avec Accueil | ◐ En cours — contrôles CI de la PR #26 réussis; jetons verre rubis tablette/PC corrigés, comparaison physique et harmonisation intégrale manquantes | [PR #26](https://github.com/fredvolks/loveroll/pull/26) · `ruby-surfaces-responsive.test.mjs` · `settings-menus-browser-check.cjs` |
| [ ] | LR-011 | Réglage des alignements, titres, cartes statistiques, calendrier, décor et socles | À faire | — |
| [ ] | LR-012 | Cartes de défis : catégorie, personne, consigne, minuterie et actions claires pour un couple | ◐ En cours — consignes longues rendues défilables dans la fiche mobile et accessibles au clavier; autres états et tests physiques restent à valider | [PR #31](https://github.com/fredvolks/loveroll/pull/31) · `evening-instructions.test.mjs` · `evening-instructions-browser-check.cjs` |
| [ ] | LR-013 | Catégorie non sélectionnée : incitation visuelle + instruction claire avant de brasser | ◐ En cours — contrôles CI de la PR #24 réussis; consigne liée au sélecteur, validation physique encore nécessaire | [PR #24](https://github.com/fredvolks/loveroll/pull/24) · `evening-d100-template.test.mjs` |
| [ ] | LR-014 | Soirée : confirmation de catégorie Sensuel/Sexuel/Au hasard avant lancer D100, option « Ne plus afficher », réactivation en Réglages par profil | ◐ En cours — dialogue natif, probabilités actives, blocage avant RPC, préférence utilisateur et tests ajoutés ; migration Supabase, CI final et appareils réels non validés | [PR #34](https://github.com/fredvolks/loveroll/pull/34) · [Issue #27](https://github.com/fredvolks/loveroll/issues/27) · `evening-category-confirm.test.mjs` · `evening-category-confirm-browser-check.cjs` |
| [ ] | LR-015 | Défis : Passer, Refuser avec choix de retrait du lot, repige, retour des défis non terminés à la clôture, historique conservé | À faire — spécification seulement | [Exigence LR-015](./LOVEROLL_MASTER_PROMPT.md#lr-015--défis--passer-refuser-exclusion-volontaire-et-retour-dans-la-pige-nouvelle-demande-du-26-octobre-2026) · [Issue #29](https://github.com/fredvolks/loveroll/issues/29) |
| [ ] | LR-016 | Passes mensuelles : **3 par partenaire** par défaut, limite modifiable par l'admin du couple, blocage serveur à la limite, compteur visible ; refus toujours libre | ◐ En cours — migration Supabase proposée pour plafond atomique, lecture RPC du mois et modification réservée au propriétaire; déploiement SQL, écran Réglages, refus/repige LR-015 et tests DB/physiques restent à faire | [PR #43](https://github.com/fredvolks/loveroll/pull/43) · `monthly-pass-limit-sql.test.mjs` · [Issue #32](https://github.com/fredvolks/loveroll/issues/32) |
| [ ] | LR-017 | Adapter ce défi avec accord des deux, sans passer/refuser ni modifier les cartes globales | À faire — spécification approuvée, aucun code livré | [Prompt LR-017](./LOVEROLL_MASTER_PROMPT.md) · [Issue #35](https://github.com/fredvolks/loveroll/issues/35) |
| [ ] | LR-018 | Reprendre une soirée sur appareil mobile/tablette/PC, étapes et minuterie persistantes | À faire — spécification approuvée, aucun code livré | [Prompt LR-018](./LOVEROLL_MASTER_PROMPT.md) · [Issue #36](https://github.com/fredvolks/loveroll/issues/36) |
| [ ] | LR-019 | ♥ Coups de cœur : favoris accessibles et remis dans la pige d'une prochaine soirée même réalisés, jamais immédiatement | À faire — spécification approuvée, aucun code livré | [Prompt LR-019](./LOVEROLL_MASTER_PROMPT.md) · [Issue #37](https://github.com/fredvolks/loveroll/issues/37) |
| [ ] | LR-025 | Mode discrétion pour masquer les défis rapidement sans modifier leur état | ◐ En cours — masquage visuel local avec bouton dans Soirée et cartes privées, restauration après rechargement et blocage du clavier derrière le masque ; CI/visuels appareils et confidentialité Push/audio restent à valider | [PR #44](https://github.com/fredvolks/loveroll/pull/44) · `privacy-screen.test.mjs` · `privacy-screen-browser-check.cjs` · [Issue #38](https://github.com/fredvolks/loveroll/issues/38) |
| [ ] | LR-026 | Variété intelligente : limiter les défis ressemblants dans la même soirée | À faire — spécification approuvée, aucun code livré | [Prompt LR-026](./LOVEROLL_MASTER_PROMPT.md) · [Issue #39](https://github.com/fredvolks/loveroll/issues/39) |
| [ ] | LR-027 | Une seule action principale par étape, tous les boutons secondaires restent accessibles | À faire — spécification approuvée, aucun code livré | [Prompt LR-027](./LOVEROLL_MASTER_PROMPT.md) · [Issue #40](https://github.com/fredvolks/loveroll/issues/40) |
| [ ] | LR-028 | « As-tu envie de jouer ce soir ? » : invitation Push/in-app Oui/Non/Peut-être avant les deux D6 | À faire — spécification approuvée, aucun code livré | [Prompt LR-028](./LOVEROLL_MASTER_PROMPT.md) · [Issue #41](https://github.com/fredvolks/loveroll/issues/41) |

## P1 — Responsive universel

| OK | ID | Demande | Statut | PR / preuve |
|---|---|---|---|---|
| [ ] | LR-020 | Android/S25 Ultra, petit Android, Safari iPhone et PWA : safe areas, pas de débordement | ◐ En cours — CI PR #24 réussie pour calendrier/hauteur Réglages; autres pages et appareils réels non vérifiés | [PR #24](https://github.com/fredvolks/loveroll/pull/24) · `settings-short-height-browser-check.cjs` · `evening-d100-template.test.mjs` |
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
| Confirmation de la catégorie D100 | [#27](https://github.com/fredvolks/loveroll/issues/27) | LR-014 |
| Passer / Refuser / repige des défis | [#29](https://github.com/fredvolks/loveroll/issues/29) | LR-015 |
| Plafond mensuel Passer configurable | [#32](https://github.com/fredvolks/loveroll/issues/32) | LR-016 |
| Responsive mobile, tablette, PC | [#15](https://github.com/fredvolks/loveroll/issues/15) | LR-020 à LR-024 |
| Audit et qualité | [#16](https://github.com/fredvolks/loveroll/issues/16) | LR-030 à LR-043 |

### Exécution de l'audit — 26 octobre 2026
L'[audit officiel](./LOVEROLL_AUDIT_UX_UI_20261026.md) est maintenant décomposé en corrections vérifiables dans le [prompt maître](./LOVEROLL_MASTER_PROMPT.md#exécution-des-corrections-de-laudit-du-26-octobre-2026). L'exigence « appliquer toutes les modifications de l'audit » **n'est pas encore entièrement terminée** : la PR P0 #23 sur les taux mensuels est fusionnée; les PR #9 et #21 restent à valider sur leurs branches respectives, et les tâches LR-010 à LR-012 (dont LR-010 désormais en cours sur PC/tablette) ainsi que la validation réelle multiplateforme restent ouvertes. La [PR #24](https://github.com/fredvolks/loveroll/pull/24), en brouillon, traite le guidage de catégorie et le calendrier sur petit écran/zoom. **Ne pas fusionner ou publier sur le seul état du document.**

**Publication du système documentaire :** [PR #10 fusionnée](https://github.com/fredvolks/loveroll/pull/10). Les Issues sont ouvertes et les corrections applicatives restent à vérifier/implémenter.

## Tableau de bord
- **31 exigences** dans cette version (4 P0 + 27 P1).
- **0/31 cochées intégralement** : plusieurs corrections vérifiées partiellement, mais les critères complets restent ouverts (voir chaque PR et tests).
- Ces nombres décrivent le **statut documentaire initial**, **pas** un diagnostic que toute l'application est défectueuse.
- Les développeurs doivent vérifier l'existant et marquer « Déjà présent, vérifié » avec preuves si un point est déjà satisfait.

## Journal des modifications

| Date | Changement | Référence |
|---|---|---|
| 2026-10-26 | Prompt maître consolidé : reprise LR-014 à LR-019 et LR-025 à LR-028, ordre d'exécution et PR #31/#34/#43/#44 avec CI validés ; déploiements et validations physiques non déclarés terminés. | [Commit 6ba26bc](https://github.com/fredvolks/loveroll/commit/6ba26bc3c4811ae0bb008ad7f124f383b44ee9d8) |
| 2026-10-26 | Initialisation du suivi D100, minuterie, harmonisation, audit UX/UI et responsive PC/tablette/mobile | Prompt maître |
| 2026-10-26 | LR-003 : code audité, correctif de libellés ouvert/clôturé et tests unitaires ajoutés, sans modification de données. À vérifier en CI/visuel. | `fix/lr003-calendar-active-status-20261026` |

| 2026-10-26 | Premier audit professionnel « designer + couple » sur le code et les preuves : constats vs risques séparés, priorités et propositions à valider. Non terminé sans matrice visuelle complète. | [audit initial](./LOVEROLL_AUDIT_UX_UI_20261026.md) |

| 2026-10-26 | Synchronisation P0 du suivi officiel : LR-001 D100 PR 21, LR-002 timer PR 9, LR-003 calendrier PR 20 fusionnée et statistiques PR 23 en CI, LR-004 sonneries Web 229 livrées mais tests physiques non faits. Aucune tâche P0 cochée prématurément. | [PR nº 9](https://github.com/fredvolks/loveroll/pull/9) · [PR nº 20](https://github.com/fredvolks/loveroll/pull/20) · [PR nº 21](https://github.com/fredvolks/loveroll/pull/21) · [PR nº 23](https://github.com/fredvolks/loveroll/pull/23) |

| 2026-10-26 | Intégration des corrections de l'audit au maître ; PR #24 ouverte pour LR-013 et LR-020/023. Tests Node inscrits au CI, captures réelles manquantes ; zéro exigence déclarée terminée. | [PR #24](https://github.com/fredvolks/loveroll/pull/24) · [audit](./LOVEROLL_AUDIT_UX_UI_20261026.md) |
| 2026-10-26 | LR-010 : surfaces rubis de l'Accueil harmonisées sur tablette/PC par jetons CSS globaux (Réglages), tests Node et Chromium ajoutés. LR-020 : formulaire Réglages accessible sur hauteur fortement réduite; tests Chromium ajoutés. CI et appareils réels à valider. | [PR #26](https://github.com/fredvolks/loveroll/pull/26) · [PR #24](https://github.com/fredvolks/loveroll/pull/24) |

| 2026-10-26 | Nouvelle demande LR-014 : confirmer Sensuel/Sexuel/Au hasard avant de brasser le D100, « Ne plus afficher » par profil, réactivation Réglages. Spécification seulement, **non développée**. | [Prompt LR-014](./LOVEROLL_MASTER_PROMPT.md) |

| 2026-10-26 | Nouvelle demande LR-015 : Passer / Refuser un défi, choix de l'exclure du lot courant, repige et restitution des non réalisés à la fin de la soirée, historique et cycle de 200 préservés. **Demande non codée.** | [Prompt LR-015](./LOVEROLL_MASTER_PROMPT.md) |

| 2026-10-26 | LR-016 : plafond mensuel sécurisé en migration SQL dans PR #43 (non déployée), lecture RPC personnelle et réglage RPC admin ; UI/refus/repige et tests PostgreSQL simultanés manquants. | [PR #43](https://github.com/fredvolks/loveroll/pull/43) · [Prompt LR-016](./LOVEROLL_MASTER_PROMPT.md) |

## Issues de développement — nouveautés approuvées

| Exigence | Issue |
|---|---|
| LR-017 — Adapter | [#35](https://github.com/fredvolks/loveroll/issues/35) |
| LR-018 — Reprendre | [#36](https://github.com/fredvolks/loveroll/issues/36) |
| LR-019 — Coups de cœur | [#37](https://github.com/fredvolks/loveroll/issues/37) |
| LR-025 — Discrétion | [#38](https://github.com/fredvolks/loveroll/issues/38) |
| LR-026 — Variété | [#39](https://github.com/fredvolks/loveroll/issues/39) |
| LR-027 — Action principale | [#40](https://github.com/fredvolks/loveroll/issues/40) |
| LR-028 — Invitation à jouer | [#41](https://github.com/fredvolks/loveroll/issues/41) |

## Propositions UX/UI

La [revue rapide de code](./LOVEROLL_PROPOSITIONS_AMELIORATIONS_20261026.md) reste disponible ; les idées 3 à 8 du dernier échange et l'invitation à jouer sont maintenant **approuvées sous LR-017 à LR-019, LR-025 à LR-028**. Les autres idées demeurent des propositions non approuvées.

| 2026-10-26 | Ajout approuvé LR-017 à LR-019 et LR-025 à LR-028 : Adapter, Reprendre, Coups de cœur retournant à la pige, Discrétion, Variété, Action principale, invitation Oui/Non/Peut-être au D6. Documentation seulement. | [Prompt maître](./LOVEROLL_MASTER_PROMPT.md) |

## Comment travailler avec ChatGPT Work
Ouvrir le dépôt et fournir l'instruction suivante à Work :

> Reprends le projet GitHub fredvolks/loveroll. Lis docs/LOVEROLL_MASTER_PROMPT.md, docs/LOVEROLL_SUIVI.md et docs/LOVEROLL_NOUVELLES_DEMANDES.md, puis le code existant. Trie les nouvelles demandes, travaille par PR et corrige les exigences dans l'ordre P0 puis P1. Après chaque lot, mets à jour le statut, les preuves et la PR dans docs/LOVEROLL_SUIVI.md. Ne coche pas une tâche sans tests. N'efface ni ma demande ni le travail existant. Conserve l'accueil comme référence visuelle.

## Important
Pour suivre le travail en temps réel, utiliser aussi les **GitHub Issues et les Pull Requests** associées aux lots. Un fichier Markdown seul n'est pas actualisé automatiquement par le code ou CI. Ne jamais prétendre qu'une case cochée prouve un déploiement sans vérification du site publié.

## LR-045 — Soirée Extra

| [ ] | LR-045 | Soirées Extra **illimitées** quand les dés hebdomadaires sont épuisés : même bouton Brasser le dé ; proposition Accepter/Refuser ; D6 de chaque partenaire pour le nombre de défis, puis D100 ; toutes les cartes éligibles remises dans la pige de **chaque Extra** sans toucher au cycle normal ; option ON/OFF réservée à l'admin du couple ; historique et synchro intacts | **Spécification approuvée seulement — code, tests et déploiement non réalisés** | [Exigence LR-045](./LOVEROLL_MASTER_PROMPT.md#lr-045--soirée-extra-illimitée-après-épuisement-des-dés-hebdomadaires-demande-approuvée-le-26-octobre-2026) |

