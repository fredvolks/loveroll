# LoveRoll

Application de couple LoveRoll — Android et PWA. Dépôt indépendant de **Mon Wallet**.

## Production

- **PWA :** https://fredvolks.github.io/loveroll/
- **Android :** [LoveRoll v0.13.13 signé](https://github.com/fredvolks/loveroll/releases/tag/des-a-deux-v0.13.13)
- **Code source Android :** `app/`
- **Code source PWA :** `couple-web/`
- **Déploiement PWA :** `.github/workflows/deploy-couple-web.yml`
- **Compilation Android :** `.github/workflows/android.yml`

## Migration de l'application Android existante

Les APK v0.13.12 installés cherchent encore les versions signées dans `fredvolks/mon-wallet-android`. Une **version de transition v0.13.13**, construite depuis le code du nouveau dépôt et signée avec **le certificat original**, a été publiée dans l'ancien dépôt et recopiée à l'identique dans ce dépôt.

- [APK de transition compatible avec les installations existantes](https://github.com/fredvolks/mon-wallet-android/releases/download/des-a-deux-v0.13.13/LoveRoll-v0.13.13.apk)
- [Même APK dans le nouveau dépôt](https://github.com/fredvolks/loveroll/releases/download/des-a-deux-v0.13.13/LoveRoll-v0.13.13.apk)

**Ne pas désinstaller l'APK existant** : installer 0.13.13 par-dessus. Le paquet Android reste `ca.desadeux.jeu`, la nouvelle WebView charge `/loveroll/` et son gestionnaire d'updates consulte désormais les Releases de `fredvolks/loveroll`. Les comptes, les invitations et les données Supabase ne sont pas migrés ni supprimés par ce déploiement.

L'ancien dépôt conserve uniquement la publication-pont pour les utilisateurs restés sur 0.13.12. Ne pas supprimer cette Release tant que la transition reste nécessaire.

## Signature des futures versions Android

**Action d'administration encore nécessaire :** configurer sur ce dépôt les mêmes secrets de signature Android que ceux utilisés pour les APK précédents. Les clés privées GitHub Actions ne sont pas lisibles et n'ont pas été déplacées automatiquement. Le workflow Android échoue volontairement sans ces secrets ; **ne jamais générer une nouvelle clé**, car elle empêcherait la mise à jour par-dessus les installations actuelles.

Dans Settings → Secrets and variables → Actions, recopier **de façon sécurisée** les secrets de signature existants :

- `KEYSTORE` (ou `ANDROID_KEYSTORE_BASE64`)
- `KEYSTORE_PASSWORD` (ou `ANDROID_STORE_PASSWORD`)
- `KEY_ALIAS` (ou `ANDROID_KEY_ALIAS`)
- `KEY_PASSWORD` (ou `ANDROID_KEY_PASSWORD`)

Le workflow vérifie que le nouveau APK a le même certificat que l'ancienne version. Les variables publiques `LOVEROLL_FIREBASE_*` peuvent également être nécessaires pour les notifications. **Ne placer aucune clé privée dans le code, les commits ou les journaux.**

L'import du paquet signé 0.13.13 dans ce dépôt est tracé dans `.github/workflows/publish-migration-apk.yml`.

## Prompt maître & suivi des demandes LoveRoll

- [**Prompt maître officiel**](docs/LOVEROLL_MASTER_PROMPT.md) — exigences D100, minuteries, UX/UI et responsive mobile, tablette et PC.
- [**Tableau de suivi**](docs/LOVEROLL_SUIVI.md) — cases LR-xxx, état, PR et preuves de validation.
- [**Ajouter une nouvelle demande**](docs/LOVEROLL_NOUVELLES_DEMANDES.md) — modifier ce fichier directement sur GitHub.
- [**Ouvrir une Issue LoveRoll**](https://github.com/fredvolks/loveroll/issues/new/choose) — signaler un bug / idée avec capture d'écran.

**Important :** ces documents permettent de prioriser et suivre le travail, mais ne prétendent pas que les correctifs sont déjà déployés. Utiliser des PR distinctes pour les modifications techniques ; cocher « terminé » uniquement après tests.
