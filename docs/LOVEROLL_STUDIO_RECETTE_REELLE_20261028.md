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
