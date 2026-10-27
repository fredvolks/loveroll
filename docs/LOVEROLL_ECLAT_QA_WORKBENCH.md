# LoveRoll — Éclat V2 · Atelier QA du Super Admin

**État : branche PR #92 uniquement.** L'atelier est codé, mais **n'est pas accessible dans la version publique**. Ne pas fusionner ni déployer avant les recettes et autorisations appropriées.

## Ce qui est réellement branché

L'atelier vit dans la rubrique \`Éclat · atelier de test\` du Studio \`admin.html\`, dont l'accès est déjà conditionné à l'authentification du propriétaire de plateforme côté serveur (RPC \`love_platform_admin_read\`).

Il utilise exactement \`eclat-v2-play-controller.mjs\` et \`eclat-v2-session.mjs\`, sans moteur simulé ni faux tirages. A et B ouvrent chacun leur propre session Supabase Auth en mémoire avec des clés de stockage distinctes, et leurs demandes RPC transportent leurs propres JWT. Les données affichées à l'écran sont toujours celles renvoyées par les fonctions serveur V2. L'atelier peut démarrer/reprendre une séance et actualiser les deux vues; elles se synchronisent toutes les six secondes sans interrompre un champ en cours d'édition. Une séance déjà active ne doit pas être silencieusement écrasée.

Les 12 coffrets et les formats 30/60/90 minutes sont proposés, avec disposition double colonne sur tablette/PC quand la largeur le permet, ou colonne simple sur écran étroit. Les droits, consentements, états persistés et limitations sont ceux du **vrai jeu**. Le bouton « Reprendre » et les commandes dans chaque écran doivent traverser les mêmes RPC que l'application des joueurs.

## Préparer un environnement de test, sans mettre en danger les utilisateurs

1. Disposer d'un **projet Supabase QA distinct**, avec schéma LoveRoll de base compatible, fonctions d'accès existantes et migration Éclat V2 validée. Une base vierge sur laquelle on pose uniquement la migration V2 ne suffit pas.
2. Dans **ce projet QA uniquement**, créer deux utilisateurs Auth déjà vérifiés, les relier au même duo QA et leur donner un accès Éclat de test **via la politique d'accès du backend QA**. Ne jamais utiliser un vrai compte LoveRoll client.
3. Ouvrir Studio en étant authentifié comme propriétaire de la plateforme. La rubrique QA demande explicitement l'URL \`https://<ref-qa>.supabase.co\` et la clé publique \`sb_publishable_\` de ce projet. Elle refuse la référence du projet Supabase LoveRoll de production, les clés secrètes, un lien HTTP et les URL détournées.
4. Entrer les identifiants Auth QA de A et B (comptes distincts). Les mots de passe ne sont pas conservés; les sessions restent en mémoire de l'onglet et sont déconnectées à la fermeture de l'atelier.
5. Démarrer ou reprendre un coffret; inspecter séparément les défis, votes, secrets, choix, erreurs, pauses, reprises, complétions et leurs résultats. En fin de test, arrêter/terminer la séance dans le jeu puis déconnecter A/B.

**Important :** ne pas mettre la clé \`service_role\` ou \`sb_secret_\` dans HTML/JS, URL ou formulaire. Aucune clé privée dans GitHub ni dans \`config.js\`.

## Écarts restant à livrer (ne pas annoncer comme faits)

- **Provisionnement QA** : créer **et supprimer** des paires de comptes de test jetables avec nettoyage garanti du duo, des accès, sessions, tirages, invitations et contenus connexes. Une API d'administration QA dédiée côté serveur devra vérifier le rôle du propriétaire et l'environnement, garder ses secrets uniquement côté serveur, proposer l'expiration et la révocation et refuser rigoureusement le projet de production.
- **Déblocage QA du D6/D100** : permettre aux comptes de test d'essayer les deux vrais dés et leurs vraies transitions de jeu sans attendre une pige de l'autre partenaire, mais **uniquement dans un environnement QA**; aucun faux résultat graphique et aucun contournement des protections ou limites pour les utilisateurs de production. Le moteur officiel de dés, le résultat persisté et les générateurs réels doivent être réutilisés.
- **Cartes par catégories** : proposer les trois cartes de démonstration via le générateur réel et vérifier le parcours « régénérer », les quotas, les achats de surplus et les contrôles de prix/paiement **en environnement de test seulement**; ne pas confondre aperçu visuel et carte réellement créée.
- **Console globale** : inventaire testable des modules V1/V2 de LoveRoll, tableaux d'état et erreurs accessibles aux non-développeurs, contrôle des paramètres autorisés, essais d'abonnement/Stripe en mode test, historique d'actions, responsive iPad/PC et contrôles urgents sur téléphone. Le contrôle d'accès doit être côté serveur, pas seulement par un onglet caché.
- **Recette** : bout-en-bout sur vrai Supabase QA et comptes distincts, cycle complet de chaque coffret/variante, captures Android/iPad, scénarios désynchronisés et reconnexion. Aucune affirmation de « 100 % fonctionnel » sur les seuls tests unitaires/CI ou sans QA réellement provisionné.

## Garde-fous de fusion

Conserver cette PR en brouillon. Ne pas brancher le moteur V2 à la navigation publique V1 ni appliquer ses migrations au Supabase officiel avant l'audit d'autorisation, les tests des deux partenaires et l'accord de mise en production. Les tests PostgreSQL de CI travaillent sur une base jetable et ne signifient pas que la QA réelle ou la production ont été configurées.
