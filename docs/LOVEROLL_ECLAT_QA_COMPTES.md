# LoveRoll — comptes QA jetables (PR #92 seulement)

**Non déployé.** Fonction serveur `supabase/functions/loveroll-qa-accounts/index.ts`.
La commande de provisionnement n'est **pas** activée dans la version publique.

## Pré-requis stricts

1. Choisir et identifier un **nouveau projet Supabase dédié à LoveRoll QA**, distinct de `ejsrqfpkgwraorrznjpm`. Ne jamais utiliser au hasard un projet « Test » existant.
2. Installer uniquement sur QA le schéma LoveRoll compatible, la migration V2 validée et le fichier `couple-web/qa/eclat-v2-qa-managed-pairs.sql` (ne jamais l'ajouter au migrateur production).
3. Créer un compte opérateur QA administrativement, distinct des joueurs. Définir **uniquement dans les secrets/variables serveur de QA** : `LOVEROLL_QA_APPROVED_PROJECT_REF` (ref exacte du projet), `LOVEROLL_QA_OPERATOR_USER_ID` (UUID Auth QA du seul opérateur), `LOVEROLL_QA_STUDIO_ORIGIN=https://fredvolks.github.io`. Le module refuse toujours la ref de production même si une variable est mal renseignée.
4. Déployer la fonction **exclusivement sur ce projet QA**. Authentification obligatoire par JWT de l'opérateur QA. La clé administrative reste du côté Edge; ne jamais la mettre dans GitHub ou le navigateur.
5. Opérations JSON POST : `create` produit une paire A/B avec mots de passe forts (montrés une seule fois), `list` ne renvoie pas de mot de passe, `delete` valide les marqueurs Auth des deux comptes, supprime les données du duo puis les utilisateurs et la paire, `expire` supprime sur demande les paires âgées de plus de 48 h. **Pas de planificateur automatique d'expiration dans ce lot.**
6. Si le schéma QA n'accorde pas l'accès Éclat Premium au nouveau duo, le moteur officiel continuera de refuser l'accès : il n'existe **aucun bypass automatique de l'abonnement** dans cette fonction. Préparer séparément la politique d'entitlement QA conforme.

## Risques restant à lever avant usage

- Le nettoyage traverse Auth et plusieurs tables Postgres : **ce n'est pas une transaction atomique**. En cas d'échec, la paire passe à `failed` et un nouvel appel `delete` est nécessaire. Auditer les éventuels fichiers Storage et références non cascades dans le vrai schéma QA avant tout premier déploiement.
- La révocation d'un utilisateur invalide ses refresh tokens mais le JWT déjà émis peut rester valide jusqu'à expiration. Garder une TTL courte dans QA et ne jamais connecter les comptes à la production.
- Les contrôles du front Super Admin pour piloter `create/list/delete` restent à raccorder; la fonction n'est pas une preuve de provisionnement opérationnel.
- Ne pas annoncer QA prêt, ne pas fusionner ni publier cette PR sur la seule base des tests Node/PG jetables.

Référence officielle : Supabase Auth Admin API : création/suppression uniquement depuis un serveur approuvé. 
