# LoveRoll — Protocole UX/UI : audit global, expérience client et uniformité durable

**LR-AUDIT-GLOBAL-20261028 · 28 octobre 2026.** Mandat prioritaire du propriétaire, à exécuter avant les nouveaux développements selon le bloc en tête du [prompt maître](LOVEROLL_MASTER_PROMPT.md). Statut : directive opérationnelle ; les corrections et contrôles restent à réaliser et à prouver dans le [suivi](LOVEROLL_SUIVI.md).

## Mission et autorisation

L'accumulation des ajouts a dégradé la cohérence de LoveRoll. Je demande une remise en ordre complète : fonctionnement des boutons, compréhension, ergonomie, esthétique premium et uniformité de toutes les pages.

Exécute l'audit, puis les corrections et les protections durables. Un rapport seul ne termine pas la mission. Cette instruction autorise l'harmonisation visuelle transversale selon l'identité déjà approuvée. Les changements de règles du jeu, de prix, de droits ou les nouvelles fonctionnalités restent soumis aux décisions produit existantes.

Pendant ce chantier, donne priorité à la stabilisation et à la cohérence. Préserve les travaux engagés et ne termine avant l'audit que les correctifs nécessaires à sa réalisation ou à la remise en état d'un parcours bloquant. Les autres fonctionnalités attendent la clôture vérifiée de la campagne. Avance par lots complets pendant la session, sans me demander « Continue » entre les étapes ordinaires.

## 1. Reprendre les vraies sources

Dépôt : https://github.com/fredvolks/loveroll

Lire les AGENTS.md applicables, puis :
- docs/LOVEROLL_WORK_START.md ;
- les décisions et critères pertinents de docs/LOVEROLL_MASTER_PROMPT.md ;
- l'état courant de docs/LOVEROLL_SUIVI.md et la passation utile ;
- les vrais fichiers Web, Android, PWA, styles, composants et assets concernés.

Synchroniser la base, relever son SHA et préserver les travaux concurrents. Confronter le rendu publié, le code courant et la version Android servant de référence. Identifier les différences de version avant de conclure à un défaut.

## 2. Mobiliser les regards experts

Si les sous-agents sont disponibles, déléguer les audits indépendants en lecture seule, en parallèle quand utile. Un seul intégrateur modifie le code et consolide les décisions. Chaque spécialiste remet des constats concrets, pas un long rapport de rôle.

| Rôle | Responsabilité |
|---|---|
| **Pilote / développeur intégrateur** | Organiser le lot, préserver l'architecture et les droits, consolider les constats, appliquer seul les modifications et livrer. |
| **Direction artistique** | Couleurs, images, typographie, proportions, hiérarchie visuelle et cohérence de la marque. |
| **Gardien du système de design visuel** | Assurer la fidélité durable à la référence Android approuvée : tokens sémantiques, vrais composants, variantes et états, absence de CSS concurrent et de styles inventés; examiner captures et régressions sur toutes les pages/formats. Signaler les écarts avec preuves et correctifs à l'intégrateur. |
| **UX / ergonomie / accessibilité** | Navigation, ordre des actions, lisibilité, vocabulaire, confort tactile et clavier. |
| **Responsive** | Examiner dès le départ téléphone, tablette et PC, orientations, contenu long, zoom, clavier et adaptations de disposition. |
| **Client / utilisateur final** | Comprendre et terminer le vrai parcours, relever ambiguïtés, efforts inutiles, frustrations et valeur perçue. |
| **QA fonctionnelle et visuelle** | Vérifier commandes, états, erreurs, régressions, preuves et résultat effectivement publié. |

Le rôle distinct de responsable sécurité reste en pause selon la décision existante ; les protections techniques en place restent applicables.

Si les sous-agents sont indisponibles, exercer explicitement ces regards sans prétendre que plusieurs agents ont travaillé. L'expertise doit se voir dans les constats et les corrections, pas dans une déclaration « expert validé ».

## 2 bis. Responsive dès le départ et après chaque changement

L'expert responsive examine l'état initial en même temps que direction artistique, gardien du design visuel, UX, client et QA. Définir pour chaque famille d'écran une disposition lisible sur petit/grand téléphone, tablette portrait/paysage et ordinateur, selon le rôle et son usage : jeu sur téléphone, Studio d'abord iPad/PC. Garder une identité commune avec des compositions adaptées à l'espace disponible.

Vérifier navigation, proportions, zones tactiles, safe areas, faible hauteur, clavier virtuel, zoom/texte agrandi, contenu long, focus et défilement utile. Tester tôt un vrai écran représentatif puis formulaires, menus et modales ; une modification partagée exige de revoir ses consommateurs. Le responsive demeure un contrôle de chaque ajout, avec preuves par format et distinction appareil physique/émulation.

## 3. Se mettre réellement dans la peau du client

Examiner chaque parcours comme un client qui ouvre l'app et souhaite jouer, sans lire le dépôt ni recevoir une explication du développeur. Prendre deux points de vue : une personne habituée au téléphone et une autre peu technophile.

Pour chaque écran et chaque étape, répondre :
- Est-ce que je comprends où je suis, ce que je peux faire et l'action attendue maintenant ?
- L'action principale est-elle évidente ? Les boutons secondaires ont-ils une place et une importance compréhensibles ?
- Les libellés sont-ils simples ? Un pictogramme ambigu reçoit-il une explication accessible ?
- Est-ce clair à qui appartient le tour ou le défi, ce qui dépend du partenaire et ce qui a été sauvegardé ?
- Est-ce facile de revenir, fermer, corriger un choix, reprendre ou quitter sans perdre involontairement sa progression ?
- Y a-t-il trop de texte, de clics, d'options simultanées, de boutons ou de décor ?
- Les commandes sont-elles confortables à toucher et utilisables lorsque le clavier apparaît ?
- Comprend-on une attente, un verrouillage, une erreur ou un résultat après chaque action ?
- L'ensemble donne-t-il confiance, envie de continuer et une impression cohérente avec le prix ?

Chaque problème doit préciser : « le client risque de comprendre/faire X ; correction Y ». Une appréciation « joli », une note sur 10 ou un test technique vert ne remplace pas cette analyse.

Cette revue représente le point de vue du client ; ne pas la présenter comme une étude réalisée avec de vrais utilisateurs si aucun essai humain n'a eu lieu.

## 4. Inventorier toute l'application

Découvrir les routes, onglets, sous-pages et états réellement accessibles dans le code et à l'exécution. Établir un tableau unique de couverture et le conserver dans le suivi existant.

Couvrir notamment :
- icônes Android/PWA/Safari, lancement, chargement, connexion, inscription, récupération et intégration au couple ;
- Accueil, Soirée, D6, D100, questionnaire, catégories, cartes, défis, minuteries, reprise et fin de soirée ;
- Surprise, Éclat et ses coffrets, Avent, calendrier, historique, favoris et profils ;
- invitation « As-tu envie de jouer ce soir ? », réponses et notifications ;
- Réglages et toutes leurs sous-pages, abonnements et écrans de paiement existants ;
- Studio/super administration, gestion des comptes de test et vrai jeu A/B dans le périmètre disponible ;
- menus secondaires, sélecteurs, champs, onglets, modales, messages, confirmations et commandes de fermeture.

Inclure les états initial, sélectionné, pressé, focus, désactivé, verrouillé, chargement, vide, erreur, succès et contenu long lorsqu'ils s'appliquent.

Tableau minimal : écran/état/rôle/format, objectif client, défaut observé, priorité, correction, preuve, statut. Distinguer « à développer », « corrigé », « vérifié » et « non vérifié ». Aucun écran absent ou inaccessible ne compte comme audité.

## 5. Fixer une identité unique et la coder

Référence visuelle : **l'Accueil Android déjà approuvé**, avec ses véritables assets HD. Identifier ses fichiers et valeurs actifs. Si l'appareil est inaccessible, utiliser les sources et références disponibles en signalant la comparaison physique restante.

Direction : rubis/bordeaux, rose maîtrisé, velours et roses HD, verre raffiné, dorure discrète, lisibilité et sobriété premium. Appliquer une même charte avec une densité adaptée au jeu, aux formulaires et à l'administration.

Centraliser les couleurs sémantiques, polices, tailles, espacements, arrondis, bordures, ombres, transitions et états. Réutiliser les composants existants ; consolider leurs variantes avant d'en créer de nouvelles.

Uniformiser les boutons principaux/secondaires/destructifs, champs, switches, cartes, titres, onglets, dialogues, alertes et navigation. Donner le même traitement à la même fonction dans toute l'app.

Nettoyer les causes des écarts : anciens thèmes encore chargés, sélecteurs concurrents, styles dupliqués et surcharges successives. Vérifier les fichiers réellement servis et les caches lorsqu'un correctif ne s'affiche pas.

Aucune couleur de commande inventée au détour d'une page. Une nouvelle variante se définit dans le système commun avec son usage. Préserver les couleurs propres aux images, aux contenus métier et au moteur 3D lorsqu'elles sont nécessaires.

## 5 bis. Gardien du système de design visuel — contrôle permanent

**Position :** immédiatement après la direction artistique dans les sept rôles (un intégrateur et six spécialistes). La direction artistique décide **comment l'expérience doit paraître** conformément à l'Accueil Android validé ; le gardien contrôle **comment cet aspect se maintient sans dériver** lorsque des écrans et fonctions s'ajoutent. Il ne réinvente ni la charte ni le jeu et ne crée pas une étape d'approbation humaine supplémentaire.

**Avant de modifier une interface :** relever sur le code réellement servi les couleurs, polices, dimensions, espacements, matériaux, assets HD, socles, icônes, composants et leurs états ; retrouver la variante commune appropriée. Repérer CSS dupliqué, `!important` concurrents, styles en ligne, ruptures de proportions, images superposées, couleurs ou boutons improvisés. Ne jamais prendre une capture ou un design de branche non publié pour une référence approuvée sans vérifier sa provenance.

**Pendant l'intégration :** l'unique intégrateur réutilise les tokens et composants partagés, étend les variantes au niveau commun lorsque nécessaire, et examine leurs consommateurs. Le gardien relève toute déviation par écran et état, y compris différentiels Android/iPad/PC, boutons, cartes, navigation, dialogues, D6/D100, socle et décors. Une exception utile au gameplay ou aux médias doit être documentée ; ne pas forcer les vrais dés WebGL à utiliser le style d'un bouton.

**Après le changement :** comparer le rendu réellement exécuté aux références et aux pages sœurs, sur petit/grand téléphone, iPad portrait/paysage et PC, avec interaction, texte long, états chargement/erreur/succès/désactivé et clavier. Fournir pour chaque écart : `page / composant / état / format / symptôme côté client / référence / correctif / capture / statut`. Verdict **CONFORME**, **À CORRIGER** ou **NON VÉRIFIÉ** (une preuve manquante ne vaut jamais conformité). Le pilote corrige jusqu'aux critères du lot ; pas de veto d'agent ni de six rapports en série.

**Protection future :** exécuter en CI les gardes contre styles arbitraires ou couleurs non tokenisées dans les ajouts, les tests des composants partagés et les contrôles visuels multi-formats sur les pages touchées. Vérifier que la CI concerne le **SHA final**, examiner réellement les captures et ne jamais approuver automatiquement une nouvelle baseline pour masquer une régression. Si un contrôle n'est pas encore implanté, le marquer **à faire** ; l'inscription du rôle dans les documents ne prouve pas la protection installée. Conserver le protocole présent comme seule source détaillée, sans copier ce contrat dans chaque sous-prompt.

## 6. Préserver les décisions LoveRoll

- Conserver les vrais dés WebGL, les faces officielles, animations et résultats serveur.
- Vérifier les demandes existantes : D100 Soirée aux proportions approuvées de Surprise, face gagnante lisible, assets HD cohérents, scène et socle correctement composés.
- Vérifier le retrait du masque inutile en haut à gauche selon la demande existante.
- Préserver les règles, textes approuvés, intensités, probabilités, minuteries, consentements, droits Premium et coffrets.
- Réutiliser le vrai jeu pour les essais A/B, avec des comptes de test isolés.
- Préserver authentification, consentements, confidentialité, RLS, paiements, notifications, géolocalisation et stockage ; un besoin décoratif ne justifie aucune mutation de leurs règles.
- Les images d'ambiance gardent une composition propre : absence de doubles socles, cadres artificiels, collage de couches ou décor masquant les commandes.
- Adapter Studio à l'iPad/PC en priorité et aux urgences sur mobile.
- Conserver l'accès aux fonctionnalités en simplifiant leur présentation. Tout changement important de scénario ou de navigation hors des décisions approuvées reste une proposition distincte.

## 7. Corriger par lots cohérents

Commencer par les parcours cassés et les actions incompréhensibles. Corriger ensuite le système partagé, puis les pages qui l'utilisent.

Vérifier tôt une page représentative et ses vraies interactions avant de généraliser. Couvrir également un écran de jeu, un formulaire et une modale : une seule page réussie ne démontre pas l'uniformité.

Tester chaque commande inventoriée dans un scénario autorisé : action attendue, retour visible, valeur conservée, erreur intelligible, absence de double soumission. Vérifier aussi les restrictions attendues ; un bouton volontairement indisponible doit rester compréhensible.

Utiliser des comptes et environnements de test pour les opérations qui le nécessitent. Les essais de présentation ne doivent pas toucher aux données de vrais couples.

## 8. Vérifier le rendu et l'expérience

Comparer des captures de l'app réellement exécutée : même état, mêmes données de test, même format, version identifiée. Examiner les images produites.

Couvrir petit téléphone, format S25 Ultra, iPhone/WebKit, iPad portrait/paysage et PC ; adapter aux environnements disponibles et distinguer émulation et appareil physique.

Vérifier débordements, éléments cachés, clavier, zones sûres, texte agrandi, focus visible, contraste et cibles tactiles confortables. Autoriser un défilement utile quand la hauteur l'exige.

Après les corrections, le relecteur indépendant réévalue les constats client et le résultat visuel, puis l'intégrateur répare les écarts restants. Verdict : **UX OK**, **À CORRIGER** ou **NON VÉRIFIÉ**, avec preuve et limite explicites.

## 9. Installer les protections pour tous les futurs ajouts

La revue UX se déclenche à chaque ajout ou modification visible pendant la session Work : objectif et référence avant le changement, vrai parcours et captures après, verdict puis corrections dans le mandat autorisé. Grouper les micro-corrections par lot. Une refonte de scénario ou de navigation majeure non approuvée reste une proposition distincte.

Aucun outil de design payant, abonnement ou service externe obligatoire. Les outils visuels facultatifs respectent les connexions, quotas et autorisations existants ; à défaut, comparer le rendu réel et corriger directement le code.

Cette partie doit être implémentée dans le dépôt et exécutée par la CI. Chaque ajout réutilise les composants communs et reçoit les regards direction artistique, gardien du design visuel, UX, responsive, client et QA pendant le lot ; l'examen réel du rendu complète les contrôles automatiques.

- Toute nouvelle interface réutilise les tokens et composants communs.
- Installer des vérifications ciblées empêchant de nouvelles couleurs arbitraires et des styles de commandes dupliqués dans les fichiers modifiés. Prévoir des exceptions explicites pour les besoins légitimes.
- Maintenir une petite référence des composants et de leurs états, dans l'outillage de développement existant.
- Ajouter des comparaisons automatiques de captures sur les pages clés et les états touchés, ainsi que des tests utiles de leurs interactions.
- Tester les autres pages dépendantes lorsqu'un composant partagé change.
- Étendre la couverture à chaque nouvelle page : composants utilisés, états, formats, compréhension client et preuve de rendu.

Les captures doivent être reproductibles : environnement stable, polices chargées, données de test maîtrisées. Pour les dés, contrôler un état final de test sans modifier les résultats de production. Ne pas masquer l'élément à vérifier.

Établir les références après correction et revue du rendu. Toute mise à jour d'une référence exige une comparaison et une justification. Interdire l'approbation automatique d'une nouvelle capture ou l'assouplissement des seuils pour faire passer une régression.

Ce fichier est la source détaillée unique du protocole. Relier sa règle permanente au prompt maître et aux AGENTS.md concernés. Consolider les passages contradictoires ; garder une source détaillée unique et des liens courts ailleurs.

Les tests de captures détectent des différences ; l'évaluation ergonomique et esthétique doit rester intégrée aux sessions Work qui modifient l'interface. Aucun jugement créatif en arrière-plan ne doit être annoncé sans dispositif réellement disponible et vérifié.

## 10. Livrer et poursuivre

Livrer des lots complets avec tests proportionnés. Attendre les checks requis sur le SHA final, corriger les causes d'échec, puis fusionner et publier dans le cadre des autorisations déjà accordées.

Vérifier le rendu effectivement servi après publication. Distinguer Web publié, APK construit et appareil physique testé.

Restitution courte :
1. Ce que le client comprend et utilise mieux.
2. Pages/boutons corrigés, et couverture réelle.
3. Protections durables installées et effectivement exécutées.
4. Preuves avant/après, PR, SHA et version publiée.
5. Éléments encore non vérifiés ou bloqués, avec prochaine action exacte.

Ne déclarer « toute l'app uniforme » que lorsque l'inventaire est couvert. Conserver une passation précise si la session se termine avant.

Reprendre l'inventaire existant, ou l'établir une fois s'il est absent ; poursuivre les pages et états ouverts avec les audits indépendants disponibles. Les entrées vérifiées et inchangées conservent leurs preuves. Après la clôture de la campagne globale, poursuivre la revue ciblée permanente de chaque ajout.

**Autorité :** les décisions produit les plus récentes et le prompt maître prévalent. La charte provient du rendu Android approuvé et des fichiers réellement actifs, notamment les CSS communs lorsqu'ils sont présents ; leur état courant peut lui-même contenir des défauts à corriger. Une capture montre un rendu, sans modifier les règles serveur.
