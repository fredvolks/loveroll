# LoveRoll — Préparation des paiements et abonnements

Statut : **en préparation seulement** (aucun paiement actif). Dernière revue : 2026-10-19.

## Préalable obligatoire — admissibilité du prestataire

LoveRoll comprend des défis romantiques, sensuels et sexuellement explicites.
Stripe interdit généralement le contenu sexuellement explicite destiné à la gratification sexuelle,
y compris des textes. **Ne pas créer de prix actifs, demander de vraies cartes de paiement,
activer le bouton payer ou déployer la passerelle Stripe en production avant
confirmation écrite explicite de Stripe que les fonctionnalités et le contenu
précis de LoveRoll sont admissibles.**
Une simple ouverture de compte Stripe ou un passage de la vérification d'identité
**ne signifie pas** que LoveRoll est accepté.
Si Stripe refuse, chercher un prestataire qui accepte explicitement ce contenu
et vérifier ses règles de rétrofacturation, paiements récurrents et pays desservis.

Sources officielles :
- https://stripe.com/legal/restricted-businesses
- https://support.stripe.com/questions/prohibited-and-restricted-businesses-list-faqs
- https://support.stripe.com/questions/types-of-business-and-structure-guidelines-in-canada

## Modèle commercial proposé — à valider

- Un abonnement annuel **par couple**, montant depuis `love_platform_settings.annual_base_cad_cents` (actuellement 4 999 cents CA).
- Chaque utilisateur s'authentifie individuellement dans Supabase.
- La propriété des abonnements et le partage d'accès doivent être déterminés côté serveur.
- Un abonnement Premium gratuit à vie déjà accordé à titre spécial doit rester inchangé;
  ne pas remettre ces droits à zéro lors de l'intégration.
- À chaque échéance, deux soldes de parrainage **personnels** sont additionnés
  pour le duo actuel et plafonnés au prix d'un renouvellement.
- Un code promotionnel et les crédits de parrainage **ne s'additionnent jamais** :
  calculer les deux côté serveur, retenir le montant de remise supérieur;
  en cas d'égalité, préférer les crédits de parrainage comme prévu.
- Un crédit non utilisé reste attribué au membre qui l'a gagné, y compris
  après séparation et formation d'un nouveau couple.
- Les codes doivent être validés au moment où l'offre est réservée et au paiement :
  durée, audience, nombre maximal, anti-abus, historique.
- Ne pas confondre « 0 $ dû » et un paiement vérifié : une facture de 0 $ peut
  être correctement reconnue et validée par le fournisseur sans opération carte.
- Taxes (TPS/TVQ, hors Québec) : appliquer selon inscriptions et obligations fiscales,
  sans présumer que le prix affiché est taxes incluses.

## Architecture sûre et indépendante du fournisseur

### Frontend
`couple-web/checkout.html` + `checkout.js` sont une prévisualisation et
conservent leur bouton de paiement **désactivé** pour l'instant. Ne jamais mettre
les clés secrètes du fournisseur dans HTML, GitHub Pages, JS client ou dépôt.

### API d'ouverture de paiement (future Supabase Edge Function)
- Authentifier l'utilisateur avec sa session Supabase.
- Vérifier qu'il est membre du couple **actuel** et que le duo est éligible.
- Vérifier le plan et le prix auprès de Supabase, jamais depuis le navigateur.
- Gérer au niveau SQL des réservations atomiques et temporisées des codes promo
  et soldes personnels (pour éviter les doubles dépenses, expirations et races).
- Conserver un instantané de l'audience (`annual_new` / `annual_renewal`),
  du couple, des membres et des réductions réservées sur la commande.
- Créer la session de paiement en mode abonnement, avec une clé d'idempotence
  et des métadonnées internes non sensibles.

### Réception webhook (future Supabase Edge Function)
- HTTPS public recevant **uniquement des événements signés** par le fournisseur;
  vérifier le corps brut et la signature AVANT toute écriture.
- Conserver une table d'événements avec contrainte UNIQUE sur l'identifiant
  de l'événement, plus UNIQUE sur identifiant de facture et attribution d'avantages.
- Au besoin, relire directement la facture et son état via l'API du fournisseur.
- Comparer identifiant du couple, produit, période, devise, montant, taxe,
  rabais retenu et référence de paiement avant d'activer Premium.
- Réconcilier `checkout.session.completed`, `invoice.paid`,
  `invoice.payment_failed`, `customer.subscription.updated/deleted`,
  les remboursements et les litiges, sans croire à l'ordre d'arrivée des webhooks.
- Décrémenter les crédits personnels **une seule fois**, selon le montant confirmé;
  conserver les reliquats personnels et appliquer les règles de séparation.
- Gérer annulation à l'échéance, défaut de paiement, renouvellement gratuit,
  remboursement, rétrofacturation et reprise d'accès, avec audit.
- Préserver les droits Premium d'administration/gratuits existants.
- Éviter toute exposition de données intimes des membres au processeur.

### Paramétrage secrets (futur, après approbation)
- `STRIPE_SECRET_KEY` **en secret Supabase seulement**, jamais dans la conversation.
- `STRIPE_WEBHOOK_SECRET` **en secret Supabase seulement**.
- Identifiants du prix annuel en variables serveur ou base; commencer par les identifiants de **test**.
- Garder clés `test` et `live` séparées, aucun mélange de données et aucun vrai
  paiement avant revue de sécurité et validation end-to-end.

Documentation :
- https://supabase.com/docs/guides/functions/examples/stripe-webhooks
- https://supabase.com/docs/guides/functions/auth
- https://docs.stripe.com/api/idempotent_requests

## Console administrateur, plus tard

À afficher : montant réellement encaissé, commissions, renouvellements,
état de chaque abonnement, échecs de paiement, annulations, factures et remboursements,
montant des codes promo réellement utilisé, solde individuel des crédits,
et historique de chaque intervention. Aucun accès aux numéros complets de carte.

## Vérifications avant activation

1. Réponse écrite du prestataire autorisant explicitement la version LoveRoll réelle.
2. Statut professionnel et immatriculation au Québec vérifiés : sous le nom commercial
   LoveRoll, une entreprise individuelle doit généralement s'immatriculer.
3. Statut TPS/TVQ et ventes numériques hors Québec évalués avec les règles en vigueur.
4. Conditions d'utilisation, politique de remboursement, vie privée, âge,
   consentement aux paiements récurrents, support et annulation accessibles.
5. Tests de paiements et échecs, cartes refusées, webhooks dupliqués et hors séquence,
   séparation/reformation du couple, rabais et facture 0 $, codes expirés,
   concurrence et remboursement.
6. Approbation explicite du propriétaire avant activation live.
