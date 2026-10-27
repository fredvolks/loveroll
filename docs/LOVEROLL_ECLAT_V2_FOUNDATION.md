# Éclat V2 — fondations en préparation (27 octobre 2026)

État : **contrat éditorial et moteur de parcours implémentés seulement dans une branche**, pas encore connectés à l'expérience en production. Aucun coffret n'est déclaré terminé.

- Les **12 coffrets/96 scènes** sont recopiés **sans réécriture** à partir de `LOVEROLL_ECLAT_12_COFFRETS_SPEC.md` (blob SHA `2d1a9c7fc09d894ff0bc646ee770edd42b58eb56`), avec les tableaux originaux complets et deux choix de variante V0/V1 par scène.
- Trajets déterministes approuvés : 30 min (1/3/6/8), 60 min (1/2/3/5/6/8), 90 min (1/2/3/4/5/6/7/8), budgets indicatifs exactement conformes.
- V0 puis V1 alternés par coffret sur les **séances V2 commencées**, y compris interrompues; les séances V1 historiques ne changent pas. **Allocation atomique côté serveur à développer** avant activation.
- Le rôle A est le créateur, B son partenaire; un/deux téléphones explicitement identifiés, pause/reprise, passage sans pénalité et interruption sans faux succès modélisés sans requêtes réseau.
- Aucune réponse privée dans l'état partagé. La révélation deux téléphones nécessite deux confirmations; le partage un téléphone nécessite un accord oral explicite.

**Blocages avant activation :** transactions serveur/RLS, migrations et tests de concurrence, choix privés, confirmations de contact, animations de scène/branches spécifiques aux 12 coffrets, persistance de reprise, souvenirs communs facultatifs, gestion un/téléphones et recette physiques. Ne pas brancher le moteur au jeu ni publier une migration prématurément.

**Tests :** `node --test couple-web/eclat-v2-contract.test.mjs` et CI spécifique `eclat-v2-contract.yml`. Aucun essai iPad/Android physique ni validation Supabase de V2 accomplis.
