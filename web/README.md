# Undercover — web

Version en ligne du jeu : chacun sur son écran, une partie par lien d'invitation.
Monorepo pnpm, à la racine `web/` du dépôt de l'app iOS — le corpus de mots
(`words/*.csv`) et, à terme, la table d'entitlements sont communs aux deux.

## Structure

```
packages/
  rules/      moteur de jeu — port TypeScript de GameRules.swift + ses tests
  protocol/   messages WebSocket client ⇄ serveur (types partagés)
apps/
  api/        Cloudflare Worker + Durable Objects : une partie = un objet
  web/        SPA React + Vite
```

## Démarrer

Node **22+** requis (wrangler). `nvm use` prend la version du `.nvmrc`.

```bash
pnpm install
pnpm dev          # API sur :8787 et front sur :5173
```

Autres commandes : `pnpm test` (moteur), `pnpm typecheck`, `pnpm build`.

Le front lit `VITE_API_URL` (défaut `http://localhost:8787`).

## Ce qui est en place

- **Le moteur**, porté du Swift avec ses tests : distribution des rôles, ordre de
  parole, conditions de victoire, devinette de Mr. White arbitrée avant la
  victoire civile. 38 tests, dont 6 propres à la version en ligne.
- **Le serveur est autorité** : le Durable Object détient le seul `Game` complet
  et n'envoie à chaque joueur que `viewFor(game, seatId)` — son mot, jamais son
  rôle, jamais celui des autres tant qu'ils sont en vie. C'est la différence de
  fond avec le pass-the-phone, où un seul appareil pouvait tout savoir.
- **Sièges signés (HMAC)** : un invité n'a pas de compte, son jeton de siège est
  ce qui le reconnaît à la reconnexion — et empêche un tiers de se brancher sur
  sa place pour lire son mot.
- **Modèle « un abonné suffit »** : les droits sont ceux de l'hôte, figés à la
  création de la partie, et valent pour toute la table. Rejoindre ne demande ni
  compte ni paiement.
- Parcours complet : salon → révélation → discussion → vote → résultat de manche
  → devinette → fin de partie → rejouer.

## Ce qui est simulé et reste à brancher

| Sujet | État |
| --- | --- |
| Authentification | `resolveIdentity` accepte un jeton de dev `dev:<accountId>:<sub\|free>`. À remplacer par Supabase Auth ou Clerk (non tranché). |
| Entitlements | Déduits du jeton de dev. À lire dans Postgres, table unique alimentée par le webhook Stripe et les App Store Server Notifications V2. |
| Paiement | Rien. Stripe côté web, StoreKit 2 côté iOS. |
| Statistiques | Non écrites en fin de partie (l'app iOS le fait en local). Nécessite la base. |
| Règles avancées | `capabilities.advancedRules` est transporté mais n'ouvre encore aucune règle : leur contenu n'est pas arbitré. |
| Découpage gratuit/payant | `FREE_THEMES` dans `apps/api/src/words.ts` est **provisoire**. |

Essayer le cas abonné en local : `localStorage.setItem('undercover.devToken', 'dev:moi:sub')`
avant de créer une partie.

## Points à ne pas casser

- Rien ne sort du serveur sans passer par `viewFor` (`packages/rules/src/redact.ts`).
  Les tests de `redact.test.ts` sérialisent la projection et vérifient que le mot
  des civils n'y apparaît pas pour un undercover.
- Le dépouillement du vote, la présence et les droits vivent dans le Durable
  Object, **pas** dans `@undercover/rules` : ce paquet doit rester le miroir
  exact du Swift, sans quoi les deux plateformes divergeront.
- Toute évolution de règle se fait **des deux côtés**, tests compris.
