# LoveRoll — Contrat UX/UI avec Figma et ChatGPT Work

**Fichier Figma du projet :** https://www.figma.com/design/lWctcurFW169eWWYm4yxuj
**Vrai code source :** `couple-web/` (PWA/WebView) et `app/` (Android).
**Règle fondamentale :** Figma contient des plans de travail et des propositions, **pas** le jeu officiel, pas les vrais dés, pas un simulateur; aucune synchronisation automatique avec GitHub n'est présumée.

## Parcours intégré à la routine Work

1. Sélectionner une exigence du prompt maître; lire la page réelle, ses feuilles CSS effectivement chargées, les assets originaux et le comportement des vrais contrôles.
2. Pour une **nouvelle interface ou refonte visuelle importante**, ouvrir le fichier Figma, préparer ou consulter l'avant/après. Si un navigateur autorisé est disponible, capturer le **rendu exécuté** Web/Android à tailles pertinentes. Distinguer explicitement « capture réelle » de « concept »; ne pas inventer le rendu actuel et ne pas remplacer le jeu par des maquettes.
3. Pour les **petites corrections**, utiliser directement les règles visuelles existantes sans attendre une maquette ni réouvrir une consultation à chaque bouton. Limiter le travail Figma proportionnellement à l'enjeu UX.
4. Coder dans le vrai dépôt, sur branche cohérente par parcours complet; utiliser les composants/variables existants et conserver les accès, les données, les services, les paiements, le catalogue, les dés et la sécurité.
5. Vérifier mobile Android (incluant le rendu WebView), iPhone/PWA, iPad portrait/paysage et PC selon l'écran affecté; captures avant/après et interaction vraie lorsque possible; signaler clairement l'absence d'essai sur appareil physique.
6. Livrer seulement après tests/CI et déploiement vérifié. **Une maquette Figma ne vaut jamais livraison.** Ne pas laisser une attente de design bloquer les lots indépendants.

## Identité visuelle à préserver

- LoveRoll reste une expérience **romantique haut de gamme** : bordeaux très profond, velours/satin rose-rouge, boutons rubis lisibles, verre rosé et typographie éditoriale. Le style et les tokens de `couple-web/premium-theme.css`, `platform-admin-luxe.css` et les styles actifs restent la référence technique actuelle.
- **Accueil et Soirée iPad** doivent conserver les images HD reconnues sur Android lorsque c'est la décision du maître; éviter les photos superposées, faux cadres et doubles socles. Respecter les assets réellement utilisés et le comportement responsive.
- **D6 et D100** sont de vrais dés 3D WebGL avec résultat officiel : ne jamais substituer une image de dé, un nombre tiré localement, ni modifier les probabilités ou les défis pour faciliter le design.
- **Éclat premium** doit être beau **et** utile; maintenir les contenus et règles exactes des coffrets du prompt maître, sans laisser le designer réinventer les défis.
- **LoveRoll Studio / Super Admin** : priorités iPad/PC, mobile pour actions urgentes, accès réels et deux vrais comptes d'essai indépendants; aucune simulation remplaçant le vrai jeu.
- Ne jamais altérer les règles d'abonnement, droit d'accès, Stripe, QR, notifications, géolocalisation ou partage sans mandat métier.

## Comment obtenir un « avant / après » réel

Lorsqu'une session navigateur avec les droits nécessaires existe, ouvrir `https://fredvolks.github.io/loveroll/` et/ou `https://fredvolks.github.io/loveroll/admin.html` sans exposer de secrets, conserver une capture d'origine datée (appareil/viewport/version), puis élaborer **dans Figma** la proposition editable en parallèle. Comparer même taille, même état, même données fictives autorisées, et tester le parcours après intégration. Si l'outil de capture est absent, consigner la limite; une planche improvisée ne doit pas être étiquetée « actuel ».

## Autorité et cadence

Ce contrat complète `docs/LOVEROLL_MASTER_PROMPT.md` et le suivi officiel. Il n'ajoute aucune obligation de demander au propriétaire « continue » entre les lots. Les critères métier et les preuves de jeu réel du maître prévalent sur toute représentation Figma.
