# LR-019 — interface Coups de cœur (PR empilée)

Branche `feat/lr019-favorites-ui-20261026` créée depuis `fb8d40a8f751796c3ac30e790bc7ff4130aadb72`, PR #57 en dépendance, elle-même dépendante de #54 et #56.

- Bouton réel pour marquer/démarquer une carte reçue dans « Mes défis ».
- Réglages > Jeu > Nos coups de cœur : consultation commune, cœur individuel par partenaire, intitulé historique seulement si autorisé pour le compte courant, sinon identifiant neutre.
- RPC serveur de lecture/écriture, synchronisation après action, anti-double clic, route et contrôles masqués si fonctions backend absentes.
- Contenus des cartes, statut du défi, minuterie et données historiques non modifiés.

**À compléter avant livraison :** favoris depuis les archives historiques, tests Chromium physiques/émulés de toutes les routes, deux partenaires simultanés, cache/version PWA, compatibilité LR-044 et migration Supabase validée. Aucune fusion ni déploiement sans autorisation.

## Continuité GitHub
Tâche en cours : terminer la surface UI LR-019. SHA présent au premier commit : à récupérer via tête de branche.
Tests : workflow indépendant Node sur la PR, à suivre jusqu'à conclusion. Base PostgreSQL de PR #57 validée au SHA `fb8d40a8f751796c3ac30e790bc7ff4130aadb72` par run 40407237367. La validation de cette nouvelle UI ne vaut pas un déploiement.
Prochaine action : identifier le nouveau run, diagnostiquer les erreurs, corriger sur la branche, poursuivre les tests navigateur et les archives.

## Résultat confirmé sur le premier SHA UI
- PR #58 SHA `94467b75e9c694f34a86c52009427f2e631ca5da` : [workflow Node #40407796829](https://github.com/fredvolks/loveroll/actions/runs/40407796829) **completed/success** ; aucune étape échouée.
- Limites inchangées : comportement réel Chromium/iPhone/Android, onglet historique, synchronisation à deux utilisateurs et Supabase de production **non validés**.
- Toute nouvelle mise à jour documentaire produit un autre SHA et déclenche une nouvelle validation.
