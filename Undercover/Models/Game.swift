import Foundation

struct Game {
    enum Phase: Equatable {
        case setup
        case wordReveal
        case discussion
        case voting
        case roundResult
        case gameOver
    }

    let id: UUID
    var players: [Player]
    var civilianWord: String
    var undercoverWord: String
    var phase: Phase
    var currentRound: Int

    init(
        id: UUID = UUID(),
        players: [Player] = [],
        civilianWord: String = "",
        undercoverWord: String = "",
        phase: Phase = .setup,
        currentRound: Int = 0
    ) {
        self.id = id
        self.players = players
        self.civilianWord = civilianWord
        self.undercoverWord = undercoverWord
        self.phase = phase
        self.currentRound = currentRound
    }
}
