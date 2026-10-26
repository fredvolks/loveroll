# LoveRoll — Pages Soirée logo/privacy regression
Branche : `fix/pages-soiree-privacy-header-parity-20261026`; origine main : `4b425e1a6f7ab40d3e826a99e3a300e30f31ab92`.

## Cause confirmée
[GitHub Pages run 40410344904](https://github.com/fredvolks/loveroll/actions/runs/40410344904) **completed/failure** sur main SHA `5fe2fddf95b78e9bcb7dc65dcf82917760fcec99`. L'étape « Tester le vrai démarrage dans Chromium avant publication » échoue dans `couple-web/soiree-home-template-browser-check.cjs:49` : l'icône cœur Soirée inactive est **34 px plus basse** que le même cœur de l'Accueil (`top:40.75` contre `6.75`). Le bouton de confidentialité `data-lr-privacy-hide` précédant le logo prenait la hauteur en flux.

## Correctif
Conserver le contrôle réel Masquer, hors du flux mais interactif, avec une cible de 44 px. La barre conserve sa hauteur de 80 px et le logo/texte reste mesuré contre l'Accueil.
Ajouter le **même test navigateur** que celui de Pages au CI de PR, plus test de contrat CSS. Aucun test retiré ni exception ajoutée.

## Restrictions
- Aucune fusion main, secret ni modification de production.
- Après push, vérifier le SHA exact du run de PR, y compris navigateur et WEBGL. Si nouvel échec, lire les logs et corriger la branche.
- La réussite de PR ne vaut pas réussite du prochain déploiement Pages sur main. Essai physique Safari/Android non effectué.
