# Undercover

App iOS (SwiftUI) du jeu de société **Undercover** : un jeu de déduction sociale où chaque
joueur reçoit un mot secret. La majorité (les "civils") partagent le même mot, un ou plusieurs
joueurs "undercover" ont un mot différent mais proche du mot des civils, et un joueur
"Mr. White" ne reçoit aucun mot. Les joueurs décrivent leur mot à tour de rôle, débattent, puis
votent pour éliminer celui qu'ils soupçonnent. Les civils gagnent en éliminant tous les
undercover/Mr. White, les undercover gagnent en survivant, Mr. White gagne s'il devine le mot
des civils une fois démasqué.

## Stack

- Swift 6 / SwiftUI, cible iOS 17+
- Le `.xcodeproj` est **généré** par [XcodeGen](https://github.com/yonaskolb/XcodeGen) à partir
  de `project.yml` — il n'est jamais édité ni committé à la main.

## Structure

```
project.yml                        spec XcodeGen (targets, bundle id, deployment target)
words/divers.csv                   paires de mots (mot1,mot2,theme) — dossier référencé
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
```

## Workflow

- Après toute modification de `project.yml` ou ajout/suppression de fichiers source :
  `xcodegen generate` pour régénérer `Undercover.xcodeproj`.
- Build en CLI : `xcodebuild -scheme Undercover -destination 'generic/platform=iOS Simulator' build`
- Ouvrir dans Xcode : `open Undercover.xcodeproj` (après génération)

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

## État actuel

Le jeu est **jouable de bout en bout** : configuration (sélection des joueurs + répartition des
rôles), distribution des mots, révélation pass-the-phone, tours de parole, vote à main levée
(l'hôte désigne l'éliminé), devinette de Mr. White, détection de fin de partie. Autour : profils
avec statistiques, consultation des paires de mots, écran des règles. 39 tests couvrent la
distribution, les conditions de victoire et la rétrocompatibilité du décodage des profils.

Non fait : reprise après crash (`Game` n'est pas persisté), filtrage par thème (la couture existe
via `GameSession.init(theme:)`), et `GameSetup.maxPlayers` déclaré mais jamais appliqué.

## Direction produit (à venir, non spécifié)

Deux axes sont actés dans leur principe, mais **rien n'est encore arbitré** :

### Monétisation

Un système de paiement débloquera l'ensemble des fonctionnalités. **Ce qui sera gratuit ou payant
n'est pas défini.** Points structurants à trancher avant de coder quoi que ce soit :

- Sur iOS, un déblocage de contenu numérique dans l'app doit passer par **StoreKit / achat
  in-app** (règle App Store 3.1.1) — pas de facturation externe. Commission Apple 15–30 %.
- Où vit le droit d'accès : purement local (simple) ou côté serveur (nécessaire dès qu'un achat
  doit valoir sur l'app web comme sur iOS).
- Axe de découpage le plus probable : **les packs de mots**. `WordStore` charge aujourd'hui
  indistinctement tous les CSV du bundle, sans notion de pack — c'est là que ça changerait.

### Application web

Le même jeu, mais **en ligne** : les joueurs ne partagent plus un téléphone. C'est un changement
de nature, pas un portage, et il introduit son propre lot de fonctionnalités. Elle pourra être
**complètement déliée** de cette app.

Conséquences à garder en tête :

- En pass-the-phone, `Game` contient les mots de **tout le monde** dans une seule structure —
  c'est sans risque quand un seul appareil fait office de table. En ligne, cette structure ne doit
  **jamais** parvenir à un client : le serveur devient autorité et n'envoie à chacun que son mot.
- `GameRules` est volontairement du Swift pur sans dépendances : réutilisable tel quel (paquet
  SwiftPM) si le serveur est en Swift. Sinon les règles seront réimplémentées, avec un risque réel
  de divergence entre plateformes.
- Il n'existe aujourd'hui **aucun compte** : les profils sont locaux, `Profile.id` est un UUID
  d'appareil. Le jeu en ligne comme un droit d'accès multiplateforme en exigent un.

#### Pile envisagée (recommandation, non actée)

| Besoin | Choix conseillé |
| --- | --- |
| Frontend | React + Vite + TypeScript (SPA — c'est un jeu, pas un site de contenu ; Next.js seulement si des pages marketing/SEO s'y ajoutent) |
| Temps réel + autorité | **Durable Objects Cloudflare** (via PartyKit) : un objet = une partie. Alternative auto-hébergée : **Colyseus** |
| Base de données | Postgres (Supabase ou Neon) — comptes, profils, stats, droits d'accès |
| Authentification | Supabase Auth ou Clerk |
| Paiement | **Stripe** côté web, **StoreKit 2** côté iOS, les deux écrivant dans la *même* table d'entitlements |

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
- Mettre les règles dans un **paquet TS partagé** serveur/client : le serveur reste autorité, le
  client peut afficher en optimiste sans dupliquer la logique une troisième fois.
- ⚠️ Si l'app iOS propose un login Google/Facebook, **Sign in with Apple devient obligatoire**
  (règle App Store). À intégrer au choix de l'auth, pas après.

#### La décision qui conditionne tout le reste

**Un achat vaut-il sur les deux plateformes ?**

- *Oui* → les deux apps ne peuvent pas être déliées : comptes partagés et entitlements côté
  serveur deviennent obligatoires, et l'app iOS doit parler à ce backend (fin du tout-local).
- *Non, achats par plateforme* → tout reste séparé, et l'app iOS peut continuer sans backend.

C'est le choix le plus structurant et le plus coûteux à défaire. Toute la pile en découle : ce
n'est pas une décision technique mais produit.
