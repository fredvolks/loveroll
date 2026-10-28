# Éclat V2 — réintégration sûre depuis main Web 248

Date : 28 octobre 2026. Cette branche ne repart **pas** de l'ancienne application Web 243 de la PR #92. Elle a été créée après les réglages de notifications #102 et le cache Web 248 #105, pour conserver ces correctifs.

## Travail repris
- Tous les modules propres à Éclat V2 : 12 coffrets / 96 scènes, variantes, 30/60/90 minutes, contrôleur à deux vraies identités, interface, confidentialité des réponses, consentement, arrêt/reprise, vrais dés serveur du coffret 12.
- Migrations V2 et tests PostgreSQL 17 isolés, **non appliqués sur Supabase LoveRoll production**.
- Interface Super Admin de laboratoire pour un **projet QA distinct de production**, deux comptes test authentiques et serveur Edge QA. Aucune clef secrète ou identité du client ne doit être réutilisée.
- Dans l'application actuelle : V2 n'est proposée que si `love_eclat_v2_status` fournit `access:true` pour l'utilisateur et le couple courants. Sans cette RPC, la galerie et les RPC V1 existantes restent fonctionnelles.
- Correction du droit V2 indépendant du droit V1 : un compte autorisé par le serveur V2 peut voir les 12 coffrets et les ouvrir même si l'ancien V1 ne donne pas le même statut; la route de repli V1 vérifie toujours son propre accès.
- Le contrôleur conserve les saisies privées et le mode téléphone partagé entre actualisations du même utilisateur/couple/séance, mais les efface en cas de révocation, changement de compte/couple/séance ou arrêt.
- Versions app, manifeste, CSS et service worker alignées Web 251 sur l'état actuel de `main`.

## Critères bloquants avant fusion
1. Workflows actuels **entièrement verts**, y compris tests navigateur et PostgreSQL, sur le SHA de cette nouvelle branche; pas d'affirmation de réussite héritée de l'ancienne PR.
2. Comparer les fonctions SQL V2 et leurs prérequis à la **vraie préproduction LoveRoll**, avec deux vrais Auth, sans lire ni modifier les comptes clients.
3. Tester l'intégralité des 12 coffrets (toutes leurs scènes, variantes et sorties) en A/B, mode un ou deux téléphones, iPad, Android et PC; vérification humaine des textes et de la consentabilité.
4. Vérifier l'absence de régression pour les dés D6/D100 V1, Soirée, Surprise, favoris et notifications Android. Aucun paiement, changement Stripe ou migration production sans validation de recette.
5. Ne pas fusionner simultanément la PR historique #92; elle est **supplantée techniquement** par cette consolidation et reste fermée à la production.

Ce document rapporte une intégration **codée en branche**, et non une livraison réelle à tous les abonnés.
