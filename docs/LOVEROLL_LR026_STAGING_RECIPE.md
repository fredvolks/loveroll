# LoveRoll LR-026 — recette Supabase A/B (STAGING SEULEMENT)

**Jamais de production.** Le projet LoveRoll de production `ejsrqfpkgwraorrznjpm` est interdit par le code. Aucune branche de staging n'était disponible au 30 octobre 2026. Ne pas créer de projet/branche facturable sans accord.

## Ce qui peut être exécuté

- `--check` : valide les paramètres, le domaine HTTPS exact, le projet distinct et la clé **publique**. Aucune requête réseau.
- `--auth` : ouvre deux vraies sessions Supabase Auth distinctes, confirme les identités auprès de GoTrue, puis vérifie la lecture de la soirée et des adhésions au duo sous les vraies règles RLS. Aucune mutation du jeu.
- `--audit` : exige un troisième vrai compte Auth C qui appartient à **un autre duo** avec une séance distincte. Avant de tester les refus, A, B et C doivent **chacun voir au moins un défi dont ils sont le destinataire** dans leur propre soirée, sans voir la carte du partenaire. Cela évite un faux succès quand la table des défis est vide ou illisible pour tout le monde. Ensuite, il vérifie que C ne voit ni la séance, ni les adhésions, ni les défis A/B, et qu’A/B ne voient pas ceux de C. **Douze lectures inter-duos doivent être refusées par RLS** : pour chaque autre couple, séance, adhésions, défis destinataires et D6. Les partenaires A et B doivent lire chacun les deux D6 de leur duo, et C doit voir son propre D6 fictif; autrement, un refus sur une table vide ne prouve rien. Aucun appel RPC de jeu, aucune écriture.
- `--play` : avec une confirmation d'écriture supplémentaire, teste une soirée **fictive et vierge** (deux D6 enregistrés, `paired_turns=false`, `self_draws=false`) : A pige un D100 réel, B passe, puis rejoue exactement cette demande. Le script confirme la seule nouvelle carte, l'identité du destinataire, la catégorie conservée et l'idempotence.

**Protection contre un duo mal configuré :** avant toute mutation, chaque compte A et B doit voir **exactement deux membres** dans `couple_members` : A et B, une seule fois chacun. Cela détecte un troisième membre, un partenaire masqué par les RLS ou une appartenance inattendue. Cette vérification précède le D100, car `draw_for_partner` choisit le membre différent du lanceur; avec un troisième membre, il pourrait donner un défi à la mauvaise personne avant que le test le remarque.

**Protection contre les cartes invisibles au lanceur :** la RLS réelle `challenges_read` autorise un défi uniquement à son **destinataire**. Une liste de défis vide pour A ne démontre donc pas qu'aucune carte destinée à B n'existe. Le mode `--play` vérifie désormais **le même identifiant de soirée sous les comptes A et B séparément**, et abandonne avant le D100 si l'un des deux aperçoit un défi. Il vérifie aussi que chacun voit les deux D6 valides (pas seulement le lanceur A). Le résultat final est confirmé sous B et l'absence de cartes parasites est confirmée sous A.

**Contrôle final après D100 et Passer :** le script vérifie les cartes persistées séparément sous B **et** sous A, car la politique RLS ne permet pas à B de détecter une carte indue destinée à A. Le résultat attendu est exactement deux cartes sous B (originale passée et remplacement proposé), **zéro sous A**, les identifiants de séance et de destinataire corrects, la catégorie officielle conservée et l'émetteur A correct sur la carte originale. Quatre tests négatifs simulent une carte parasite destinée à A, une fuite RLS vers A, une catégorie corrompue et un destinataire incorrect; l'échec est signalé sans suppression ni répétition automatique des mutations.

**Important** : le script ne provisionne pas de comptes, ne restaure pas de soirée et ne répète pas automatiquement les mutations en cas d'échec. Il conserve les résultats de test sur le seul staging. S'il échoue en cours de route, inspecter la base puis utiliser une autre soirée fictive.

## Prérequis

1. Préparer un **projet Supabase distinct** de LoveRoll production, avec schéma, fonctions SQL et politiques RLS installés sur le staging sans contenu de vrais joueurs. Vérifier le prévol LR-026 et appliquer la migration uniquement sur cette base isolée.
2. Créer deux vrais comptes Auth **de test** A et B, avec courriels confirmés, qui appartiennent au même duo fictif. Pour le mode `--audit`, créer aussi un compte C, avec son **autre duo fictif** et une autre soirée active; C ne doit jamais faire partie du duo A/B.
   Pour `--audit`, prévoir **une carte fictive destinée à A, une destinée à B et une destinée à C** dans les deux soirées de test respectives, ainsi que les **deux D6 fictifs A/B** et **au moins le D6 de C** dans sa soirée distincte. Le mode `--play` demande au contraire une séance A/B complètement vierge : utiliser **une autre soirée fictive** pour ce mode.
3. Préparer une soirée fictive active. Pour `--play` : **exactement deux D6 de la bonne soirée**, un pour A et un pour B, avec faces entières de 1 à 6 et lisibles sous **les deux identités**; aucun défi existant, tour classique non alterné et un quota Passer restant pour B. Le précontrôle bloque toute pige si un D6 manque, est dupliqué, pointe vers une autre soirée, porte le mauvais utilisateur ou n'est pas visible par B.
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
| `LR026_STAGING_C_EMAIL`, `LR026_STAGING_C_PASSWORD`, `LR026_STAGING_C_ID` | Pour `--audit` seulement : troisième vrai compte test (extérieur à A/B) |
| `LR026_STAGING_OTHER_COUPLE_ID`, `LR026_STAGING_OTHER_SESSION_ID` | Pour `--audit` seulement : autre duo et autre soirée exclusivement associés à C |
| `LR026_STAGING_COUPLE_ID`, `LR026_STAGING_SESSION_ID` | UUID du duo et de la soirée de test |
| `LR026_STAGING_ALLOW_WRITES` | Pour `--play` seulement : `I_ACCEPT_TEST_PROJECT_WRITES_ONLY` |
| `LR026_STAGING_WRITE_CONFIRM_REF` | Pour `--play` seulement : confirmation indépendante du project ref de staging |

## Commandes (depuis la racine)

~~~bash
# Ne contacte aucun serveur
node couple-web/lr026-staging-verify.mjs --check
# Connexions réelles et lectures RLS, aucune mutation de cartes
node couple-web/lr026-staging-verify.mjs --auth
# Trois comptes réels : isolation bidirectionnelle des duos (lecture seule)
node couple-web/lr026-staging-verify.mjs --audit
# Après double confirmation et préparation d'une nouvelle soirée de test
node couple-web/lr026-staging-verify.mjs --play
~~~

Pour la CI, sans clés ni utilisateurs réels :

~~~bash
node --check couple-web/lr026-staging-recipe.mjs
node --check couple-web/lr026-staging-verify.mjs
node --test couple-web/lr026-staging-recipe.test.mjs
node --test couple-web/lr026-staging-audit.test.mjs
~~~

## Précontrôle PostgreSQL RLS (lecture seule)

Le nouveau fichier `couple-web/lr026-staging-readiness.sql` vérifie dans le catalogue PostgreSQL, sans lire de cartes ni toucher aux comptes, que les quatre tables du jeu (`couple_sessions`, `couple_members`, `couple_personal_rolls`, `couple_challenges`) :

- ont le RLS activé, sont lisibles par `authenticated` mais pas par `anon`;
- ont chacune une politique **restrictive** exigeant le courriel vérifié;
- ont les autorisations `SELECT` liées à l'appartenance au duo (et au destinataire pour les défis);
- n'ont **aucune autre politique de lecture permissive** qui contournerait l'isolation du duo;
- utilisent les deux fonctions de pige et de réponse comme `SECURITY DEFINER` avec recherche de schéma définie, accessibles uniquement à `authenticated`;
- ont bien la migration de variété LR-026 installée dans les deux RPC.

Le résultat est un code `PASS|0|` ou `FAIL|nombre|règles_en_échec`. Exécuter avec `psql -X -At -v ON_ERROR_STOP=1 -f couple-web/lr026-staging-readiness.sql` **sur une base de staging distincte uniquement**, APRÈS installation de la migration et des politiques RLS.

Les nouveaux fichiers `couple-web/lr026-staging-rls-fixture.sql`, `couple-web/lr026-staging-rls.test.sql` et `couple-web/lr026-staging-rls.test.sh` font tourner les règles de production précédemment vérifiées sur un PostgreSQL 17 **jetable en CI**. Les tests sont exécutés réellement sous le rôle `authenticated` avec des identités synthétiques A/B/C, et valident le cloisonnement inter-duos, la lecture D6, les cartes privées réservées au destinataire, l'utilisateur sans duo et le blocage des courriels non confirmés. Quatre modifications délibérément dangereuses (RLS désactivé, lecture anonyme, vérification de courriel permissive, nouvelle politique `SELECT` permissive) sont détectées puis annulées par des transactions SQL.

**Limite :** cette CI reproduit les politiques et les fonctions observées en lecture seule, mais **n'est pas une preuve d'exécution sur l'hébergement Supabase**. Avant publication, il faut encore lancer `--auth`, `--audit` et `--play` contre un vrai staging distinct avec de vrais comptes GoTrue.

## Verrous et limites

Le script vérifie **avant la connexion** le project ref, l'absence de production, la concordance HTTPS, les UUID, la distinction des comptes, la clé publique et les confirmations d'écriture. Il rejette les clés `sb_secret_`, `service_role`, et les variables contenant des clés service-role connues. Il n'utilise pas de clé d'administration. Les résultats ne contiennent ni mots de passe ni jetons.

Les appels Auth et PostgREST refusent désormais les redirections et désactivent la mise en cache, pour ne jamais réexpédier un jeton vers un autre hôte ou conserver les données personnelles dans un cache local. Le mode `--audit` exige des **preuves positives** de lecture des séances, membres, D6 et cartes fictifs avant d'accepter les **douze refus inter-duos**; un résultat vide sur toute une table (ou l'absence de droits pour C) ne peut pas produire un faux succès.

Un succès dans les tests GitHub **ne signifie pas** que le staging réel a été exécuté. La recette complète en staging avec de vraies sessions et RLS, des essais d'accès inter-duo, les favoris, le cycle 200 et les contrôles iPad/Android/PC restent obligatoires avant toute fusion et publication.
