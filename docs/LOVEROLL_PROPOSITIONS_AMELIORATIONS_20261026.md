# LoveRoll — Propositions d'amélioration (revue rapide du code du 26 octobre 2026)

> **Ce document contient des propositions, pas des exigences officiellement validées, des bugs reproduits ni des fonctionnalités terminées.** Revue rapide des fichiers principaux `couple-web/app.js`, `premium-evening.mjs`, `evening-calendar.mjs`, `calendar-success-stats.mjs`, `evening-private-queue.mjs` et migrations `20261018_play_style_and_pass_quota.sql` / `20261018_challenge_cycles_and_recycled_passes.sql`. **Aucun essai sur vrai téléphone ou couple n'a été réalisé lors de cette revue documentaire.**

## Constats concrets

1. La migration `20261018_play_style_and_pass_quota.sql` et `love_calendar_pass_quota` définissent actuellement les **trois premières passes mensuelles par partenaire comme « free_pass »**. Il n'y a pas dans cette RPC de **blocage de la quatrième passe**. Dans `calendar-success-stats.mjs`, les passes ultérieures sont traitées comme **pénalisées** dans le taux. **LR-016** répond à cette divergence avec la nouvelle règle de plafond configurable.
2. Dans `app.js`, `renderPremiumEvening` présente **« Passer ce défi »** en deux emplacements (ancien parcours et file personnelle). L'action `answer` appelle directement `answer_challenge` avec l'état `passed`. La même protection doit donc couvrir **toutes les variantes d'écrans et le serveur**, pas uniquement le bouton le plus récent.
3. Le calendrier affiche déjà des libellés pour le statut `passed` et pour **« Passé sans pénalité / Passé, comptabilisé »**. La nouvelle limite nécessite d'actualiser aussi la terminologie et la formule statistique pour ne pas récompenser/pénaliser involontairement un refus.
4. Le code gère une limite indépendante de **3 dons/mois/personne** (`premium-evening.mjs`). Ne pas relier ce compteur à celui des passes.
5. `app.js` clôture automatiquement la soirée lorsque les quotas des deux partenaires sont atteints, via le tableau `my_love_evening_board` puis `finish_couple_session`. Ajouter remplacement/refus exige des tests de clôture : un simple remplacement ne doit pas terminer la soirée à tort.

## Améliorations proposées (à approuver individuellement)

| Code | Priorité conseillée | Idée | Bénéfice pour le couple | Impact / précaution |
|---|---|---|---|---|
| PROP-01 | Haute | Afficher une **fiche courte « Passer / Refuser »** expliquant ce qui consomme une passe et ce qui demeure toujours libre. | Pas de doute sur les règles ni de pression. | À incorporer avec LR-015/LR-016, validation des textes. |
| PROP-02 | Haute | Transformer l'ancien **taux de réussite pénalisant** en résumé plus bienveillant « Réalisés · Passés · Refusés · À refaire » sans présenter les refus comme un échec. | Une ambiance complice plutôt que compétitive ; moins de statistiques culpabilisantes. | Audit LR-003 ; ne pas effacer taux et historiques sans validation. |
| PROP-03 | Haute | Ajouter **« Adapter ce défi »** comme option de discussion, distincte de « Passer » et « Refuser », avant confirmation commune. | Transformer un défi presque adapté en activité agréable sans repiger ni utiliser une passe. | La carte contient déjà des textes invitant à modifier la proposition, mais le parcours `app.js` n'expose pas de bouton dédié ; validation UX/métier nécessaire. |
| PROP-04 | Moyenne | Montrer sur l'écran Soirée le **progrès réel de chaque partenaire** (ex. 2/4) et les étapes restantes, sans exposer les détails de ses cartes privées. | Comprendre où en est la soirée, éviter d'attendre inutilement. | Préserver confidentialité et synchronisation existante. |
| PROP-05 | Moyenne | À la clôture : un **petit récapitulatif romantique** de la soirée (réalisés, à réessayer, cartes exclues) puis accès au calendrier. | Meilleure conclusion, évite que la clôture automatique semble brusque. | Éviter de bloquer la clôture serveur ; récapitulatif non intrusif. |
| PROP-06 | Moyenne | Prévenir les **répétitions immédiates** après Passer/Refuser, avec message clair si le lot admissible est épuisé. | Pas de repigage en boucle et moins d'irritation. | Déjà exigé dans LR-015, à tester sur le moteur serveur / cycle 200. |
| PROP-07 | Moyenne | Rendre tous les boutons et dialogues de Soirée **strictement homogènes à l'Accueil**, y compris confirmer, refuser, adapter et afficher les passes restantes. | Continuité Premium sur mobile, tablette et PC. | Déjà couvert en partie par LR-010/LR-012 ; éviter ajout de styles parallèles. |

**Prochaine décision :** demander quelles propositions parmi PROP-01 à PROP-07 doivent devenir des exigences LR-xxx. Ne pas les considérer comme acceptées du seul fait de ce rapport.
