# LoveRoll — inventaire et audit de l’interface Web127

Date : 17 octobre 2026. Audit des routes, des liens de réglages et des actions réellement accessibles, complété par des captures avec `editorial-fixture.cjs`. Les fixtures utilisent des comptes, invitations, cartes et historiques fictifs. Aucun envoi d’invitation, changement de couple, enregistrement de bilan ou modification de données réelles n’a été effectué.

## Formats examinés

| Format | Fenêtre CSS |
| --- | --- |
| Galaxy S25 | 412 × 824 |
| Petit mobile | 360 × 640 |
| iPad | 820 × 1180 |
| PC | 1366 × 768 |

Les captures portent sur l’application et ses contrôles, avec défilement quand le contenu le demande. Les mesures CSS et les vérifications par `elementFromPoint` complètent l’examen visuel des boutons. Les captures synthétiques des soirées figent leur état pour éviter que la synchronisation de la fixture vide ne le remplace : elles ne constituent pas une validation de la synchronisation, du rendu WebGL ou du backend.

## Inventaire des parcours courants

| Ensemble | Pages, sous-pages et fenêtres examinées | État / fichiers principaux |
| --- | --- | --- |
| Entrée anonyme | Accueil, connexion, inscription, profil, confirmation d’adresse, mot de passe oublié et nouveau mot de passe | Gabarit éditorial existant ; `onboarding.mjs`, `app.js`. Les formulaires longs restent défilables. |
| Invitation reçue et compte | Invitation reçue, propriétaire seul, compte déjà associé à deux, membre non propriétaire, association en cours, erreur d’association, bienvenue | Les anciens encarts isolés ont été remplacés par le gabarit commun. Les conditions d’association, choix de compte et avertissements d’archivage restent présents. |
| Création et attente | Créer notre duo, préparer ses cartes, attente du partenaire, invitation complète, partage, copie manuelle, aperçu | Refaits dans `app.js`, `onboarding.mjs`, `waiting-invitation-v127.css`. L’attente tient dans une fenêtre et mène à la page d’invitation complète. |
| Cinq onglets | Accueil, Soirée, Surprise, Avent, Réglages | Navigation réelle examinée ; pas seulement les pages initiales de chaque onglet. |
| Réglages | Menu, compte, notre duo, notifications, cartes et activités, confidentialité, application, aide connexion/dés/synchronisation, outils du créateur | Leurs entrées UI ont été suivies. Notifications reçoit sa feuille dédiée `notification-design-v127.css`. Les outils avancés conservent leurs gardes d’accès. |
| Bibliothèques | Liste Sensuel/Sexuel, recherche sans résultat, filtres, édition d’une carte, choix des rôles et minuteur, bibliothèque mensuelle, calendrier de l’Avent, événements spéciaux et leurs options | Gabarits existants dans `editorial-editors.mjs`. Les écrans de liste et d’édition ont été capturés sur les quatre formats. |
| Import / export | Outils JSON, export et modèle, sélection de fichier, collage, erreur de JSON, confirmation d’abandon d’un brouillon | Fenêtre partagée examinée avec la bibliothèque de soirée. Aucun import confirmé ni donnée réelle remplacée. Les autres bibliothèques réutilisent ce composant. |
| Soirée courante | Avant le premier lancer, résultats prêts, menu supplémentaire, confirmation de clôture, liste des défis, détail proposé et accepté avec minuteur | Parcours actuel de `premium-evening.mjs` / `app.js`, ouvert à partir de données locales cohérentes. Les mutations de jeu ne sont pas déclenchées par cet audit. |
| Soirée compatible | Ancienne session active, attente des lancers, résultats prêts, défi proposé/accepté, fin possible et confirmation d’arrêt | `renderLegacySession()` utilise maintenant l’en-tête commun « Notre soirée » et un contenu défilable avec `legacy-session-v127.css`. Conditions, compteurs, actions, textes de défi et durées conservés. |
| Calendrier et bilan | Mois vide, historique sélectionné, groupes de chaque personne repliés/dépliés, cartes terminées/passées, bilan reçu, formulaire du bilan et validation incomplète | `evening-calendar.mjs`, `evening-review.mjs`. Les anciennes routes Journal renvoient maintenant vers le calendrier de soirée. |
| Surprise | État initial, résultat mensuel, détail d’activité et minuteur, édition d’événement, accès à ses activités et à son historique | La sous-page d’activités/historique d’occasion a été remise au gabarit éditorial avec `occasion-details-v127.css`. |
| Avent | Calendrier, historique des années, jour ouvert, lettre et minuteur | Fenêtres et fermeture examinées. Les jours indisponibles restent désactivés. |
| Fenêtres transversales | Dissociation annulée, abandon d’un brouillon fictif, installation proposée et instructions, confirmations, copie de lien | Refonte et contrôle dédié dans `premium-dialogs.mjs`, `web-dialogs-v127.css`, `web-dialogs-v127-browser-check.cjs`. |

## Omissions corrigées pendant l’audit

- **Attente / invitation propriétaire :** suppression de la longue page qui répétait l’invitation complète ; titre, marque et actions alignés sur Réglages. Les détails secondaires sont repliables. Les statuts préparée, envoyée, expirée, annulée, acceptée et partenaire connecté sont couverts.
- **Création / association de compte :** suppression des anciens gros encarts et de la marque différente sur les parcours sans couple, d’erreur et d’invitation déjà associée. L’action de rejoindre reste réservée au propriétaire seul ; l’avertissement sur les archives est conservé.
- **Notifications, installations et confirmations :** harmonisation des surfaces omises, avec contrôles autonomes ajoutés à la validation de design.
- **Journal et occasions :** l’ancien journal encore accessible a été identifié par navigation réelle. Les entrées Journal mènent désormais au calendrier ; la page activités/historique des occasions reçoit la présentation actuelle. Le code sans entrée UI n’a pas été traité comme une page manquante.
- **Soirée compatible :** le dernier grand en-tête et les anciennes cartes de la branche pour sessions existantes ont été remplacés par le gabarit éditorial, les matières communes et un défilement intérieur. Les commandes du bas restent au-dessus de la navigation.
- **Bilan au clavier :** le dialogue est maintenant pris en charge par le helper partagé. Le focus entre dans le bilan, le calendrier devient `inert` et Tab reste dans la fenêtre. La restauration après Échap ignore le déclencheur devenu invisible dans un groupe replié et rejoint le titre visible. Un rechargement de données pendant la saisie conserve le focus sur le cœur actif.

## Validation et preuves

`waiting-invitation-browser-check.cjs` est passé sur les quatre formats : **76 captures**, couvrant attente, préparation, invitation, six statuts, copie manuelle, aperçu, création, cinq états de compte et bienvenue. Les boutons sont atteignables après défilement, les zones ciblées mesurent au moins 44 px, les détails s’ouvrent au clavier et les actions interdites aux comptes non éligibles restent absentes. Aucun RPC de mutation d’invitation n’est appelé.

Les suites `invite-password-auth.test.mjs` et `couple-dashboard.test.mjs` passent après les modifications de présentation. La syntaxe de `app.js`, `onboarding.mjs` et du contrôle navigateur a également été vérifiée.

Le passage complémentaire des rituels a produit **88 états capturés sur les quatre formats**, sans erreur JavaScript ni débordement horizontal. Ce passage a identifié la dernière présentation ancienne de la soirée compatible, reprise et recontrôlée ensuite. Le contrôle du bilan passe sur S25 et petit mobile avec Tab, Maj+Tab, Espace, Échap et un événement `visibilitychange` déclenchant le vrai rechargement de données de la fixture. Le cœur choisi conserve sa note et son focus après remplacement du DOM ; la fermeture rend le focus au titre visible du calendrier et retire `inert`.

La reprise de la soirée compatible passe sur **S25, petit mobile et PC : 18 états et 27 captures**. Les six états sont attente des lancers, résultats prêts, défi proposé, défi accepté, fin autorisée et confirmation d’arrêt. Tous les boutons du contenu, dont les deux accès aux calendriers en bas, sont atteignables après défilement et font au moins 44 px. Les trois documents mesurent exactement la hauteur de leur fenêtre (824, 640 et 768 px) ; le contenu défile dans une zone qui s’arrête avant la navigation. Les textes du défi, le minuteur à cinq minutes et les actions propres à chaque état sont vérifiés, sans les activer. Le bloc des conditions et du contenu dynamique est identique avant/après. Aucun débordement horizontal ni erreur JavaScript ; la navigation vers Accueil quitte correctement cette présentation.

Le workflow de design exécute désormais les contrôles `notification-design-v127-browser-check.cjs`, `waiting-invitation-browser-check.cjs`, `secondary-pages-v127-browser-check.cjs` et `web-dialogs-v127-browser-check.cjs`. Le résultat CI et la validation native doivent être consignés lors de la validation de publication.

Les preuves locales de cette session sont sous `/tmp/loveroll-v127-audit/` : `preliminary.json` pour les réglages/aides, `before-owner/` et `after-owner/` pour les comparaisons, `inventory/surfaces.json` pour les sous-pages et formulaires, `rituals/` pour calendrier, bilan, soirée, Surprise et Avent, et `legacy-after/` pour les 27 captures finales de la soirée compatible et ses mesures. Le contrôle durable d’attente/invitation écrit ses preuves dans `design-captures/waiting-invitation-v127/` par défaut.

## Parcours de compatibilité et périmètre natif

La **soirée compatible** reste destinée à une session active dont `paired_turns` ou `self_draws` n’est pas activé. Elle n’est pas proposée comme nouvelle soirée par la navigation courante. Son ancien habillage a été remplacé dans `renderLegacySession()` (`app.js`) : marque commune, titre « Notre soirée », cartes et boutons harmonisés, défilement intérieur. L’ancien document de 1 920 px sur S25 et 1 879 px sur petit mobile tient désormais dans la fenêtre, avec toutes ses commandes accessibles. Ses liens Journal suivent la redirection vers le calendrier actuel. Les règles et les données de ces anciennes sessions restent inchangées.

L’entrée Android **« Anciennes données hors ligne »** de Confidentialité est distincte. Elle apparaît si le pont natif expose `openLegacyOffline` et ouvre `MainActivity` par `loveroll://offline`. La lecture de `MainActivity.java` confirme que **14 écrans historiques atteignables conservent l’ancien habillage** : fonds violets, boutons rose vif, titres sans-serif et glyphes/emoji. Le gabarit commun (`draw()`, `card()`, `addButton()`) et les fenêtres propres à `showResultDialog()` utilisent encore cette présentation.

| Groupe | Écrans historiques atteignables |
|---|---|
| Cinq onglets | Accueil (`home`), Soirée (`game`), Défi spécial (`special`), Avent (`advent`), Réglages (`settings`). |
| Neuf sous-pages | Événements (`occasions`), détail d’un événement (`occasion_detail`), journal (`journal`), nouvelle entrée (`intimacy`), questionnaires (`feedback`), réponse individuelle (`feedback_answer`), vie privée (`privacy`), règles (`rules`), mises à jour (`updater`). |

Les fenêtres qui appellent les composants partagés `PremiumDialog` et `UpdateManager` bénéficient du nouveau style. Certains réglages renvoient aussi vers les pages connectées actuelles. L’archive native reste une application locale interactive, avec ses tirages et formulaires. **Les captures de cet audit ne valident pas l’affichage ni les interactions de ces 14 écrans natifs** : ce constat repose sur la lecture du code, sans extension de la refonte historique.

Les fonctions résiduelles sans entrée UI repérée, notamment l’ancienne prévisualisation d’idées et le mode de démonstration, ne sont pas comptées comme parcours utilisateurs actuels. Cet audit ne remplace pas les contrôles Android, d’authentification réelle, de permissions système, de démarrage ou de reprise réseau.
