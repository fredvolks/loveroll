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
- **Codé, en branche uniquement :** service Edge QA pour créer/supprimer des paires jetables avec identité d'opérateur, registre fermé et nettoyage manuel; banc Soirée officiel D6/D100 et LR-015; deux panneaux A/B indépendants, confirmation LR-014, quotas de passe, accusés de réception serveur et tests de répartition des actions. **Non livré réellement :** base QA LoveRoll dédiée, installation/vérification de la fonction et des droits, suppression Auth/Storage en conditions réelles, accès Premium QA et campagne de recette physique iPad/Android. Ne pas confondre du code testé dans la branche avec un service déjà déployé.

## Vérifications et sécurité

- GitHub Action `Éclat V2 editorial & route contract` : tests Node des routes, variantes, scènes et UI.
- GitHub Action `Éclat V2 isolated PostgreSQL security checks` : exécution de vraies fonctions PostgreSQL 17 sur données de test jetables, notamment course entre deux appareils, RLS fermée, révélation A/B, réponses secrètes, consentements, propositions 05, musique 08, tirages 12 et intersection 09.
- GitHub checks généraux Web : **ne pas les marquer verts sans examiner la dernière exécution**. Plusieurs exécutions peuvent être annulées lorsque la branche avance rapidement.
- Les comptes client réels, les clés Venice, Stripe, l'administration, les migrations de production et l'application LoveRoll publiée sont hors de cette PR.

## Suite de travail autonome, sans réinventer le jeu

1. Tester dans une base QA dédiée la bande originale 08 désormais codée, dont approbations A/B, ordre des titres, purge des brouillons et finale sans musique.
2. Tester de bout en bout les parcours 09 (contact et refus), 10 (minuteur sur deux vrais appareils) et 11 (deux tours distincts) déjà raccordés au moteur V2.
3. L'atelier Super Admin QA est branché dans la PR en brouillon. Préparer une base QA *désignée et séparée*, y installer les prérequis et migrations, créer deux comptes de test associés au même duo et faire une recette réelle. Les interfaces et serveurs de création/suppression de comptes, ainsi que le banc D6/D100 hors Éclat, sont codés mais non déployés/recettés. L'installation QA contrôlée, le test d'entitlement et les scénarios Soirée réels restent à faire. Ne pas recycler un projet Supabase existant non confirmé.
4. Faire revue sécurité SQL réelle et RLS/ACL, contrôles d'abonnement, paiements et confidentialité, revue Figma du rendu exécuté, et migration **coordonnée séparée** avant publication.
5. Ne convertir la PR brouillon en PR prête que lorsque tous les parcours sont réellement utilisables, testés et conformes au prompt maître.

**Ne pas utiliser une maquette ou le modèle éditorial seul comme preuve de « jeu terminé ».**


## Sécurité en cours de partie — révocation et remplacement de séance (28 octobre)

Le contrôleur `eclat-v2-play-controller.mjs` purge désormais les données **éphémères** des deux joueurs (réponses privées, prédictions, brouillons musicaux, cartes du Coffre, playlists non soumises, rôle affiché et votes locaux) dans les situations suivantes :

- Supabase retourne `access:false` après la révocation d'un droit ou abonnement Premium.
- La séance active est terminée/arrêtée depuis un autre appareil, ou est remplacée par une nouvelle séance avec un identifiant distinct.
- La requête de statut indique une identité invalide : HTTP 401/403 ou PostgreSQL `28000` / `42501`.
- L'utilisateur arrête la partie depuis son appareil : la confirmation serveur termine la séance et efface immédiatement les brouillons, sans attendre un prochain polling.

Les erreurs de réseau transitoires (p. ex. HTTP 503) ne sont **pas** interprétées comme une révocation : elles laissent la séance et les saisies locales intactes pour permettre une reprise. Une réponse de polling périmée ne peut pas supplanter une action serveur plus récente.

Tests de régression ajoutés pour ces scénarios au fichier `eclat-v2-play-controller.test.mjs`. **Leurs résultats CI doivent être vérifiés au dernier SHA**; cela ne constitue toujours pas une preuve de recette réelle A/B sur préproduction ni une autorisation de déployer V2.


## Nouvelle passerelle V2 dans l'application officielle — Web 251 (28 octobre)

**Codé en PR, non fusionné, non publié :**

- `couple-web/app.js` charge maintenant l'API et le contrôleur **réels** des 12 coffrets V2; une interrogation authentifiée `love_eclat_v2_status` décide si le moteur V2 est disponible au couple. Si la fonction manque (PGRST202/42883), le jeu actuel V1 et son RPC `love_eclat_start` restent inchangés. **Aucun droit Premium n'est fabriqué par le navigateur ou par le mode de test.**
- Une fiche de coffret V1 existante affiche la sélection claire **« Deux téléphones · A et B » / « Un téléphone partagé »** uniquement si le serveur a autorisé V2; le bouton officiel de démarrage route alors vers `love_eclat_v2_start` avec le coffret, la durée et le mode sélectionnés. Le serveur reste seul juge des droits, du démarrage, des variantes et des actions.
- Une séance V2 active est rendue dans **la même navigation LoveRoll** avec `createEclatV2PlayController`, ses véritables actions RPC et une actualisation distante toutes les 5 secondes. Le contrôleur est détruit à la sortie de l'écran, à la déconnexion et lorsque la séance se termine : pas de compteur fictif ni de secret partenaire conservé.
- En mode un téléphone, seul le compte ayant lancé la séance peut afficher les deux faces avec l'écran de passation volontaire; le compte B voit un message sans mission privée et n'est jamais usurpé. Une V1 déjà active conserve la priorité pour que les défis en cours restent terminables avant tout démarrage V2.
- L'index original charge les styles `eclat-v2-stage.css`. Les étiquettes d'assets, `web-version.json`, `app.js`, `index.html` et le cache service worker sont alignés sur **Web 251** sur cette branche.
- Test `eclat-v2-live-integration.test.mjs` ajouté au workflow Éclat V2 pour empêcher la disparition du repli V1, le contournement des droits, les faux statuts et les divergences de version.

**Étapes encore indispensables :** validation des nouveaux jobs GitHub **sur le SHA exact**, migration V2 sur un Supabase LoveRoll *staging* séparé, vrais tests A/B 12 coffrets à 30/60/90 minutes, reprise avec deux appareils/partage, paiement Stripe test, contrôle UX sur iPad/Android/PC. Ne pas passer cette PR à « prêt à publier » ni appliquer SQL en production sans ces preuves. La version Web 251 en branche doit être réconciliée avec le main actuel et l'autre PR de rotation PWA (#105).


## Raccordement au véritable jeu et sécurité des rafraîchissements — 28 octobre, Web 251

- Le fichier principal `couple-web/app.js` utilise maintenant les **vrais** contrôleurs `createEclatV2SessionApi` et `createEclatV2PlayController` lorsqu'une réponse **authentifiée du serveur** confirme `access:true` pour V2. Les 12 fiches, durées 30/60/90 et modes deux téléphones / un téléphone sont accessibles depuis la galerie d'origine. En l'absence de la RPC V2, la version V1 conserve ses fonctions et son chemin officiel.
- Le parent conserve un éditeur V2 authentifié déjà monté lorsque le **même utilisateur, le même couple et le même identifiant de séance** sont présents. Un rerender non pertinent ne détruit donc plus les saisies privées en cours. La garde pure est dans `eclat-v2-live-ownership.mjs`, couverte par des tests Node.
- Un refus d'autorisation ou le remplacement de la séance efface les données privées du contrôleur **et l'état V2 mis en cache dans le parent**. La fermeture est aussi forcée en cas de perte d'identité vérifiée ou de duo incomplet. Les erreurs réseau temporaires ne sont pas traitées comme des révocations.
- Le manifeste, les imports, la feuille CSS, la page d'entrée et le cache PWA sont alignés sur Web 251 **dans cette branche**, qui n'est pas fusionnée.
- **Reste bloqué avant publication :** la PR #92 est actuellement non fusionnable avec `main` (modifications nouvelles depuis le départ de la branche), le dernier SHA n'a pas encore de preuve CI complète, les fonctions PostgreSQL V2 ne sont pas installées sur un environnement de préproduction LoveRoll dédié, et la recette deux comptes Auth / appareils physiques n'a pas eu lieu. Ne pas forcer le merge ou la migration de production.


## Raccordement dans la vraie application LoveRoll — Web 251 (28 octobre 2026)

**Statut du code en PR #92 :** les 12 coffrets V2 sont maintenant raccordés à `couple-web/app.js` et non plus seulement à l'atelier QA. Les actions officielles utilisent le contrôleur et les RPC V2 à identité Auth réelle. L'interface V2 comprend les deux téléphones et le téléphone partagé, dont le propriétaire réel reste l'unique auteur des écritures; accès Premium et séance vérifiés par le backend. Les sorties effacent les brouillons privés, et les mises à jour de la même séance évitent de réinitialiser les saisies.

**Basculement sans interruption V1 :** `love_eclat_v2_status` est interrogée sous l'identité du joueur actuel et du couple courant. Tant que la fonction V2 est absente ou que le serveur ne confirme pas un droit réel, le lancement des coffrets continue d'utiliser `love_eclat_start` avec ses propres droits Premium V1. Aucune simulation locale, élévation de privilège ou variante imposée. Les contenus V2 ne doivent pas apparaître sur le site client sans déploiement SQL V2 après recette.

**Réconciliation GitHub :** la branche a intégré `main` via un commit de fusion à deux parents `0f825f7`, en préservant la correction D100 Web 247, les notifications et le cache Web 248. Les tests de contrat ont ensuite été actualisés pour refléter le vrai lancement V2 et vérifier explicitement le propriétaire Auth/le couple, et non l'ancienne hypothèse « l'app publique n'importe jamais V2 ».

**Limites strictes :** tous les tests unitaires et PostgreSQL CI demeurent distincts d'un test Auth A/B sur un Supabase LoveRoll dédié. PR encore brouillon; aucune migration production exécutée, aucune validation physique iPad/Android/PC ni confirmation d'une expérience payante réelle.


## Lot du 28 octobre — consentement avant connexion et saisie stable

- La **vérification invitation → consentement → authentification** demeure prioritaire aux vues connectées; le garde de nettoyage des séances Éclat V2 ne doit pas masquer ou contourner le parcours d'invitation. Les deux contrats historiques `discover-flow.test.mjs` et `invite-links.test.mjs` restent obligatoires.
- Le poll V2 conserve les champs et la position du curseur quand l'état officiel Supabase est **strictement identique** à la dernière lecture. Dès qu'une décision réelle ou un changement de chapitre produit un nouvel état, le serveur reste autoritaire et le rendu est mis à jour normalement. Le rejet de l'accès Premium, une séance remplacée ou une expiration d'identité continuent à effacer immédiatement l'écran.
- Tests du contrôleur : état identique sans remonter le DOM, changement réel avec nouveau rendu, et révocation qui ne peut jamais profiter de cette optimisation.
- À la rédaction, workflow éditorial et PostgreSQL éphémère verts sur le SHA `76cf2158d4b2d32ff31ccedefb405c283317f18f`; suite Web complète non encore terminée. **PR non fusionnée, V2 non déployée, recette Auth A/B et appareils physiques toujours requise.**


## Synchronisation protégée et changement de compte (28 octobre)

- Les lectures `love_eclat_v2_status` successives reçoivent une génération croissante. Une réponse lente **ne peut plus rétablir un ancien coffret, une étape antérieure ou une autorisation Premium** après qu'une lecture plus récente a été acceptée.
- Chaque démarrage réel V2, actualisation confirmée du joueur, retour à la galerie et refus d'autorisation invalide les lectures précédemment en vol. Le test `eclat-v2-latest-read.test.mjs` simule une réponse serveur lente qui arrive **après** une réponse plus fraîche, et exige de garder uniquement cette dernière.
- Lorsqu'un autre compte Supabase se connecte dans la même fenêtre ou que l'utilisateur se déconnecte, le contrôleur Éclat V2 est **détruit immédiatement**. Les brouillons, notes privées, identité, couple et droit V2 précédent sont réinitialisés avant de recharger le nouveau profil réel, sans jamais présenter une partie du partenaire comme sa propre partie.
- Les tests du garde anti-régression sont obligatoires dans `.github/workflows/eclat-v2-contract.yml`. Attendre que les workflows du **dernier SHA** se terminent avant de proclamer la validation. Les tests isolés ne remplacent pas une recette réelle avec A/B Auth sur préproduction LoveRoll.
- Cette amélioration reste dans la PR #92 **non fusionnée et non publiée**. Aucun compte client ni schéma Supabase production modifié.
