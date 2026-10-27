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
| 08 · Notre bande originale | T1–T5, titres/artistes privés par auteur, révélation explicite et relance des scènes sans lecteur musical; mode partagé temporaire | **Liste finale de 5 titres max avec deux accords, persistance uniquement du commun et repli souvenir A3** |
| 09 · Le coffre des envies | 12 cartes rédigées, choix privés 0–3, intersection uniquement serveur, suppression rapide des choix non communs, sélection commune à deux votes, mode partagé local | **Accord de participation scène 6, alternatives sans contact, invitation/souvenir co-validés** |
| 10 · Le compte à rebours | Contrat des cinq manches et durées 90/120/180 s, sans complétion automatique | **Vrai minuteur optionnel, choix mémorisé, pause/reprise, prolonger 1 minute** |
| 11 · L’art de te séduire | Contrat des 3 cartes V0/V1, deux tours A/B, refus et alternatives définis dans le modèle | **Mécanique interactive sécurisée et consentement** |
| 12 · La nuit du hasard | 3 D6 générés côté PostgreSQL avec rejet sans biais, tirages immuables à la reprise; choix garder/relancer uniquement C/sans contrainte à 2 validations, historique et rejets des retries périmés; UI affiche les tirages réels | **Tests de vraie interface après migration planifiée**, aucune modification des D6/D100 officiels |

## Vérifications et sécurité

- GitHub Action `Éclat V2 editorial & route contract` : tests Node des routes, variantes, scènes et UI.
- GitHub Action `Éclat V2 isolated PostgreSQL security checks` : exécution de vraies fonctions PostgreSQL 17 sur données de test jetables, notamment course entre deux appareils, RLS fermée, révélation A/B, réponses secrètes, consentements, propositions 05, musique 08, tirages 12 et intersection 09.
- GitHub checks généraux Web : **ne pas les marquer verts sans examiner la dernière exécution**. Plusieurs exécutions peuvent être annulées lorsque la branche avance rapidement.
- Les comptes client réels, les clés Venice, Stripe, l'administration, les migrations de production et l'application LoveRoll publiée sont hors de cette PR.

## Suite de travail autonome, sans réinventer le jeu

1. Achever la liste finale de la bande originale 08 (titres révélés seulement, consentement identique de A et B, maximum cinq, aucune lecture automatique).
2. Achever le contact et la carte acceptée 09, puis les parcours 10 (minuteur) et 11 (attentions) exactement selon la spécification.
3. Intégrer les 12 coffrets aux vraies routes/UI Éclat V2 en gardant l'ancien jeu; jouer deux comptes authentiques en sandbox ou banc Super Admin officiel et tester Android/iPad.
4. Faire revue sécurité SQL réelle et RLS/ACL, contrôles d'abonnement, paiements et confidentialité, revue Figma du rendu exécuté, et migration **coordonnée séparée** avant publication.
5. Ne convertir la PR brouillon en PR prête que lorsque tous les parcours sont réellement utilisables, testés et conformes au prompt maître.

**Ne pas utiliser une maquette ou le modèle éditorial seul comme preuve de « jeu terminé ».**
