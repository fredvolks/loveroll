# Écrin duo compact — modèle 1

Sur téléphone, un seul écrin rubis de 184 px remplace les deux panneaux verticaux. Il contient le total attribué ce soir, les deux partenaires avec leurs nombres attribués et restants, puis les quatre indicateurs mensuels existants. Les données et les règles de calcul restent celles de `assignedTonight` et `coupleHomeStats`.

Un lien intégré au bas de l’écrin présente l’activité du mois et qui invite qui. Le titre provient du même `monthlyActivityForRoll` que Surprise, donc conserve le titre enregistré du tirage. Si Surprise affiche un lieu localisé prêt, l’accueil reprend également son titre. Les résultats du mois sont ceux déjà filtrés dans `refreshCouple` ; aucun nouvel appel ni tirage n’est créé par le récapitulatif.

`monthly-invitation.mjs` est partagé par l’accueil et Surprise : face paire, partenaire d’index 0 ; face impaire, partenaire d’index 1. L’invité est l’autre partenaire. Avant le tirage de l’activité, le lien affiche « Notre activité du mois — À découvrir ensemble ». Après l’activité mais avant le D6, il affiche « Qui invite ? À déterminer ». Le lien ouvre la vraie page Surprise et laisse les tirages à leur emplacement habituel.

La réduction du bas de page laisse davantage d’espace au théâtre 3D. Les boutons descendent, le fond et le socle suivent automatiquement leur point d’ancrage, et la toile du dé est agrandie. La caméra conserve la perspective mesurée du plateau. Le même modèle reste utilisé pour la rotation à plat au doigt et le lancer officiel. Les autres dés conservent leur cadrage.

Validation : 60 assertions unitaires, contrôle de syntaxe des scripts livrés, alignement et absence de défilement sur trois tailles Android, vrai toucher, même modèle pendant le lancer, et tests de récapitulatif mensuel (activité enregistrée, pair/impair, texte long et lien Surprise). Les valeurs sont vérifiées à partir de comptes synthétiques.
