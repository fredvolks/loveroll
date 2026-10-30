# LoveRoll LR-026 — recette Supabase A/B (STAGING SEULEMENT)

**Jamais de production.** Le projet LoveRoll de production `ejsrqfpkgwraorrznjpm` est interdit par le code. Aucune branche de staging n'était disponible au 30 octobre 2026. Ne pas créer de projet/branche facturable sans accord.

## Ce qui peut être exécuté

- `--check` : valide les paramètres, le domaine HTTPS exact, le projet distinct et la clé **publique**. Aucune requête réseau.
- `--auth` : ouvre deux vraies sessions Supabase Auth distinctes, confirme les identités auprès de GoTrue, puis vérifie la lecture de la soirée et des adhésions au duo sous les vraies règles RLS. Aucune mutation du jeu.
- `--audit` : exige un troisième vrai compte Auth C qui appartient à **un autre duo** avec une séance distincte. Avant de tester les refus, A, B et C doivent **chacun voir au moins un défi dont ils sont le destinataire** dans leur propre soirée, sans voir la carte du partenaire. Cela évite un faux succès quand la table des défis est vide ou illisible pour tout le monde. Ensuite, il vérifie que C ne voit ni la séance, ni les adhésions, ni les défis A/B, et qu’A/B ne voient pas ceux de C. **Douze lectures inter-duos doivent être refusées par RLS** : pour chaque autre couple, séance, adhésions, défis destinataires et D6. Les partenaires A et B doivent lire chacun les deux D6 de leur duo, et C doit voir son propre D6 fictif; autrement, un refus sur une table vide ne prouve rien. Aucun appel RPC de jeu, aucune écriture.
- `--play` : avec une confirmation d'écriture supplémentaire, teste une soirée **fictive et vierge** (deux D6 enregistrés, `paired_turns=false`, `self_draws=false`) : A pige un D100 réel, B passe, puis rejoue exactement cette demande. Le script confirme la seule nouvelle carte, l'identité du destinataire, la catégorie conservée et l'idempotence.

**Vérification des modes de séance sous A ET B :** avant toute pige D100 en mode `--play`, les comptes A et B doivent **chacun** relire la même séance et voir `paired_turns=false` et `self_draws=false`. Une divergence dans le résultat RLS, une séance erronée ou le mode de pige différent chez B fait arrêter la recette **avant tout RPC de jeu** (tests de régression inclus). La validation ne repose plus uniquement sur la vue de A.

**Auteur de la carte de remplacement :** après « Passer », le nouveau défi doit être **offert par A à B**, comme le défi initial. Le contrôle de persistance avant le rejeu refuse désormais une carte remplacée prétendument créée par B, même si son destinataire, son statut et sa catégorie semblent corrects. Ce défaut bloque le rejeu plutôt que d'émettre un second appel RPC.

**Protection contre un duo mal configuré :** avant toute mutation, chaque compte A et B doit voir **exactement deux membres** dans `couple_members` : A et B, une seule fois chacun. Cela détecte un troisième membre, un partenaire masqué par les RLS ou une appartenance inattendue. Cette vérification précède le D100, car `draw_for_partner` choisit le membre différent du lanceur; avec un troisième membre, il pourrait donner un défi à la mauvaise personne avant que le test le remarque.

**Protection contre les cartes invisibles au lanceur :** la RLS réelle `challenges_read` autorise un défi uniquement à son **destinataire**. Une liste de défis vide pour A ne démontre donc pas qu'aucune carte destinée à B n'existe. Le mode `--play` vérifie désormais **le même identifiant de soirée sous les comptes A et B séparément**, et abandonne avant le D100 si l'un des deux aperçoit un défi. Il vérifie aussi que chacun voit les deux D6 valides (pas seulement le lanceur A). Le résultat final est confirmé sous B et l'absence de cartes parasites est confirmée sous A.

**Catégorie SEXUEL vérifiée par de vrais RPC, dans les deux sens :** la suite `lr026-real-rpc-e2e.test.sql` utilise maintenant un **second duo fictif** et une nouvelle soirée sur le PostgreSQL jetable, avec uniquement huit cartes SEXUEL éligibles et toutes les cartes SENSUEL exclues. Elle exécute les deux vraies fonctions SQL contrôlées par empreinte pour une pige A→B et une pige B→A. Elle prouve que la catégorie est toujours SEXUEL, que seul le destinataire peut répondre, que B peut utiliser « Passer » et qu'A peut utiliser « Refuser » avec exclusion, même si les deux jouent dans une même soirée. Chaque réponse doit créer une seule carte de remplacement dans la catégorie originale avec un autre numéro et une autre face D100; le statut, le tampon temporel, l'exclusion du cycle et les deux rejeux idempotents sont vérifiés. Les quatre défis attendus et les deux reçus de réponse sont comptés. Ce test SQL ne requiert **aucun compte Supabase hébergé**, reste transactionnel et se termine par un `ROLLBACK`.

**Validation SQL réelle du refus dans le sens B→A :** en plus du simulateur Node, la suite `lr026-real-rpc-e2e.test.sql` exécute maintenant la **véritable** fonction SQL `love_respond_and_redraw` clonée et contrôlée par empreinte, après une pige B→A et un premier « Passer » d'A. Le test vérifie ensuite le refus **par A seulement** de sa carte de remplacement avec exclusion, la persistance du statut `refused`, de la date de refus et de l'exclusion au cycle, l'attribution correcte de la nouvelle carte offerte par B, sa catégorie ainsi que l'absence de répétition du numéro ou de la face D100. Il rejoue « Refuser » pour confirmer l'idempotence, le seul reçu de réponse et le maintien des quotas « Passer » séparés A/B. **Base PostgreSQL 17 jetable uniquement**, sans compte ou carte réelle et sans toucher à Supabase hébergé.

**Parcours bidirectionnel A→B et B→A :** le mode `--play` valide désormais les **deux sens de pige**. Avec `LR026_STAGING_DRAWER=B`, B appelle `draw_for_partner`, A est le destinataire qui répond `pass` ou `refuse` et qui lit seul les cartes sous la politique RLS destinataire; la vue du donneur B doit rester vide. Les mêmes contrôles D6, adhésions, catégorie, carte/face D100 et répétition idempotente s'appliquent sans inversion des permissions. La valeur `A` garde l'ancien parcours sans régression. Une valeur inconnue est refusée sans accès réseau. Les tests vérifient les jetons des RPC et les huit lectures de cartes, ainsi qu'un défi préexistant adressé à A mais invisible au donneur B. **Ne pas tester les deux directions sur la même soirée**, puisque `--play` exige une soirée vierge.

**Réponse RPC D100 identique au défi enregistré :** avant de permettre « Passer » ou « Refuser », la recette vérifie maintenant `session_id`, `couple_id`, `offered_by`, `recipient`, `category`, `face` et `card_id` de la réponse originale du RPC. La face et l'identifiant de carte doivent être des entiers entre 1 et 100 et correspondre **exactement** à ce que le destinataire B lit réellement dans `couple_challenges`. Six scénarios négatifs couvrent une mauvaise séance, un mauvais duo, des valeurs D100 invalides, une face incohérente ou une carte différente entre la réponse et sa persistance. La première réponse « Passer » / « Refuser » doit aussi confirmer `replacement_unavailable=false` : un serveur signalant un remplacement indisponible ne peut pas produire un faux succès, même s'il renvoie un identifiant. Ces vérifications n'ajoutent aucune écriture et stoppent tout RPC de réponse après une pige incohérente.

**Passer / Refuser / exclusion et unicité du D100 :** le mode `--play` permet maintenant de tester `LR026_STAGING_ACTION=pass` (valeur par défaut) ou `refuse`. Pour un refus, `LR026_STAGING_EXCLUDE=true` permet d'exercer l'exclusion de la carte du cycle; la valeur par défaut est `false`. Un `pass` avec exclusion ou toute valeur inconnue est **refusé avant réseau**. Le statut enregistré doit être exactement `passed` pour `pass` ou `refused` pour `refuse`; les deux réponses RPC doivent conserver l'action et le même indicateur d'exclusion. En plus de la catégorie, la recette vérifie désormais que les deux cartes ont un `card_id` et une face D100 entiers entre 1 et 100, et que **la repige change à la fois le numéro de carte et la face**. Une répétition du même `card_id`, une face identique ou une valeur invalide fait échouer la recette avant tout rejeu du RPC. Les tests simulent les trois combinaisons valides, les choix interdits, les doublons et une réponse idempotente qui changerait l'exclusion. Chaque essai réel nécessite une soirée de test **nouvelle et vierge**; aucune carte réelle n'est modifiée par la CI.

**Tests négatifs complémentaires des catégories :** le mode `--play` refuse aussi la catégorie non officielle renvoyée par D100 sans appeler « Passer », une carte `SEXUEL` enregistrée à tort en `SENSUEL` avant tout « Passer », et une répétition idempotente qui aurait discrètement transformé une carte de remplacement `SEXUEL` en `SENSUEL`. Ces tests couvrent chaque frontière de persistance de la catégorie, tout en laissant le serveur choisir la catégorie officielle avant la comparaison.

**Deux catégories D100 et rejouage de « Passer » :** la recette `--play` accepte maintenant l'option facultative `LR026_STAGING_PREFERENCE=SENSUEL` (valeur par défaut) ou `LR026_STAGING_PREFERENCE=SEXUEL`, transmise à `draw_for_partner` avec `p_random=false`. Une valeur différente est refusée **avant tout accès réseau**. La préférence n'impose pas arbitrairement la catégorie renvoyée : le résultat serveur `SENSUEL` ou `SEXUEL` demeure la référence pour l'original, le remplacement et son rejeu idempotent. Les tests simulent les deux préférences, une véritable carte `SEXUEL` (y compris avec la préférence `SENSUEL`) et un remplacement qui dévie vers l'autre catégorie, bloqué avant le rejeu. Chaque essai mutatif réel nécessite une **nouvelle séance fictive vierge**, distincte : ne jamais relancer `--play` sur une séance déjà utilisée.

**Séance et membres inchangés pendant toute la recette :** le contrôle `--play` relit **sous A et sous B**, après chaque RPC de jeu, la séance active (`id`, `couple_id`, `finished_at=null`, `paired_turns=false`, `self_draws=false`) et les deux membres exacts du duo (A et B, sans troisième compte ni partenaire masqué). Ces relectures sont faites **après D100 avant « Passer »**, **après le premier « Passer » avant le rejeu**, et **après le rejeu idempotent**. Une soirée terminée, déplacée dans un autre duo, inaccessible à B, passée en mode différent ou dont un membre est remplacé fait échouer la recette. Les tests injectent onze changements de séance ou d'adhésion à différents moments et vérifient que l'appel « Passer » suivant n'est pas envoyé après une incohérence.

**Invariance des D6 pendant le cycle D100/Passer :** la recette mémorise les deux faces initiales par propriétaire avant toute mutation et les relit **sous A et sous B** trois fois : après le D100 avant « Passer », après le premier « Passer » avant son rejeu et après le rejeu idempotent. Si une face change (même avec deux faces toujours valides), si les comptes voient deux instantanés différents ou si une ligne D6 disparaît, le test s'arrête. Aucun « Passer » n'est envoyé après une mutation D6 apparue au D100; aucun rejeu n'est envoyé si la mutation survient pendant le premier « Passer ». Une mutation constatée seulement après le rejeu fait échouer le test et interdit de réutiliser la séance fictive. Les tests injectent les trois moments de mutation et une divergence visible uniquement par B.

**Cohérence D6 A/B avant toute mutation :** les modes `--audit` (lecture seule) et `--play` exigent maintenant que les deux séances authentifiées A et B retournent **les mêmes faces D6 pour chaque propriétaire**, et non simplement deux valeurs individuellement valides. Une différence de face sous B provoque un arrêt (et, en mode `--play`, **zéro appel D100 ou Passer**). L'ordre des lignes PostgREST peut différer : la comparaison est faite par `user_id`. Les tests couvrent des faces divergentes, des faces inversées et le retour des lignes dans un ordre inversé.

**Validation entre « Passer » et sa répétition :** l'essai `--play` lit maintenant les deux défis réellement enregistrés sous B et vérifie qu'aucun n'est visible sous A **avant de tenter une seconde fois le même RPC**. Si le premier « Passer » a enregistré une carte supplémentaire, supprimé une carte, changé la catégorie, le destinataire, le statut ou le lien vers l'ancienne carte, la recette s'arrête à un seul appel « Passer ». Une fois la répétition autorisée, elle exige la même réponse (identifiant de remplacement et action) et **compare un instantané complet des champs persistés avant/après**, trié par identifiant pour ignorer uniquement l'ordre des lignes. Les tests injectent aussi une modification silencieuse malgré une réponse prétendument idempotente. En cas d'échec, ne pas relancer `--play` sur la même séance : inspecter les données fictives et préparer une nouvelle fixture.

**Contrôle intermédiaire immédiatement après D100 :** avant toute demande « Passer », la recette lit le défi réellement enregistré **sous B puis sous A**. Elle exige **exactement une proposition neuve**, avec le bon identifiant renvoyé par le RPC, la séance, l'émetteur A, le destinataire B, la catégorie et le statut `proposed`, sans lien de remplacement. A ne doit voir aucun défi; sinon la recette **arrête avant toute repige**, sans supprimer les données ni relancer la pige. Dix tests négatifs couvrent : aucune carte persistée, carte supplémentaire, mauvais identifiant, mauvaise séance, mauvais émetteur, mauvais destinataire, mauvaise catégorie, statut incorrect, lien de remplacement inattendu et carte destinée à A. Le résultat du RPC, à lui seul, n'est jamais accepté comme preuve de persistance.

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
| `LR026_STAGING_PREFERENCE` | Facultative pour `--play` : `SENSUEL` (défaut) ou `SEXUEL`; toute autre valeur est refusée avant réseau. Utiliser une nouvelle soirée vierge pour chaque essai. |
| `LR026_STAGING_DRAWER` | Facultative pour `--play` : `A` (défaut, A pige pour B) ou `B` (B pige pour A); toute autre valeur est refusée avant connexion. Une soirée vierge distincte par essai. |
| `LR026_STAGING_ACTION` | Facultative pour `--play` : `pass` (défaut) ou `refuse` |
| `LR026_STAGING_EXCLUDE` | Facultative pour `--play` : chaîne `false` (défaut) ou `true` seulement avec `refuse` |
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
