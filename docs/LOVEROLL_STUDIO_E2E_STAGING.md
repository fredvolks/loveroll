# LoveRoll Studio — vraie recette A/B Supabase en préproduction

État : **prête en code, non exécutée**. Ne jamais confondre les tests PostgreSQL isolés, les captures visuelles sans connexion, et ce vrai parcours authentifié. PR #97 reste en brouillon jusqu'à preuve complète.

## Environnement obligatoire

Préparer un **projet Supabase de préproduction LoveRoll distinct** avec le schéma applicatif complet, fonctions RPC, migrations Studio et filtres analytiques; ne pas copier les données clients. Déployer les Edge Functions `love-studio-sandbox` et `love-venice-bridge` sur CE projet, avec leurs secrets gérés côté serveur. Enregistrer un seul véritable administrateur technique de préproduction dans `love_platform_admins`. Les clients production n'y ont pas accès.

Configurer dans les secrets GitHub (pas dans les fichiers) :

- `LOVEROLL_STUDIO_E2E_REF` : référence Supabase STAGING, jamais `ejsrqfpkgwraorrznjpm`.
- `LOVEROLL_STUDIO_E2E_URL` : `https://<ref>.supabase.co`.
- `LOVEROLL_STUDIO_E2E_PUBLISHABLE_KEY` : clé publique du staging.
- `LOVEROLL_STUDIO_E2E_ADMIN_EMAIL` : admin technique staging confirmé.
- `LOVEROLL_STUDIO_E2E_ADMIN_PASSWORD` : son mot de passe **uniquement en secret GitHub**.

Sur le projet Supabase STAGING uniquement, autoriser l'origine locale de la recette en secret d'Edge Function :
`LOVEROLL_STUDIO_STAGING_MODE=true` et `LOVEROLL_STUDIO_STAGING_ORIGIN=http://127.0.0.1:8765`.
Le serveur interdit explicitement cet assouplissement si son `SUPABASE_URL` contient la référence LoveRoll production. Sur production, l'origine reste `https://fredvolks.github.io`.

Lancer manuellement GitHub Actions → **LoveRoll Studio — real A/B staging acceptance (manual only)**. Le workflow ne tourne jamais automatiquement sur une PR et refuse un environnement absent, une URL incohérente ou la référence production.

## Ce que le navigateur doit prouver

1. Connexion d'un véritable Super Admin de staging et accès privé.
2. Création réelle de deux utilisateurs techniques Supabase, couple et profils vérifiés.
3. Connexion indépendante A/B avec des sessions Auth, accès aux vrais écrans `app.js`, sans substituer le JWT administrateur.
4. Action réelle sur `roll:weekly` et réception du D6 officialisé dans la base.
5. Création réelle d'une Soirée, lancer D6 individuel A puis B via les boutons du jeu.
6. Choix de catégorie officiel, lancer D100 de défi et vérification d'au moins une carte enregistrée.
7. Lancer D100 Surprise sur le vrai jeu.
8. Présence des jalons confirmés uniquement par les lectures serveur, avec capture d'écran post-lancers.
9. Suppression sécurisée de la paire via la même console, exigée même après un échec de parcours.

Ce test **ne couvre pas encore la totalité des branches** : refus/repige, favoris, cycles de 200, notifications, 12 fins Éclat, prestataires externes et paiements. Ceux-ci nécessitent des preuves authentifiées supplémentaires avant publication annoncée « 100 % ».

## Sécurité des données et du budget

- N'utiliser aucune adresse, compte ou identifiant client production; le script refuse la référence production, et ne reçoit aucune clé service-role.
- Ne pas démarrer le workflow tant que la base de staging n'est pas complète. Le projet connecté nommé « Test » n'est **pas** automatiquement considéré comme un staging LoveRoll.
- Pas de génération Venice à l'intérieur de ce test. Le véritable atelier Venice demande une confirmation explicite et utilise une limite par admin et jour UTC liée à la paire initiale.
- Les captures de ce parcours ne contiennent pas le formulaire d'authentification et restent dans les artefacts GitHub durant sept jours.
- Si l'opération de suppression échoue, le workflow doit échouer et signaler qu'une vérification manuelle du banc technique de staging est requise; aucune suppression par UUID fourni par l'utilisateur n'est permise.

## Conditions de livraison de la PR #97

Valider conjointement les tests Deno, Node, PostgreSQL et Chromium, le workflow A/B staging authentifié, l'isolation RLS, la conformité des 12 coffrets et la liste complète des cas du prompt maître. Ne pas fusionner une simple maquette ou un banc seulement simulé. La migration et l'Edge Function Studio devront être publiées sur production dans un ordre coordonné et réversible avant d'exposer la page Studio.
