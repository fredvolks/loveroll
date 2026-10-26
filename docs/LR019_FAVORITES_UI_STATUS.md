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

## Extension à l'historique — nouveau lot
- Le calendrier montre un vrai bouton de cœur sur les défis archivés reçus par le membre connecté, jamais dans les sections d'un autre destinataire.
- Les anciennes descriptions et titres ne sont pas modifiés, et le bouton reste masqué sans RPC de favoris opérationnelle.
- `aria-pressed` et `disabled` reflètent l'état individuel et l'opération en cours ; styles mobiles et test Node ajoutés.
- Revalider le dernier SHA GitHub avant toute déclaration de succès. Non déployé.

## Contrôle visuel Chromium
- Ajout d'un test Playwright fondé sur le composant réel `eveningHistoryMarkup`, ses feuilles CSS et six formats d'écran 360/393/412/820/1180/1440 px.
- Vérifie les cœurs activés/désactivés, l'absence de bouton sur la carte d'un autre destinataire, l'accessibilité au clic et l'absence de débordement horizontal.
- Il s'agit d'un navigateur **émulé**, pas d'un test sur appareils physiques ni d'un parcours Auth Supabase complet.
- Contrôler le résultat du nouveau workflow sur le SHA exact.

## Diagnostic du premier test Chromium
- Run #40408795077 SHA `15a6306` **completed/failure** : les feuilles CSS demandaient `http://127.0.0.1:8765/`, mais ce nouveau workflow autonome ne démarrait aucun serveur HTTP. Un bouton mesurait donc 21 px sans la règle CSS de 36 px.
- Correction : démarrer et vérifier un serveur de fichiers statiques temporaire dans le workflow avant Playwright, puis le fermer à la fin. Les assertions de taille et de débordement restent inchangées.
- Contrôler le prochain run et son SHA, ainsi que les styles réellement chargés. Il ne s'agit pas d'un échec des RPC.

## Dernière activation du backend
- **Bug corrigé :** la vue attendait `love_favorites_capabilities(p_couple)` avant d'afficher un cœur, mais la fonction n'était pas fournie. Elle est maintenant créée et limitée aux membres vérifiés dans la migration finale `20261026_lr019_zz_cycle_unique.sql`, après l'intégration LR-015, la table sécurisée et le compteur des 200 défis.
- Test PostgreSQL de retour `true`, protection entre couples, rôles `anon/authenticated` et absence de fuite. Workflow PostgreSQL élargi pour la PR #58.
- Il faut toujours appliquer les migrations dans l'ordre contrôlé et obtenir l'autorisation avant d'activer quoi que ce soit en production.
- Validation Chromium précédente : run 40409005291 `completed/success` SHA `77eb0d8`. Validation de ce changement serveur à confirmer sur son SHA exact.

## Validation finale sur la PR UI
- Le workflow autonome `lr019-favorites-ui.yml` exécute désormais **deux jobs** quand le code UI ou les migrations changent : navigateur Chromium et vraie base PostgreSQL 17 jetable.
- Nécessaire pour couvrir `love_favorites_capabilities` avec une exécution déclenchée sur la branche empilée : le workflow SQL précédent n'était pas déclenché sur cette PR.
- Prochaine action : vérifier les **deux conclusions finales** et les journaux d'erreur sur le SHA exact. Ne pas considérer une simple exécution en cours comme un succès.

## Réconciliation des dépendances SQL — 26 octobre 2026
- Branche de base PR #57 fusionnée **dans cette branche seulement** au SHA `c05f0752ba0cfb90fa628449726553fde3e25ba3`, aucune fusion dans main.
- Conserver une seule définition de `love_favorites_capabilities` du moteur #57, tout en gardant le test d'accès renforcé de cette PR UI.
- Préserver les deux jobs UI Chromium et PostgreSQL du workflow courant; recontrôler les nouveaux runs sur le SHA de merge.
