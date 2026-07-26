import Foundation
import Observation

/// Partie en cours, observable par les vues.
///
/// Toutes les règles vivent dans `Game` (pur, testable) ; cette classe se
/// contente de relayer les intentions et de porter les deux seuls effets de
/// bord du jeu : tirer une paire de mots au départ, et écrire les statistiques
/// à l'arrivée.
@Observable
final class GameSession: Identifiable {

    private(set) var game: Game
    var id: UUID { game.id }

    private let profileStore: ProfileStore
    private let wordStore: WordStore
    /// Profils retenus, conservés pour pouvoir relancer une partie identique.
    private let roster: [Profile]
    private let setup: GameSetup
    private let theme: String?

    /// Les statistiques ne doivent être écrites qu'une fois : SwiftUI peut
    /// réinvoquer le chemin d'une action, et un double comptage est irrattrapable.
    private var statsRecorded = false

    init?(
        setup: GameSetup,
        profileStore: ProfileStore,
        wordStore: WordStore,
        theme: String? = nil
    ) {
        let pool = GameSession.pairs(from: wordStore, theme: theme)
        guard let pair = pool.randomElement() else { return nil }

        var seen = Set<UUID>()
        let roster = setup.selectedProfileIDs.compactMap { id -> Profile? in
            guard seen.insert(id).inserted else { return nil }
            return profileStore.profiles.first { $0.id == id }
        }
        guard roster.count >= GameSetup.minPlayers else { return nil }

        self.profileStore = profileStore
        self.wordStore = wordStore
        self.roster = roster
        self.setup = setup
        self.theme = theme
        self.game = Game.start(profiles: roster, setup: setup, pair: pair)
    }

    // MARK: Intentions

    func advanceReveal() {
        game.advanceReveal()
    }

    func beginVoting() {
        game.beginVoting()
    }

    func eliminate(_ playerID: UUID) {
        game.eliminate(playerID: playerID)
        recordStatsIfFinished()
    }

    @discardableResult
    func submitMrWhiteGuess(_ text: String) -> Bool {
        let correct = game.submitMrWhiteGuess(text)
        recordStatsIfFinished()
        return correct
    }

    func startNextRound() {
        game.startNextRound()
    }

    /// Relance une partie avec les mêmes joueurs : nouvelle paire, rôles rebattus.
    func replay() {
        guard let pair = GameSession.pairs(from: wordStore, theme: theme).randomElement() else { return }
        game = Game.start(profiles: roster, setup: setup, pair: pair)
        statsRecorded = false
    }

    /// Abandon en cours de partie : aucune statistique n'est enregistrée.
    func abandon() {
        statsRecorded = true
    }

    // MARK: Statistiques

    private func recordStatsIfFinished() {
        guard !statsRecorded, game.phase == .gameOver, let outcome = game.outcome else { return }
        statsRecorded = true
        profileStore.recordGameResult(
            participantIDs: game.players.map(\.id),
            winnerIDs: game.winnerIDs(for: outcome)
        )
    }

    private static func pairs(from wordStore: WordStore, theme: String?) -> [WordPair] {
        guard let theme else { return wordStore.pairs }
        let filtered = wordStore.pairs(inTheme: theme)
        return filtered.isEmpty ? wordStore.pairs : filtered
    }
}
