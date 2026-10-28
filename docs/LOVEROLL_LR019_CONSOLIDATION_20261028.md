# LR-019 — cinq coups de cœur communs par couple (contrat approuvé)

Date : 28 octobre 2026. Cette branche a été créée sur l'ancien main (Web 248) et réintègre les fonctions isolées des PR #56, #57, #58 et #60. Ces branches historiques sont très en retard sur main et ne doivent **pas** être fusionnées directement.

## Fonction réellement branchée dans le jeu (sur cette branche, non déployée)

- Le **couple dispose d'un plafond unique de 5 cartes favorites distinctes**, toutes catégories SENSUEL et SEXUEL confondues. Les deux partenaires gèrent cette liste commune; celui qui a ajouté une carte reste identifié pour l'historique. Aucun plafond de 5 par membre.
- Boutons de cœur sur ses vrais défis actifs et les défis archivés des soirées closes; état partagé, titre historique uniquement lorsqu'autorisé pour le compte courant, liste commune « Nos coups de cœur » dans Réglages > Jeu.
- Au sixième cœur, fenêtre affichant les 5 cartes existantes et le nouveau défi, avec **un seul bouton par ligne « Retirer et ajouter le nouveau »**. Le serveur remplace les deux cartes dans une seule transaction sous verrou de couple : échec ou annulation = aucune carte supprimée.
- RPC `love_favorites_capabilities` obligatoirement vraie avant toute action UI; en absence de migration, les boutons sont masqués (aucun clic factice).
- Migrations SQL copiées et regroupées : `20261026_lr019_favorites_core.sql`, `20261026_lr019_z_draw_favorites.sql`, `20261026_lr019_zz_cycle_unique.sql`. Moteur D100 reste lié au serveur : priorité aux exclusions et aux cartes utilisées cette soirée, favorites réintégrées seulement si admissibles au cycle.
- Tests Node, Chromium et PostgreSQL 17 jetable : plafond commun des deux partenaires, sixième cœur refusé, remplacement atomique/idempotent, courses simultanées, intégration D100, unicité des 200 cartes et droits du duo. **Ces tests ne valent pas une migration production**.

## Critères avant fusion

1. Confronter les migrations rebasées aux fonctions SQL effectivement présentes dans l'environnement LoveRoll de préproduction dédié, notamment les corrections LR-015 et les rôles RPC.
2. Vérifier manuellement 5/5 + sixième/remplacement pour deux comptes véritables A/B, sur deux appareils, avec vraie clôture Soirée, reprise, exclusion et nouvelle pige D100.
3. Vérifier le système de cache/version PWA et les imports actuels. La PR Web 248 #105 est indépendante et doit être intégrée avant le futur lot Favoris.
4. Ne jamais mélanger cette PR avec le changement de certificat Android #91 ni avec Éclat V2 #92.

**Statut : intégration de code en PR, non publiée.** Pas de migration dans Supabase production et pas de fusion tant que les critères ci-dessus ne sont pas satisfaits.


## Préservation de `main` et cache de livraison (lot du 28 octobre)

- La réintégration tient compte de la protection de confidentialité **déjà publiée** : le service worker utilise seulement des libellés de push génériques, la page charge le module `privacy-screen.mjs?v=20261028-privacy250`, le masque coupe la musique Éclat et le bouton musique ne la relance pas sous ce masque. Les tests LR-019 vérifient explicitement ces contraintes.
- **Version Web 252 historique de cette branche, à NE PAS publier telle quelle** : manifeste, fichier principal, imports liés (dés, Accueil, calendrier, notifications, service worker), styles des favoris et cache PWA concordent. Le vrai `main` est déjà en Web 254 (LR-027); transposer LR-019 sur celui-ci, harmoniser toutes les références de cache et ne jamais rétrograder la version publique. La PR Éclat V2 #107 est distincte.
- Avant toute migration, faire une **lecture seule** de `couple-web/qa/lr019-production-schema-preflight.sql` sur une copie staging LoveRoll nommée : elle affiche les signatures et empreintes des quatre fonctions D100/cycle/clôture existantes, ainsi que les tables et capacités nécessaires. Un changement de hash **bloque la migration** jusqu'à vérification du corps de fonction. Aucun test sur une base SQL jetable ne valide à lui seul les fonctions de production.
- Ces modifications et vérifications statiques ne prouvent **ni mergeabilité finale**, ni exécution de la recette Auth A/B, ni déploiement. PR #106 est le brouillon actif, avec une correction non fusionnée; les anciennes PR empilées restent historiques.
