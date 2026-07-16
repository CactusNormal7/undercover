import XCTest
@testable import Undercover

final class UndercoverTests: XCTestCase {
    func testPlayerInitialization() {
        let player = Player(name: "Alice", role: .civilian, word: "Plage")

        XCTAssertEqual(player.name, "Alice")
        XCTAssertEqual(player.role, .civilian)
        XCTAssertEqual(player.word, "Plage")
        XCTAssertFalse(player.isEliminated)
    }

    func testGameInitialization() {
        let game = Game(civilianWord: "Plage", undercoverWord: "Désert")

        XCTAssertEqual(game.phase, .setup)
        XCTAssertEqual(game.currentRound, 0)
        XCTAssertTrue(game.players.isEmpty)
    }
}
