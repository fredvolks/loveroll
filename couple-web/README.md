# LoveRoll — Mode couple connecté (Android + iPhone)

## État exact
Le code de l'application web multiappareil et son schéma Supabase sont préparés dans `couple-web/`.
**La base Supabase dédiée est créée et le schéma SQL a été installé (12 tables avec RLS). La PWA n'est PAS encore publiée sur une URL vérifiée; aucun vrai compte ni aucune synchronisation n'ont encore été testés.**
L'application Android native v0.7.0 reste locale et utilise encore ses anciennes données.
Ce module connecté doit être provisionné dans un projet Supabase **dédié**, jamais Mon Wallet.

## Connexion et noms
- Google : OAuth Supabase, fournisseur à configurer pour le projet.
- Apple : OAuth Supabase, nécessite les identifiants du développeur Apple (Service ID, Key ID, Team ID, clé de signature) et leur rotation. Apple OAuth Web ne donne souvent pas le nom ; demander le nom une fois lors de l'inscription.
- Le champ `couple_profiles.display_name` ne contient que le nom issu de la connexion ou explicitement confirmé par son titulaire. Aucun nom de partenaire n'est codé en dur dans `app.js`.
- Chaque partenaire se connecte avec son propre compte. La personne invitée doit utiliser **le courriel exact** auquel l'invitation était destinée, y compris si Apple masque son courriel via relais.

## Installer une fois le projet dédié provisionné
1. ✅ Projet Supabase dédié `LoveRoll` créé dans l'organisation `Fred forge` en région `ca-central-1` ; coût annoncé 0 $/mois.
2. ✅ Schéma `schema.sql` installé par migration dans le projet dédié. ✅ Contrôle SQL : 12/12 tables sous RLS, aucun accès anonyme au journal, aucun `INSERT` direct des tirages avec le rôle authenticated. ⏳ Tester avec trois vrais comptes reste à faire.
3. Configurer Google et Apple dans Auth > Providers et autoriser le domaine HTTPS du site et son callback.
4. ✅ `config.js` contient uniquement l'URL publique du nouveau projet et sa clé **publishable**. Aucun secret admin/service-role n'est conservé dans le dépôt. L'URL HTTPS de GitHub Pages est prévue mais pas encore vérifiée.
5. Héberger `couple-web/` sur un site HTTPS privé côté contenu (code statique public, données protégées par Auth, RLS et chiffrement). PWA accessible via Chrome Android et Safari iPhone.
6. Faire une vraie invitation de test. L'invitant remplit l'adresse de son partenaire, puis son app courriel s'ouvre avec l'invitation : il doit appuyer sur **Envoyer**. Les envois automatiques nécessitent un fournisseur transactionnel distinct, non configuré.
7. Pour le journal intime et les questionnaires, définir ensemble une phrase secrète forte et la partager hors de l'app. Elle sert à chiffrer les données côté appareil (AES-GCM avec clé PBKDF2), n'est jamais envoyée au serveur et **ne peut pas être récupérée si perdue**. Les dates restent visibles comme métadonnées aux membres du couple.
8. Sur iPhone, ouvrir le site dans Safari, puis Partager > Sur l'écran d'accueil.
9. Vérifier le tirage simultané depuis Android et iPhone, un D6 personnel chacun, une soirée, les avis et le calendrier.
10. Activer séparément des notifications push de fond si nécessaire : **non implémentées**. Les nouveautés s'affichent en temps réel tant que la page est ouverte.

## Déploiement en attente
Ne pas annoncer une synchronisation iPhone-Android opérationnelle avant d'avoir déployé et validé ces étapes.
Le mode web relié au cloud et l'APK natif actuel sont deux modes distincts : les tirages et entrées du mode local ne se synchronisent pas automatiquement. Une migration volontaire et chiffrée des données locales sera nécessaire avant un basculement définitif.

## Confidentialité
- Supabase Row Level Security filtre les membres du couple.
- Deux membres maximum ; invitation vérifiée contre le courriel authentifié.
- Les tirages partagés passent par des fonctions serveur transactionnelles, non par des changements directs côté client.
- Les réponses et entrées intimes sont chiffrées dans le navigateur avant stockage.
- Aucun stockage tiers ne reçoit la phrase secrète.
- Les membres voient les questionnaires de l'autre après déverrouillage avec la phrase commune ; un partenaire ne peut pas écrire/modifier sous l'identité de l'autre.
- La suppression du compte, les consentements de partage et l'export/migration nécessitent encore une finition avant usage réel sur des données sensibles.

## Corrections de fiabilité du mode connecté (code prêt pour déploiement)
- Le même dé hebdomadaire et les trois étapes du défi spécial sont verrouillés atomiquement pour les deux comptes.
- Chaque D6 personnel est tiré par **l'identité authentifiée correspondante**.
- Un nouveau D20 ne peut pas être proposé à une personne tant que son défi précédent est en attente; le serveur respecte sa limite D6 de défis terminés.
- « Terminer et compter » exige que chacun ait terminé son nombre prévu de défis. « Arrêter sans compter » ferme la session sans épuiser le quota hebdomadaire.
- Les questionnaires sont liés à une soirée terminée, par `session_id` et compte authentifié.
- Les invitations utilisent désormais le **fragment** de l'adresse (non transmis comme paramètre de requête HTTP) et le retirent immédiatement de la barre d'adresse. Le destinataire doit néanmoins utiliser le courriel vérifié invité et le lien d'invitation reste un secret à ne pas transférer.
- Une souscription temps réel est active même pour une personne seule en attente d'acceptation du match, puis lors des tirages et actions du couple tant que l'application est ouverte.
- Le menu web comprend Accueil, Soirée, Défi spécial, Avent, Réglages. Le journal et les questionnaires sont accessibles depuis Réglages.

## Vérifications et limites de la mise en service
Les tests de structure JavaScript + SQL exécutés sur GitHub ne remplacent **pas** des tests de migration en base, ni des essais d'authentification de bout en bout à deux personnes.
Il faut un projet cloud dédié avec coût confirmé, puis tester les règles RLS et transactions avec trois comptes (deux partenaires et un tiers non autorisé) avant stockage de données intimes.
Les notifications temps réel de premier plan sont prévues; les notifications push quand le navigateur iPhone est fermé nécessitent encore un service de push et des autorisations.
L'invitation est préparée dans l'application de courriel (envoi manuel) jusqu'à l'installation d'un fournisseur de courriel transactionnel.
L'APK natif v0.7.0 n'est pas encore relié au mode web. La PWA est prévue pour les deux appareils une fois hébergée, avec migration volontaire des anciennes données.

## Configuration actuelle (2026-10-13)
- Nouveau projet : [LoveRoll — Supabase](https://supabase.com/dashboard/project/ejsrqfpkgwraorrznjpm), **séparé** de Mon Wallet.
- Région : Canada central. Coût de création annoncé : **0 $ par mois**. Les limites du plan gratuit demeurent applicables.
- Le serveur de données et les fonctions de tirage sont installés. Les avertissements de l'analyseur Supabase concernant les fonctions `SECURITY DEFINER` exposées aux utilisateurs authentifiés sont intentionnels pour les tirages ; chaque RPC doit obligatoirement vérifier l'appartenance au couple et l'auteur, et être testé avec un 3e compte non membre. Voir [l'avertissement](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Authentification courriel : l'UI contient maintenant `signInWithOtp` (lien courriel) comme option de secours ; dépend du quota de courriels Supabase et des URL de redirection.
- **Action obligatoire à une seule reprise pour GitHub Pages (si le workflow échoue)** : aller à `github.com/fredvolks/mon-wallet-android/settings/pages`, puis sélectionner `GitHub Actions` comme source. Le workflow `.github/workflows/deploy-couple-web.yml` publiera alors exclusivement le répertoire `couple-web/`, normalement à `https://fredvolks.github.io/mon-wallet-android/`. Ne communiquer ce lien comme actif qu'après vérification de la publication.
- **Action obligatoire Supabase Auth > URL Configuration** : définir **Site URL** et **Redirect URLs** sur cette adresse HTTPS. Les liens OAuth et Magic Link peuvent échouer sinon.
- **Google** : créer un OAuth Client Web via Google Cloud Console, rediriger vers `https://ejsrqfpkgwraorrznjpm.supabase.co/auth/v1/callback`, puis installer le Client ID/Secret dans Supabase Auth > Providers > Google, sans jamais les mettre dans le code web.
- **Apple** : un compte Apple Developer, Service ID, Team ID, Key ID et clé privée sont nécessaires dans Supabase Auth > Providers > Apple. Apple peut masquer le courriel, auquel cas la personne doit se connecter avec le courriel exact de l'invitation ou choisir une adresse Google/courriel identique.
- L'application web peut fonctionner depuis Android/iPhone en PWA avec les **mêmes** comptes et données lorsque site + auth sont activés. L'APK Android natif existant n'est **pas automatiquement migré** vers ce système.
- Notifications en temps réel : bannières dans l'application lorsque la PWA est ouverte, pas encore de notifications push quand Safari/Chrome est fermé.

## LoveRoll 0.8.0 — Fêtes et anniversaires
- L'application visible s'appelle **LoveRoll**. L'identifiant APK reste `ca.desadeux.jeu` pour préserver les mises à jour et données existantes.
- Nouvel onglet interne `Défi spécial → Fêtes et anniversaires` avec Saint-Valentin (14 février), fête des Mères (2e dimanche de mai au Canada), fête des Pères (3e dimanche de juin), anniversaire de couple et deux anniversaires personnels.
- Les anniversaires configurés stockent seulement **mois et jour**, pas l'année de naissance.
- Fenêtre d'ouverture : 14 jours avant, jusqu'à 7 jours après. Un seul D20 et un seul D6 d'organisation par occasion/année. Les deux partenaires sont synchronisés sur le web par Supabase.
- 20 idées de surprises romantiques, coquines et audacieuses, facultatives et respectueuses des limites individuelles; ne jamais assimiler un tirage à un consentement.
- Le module Android natif contient une version **locale** des événements, sans comptes connectés. Le module web connecté doit être testé avec deux identités authentifiées une fois le site déployé. Les données Android locales ne sont pas synchronisées automatiquement.
- Pour conserver la mise à jour des APK v0.7.0, la publication LoveRoll v0.8.0 utilise le tag historique `des-a-deux-v0.8.0` et inclut **deux noms de fichier identiques** `LoveRoll-v0.8.0.apk` et `Des-a-Deux-v0.8.0.apk`.
- Supabase : migration `special-occasions.sql` déployée sur le projet LoveRoll séparé, avec RLS. Une seconde migration a retiré l'exécution directe de la fonction d'aide interne.
- Hébergement iPhone : le premier essai GitHub Pages n'a pas pu publier le site. L'URL `https://fredvolks.github.io/mon-wallet-android/` **n'est pas vérifiée comme active**. Se rendre dans GitHub → Settings → Pages, sélectionner **GitHub Actions**, puis relancer le workflow de déploiement.
- OAuth Apple/Google nécessite encore les identifiants configurés dans Supabase Auth. Les tests automatiques du code ne constituent pas un test mobile de bout en bout.


## Déploiement direct Supabase Edge (13 octobre 2026)
Le site public (HTML, CSS, JavaScript seulement, sans journal ni secrets administrateur) a été mis en ligne via la fonction Supabase Edge `loveroll-web`, version 1, statut `ACTIVE` :

https://ejsrqfpkgwraorrznjpm.supabase.co/functions/v1/loveroll-web/

- Aucun GitHub Pages n'est requis pour cette adresse.
- Le site n'utilise que la clé publique Supabase et les RPC/RLS du projet dédié.
- La fonction publique a `verify_jwt=false` **uniquement pour permettre d'afficher la page de connexion**. Les données du couple demeurent protégées par des sessions authentifiées et les règles RLS/RPC.
- Les ressources web sont servies par la fonction depuis son bundle (vous devez redéployer Edge après chaque modification de l'interface sur GitHub).
- Statut ACTIVE confirmé par Supabase; test HTTP navigateur complet et authentification de bout en bout **à faire**.
- Enregistrement OAuth : dans Supabase > Authentication > URL Configuration, ajouter https://ejsrqfpkgwraorrznjpm.supabase.co/functions/v1/loveroll-web/ à Site URL et Redirect URLs. Sans cette autorisation, liens courriel et retours OAuth peuvent rediriger ailleurs.
- Les fournisseurs Google et Apple nécessitent encore les identifiants OAuth dans Supabase > Authentication > Providers. La connexion courriel (lien magique) peut être testée après autorisation de redirection.
- GitHub Pages est maintenant une option secondaire seulement : son workflow ne se déclenche plus automatiquement pour éviter les échecs inutiles.


## v0.9.0 — Soirées à deux catégories et minuteurs
- **Nouveaux tirages** : uniquement Sensuel ou Sexuel. Chaque carte utilise 80 % de la catégorie choisie et 20 % de l'autre, à sélectionner avant chaque D20.
- Les catégories épuisées sont automatiquement exclues et les probabilités renormalisées; aucune répétition d'une carte dans la même soirée.
- Les anciens défis Coquin déjà enregistrés restent consultables dans les historiques, mais ne sont plus proposés par de nouveaux tirages.
- Chaque défi propose une durée en minutes (notamment massage 10 min) et un minuteur : démarrer, pause, reprendre, réinitialiser.
- Alerte de fin : **son doux** ou **vibration** à choisir. La vibration peut être indisponible sur iPhone/Safari; le minuteur reste visible, avec une notification textuelle.
- Les durées n'obligent pas à finir ou continuer un défi : le consentement et les limites des personnes prévalent.
- Base Supabase : migration `couple-web/evening-80-20.sql` déployée dans le projet dédié. Même signature RPC `draw_for_partner(uuid,text,boolean)`; `p_random` historique est ignoré volontairement.
- Android : APK local v0.9.0 avec mêmes deux catégories et un minuteur; la version web avec compte Supabase est destinée aux deux appareils. Les comptes partagés ne sont pas encore intégrés à l'APK natif.
- **Configuration Supabase URL** : la Site URL et les Redirect URLs doivent pointer vers `https://ejsrqfpkgwraorrznjpm.supabase.co/functions/v1/loveroll-web/`. Aucune action d'administration Auth n'est disponible pour modifier ce paramètre depuis ce connecteur.


## v0.10.0 — Première visite LoveRoll et inscription
- L'APK existant reste identifié par `ca.desadeux.jeu` et conserve sa signature : ne pas désinstaller l'ancien, pour préserver les données locales.
- Le lancement Android affiche maintenant l'écran promotionnel LoveRoll avec appel à l'inscription ou à la connexion. L'accès **connecté** ouvre le navigateur externe (OAuth Google y est pris en charge lorsqu'il est configuré ; les WebView embarquées peuvent être rejetées par Google).
- L'ancienne application locale existe sous un bouton **Ancienne version hors ligne (non synchronisée)**. Elle garde ses propres données et historiques, qui **ne se transfèrent pas automatiquement** dans le match.
- L'interface web Android/iPhone affiche une page de présentation avant connexion, puis Google/Apple/courriel, puis la fiche profil avec **nom et anniversaire (jour/mois uniquement)**, confirmation d'âge 18+, puis le match.
- L'inscription ne dépend d'aucun prénom écrit en dur. Le nom issu de Google/Apple est prérempli si disponible, et peut être édité ; pour Apple il faut le demander si le fournisseur ne le livre pas.
- La date personnelle se renseigne **une seule fois dans l'inscription** et est synchronisée dans les événements du couple au moment de la création/acceptation du match. L'anniversaire de couple est proposé à la création du match. L'application n'affiche plus de champs d'anniversaire dans Réglages.
- Migration `couple-web/registration-onboarding.sql` appliquée au projet Supabase dédié. Les anciens RPC de création et d'acceptation de match et l'ancien éditeur de profil sont révoqués pour le rôle authentifié ; les nouvelles fonctions exigent un anniversaire de profil.
- La plateforme Supabase ne fournit pas via notre connecteur la gestion des **Providers Google et Apple** ni les **Redirect URLs**. Ces autorisations sont à configurer dans le tableau de bord avant de pouvoir valider des connexions OAuth.
- La PWA est hébergée dans Supabase Edge, pas GitHub Pages. Redéployer l'Edge Function après chaque mise à jour du site.


## IMPORTANT — Hébergement HTML corrigé

Supabase Edge en domaine gratuit **force text/html en text/plain** (comportement documenté). L'ancien chemin Edge affiche donc du HTML brut et ne peut PAS héberger la PWA. LoveRoll Web est publié via GitHub Pages; Supabase conserve seulement Auth et les données.

Site Web : https://fredvolks.github.io/mon-wallet-android/

L'ancienne adresse https://ejsrqfpkgwraorrznjpm.supabase.co/functions/v1/loveroll-web/ est remplacée par une redirection HTTP 302 vers la vraie page d'accueil, sans contenu HTML. Le projet ne nécessite pas de Supabase Pro.

**Auth** : changer Site URL et Redirect URLs dans Supabase > Authentication > URL Configuration pour https://fredvolks.github.io/mon-wallet-android/. Google et Apple nécessitent leur configuration OAuth côté Supabase. Tant que ces étapes ne sont pas validées, ne pas présenter une inscription comme pleinement fonctionnelle.


## v0.11.0 — landing premium (maquette LoveRoll)
- Accueil **avant connexion** renouvelé sur web (Android/iPhone) et dans l'APK natif avec le nom de marque LoveRoll blanc/rose, une véritable illustration composée d'un cœur en verre et de deux dés noirs sur satin.
- Texte, logo, cartes et deux boutons d'inscription et connexion restent des composants natifs ou du DOM interactifs, sans capture aplatie en arrière-plan.
- **Un seul bouton « Créer mon compte » et un seul « Me connecter »**. Les deux mènent à l'authentification existante (Google, Apple si configurés, ou lien courriel), sans modification du schéma ni des règles du jeu.
- Quatre cartes 2 × 2, cinq bénéfices compacts, message émotionnel de clôture et réassurances.
- Visuel `couple-web/assets/loveroll-hero.webp` et `app/src/main/res/drawable-nodpi/loveroll_hero.webp` : recadrage graphique propre sans boutons incrustés dans l'image.
- Test web et captures responsives au format S25 Ultra représentatif (412 × 915 CSS px), petit Android (360 × 780) et iPhone (393 × 852) produits par GitHub Actions. Ce test navigateur n'est **pas** une validation sur le téléphone physique.
- Identifiant Android et secrets de signature existants inchangés. Les anciennes données locales restent accessibles depuis la landing.
- GitHub Pages est le site web HTML public, Supabase Auth et RPC restent le backend. L'adresse Supabase Edge est redirigée vers GitHub Pages.


## v0.12.0 — Landing page PREMIUM COMPACTE (une page)
- Refactorisation des deux accueils **Android natif** et **PWA** sans changer l'applicationId `ca.desadeux.jeu` ni les règles du jeu.
- Six zones : marque LoveRoll, cœur + dés brillants, titre + promesse réduite, **deux seuls boutons** de connexion, quatre fonctions miniatures en 2 × 2, message émotionnel fusionné et pied de page discret (limites d'âge/consentement).
- Sur Android, la hauteur utilisable est mesurée avec `WindowMetrics` moins les insets de status/nav pour adapter la zone graphique; le `ScrollView` demeure le comportement de secours pour petite hauteur ou accessibilité.
- Sur le web, la landing utilise des sections compactes et la hauteur `dvh`, avec un test Playwright qui doit **prouver l'absence de scroll à 412 × 824 et 412 × 915 CSS pixels**; les petites tailles peuvent défiler.
- Lien `loveroll://offline` déclaré dans le manifeste Android : permet depuis la PWA de retrouver les données locales **sans les réinitialiser** (si l'APK est installé).
- Captures Playwright disponibles dans l'artifact GitHub `LoveRoll-landing-captures`; émulateur Android indépendant de la validation des dés 3D.

## Avent — Les lettres de décembre (Web 119)

Une lettre se débloque à sa date complète, calculée avec l’horloge serveur America/Toronto. Elle reste ouvrable après cette journée, après le 25 décembre et depuis son calendrier historique. Plusieurs rattrapages sont possibles dans la même journée. Une ouverture déjà enregistrée conserve son texte, sa minuterie, son auteur et son horodatage ; modifier ou réimporter les 25 journées ne modifie pas ces souvenirs.

La migration `migrations/20261017045614_loveroll_advent_catchup.sql` ajoute la variante `open_advent_day(p_couple,p_day,p_year)` et garde la variante à deux paramètres pour les clients installés. Elle conserve les protections d’identité vérifiée, d’appartenance au couple, la clé unique et le verrou de transaction du couple. Les droits publics et anonymes restent révoqués.

`advent-postgres-check.py` ne s’exécute que dans la base de test isolée `loveroll_advent_test` créée par GitHub Actions. Il vérifie notamment deux connexions concurrentes, les accès interdits, les dates futures, les rattrapages et la conservation des instantanés. `advent-letters-browser-check.cjs` vérifie la vraie application avec deux identités et une API simulée, sans écriture dans les comptes réels.

## Surprise et Réglages — Web 120

Surprise utilise l’écrin romantique et les matériaux de l’Accueil, avec une seule scène D20 → activité → D6 pair/impair → D20. Les deux lancers mensuels réutilisent le canvas existant, affichent uniquement la face confirmée par le serveur et la laissent visible une seconde avant la transition. Les noms distincts restent identifiables même si les deux profils partagent un prénom. Les six événements restent modifiables, avec accès à leurs activités et à leur historique.

Réglages présente le profil puis cinq rubriques, chacune avec une page de détail. Les formulaires, actions protégées, imports/exports, notifications et fonctions APK existants sont conservés. Le questionnaire de ressenti a été retiré de Réglages et de son aide ; aucune réponse historique n’est supprimée et les bilans de soirée sont inchangés. Les moteurs WebGL et leurs résultats officiels restent les mêmes ; seule la trajectoire visuelle a été adoucie.

`romantic-settings-surprise-browser-check.cjs` teste la vraie application avec une API simulée : six formats, trois états mensuels, deux identités, face officielle, maintien du canvas, absence de double tirage, éditeur d’événement, profil, permissions et navigation des cinq rubriques. Les tests ne modifient pas les comptes réels.

## Sous-pages, éditeurs et inscription — Web 121

Les six planches éditoriales sont intégrées sous forme de seize écrans réels. `editorial-ui.mjs` partage l’en-tête, les lignes et les champs ; `editorial-editors.mjs` utilise les bibliothèques existantes et leurs RPC, avec des pages distinctes pour la liste de cartes, la modification et l’import. Les recherches couvrent le titre, le numéro et la description. Les brouillons restent en mémoire pendant les rafraîchissements ; un changement de carte, de journée ou de page demande confirmation avant de les abandonner. Les pages de détail défilent lorsque le contenu ou le clavier l’exige.

Le questionnaire de ressenti et toutes ses conditions bloquantes ont été retirés de l’inscription et de l’acceptation d’invitation. Aucune réponse de remplacement n’est enregistrée. Les données historiques, le journal chiffré, les bilans de soirée et les règles de tirage sont conservés. Le profil exige toujours une confirmation de majorité explicite et le serveur doit confirmer le courriel. Google est le fournisseur OAuth configuré ; Apple est désactivé dans le projet dédié. Les références d’invitation restent conservées pendant la connexion, la confirmation et la récupération.

Les scènes Soirée et Surprise alignent le vrai modèle WebGL sur le centre du marbre de la ressource existante. Le cadrage s’adapte à l’espace disponible sans modifier le modèle, sa face officielle ou son orientation finale. Le D6 de sélection de la personne qui invite reste immobile avant son lancer. Les crayons des six événements et les informations sous le bouton hebdomadaire ont été retirés à la demande ; l’en-tête de l’Accueil utilise sa hauteur réelle pour ne plus recouvrir la barre de probabilités.

`editorial-details-browser-check.cjs` couvre les seize écrans à six formats (360 × 640, deux hauteurs S25, iPhone, iPad et 1366 × 768), les retours et brouillons, restrictions de genre, minuteries facultatives, imports invalides/annulés/confirmés, catégories distinctes, permissions et parcours de compte. `dice-podium-browser-check.cjs` mesure les sommets projetés des modèles WebGL et vérifie le contact avec le socle et l’immobilité des aperçus. Les API sont simulées : aucun courriel réel ni aucune écriture dans les comptes utilisateurs. Les droits des fonctions installées et la configuration Auth du projet LoveRoll ont aussi été vérifiés en lecture seule ; aucune migration n’est requise. Les notifications indiquent l’autorisation et l’inscription de cet appareil et de ce compte, pas seulement la préférence globale.

## Accueil et icônes — Web 122 / Android 0.13.9

Le dé hebdomadaire utilise à son tour le calcul de contact entre la géométrie WebGL et le marbre. Le décalage CSS fixe est supprimé : le dé reste posé avant et après le tirage, y compris lors d’un changement de hauteur. Le moteur, les cœurs, les probabilités et les résultats officiels sont conservés. L’espacement des petits écrans et un libellé statistique plus concis empêchent les derniers textes de passer sous la navigation.

`home-podium-browser-check.cjs` teste 21 compositions (sept formats, avant tirage puis faces 2 et 6), les noms distincts partageant le même prénom, les marges de navigation, le contact des sommets projetés et la conservation du canvas et de l’orientation au redimensionnement. Il complète les tests des autres scènes, sans écriture dans les comptes réels.

Les icônes Web et APK partagent le même visuel noir bordeaux et rose champagne. Le maître, le prompt imagegen et les exports reproductibles se trouvent dans `design/loveroll-icon/`. Les pixels décodés du PNG Web et du WebP Android sont comparés par `check.py`. Le manifeste PWA conserve son identité et propose une icône maskable ; Android utilise des couches adaptatives et une variante monochrome. L’APK signé 0.13.9 reprend le package et les clés existants, avec comparaison du certificat de signature à celui de 0.13.8. Un ancien raccourci Chrome peut conserver son icône : retirer uniquement le raccourci et le recréer depuis le site si nécessaire.


## Chargement en verre et stabilité des socles — Web 123 / Android 0.13.10

Le nouveau chargement utilise deux illustrations locales distinctes (cœur en verre transparent, satin et marbre), avec logo et texte nets, trois points et battement discret. Il remplace les anciens cœurs opaques et anneaux. Les versions Web, PWA et Android utilisent les mêmes ressources optimisées. L’initialisation, la session et les invitations déterminent toujours la destination réelle, sans délai ajouté ; les erreurs conservent un réessai. Android dispose aussi d’un réessai natif si la page principale ne se charge pas.

La correction de socle vise un défaut reproduit après rafraîchissement : le canvas WebGL restait présent mais son parent était remplacé, perdant son décalage et la référence à la photographie. Le moteur recalcule désormais le contact avec le nouveau parent, même sans changement de taille. Les modèles, faces officielles et règles de tirage restent inchangés. Les trois valeurs du résumé partagent aussi leur ligne de base, indépendamment du nombre de lignes du prénom du partenaire.

Les vérifications comprennent les écrans principaux, les seize sous-pages et les parcours existants avec des comptes simulés, sans écriture dans les données réelles. Les commandes dépendant d’un appareil physique (notifications réellement reçues, clavier Samsung, biométrie/OAuth natif) nécessitent une vérification sur cet appareil. Les captures Chromium et les traces de tests sont conservées dans les artifacts des workflows. Voir `design/loveroll-splash/README.md` pour les ressources et contrôles du chargement.

## Centrage des sept bulles de l’Accueil — Web 124

Les trois résumés et les quatre statistiques centrent désormais leur contenu complet sur les deux axes. Les icônes et les valeurs des résumés forment une ligne indépendante du libellé ; les noms sur plusieurs lignes ne décalent plus cette ligne vers la droite. Les statistiques utilisent des espaces réguliers entre icône, valeur, libellé et précision, avec des marges verticales symétriques. Le pourcentage reste sur une seule ligne.

`home-card-centering-browser-check.cjs` mesure les groupes et les lignes de texte réellement rendues, et conserve les marges et captures dans les artifacts. Il couvre 42 compositions sur sept formats : les valeurs de la capture signalée, les états sans données et avec défis attribués, et les noms longs avant et après le premier tirage, y compris sur 360 × 640. Si le texte dépasse la hauteur disponible d’un téléphone, seul le bloc inférieur se compacte pour conserver les noms complets et les sept bulles au-dessus du menu. Les marges restent symétriques, les espaces entre les trois blocs sont conservés et l’échelle normale revient automatiquement lorsque l’écran s’agrandit. Le bouton Surprise garde une hauteur de cible supérieure à 44 px.

`home-podium-browser-check.cjs` conserve les vérifications du dé avant/après résultat, lors de trois rafraîchissements et au redimensionnement. Le contrôle des noms longs vérifie aussi que l’adaptation à deux hauteurs conserve le même canvas WebGL. Ces contrôles utilisent une API simulée et ne modifient pas les comptes réels. Le cache Web passe à 124 ; l’APK 0.13.10 reçoit cette interface connectée depuis le site, sans changement de moteur ni de données.

## Marges de Soirée — Web 125

Les anciennes contraintes de hauteur de la mise en page PC sont maintenant limitées à leur ancien écran. Le bloc cadeau de la Soirée actuelle prend la hauteur de son contenu et conserve un espace au-dessus du menu sur PC, tablette et téléphone. Les textes, les contrôles et le dé gardent leur taille ; la scène utilise l’espace restant.

La grille des six événements Surprise utilise ses deux rangées actuelles, sans la troisième rangée vide imposée par l’ancienne feuille PC. Sur un téléphone de 660 px de hauteur ou moins, les boutons de navigation de Soirée et Surprise ont la même hauteur que ceux des trois autres onglets et gardent une cible tactile supérieure à 44 px.

`design-reference-browser-check.cjs` contrôle aussi les limites de chaque bouton visible et le bas du bloc cadeau. Il couvre les cinq onglets sur neuf formats, dont 360 × 640, 1366 × 700 et 1366 × 768, afin de détecter un élément masqué par la navigation même si la page ne défile pas. Les données de couple restent simulées.


## Cristal de référence et gravures — Web 132

La matière reprend le cœur du chargement : volume bordeaux transparent, bords rosés champagne et poli brillant. Le moteur Three.js reste celui de l’application. La photographie du socle est projetée uniquement dans le tampon de réfraction physique : le verre déforme le vrai décor, et le canvas reste transparent autour du modèle. Une paroi optique continue évite les chiffres fantômes dans les autres facettes. Les faces, les orientations officielles et les règles des dés sont conservées.

Les points des D6 concernés sont des cavités concaves avec un fond blanc opaque. Les chiffres D20, D35 et D100 sont creusés dans les faces, avec un fond blanc opaque sous la surface. Les contours numériques vectoriels locaux dérivent de DejaVu Sans Bold ; leur notice se trouve dans `assets/dice-numerals-LICENSE.txt`. Aucun chargement de police supplémentaire. Les D6 non tirés gardent leur symbole neutre.

`crystal-glass-browser-check.cjs`, appelé par le contrôle des socles, vérifie le vrai WebGL sur les quatre géométries : gravures sous la surface, blanc opaque, transparence autour du modèle et réaction du verre à deux décors contrastés, sans rotation du résultat. Une mesure d’alpha seule serait incorrecte pour le verre physique, dont les pixels contiennent déjà le décor réfracté. Les contrôles de contact, de conservation du canvas, des 100 orientations du D100 et des lancers restent applicables. Les essais de parcours utilisent des données simulées.


## Accueil « Deux colonnes » — Web 133

L’Accueil reprend la proposition 9 choisie : dé hebdomadaire agrandi sur le socle existant, probabilités sous la scène, accès à la Surprise puis deux panneaux côte à côte « Ce soir » et « Nos statistiques ». Les sept indicateurs conservent leurs données réelles et leurs états sans données. Le gros titre est plus compact ; le logo et le rituel gardent l’ancre commune aux autres pages. Le matériau et les gravures approuvés en Web132 sont conservés sans modification.

Les règles de disposition sont limitées à l’Accueil. Les huit règles de marque partagées préexistantes sont reprises à l’identique ; les autres onglets et sous-pages ne sont pas redessinés. Sur PC, la grande scène et ses contrôles occupent la gauche, et l’accès à la Surprise avec les deux panneaux occupent la droite. Le mode paysage compact garde aussi les informations et les contrôles à l’écran. Le bas de page se compacte uniquement si des noms longs dépassent réellement la place disponible.

Les contrôles existants des sept indicateurs suivent la nouvelle disposition : valeurs alignées, texte complet, marges des rangées, colonnes de même hauteur et navigation dégagée. Le contrôle des socles vérifie le contact du grand modèle, son immobilité, le maintien du canvas au rafraîchissement et au redimensionnement. Le contrôle des cinq onglets conserve la vérification des en-têtes communs et des neuf formats. Les données de compte des parcours sont simulées.


## Proportions de l’Accueil 9 — Web 134

Le titre du rituel non tiré garde deux lignes sur téléphone, quelle que soit la métrique de la police de la plateforme. La scène possède une hauteur minimale propre ; le socle est recadré plus bas, et le modèle conserve 24 px d’air au-dessus de lui (18 px sur les plus petits écrans, 10 px en paysage court). La marge optique est une option CSS de la scène d’Accueil : tous les autres socles conservent les 4 px précédents. Matière, gravures, orientations et animation ne changent pas.

Les libellés « Attribués à », le nom et les défis restants occupent des lignes distinctes, comme sur la proposition choisie. Le panneau des statistiques garde les valeurs au-dessus de leurs libellés, y compris sur les écrans courts. Les en-têtes communs gardent leur ancre. Les contrôles du dé mesurent les marges au-dessus du modèle et la séparation avec le sous-titre, en plus du contact au socle. Les parcours de l’Accueil incluent aussi un viewport de 360 × 704, proche des proportions de la capture Android sans les barres système.


## Statistiques centrées et progression des défis — Web 135

Le panneau « Nos statistiques » de l’Accueil centre les chiffres, les libellés et leurs précisions tout en conservant les icônes et les valeurs existantes. L’introduction de Soirée devient « 200 défis à vivre à deux », suivie de « Brassez le dé et découvrez votre prochain défi. ». Les titres des étapes d’une soirée active restent contextuels.

La tuile « 100 + 100 » affiche désormais les défis complétés parmi les 200 emplacements Sensuel et Sexuel. La progression réunit les historiques déjà chargés pour les deux partenaires et les cartes de la soirée courante. Chaque emplacement catégorie/numéro complété compte une fois, même après plusieurs réalisations ; les défis simplement pigés, commencés ou passés ne comptent pas. Les essais vérifient les doublons, les états incomplets, la limite de 200 et la même progression depuis les deux comptes simulés.


## Titres principaux harmonisés — Web 136

L’Accueil propose « Cette semaine, on joue ? » avant le tirage, puis affiche toujours le nombre officiel de soirées obtenu. Les cinq onglets partagent la même hauteur de titre, la même police et un centrage sur la page. Les sous-titres des introductions sont retirés ; Surprise et Avent n’imposent plus de saut de ligne dans leur titre. Les instructions des cartes et les indications des étapes restent dans leurs sections respectives.

La feuille commune `ritual-titles.css` est chargée après les dispositions existantes et préchargée hors ligne. Elle adapte aussi l’ancrage des titres en paysage compact et sur l’Avent PC. Le contrôle des cinq onglets compare les lignes de texte réellement rendues, leur centrage, leur hauteur et leur typographie, en plus des vérifications de navigation et de contenu existantes.


## Cadres photo communs — Web 137

Accueil, Soirée et Surprise encadrent leur photographie avec les mêmes coins arrondis et le même fin trait rosé. L’Accueil utilise la largeur intérieure de la page ; son ancien fondu sur les bords est retiré. La photo de Surprise remplit son cadre, tandis que les commandes de tirage restent juste dessous.

Le mois reste centré dans la partie haute de la photo de Surprise. Une marge optique propre à cette scène réserve sa place au-dessus du dé. La question, les descriptions génériques et la consigne de modification des événements sont retirées. Le nom et la description de l’activité restent accessibles dans sa fenêtre, le tirage de l’invitation conserve les repères pair/impair et son résultat, et les six événements restent modifiables.

La feuille commune `ritual-scenes.css` est préchargée hors ligne. Le moteur existant recalcule le contact avec le socle quand les cadres changent de taille ; les géométries, les gravures, les matières, les probabilités et les résultats officiels sont conservés.


## Scènes identiques — Web 138

Surprise et la présentation de Soirée utilisent la même grille photo : même emplacement, mêmes dimensions, même image, même cadrage et même socle. Les commandes, le résultat de l’invitation et les événements restent dans un espace distinct pour que le décor ne change plus de taille pendant le parcours D20/D6. Le mois reste superposé en haut de la photo.

Le haut du contour rosé et les deux côtés sont alignés entre Accueil, Soirée et Surprise. La largeur maximale, les marges et l’espace sous le titre sont communs, y compris sur tablette et ordinateur. Les dés, les gravures et leurs résultats officiels utilisent toujours le moteur existant.
