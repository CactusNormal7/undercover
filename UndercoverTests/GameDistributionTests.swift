import XCTest
@testable import Undercover

final class GameDistributionTests: XCTestCase {

    private let pair = WordPair(word1: "Chat", word2: "Chien", theme: "Animal")

    private func makeProfiles(_ count: Int) -> [Profile] {
        (0..<count).map { Profile(name: "J\($0)") }
    }

    private func makeSetup(_ profiles: [Profile], civilians: Int, undercovers: Int, mrWhites: Int) -> GameSetup {
        GameSetup(
            selectedProfileIDs: profiles.map(\.id),
            civilians: civilians,
            undercovers: undercovers,
            mrWhites: mrWhites
        )
    }

    func testRoleCountsMatchSetup() {
        let profiles = makeProfiles(6)
        let setup = makeSetup(profiles, civilians: 4, undercovers: 1, mrWhites: 1)
        var rng = SeededRNG(seed: 42)

        let game = Game.start(profiles: profiles, setup: setup, pair: pair, using: &rng)

        XCTAssertEqual(game.players.count, 6)
        XCTAssertEqual(game.players.filter { $0.role == .civilian }.count, 4)
        XCTAssertEqual(game.players.filter { $0.role == .undercover }.count, 1)
        XCTAssertEqual(game.players.filter { $0.role == .mrWhite }.count, 1)
    }

    func testWordsMatchRoles() {
        let profiles = makeProfiles(6)
        let setup = makeSetup(profiles, civilians: 4, undercovers: 1, mrWhites: 1)
        var rng = SeededRNG(seed: 7)

        let game = Game.start(profiles: profiles, setup: setup, pair: pair, using: &rng)

        for player in game.players {
            switch player.role {
            case .civilian: XCTAssertEqual(player.word, game.civilianWord)
            case .undercover: XCTAssertEqual(player.word, game.undercoverWord)
            case .mrWhite: XCTAssertNil(player.word)
            }
        }

        XCTAssertNotEqual(game.civilianWord, game.undercoverWord)
        XCTAssertEqual(Set([game.civilianWord, game.undercoverWord]), Set([pair.word1, pair.word2]))
        XCTAssertEqual(game.theme, "Animal")
    }

    /// Le côté attribué aux civils doit varier : sinon `word1` serait toujours
    /// le mot des civils, et l'undercover serait devinable par habitude.
    func testCivilianWordSideIsNotConstant() {
        let profiles = makeProfiles(5)
        let setup = makeSetup(profiles, civilians: 3, undercovers: 1, mrWhites: 1)

        var sides = Set<String>()
        for seed in UInt64(0)..<50 {
            var rng = SeededRNG(seed: seed)
            sides.insert(Game.start(profiles: profiles, setup: setup, pair: pair, using: &rng).civilianWord)
        }

        XCTAssertEqual(sides, Set([pair.word1, pair.word2]))
    }

    func testPlayersCarryProfileIdentity() {
        let profiles = [
            Profile(name: "Alice", imageData: Data([0x01])),
            Profile(name: "Bob"),
            Profile(name: "Chloé"),
            Profile(name: "Dan")
        ]
        let setup = makeSetup(profiles, civilians: 3, undercovers: 1, mrWhites: 0)
        var rng = SeededRNG(seed: 3)

        let game = Game.start(profiles: profiles, setup: setup, pair: pair, using: &rng)

        XCTAssertEqual(Set(game.players.map(\.id)), Set(profiles.map(\.id)))
        let alice = game.player(id: profiles[0].id)
        XCTAssertEqual(alice?.name, "Alice")
        XCTAssertEqual(alice?.imageData, Data([0x01]))
    }

    func testSameSeedProducesSameGame() {
        let profiles = makeProfiles(6)
        let setup = makeSetup(profiles, civilians: 4, undercovers: 1, mrWhites: 1)

        var rngA = SeededRNG(seed: 99)
        var rngB = SeededRNG(seed: 99)
        let a = Game.start(profiles: profiles, setup: setup, pair: pair, using: &rngA)
        let b = Game.start(profiles: profiles, setup: setup, pair: pair, using: &rngB)

        XCTAssertEqual(a.players.map(\.id), b.players.map(\.id))
        XCTAssertEqual(a.players.map(\.role), b.players.map(\.role))
        XCTAssertEqual(a.civilianWord, b.civilianWord)
        XCTAssertEqual(a.speakingOrder, b.speakingOrder)
    }

    func testDuplicateSelectionProducesNoDuplicatePlayers() {
        let profiles = makeProfiles(4)
        var setup = makeSetup(profiles, civilians: 3, undercovers: 1, mrWhites: 0)
        setup.selectedProfileIDs.append(profiles[0].id) // doublon volontaire
        var rng = SeededRNG(seed: 11)

        let game = Game.start(profiles: profiles, setup: setup, pair: pair, using: &rng)

        XCTAssertEqual(game.players.count, 4)
        XCTAssertEqual(Set(game.players.map(\.id)).count, 4)
    }

    /// Un setup déséquilibré ne doit jamais trapper — juste dégrader.
    func testUnbalancedSetupDoesNotTrap() {
        let profiles = makeProfiles(5)
        let tooFew = makeSetup(profiles, civilians: 1, undercovers: 1, mrWhites: 0)
        let tooMany = makeSetup(profiles, civilians: 40, undercovers: 3, mrWhites: 2)
        var rng = SeededRNG(seed: 5)

        XCTAssertEqual(Game.start(profiles: profiles, setup: tooFew, pair: pair, using: &rng).players.count, 5)
        XCTAssertEqual(Game.start(profiles: profiles, setup: tooMany, pair: pair, using: &rng).players.count, 5)
    }

    func testGameStartsInWordRevealAtRoundOne() {
        let profiles = makeProfiles(5)
        let setup = makeSetup(profiles, civilians: 3, undercovers: 1, mrWhites: 1)
        var rng = SeededRNG(seed: 1)

        let game = Game.start(profiles: profiles, setup: setup, pair: pair, using: &rng)

        XCTAssertEqual(game.phase, .wordReveal)
        XCTAssertEqual(game.currentRound, 1)
        XCTAssertEqual(game.revealIndex, 0)
        XCTAssertEqual(Set(game.revealOrder), Set(profiles.map(\.id)))
        XCTAssertNil(game.outcome)
    }
}
