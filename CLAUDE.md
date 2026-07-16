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
Undercover/
  App/UndercoverApp.swift          point d'entrée @main
  Views/ContentView.swift          écran d'accueil
  Models/
    Role.swift                     enum des rôles (civilian, undercover, mrWhite)
    Player.swift                   joueur (nom, rôle, mot, éliminé ou non)
    Game.swift                     partie (joueurs, mots, phase en cours, round)
  Resources/Assets.xcassets        AppIcon, AccentColor
UndercoverTests/
  UndercoverTests.swift            tests unitaires XCTest
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

## État actuel

Squelette du projet posé : app SwiftUI buildable, écran d'accueil placeholder, et modèles de
données de base (`Player`, `Role`, `Game`) sans logique de jeu. À venir : déroulé complet d'une
partie (distribution des mots, phases de description/vote, détection de fin de partie).
