import XCTest
@testable import Undercover

final class SpeakingOrderTests: XCTestCase {

    private func players(_ roles: [Role], eliminated: Set<Int> = []) -> [Player] {
        roles.enumerated().map { index, role in
            Player(name: "J\(index)", role: role, isEliminated: eliminated.contains(index))
        }
    }

    func testOrderIsExactlyThePermutationOfAlivePlayers() {
        let roster = players([.civilian, .civilian, .undercover, .mrWhite], eliminated: [1])
        var rng = SeededRNG(seed: 4)

        let order = Game.makeSpeakingOrder(among: roster, using: &rng)

        let aliveIDs = Set(roster.filter { !$0.isEliminated }.map(\.id))
        XCTAssertEqual(order.count, 3)
        XCTAssertEqual(Set(order), aliveIDs)
        XCTAssertEqual(Set(order).count, order.count, "aucun doublon")
    }

    /// Mr. White n'a aucun mot : le faire ouvrir le tour serait intenable.
    func testMrWhiteNeverSpeaksFirst() {
        let roster = players([.civilian, .civilian, .undercover, .mrWhite])

        for seed in UInt64(0)..<200 {
            var rng = SeededRNG(seed: seed)
            let order = Game.makeSpeakingOrder(among: roster, using: &rng)
            let first = roster.first { $0.id == order[0] }
            XCTAssertNotEqual(first?.role, .mrWhite, "graine \(seed) fait parler Mr. White en premier")
        }
    }

    func testOnlyMrWhitesAliveDoesNotHang() {
        let roster = players([.mrWhite, .mrWhite])
        var rng = SeededRNG(seed: 1)

        let order = Game.makeSpeakingOrder(among: roster, using: &rng)

        XCTAssertEqual(order.count, 2)
    }

    func testNoAlivePlayersGivesEmptyOrder() {
        let roster = players([.civilian, .undercover], eliminated: [0, 1])
        var rng = SeededRNG(seed: 1)

        XCTAssertTrue(Game.makeSpeakingOrder(among: roster, using: &rng).isEmpty)
    }

    func testOrderActuallyVariesAcrossSeeds() {
        let roster = players([.civilian, .civilian, .civilian, .undercover])

        var seen = Set<[UUID]>()
        for seed in UInt64(0)..<50 {
            var rng = SeededRNG(seed: seed)
            seen.insert(Game.makeSpeakingOrder(among: roster, using: &rng))
        }

        XCTAssertGreaterThan(seen.count, 1, "l'ordre doit être rebattu")
    }
}
