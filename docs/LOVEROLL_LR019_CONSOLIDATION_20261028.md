# LR-019 — regroupement sécurisé des 5 coups de cœur personnels

Date : 28 octobre 2026. Cette branche repart du **main moderne** et réintègre les fonctions isolées des PR #56, #57, #58 et #60. Ces branches historiques sont très en retard sur main et ne doivent **pas** être fusionnées directement.

## Fonction réellement branchée dans le jeu (sur cette branche, non déployée)

- Chaque membre garde **jusqu'à 5 favoris personnels**, toutes catégories SENSUEL et SEXUEL confondues, y compris si le partenaire aime d'autres cartes : 10 cœurs individuels possibles à deux.
- Boutons de cœur sur ses vrais défis actifs et les défis archivés des soirées closes; état individuel, titre historique uniquement lorsqu'autorisé pour le compte courant, liste commune « Nos coups de cœur » dans Réglages > Jeu.
- Au sixième cœur, fenêtre de remplacement qui permet de retirer l'un de ses 5 cœurs et d'ajouter un nouveau; décompte et race concurrente contrôlés côté serveur par verrou de couple.
- RPC `love_favorites_capabilities` obligatoirement vraie avant toute action UI; en absence de migration, les boutons sont masqués (aucun clic factice).
- Migrations SQL copiées et regroupées : `20261026_lr019_favorites_core.sql`, `20261026_lr019_z_draw_favorites.sql`, `20261026_lr019_zz_cycle_unique.sql`. Moteur D100 reste lié au serveur : priorité aux exclusions et aux cartes utilisées cette soirée, favorites réintégrées seulement si admissibles au cycle.
- Tests Node, Chromium et PostgreSQL 17 jetable : plafonds des deux partenaires, sixième cœur refusé, courses simultanées, intégration D100, unicité des 200 cartes et droits du duo. **Ces tests ne valent pas une migration production**.

## Critères avant fusion

1. Confronter les migrations rebasées aux fonctions SQL effectivement présentes dans l'environnement LoveRoll de préproduction dédié, notamment les corrections LR-015 et les rôles RPC.
2. Vérifier manuellement 5/5 + sixième/remplacement pour deux comptes véritables A/B, sur deux appareils, avec vraie clôture Soirée, reprise, exclusion et nouvelle pige D100.
3. Vérifier le système de cache/version PWA et les imports actuels. La PR Web 248 #105 est indépendante et doit être intégrée avant le futur lot Favoris.
4. Ne jamais mélanger cette PR avec le changement de certificat Android #91 ni avec Éclat V2 #92.

**Statut : intégration de code en PR, non publiée.** Pas de migration dans Supabase production et pas de fusion tant que les critères ci-dessus ne sont pas satisfaits.
