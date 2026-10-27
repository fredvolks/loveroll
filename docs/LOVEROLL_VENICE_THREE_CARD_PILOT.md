# LoveRoll — essai Venice en 3 cartes (non destructif)

## Statut et chemin
- Page admin : \`couple-web/venice-preview.html\` (GitHub Pages après fusion et publication).
- Edge Function : \`supabase/functions/love-venice-bridge/index.ts\` ; actions \`status\`, \`verify_key\`, \`preview_three\`, \`get_latest_preview\`.
- Avant utilisation, appliquer \`couple-web/migrations/20261027_venice_three_card_preview.sql\` dans **Supabase LoveRoll exclusivement** (\`ejsrqfpkgwraorrznjpm\`) puis déployer l'Edge Function.
- Secret requis \`VENICE_API_KEY\` dans Edge Function Secrets, jamais dans le client ou dans GitHub; URL officielle codée côté serveur.
- Appeler la page depuis le navigateur utilisé pour la session authentifiée LoveRoll. Seul le propriétaire admin du duo a accès.
- Le bouton demande 3 appels Venice (`venice-uncensored-role-play`), un niveau de chaque. Les requêtes sont non graphiques, imposent roles et minuteur 2 à 6 min. Modèle configurable via secret facultatif \`VENICE_CARD_MODEL\`.
- Les réponses sont enregistrées **en brouillon privé**, dans \`public.love_venice_preview_trials.cards\`, sans droits pour les clients ordinaires. Export JSON possible.
- Quota de démonstration unique : 1 lot de 3 par duo/jour UTC; pas de décompte de la régénération bimestrielle. Consomme les vrais tokens de Venice et peut être partiellement réussi. Pas de débit de 4 $ CA.
- Aucun texte, historique, profil ou ID personnel n'est envoyé à Venice; seuls les thèmes neutres et règles générales. Aucun remplacement des anciennes cartes, ni activation du nouveau catalogue.
- Un passage API ne prouve pas l'acceptation des textes : lire et approuver manuellement le résultat. L'API peut retourner une erreur, un modèle indisponible ou un JSON non conforme. Montrer les erreurs sans inventer de carte.
