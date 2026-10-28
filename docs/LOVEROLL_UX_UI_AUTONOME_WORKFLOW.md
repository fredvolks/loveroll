# LoveRoll — Protocole de direction UX/UI autonome pour ChatGPT Work

**Statut : directive opérationnelle, pas une preuve d'implémentation.** Complète `docs/LOVEROLL_MASTER_PROMPT.md` sans modifier l'ordre de livraison ni les décisions de jeu. Chaque étape se rattache au parcours métier du lot courant; ne pas bloquer le développement pour une maquette.

## Le designer IA est un rôle de Work, pas une application requise

1. À chaque nouvel écran, refonte visuelle ou parcours modifié, relire le véritable code Web/Android/PWA, les composants, les images HD et états des contrôles. Porter les regards complémentaires : **directeur artistique premium**, **designer UX/accessibilité**, **client payant**, **deux joueurs dont un moins technophile** et **développeur/testeur**.
2. Se demander : où regarder en premier ? Quelle action est attendue ? Le partenaire comprend-il le rôle, la carte, la catégorie, le consentement, la progression et la fin de séance sans explication ? Le rendu mérite-t-il le prix affiché ? Une interface fonctionnelle mais ambiguë doit recevoir une correction UX précise.
3. Analyser hiérarchie visuelle, contraste, taille lisible des textes, position et taille des vrais boutons, espacement, navigation, retours, états accessibles, animations sobres, chargement/perte réseau, carte verrouillée, erreur, paiement, droits Premium, changement de joueur et sauvegarde réelle.
4. Conserver la direction romantique haut de gamme de l'Accueil : velours/satin rose-rubis, rouge profond, verre rosé, dorure discrète, identité visuelle cohérente et boutons interactifs. Éviter superpositions d'images, doubles socles, cadres artificiels, décoration qui masque l'action, fausse 3D et collage des couches.
5. Adapter aux formats concernés : Samsung S25 Ultra et petit Android, iPhone/Safari/PWA, iPad portrait/paysage, bureau PC/Mac et clavier. Ne pas étirer un écran mobile sur bureau; conserver la même vraie fonctionnalité et les mêmes données sur tous les appareils. En cas de police agrandie, zoom ou hauteur insuffisante, permettre un défilement sûr au lieu de couper des commandes.
6. Pour chaque changement important, récupérer une **capture du rendu réellement exécuté**, datée et associée à sa version/viewport/état; utiliser aussi les captures envoyées par le propriétaire lorsqu'elles sont accessibles. Étiqueter **concept** toute proposition qui ne correspond pas à l'application réelle. Comparer le même état, la même taille et les mêmes données de test, puis faire un avant/après après intégration.
7. **Autonomie encadrée :** corriger les défauts d'espacement, alignement, contraste, responsive, libellés et uniformité déjà exigés, sans solliciter le propriétaire à chaque micro-retouche. Proposer clairement les refontes majeures de navigation, de scénario ou de valeur premium, avec maquette ou description avant/après et impact; attendre l'accord du propriétaire avant de modifier ces décisions de produit.
8. Après intégration dans le vrai code, vérifier les **vrais boutons et branches** dans la portée du lot, les états vides/erreur, le parcours A/B sur comptes de test isolés quand concerné, les animations D6/D100 et les issues des cartes. Capture et tests ciblés, puis CI et vérification du déploiement; ne pas prétendre à un essai Android/iPad physique s'il n'a pas eu lieu.
9. À chaque lot UX significatif, écrire un rapport concis : **écran / constat observable / impact joueur / correction proposée / priorité-effort / capture avant-après / test exécuté / limite / état déployé**. Un prototype, screenshot, générateur de nombres ou maquette ne vaut jamais vrai jeu testé.

## Boucle de jugement UX — automatique pendant chaque lot Work concerné

- **Déclenchement :** à chaque ajout ou modification d'écran, navigation ou composant visible dans le lot en cours, intégrer la revue UX à la routine Work, sans prompt supplémentaire du propriétaire. Grouper les micro-corrections d'un même parcours pour éviter les audits répétitifs.
- **Avant :** établir le comportement et la capture de référence réelle lorsque possible, ainsi que l'objectif utilisateur et les critères du prompt maître. **Après :** exécuter le vrai parcours modifié, capturer le rendu final aux formats affectés et confronter à la référence, au comportement attendu, à l'accessibilité et à la charte.
- **Verdict obligatoire :** `UX OK` si vérification réelle et critères satisfaits; `À CORRIGER` avec problèmes précis et priorités si échec; `NON VÉRIFIÉ` quand les outils, accès ou captures manquent. Une compilation ou une réussite CI seule ne donne jamais `UX OK`.
- **Boucle corrective :** pour les corrections dans le mandat déjà approuvé, corriger immédiatement, retester et réévaluer **dans la même session active**, en regroupant les modifications. Répéter jusqu'à conformité ou blocage réel documenté; ne pas exiger « continue » entre les vérifications ordinaires.
- **Limites :** une refonte majeure non approuvée est une proposition, pas un correctif automatique. Ne pas attendre un outil tiers, ne pas suspendre les parcours indépendants et ne pas annoncer un jugement IA qui aurait été fait hors session. GitHub Actions exécute ses tests sur PR/push, mais ne déclenche pas à lui seul un jugement créatif par Work.

## Protections absolues

- Réutiliser les vrais dés 3D WebGL, leur orientation et leur résultat serveur; ne pas les remplacer par une photo ou un nombre local. Préserver règles de défis, D6/D100, odds, rôles, refus/repige, temps, progression, histoire, catalogue et les 12 coffrets Éclat; le designer ne peut pas les réinventer.
- Conserver **les images HD d'origine de l'Accueil Android** sur iPad et les autres formats concernés. Les assets approuvés ne sont pas à générer de nouveau sans demande.
- Pas de modification des conditions Stripe, paiements, consentements, géolocalisation, authentification, notifications, stockage, RLS ou données de vrais couples pour un besoin décoratif. Préserver l'isolation des deux vrais comptes du banc de test Studio.
- Pas d'outil graphique externe, service de design IA payant, API tierce ni abonnement obligatoire pour exécuter ce protocole. Un outil de proposition visuelle facultatif n'est autorisé que si **déjà connecté, accessible, dans un quota acceptable et explicitement permis**. Sinon comparer directement les captures réelles et corriger le code dans Work/GitHub.
- Ne pas multiplier les captures/tests complets à chaque micro-correction. Réaliser une recette ciblée par lot complet et conserver les preuves. Aucun workflow GitHub ne lance une session Work en arrière-plan.

## Autorité

Les décisions produit les plus récentes et le prompt maître prévalent, puis la charte des fichiers CSS actifs (`couple-web/premium-theme.css`, `platform-admin-luxe.css` lorsque présents). Les captures réelles montrent le rendu, mais ne contredisent pas les droits ni les règles du serveur. Les recommandations UX ne sont pas des corrections appliquées tant que code, tests et déploiement ne sont pas vérifiés.
