# LoveRoll — Venice API : connexion serveur (étape 1)

**État :** intégration URL et endpoint de diagnostic. Pas encore de génération ni de frais d'inférence.

- **URL officielle (dans le code serveur) :** \`https://api.venice.ai/api/v1\`. Il n'est **pas nécessaire** de l'ajouter à Supabase comme secret.
- **Unique secret utilisateur obligatoire :** \`VENICE_API_KEY\`, sa valeur étant la clé *Inférence* créée dans Venice. Ne pas copier la clé dans ChatGPT, un commit GitHub, une URL ou du JavaScript public.
- **Projet Supabase exclusif :** \`ejsrqfpkgwraorrznjpm\` (LoveRoll). Ne jamais utiliser le Supabase Punch 360°.
- **Fonction :** \`love-venice-bridge\` ; \`verify_jwt=true\` et seconde validation \`auth.getUser\` côté serveur. Contrôle de propriété du duo en base. Seul un admin authentifié du couple peut demander le diagnostic.
- **Appel POST authentifié** vers \`/functions/v1/love-venice-bridge\` :

\`\`\`json
{"couple_id":"UUID_DU_COUPLE","action":"status"}
\`\`\`

Réponse : \`configured: true|false\` sans exposer la clé.
Pour la vérification réelle **sans consommation de tokens**, passer \`action: "verify_key"\`. La fonction utilise le GET \`/api_keys/rate_limits\` documenté par Venice, accessible avec une clé d'inférence. Elle retourne \`connected: true|false\` sans divulguer la valeur du secret ni les soldes.

**Important :** ce serveur ne dispose volontairement d'aucune route de génération de cartes à ce stade. Avant d'ajouter un bouton commercial ou les 300 cartes, réaliser les règles de quota bimestriel, versions, archive, prévisualisation, coûts, consentements, facturation et tests définis dans le prompt maître. Un endpoint de diagnostic déployé ne prouve **pas** que la clé est présente, et ne remplace pas un test authentifié effectué par l'admin.

La bibliothèque historique a déjà été conservée dans la table privée \`couple_private.love_cards_archive_20261027\` avant ces travaux.
