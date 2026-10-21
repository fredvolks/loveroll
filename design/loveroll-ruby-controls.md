# Boutons LoveRoll — verre rubis

La référence visuelle est `92936.png` : contour rouge translucide, reflets ponctuels ivoire, centre bordeaux et texte romantique. Les deux actions de l’Accueil et la navigation Android utilisent ces composants. Le décor, le dé, les probabilités et les panneaux de statistiques ne sont pas modifiés.

## Réutiliser dans une page

`couple-web/ruby-controls.css` contient les composants. Ils s’appliquent jusqu’à 767 pixels de largeur et conservent les dimensions imposées par la page. `loveroll-home-touch-v193.js` gère uniquement l’état visuel d’appui. Le bouton conserve son propre `data-action` et son comportement natif.

### Action principale

```html
<button type="button" class="lr-ruby-control lr-ruby-action" data-action="…">
  <span class="lr-ruby-icon" aria-hidden="true"><!-- Icône SVG --></span>
  <span class="lr-ruby-title">Brasser le dé</span>
</button>
```

Hauteur par défaut : 52 px, forme arrondie. L’Accueil garde ses 55 px. L’icône est facultative.

### Action avec trois lignes

```html
<button type="button" class="lr-ruby-control lr-ruby-feature" data-action="…">
  <span class="lr-ruby-icon" aria-hidden="true"><!-- Icône SVG --></span>
  <span class="lr-ruby-copy">
    <small class="lr-ruby-eyebrow">Surprise du mois disponible</small>
    <strong class="lr-ruby-title">Brasser notre surprise</strong>
    <em class="lr-ruby-caption">Un tirage commun ce mois-ci</em>
  </span>
</button>
```

Hauteur par défaut : 61 px. Les colonnes latérales de largeur identique centrent le texte sur toute la largeur du bouton. La colonne droite reste vide.

### Barre de navigation

La fonction existante `nav()` utilise `nav lr-ruby-nav` et `lr-ruby-tab` sur chaque bouton. La classe `active` sélectionne la pastille rubis. Les actions, la hauteur de 56 px et l’ancrage au bas de l’écran restent ceux de la navigation existante.

## Typographie et interactions

Cormorant Garamond est embarquée sous licence SIL OFL (`assets/fonts/OFL-Cormorant.txt`). Les titres sont du texte HTML, les icônes sont vectorielles et les reflets sont dessinés en CSS ; aucune capture d’écran n’est utilisée comme bouton.

L’appui descend le bouton de 2,5 px, le réduit légèrement et remplace l’ombre extérieure par une ombre intérieure. Le relâchement, l’annulation du geste, la perte de focus et le clavier libèrent l’état. `disabled` conserve une surface rubis assombrie et n’accepte aucune action. Le mode de mouvement réduit désactive les transitions.

## Validation

`ruby-controls-browser-check.cjs` teste de vrais gestes tactiles Chromium sur 412 × 824, 412 × 915 et 360 × 740 : action principale, surprise et navigation, retour après annulation, police embarquée, absence de tirage involontaire, navigation réelle et statistiques inchangées après les gestes d’appui et d’annulation.
