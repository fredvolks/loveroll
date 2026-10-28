# Éclat V2 — couche de persistance isolée (lot du 27 octobre 2026)

Statut **en PR #92 / NON PUBLIÉ / NON MIGRÉ**. Le produit et la base LoveRoll continuent d'utiliser V1.

## Livré dans ce lot
- Schéma V2 **indépendant** des anciennes tables, avec sessions versionnées, scénario, ordre de scènes et budgets officiels conservés, rôles A/B, mode un/deux appareils et historique intact.
- RPC authentifiés `love_eclat_v2_start`, `love_eclat_v2_status`, `love_eclat_v2_mark_ready`, `love_eclat_v2_reveal`, `love_eclat_v2_act`.
- Alternance V0/V1 calculée et enregistrée au démarrage dans une transaction verrouillant le couple, et possibilité technique de rejouer explicitement V0 ou V1. Anciennes séances exclues du compteur.
- Reprise de la séance existante; verrou contre deux séances V2 simultanées et conflit avec une séance V1 active. Actions avec numéro d'étape attendu pour empêcher un double « Continuer » lors des reconnexions.
- Secret V2 révélé uniquement après deux confirmations **authentifiées distinctes** en mode deux téléphones, ou après un accord oral explicite en mode un téléphone. Aucune réponse secrète ni consentement physique ne sont transmis par ces RPCs.
- Tables à RLS activée, **sans accès direct** pour `anon` ou `authenticated`; RPCs limités au couple, à l'abonnement et à l'identité vérifiée. Les tests SQL PostgreSQL 17 utilisent une base temporaire sans vrais comptes.

## À faire avant toute activation
- Vérifier les checks SQL d'intégration et la concurrence sous sessions distinctes; revue des privilèges et des ACL.
- Modéliser les réponses privées et les jeux spécifiques, propositions de contact avec Oui / Une autre proposition / Passer et retrait, branches/puzzles/minuteurs; aucun geste physique déclenché par les RPCs.
- UI Éclat V2 + récupération des sessions + rejouer une version explicite; gestion des souvenirs nécessitant un accord des deux; validation sur 1/2 vrais téléphones.
- Audit de sécurité du vrai projet, migration planifiée **séparément** de GitHub Pages et conservant le V1 intact.

**Ne pas fusionner comme fonction terminée** : fondation serveur uniquement, feature inerte en production jusqu'au déploiement et raccordement contrôlés.
