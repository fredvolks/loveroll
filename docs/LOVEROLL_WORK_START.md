# LoveRoll — routine de démarrage Work (lots locaux)

> Document opérationnel court. Source des exigences : [prompt maître](./LOVEROLL_MASTER_PROMPT.md) ; des 12 coffrets : [spécification Éclat](./LOVEROLL_ECLAT_12_COFFRETS_SPEC.md) ; preuves et états : [suivi](./LOVEROLL_SUIVI.md). Les décisions de jeu sont déjà prises : Work code, ne réinvente pas les règles.

## Mission
Poursuivre le projet LoveRoll existant jusqu'à livrer le premier parcours approuvé réalisable, puis le suivant durant la session. **Développer localement en lots complets avant de pousser.** Ne pas interrompre entre les petits changements ordinaires pour demander « continue ». Ne jamais prétendre continuer après la fin réelle de la session.

- Dépôt : `https://github.com/fredvolks/loveroll`.
- Supabase **exclusif LoveRoll** : `ejsrqfpkgwraorrznjpm`. Ne jamais confondre avec Punch 360° ni déployer sur un autre projet.
- Ne pas recommencer le jeu ni modifier ses prix ou ses dés/probabilités sans instruction explicite.

## Routine obligatoire

1. **Synchroniser.** `git fetch origin --prune`; prendre le dernier `origin/main`. Lire cette page, les règles prioritaires du maître, les critères de la fonctionnalité choisie et les dernières entrées utiles du suivi; lire les `AGENTS.md` applicables s'ils existent.
2. **Un balayage GitHub ciblé.** Consulter les PR/branches actives, les runs du SHA concerné et les migrations qui dépendent du parcours. Préserver les PR en cours, y compris les changements Éclat, Surprise/Geoapify, notifications et corrections P0, sans recopier leur code. Les numéros mentionnés dans des notes historiques ne dispensent pas de revérifier l'état actuel.
3. **Planifier un lot testable.** Choisir le premier parcours métier réalisable selon l'ordre du maître; réunir ses écrans, état, erreurs, accessibilité, tests, corrections responsive et mise à jour de suivi. Documenter les dépendances seulement si nécessaires. Éviter les changements sans lien (notamment DB/Auth/Stripe et CSS décoratif dans la même PR).
4. **Développer dans une branche locale.** Exemple :
   ```bash
   git switch -c feat/lr-<parcours>-batch-<numero> origin/main
   # coder plusieurs morceaux du parcours avant de pousser
   ```
   Modifier le code existant et lancer localement les vérifications utiles. Réparer sans créer de PR/CI à chaque retouche. Les commits locaux de sauvegarde sont permis; ne pas pousser avant la recette cohérente.
5. **Valider avant push.** Syntaxe, tests unitaires du lot, tests d'intégration et navigateurs touchés, confidentialité et concurrence selon les modifications. Conserver une matrice courte « scénario / preuve / résultat ». Ne pas annoncer de test physique Android/iPad/iOS inexistant.
6. **Livrer en un cycle distant.** Push de la branche terminée, une PR pour le lot, validations GitHub obligatoires sur le SHA final, réparation réelle des échecs, fusion sûre et publication. Vérifier le `main` réellement déployé; un build Web ne déploie ni Edge Function, ni migration SQL, ni APK.
7. **Suivi une fois.** Inscrire IDs du maître, commit/PR, validation précise, état déployé et limites restantes. Reprendre le lot métier suivant sans audit global ni redemander la routine. Ne pas créer une boucle de commits documentaires déclenchant des CI identiques.

## Découpage fonctionnel Éclat

- **Fondations d'abord :** reprise de séance et V0/V1 côté serveur, 1 ou 2 téléphones, confidentialité réelle des choix, rôles A/B stables, interactions de scène, pause/pass/finale et consentements. Réutiliser les composants existants; sessions historiques inchangées. Une fondation incomplète ne compte pas comme un coffret livré.
- **Lot A :** coffrets 01–04, entièrement conformes à leurs tableaux de scènes fixés.
- **Lot B :** coffrets 05–08, interactions spécifiques incluses.
- **Lot C :** coffrets 09–12, interactions spécifiques incluses.
- Chaque lot comprend les parcours 30/60/90 minutes, V0/V1, erreurs/reconnexions, deux partenaires, responsive et tests nécessaires. Aucun nombre de coffrets « terminés » sur la seule présence des cartes de catalogue.
- Si ces lots ne sont pas encore la première priorité du maître, terminer les correctifs et dépendances en cours avant de lancer les fondations Éclat.

## Limites et coordination

- Plusieurs branches/PR en parallèle : **ne jamais réécrire le travail d'autrui**, ne pas forcer une fusion ni se baser sur des checks d'un ancien SHA. Éviter les PR concurrentes touchant aux mêmes fichiers; réévaluer seulement si `main` a changé.
- Sur la machine qui ne fournit pas d'accès `git clone`, ne pas annoncer du développement/test **local** fictif : employer le connecteur GitHub pour regrouper un commit multi-fichiers, avec la CI et les limites explicites.
- Bloquage ou fin de session : restituer précisément ce qui est en code, testé, dans une PR, fusionné et publié; ne pas demander l'arbitrage de détails déjà réglés par le maître.
