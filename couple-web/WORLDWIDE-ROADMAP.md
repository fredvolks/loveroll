# LoveRoll — mondialisation des 100 surprises (état du chantier)

## Implémenté dans la branche main

- Préférences personnelles \`couple_profiles.preferred_locale\` et \`preferred_currency\` : 10 langues et 14 devises.
- Réglages visibles pour membre et créateur : \`Langue, devise et région\`.
- Profil individuel sauvegardé dans Supabase (RLS: seule la personne connectée peut le changer).
- Région de départ et rayon communs au duo, enregistrés dans \`couples\` par \`save_love_travel_preferences\` vérifiant l'appartenance et le courriel confirmé.
- GPS opt-in : uniquement après avoir appuyé sur le bouton, arrondi à 0,01 degré (~1 km). Pas de surveillance en arrière-plan.
- Affichage des tarifs historiques CAD en devise choisie uniquement si un taux CAD réel, daté, a été obtenu depuis Frankfurter. Échec de conversion = afficher CAD, sans inventer de taux.
- Navigation principale et rubriques de Réglages traduites. **Le reste de l'application et les 100 descriptions n'est pas encore traduit** : ne pas annoncer une app intégralement traduite.
- Moteur pur \`local-outings.mjs\` : typologie de chaque idée, catégorie de lieu et vérification stricte du rayon en kilomètres par la ROUTE. Ne considère jamais un rayon géographique comme une distance routière.
- Aucun changement à \`roll_couple_once\`, aux faces D100, aux règles, historiques, invititations ou secrets.

## Non déployé / dépendances

La connexion aux vrais établissements n'est PAS encore en production et aucun tirage n'est modifié par la configuration locale. Un service de lieux et d'itinéraires est nécessaire.

### Fournisseur retenu : Geoapify

1. Créer un projet et une clé API sur https://myprojects.geoapify.com/ .
2. Mettre la clé **uniquement** dans le secret Supabase Edge Functions \`GEOAPIFY_API_KEY\` (jamais dans GitHub, le navigateur ou un chat).
3. Backend authentifié Supabase Edge Function : 
   - pour ville manuelle, géocoder **une fois** et stocker le centroïde arrondi ;
   - lorsque le D100 mensuel est réellement tiré, lire sa face officielle et sa catégorie depuis les 100 modèles ;
   - chercher uniquement les lieux réels dans une zone approximative via Geoapify Places API ;
   - mesurer les trajets réels avec Geoapify Routing API pour les quelques lieux pertinents ;
   - éliminer les trajets plus longs que \`travel_radius_km\`, même si le lieu est proche à vol d'oiseau ;
   - contrôler existence du nom, adresse et source ; sinon afficher « Aucun lieu confirmé à proximité » ;
   - mettre en cache les résultats, limiter les appels par couple, sauvegarder un snapshot dans le résultat mensuel sans modifier sa face ni son historique.
4. Les budgets locaux réels nécessitent des prix de sources officielles/partenaires. Les anciens prix sont des estimations pour deux *au Québec* en CAD, et **ne doivent pas être présentés comme des tarifs français** juste en changeant la devise.

## Déploiement

Le nouveau dépôt est \`fredvolks/loveroll\` branche \`main\`.
L'ancien site \`fredvolks.github.io/mon-wallet-android/\` et les configurations Android/OAuth ne doivent pas être basculés avant tests Pages/Auth/PKCE/FCM. Le workflow de vérification Web est maintenant sur \`main\`, mais les autres workflows nécessitent un basculement séparé.

## Guide éditorial des 10 langues

Français (fr-CA), anglais, espagnol, portugais, allemand, italien, néerlandais, arabe (RTL), japonais, chinois simplifié. Les dates/unités utilisent \`Intl\`. Les textes officiels des cartes doivent avoir une traduction éditoriale, une traduction automatique vérifiée ou rester dans leur langue d'origine; ne pas inventer de nouvelles activités lors de la traduction.

## Sécurité et tests

- Aucun GPS avant un clic explicite.
- Aucune position précise conservée ; origine partagée entre les deux membres uniquement.
- Aucun appel externe depuis le navigateur contenant la clé de lieux.
- Autorisations RLS, conservation des cartes/historiques, rejet si aucun trajet routier vérifié.
- Test de l'écran avec Android S25, iPad portrait/paysage, iPhone Safari et desktop; 10 langues, particulièrement texte arabe RTL.
