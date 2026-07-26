import Foundation

struct Game {
    enum Phase: Equatable {
        case setup
        case wordReveal
        case discussion
        case voting
        case roundResult
        case mrWhiteGuess
        case gameOver
    }

    /// Issue d'une partie terminée.
    enum Outcome: Equatable {
        /// Tous les undercovers et Mr. White ont été éliminés.
        case civilians
        /// Les infiltrés ont atteint la parité avec les civils.
        case infiltrators
        /// Un Mr. White démasqué a deviné le mot des civils : il gagne seul.
        case mrWhiteGuessedWord(UUID)
    }

    let id: UUID
    var players: [Player]
    var civilianWord: String
    var undercoverWord: String
    /// Thème de la paire tirée, affiché dans le récapitulatif final.
    var theme: String
    var phase: Phase
    var currentRound: Int

    /// Ordre de passage de la révélation pass-the-phone, et curseur associé.
    /// Volontairement l'ordre de sélection et non un tirage : les rôles sont
    /// déjà mélangés, l'ordre ne révèle donc rien, et il colle à la table.
    var revealOrder: [UUID]
    var revealIndex: Int

    /// Ordre de parole de la manche en cours, retiré à chaque nouvelle manche.
    var speakingOrder: [UUID]

    /// Dernier joueur éliminé, montré à l'écran de résultat de manche.
    var lastEliminated: Player?

    /// Mr. White démasqué à qui l'on doit encore une devinette.
    var pendingGuesserID: UUID?
    var lastGuessWasCorrect: Bool?

    /// Non nil si et seulement si `phase == .gameOver`.
    var outcome: Outcome?

    init(
        id: UUID = UUID(),
        players: [Player] = [],
        civilianWord: String = "",
        undercoverWord: String = "",
        theme: String = "",
        phase: Phase = .setup,
        currentRound: Int = 0,
        revealOrder: [UUID] = [],
        revealIndex: Int = 0,
        speakingOrder: [UUID] = [],
        lastEliminated: Player? = nil,
        pendingGuesserID: UUID? = nil,
        lastGuessWasCorrect: Bool? = nil,
        outcome: Outcome? = nil
    ) {
        self.id = id
        self.players = players
        self.civilianWord = civilianWord
        self.undercoverWord = undercoverWord
        self.theme = theme
        self.phase = phase
        self.currentRound = currentRound
        self.revealOrder = revealOrder
        self.revealIndex = revealIndex
        self.speakingOrder = speakingOrder
        self.lastEliminated = lastEliminated
        self.pendingGuesserID = pendingGuesserID
        self.lastGuessWasCorrect = lastGuessWasCorrect
        self.outcome = outcome
    }
}
