# LoveRoll LR-026 — recette Supabase A/B (STAGING SEULEMENT)

**Jamais de production.** Le projet LoveRoll de production `ejsrqfpkgwraorrznjpm` est interdit par le code. Aucune branche de staging n'était disponible au 30 octobre 2026. Ne pas créer de projet/branche facturable sans accord.

## Ce qui peut être exécuté

- `--check` : valide les paramètres, le domaine HTTPS exact, le projet distinct et la clé **publique**. Aucune requête réseau.
- `--auth` : ouvre deux vraies sessions Supabase Auth distinctes, confirme les identités auprès de GoTrue, puis vérifie la lecture de la soirée et des adhésions au duo sous les vraies règles RLS. Aucune mutation du jeu.
- `--play` : avec une confirmation d'écriture supplémentaire, teste une soirée **fictive et vierge** (deux D6 enregistrés, `paired_turns=false`, `self_draws=false`) : A pige un D100 réel, B passe, puis rejoue exactement cette demande. Le script confirme la seule nouvelle carte, l'identité du destinataire, la catégorie conservée et l'idempotence.

**Important** : le script ne provisionne pas de comptes, ne restaure pas de soirée et ne répète pas automatiquement les mutations en cas d'échec. Il conserve les résultats de test sur le seul staging. S'il échoue en cours de route, inspecter la base puis utiliser une autre soirée fictive.

## Prérequis

1. Préparer un **projet Supabase distinct** de LoveRoll production, avec schéma, fonctions SQL et politiques RLS installés sur le staging sans contenu de vrais joueurs. Vérifier le prévol LR-026 et appliquer la migration uniquement sur cette base isolée.
2. Créer deux vrais comptes Auth **de test** A et B, avec courriels confirmés, qui appartiennent au même duo fictif.
3. Préparer une soirée fictive active. Pour `--play` : deux D6 présents, aucun défi existant, tour classique non alterné et un quota Passer restant pour B.
4. Exécuter localement avec Node.js >= 22, depuis la racine du dépôt, en fournissant les variables sensibles dans l'environnement privé (ne pas les écrire dans GitHub).

## Variables

| Variable | Valeur attendue |
| --- | --- |
| `LR026_STAGING_REF` | Project ref de staging (20 caractères) |
| `LR026_CONFIRM_STAGING_REF` | Confirmation exacte du project ref de test |
| `LR026_STAGING_PUBLISHABLE_KEY` | Clé publique `sb_publishable_...` ou ancien JWT Supabase de rôle `anon` |
| `LR026_STAGING_URL` | Facultative, doit être exactement `https://<ref>.supabase.co` |
| `LR026_PRODUCTION_REF` | Facultative, une autre ref de production à bloquer |
| `LR026_STAGING_A_EMAIL`, `LR026_STAGING_A_PASSWORD`, `LR026_STAGING_A_ID` | Courriel, mot de passe et UUID Auth de test A |
| `LR026_STAGING_B_EMAIL`, `LR026_STAGING_B_PASSWORD`, `LR026_STAGING_B_ID` | Courriel, mot de passe et UUID Auth de test B (distincts) |
| `LR026_STAGING_COUPLE_ID`, `LR026_STAGING_SESSION_ID` | UUID du duo et de la soirée de test |
| `LR026_STAGING_ALLOW_WRITES` | Pour `--play` seulement : `I_ACCEPT_TEST_PROJECT_WRITES_ONLY` |
| `LR026_STAGING_WRITE_CONFIRM_REF` | Pour `--play` seulement : confirmation indépendante du project ref de staging |

## Commandes (depuis la racine)

~~~bash
# Ne contacte aucun serveur
node couple-web/lr026-staging-verify.mjs --check
# Connexions réelles et lectures RLS, aucune mutation de cartes
node couple-web/lr026-staging-verify.mjs --auth
# Après double confirmation et préparation d'une nouvelle soirée de test
node couple-web/lr026-staging-verify.mjs --play
~~~

Pour la CI, sans clés ni utilisateurs réels :

~~~bash
node --check couple-web/lr026-staging-recipe.mjs
node --check couple-web/lr026-staging-verify.mjs
node --test couple-web/lr026-staging-recipe.test.mjs
~~~

## Verrous et limites

Le script vérifie **avant la connexion** le project ref, l'absence de production, la concordance HTTPS, les UUID, la distinction des comptes, la clé publique et les confirmations d'écriture. Il rejette les clés `sb_secret_`, `service_role`, et les variables contenant des clés service-role connues. Il n'utilise pas de clé d'administration. Les résultats ne contiennent ni mots de passe ni jetons.

Un succès dans les tests GitHub **ne signifie pas** que le staging réel a été exécuté. La recette complète en staging avec de vraies sessions et RLS, des essais d'accès inter-duo, les favoris, le cycle 200 et les contrôles iPad/Android/PC restent obligatoires avant toute fusion et publication.
