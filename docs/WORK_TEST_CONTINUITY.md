# LoveRoll — continuité GitHub / état technique vérifié

Dernière mise à jour : 26 octobre 2026 (heure du Québec).
Branche active : `feat/lr019-five-favorites-20261026-v2`
**Dernier SHA de code/CI validé :** `3db1fc7578c36a270967a0c8e471804d2330e795`
PR active : https://github.com/fredvolks/loveroll/pull/60 (brouillon, base PR #58).
Dépendances de la pile : #60 → #58 → #57 → #54 ; registre SQL #56 copié dans la branche #57.
Ne pas fusionner, déployer ni appliquer de migration de production sans autorisation.

## Tâche LR-019 : favoris

- Plafond **5 coups de cœur par personne**, Sensuel et Sexuel combinés, appliqué dans `set_love_couple_favorite`, verrou du couple préexistant.
- Un favori déjà possédé ne consomme pas de place supplémentaire. Supprimer l'un de ses favoris libère une place; le partenaire conserve les siens.
- Quand on atteint cinq, la fenêtre montre les cinq cartes, chacune avec un vrai bouton « Retirer ». Une fois la place libérée, un bouton « Ajouter mon nouveau coup de cœur » est disponible. Deux RPC distinctes, pas une substitution atomique.
- Dans le calendrier d'une **soirée clôturée**, chaque membre peut aimer les cartes archivées des deux partenaires; les défis en cours de l'autre personne restent protégés.
- Les favoris marqués avant une soirée future peuvent revenir au D100; les refus/exclusions LR-015 priment; le cycle compte des cartes distinctes et non les réalisations répétées.

## Vérifications GitHub sur le SHA exact

- **Dernier code** `3db1fc7578c36a270967a0c8e471804d2330e795` : PostgreSQL 17 **40412698032** et tests Node + Chromium **40412698027**, tous deux **completed/success**, aucun job échoué; inclut le scénario SQL de concurrence entre deux appareils.
- Code `2dd174debd82c22949eb872c45184aa7f8861156` : PostgreSQL **40412425562** et Chromium **40412425585**, tous deux **completed/success**, incluant le test des deux comptes.

- PostgreSQL 17, run **40412091362**, SHA `82b27dc187b414c236593bb8ae2a3c39c52fbfe0` : **completed/success**.
- Chromium et tests Node, run **40412091335**, même SHA : **completed/success**.
- Historique : run 40412004633 a échoué sur `b2be101...` à cause d'une ancienne assertion exigeant encore l'interdiction d'une carte partenaire. Corrigée dans `lr019-favorites-ui.test.mjs`, nouveau run réussi.
- Premier test PostgreSQL de la limite 5, run 40410896876 sur `35dbc0c...` : réussi.
- Aucune validation sur de vrais téléphones Android/iOS; Chromium est une émulation.
- Nombre de tentatives : plusieurs itérations; dernier cycle de code validé avec les deux workflows réussis.

## Blocages/risques connus

- PR #60 est encore en brouillon, et ses dépendances #54, #56, #57 et #58 ne sont pas livrées à `main`.
- GitHub Pages sur `main` : run **40410344904** `completed/failure` sur `5fe2fdd...`; analyser le journal et les permissions avant de proposer un correctif. Ne pas confondre les validations des branches avec le site public.
- L'interface de capacité `love_favorites_capabilities` n'est active qu'après l'ensemble des migrations sur une base approuvée.
- Lors d'un changement de favori depuis la fenêtre : retrait puis ajout séparés; si l'ajout échoue, la place demeure libre et le joueur peut réessayer. Ne pas prétendre à une transaction atomique côté interface.

## Reprise immédiate

1. Confirmer la tête de #60 et sa base : comparer à ce SHA.
2. Relire les nouveaux runs PostgreSQL/Chromium, diagnostiquer tout échec sur le SHA qui l'a généré.
3. Examiner le **Pages failure** run 40410344904; diagnostiquer uniquement, corriger sur PR isolée si nécessaire sans fusion `main`.
4. Lire `docs/LOVEROLL_MASTER_PROMPT.md`, `docs/LOVEROLL_SUIVI.md`, `docs/LOVEROLL_NOUVELLES_DEMANDES.md` et relancer le prochain lot prioritaire.
5. Tester encore le fonctionnement iPhone Safari et Android réels; surveiller que les changements LR-019 n'altèrent ni la confidentialité ni les horaires/quotas du jeu.

**État du prompt maître :** LR-019 partiellement réalisé sur PR empilées, tests isolés réussis, déploiement et recette réelle en attente; autres exigences P0 et priorités restent distinctes.

## Vérification Pages séparée

- Déploiements `main` précédents **40410344904** et **40410706170** : `completed/failure`. Le premier a échoué à une assertion visuelle sur la position du cœur Soirée versus Accueil; le second sur une vérification PWA/visuelle. Le run Pages **40411130259** sur `9c75b1...` était encore `in_progress` lors du dernier contrôle : **ne pas annoncer de livraison**.
- La dernière modification de ce fichier est documentaire, et son SHA de commit ne doit pas remplacer artificiellement le SHA de code validé.
