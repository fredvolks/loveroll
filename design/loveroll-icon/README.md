# LoveRoll — Icône éditoriale, Web 122 / Android 0.13.9

Le Web et l’APK utilisent le même dé noir et cœur rose champagne sur satin bordeaux. Les marges sont intégrées à l’illustration, sans masque extérieur ni lettres. Le fond reprend `#10070c`, comme l’Accueil.

`source.webp` est le maître 1024 × 1024 conservé sans perte. L’image a été créée avec le skill imagegen et son outil intégré, puis encodée aux tailles requises. `export.py` produit les PNG Web 48, 180, 192 et 512 pixels, le PNG maskable 512 et le WebP Android. `check.py` compare les pixels décodés du Web et de l’APK, les dimensions, l’opacité, l’identité PWA et les ressources adaptatives Android.

```
python3 design/loveroll-icon/export.py
python3 design/loveroll-icon/check.py
```

L’APK utilise des couches adaptatives et une version monochrome pour les icônes thématiques. Le nom de package, la signature et les données ne changent pas. Les notifications conservent leur ressource existante. L’icône Web passe par le manifeste, le favicon et l’icône Apple ; les URL versionnées évitent de servir l’ancien cœur « LR ». Un ancien raccourci Chrome peut garder sa propre copie : retirer uniquement ce raccourci et le recréer depuis LoveRoll si nécessaire.

Références : [icônes adaptatives Android](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive), [zone de sécurité des icônes Web](https://www.w3.org/TR/appmanifest/), [actualisation du manifeste Chrome](https://web.dev/articles/manifest-updates).

## Prompt de création exact

Use case: logo-brand. Asset type: final square launcher icon artwork for the existing LoveRoll romantic couples app, the EXACT SAME emblem will be used in its Android APK and installable Web app. Create one impeccably polished, restrained premium 3D icon, edge-to-edge square artwork, not a mockup or an icon sheet. Composition: one large glossy near-black rounded die in a graceful three-quarter view, centered, with one simple dimensional rose-champagne heart inlaid on the front face, and tiny subtle heart marks visible on the top and side. The entire die including its highlights must fit in the central 64% of the image so circular Android masks never clip it. Strong simple readable silhouette at 48 pixels. Deep black-burgundy continuous background (#10070c to #38101e), faint refined satin folds at the periphery and a restrained warm rose reflection below the die. Fine blush/champagne highlights (#efa4b7, #d58ba3), ivory-pink heart center (#f5dcd8), no violet. Expensive glass/enamel materials, sensual editorial lighting, gentle reflections, sophisticated mature atmosphere, balanced contrast, heart clearly legible, no excessive neon or magenta bloom. Full bleed square, no baked rounded outer corners, no border around the tile, no transparent background, no podium, no candles, no flowers, no letters, no LR, no words, no watermark. Final app icon ready to install, not a screenshot.
