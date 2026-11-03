# LR-028 — recette JWT/RLS réelle, en lecture seule

Cet outil complète la fixture PostgreSQL 17 et ne remplace pas sa CI. Il vérifie
les réponses de l'API Supabase **sur une préproduction LoveRoll isolée**, avec
trois **vrais** jetons Auth de comptes fictifs A, B et C, plus une requête
anonyme. Il n'effectue que des requêtes HTTP GET. Il ne crée aucun compte,
n'envoie aucune invitation et ne change aucun membre.

## Préparer la préproduction

1. Contrôler que l'URL est celle de la **préproduction**, jamais la production.
   Déployer et examiner sur celle-ci les deux migrations LR-028 dans l'ordre.
2. Créer trois comptes fictifs vérifiés A, B et C et un couple fictif A/B.
   Créer une invitation A vers B **en attente, non expirée**, le même jour
   civil à Toronto. Relever l'ID du couple et celui de l'invitation, puis
   obtenir les jetons d'accès Auth des trois comptes de test.
3. Sur une machine de test sûre, fournir les variables ci-dessous sans les
   publier, les enregistrer dans GitHub, les ajouter à un ticket ou afficher
   les jetons dans les logs.

Variables nécessaires : LR028_ALLOW_STAGING_READONLY=YES,
LR028_STAGING_URL, LR028_STAGING_ANON_KEY, LR028_STAGING_COUPLE_ID,
LR028_STAGING_INVITATION_ID, LR028_STAGING_A_JWT,
LR028_STAGING_B_JWT, LR028_STAGING_C_JWT et LR028_STAGING_MODE.

La « anon key » désigne la clé **publique** de ce projet.
Ne jamais utiliser une clé service_role ou secrète.

## Ordre de vérification

Après configuration des variables, exécuter depuis la racine du dépôt :

~~~sh
LR028_STAGING_MODE=active node couple-web/qa/lr028-staging-auth.mjs
~~~

Attendu : A et B voient la même invitation en attente, C ne voit aucune ligne
et sa RPC est refusée; l'anonyme ne peut pas lire d'invitation ni appeler la
RPC. **Ne pas poursuivre si cette référence initiale échoue.**

Sur la **préproduction uniquement**, remplacer B par C dans le couple sans
supprimer l'invitation d'origine, puis exécuter :

~~~sh
LR028_STAGING_MODE=recipient-replaced node couple-web/qa/lr028-staging-auth.mjs
~~~

Attendu : tous les SELECT authentifiés sont vides; A et C reçoivent
state=none sans identifiants privés; B n'a plus accès à la RPC.

Repartir d'une **nouvelle invitation en attente A→B** dans un couple de test
équivalent, avec les nouveaux IDs et jetons requis, puis remplacer A par C
avant expiration, sans supprimer l'invitation. Exécuter :

~~~sh
LR028_STAGING_MODE=sender-replaced node couple-web/qa/lr028-staging-auth.mjs
~~~

Attendu : aucune ligne n'est visible; B et C reçoivent un statut vide sans
identifiants privés, et A reçoit un refus d'accès.

L'outil n'envoie pas la réponse à l'invitation : les permissions d'écriture
doivent être testées séparément dans une préproduction jetable avec des
comptes fictifs. Tous les scénarios exigent des JWT non expirés et un jeu
de données encore valable le jour du test.

## Contrôles automatisés sans secrets

~~~sh
node --test couple-web/qa/lr028-staging-auth.test.mjs
~~~

Cette suite emploie des réponses HTTP simulées; elle doit réussir en CI mais
**ne prouve pas** la configuration Supabase réelle. L'exécution staging réelle
est volontairement manuelle; aucun identifiant n'est fourni à GitHub Actions.
