# Éclat V2 — état du code et prochaines intégrations

**27 octobre 2026 — PR brouillon #92** : https://github.com/fredvolks/loveroll/pull/92

**Strictement non publié** : aucune migration Éclat V2 appliquée à Supabase de production et aucun branchement de ces nouveaux modules dans le jeu V1. Les tests de PostgreSQL ci-dessous utilisent une base jetable, pas les comptes LoveRoll réels. Cette passation ne remplace ni le prompt maître ni la spécification approuvée.

## Sources et règles non négociables

- `docs/LOVEROLL_MASTER_PROMPT.md` et `docs/LOVEROLL_ECLAT_12_COFFRETS_SPEC.md` sont normatifs. Les 12 coffrets ont 8 scènes fixées et 2 variantes réelles V0/V1. Ne générer ni texte, durée, activité, score, version ou mécanique supplémentaires.
- Parcours officiels 30/60/90 min : [1,3,6,8], [1,2,3,5,6,8], [1,2,3,4,5,6,7,8]. Budgets indicatifs uniquement, jamais de complétion forcée.
- V2 isolé en `couple-web/migrations/20261027181500_eclat_v2_sessions_foundation.sql`; contrôler RLS, ACL, séparation couples, rôles A/B et permissions avant toute activation.
- Modèles éditoriaux `eclat-v2-coffrets-a.mjs` (01–04), `-b.mjs` (05–08), `-c.mjs` (09–12); moteur de vues `eclat-v2-play-ui.mjs`, contrôleur `eclat-v2-play-controller.mjs`, adaptateur RPC `eclat-v2-session.mjs`. Tous **staged**, non importés dans le vrai `app.js`.

## Livré et testé en PR #92

| Coffret | Fonctions effectivement écrites | Encore nécessaire |
| --- | --- | --- |
| 01 · Les cinq secrets | 5 enveloppes A/B, V0/V1, enveloppes 3 et 4 distinctes avec confirmations serveur, reprise | Essai sur deux vrais appareils et finition UI |
| 02 · Le double jeu | Missions privées propres aux rôles, mots inversés, scène 6 et repli oral fixés | Essai bout en bout et validation des branches |
| 03 · Le langage des sens | Choix sensoriels, deux Oui indépendants pour le massage, retrait, alternative sans contact; un téléphone par accord oral explicite | Validation d'usage réelle et accès aux souvenirs |
| 04 · Les portes de minuit | Tendresse/Jeu/Mystère, deux votes synchronisés ou accord oral, branche sauvegardée, nouvelle porte scène 5 | Validation visuelle et parcours complets |
| 05 · Comme au premier rendez-vous | Questions A/B/C, 3 attentions éditoriales, proposition par A/B, Oui / autre proposition / Passer, changement de tour et RLS | Souvenirs co-validés, finition du parcours |
| 06 · L’enquête amoureuse | Dossiers A/B privés, codes/lieux/heures fixes V0/V1; validation serveur, aide 1/2, tentatives illimitées, « Résolution avec aide » | Validation UX sur un/deux appareils |
| 07 · À ta place | Q1–Q5, réponses et prédictions par compte, révélation double, zéro score; mode partagé temporaire sans usurper B | Tests humains de confidentialité lors de la remise |
| 08 · Notre bande originale | T1–T5 et notes privées; playlist de 1 à 5 titres révélés avec ordre choisi, double approbation, suppression des notes privées à la fin et liste commune relisible | Recette QA réelle et vérification iPad/Android, lecture externe jamais automatique |
| 09 · Le coffre des envies | Choix privés 0–3, intersection seule dévoilée; accord indépendant sur activité; contact 7/8 révocable; invitation et phrase commune optionnelle seulement après double approbation; purge des refus/votes | Recette QA et essais réels de la finale et du retrait de consentement |
| 10 · Le compte à rebours | Avec/sans minuteur après accord mutuel, horloge persistée côté serveur, pause/reprise et prolongation de 60 secondes sans fin automatique; UI minuteur | Recette QA multi-appareils et validation pratique du tour de 90 secondes par partenaire |
| 11 · L’art de te séduire | Deux propositions tour A/B, 3 choix officiels par variante, autre proposition/Passer, rôles validés côté serveur; interactions reliées à l’interface | Recette QA réelle des deux rôles, contrôle des contacts et finale |
| 12 · La nuit du hasard | 3 D6 générés côté PostgreSQL avec rejet sans biais, tirages immuables à la reprise; choix garder/relancer uniquement C/sans contrainte à 2 validations, historique et rejets des retries périmés; UI affiche les tirages réels | **Tests de vraie interface après migration planifiée**, aucune modification des D6/D100 officiels |

## Super Admin — atelier QA réellement branché, non publié

- Sous `couple-web/admin.html?panel=eclat-qa`, l'atelier est accessible **seulement après** le contrôle serveur `love_platform_admin_read`; il est détruit à la déconnexion propriétaire.
- `eclat-v2-qa-workbench.mjs` refuse explicitement l'URL Supabase publique de production et les clés secrètes. Il accepte une clé **sb_publishable_** d'un autre projet QA, et conserve les deux sessions A/B uniquement en mémoire de page (pas de mot de passe ou de session QA persistée).
- Deux comptes préexistants différents, appartenant au même vrai duo QA, pilotent séparément **le contrôleur Éclat V2 officiel**, sans simulation des dés et sans usurpation des identités. En mode paysage iPad/PC, les écrans sont côte à côte, avec un mode empilé en portrait/mobile. L'atelier prévoit démarrage, reprise et rafraîchissement des états.
- Protections additionnelles : rejette la réauthentification d'un rôle déjà connecté, refuse de démarrer sur une séance encore active et interrompt la nouvelle séance QA si la vérification du second compte échoue.
- **Non livré :** création et suppression sécurisées de comptes d'essai, base QA LoveRoll explicitement choisie et provisionnée, permissions QA/abonnements validés, suite D6/D100 de la Soirée, campagne de recette physique iPad/Android. Ne pas confondre ce banc Éclat avec une console complète de tous les jeux.

## Vérifications et sécurité

- GitHub Action `Éclat V2 editorial & route contract` : tests Node des routes, variantes, scènes et UI.
- GitHub Action `Éclat V2 isolated PostgreSQL security checks` : exécution de vraies fonctions PostgreSQL 17 sur données de test jetables, notamment course entre deux appareils, RLS fermée, révélation A/B, réponses secrètes, consentements, propositions 05, musique 08, tirages 12 et intersection 09.
- GitHub checks généraux Web : **ne pas les marquer verts sans examiner la dernière exécution**. Plusieurs exécutions peuvent être annulées lorsque la branche avance rapidement.
- Les comptes client réels, les clés Venice, Stripe, l'administration, les migrations de production et l'application LoveRoll publiée sont hors de cette PR.

## Suite de travail autonome, sans réinventer le jeu

1. Tester dans une base QA dédiée la bande originale 08 désormais codée, dont approbations A/B, ordre des titres, purge des brouillons et finale sans musique.
2. Tester de bout en bout les parcours 09 (contact et refus), 10 (minuteur sur deux vrais appareils) et 11 (deux tours distincts) déjà raccordés au moteur V2.
3. L'atelier Super Admin QA est branché dans la PR en brouillon. Préparer une base QA *désignée et séparée*, y installer les prérequis et migrations, créer deux comptes de test associés au même duo et faire une recette réelle. La création/suppression automatique des comptes test, et les parcours D6/D100 hors Éclat, restent à développer. Ne pas recycler un projet Supabase existant non confirmé.
4. Faire revue sécurité SQL réelle et RLS/ACL, contrôles d'abonnement, paiements et confidentialité, revue Figma du rendu exécuté, et migration **coordonnée séparée** avant publication.
5. Ne convertir la PR brouillon en PR prête que lorsque tous les parcours sont réellement utilisables, testés et conformes au prompt maître.

**Ne pas utiliser une maquette ou le modèle éditorial seul comme preuve de « jeu terminé ».**
