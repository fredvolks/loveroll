# LoveRoll — comptes QA jetables (PR #92 seulement)

**Non déployé.** Fonction serveur `supabase/functions/loveroll-qa-accounts/index.ts`.
La commande de provisionnement n'est **pas** activée dans la version publique.

## Pré-requis stricts

1. Choisir et identifier un **nouveau projet Supabase dédié à LoveRoll QA**, distinct de `ejsrqfpkgwraorrznjpm`. Ne jamais utiliser au hasard un projet « Test » existant.
2. Installer uniquement sur QA le schéma LoveRoll compatible, la migration V2 validée et le fichier `couple-web/qa/eclat-v2-qa-managed-pairs.sql` (ne jamais l'ajouter au migrateur production).
3. Créer un compte opérateur QA administrativement, distinct des joueurs. Définir **uniquement dans les secrets/variables serveur de QA** : `LOVEROLL_QA_APPROVED_PROJECT_REF` (ref exacte du projet), `LOVEROLL_QA_OPERATOR_USER_ID` (UUID Auth QA du seul opérateur), `LOVEROLL_QA_STUDIO_ORIGIN=https://fredvolks.github.io`. Le module refuse toujours la ref de production même si une variable est mal renseignée.
4. Déployer la fonction **exclusivement sur ce projet QA**. Authentification obligatoire par JWT de l'opérateur QA. La clé administrative reste du côté Edge; ne jamais la mettre dans GitHub ou le navigateur.
5. À la création, les deux comptes Auth obtiennent aussi chacun un vrai profil LoveRoll (`Test A` / `Test B`) et une adhésion à l'unique duo QA; l'atelier n'invente aucune fiche joueur côté navigateur. La fonction vérifie avant suppression qu'aucun **troisième membre** n'a rejoint le duo : toute association hors de cette paire bloque l'effacement, même sous une clé serveur.
6. Opérations JSON POST : `health` effectue une lecture sans mutation des tables QA requises; `create` produit une paire A/B avec mots de passe forts (montrés une seule fois), `list` ne renvoie pas de mot de passe, `delete` valide les marqueurs Auth des deux comptes, supprime les données du duo puis les utilisateurs et la paire, `expire` supprime sur demande les paires âgées de plus de 48 h. **Pas de planificateur automatique d'expiration dans ce lot.**
7. Si le schéma QA n'accorde pas l'accès Éclat Premium au nouveau duo, le moteur officiel continuera de refuser l'accès : il n'existe **aucun bypass automatique de l'abonnement** dans cette fonction. Préparer séparément la politique d'entitlement QA conforme.

## Risques restant à lever avant usage

- L’atelier Super Admin exige maintenant un contrôle de tables QA avant la création de paires; les identités opérateur/A/B sont toutes distinctes. Ce contrôle minimal n’atteste pas la disponibilité des RPC ni le droit Premium.
- Le nettoyage traverse Auth et plusieurs tables Postgres : **ce n'est pas une transaction atomique**. En cas d'échec, la paire passe à `failed` et un nouvel appel `delete` est nécessaire. Auditer les éventuels fichiers Storage et références non cascades dans le vrai schéma QA avant tout premier déploiement.
- La révocation d'un utilisateur invalide ses refresh tokens mais le JWT déjà émis peut rester valide jusqu'à expiration. Garder une TTL courte dans QA et ne jamais connecter les comptes à la production.
- **Le panneau Super Admin est maintenant raccordé en branche** : connexion avec un troisième compte opérateur QA indépendant, création, liste, nettoyage manuel des expirations et suppression d'une paire spécifique (après déconnexion des joueurs). Les mots de passe générés sont affichés une seule fois et effacés à la déconnexion. Cette interface ne prouve pas que le serveur est déployé ou que le duo possède un abonnement QA.
- Le code de gardes serveur vit dans `supabase/functions/_shared/loveroll-qa-guards.mjs`; l'Edge Function utilise ce module partagé, pas une importation hors de son arborescence de déploiement.
- **Pas encore testé en vrai** : démarrage Edge sur un Supabase QA désigné, droits Premium du duo, tables et Storage non cascades, extinction des sessions actives, tests iPad/Android, suppression complète d'une paire. Les actions CRUD Auth n'ont pas été invoquées contre une base Supabase dans ce lot. Ne pas fusionner ni publier cette PR sur les seuls tests Node/PG jetables.

Référence officielle : Supabase Auth Admin API : création/suppression uniquement depuis un serveur approuvé. 
