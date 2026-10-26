# LoveRoll — BOÎTE D'ENTRÉE DES NOUVELLES DEMANDES
> Ce fichier est conçu pour être **édité directement sur GitHub**, depuis ton téléphone, une tablette ou un PC.

## Règle de fonctionnement
1. Ajoute chaque nouvelle idée **tout en haut** de « Demandes à traiter », sans écraser celles qui existent.
2. Ajoute une date, un titre, l'écran concerné, le résultat attendu et, si possible, une capture d'écran ou un lien d'Issue.
3. **Ne modifie pas les identifiants LR-xxx existants**. Les nouvelles demandes reçoivent leur propre ID à la prochaine revue.
4. Une fois la demande analysée, la déplacer vers « Transférées au prompt maître » en indiquant le nouvel identifiant LR-xxx. **Ne pas supprimer l'historique**.
5. Pour une anomalie urgente, créer en parallèle une **Issue GitHub** à partir du modèle « Demande LoveRoll ». Elle peut héberger les images, commentaires et discussions.
6. La présence d'une demande ici **n'implique pas** qu'elle est codée : seul [LOVEROLL_SUIVI.md](./LOVEROLL_SUIVI.md) et ses preuves/PR permettent de connaître son état.

## Demandes à traiter

<!-- Copier le modèle sous cette ligne. Mettre les nouvelles entrées avant les anciennes. -->

### [NOUVEAU] AAAA-MM-JJ — Titre de l'idée / bug
- **Écran / appareil :** Accueil, Soirée, Défis, Calendrier, Surprise, Avent, Éclat, Réglages, admin / Android, iPhone, iPad, tablette, PC…
- **Problème ou idée :** …
- **Ce que je veux exactement :** …
- **Importance :** P0 (bloquant), P1 (important), P2 (amélioration)
- **Photo / vidéo / Issue GitHub (facultatif) :** …
- **Notes pour éviter une régression :** …

<!-- Ajouter autant de blocs que nécessaire. -->

## Transférées au prompt maître

| Date | Demande originale | ID attribué | PR / lien |
|---|---|---|---|
| 2026-10-26 | D100 trop gros ; timers à zéro ; harmonisation avec Accueil ; UX/UI comme designer et couple ; responsive mobile/tablette/PC | LR-001…LR-043 (21 ID listés, voir suivi) | [PR #10 — fusionnée](https://github.com/fredvolks/loveroll/pull/10) |

| 2026-10-26 | Soirée : confirmation de catégorie Sensuel/Sexuel/Au hasard au clic « Brasser le dé », possibilité « Ne plus afficher ce message », réactivation via réglages individuels | **LR-014** (à implémenter) | [Prompt LR-014](./LOVEROLL_MASTER_PROMPT.md) · [Suivi LR-014](./LOVEROLL_SUIVI.md) |

| 2026-10-26 | Soirée : pouvoir passer ou refuser un défi, demander lors du refus s'il faut l'exclure de la pige pour le cycle, retourner les défis non terminés à la pige après la soirée et permettre la repige | **LR-015** (à implémenter) | [Prompt LR-015](./LOVEROLL_MASTER_PROMPT.md) · [Suivi LR-015](./LOVEROLL_SUIVI.md) |

| 2026-10-26 | Limiter « Passer un défi » à 3 fois/mois/par partenaire, permettre à l'admin du couple d'ajuster le plafond, afficher passes restantes, conserver Refuser possible | **LR-016** (à implémenter) | [Prompt LR-016](./LOVEROLL_MASTER_PROMPT.md) · [Suivi LR-016](./LOVEROLL_SUIVI.md) |

| 2026-10-26 | Idées 3 à 8 approuvées : Adapter un défi, Reprendre notre soirée, Coups de cœur rejouables, Mode discrétion, Variété intelligente, Action principale unique | **LR-017, LR-018, LR-019, LR-025, LR-026, LR-027** (à coder) | [Prompt](./LOVEROLL_MASTER_PROMPT.md) · [Suivi](./LOVEROLL_SUIVI.md) |
| 2026-10-26 | Soirée avant le lancer des deux D6 : « As-tu envie de jouer ce soir ? », invitation à l'autre membre, notification et réponse Oui / Non / Peut-être, Oui ouvre Soirée pour brasser son propre D6 | **LR-028** (à coder) | [Prompt](./LOVEROLL_MASTER_PROMPT.md) · [Suivi](./LOVEROLL_SUIVI.md) |

## Lire et modifier depuis un téléphone
1. Ouvre ce document sur GitHub en étant connecté.
2. Appuie sur le **crayon / Edit** (parfois dans le menu « … »).
3. Ajoute la demande sous « Demandes à traiter ».
4. Clique sur **Commit changes** puis choisis l'enregistrement sur une branche/PR lorsque GitHub te le propose. Si tu modifies la branche documentaire courante, les changements apparaîtront dans sa PR.
5. Demande ensuite à Work : « Lis mes nouvelles demandes LoveRoll dans GitHub, intègre-les au prompt maître sans supprimer les anciennes et actualise le suivi. »

### Alternative sans éditer de Markdown
Ouvre https://github.com/fredvolks/loveroll/issues/new/choose et choisis **Demande LoveRoll**. Les Issues sont mieux adaptées pour commentaires, images et suivi d'une idée spécifique.

## Liens rapides
- [Prompt maître](./LOVEROLL_MASTER_PROMPT.md)
- [Suivi officiel](./LOVEROLL_SUIVI.md)
- [Issues LoveRoll](https://github.com/fredvolks/loveroll/issues)
- [Dépôt](https://github.com/fredvolks/loveroll)

> Important : sur cette branche, le système de suivi est **documentaire**. Il n'envoie pas automatiquement de notifications et n'exécute pas les demandes à lui seul.
