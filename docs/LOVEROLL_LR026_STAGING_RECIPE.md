# LoveRoll LR-026 — recette Supabase A/B (STAGING SEULEMENT)

**Jamais de production.** Le projet LoveRoll de production `ejsrqfpkgwraorrznjpm` est interdit par le code. Aucune branche de staging n'était disponible au 30 octobre 2026. Ne pas créer de projet/branche facturable sans accord.

## Ce qui peut être exécuté

- `--check` : valide les paramètres, le domaine HTTPS exact, le projet distinct et la clé **publique**. Aucune requête réseau.
- `--auth` : ouvre deux vraies sessions Supabase Auth distinctes, confirme les identités auprès de GoTrue, puis vérifie la lecture de la soirée et des adhésions au duo sous les vraies règles RLS. Aucune mutation du jeu.
- `--ready` : vérifie la soirée vierge, les deux D6 et la cohérence des vues A/B sous RLS, sans RPC ni mutation, avant tout essai D100.
- `--audit` : exige un troisième vrai compte Auth C qui appartient à **un autre duo** avec une séance distincte. Avant de tester les refus, A, B et C doivent **chacun voir au moins un défi dont ils sont le destinataire** dans leur propre soirée, sans voir la carte du partenaire. Cela évite un faux succès quand la table des défis est vide ou illisible pour tout le monde. Ensuite, il vérifie que C ne voit ni la séance, ni les adhésions, ni les défis A/B, et qu’A/B ne voient pas ceux de C. **Douze lectures inter-duos doivent être refusées par RLS** : pour chaque autre couple, séance, adhésions, défis destinataires et D6. Les partenaires A et B doivent lire chacun les deux D6 de leur duo, et C doit voir son propre D6 fictif; autrement, un refus sur une table vide ne prouve rien. Aucun appel RPC de jeu, aucune écriture.
- `--play` : avec une confirmation d'écriture supplémentaire, teste une soirée **fictive et vierge** (deux D6 enregistrés, `paired_turns=false`, `self_draws=false`) : A pige un D100 réel, B passe, puis rejoue exactement cette demande. Le script confirme la seule nouvelle carte, l'identité du destinataire, la catégorie conservée et l'idempotence.

**Vérification des modes de séance sous A ET B :** avant toute pige D100 en mode `--play`, les comptes A et B doivent **chacun** relire la même séance et voir `paired_turns=false` et `self_draws=false`. Une divergence dans le résultat RLS, une séance erronée ou le mode de pige différent chez B fait arrêter la recette **avant tout RPC de jeu** (tests de régression inclus). La validation ne repose plus uniquement sur la vue de A.

**Auteur de la carte de remplacement :** après « Passer », le nouveau défi doit être **offert par A à B**, comme le défi initial. Le contrôle de persistance avant le rejeu refuse désormais une carte remplacée prétendument créée par B, même si son destinataire, son statut et sa catégorie semblent corrects. Ce défaut bloque le rejeu plutôt que d'émettre un second appel RPC.

**Protection contre un duo mal configuré :** avant toute mutation, chaque compte A et B doit voir **exactement deux membres** dans `couple_members` : A et B, une seule fois chacun. Cela détecte un troisième membre, un partenaire masqué par les RLS ou une appartenance inattendue. Cette vérification précède le D100, car `draw_for_partner` choisit le membre différent du lanceur; avec un troisième membre, il pourrait donner un défi à la mauvaise personne avant que le test le remarque.

**Protection contre les cartes invisibles au lanceur :** la RLS réelle `challenges_read` autorise un défi uniquement à son **destinataire**. Une liste de défis vide pour A ne démontre donc pas qu'aucune carte destinée à B n'existe. Le mode `--play` vérifie désormais **le même identifiant de soirée sous les comptes A et B séparément**, et abandonne avant le D100 si l'un des deux aperçoit un défi. Il vérifie aussi que chacun voit les deux D6 valides (pas seulement le lanceur A). Le résultat final est confirmé sous B et l'absence de cartes parasites est confirmée sous A.

**Repli sur des cartes toutes semblables — vraie pige SQL :** une quatrième soirée fictive de `lr026-real-rpc-e2e.test.sql` ne comporte plus que deux cartes SENSUEL autorisées avec le **même titre significatif**, déjà vu dans la soirée chez l'autre destinataire. Le test exige que le score de similarité du serveur classe **les deux** candidats comme semblables, mais que la vraie RPC `draw_for_partner` puisse quand même piger l'une des deux, sans altérer la catégorie ou les règles d'admissibilité. Le destinataire peut ensuite « Passer » et obtenir l'autre carte avec une face D100 différente, puis rejouer l'action sans créer de doublon. Ce scénario détecte toute future modification qui transformerait la préférence de variété en interdiction absolue et bloquerait la soirée lorsqu'il reste peu de cartes. PostgreSQL jetable, transaction annulée à la fin, aucune donnée réelle.

**Catégorie SEXUEL vérifiée par de vrais RPC, dans les deux sens :** la suite `lr026-real-rpc-e2e.test.sql` utilise maintenant un **second duo fictif** et une nouvelle soirée sur le PostgreSQL jetable, avec uniquement huit cartes SEXUEL éligibles et toutes les cartes SENSUEL exclues. Elle exécute les deux vraies fonctions SQL contrôlées par empreinte pour une pige A→B et une pige B→A. Elle prouve que la catégorie est toujours SEXUEL, que seul le destinataire peut répondre, que B peut utiliser « Passer » et qu'A peut utiliser « Refuser » avec exclusion, même si les deux jouent dans une même soirée. Chaque réponse doit créer une seule carte de remplacement dans la catégorie originale avec un autre numéro et une autre face D100; le statut, le tampon temporel, l'exclusion du cycle et les deux rejeux idempotents sont vérifiés. Les quatre défis attendus et les deux reçus de réponse sont comptés. Ce test SQL ne requiert **aucun compte Supabase hébergé**, reste transactionnel et se termine par un `ROLLBACK`.

**Validation SQL réelle du refus dans le sens B→A :** en plus du simulateur Node, la suite `lr026-real-rpc-e2e.test.sql` exécute maintenant la **véritable** fonction SQL `love_respond_and_redraw` clonée et contrôlée par empreinte, après une pige B→A et un premier « Passer » d'A. Le test vérifie ensuite le refus **par A seulement** de sa carte de remplacement avec exclusion, la persistance du statut `refused`, de la date de refus et de l'exclusion au cycle, l'attribution correcte de la nouvelle carte offerte par B, sa catégorie ainsi que l'absence de répétition du numéro ou de la face D100. Il rejoue « Refuser » pour confirmer l'idempotence, le seul reçu de réponse et le maintien des quotas « Passer » séparés A/B. **Base PostgreSQL 17 jetable uniquement**, sans compte ou carte réelle et sans toucher à Supabase hébergé.

**Parcours bidirectionnel A→B et B→A :** le mode `--play` valide désormais les **deux sens de pige**. Avec `LR026_STAGING_DRAWER=B`, B appelle `draw_for_partner`, A est le destinataire qui répond `pass` ou `refuse` et qui lit seul les cartes sous la politique RLS destinataire; la vue du donneur B doit rester vide. Les mêmes contrôles D6, adhésions, catégorie, carte/face D100 et répétition idempotente s'appliquent sans inversion des permissions. La valeur `A` garde l'ancien parcours sans régression. Une valeur inconnue est refusée sans accès réseau. Les tests vérifient les jetons des RPC et les huit lectures de cartes, ainsi qu'un défi préexistant adressé à A mais invisible au donneur B. **Ne pas tester les deux directions sur la même soirée**, puisque `--play` exige une soirée vierge.

**Réponse RPC D100 identique au défi enregistré :** avant de permettre « Passer » ou « Refuser », la recette vérifie maintenant `session_id`, `couple_id`, `offered_by`, `recipient`, `category`, `face` et `card_id` de la réponse originale du RPC. La face et l'identifiant de carte doivent être des entiers entre 1 et 100 et correspondre **exactement** à ce que le destinataire B lit réellement dans `couple_challenges`. Six scénarios négatifs couvrent une mauvaise séance, un mauvais duo, des valeurs D100 invalides, une face incohérente ou une carte différente entre la réponse et sa persistance. La première réponse « Passer » / « Refuser » doit aussi confirmer `replacement_unavailable=false` : un serveur signalant un remplacement indisponible ne peut pas produire un faux succès, même s'il renvoie un identifiant. Ces vérifications n'ajoutent aucune écriture et stoppent tout RPC de réponse après une pige incohérente.

**Passer / Refuser / exclusion et unicité du D100 :** le mode `--play` permet maintenant de tester `LR026_STAGING_ACTION=pass` (valeur par défaut) ou `refuse`. Pour un refus, `LR026_STAGING_EXCLUDE=true` permet d'exercer l'exclusion de la carte du cycle; la valeur par défaut est `false`. Un `pass` avec exclusion ou toute valeur inconnue est **refusé avant réseau**. Le statut enregistré doit être exactement `passed` pour `pass` ou `refused` pour `refuse`; les deux réponses RPC doivent conserver l'action et le même indicateur d'exclusion. En plus de la catégorie, la recette vérifie désormais que les deux cartes ont un `card_id` et une face D100 entiers entre 1 et 100, et que **la repige change à la fois le numéro de carte et la face**. Une répétition du même `card_id`, une face identique ou une valeur invalide fait échouer la recette avant tout rejeu du RPC. Les tests simulent les trois combinaisons valides, les choix interdits, les doublons et une réponse idempotente qui changerait l'exclusion. Chaque essai réel nécessite une soirée de test **nouvelle et vierge**; aucune carte réelle n'est modifiée par la CI.

**Tests négatifs complémentaires des catégories :** le mode `--play` refuse aussi la catégorie non officielle renvoyée par D100 sans appeler « Passer », une carte `SEXUEL` enregistrée à tort en `SENSUEL` avant tout « Passer », et une répétition idempotente qui aurait discrètement transformé une carte de remplacement `SEXUEL` en `SENSUEL`. Ces tests couvrent chaque frontière de persistance de la catégorie, tout en laissant le serveur choisir la catégorie officielle avant la comparaison.

**Deux catégories D100 et rejouage de « Passer » :** la recette `--play` accepte maintenant l'option facultative `LR026_STAGING_PREFERENCE=SENSUEL` (valeur par défaut) ou `LR026_STAGING_PREFERENCE=SEXUEL`, transmise à `draw_for_partner` avec `p_random=false` **par défaut**. Une valeur différente est refusée **avant tout accès réseau**. La préférence n'impose pas arbitrairement la catégorie renvoyée : le résultat serveur `SENSUEL` ou `SEXUEL` demeure la référence pour l'original, le remplacement et son rejeu idempotent. Les tests simulent les deux préférences, une véritable carte `SEXUEL` (y compris avec la préférence `SENSUEL`) et un remplacement qui dévie vers l'autre catégorie, bloqué avant le rejeu. Chaque essai mutatif réel nécessite une **nouvelle séance fictive vierge**, distincte : ne jamais relancer `--play` sur une séance déjà utilisée.

**Mode D100 aléatoire officiel (test A↔B) :** `LR026_STAGING_RANDOM=true` active explicitement `p_random=true` dans le RPC réel, tout en préservant `LR026_STAGING_PREFERENCE` comme préférence transmise, **sans prétendre prévoir ni imposer la catégorie tirée**. Les réponses et les lignes réellement enregistrées sont comparées à la catégorie renvoyée par le **serveur**, même si celle-ci est différente de la préférence. `false` est le défaut; seuls les textes minuscules exacts `true` et `false` sont acceptés, les autres valeurs sont refusées avant le réseau. La sortie indique `random_category_mode` et `actual_draw_category` pour distinguer mode et résultat. Tests négatifs inclus, et parcours A→B (tirage SEXUEL malgré préférence SENSUEL) puis B→A (tirage SENSUEL malgré préférence SEXUEL). **Un seul tirage ne constitue pas une preuve statistique des probabilités officielles.** Chaque exécution `--play` exige une nouvelle soirée fictive vierge; ne jamais relancer sur une soirée déjà utilisée.

**Séance et membres inchangés pendant toute la recette :** le contrôle `--play` relit **sous A et sous B**, après chaque RPC de jeu, la séance active (`id`, `couple_id`, `finished_at=null`, `paired_turns=false`, `self_draws=false`) et les deux membres exacts du duo (A et B, sans troisième compte ni partenaire masqué). Ces relectures sont faites **après D100 avant « Passer »**, **après le premier « Passer » avant le rejeu**, et **après le rejeu idempotent**. Une soirée terminée, déplacée dans un autre duo, inaccessible à B, passée en mode différent ou dont un membre est remplacé fait échouer la recette. Les tests injectent onze changements de séance ou d'adhésion à différents moments et vérifient que l'appel « Passer » suivant n'est pas envoyé après une incohérence.

**Invariance des D6 pendant le cycle D100/Passer :** la recette mémorise les deux faces initiales par propriétaire avant toute mutation et les relit **sous A et sous B** trois fois : après le D100 avant « Passer », après le premier « Passer » avant son rejeu et après le rejeu idempotent. Si une face change (même avec deux faces toujours valides), si les comptes voient deux instantanés différents ou si une ligne D6 disparaît, le test s'arrête. Aucun « Passer » n'est envoyé après une mutation D6 apparue au D100; aucun rejeu n'est envoyé si la mutation survient pendant le premier « Passer ». Une mutation constatée seulement après le rejeu fait échouer le test et interdit de réutiliser la séance fictive. Les tests injectent les trois moments de mutation et une divergence visible uniquement par B.

**Cohérence D6 A/B avant toute mutation :** les modes `--audit` (lecture seule) et `--play` exigent maintenant que les deux séances authentifiées A et B retournent **les mêmes faces D6 pour chaque propriétaire**, et non simplement deux valeurs individuellement valides. Une différence de face sous B provoque un arrêt (et, en mode `--play`, **zéro appel D100 ou Passer**). L'ordre des lignes PostgREST peut différer : la comparaison est faite par `user_id`. Les tests couvrent des faces divergentes, des faces inversées et le retour des lignes dans un ordre inversé.

**Validation entre « Passer » et sa répétition :** l'essai `--play` lit maintenant les deux défis réellement enregistrés sous B et vérifie qu'aucun n'est visible sous A **avant de tenter une seconde fois le même RPC**. Si le premier « Passer » a enregistré une carte supplémentaire, supprimé une carte, changé la catégorie, le destinataire, le statut ou le lien vers l'ancienne carte, la recette s'arrête à un seul appel « Passer ». Une fois la répétition autorisée, elle exige la même réponse (identifiant de remplacement et action) et **compare un instantané complet des champs persistés avant/après**, trié par identifiant pour ignorer uniquement l'ordre des lignes. Les tests injectent aussi une modification silencieuse malgré une réponse prétendument idempotente. En cas d'échec, ne pas relancer `--play` sur la même séance : inspecter les données fictives et préparer une nouvelle fixture.

**Contrôle intermédiaire immédiatement après D100 :** avant toute demande « Passer », la recette lit le défi réellement enregistré **sous B puis sous A**. Elle exige **exactement une proposition neuve**, avec le bon identifiant renvoyé par le RPC, la séance, l'émetteur A, le destinataire B, la catégorie et le statut `proposed`, sans lien de remplacement. A ne doit voir aucun défi; sinon la recette **arrête avant toute repige**, sans supprimer les données ni relancer la pige. Dix tests négatifs couvrent : aucune carte persistée, carte supplémentaire, mauvais identifiant, mauvaise séance, mauvais émetteur, mauvais destinataire, mauvaise catégorie, statut incorrect, lien de remplacement inattendu et carte destinée à A. Le résultat du RPC, à lui seul, n'est jamais accepté comme preuve de persistance.

**Contrôle final après D100 et Passer :** le script vérifie les cartes persistées séparément sous B **et** sous A, car la politique RLS ne permet pas à B de détecter une carte indue destinée à A. Le résultat attendu est exactement deux cartes sous B (originale passée et remplacement proposé), **zéro sous A**, les identifiants de séance et de destinataire corrects, la catégorie officielle conservée et l'émetteur A correct sur la carte originale. Quatre tests négatifs simulent une carte parasite destinée à A, une fuite RLS vers A, une catégorie corrompue et un destinataire incorrect; l'échec est signalé sans suppression ni répétition automatique des mutations.

**Important** : le script ne provisionne pas de comptes, ne restaure pas de soirée et ne répète pas automatiquement les mutations en cas d'échec. Il conserve les résultats de test sur le seul staging. S'il échoue en cours de route, inspecter la base puis utiliser une autre soirée fictive.

## Cartes personnalisées : mêmes droits à la repige, titre et minuteur conservés — 30 octobre 2026

**Contrôle d'identité renouvelé juste avant de répondre.** Dans ce même scénario, après la pige initiale, la validation d'identité du destinataire est volontairement désactivée dans la simulation locale (jeton fictif). La vraie RPC doit rejeter `Refuser(false)` avec l'erreur d'autorisation `28000` **avant** toute modification : la carte doit rester proposée, le nombre de défis inchangé, et aucun reçu de remplacement ne doit exister. Le contrôle rétablit ensuite l'état vérifié, puis vérifie que la vraie réponse personnalisée fonctionne. Cela protège le parcours contre l'idée erronée qu'une autorisation au moment de la pige dispense de revérifier l'identité au moment de répondre. Ce test ne constitue pas une authentification Supabase réelle : seule la recette staging A/B pourra l'établir.

La recette `$lr026_real_roles# LoveRoll LR-026 — recette Supabase A/B (STAGING SEULEMENT)

- `--check` : valide les paramètres, le domaine HTTPS exact, le projet distinct et la clé **publique**. Aucune requête réseau.
- `--auth` : ouvre deux vraies sessions Supabase Auth distinctes, confirme les identités auprès de GoTrue, puis vérifie la lecture de la soirée et des adhésions au duo sous les vraies règles RLS. Aucune mutation du jeu.
- `--audit` : exige un troisième vrai compte Auth C qui appartient à **un autre duo** avec une séance distincte. Avant de tester les refus, A, B et C doivent **chacun voir au moins un défi dont ils sont le destinataire** dans leur propre soirée, sans voir la carte du partenaire. Cela évite un faux succès quand la table des défis est vide ou illisible pour tout le monde. Ensuite, il vérifie que C ne voit ni la séance, ni les adhésions, ni les défis A/B, et qu’A/B ne voient pas ceux de C. **Douze lectures inter-duos doivent être refusées par RLS** : pour chaque autre couple, séance, adhésions, défis destinataires et D6. Les partenaires A et B doivent lire chacun les deux D6 de leur duo, et C doit voir son propre D6 fictif; autrement, un refus sur une table vide ne prouve rien. Aucun appel RPC de jeu, aucune écriture.
- `--play` : avec une confirmation d'écriture supplémentaire, teste une soirée **fictive et vierge** (deux D6 enregistrés, `paired_turns=false`, `self_draws=false`) : A pige un D100 réel, B passe, puis rejoue exactement cette demande. Le script confirme la seule nouvelle carte, l'identité du destinataire, la catégorie conservée et l'idempotence.

 vérifie désormais **les deux vrais appels SQL** sur des cartes personnalisées : après la pige par A d'une carte autorisée uniquement à B, le partenaire B doit pouvoir effectuer `Refuser(false)` et recevoir **uniquement** une autre carte correspondant à ses droits. Des cartes interdites par les rôles `owner/partner`, le genre du destinataire, `recipient_user_id` et `drawer_user_id` restent présentes dans le catalogue de la base isolée : la repige doit les ignorer, pas simplement supposer un ensemble déjà filtré par l'interface.

La seconde carte est d'abord exclue pour rendre le tirage initial déterministe, puis elle est rendue admissible juste avant le refus. Le test contrôle le `card_id`, l'auteur, le destinataire, la catégorie, la nouvelle face D100, le `replaces_challenge_id`, mais aussi **le titre, la description et les cinq minutes du minuteur personnalisés**. Un deuxième `Refuser` avec `exclude=true` doit rejouer le reçu `excluded=false`, sans duplication. Aucune donnée personnelle ou fonction hébergée n'est modifiée. Ces validations sont sur PostgreSQL 17 jetable avec transaction annulée.

## Pré-vérification A/B sans écriture — mode `--ready` (30 octobre 2026)

La commande `node couple-web/lr026-staging-verify.mjs --ready` vérifie **avant de jouer**, sans aucun RPC de jeu ni consentement aux écritures, qu'une soirée fictive distincte est prête pour les essais D100. Contrairement au simple `--auth`, ce mode lit **sous les deux vrais comptes Auth A et B** `paired_turns=false` et `self_draws=false`, les deux lancers D6 valides et identiques sous les deux vues RLS (faces 1–6), ainsi que l'absence de défis enregistrés visibles par chacun des destinataires. L'identité GoTrue, l'appartenance exacte au duo et l'état ouvert de la soirée restent vérifiés.

Ce prévol utilise **la même fonction de validation** que le début de `--play` : un contrôle vert en lecture seule ne doit pas avoir des critères plus faibles que ceux utilisés avant le premier D100. Les tests Node vérifient `game_writes: 0`, aucune requête vers `/rest/v1/rpc/`, et l'arrêt sur une soirée déjà peuplée, un D6 manquant ou contradictoire, des modes divergents sous A/B, un membre manquant et un projet interdit. Le projet confirmé, les deux comptes, la soirée et la clé publique restent obligatoires; les deux confirmations d'écriture sont réservées à `--play`.

Le résultat `preflight: fresh_legacy_duo_verified` ne garantit **pas** qu'une carte reste disponible ou qu'un D100 ultérieur réussira; `--play` revérifie tous ces critères juste avant son premier appel mutateur. Aucun projet, compte ni donnée n'est créé automatiquement.

## Deuxième appareil : preuve positive RLS avant et après chaque réponse — 30 octobre 2026

La deuxième session authentifiée n'est plus considérée comme opérationnelle sur la seule base d'un nouveau jeton : **avant d'envoyer le premier appel contradictoire**, elle doit relire elle-même, sous son propre token, la **séance active** (mode de jeu inchangé), les **deux membres du couple**, les **deux D6 identiques** aux valeurs lues au départ et les **deux défis D100 persistés** correspondant exactement au résultat validé par la première session. Ce contrôle échoue immédiatement si la deuxième session voit un défi manquant, un mauvais destinataire, une adhésion incomplète, un D6 divergent ou une séance fermée. Il ne crée aucun jeu.

Le même prévol de lecture est répété **après chaque réponse contradictoire** avec la deuxième session, parallèlement aux contrôles historiques effectués avec les premières sessions A/B. Les tests Node injectent volontairement des lectures RLS vides, des cartes mal attribuées et des D6 différents; aucun appel contradictoire ne doit partir si la deuxième vue est incohérente. Ils simulent aussi une fermeture de soirée ou un D6 modifié *après* le premier appel : la recette s'arrête alors avant la prochaine réponse. Ces tests restent en mémoire, sans contacter Supabase hébergé.

## Deux sessions Auth indépendantes pour simuler deux appareils — 30 octobre 2026

Le contrôle optionnel `LR026_STAGING_STALE_REPLAY=true` **ne réutilise plus le même jeton de connexion** pour simuler une réponse tardive du deuxième appareil. Après vérification du premier Passer/Refuser et de son rejeu exact, il effectue un **nouveau login GoTrue pour le même destinataire**, contrôle à nouveau son identité avec `/auth/v1/user` et exige un `access_token` distinct. Les commandes contradictoires sont envoyées **uniquement avec cette deuxième session Auth**, tandis que les deux premières réponses restent associées à la première. Le résultat de la recette signale `distinct_stale_auth_session: true`.

Les tests simulés couvrent les deux sens du duo (A offre à B, B offre à A), les trois choix de réponse, les jetons réutilisés à tort et une nouvelle session qui appartient à la mauvaise personne. Dans ces deux derniers cas, **aucune réponse contradictoire n'est envoyée**. Les lectures de persistance demeurent sous RLS et les écritures nécessitent toujours les confirmations explicites de `--play`. Ce test vérifie deux sessions authentifiées du **même destinataire**, pas deux comptes différents répondant à la place l'un de l'autre. Aucun projet Supabase hébergé n'a été contacté pour produire ces tests.

## Rejeu contradictoire sur deux comptes Auth réels — option explicite (30 octobre 2026)

Le mode `--play` comprend désormais une **option désactivée par défaut** pour simuler une réponse tardive provenant d'un autre appareil sur le même défi :

```bash
LR026_STAGING_STALE_REPLAY=true node couple-web/lr026-staging-verify.mjs --play
```

Les paramètres existants sont toujours obligatoires, notamment les **deux comptes Auth distincts** A/B, le projet Supabase de test explicitement confirmé et les deux confirmations d'écriture `LR026_STAGING_ALLOW_WRITES=I_ACCEPT_TEST_PROJECT_WRITES_ONLY` et `LR026_STAGING_WRITE_CONFIRM_REF`. **Ne pas utiliser la production.** La commande ci-dessus n'est qu'un exemple d'activation; elle ne crée ni comptes ni données et n'est pas exécutée automatiquement.

Après la pige D100 et les vérifications RLS, la recette contrôle d'abord un Passer ou Refuser normal et son rejeu identique. *Seulement si ces contrôles passent*, elle envoie un appel contradictoire sous le vrai token du destinataire : `Passer` initial → `Refuser(true)`; `Refuser` initial → `Passer(false)`, puis `Refuser` avec le drapeau `exclude` inverse. Chaque réponse tardive doit restituer le **premier** `original_id`, `replacement_id`, `action` et `excluded` avec `already_processed=true`. Après chaque essai, la recette relit sous RLS les deux cartes persistées, l'état de la soirée, les adhésions A/B et les deux D6. Les lignes ne peuvent pas changer.

Les tests Node en transport simulé couvrent les deux sens A→B et B→A, les trois décisions possibles, les drapeaux erronés, un remplacement substitué et une modification silencieuse de l'auteur de la carte de remplacement. Le paramètre accepte exclusivement `true` ou `false`; absent, il ne déclenche aucun appel supplémentaire. **Aucun accès à une préproduction hébergée n'est présumé** : la validation réelle de cette option exige toujours un projet de test explicitement mis à disposition.

## Interface Soirée : message de réponse fidèle au serveur — 30 octobre 2026

**Correctif du jeu visible :** dans `couple-web/app.js`, après un clic sur **Passer** ou **Refuser** avec/sans exclusion, le message de confirmation n'est plus calculé à partir du **bouton cliqué localement**. Deux appareils peuvent prendre des décisions contradictoires sur un même défi, mais la RPC `love_respond_and_redraw` n'enregistre **qu'une seule décision**, puis renvoie `action`, `excluded` et `already_processed` sur le second appareil. Le message affiché suit toujours **ces valeurs serveur**, même si le deuxième appareil avait demandé autre chose.

La fonction pure `eveningRedrawFeedback` dans `couple-web/evening-private-queue.mjs` affiche le résultat réel **Passé**, **Refusé avec exclusion** ou **Refusé sans exclusion**; lorsqu'un autre appareil a déjà répondu, elle indique que le défi avait déjà reçu une réponse. Un reçu incomplet ou contradictoire donne un message neutre demandant de vérifier les défis, pas une fausse confirmation. Les règles de rôle, de quota, de minuterie et de remplacement restent inchangées. Les tests `couple-web/evening-private-queue.test.mjs` couvrent les réponses gagnantes, les rejeux, les choix différents et les reçus mal formés, et vérifient que l'application utilise bien la décision serveur.

## Reçus identiques et gagnant réel des courses SQL — 30 octobre 2026

Deux protections supplémentaires dans `couple-web/lr026-real-rpc-concurrent.test.sh` vérifient les deux courses **Passer contre Refuser** et **Refuser sans exclusion contre Refuser avec exclusion** avec les véritables RPC sur PostgreSQL 17 jetable. L'assertion compare les JSON renvoyés aux **deux connexions** au reçu réellement enregistré, champ par champ : `original_id`, `replacement_id`, `action` et `excluded`. L'identifiant de remplacement doit aussi pointer vers **l'unique défi proposé correspondant à l'original**, pas simplement vers une ligne de plus.

Une seconde assertion relie le client recevant `already_processed=false` à **son vrai bouton initial** : le client de Passer doit avoir fait gagner `pass`, le client de Refuser doit avoir fait gagner `refuse`; pour les deux choix de Refuser, le client gagnant doit avoir sauvegardé son propre `excluded=true/false`. L'autre réponse doit être le rejeu idempotent (`already_processed=true`). Un test Node contrôle également que les UUID du couple, de la soirée et du défi du fixture SQL correspondent aux UUID passés par les clients. Ces assertions protègent contre les erreurs de branchement entre deux appareils et les réponses incorrectes malgré un nombre de lignes correct. Elles ne modifient **aucune** fonction ni permission de production.

## Concurrence : deux choix opposés de Refuser — 30 octobre 2026

Un test de concurrence supplémentaire appelle **les vraies RPC PostgreSQL** simultanément depuis deux clients sur **le même défi**, avec `Refuser(false)` (garder la carte dans le cycle) et `Refuser(true)` (l'exclure du cycle). Le script `couple-web/lr026-real-rpc-concurrent.test.sh` verrouille d'abord la ligne du duo, puis constate que les deux sessions attendent réellement le même verrou avant de les laisser continuer. Le nouvel ensemble de données jetables se trouve dans `couple-web/lr026-real-rpc-refuse-choices-race.seed.sql`.

**Une seule décision doit gagner** : les deux clients reçoivent le `action='refuse'` et le même `excluded` réellement enregistré, avec un seul `already_processed=false` et un second appel `already_processed=true`. Le nombre de cartes, les événements, le reçu, le refus horodaté, l'absence de Passer et la présence/absence de l'exclusion de cycle sont tous contrôlés. La seconde réponse ne peut jamais transformer après coup un refus non excluant en refus excluant, ni l'inverse. Le fichier de fixture fait partie des chemins qui déclenchent la suite PostgreSQL GitHub Actions.

Cette recette valide uniquement une base PostgreSQL 17 **isolée**, avec des identités synthétiques. Elle ne remplace pas les essais de deux appareils réellement connectés à des comptes Auth/Supabase en préproduction et n'effectue aucun changement en production.

## Refuser D100 : isolation stricte entre SENSUEL, SEXUEL et les partenaires — 30 octobre 2026

Un test supplémentaire utilise les **vraies fonctions SQL LoveRoll** sur PostgreSQL 17 jetable : deux couples de test indépendants sont créés pour comparer un `Refuser(false)` à un `Refuser(true)`. Dans chaque couple, la carte `#1` apparaît simultanément dans les historiques **SENSUEL** et **SEXUEL** de A et de B. Seule la carte **SENSUEL #1 proposée à B** est refusée. Le tirage initial et la nouvelle carte sont contrôlés sous les identités A (lanceur) et B (destinataire).

Les assertions exigent que `Refuser(false)` libère uniquement l'ancienne entrée de B en SENSUEL, alors que `Refuser(true)` conserve l'entrée et ajoute uniquement l'exclusion **SENSUEL #1** pour le cycle. Les entrées **SEXUEL #1** de A/B et **SENSUEL #1** de A ne doivent jamais changer. Dans les deux cas, la carte de remplacement reste SENSUEL, destinée à B et offerte par A, et reçoit une nouvelle face D100. Un rejeu avec le drapeau d'exclusion inversé doit restituer le **reçu original** sans dupliquer les défis ni modifier les historiques.

Cette régression est limitée à PostgreSQL local jetable, `ROLLBACK`, sans accès aux comptes Supabase hébergés et sans écriture en production.

## Historique indépendant pour chacun des deux partenaires — 30 octobre 2026

Le nouveau scénario SQL isolé `$lr026_real_cross_recipient_refusal# LoveRoll LR-026 — recette Supabase A/B (STAGING SEULEMENT)

 vérifie la séparation des historiques du duo dans la **vraie** RPC `love_respond_and_redraw` : si A a réalisé une carte SENSUEL dans le cycle actuel, et que B refuse ensuite la même carte sans exclusion, **la réalisation de A doit rester protégée**, mais **B doit pouvoir libérer son propre historique de tirage**. Le jeu ne doit pas considérer qu'un `completed` du partenaire opposé est un `completed` du destinataire actuel.

La recette utilise deux soirées fictives, une carte réalisée par A, une pige D100 pour B, un passage du paramètre d'anti-répétition temporaire à actif, puis `Refuser(false)` par B. Les assertions distinguent explicitement les deux lignes `love_card_draw_history`, le `completed` historique de A, le `refused` de B, la catégorie, la face et la carte de remplacement. Le second appel avec `exclude=true` doit être **idempotent** et conserver le refus original sans exclusion. L'exécution utilise PostgreSQL 17 jetable avec `ROLLBACK`, aucun compte authentifié réel ni écriture en production.

## Refuser sans exclusion : différence entre l'ancien cycle et le cycle actif — 30 octobre 2026

Un contrôle complémentaire `$lr026_real_previous_cycle_refusal# LoveRoll LR-026 — recette Supabase A/B (STAGING SEULEMENT)

 vérifie le scénario **inverse**. La carte a été réalisée dans une soirée antérieure au début du cycle actif, puis proposée à nouveau. Après `Refuser(false)`, la vraie fonction SQL doit retirer son ancienne entrée du sac `love_card_draw_history` : la réalisation historique d'un cycle **terminé** ne doit pas bloquer indéfiniment la carte. La fiche de réalisation reste archivée dans `couple_challenges`, la réponse demeure non excluante, le nouveau défi respecte catégorie et destinataire, et le second appel est idempotent.

Avec le cas précédent, les deux branches du garde serveur sont couvertes par les véritables RPC : **réalisation dans le cycle actif → sac conservé; réalisation uniquement avant ce cycle → sac libéré**. Les scénarios ont des identités, couples et soirées fictifs distincts, dans une transaction PostgreSQL jetable annulée après exécution. Aucune donnée de production ou d'utilisateur n'est impliquée.

## Refuser sans exclusion après une carte déjà réalisée dans le même cycle — 30 octobre 2026

Une autre recette SQL intégrée, `$lr026_real_completed_then_refused# LoveRoll LR-026 — recette Supabase A/B (STAGING SEULEMENT)

, vérifie le cas inverse de `Refuser(false)` : une carte **déjà marquée réalisée** par le même destinataire dans une soirée antérieure du **cycle actif de 200 défis**. La vraie RPC `draw_for_partner` repige cette carte lorsque l'option anti-répétition est temporairement désactivée. Le test réactive ensuite l'anti-répétition et utilise la vraie RPC `love_respond_and_redraw` pour `refuse,false`, avec deux autres cartes maintenant admissibles.

Le contrat attendu est précis : l'ancien événement `completed` est conservé, la nouvelle occurrence devient `refused` et reçoit son horodatage, le remplacement garde le bon destinataire, la catégorie SENSUEL et un autre numéro/face D100. **Surtout, la carte déjà réalisée demeure dans `love_card_draw_history`** malgré le refus sans exclusion : elle ne doit pas devenir admissible à nouveau dans le cycle de 200. Aucun `love_cycle_excluded_cards` additionnel n'est créé. Un rejeu avec `exclude=true` restitue le reçu immuable `excluded=false`, sans dédoubler le défi. Le contrôle effectue `ROLLBACK` sur PostgreSQL 17 jetable; il ne nécessite pas de compte Supabase hébergé.

## Refuser sans exclusion : vrais RPC avec quota Passer à zéro — 30 octobre 2026

Le scénario supplémentaire `$lr026_real_refuse_without_exclusion# LoveRoll LR-026 — recette Supabase A/B (STAGING SEULEMENT)

 de `couple-web/lr026-real-rpc-e2e.test.sql` exécute les **vraies fonctions SQL** sur un couple et une soirée entièrement fictifs avec **`monthly_pass_limit=0`** et exactement trois cartes SENSUEL admissibles. Il prouve que le bouton « Passer » échoue proprement quand la limite est épuisée, mais que « Refuser » **sans exclure la carte du cycle** peut produire une nouvelle carte pour le même destinataire et dans la même catégorie, avec une autre face du D100.

La carte refusée doit rester dans les défis historiques avec `status='refused'` et `refused_at` renseigné, ne pas produire de `passed_at`, ne pas être inscrite parmi les exclusions du cycle, et être retirée du sac d'anti-répétition **pour une soirée ultérieure**. La nouvelle carte reste inscrite dans le sac. Un rejeu de la réponse, même avec `exclude=true`, rend le reçu immuable `excluded=false` : aucune nouvelle exclusion, carte ni consommation de Passer. Le test vérifie les deux lignes attendues dans `couple_challenges`, l'unique reçu de `love_challenge_redraws` et le quota zéro. Une deuxième pige de la même carte **dans cette soirée** reste interdite par l'historique de soirée.

La suite s'exécute dans PostgreSQL 17 jetable et `ROLLBACK`; ce n'est pas un test des comptes Auth en préproduction ni une modification des fonctions de production.

## Protection des identifiants et de la catégorie D100 — 30 octobre 2026

Le moteur serveur `couple_private.love_variety_rank` distingue `couple_challenges.id` (identifiant de l'occurrence) de `couple_challenges.card_id` (identifiant de bibliothèque). La comparaison auxiliaire JavaScript ne considère donc plus deux cartes comme identiques sur la seule égalité de leur **UUID de ligne**, lorsque `card_id` est absent. Les identifiants de carte réels restent prioritaires; la comparaison des titres complets et des descriptions reste possible sans `card_id`.

`filterSimilarEveningCandidates` valide désormais explicitement que `selectedCategory` et chaque carte admissible correspondent aux catégories **SENSUEL** ou **SEXUEL**. Une catégorie inconnue est rejetée **même si le lot admissible est vide** : il serait trompeur de renvoyer « zéro carte » pour un état de catégorie invalide. Un lot valide et vide renvoie toujours `no-eligible-cards`. Le contrôle du lot mono-catégorie et la conservation du hasard du serveur restent intacts.

Les tests ciblés `couple-web/evening-variety.test.mjs` couvrent l'égalité trompeuse des UUID, l'égalité réelle de `card_id`, les catégories invalides et le lot vide valide. Correctifs sur la PR brouillon uniquement; aucune migration, aucune carte personnelle et aucun déploiement.

## Parité stricte avec le moteur de similarité SQL — 30 octobre 2026

Le comparateur **consultatif JavaScript** a été aligné sur `couple_private.love_variety_near`, et non uniquement sur sa normalisation. Le moteur SQL considère « semblables » deux cartes ayant **le même titre complet normalisé**, ou bien au moins **cinq mots significatifs distincts communs** (longueur minimale quatre lettres, mots fréquents de la liste SQL exclus) avec une **similarité de Jaccard d'au moins 68 %** dans leurs descriptions. Les champs `activity_tag`, `theme` et `tags`, ainsi qu'une simple intersection partielle des mots d'un titre, ne font pas partie de cette décision serveur. Ils ne doivent donc pas écarter une carte pourtant admissible ou classée nouvelle par le serveur.

Le comparateur auxiliaire utilise désormais exactement la table française de translittération du SQL, y compris `œ/oe` et `æ/ae`, les mêmes mots exclus et les mêmes seuils. Les tests Node vérifient les cas limites de Jaccard à **5/7** (semblable) et **5/8** (différent), les titres partiellement semblables, les métadonnées d'activité divergentes et les cinq mots significatifs. Un contrôle statique lit le SQL réellement suivi dans la PR et compare les deux listes de mots et les correspondances d'accents pour bloquer une divergence future. Les règles d'identité de carte, de catégorie et de repli sur un lot entièrement semblable sont conservées.

Il s'agit toujours d'un **outil auxiliaire**, pas d'une nouvelle sélection côté client. Le serveur décide seul du lot, des rôles, de la catégorie, des probabilités, des exclusions et du hasard. Aucun SQL de production, aucune carte utilisateur ni migration Supabase n'a été modifié par ce correctif.

## Parité des textes français et isolation de catégorie — correctif JavaScript (30 octobre 2026)

La politique auxiliaire `couple-web/evening-variety.mjs` conserve le filtre des candidats **uniquement après sélection officielle de la catégorie D100**. Un écart vérifié entre JavaScript et `couple_private.love_variety_normalize` est maintenant corrigé : la normalisation Unicode `NFKD` n'expanse pas `œ` / `æ`, tandis que la fonction SQL les transforme déjà en `oe` / `ae`. Les titres « cœur/coeur » et « encyclopædie/encyclopaedie » sont désormais reconnus comme équivalents, y compris en majuscules; cela ne modifie aucune carte source ni les catégories.

Le filtrage du catalogue client ignore maintenant les entrées historiques dont la catégorie est **absente ou différente** de la catégorie sélectionnée. Cette distinction est importante : une comparaison directe sans catégorie peut être tolérée pour un diagnostic, mais le moteur serveur ne compare que `seen.category = p_category`. Un historique incomplet ne doit donc pas rétrécir silencieusement le lot admissible du D100. Les tests `couple-web/evening-variety.test.mjs` couvrent ligatures, ordre stable, historique partiel, catégories opposées et suppression seulement lorsque l'historique possède la catégorie correcte.

Ces modifications concernent l'**utilitaire consultatif** et ses tests dans la PR non fusionnée; elles ne remplacent pas le choix de catégorie, les autorisations RLS, la requête d'admissibilité ni le tirage officiel sur le serveur. L'absence de déploiement et la nécessité de la recette en staging restent inchangées.

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
| `LR026_STAGING_RANDOM` | Facultative pour `--play` : chaîne exacte `false` (défaut) ou `true`. En mode aléatoire, la catégorie réellement sélectionnée reste celle du serveur; une nouvelle soirée vierge est requise. |
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
