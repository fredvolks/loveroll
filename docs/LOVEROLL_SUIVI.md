# LoveRoll — SUIVI OFFICIEL DU PROMPT MAÎTRE

## Livraisons vérifiées — parité iPad / confirmation D100 (27 octobre 2026)

- **Web 237 — iPad/Android :** [PR #72 fusionnée](https://github.com/fredvolks/loveroll/pull/72), commit `735f31718d9151785bbf24f6551ef3148ce2db39`; image HD Android `loveroll-home-portrait-v202.webp` commune à Accueil et Soirée iPad, un seul socle photographié, vrais D6/D100 WebGL, tests portrait et paysage et captures Chromium. [GitHub Pages : succès avec contrôle du site réellement publié](https://github.com/fredvolks/loveroll/actions/runs/40495972734). Aucun essai physique iPad n'a été effectué dans cette livraison.
- **Web 238 — confirmation D100 :** [PR #75 fusionnée](https://github.com/fredvolks/loveroll/pull/75), commit `6bab625e0325bc33a44939ddb889e78da5bd455f`; dialogue de catégorie et préférence personnelle (LR-014) ; [CI complète : succès](https://github.com/fredvolks/loveroll/actions/runs/40496466211). Supabase officiel `ejsrqfpkgwraorrznjpm` : colonne de profil `confirm_evening_category boolean NOT NULL DEFAULT true` présente ; protection RLS personnelle conservée. [Pages Web 238 : publication et contrôle public réussis](https://github.com/fredvolks/loveroll/actions/runs/40497701367). Vérification physique sur les appareils des deux partenaires encore nécessaire.
- **Statuts distincts :** les tests Chromium et la réussite de Pages ne prouvent pas la vérification physique iPad/Android ; ne pas cocher « 100 % terminé » sans cet essai.

## Livraison confirmée — LR-015 / Web 234 (26 octobre 2026, Québec)

- **État : code, SQL et déploiement Web terminés ; essais physiques des deux partenaires encore à faire.**
- **Code :** [PR #54 fusionnée](https://github.com/fredvolks/loveroll/pull/54) dans `main`, commit `b529f7d0d271bd69838125a0410a720c3445001f`. Refonte Passer / Refuser / Repiger, repige atomique, exclusion/réintégration des cartes, retour des défis non terminés et compteurs/historique.
- **Supabase officiel LoveRoll :** `ejsrqfpkgwraorrznjpm`. Migrations appliquées et confirmées : `lr015_recycle_incomplete_on_close` (20261026235938), `lr015_cycle_exclusion_registry` (20261026235959), `lr015_atomic_respond_redraw` (20261027000020). Contrôle post-installation des fonctions, RLS et droits authenticated/anon réussi ; aucun statut de défi existant invalide détecté.
- **Validation SQL :** [PostgreSQL 17 isolé, concurrence, refus, quota, accès inter-couples](https://github.com/fredvolks/loveroll/actions/runs/40394905331) : **success** sur les migrations SQL exactes. Pas de test physique sur comptes LoveRoll réels.
- **Code intégré :** [39 étapes PR réussies](https://github.com/fredvolks/loveroll/actions/runs/40425919579) sur `fa374a906afeb6ee7dd88863398de499df4e55c1` ; [39 étapes main réussies](https://github.com/fredvolks/loveroll/actions/runs/40428253040) sur le merge `b529f7d0`.
- **GitHub Pages :** [déploiement + diagnostic production réussis](https://github.com/fredvolks/loveroll/actions/runs/40428252902). Test HTTP réel : code **200**, `app.js?v=20261026-web234`, **276597 octets**, SHA256 servi identique au fichier local `85e10159bcd12aa34f40199f5f295bc50fe72da0e9cf31edbc487cdbbec0f009`, syntaxe OK ; rendu Chromium `ready:true`, `PRODUCTION_LOGS []`, `CDP_PARSE []`. URL : https://fredvolks.github.io/loveroll/
- **Reste à essayer physiquement :** deux comptes partenaires simultanés sur iPhone/Android/tablette, passe jusqu'au quota, refus avec et sans exclusion, restauration, soirée close puis reprise/historique, cache PWA de chacun. Ne pas confondre test automatique et recette physique.

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
| [ ] | LR-001 | D100 Soirée **entier**, proportionné comme Surprise, posé sur le socle, durant toutes les animations | ◐ Web 237 : D6/D100 sur photo HD et socle unique ; tests Chromium iPad portrait/paysage + 7 mobiles réussis, essai physique non réalisé | [PR #72 fusionnée](https://github.com/fredvolks/loveroll/pull/72) · [Pages Web237](https://github.com/fredvolks/loveroll/actions/runs/40495972734) · `ipad-romance-scene-browser-check.cjs` |
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
| [ ] | LR-014 | Soirée : confirmation de catégorie Sensuel/Sexuel/Au hasard avant lancer D100, option « Ne plus afficher », réactivation en Réglages par profil | ◐ Code et migration Supabase intégrés, tests automatiques complets réussis ; Pages Web238 publié et vérifié par Chromium ; essais physiques manquants | [PR #75 fusionnée](https://github.com/fredvolks/loveroll/pull/75) · [CI 40496466211](https://github.com/fredvolks/loveroll/actions/runs/40496466211) · [Pages 40497701367](https://github.com/fredvolks/loveroll/actions/runs/40497701367) |
| [ ] | LR-015 | Défis : Passer, Refuser avec choix de retrait du lot, repige, retour des défis non terminés à la clôture, historique conservé | ◐ **Publié Web 234** : migrations installées, GitHub Pages et tests automatiques réussis ; recette physique à deux partenaires restante | [PR #54 fusionnée](https://github.com/fredvolks/loveroll/pull/54) · [SQL](https://github.com/fredvolks/loveroll/actions/runs/40394905331) · [CI main](https://github.com/fredvolks/loveroll/actions/runs/40428253040) · [Pages + diagnostic public](https://github.com/fredvolks/loveroll/actions/runs/40428252902) |
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
| [ ] | LR-021 | iPad et tablette Android : portrait/paysage, grilles, calendrier, D100 au socle | ◐ Scènes Accueil/Soirée iPad vérifiées par navigateur aux deux orientations ; essai appareil réel et calendrier complet tablette restent à valider | [PR #72 fusionnée](https://github.com/fredvolks/loveroll/pull/72) · `ipad-romance-scene-browser-check.cjs` · [Pages Web237](https://github.com/fredvolks/loveroll/actions/runs/40495972734) |
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
- **36 exigences identifiées** : les 31 LR numériques existantes, LR-SURPRISE-001, LR-ACCUEIL-001, LR-JEU-001, LR-MUSIQUE-001 et LR-PIGE-001. Ce total ne mesure pas la proportion de code livrée.
- **Bilan historique initial : 0/31 cochées intégralement.** Ne pas employer ce chiffre comme avancement actuel; consulter les lignes de statut et les preuves. Les deux nouvelles exigences sont spécifiées, sans livraison applicative déclarée.
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


## Surprise premium — demande approuvée du 26 octobre 2026

| Exigence | État | Preuve / prochaine étape |
|---|---|---|
| LR-SURPRISE-001 — D100, Geoapify, parcours premium et filtres facultatifs | À implémenter — documentation ajoutée uniquement | [Prompt officiel](./LOVEROLL_MASTER_PROMPT.md#lr-surprise-001--rendez-vous-surprise-premium-d100-et-geoapify). Budget et km vides = tous les budgets et toutes les distances, sans préférence luxe : mini-putt autant que sortie à 300 $. Corriger d'abord les trajets null, les pannes terminales et les états pending; puis livrer préférences, adaptation et planification avec tests et preuves visuelles. |

Aucun changement de tarifs ni déploiement applicatif n'est réalisé par cet ajout documentaire.


## Accueil / Soirée — demande approuvée du 26 octobre 2026

| Exigence | État | Preuve / prochaine étape |
|---|---|---|
| LR-ACCUEIL-001 — Accueil synthétique, Soirée pour jouer | Spécifié — à implémenter et vérifier | [Prompt officiel](./LOVEROLL_MASTER_PROMPT.md#lr-accueil-001--accueil-vue-densemble-et-raccourcis-soirée-parcours-de-jeu). Conserver D6 hebdomadaire/décor, afficher le quota réel et un raccourci vers Soirée; statut compact au lieu du tableau détaillé; carte Surprise/Éclat et bilan collectif. Aucune création de session ou lancer par simple navigation. |

### Revue de structure du prompt maître — 26 octobre 2026
- Ajout d'un guide en tête : rôle des documents, périmètre des onglets, ordre courant unique et suivi CI jusqu'à résultat final.
- Clarification des propositions déjà approuvées, du statut documentaire LR-014 et du statut historique des notes de PR.
- Les anciens ordres restent conservés comme contexte historique; le guide donne l'ordre courant.
- Les 31 exigences initiales sont conservées, avec les deux ajouts Accueil et Surprise. Le compteur initial 0/31 n'est plus présenté comme un avancement en temps réel.
- Audit documentaire uniquement : aucun état actuel de PR, CI, base ou déploiement n'a été certifié par cette revue.



## Défis existants et ambiance musicale — 26 octobre 2026

| Exigence | État | Prochaine étape |
|---|---|---|
| LR-JEU-001 — Préserver les textes, corriger attribution/progression et fiabiliser le jeu | Spécifié — à implémenter et vérifier | Inventaire/empreintes des textes et durées; correction des rôles self_draws; identité de carte distincte du D100; terminer refus/passes/favoris et import sans écrasement. [Prompt](./LOVEROLL_MASTER_PROMPT.md#lr-jeu-001--fiabiliser-les-défis-existants-sans-modifier-leurs-textes) |
| LR-MUSIQUE-001 — Musique facultative adaptée à chaque carte et au minuteur | Spécifié — à implémenter et vérifier | Métadonnées par carte, pistes originales/licenciées, démarrer/pause/reprise/reset, mute et volume indépendants du temps. Fondu des 5 dernières secondes jusqu'au silence à zéro : la musique remplace alors la sonnerie, sans double signal. Sans musique, sonnerie facultative; aucun son de remplacement après mute volontaire. [Prompt](./LOVEROLL_MASTER_PROMPT.md#lr-musique-001--ambiance-musicale-facultative-par-carte-liée-au-minuteur) |

**Verrou utilisateur :** titres, consignes et minuteries configurées des cartes conservés; l'attribution peut être corrigée. L'ajout des prompts ne constitue ni une modification des cartes ni un déploiement musical.


## Précision LR-019 — cinq favoris communs maximum (26 octobre 2026)
**État : spécification approuvée, à implémenter et vérifier.** [Prompt LR-019](./LOVEROLL_MASTER_PROMPT.md#lr-019--coups-de-cœur--un-favori-retourne-dans-la-pige-idée-no-5).
- Une liste commune de 5 cartes distinctes toutes catégories confondues; gestion par chacun des partenaires dans Réglages → Jeu → Nos coups de cœur.
- Ajout depuis ses anciens défis et ceux du partenaire, après clôture via le calendrier; aucune ouverture des cartes encore privées d'une soirée active.
- Au sixième ajout : notification dans l'app, choix du favori à retirer/remplacer, confirmation; remplacement atomique, compteur synchronisé et plafond serveur.
- Aucun favori ne garantit la pige, la personne qui accomplit ou reçoit le défi; probabilités, rôles femme/homme, exclusions et cycle conservés.
- Vérifier concurrence, doublons, remplacement/annulation/échec et listes existantes de plus de 5 sans suppression arbitraire.
Ajout documentaire uniquement : aucune carte ni donnée utilisateur modifiée.


### Précision LR-019 — retrait directement dans la notification
Demande approuvée : au sixième ajout, la notification interactive présente immédiatement les 5 favoris, titre/catégorie et un bouton « Retirer et ajouter le nouveau » sur chaque carte. Le remplacement atomique se fait depuis cette fenêtre sans passage par Réglages ni seconde confirmation obligatoire. Fermeture/Annuler conserve la liste. Inclure tests mobile, concurrence et erreurs réseau. **Spécification uniquement, pas encore implémentée.**


## LR-PIGE-001 — Cartes disponibles par catégorie dans Soirée
**État : spécifié, à implémenter et vérifier.** [Prompt officiel](./LOVEROLL_MASTER_PROMPT.md#lr-pige-001--soirée--cartes-encore-disponibles-par-catégorie).
Afficher près des catégories les cartes distinctes encore admissibles à la prochaine pige du joueur, calculées par le moteur serveur (rôles, bibliothèque, exclusions, favoris, cycle, mode). Actualiser avec les mutations et la synchronisation; distinguer chargement/erreur de zéro. Aucun changement de textes, probabilités, quotas ou historique. Tester les deux joueurs, concurrence, reprises et matrice responsive. Ajout documentaire uniquement.

## Journal de reprise autonome — 26 octobre 2026, cycle LR-003/LR-004/LR-015

| Exigence | Avancement prouvé (branche uniquement) | Restant / blocage |
|---|---|---|
| LR-001 | PR [#21](https://github.com/fredvolks/loveroll/pull/21), run [40336399686](https://github.com/fredvolks/loveroll/actions/runs/40336399686), SHA `b91a7ccf`, **success** | Fusion et contrôle production/appareils ; ne pas cocher |
| LR-002 | PR [#50](https://github.com/fredvolks/loveroll/pull/50), run [40337241207](https://github.com/fredvolks/loveroll/actions/runs/40337241207), SHA `aac3639d`, **success** | Fusion, vérification minuteur réel et migration de compatibilité ; ne pas cocher |
| LR-003 | PR [#51](https://github.com/fredvolks/loveroll/pull/51), run [40346544556](https://github.com/fredvolks/loveroll/actions/runs/40346544556), SHA `01266ab2`, **success** | Audit cycle/200 et test appareil, fusion ; ne pas cocher |
| LR-004 | PR [#52](https://github.com/fredvolks/loveroll/pull/52), run [40352112006](https://github.com/fredvolks/loveroll/actions/runs/40352112006), SHA `2cd20541`, **success** ; reprise du son après suspension audio | Tests Safari iPhone/PWA installée et Android physiques, limites OS ; ne pas cocher |
| LR-015 | PR [#53](https://github.com/fredvolks/loveroll/pull/53), run [40352784694](https://github.com/fredvolks/loveroll/actions/runs/40352784694), SHA `dcc6b97c`, **success** phase 1 | Nouveau commit `4e1c4e94` (capacité de pige/carte passée) en validation run [40354801803](https://github.com/fredvolks/loveroll/actions/runs/40354801803). RPC refus/exclusions/repige, tests PostgreSQL et UI encore à faire ; ne pas cocher |
| Continuité | PR [#47](https://github.com/fredvolks/loveroll/pull/47), run [40353308001](https://github.com/fredvolks/loveroll/actions/runs/40353308001), SHA `3d46ed19`, **success** | Ce journal produit un nouveau SHA CI ; automatisme `workflow_run` non actif sur main avant fusion autorisée |

**La réussite CI ne prouve ni le déploiement ni un test physique.** Le dernier déploiement Pages `main` confirmé reste en échec ([40316957313](https://github.com/fredvolks/loveroll/actions/runs/40316957313)). Aucun secret, authentification ou donnée personnelle modifiés. Suivre strictement la nouvelle tête de branche et les SHA lors de la reprise.


## Publication Web — reprise du 26 octobre 2026
- PR [#47](https://github.com/fredvolks/loveroll/pull/47) fusionnée : `5fe2fddf95b78e9bcb7dc65dcf82917760fcec99`; corrige le faux échec 5 boutons / 4 et aligne le test des PR avec Pages.
- Contrôles préalables : CI sur tête `ce43bb3` réussie, 3 tests locaux de finale et syntaxe de 223 scripts réussis.
- Version Web 232 : repères endpoint/app/HTML/service-worker harmonisés; tests des versions fondés sur leur cohérence plutôt que l'ancien numéro 229 figé. 21 tests locaux ciblés réussis.
- **Publication/recette publique de Web 232 à confirmer après le présent commit.** Consulter les runs du SHA réel. Les autres PR fonctionnelles restent distinctes; aucune n'est déclarée publiée par ce lot.

## LR-045 — Soirée Extra

| [ ] | LR-045 | Soirées Extra **illimitées** quand les dés hebdomadaires sont épuisés : même bouton Brasser le dé ; proposition Accepter/Refuser ; D6 de chaque partenaire pour le nombre de défis, puis D100 ; toutes les cartes éligibles remises dans la pige de **chaque Extra** sans toucher au cycle normal ; option ON/OFF réservée à l'admin du couple ; historique et synchro intacts | **Spécification approuvée seulement — code, tests et déploiement non réalisés** | [Exigence LR-045](./LOVEROLL_MASTER_PROMPT.md#lr-045--soirée-extra-illimitée-après-épuisement-des-dés-hebdomadaires-demande-approuvée-le-26-octobre-2026) |



## LR-046 — Orientation lisible des résultats D6 / D100 (26 octobre 2026)

- **Statut :** ◐ Correctif WebGL proposé, validation CI et publication à confirmer. Ne pas cocher avant le déploiement réellement vérifié.
- **Source :** capture Android du 26 octobre : le D6 résultat officiel 2 était trop tourné de côté et la face adjacente dominait visuellement.
- **Correctif :** orientations d'arrêt D6/D100 plus frontales, repère de gravure réel de chaque face, suppression du réglage spécial de la face 2. Valeurs serveur, probabilités, gravures, matériaux, socle et trajectoire inchangés.
- **Preuves prévues :** `couple-web/dice-face-readability-browser-check.cjs` (D6 1–6, D100 représentatifs; téléphone 360×700, tablette 820×1180, ordinateur 1366×768), `dice-roll-motion.test.mjs`, captures WebGL `LoveRoll-D6-D100-face-readability-*` de GitHub Actions, comparaison avec la capture initiale. Tests physiques sur les vrais appareils et comparaison avant/après à confirmer; captures CI « après » ne remplacent pas une capture « avant ».
- **Livraison :** branche `fix/d6-d100-face-readability-20261026` ; PR, CI, version Web, déploiement Pages et comportement public à renseigner après vérification.

## Éclat V2 — état d'implémentation contrôlé (27 octobre 2026)

### Atelier du Super Admin — branche V2

- **Implémenté dans PR #92, brouillon :** rubrique \`Éclat · atelier de test\` dans \`admin.html\` (après authentification propriétaire); accès à deux comptes QA Auth indépendants, interface réelle de jeu pour A/B, choix 12 coffrets/30–60–90 min, démarrage/reprise/actualisation via le vrai backend, disposition iPad/PC et mobile. Blocage explicite du Supabase officiel, des clés privées et des identités identiques.
- **Vérifié :** tests unitaires de garde de configuration, contrôle de deux identités/d'un seul couple, absence de partage JWT et tests d'enchaînement de deux connexions de jeu; la migration V2 et ses règles passent les tests PostgreSQL de CI sur base jetable.
- **Non implémenté / non validé :** création/suppression de vrais comptes QA depuis Studio, Supabase QA provisionné, indépendance des dés D6/D100 en mode test, générateur réel de trois cartes, limites/surplus/paiements sandbox, essais physiques iPad/Android ou recette simultanée sur une QA distante. Ne pas présenter l'atelier comme utilisable immédiatement sans cette infrastructure.
- [Procédure et garde-fous](./LOVEROLL_ECLAT_QA_WORKBENCH.md).



**PR de préparation :** [#92 — Éclat V2](https://github.com/fredvolks/loveroll/pull/92). **Non fusionnée, aucune migration de production exécutée, Éclat V1 intact.** Les 12 coffrets possèdent une structure éditoriale et des modèles/contrôles de jeu dans la branche; cela **ne constitue pas** une livraison jouable dans l'application publique.

**Contrôles automatisés en branche :** `Éclat V2 editorial & route contract` et `Éclat V2 isolated PostgreSQL security checks` vérifient les vraies migrations V2 en PostgreSQL 17 jetable et les parcours A/B. Le statut exact du dernier commit doit être relu dans la PR avant toute fusion. Aucun test physique iPad/Android ou recette réelle à deux comptes en application publiée n'est encore revendiqué.

**Coffret 08 :** les thèmes T1–T5 et titres privés sont en code; révélation uniquement volontaire. La finale propose jusqu'à cinq titres révélés, ordonnés librement et sauvegardés seulement après deux approbations identiques (ou confirmation orale explicite en mode partagé). Les notes privées et brouillons sont effacés à la fin/à l'arrêt; la liste approuvée, titres et artistes uniquement, peut être relue après la séance. Aucune musique ni lecture automatique.

**Coffret 09 :** les sélections privées (0–3 cartes) sont comparées uniquement pour les cartes communes et les choix non partagés sont détruits. Les étapes 5–8 comportent les choix maintenant/plus tard/passer, la participation facultative et l'invitation finale; tout contact des cartes 7/8 exige deux Oui spécifiques et révocables. La phrase commune est facultative et ne devient publique qu'après deux propositions identiques (ou accord oral sur un téléphone). Refus, votes temporaires et consentements de contact sont purgés; seule l'invitation et sa phrase expressément approuvées peuvent subsister.

**Super Admin · atelier QA :** l'onglet Éclat V2 est branché à la console propriétaire dans la PR #92, derrière son authentification serveur. Deux sessions joueurs A/B et une troisième session opérateur distincte utilisent exclusivement un projet Supabase QA séparé. Les vraies vues A/B et le moteur V2 sont utilisés, avec reprises, synchronisation et contrôles d'identité. **Nouveau lot en code non déployé :** Edge Function de création/suppression de comptes QA jetables, liste et purge sur demande, registre privé RLS fermé, 48 heures d'expiration nominale (non automatisée), UI opérateur QA et tests de garde. Vérification read-only du schéma QA et interdiction de créer sans tables requises; accès Premium testé individuellement à la connexion A/B. **Banc Soirée QA en code :** le D6 hebdomadaire, les D6 personnels, le D100 officiel, Accepter/Terminer et Passer/Refuser/Repiger LR-015 utilisent les vraies RPC du jeu sous deux JWT séparés, avec le vrai moteur WebGL et une limite de contextes sur iPad. **Aucun vrai compte n'a été créé ou supprimé, aucune base Supabase QA n'a été modifiée**; l'accès Premium QA et la suppression réelle doivent encore être éprouvés. Le banc ne remplace pas la recette des vrais dés Soirée D6/D100.

**Restant avant de compter les coffrets comme livrés :** branchement dans la vraie navigation, migration coordonnée sécurisée, abonnements/entitlements, QA bout-en-bout de tous les coffrets/variantes sur deux comptes réels, contrôle de la reprise et des échanges A/B, essais physiques iPad/Android, finitions visuelles et accessibilité. Ne pas fusionner ni déployer #92 sans ces contrôles.

## Refonte Éclat — douze coffrets approuvés le 27 octobre 2026

**LR-ECLAT-001 : spécification figée; développement en cours dans la PR #92 (brouillon non fusionné, non publié).** [Maître](./LOVEROLL_MASTER_PROMPT.md) · [Contrat de jeu détaillé](./LOVEROLL_ECLAT_12_COFFRETS_SPEC.md). Work implémente les décisions fixées; aucun nouveau gameplay à inventer. Les colonnes designer/client/joueur/codeur exigent des preuves propres au coffret; aucune case de livraison cochée par la seule rédaction de cette spécification.

| ID | Coffret | Spécification | Code / livraison | Recette designer / client / joueur / codeur |
| --- | --- | --- | --- | --- |
| LR-ECLAT-01 | Les cinq secrets | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | En cours — PR #92, non publié | À réaliser et documenter |
| LR-ECLAT-02 | Le double jeu | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | En cours — PR #92, non publié | À réaliser et documenter |
| LR-ECLAT-03 | Le langage des sens | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | En cours — PR #92, non publié | À réaliser et documenter |
| LR-ECLAT-04 | Les portes de minuit | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | En cours — PR #92, non publié | À réaliser et documenter |
| LR-ECLAT-05 | Comme au premier rendez-vous | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | En cours — PR #92, non publié | À réaliser et documenter |
| LR-ECLAT-06 | L’enquête amoureuse | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | En cours — PR #92, non publié | À réaliser et documenter |
| LR-ECLAT-07 | À ta place | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | En cours — PR #92, non publié | À réaliser et documenter |
| LR-ECLAT-08 | Notre bande originale | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | En cours — PR #92, non publié | À réaliser et documenter |
| LR-ECLAT-09 | Le coffre des envies | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | En cours — PR #92, non publié | À réaliser et documenter |
| LR-ECLAT-10 | Le compte à rebours | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | En cours — PR #92, non publié | À réaliser et documenter |
| LR-ECLAT-11 | L’art de te séduire | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | En cours — PR #92, non publié | À réaliser et documenter |
| LR-ECLAT-12 | La nuit du hasard | Écrite — 8 scènes, 2 variantes, routes 30/60/90 | En cours — PR #92, non publié | À réaliser et documenter |
