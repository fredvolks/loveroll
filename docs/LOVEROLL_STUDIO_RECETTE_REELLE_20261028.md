# LoveRoll Studio — recette réelle A/B et critères de publication

> Document de suivi technique — 28 octobre 2026. La PR #97 reste un **brouillon**.
> Aucune affirmation de « jeu A/B 100 % testé » ne peut être faite à partir de tests
> JavaScript unitaires, d'un banc PostgreSQL isolé ou de captures sans connexion.

## Périmètre et décisions non négociables

- Les comptes A et B sont de **vrais utilisateurs Supabase Auth**, distincts du Super Admin, créés par un service administrateur vérifiant son propre JWT et `love_platform_admins`.
- Les iframes chargent **le même LoveRoll complet**, ses dés WebGL et les RPC officielles. Aucun dé, défi ni état n'est fabriqué par le Studio.
- Le Super Admin joue à tour de rôle dans A ou B. Le premier joueur qui peut tirer un défi est déterminé par le **moteur officiel de tours**, pas présumé A.
- Toute suppression se limite à un duo explicitement enregistré comme test, vérifié sur les comptes Auth, les membres, le propriétaire et les liaisons financières; le registre privé reste disponible après une erreur partielle.
- Les comptes techniques sont exclus des chiffres réels, promotions, revenus et des notifications clientes.
- Les trois cartes Venice sont des **brouillons privés**, hors catalogue officiel. La génération réelle, confirmée par l'administrateur, consomme des crédits et est limitée à une requête par administrateur/jour UTC, même après le remplacement du duo.
- Publication bloquée tant que la matrice authentifiée n'est pas exécutée et que les vérifications de sécurité ne sont pas vertes sur **le SHA final fusionné**.

## Preuves disponibles et limites

| Vérification | État |
|---|---|
| Types du service Supabase Edge, garde A/B, contenu privé et interface responsive | Tests automatisés écrits, exécutés en CI spécialisée |
| PostgreSQL isolé : migration, privilèges RLS/ACL, purge hostile, statistiques, quota Venice | Scénarios exécutables en CI spécialisée |
| Chromium : PC 1440, iPad paysage 1180, iPad portrait 820, mobile 390 | Captures et assertions en CI (visuel sans session authentifiée) |
| Vraie création A/B et deux sessions Supabase dans des iframes | **Non encore prouvée sur préproduction** |
| Vrais D6 / D100 / défi et état renvoyé par le serveur sur deux comptes | **Non encore prouvés sur préproduction** |
| Cycle complet : réponse, refus, redessin, minuterie, fin de soirée, nouveau cycle | **Non encore prouvé de bout en bout** |
| Douze coffrets Éclat joués et terminés A/B | **Non encore prouvés de bout en bout** |
| Venice : trois brouillons réellement générés, sans publication | **Non encore exécuté**; usage payant explicitement consenti |
| Suppression définitive et absence des utilisateurs Auth techniques après purge | Vérifié en logique/SQL isolés; **pas encore en véritable Supabase staging** |

**Important** : des tests sur une ancienne version n'attestent pas la version de tête actuelle; consulter les dernières exécutions GitHub avant une fusion.

## Recette navigateur réelle (préproduction uniquement)

Code : `couple-web/studio-authenticated-e2e.cjs`.
Workflow manuel : `.github/workflows/studio-authenticated-staging.yml`.

**Contrôle bloquant ajouté :** `couple-web/studio-staging-preflight.mjs` vérifie
la référence Supabase, dix-huit tables indispensables (vrais dés, cartes, soirées, accès Éclat et registre privé) et l'existence des deux Edge
Functions **avant** de créer le moindre compte de test. Toutes les requêtes du
contrôle sont en lecture seule (sans RPC de jeu). Les réponses 404, erreurs
serveur, clés incorrectes ou fonctions non protégées bloquent la recette.
Le projet Supabase distinct intitulé « Test » vérifié le 28 octobre contient
uniquement des tables d'organisations, **pas** les RPC/tables LoveRoll : il ne
suffit pas actuellement à la recette A/B. Ne pas y restaurer de données clients
ni y exécuter de scripts de production sans configuration explicitement dédiée.

Préparer un projet Supabase **distinct** de production : schéma LoveRoll compatible avec les vraies RPC, les migrations de base du Studio, `love_platform_admins`, la fonction `love-studio-sandbox`, l'administrateur de préproduction réellement confirmé et les restrictions RLS usuelles. **Ne jamais restaurer de comptes ou paiements clients dans ce projet.**

Le backend de staging autorise l'origine `http://127.0.0.1:8765` seulement avec
`LOVEROLL_STUDIO_STAGING_MODE=true` et
`LOVEROLL_STUDIO_STAGING_ORIGIN=http://127.0.0.1:8765`,
et seulement lorsque `SUPABASE_URL` ne contient pas la référence de production.

Configurer les secrets GitHub de staging **sans afficher les valeurs dans les logs** :

- `LOVEROLL_STUDIO_E2E_REF`
- `LOVEROLL_STUDIO_E2E_URL`
- `LOVEROLL_STUDIO_E2E_PUBLISHABLE_KEY`
- `LOVEROLL_STUDIO_E2E_ADMIN_EMAIL`
- `LOVEROLL_STUDIO_E2E_ADMIN_PASSWORD`

Le navigateur bloque explicitement les service workers et toute requête dirigée vers
`ejsrqfpkgwraorrznjpm.supabase.co`; si la référence est celle de production, l'exécution est refusée **avant l'import Playwright**.

**Attention au déclenchement GitHub** : les workflows uniquement `workflow_dispatch` ne peuvent être lancés par l'interface GitHub que s'ils existent sur la branche par défaut. Le workflow de brouillon n'est donc pas à considérer comme déjà exécutable en production. Publier **uniquement le lanceur de préproduction**, sans le Studio lui-même, sur la branche par défaut lorsque l'environnement de staging est prêt; autrement, utiliser un exécuteur vérifié qui pointe explicitement vers le SHA testé.

## Matrice de recette à cocher avec captures/IDs de run

- [ ] Super Admin staging authentifié; simple compte de couple refusé.
- [ ] Création du duo A/B : propriétaire et deux identités Auth marquées `love_studio_test`, registres privés présents.
- [ ] Connexions A/B indépendantes, même jeu intégral visible, session du Super Admin préservée.
- [ ] D6 hebdomadaire lancé une seule fois dans A; B voit le résultat officiel; pas de 2e tirage autorisé dans le même cycle.
- [ ] Nouvelle soirée officielle; D6 personnels A et B réellement enregistrés.
- [ ] Le bon partenaire selon `turn.next` choisit sa catégorie et lance le D100 officiel; défi réel, auteur/destinataire et consigne vérifiés.
- [ ] Les deux joueurs peuvent accepter, passer, refuser, repiger et terminer leurs défis selon les quotas, dans les vrais écrans.
- [ ] D100 Surprise réel lancé avec animation/lecture; la limite mensuelle reste effective.
- [ ] Minuteur, historique, journal, calendrier, occasions, Avent et préférences réelles testés.
- [ ] Les 12 coffrets Éclat parcourus à deux; annulations **non** comptabilisées comme terminés.
- [ ] Nouvelle paire A/B : anciennes sessions invalidées, statistiques réelles inchangées, aucun joueur réel touché.
- [ ] Suppression définitive : comptes Auth A/B absents, couple absent, tables test privées nettoyées; aucun enregistrement client supprimé.
- [ ] Mauvais admin, origine externe, ID de client, marqueur Auth manquant, paiements ou auteurs externes : **refus**, sans suppression partielle.
- [ ] Atelier Venice : lecture des brouillons, consentement à un coût, trois nouvelles cartes privées, limite par admin/jour UTC (si crédits/tests officiels prévus).
- [ ] Captures iPad portrait/paysage, PC, mobile **authentifiés** relues; pas de débordement, aucun faux socle/dé.

## Règle de fusion

La PR ne peut devenir non-brouillon et être publiée qu'une fois : branche à jour sur `main`, toutes les CI pertinentes au vert, preuves A/B réelles et tests RLS intercomptes, revue de sécurité de la purge/Authentification, absence de divergence Android/iPad, fonctionnalités absentes identifiées comme « En développement ». Ne pas contourner ce verrou par une démonstration statique ou un nombre élevé de commits.

## Revue technique du 28 octobre — correctifs de fin de lot (non fusionnés)

- **Recette A/B :** les contrats des sélecteurs D100 et de la référence Supabase de staging ont été réalignés sur le code exécuté. En cas d'échec du scénario alors qu'on se trouve sur Venice ou mobile, la recette revient à l'onglet A/B en vue PC avant la purge obligatoire. Un échec de cette purge est **bloquant**, pas comptabilisé comme succès.
- **Venice :** les échanges entre console et vrai compte A utilisent un UUID de requête, vérifié et renvoyé à l'identique; une réponse ancienne ou sans identifiant est rejetée. Après 60 secondes sans réponse, l'interface cesse de bloquer, avertit que les crédits peuvent déjà avoir été consommés, **sans** rejouer la génération automatiquement.
- **Revue visuelle réelle des preuves de CI :** captures d'écran PC, iPad paysage/portrait et mobile inspectées. Le jeu A/B apparaît maintenant avant les étapes de recette et les 12 coffrets; le bandeau marketing est masqué pendant le test. Assertions Chromium ajoutées afin de bloquer toute régression d'ordre et d'accessibilité.
- **Honnêteté des preuves :** le banc visuel sans authentification n'affiche plus artificiellement « 7/9 »; il affiche « 0/9 ». Les cartes et dés de cet environnement sont absents volontairement. **Ces captures ne sont pas des preuves de jeu connecté.**
- **CI spécialisée vérifiée :** [exécution 40632258572](https://github.com/fredvolks/loveroll/actions/runs/40632258572), **trois jobs réussis** sur `b94e362` : serveur/identités, PostgreSQL 17, Chromium responsive. Le contrôle Venice du même SHA est également vert. Les commits postérieurs, dont `847d209`, ne sont **pas** déclarés vérifiés par cette exécution.
- **Verrou de publication maintenu :** l'authentification réelle A/B, les lancers D6/D100, les réponses et la purge Auth sur un **projet Supabase de préproduction** distinct demeurent sans preuve finale; la PR #97 reste en brouillon et la fonction Studio n'est pas déployée en production.

Prochain passage impératif : disposer d'un backend staging équipé des RPC LoveRoll, des migrations Studio et d'un administrateur de staging confirmé, puis exécuter la recette authentifiée manuelle sur le **SHA exact à publier**. Ne pas déclencher de dépenses Venice lors du test automatique. Ne jamais importer de comptes/paiements clients en staging.

### Renforcement de la recette du 28 octobre — garde-fous sur le staging

- Le précontrôle exige désormais les tables nécessaires aux **véritables D6, D100, cartes et soirées**, aux exemptions techniques Base/Éclat et au registre Studio, soit 18 tables au total. Un schéma contenant seulement les tables administratives n'est plus éligible.
- La recette de suppression ne se contente plus de revoir le bouton « Créer » : elle attend l'**audit serveur de suppression terminée**, la disparition des deux iframes authentifiées et le retour du compteur de validation à **0/9**. C'est un contrôle de staging, pas une preuve actuellement exécutée.
- Ne jamais assimiler les tests SQL/Node verts à une recette Supabase Auth A/B réellement passée.

- La recette A/B authentifiée vérifie **avant toute création** deux RPC réellement exécutables sous le JWT du Super Admin de staging : `love_eclat_status` (lecture de l'accès Éclat) et `love_test_mode_allowed` (droit au mode essai). Elle s'arrête si le schéma de fonctions est incomplet, même si les tables existent. Aucun dé ni coffret n'est généré pendant ce précontrôle.


### Inspection complète des vrais défis du duo technique — lot du 28 octobre

- La rubrique « Défis officiels du duo de test » affiche les trois derniers défis de la dernière soirée, et possède maintenant **« Voir tout l’historique »** avec pagination de 10 défis par page. Elle couvre les soirées successives du même duo, pas seulement le dernier écran.
- Filtres **A et B / Joueur A / Joueur B** exécutés **côté serveur** avec des comptes exacts, recherche de destinataire uniquement via les comptes `love_studio_test_seats` enregistrés; aucun UUID ou identifiant de couple arbitraire accepté du navigateur. Chaque lecture exige un vrai Super Admin et revalide le duo Auth technique A/B.
- Résultats : **vraie valeur D100, catégorie, destinataire A/B, titre, consigne, statut et date d’enregistrement**, extraits de `couple_challenges` sans déclencher de tirage ou altérer les cartes. Aucune identité, email ou clé secrète transmis dans le résultat. Les données sont supprimées de la console à la fermeture de session admin ou au remplacement du duo.
- La recette réelle sur staging comparera le défi accepté à sa fiche d’historique et vérifiera que le destinataire correct le voit, alors que l'autre joueur n’a pas de fausse attribution. **Cette recette n’est pas encore exécutée**; les tests de contrat sont la vérification disponible en branche.
- La consultation des historiques reste offerte quand un autre diagnostic (Éclat ou dés) est momentanément indisponible. La section n'est pas une maquette : une panne SQL de l'historique affiche une erreur, jamais des cartes inventées.
