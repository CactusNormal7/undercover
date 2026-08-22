# Undercover — web

Version en ligne du jeu : chacun sur son écran, une partie par lien d'invitation.
Monorepo pnpm, à la racine `web/` du dépôt de l'app iOS — le corpus de mots
(`words/*.csv`) et, à terme, la table d'entitlements sont communs aux deux.

## Structure

```
packages/
  rules/      moteur de jeu — port TypeScript de GameRules.swift + ses tests
  protocol/   messages WebSocket client ⇄ serveur (types partagés)
  db/         Prisma — comptes et entitlements, seule porte vers Postgres
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

Ça suffit pour jouer : sans clé Clerk ni base, tout le monde est invité, et
`localStorage.setItem('undercover.devToken', 'dev:moi:sub')` simule un hôte
abonné.

Autres commandes : `pnpm test` (moteur), `pnpm typecheck`, `pnpm build`.

### Avec comptes et abonnements

Copier les exemples, puis remplir :

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars       # CLERK_SECRET_KEY, DATABASE_URL
cp apps/web/.env.example apps/web/.env.local           # VITE_CLERK_PUBLISHABLE_KEY
cp packages/db/.env.example packages/db/.env           # DATABASE_URL (migrations)
pnpm --filter @undercover/db migrate                   # crée les tables
```

Vérifier que le Worker atteint bien la base :
`curl 'http://localhost:8787/api/health?deep=1'`

### Supabase : quelle URL de connexion

Contre-intuitif mais important — **ne pas utiliser la connexion « directe »**
(`db.<ref>.supabase.co:5432`) que la console met en avant : elle ne résout
qu'en **IPv6**, injoignable depuis un Worker Cloudflare comme depuis beaucoup de
postes. Passer par le pooler, qui est en IPv4 :

| Usage | Hôte | Port |
| --- | --- | --- |
| Migrations (`packages/db/.env`) | `aws-…pooler.supabase.com` | `5432` — mode **session** |
| Runtime (`apps/api/.dev.vars`) | le même | `6543` — mode **transaction** |

Le mode session est requis par les migrations (DDL, transactions longues) ; le
mode transaction tient les connexions courtes et nombreuses d'un Worker.

## Base de données

Prisma est là **pour ne pas s'attacher à un hébergeur**, pas pour le confort
d'écriture. Deux règles en découlent :

- le schéma reste du Postgres nu — pas d'extension, pas de type propriétaire,
  pas de RLS Supabase. Déménager = changer `DATABASE_URL`, rejouer les migrations ;
- le reste du code ne voit **jamais** Prisma : il passe par l'interface
  `UndercoverDb` (`packages/db/src/index.ts`). Changer d'ORM ne toucherait que ce
  fichier.

Le client est généré (`prisma generate`, joué au `postinstall`) dans
`packages/db/src/generated/`, ignoré par git.

La base n'est lue **qu'à la création d'une partie** : les droits sont ensuite
figés dedans. Ni le Durable Object ni les actions de jeu ne touchent Postgres.

## Authentification

Clerk, vérifié côté serveur par signature (`verifyToken`), sans appel réseau sur
le chemin critique. Un compte ne sert qu'à **porter l'abonnement** : rejoindre
une partie n'en demande aucun.

Comme un navigateur ne peut pas poser d'en-tête `Authorization` sur un
WebSocket, l'identité vérifiée au moment de prendre un siège est **scellée dans
le jeton de siège** (HMAC) plutôt que revérifiée à la connexion.

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
| Authentification | ✅ Clerk, côté serveur et côté front. Repli invité si la clé manque. |
| Base de données | ✅ Supabase (`eu-west-1`), migration appliquée : `accounts`, `entitlements`, `processed_webhook_events`. Connectivité vérifiée depuis le Worker. |
| Schéma des entitlements | ✅ Table unique `entitlements`, une ligne par compte quelle que soit la plateforme d'achat, plus l'idempotence des webhooks. |
| **Écriture** des entitlements | ❌ **Rien n'écrit dedans.** Personne ne peut devenir abonné autrement qu'en insérant la ligne à la main. C'est le prochain trou à boucher. |
| Paiement | ❌ Stripe côté web (webhook → `grantEntitlement`), StoreKit 2 + App Store Server Notifications V2 côté iOS. `claimWebhookEvent` est déjà là pour l'idempotence. |
| Statistiques | ❌ Non écrites en fin de partie (l'app iOS le fait en local). Le schéma ne les modélise pas encore — on ne sait pas si les invités sans compte en accumulent. |
| Règles avancées | ❌ `capabilities.advancedRules` est transporté mais n'ouvre aucune règle : leur contenu n'est pas arbitré. |
| Découpage gratuit/payant | ⚠️ `FREE_THEMES` dans `apps/api/src/words.ts` est **provisoire** (4 catégories sur 50). |
| Taille du bundle Worker | ⚠️ ~1,35 Mo gzip avec Prisma et Clerk. Sous la limite, mais à surveiller ; le scinder en deux Workers reste possible si ça se tend. |

## Points à ne pas casser

- Rien ne sort du serveur sans passer par `viewFor` (`packages/rules/src/redact.ts`).
  Les tests de `redact.test.ts` sérialisent la projection et vérifient que le mot
  des civils n'y apparaît pas pour un undercover.
- Le dépouillement du vote, la présence et les droits vivent dans le Durable
  Object, **pas** dans `@undercover/rules` : ce paquet doit rester le miroir
  exact du Swift, sans quoi les deux plateformes divergeront.
- Toute évolution de règle se fait **des deux côtés**, tests compris.
