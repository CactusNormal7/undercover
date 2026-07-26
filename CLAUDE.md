# Undercover

Le jeu de société **Undercover**, sur deux supports : une **app iOS** (SwiftUI, pass-the-phone)
et une **version web en ligne** (`web/`, chacun sur son écran). Un jeu de déduction sociale où chaque
joueur reçoit un mot secret. La majorité (les "civils") partagent le même mot, un ou plusieurs
joueurs "undercover" ont un mot différent mais proche du mot des civils, et un joueur
"Mr. White" ne reçoit aucun mot. Les joueurs décrivent leur mot à tour de rôle, débattent, puis
votent pour éliminer celui qu'ils soupçonnent. Les civils gagnent en éliminant tous les
undercover/Mr. White, les undercover gagnent en survivant, Mr. White gagne s'il devine le mot
des civils une fois démasqué.

## Stack

- **iOS** : Swift 6 / SwiftUI, cible iOS 17+. Le `.xcodeproj` est **généré** par
  [XcodeGen](https://github.com/yonaskolb/XcodeGen) à partir de `project.yml` — il n'est jamais
  édité ni committé à la main.
- **Web** : monorepo pnpm sous `web/` — React + Vite côté client, Cloudflare Workers + Durable
  Objects côté serveur, TypeScript partout. Node 22+. Détails : `web/README.md`.

## Structure

```
project.yml                        spec XcodeGen (targets, bundle id, deployment target)
words/divers.csv                   paires de mots (mot1,mot2,theme) — dossier référencé
                                   par le target iOS **et** importé par l'API web
Undercover/
  App/UndercoverApp.swift          point d'entrée @main (injecte ProfileStore + WordStore)
  DesignSystem/
    Theme.swift                    DA noir & blanc : couleurs, espacements, typo
    ButtonStyles.swift             styles .uPrimary (plein) / .uSecondary (ghost)
  Support/String+Normalization.swift  comparaison sans accents/casse (devinette Mr. White)
  Views/
    ContentView.swift              écran d'accueil / menu
    GameSetupView.swift            configuration d'une partie (joueurs + rôles)
    PlayerSelectionView.swift      feuille de sélection des joueurs (recherche)
    RulesView.swift                règles du jeu
    SettingsView.swift             paramètres
    WordPairsView.swift            consultation des paires, groupées par thème
    ProfilesView.swift             liste des profils (stats, suppression)
    ProfileEditorView.swift        création / édition d'un profil (nom + photo)
    Game/                          déroulé d'une partie, une vue par phase
      GameContainerView.swift      hôte plein écran, bascule selon la phase
      WordRevealView.swift         révélation pass-the-phone
      DiscussionView.swift         ordre de parole
      VotingView.swift             désignation de l'éliminé
      RoundResultView.swift        rôle révélé
      MrWhiteGuessView.swift       dernière chance de Mr. White
      GameOverView.swift           vainqueurs + récapitulatif
    Components/
      AvatarView.swift             avatar circulaire (photo ou initiales)
      PlayerRow.swift              ligne de joueur réutilisable
  Models/
    Role.swift                     enum des rôles (civilian, undercover, mrWhite)
    Player.swift                   joueur (id = celui du Profile, rôle, mot, éliminé)
    Game.swift                     état d'une partie (données seules)
    GameRules.swift                **toutes les règles** : distribution, transitions, victoire
    GameSetup.swift                configuration avant distribution
    WordPair.swift                 paire de mots + thème
    Profile.swift                  profil persistant (nom, image, statistiques)
  Services/
    ProfileStore.swift             persistance des profils (JSON dans Documents)
    WordStore.swift                chargement des CSV embarqués
    GameSession.swift              partie en cours, observable par les vues
  Resources/Assets.xcassets        AppIcon, AccentColor
UndercoverTests/                   39 tests XCTest (distribution, victoire, Codable…)

web/                               monorepo pnpm de la version en ligne
  packages/
    rules/                         moteur — port TS de GameRules.swift + ses tests (38)
      src/rules.ts                 transitions, distribution, victoire (pures, pas `mutating`)
      src/redact.ts                **projection par joueur** : le seul état qui sort du serveur
      src/rng.ts                   SplitMix64 injecté, comme le SeededRNG des tests Swift
    protocol/                      messages WebSocket client ⇄ serveur
  apps/
    api/                           Cloudflare Worker
      src/index.ts                 façade HTTP : création, join, upgrade WebSocket
      src/GameRoom.ts              Durable Object — une partie, autorité, diffusion
      src/entitlements.ts          identité + droits (stub : jeton de dev)
      src/seat.ts                  jetons de siège signés (invités sans compte)
      src/words.ts                 catégories et gating, lit le CSV partagé
    web/                           SPA React + Vite (accueil, salon, déroulé)
```

## Workflow

**iOS**

- Après toute modification de `project.yml` ou ajout/suppression de fichiers source :
  `xcodegen generate` pour régénérer `Undercover.xcodeproj`.
- Build en CLI : `xcodebuild -scheme Undercover -destination 'generic/platform=iOS Simulator' build`
- Ouvrir dans Xcode : `open Undercover.xcodeproj` (après génération)

**Web** (depuis `web/`, Node 22+ — `nvm use`)

- `pnpm install`, puis `pnpm dev` (API sur `:8787`, front sur `:5173`)
- `pnpm test` (moteur), `pnpm typecheck`, `pnpm build`

## Conventions

- Ne jamais éditer `Undercover.xcodeproj` directement (fichier généré, ignoré par git) —
  toute évolution de la structure du projet passe par `project.yml`.
- Les nouveaux fichiers Swift vont dans le dossier correspondant sous `Undercover/`
  (`Views/` pour les vues, `Models/` pour les types de données, etc.).

## Architecture du jeu

- **Les règles vivent dans `Game`** (`GameRules.swift`) : méthodes `mutating` et factory `static`,
  sans aucune dépendance — ni store, ni SwiftUI, ni horloge. L'aléatoire n'entre que par un
  `inout RandomNumberGenerator` injecté, ce qui rend chaque règle testable et déterministe.
- `GameSession` n'est qu'une coquille `@Observable` par-dessus : elle relaie les intentions et
  porte les deux seuls effets de bord (tirer une paire, écrire les statistiques).
- **Ne pas déplacer de logique de jeu dans les vues ni dans `GameSession`** : c'est ce qui garde
  les tests rapides, et c'est la seule partie réutilisable ailleurs (cf. direction produit).

Deux subtilités à préserver :

- Un undercover **ne doit jamais apprendre son rôle** : son écran de révélation est identique à
  celui d'un civil. Celui de Mr. White garde la même silhouette (typo, sous-titre, bouton) pour
  ne pas être repérable de loin.
- L'élimination d'un Mr. White passe par sa devinette **avant** le test de victoire : une bonne
  réponse doit battre une victoire civile survenant au même instant.

Le moteur existe désormais **en double** : `GameRules.swift` et `web/packages/rules`. Ils doivent
rester le miroir l'un de l'autre, tests compris — toute évolution de règle se fait des deux côtés
dans le même mouvement, sinon les plateformes divergent en silence. Ce qui relève de la
coordination en ligne (dépouillement du vote, présence, droits de la table) vit dans le Durable
Object, **pas** dans le paquet de règles.

## État actuel

Le jeu est **jouable de bout en bout** : configuration (sélection des joueurs + répartition des
rôles), distribution des mots, révélation pass-the-phone, tours de parole, vote à main levée
(l'hôte désigne l'éliminé), devinette de Mr. White, détection de fin de partie. Autour : profils
avec statistiques, consultation des paires de mots, écran des règles. 39 tests couvrent la
distribution, les conditions de victoire et la rétrocompatibilité du décodage des profils.

Non fait : reprise après crash (`Game` n'est pas persisté), filtrage par thème (la couture existe
via `GameSession.init(theme:)`), et `GameSetup.maxPlayers` déclaré mais jamais appliqué. L'app iOS
ne parle encore à aucun backend : ni compte, ni abonnement, ni notion de catégorie payante.

Côté **web**, une partie se joue de bout en bout : création par l'hôte, invitation par lien ou
code, joueurs invités sans compte, révélation, discussion, vote dépouillé par le serveur, devinette
de Mr. White, fin de partie et rejeu. Le serveur est autorité et n'envoie à chacun que sa
projection. Ce qui est encore simulé — auth, entitlements, paiement, statistiques — est listé dans
`web/README.md` ; le découpage gratuit/payant des catégories y est provisoire.

## Direction produit (actée)

Le produit ne se limite plus à l'app iOS : il devient **abonnement + jeu en ligne**, les deux
liés. Ce qui suit est arbitré ; ce qui reste ouvert est signalé comme tel.

### Monétisation : abonnement, partagé entre iOS et web

- Le modèle est un **abonnement** (pas un achat unique). Il débloque **certaines catégories de
  mots** et des **règles plus poussées**. Le découpage exact (quelles catégories, quelles règles
  restent gratuites) n'est pas encore figé — mais l'axe, lui, l'est : catégories + règles.
- **Un abonnement vaut sur les deux plateformes.** C'était *la* décision structurante, elle est
  prise, et elle entraîne mécaniquement :
  - des **comptes** (il n'en existe aucun aujourd'hui : `Profile` est local, `Profile.id` est un
    UUID d'appareil) ;
  - les droits d'accès **côté serveur**, dans une table d'entitlements unique ;
  - **la fin du tout-local pour l'app iOS** : elle devra parler au backend. Les deux apps ne
    peuvent donc plus être « complètement déliées », contrairement à ce qui était envisagé.
- Encaissement : **StoreKit 2** côté iOS (abonnement auto-renouvelable — règle App Store 3.1.1 :
  un déblocage de contenu numérique dans l'app passe obligatoirement par l'achat in-app, commission
  15–30 %), **Stripe** côté web. Les deux écrivent dans la **même** table d'entitlements, via
  webhook Stripe d'un côté et App Store Server Notifications V2 de l'autre.
- Côté iOS, `WordStore` charge aujourd'hui indistinctement tous les CSV du bundle, sans notion de
  catégorie payante : c'est là que le gating devra s'insérer.

### Le modèle « un abonné suffit »

Pour jouer en ligne à plusieurs, **un seul joueur doit être abonné** : c'est lui l'**hôte**.

- L'hôte crée la partie ; ses droits déterminent les capacités de **toute la table** (catégories de
  mots disponibles, règles avancées activables).
- Les autres rejoignent par **lien ou code d'invitation**, et **sans compte** : un pseudo suffit.
  Pas d'inscription, pas de mur avant de pouvoir jouer.
- Conséquences directes sur l'API :
  - deux natures d'identité coexistent — **compte** (persistant, porteur de l'entitlement) et
    **invité** (éphémère, lié à une seule partie) ;
  - l'entitlement se vérifie **à la création de la partie**, sur l'hôte, et le résultat est figé
    dans la partie — un abonnement qui expire en cours de manche ne doit pas la casser ;
  - un invité ne peut pas devenir hôte ; si l'hôte se déconnecte, la partie doit pouvoir survivre
    à sa reconnexion (transfert d'hôte = question ouverte, cf. plus bas).

### Application web

Le même jeu, mais **en ligne** et sur **PC** : les joueurs ne partagent plus un téléphone, chacun
est sur son écran. C'est un changement de nature, pas un portage.

- En pass-the-phone, `Game` contient les mots de **tout le monde** dans une seule structure —
  sans risque quand un seul appareil fait office de table. En ligne, cette structure ne doit
  **jamais** parvenir à un client : le serveur est autorité et n'envoie à chacun que son mot.
  C'est la contrainte n°1 de l'architecture web (cf. `PlayerView` dans `web/`).
- `GameRules` est du Swift pur sans dépendances, donc réutilisable tel quel côté serveur *si* le
  serveur était en Swift. Il ne l'est pas : les règles sont **portées en TypeScript**, avec leurs
  tests (cf. `web/packages/rules`). Le risque à surveiller est la **divergence** entre les deux
  implémentations.

## Pile web (actée)

| Besoin | Choix |
| --- | --- |
| Frontend | React + Vite + TypeScript (SPA — c'est un jeu, pas un site de contenu ; Next.js seulement si des pages marketing/SEO s'y ajoutent) |
| Temps réel + autorité | **Durable Objects Cloudflare** : un objet = une partie. Alternative auto-hébergée si besoin : **Colyseus** |
| Base de données | Postgres (Supabase ou Neon) — comptes, profils, stats, entitlements |
| Authentification | Supabase Auth ou Clerk (non tranché) |
| Paiement | **Stripe** côté web, **StoreKit 2** côté iOS, écrivant dans la *même* table d'entitlements |

Justifications, pour ne pas les re-débattre plus tard :

- **Forme du problème** : beaucoup de petites parties isolées, chacune portant un état secret qui
  ne vit que quelques minutes. C'est précisément la forme d'un Durable Object : état en mémoire,
  WebSocket intégré, coût nul entre deux parties.
- **Pourquoi pas un serveur Swift** (Vapor/Hummingbird), qui permettrait pourtant de réutiliser
  `GameRules` tel quel : le moteur ne fait que ~250 lignes avec 39 tests qui *sont* sa
  spécification. Le porter en TypeScript coûte une demi-journée ; engager toute la pile web dans
  Swift pour l'éviter coûterait bien plus en écosystème, hébergement et intégration front.
- **Porter les tests avec les règles**, pas seulement les règles : ce sont eux qui tiennent les
  cas qu'une réimplémentation rate (devinette de Mr. White arbitrée avant la victoire civile,
  parité, coéquipiers éliminés qui gagnent quand même).
- Les règles vivent dans un **paquet TS partagé** serveur/client : le serveur reste autorité, le
  client peut afficher en optimiste sans dupliquer la logique une troisième fois.
- **Durable Objects sans PartyKit** : la recommandation initiale mentionnait PartyKit, mais son
  développement a rejoint Cloudflare et l'API WebSocket native des DO couvre le besoin sans
  couche intermédiaire. Une dépendance de moins sur le chemin critique.
- ⚠️ Si l'app iOS propose un login Google/Facebook, **Sign in with Apple devient obligatoire**
  (règle App Store). À intégrer au choix de l'auth, pas après.

### Questions encore ouvertes

- Découpage précis gratuit / payant : quelles catégories, quelles « règles poussées ».
- Fournisseur d'auth (Supabase Auth vs Clerk), et si l'app iOS bascule ses profils locaux vers des
  comptes ou les garde en parallèle.
- Transfert d'hôte si l'hôte abonné quitte la partie en cours.
- Les invités sans compte accumulent-ils des statistiques (et où) ?
