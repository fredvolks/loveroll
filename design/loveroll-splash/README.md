# LoveRoll — chargement en verre (Web 127 / Android 0.13.12)

Deux illustrations ImageGen générées séparément : cœur en verre rose champagne sur fond transparent, et décor photographique bordeaux presque noir avec satin et marbre en bas. Référence de composition : visuel fourni par le propriétaire le 17 octobre 2026. Aucun mot, logo, bouton ni indicateur n’est intégré aux pixels.

- `couple-web/assets/loveroll-glass-heart-v123.webp` : 640 × 640 RGBA, 92 870 octets.
- `couple-web/assets/loveroll-splash-satin-v123.webp` : 941 × 1672 RGB, 47 064 octets.
- Les deux copies dans `app/src/main/res/drawable-nodpi/` sont identiques octet pour octet. Le chargement natif ne dépend pas du réseau. Les bitmaps sont décodés une seule fois.
- Les exports WebP utilisent Pillow/Lanczos et qualité 88 (cœur), 82 (fond), méthode 6 ; aucune retouche picturale par script.

Le cœur bat lentement (3 s, échelle 1 à 1,018). Le logo serif italique et la phrase exacte sont des tracés SVG communs au Web et au Canvas Android, immobiles. Les trois points sont indépendants. Les animations sont désactivées avec `prefers-reduced-motion` et `ValueAnimator.areAnimatorsEnabled()`.

Le chargement se ferme au rendu de la vraie destination, sans durée minimale. La courte sortie de 200 ms n’intercepte pas les touches. Un échec de démarrage remplace le chargement par une erreur avec Réessayer ; la destination et les paramètres d’invitation restent conservés. Aucun compte, stockage de session ou historique n’est effacé.

## Intentions des prompts ImageGen

**Cœur — génération, transparence activée.** Photorealistic substantial polished rose crystal glass heart, front-facing, rounded lobes and pointed tip, clear translucent pink champagne glass, deep burgundy refracted center, ivory-pink luminous rim, soft warm realistic reflections. Isolated transparent cutout. No text, logo, pedestal, fabric, neon, particles or concentric circles.

**Décor — génération, fond opaque.** Minimal portrait 9:16 near-black warm burgundy (#10070c / #240b13), upper 68% empty negative space. Photorealistic burgundy satin broad folds in the lower portion, subdued rose champagne highlights, discreet black burgundy marble with fine rose veins at the very bottom. No heart, text, logo, dice, candles, buttons, purple or neon.

## Vérifications reproductibles

`node --test couple-web/loveroll-splash.test.mjs couple-web/native-splash-parity.test.mjs`

`node couple-web/loveroll-splash-browser-check.cjs` (serveur local `couple-web/` sur 8765 et Playwright Chromium) : huit formats, images décodées, contenu dans l’écran, animations réduites, chargements concurrents, destinations réelles sans/avec session et invitation, erreur de syntaxe et réseau, réessai préservant l’invitation.

`node couple-web/home-podium-browser-check.cjs` et `node couple-web/dice-podium-browser-check.cjs` : géométrie réelle, contact sur le marbre, orientation/canvas conservés après actualisation des données et redimensionnement.

## Démarrage continu — Web 126 / Android 0.13.11

Le chargement natif restait auparavant visible jusqu’au premier rendu WebView, qui pouvait encore être le chargement HTML. Les illustrations étaient identiques, mais les métriques de police et la phase du battement changeaient à ce passage. Android conserve désormais sa composition initiale jusqu’au rendu de la destination réelle. Le HTML ne réinsère pas son propre cœur sortant lorsque le nouveau bridge natif est présent ; le navigateur et les anciens APK conservent leur fondu Web.

L’observateur `app/src/main/assets/loveroll-native-startup.js` est livré dans l’APK. Il attend un contenu réel dans `#app` et la disparition de tous les calques de chargement, puis Android attend le rendu correspondant avant le fondu. Le délai de secours natif reste de 18 secondes et propose Réessayer si l’initialisation ne termine pas. Les événements de document et la disponibilité des fonctions de connexion restent distincts de cet état visuel.

Le contrôle navigateur exécute cet observateur exact sur les destinations sans compte, avec session simulée et avec invitation, ainsi que sur les erreurs et les navigations successives. `.github/scripts/loveroll-startup-handoff.cjs` vérifie en plus le vrai APK de débogage dans l’émulateur : une page locale contrôlée termine son chargement HTML tout en conservant le cœur Web ; la capture doit toujours montrer le cœur natif. Après l’apparition du contenu ou de l’erreur récupérable, la WebView devient accessible et aucun second chargement ne doit apparaître. Ce contrôle ne contacte aucun compte et conserve ses captures dans l’artifact Android.

## Lettrage partagé — Web 127 / Android 0.13.12

Les deux chargements utilisent les mêmes tracés pour éviter les différences de largeur, de hauteur et de ligne de base entre les polices Android et celles du navigateur. `make-shared-lettering.py` convertit Nimbus Roman Italic (logo) et Nimbus Sans Regular (phrase) en un seul chemin par SVG et écrit deux copies identiques dans les ressources Web et les assets Android. La compilation n’a pas besoin de ces polices.

- Logo : `loveroll-wordmark-v127.svg`, viewBox 4200 × 1150, couleur `#f5dcd8`.
- Phrase : `loveroll-loading-caption-v127.svg`, viewBox 14000 × 1500, couleur `#ccb3bf`.
- Le statut accessible garde le texte « Chargement de votre espace… » ; les tracés sont décoratifs.
- Android lit chaque chemin une seule fois. Aucune police, aucun ajustement de texte au lancement.
- La géométrie utilise la même densité, les mêmes proportions du viewport et les mêmes espacements. Le test dans l’émulateur enregistre à la fois le Canvas natif, la WebView réelle et les rectangles du cœur, du logo, des points et de la phrase.

Le même contrôle Android ouvre la vraie fenêtre de mise à jour avec une entrée réservée aux builds de débogage. Il vérifie Télécharger, Plus tard, Retour et les longs textes dans une fenêtre basse ; ses callbacks de test ne téléchargent et n’installent aucun APK.
