import Foundation

/// Configuration d'une partie avant la distribution des rôles.
/// Les joueurs sont sélectionnés parmi les profils existants ; la répartition des
/// rôles part d'une proposition par défaut puis reste librement ajustable.
struct GameSetup: Equatable {
    var selectedProfileIDs: [UUID] = []
    var civilians: Int = 0
    var undercovers: Int = 0
    var mrWhites: Int = 0

    var playerCount: Int { selectedProfileIDs.count }
    var totalRoles: Int { civilians + undercovers + mrWhites }
    var isBalanced: Bool { totalRoles == playerCount && playerCount >= GameSetup.minPlayers }

    static let minPlayers = 3
    static let maxPlayers = 20

    /// Répartition par défaut : au moins un undercover, Mr. White à partir de 5 joueurs,
    /// le reste en civils. Ex. 6 joueurs → 4 civils · 1 undercover · 1 Mr. White.
    static func defaultSplit(for playerCount: Int) -> (civilians: Int, undercovers: Int, mrWhites: Int) {
        guard playerCount >= minPlayers else { return (max(0, playerCount), 0, 0) }
        let undercovers = max(1, playerCount / 4)
        let mrWhites = playerCount >= 5 ? 1 : 0
        let civilians = max(0, playerCount - undercovers - mrWhites)
        return (civilians, undercovers, mrWhites)
    }

    /// Recalcule la répartition par défaut à partir du nombre de joueurs actuel.
    mutating func resetRolesToDefault() {
        let split = Self.defaultSplit(for: playerCount)
        civilians = split.civilians
        undercovers = split.undercovers
        mrWhites = split.mrWhites
    }
}
