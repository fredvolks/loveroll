# Dés à Deux — future sync Android ↔ iPhone (NOT deployed)

## Privacy-first product contract
- Android journal v0.7.0 is stored **locally**, encrypted using Android Keystore AES-256-GCM.
- No sensitive data is uploaded today. No DuckDNS endpoint or Supabase project is configured.
- The iPhone companion **does not yet exist**. Do not claim otherwise.
- Before enabling network sync, obtain clear opt-in from both Fred and Émilie separately.
- Create **two separately authenticated identities** (each person owns only their feedback), and a couple-scoped shared event record.
- Sharing a common account or just tapping a name in the UI is **not** independent authentication.
- Store the shared intimacy events as data requiring bilateral consent; per-person feedback remains the author's own record. Design optional per-answer visibility controls rather than assuming mutual access.
- Never send events, orgasm fields, notes, or ratings to analytics, crash logging, push payloads, or untrusted third-party plugins.
- Avoid linking identities through a public invitation code that can be guessed; use expiring one-time invitations.
- Support deletion, account revocation, and encrypted export/recovery **before** switching on cloud sync.
- Be explicit about loss of keystore keys after uninstall; add an encrypted backup and recoverable passphrase if introducing cloud migration.

## Recommended implementation
1. Build an HTTPS iPhone-compatible responsive PWA that uses the same questionnaire/calendar UI.
2. Use Supabase Auth for separate identities and scoped Postgres tables with RLS and least privilege. Do not embed the service-role key in the browser or app. Test allow/deny cases per user.
3. Encrypt intimate content client-side before uploads (a shared couple key established after both users consent); store minimal necessary metadata. The backend can enforce access to ciphertext, but cannot claim E2EE if the service receives keys or plaintext.
4. Each device writes its own survey keyed by session UUID and the authenticated author ID; server must prevent one partner from editing the other's answers.
5. Sync using version numbers and explicit conflict resolution; don't silently overwrite a completed answer.
6. Provide privacy controls and a readable offline state when network sync is down.
7. Once the full threat model and authenticated PWA are tested, optionally configure a domain.

## DuckDNS option
DuckDNS offers dynamic DNS (a name-to-changing-IP service), **not** hosting, database encryption, or authenticated access. To self-host, one additionally needs an isolated server (not the existing Home Assistant service), HTTPS certificate/automatic renewal, hardened firewall, backups, monitoring, and secure access control. Never expose the household Home Assistant web UI or the private journal database directly to the internet.

Supabase + a separately hosted HTTPS PWA avoids opening residential router ports. Neither option is configured or live in v0.7.0.
