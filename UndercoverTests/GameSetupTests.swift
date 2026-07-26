import XCTest
@testable import Undercover

final class GameSetupTests: XCTestCase {

    func testDefaultSplitIsAlwaysConsistent() {
        for count in GameSetup.minPlayers...GameSetup.maxPlayers {
            let split = GameSetup.defaultSplit(for: count)

            XCTAssertEqual(split.civilians + split.undercovers + split.mrWhites, count,
                           "la somme doit couvrir les \(count) joueurs")
            XCTAssertGreaterThanOrEqual(split.civilians, 0)
            XCTAssertGreaterThanOrEqual(split.undercovers, 1, "il faut toujours au moins un undercover")
            XCTAssertGreaterThanOrEqual(split.mrWhites, 0)
            XCTAssertGreaterThan(split.civilians, 0, "une partie sans civil n'a pas de sens")
        }
    }

    func testDefaultSplitProducesBalancedSetup() {
        for count in GameSetup.minPlayers...GameSetup.maxPlayers {
            var setup = GameSetup(selectedProfileIDs: (0..<count).map { _ in UUID() })
            setup.resetRolesToDefault()

            XCTAssertTrue(setup.isBalanced, "\(count) joueurs devrait donner une répartition valide")
        }
    }

    func testMrWhiteAppearsFromFivePlayers() {
        XCTAssertEqual(GameSetup.defaultSplit(for: 4).mrWhites, 0)
        XCTAssertEqual(GameSetup.defaultSplit(for: 5).mrWhites, 1)
    }

    func testResetRestoresBalanceAfterManualEdit() {
        var setup = GameSetup(selectedProfileIDs: (0..<6).map { _ in UUID() })
        setup.civilians = 99
        setup.undercovers = 0
        setup.mrWhites = 0
        XCTAssertFalse(setup.isBalanced)

        setup.resetRolesToDefault()

        XCTAssertTrue(setup.isBalanced)
        XCTAssertEqual(setup.totalRoles, 6)
    }

    func testBelowMinimumIsNeverBalanced() {
        for count in 0..<GameSetup.minPlayers {
            var setup = GameSetup(selectedProfileIDs: (0..<count).map { _ in UUID() })
            setup.resetRolesToDefault()
            XCTAssertFalse(setup.isBalanced, "\(count) joueurs ne suffit pas pour jouer")
        }
    }
}
