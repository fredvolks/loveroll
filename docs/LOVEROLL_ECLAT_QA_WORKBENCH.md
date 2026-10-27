# LoveRoll — Éclat V2 · Atelier QA du Super Admin

**État : branche PR #92 uniquement.** L'atelier est codé, mais **n'est pas accessible dans la version publique**. Ne pas fusionner ni déployer avant les recettes et autorisations appropriées.

## Ce qui est réellement branché

L'atelier vit dans la rubrique \`Éclat · atelier de test\` du Studio \`admin.html\`, dont l'accès est déjà conditionné à l'authentification du propriétaire de plateforme côté serveur (RPC \`love_platform_admin_read\`).

Il utilise exactement \`eclat-v2-play-controller.mjs\` et \`eclat-v2-session.mjs\`, sans moteur simulé ni faux tirages. A et B ouvrent chacun leur propre session Supabase Auth en mémoire avec des clés de stockage distinctes, et leurs demandes RPC transportent leurs propres JWT. Les données affichées à l'écran sont toujours celles renvoyées par les fonctions serveur V2. L'atelier peut démarrer/reprendre une séance et actualiser les deux vues; elles se synchronisent toutes les six secondes sans interrompre un champ en cours d'édition. Une séance déjà active ne doit pas être silencieusement écrasée.

Les 12 coffrets et les formats 30/60/90 minutes sont proposés, avec disposition double colonne sur tablette/PC quand la largeur le permet, ou colonne simple sur écran étroit. Les droits, consentements, états persistés et limitations sont ceux du **vrai jeu**. Le bouton « Reprendre » et les commandes dans chaque écran doivent traverser les mêmes RPC que l'application des joueurs.

## Préparer un environnement de test, sans mettre en danger les utilisateurs

1. Disposer d'un **projet Supabase QA distinct**, avec schéma LoveRoll de base compatible, fonctions d'accès existantes et migration Éclat V2 validée. Une base vierge sur laquelle on pose uniquement la migration V2 ne suffit pas.
2. Dans **ce projet QA uniquement**, installer préalablement `couple-web/qa/eclat-v2-qa-managed-pairs.sql` et la fonction `loveroll-qa-accounts` côté Edge selon `docs/LOVEROLL_ECLAT_QA_COMPTES.md`. Authentifier un **troisième opérateur QA autorisé**, puis créer la paire A/B depuis l'atelier ou utiliser deux comptes déjà vérifiés. Leur donner l'accès Éclat via la politique du backend QA : la création des comptes **ne contourne pas** le paywall. Ne jamais utiliser un vrai compte LoveRoll client.
3. Ouvrir Studio en étant authentifié comme propriétaire de la plateforme. La rubrique QA demande explicitement l'URL \`https://<ref-qa>.supabase.co\` et la clé publique \`sb_publishable_\` de ce projet. Elle refuse la référence du projet Supabase LoveRoll de production, les clés secrètes, un lien HTTP et les URL détournées.
4. Entrer les identifiants Auth QA de A et B (comptes distincts). Les mots de passe ne sont pas conservés; les sessions restent en mémoire de l'onglet et sont déconnectées à la fermeture de l'atelier.
5. Démarrer ou reprendre un coffret; inspecter séparément les défis, votes, secrets, choix, erreurs, pauses, reprises, complétions et leurs résultats. En fin de test, arrêter/terminer la séance dans le jeu puis déconnecter A/B.

**Important :** ne pas mettre la clé \`service_role\` ou \`sb_secret_\` dans HTML/JS, URL ou formulaire. Aucune clé privée dans GitHub ni dans \`config.js\`.

## Écarts restant à livrer (ne pas annoncer comme faits)

- **Provisionnement QA — codé en branche, pas encore installé ni validé sur une vraie base QA :** la fonction Edge QA avec opérateur JWT autorisé et projets explicitement allowlistés peut créer une paire A/B et la supprimer après contrôle des marqueurs `app_metadata`; un registre RLS fermé permet de reprendre un nettoyage partiel. La console expose créer/lister/supprimer/expirer à la demande. Un bouton lecture seule vérifie les tables QA minimales et bloque « Créer deux comptes » tant qu’elles ne sont pas présentes; il ne valide pas les fonctions, l’abonnement ni les fichiers. Les comptes opérateur, A et B doivent tous être différents et chaque joueur doit réussir un accès Éclat réel. Restent le déploiement exclusif sur une base LoveRoll QA explicitement désignée, la politique Premium QA, les validations de schéma/Storage et le test réel de révocation. L'expiration à 48 h n'a **pas** encore de planificateur automatique.
- **D6/D100 Soirée — intégré en branche, non testé en vrai QA :** deux panneaux séparés avec trois types de tirages officiels : D6 de la semaine, D6 personnel de A/B et D100 qui produit un vrai défi persistant. Réponse Accepter/Terminer et repige Passer/Refuser utilisent le backend officiel LR-015, sans autorisation d'usurper B, sans contournement des quotas et sans faux lancer. Les cartes sont lues sous le JWT de leur destinataire, avec rendu WebGL officiel et limite du nombre de rendus simultanés pour iPad. **Reste à tester réellement le flux, les vrais défis, les quotas et les animations sur QA.** Aucun raccourci artificiel pour supprimer l'attente d'un partenaire n'a été autorisé.
- **Cartes par catégories** : proposer les trois cartes de démonstration via le générateur réel et vérifier le parcours « régénérer », les quotas, les achats de surplus et les contrôles de prix/paiement **en environnement de test seulement**; ne pas confondre aperçu visuel et carte réellement créée.
- **Console globale** : inventaire testable des modules V1/V2 de LoveRoll, tableaux d'état et erreurs accessibles aux non-développeurs, contrôle des paramètres autorisés, essais d'abonnement/Stripe en mode test, historique d'actions, responsive iPad/PC et contrôles urgents sur téléphone. Le contrôle d'accès doit être côté serveur, pas seulement par un onglet caché.
- **Recette** : bout-en-bout sur vrai Supabase QA et comptes distincts, cycle complet de chaque coffret/variante, captures Android/iPad, scénarios désynchronisés et reconnexion. Aucune affirmation de « 100 % fonctionnel » sur les seuls tests unitaires/CI ou sans QA réellement provisionné.

## Garde-fous de fusion

Conserver cette PR en brouillon. Ne pas brancher le moteur V2 à la navigation publique V1 ni appliquer ses migrations au Supabase officiel avant l'audit d'autorisation, les tests des deux partenaires et l'accord de mise en production. Les tests PostgreSQL de CI travaillent sur une base jetable et ne signifient pas que la QA réelle ou la production ont été configurées.
