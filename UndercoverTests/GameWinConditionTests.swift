import XCTest
@testable import Undercover

final class GameWinConditionTests: XCTestCase {

    /// Construit une partie déterministe avec des rôles imposés, pour piloter
    /// précisément les scénarios de fin.
    private func makeGame(roles: [Role], civilianWord: String = "Chat") -> Game {
        let players = roles.enumerated().map { index, role in
            Player(
                name: "J\(index)",
                role: role,
                word: role == .mrWhite ? nil : (role == .civilian ? civilianWord : "Chien")
            )
        }
        return Game(
            players: players,
            civilianWord: civilianWord,
            undercoverWord: "Chien",
            phase: .voting,
            currentRound: 1,
            speakingOrder: players.map(\.id)
        )
    }

    private func id(_ game: Game, role: Role, offset: Int = 0) -> UUID {
        game.players.filter { $0.role == role }[offset].id
    }

    /// Premier joueur **encore en vie** du rôle demandé : indispensable dès
    /// qu'un scénario enchaîne plusieurs éliminations du même camp.
    private func aliveID(_ game: Game, role: Role) -> UUID {
        game.alivePlayers.first { $0.role == role }!.id
    }

    private func advanceToVoting(_ game: inout Game, seed: UInt64 = 1) {
        var rng = SeededRNG(seed: seed)
        game.startNextRound(using: &rng)
        game.beginVoting()
    }

    // MARK: Conditions de victoire

    func testFreshGameHasNoOutcome() {
        let game = makeGame(roles: [.civilian, .civilian, .civilian, .civilian, .undercover, .mrWhite])
        XCTAssertNil(game.currentOutcome)
    }

    func testCiviliansWinWhenAllInfiltratorsAreOut() {
        var game = makeGame(roles: [.civilian, .civilian, .civilian, .undercover])

        game.eliminate(playerID: id(game, role: .undercover))

        XCTAssertEqual(game.phase, .gameOver)
        XCTAssertEqual(game.outcome, .civilians)
    }

    func testInfiltratorsWinOnParity() {
        // 3 civils + 2 undercovers : éliminer un civil amène 2 contre 2.
        var game = makeGame(roles: [.civilian, .civilian, .civilian, .undercover, .undercover])

        game.eliminate(playerID: id(game, role: .civilian))

        XCTAssertEqual(game.phase, .gameOver)
        XCTAssertEqual(game.outcome, .infiltrators)
    }

    func testEliminatingCivilianMidGameContinues() {
        var game = makeGame(roles: [.civilian, .civilian, .civilian, .civilian, .undercover])

        game.eliminate(playerID: id(game, role: .civilian))

        XCTAssertEqual(game.phase, .roundResult)
        XCTAssertNil(game.outcome)
        XCTAssertEqual(game.lastEliminated?.role, .civilian)
    }

    // MARK: Mr. White

    /// Point le plus délicat : Mr. White éliminé doit passer par la devinette,
    /// jamais directement par la fin de partie.
    func testEliminatingMrWhiteAlwaysGoesToGuessEvenIfLastInfiltrator() {
        var game = makeGame(roles: [.civilian, .civilian, .civilian, .mrWhite])

        game.eliminate(playerID: id(game, role: .mrWhite))

        XCTAssertEqual(game.phase, .mrWhiteGuess)
        XCTAssertNil(game.outcome)
        XCTAssertNotNil(game.pendingGuesserID)
    }

    func testCorrectGuessBeatsCivilianVictory() {
        var game = makeGame(roles: [.civilian, .civilian, .civilian, .mrWhite])
        let mrWhiteID = id(game, role: .mrWhite)
        game.eliminate(playerID: mrWhiteID)

        let correct = game.submitMrWhiteGuess("Chat")

        XCTAssertTrue(correct)
        XCTAssertEqual(game.phase, .gameOver)
        XCTAssertEqual(game.outcome, .mrWhiteGuessedWord(mrWhiteID))
        XCTAssertEqual(game.winnerIDs(for: game.outcome!), [mrWhiteID])
    }

    func testWrongGuessAsLastInfiltratorGivesCiviliansTheWin() {
        var game = makeGame(roles: [.civilian, .civilian, .civilian, .mrWhite])
        game.eliminate(playerID: id(game, role: .mrWhite))

        let correct = game.submitMrWhiteGuess("Éléphant")

        XCTAssertFalse(correct)
        XCTAssertEqual(game.phase, .gameOver)
        XCTAssertEqual(game.outcome, .civilians)
    }

    func testWrongGuessMidGameContinues() {
        var game = makeGame(roles: [.civilian, .civilian, .civilian, .civilian, .undercover, .mrWhite])
        game.eliminate(playerID: id(game, role: .mrWhite))

        game.submitMrWhiteGuess("Éléphant")

        XCTAssertEqual(game.phase, .roundResult)
        XCTAssertNil(game.outcome)
        XCTAssertEqual(game.lastGuessWasCorrect, false)
    }

    /// `GameSetup.mrWhites` est un Int : plusieurs Mr. White sont atteignables,
    /// chacun doit obtenir sa propre devinette.
    func testEachMrWhiteGetsTheirOwnGuess() {
        var game = makeGame(roles: [.civilian, .civilian, .civilian, .civilian, .mrWhite, .mrWhite])

        game.eliminate(playerID: id(game, role: .mrWhite, offset: 0))
        XCTAssertEqual(game.phase, .mrWhiteGuess)
        game.submitMrWhiteGuess("faux")
        XCTAssertEqual(game.phase, .roundResult)

        var rng = SeededRNG(seed: 1)
        game.startNextRound(using: &rng)
        game.beginVoting()

        game.eliminate(playerID: id(game, role: .mrWhite, offset: 1))
        XCTAssertEqual(game.phase, .mrWhiteGuess)
    }

    func testGuessIgnoresAccentsCaseAndWhitespace() {
        for guess in ["crème", "Crème", "creme", "CREME", "  crème  "] {
            var game = makeGame(roles: [.civilian, .civilian, .civilian, .mrWhite], civilianWord: "Crème")
            game.eliminate(playerID: id(game, role: .mrWhite))
            XCTAssertTrue(game.submitMrWhiteGuess(guess), "« \(guess) » devrait être accepté")
        }
    }

    func testNearMissIsRejected() {
        var game = makeGame(roles: [.civilian, .civilian, .civilian, .mrWhite], civilianWord: "Crème")
        game.eliminate(playerID: id(game, role: .mrWhite))
        XCTAssertFalse(game.submitMrWhiteGuess("crémier"))
    }

    // MARK: Gagnants

    func testWinnerIDsIncludeEliminatedTeammates() {
        var game = makeGame(roles: [.civilian, .civilian, .civilian, .undercover, .undercover])
        let firstUndercover = aliveID(game, role: .undercover)

        game.eliminate(playerID: firstUndercover)                  // 3 civils · 1 infiltré
        XCTAssertNil(game.outcome)

        advanceToVoting(&game)
        game.eliminate(playerID: aliveID(game, role: .civilian))   // 2 civils · 1 infiltré
        XCTAssertNil(game.outcome, "1 contre 2 : la partie continue")

        advanceToVoting(&game)
        game.eliminate(playerID: aliveID(game, role: .civilian))   // 1 · 1 → parité

        XCTAssertEqual(game.outcome, .infiltrators)
        let winners = game.winnerIDs(for: .infiltrators)
        XCTAssertEqual(winners.count, 2)
        XCTAssertTrue(winners.contains(firstUndercover), "l'undercover éliminé gagne aussi")
    }

    // MARK: Enchaînement des manches

    func testStartNextRoundAdvancesAndReshuffles() {
        var game = makeGame(roles: [.civilian, .civilian, .civilian, .civilian, .undercover])
        game.eliminate(playerID: id(game, role: .civilian))
        XCTAssertEqual(game.phase, .roundResult)

        var rng = SeededRNG(seed: 8)
        game.startNextRound(using: &rng)

        XCTAssertEqual(game.phase, .discussion)
        XCTAssertEqual(game.currentRound, 2)
        XCTAssertNil(game.lastEliminated)
        XCTAssertEqual(game.speakingOrder.count, 4, "seuls les vivants parlent")
    }

    func testTransitionsIgnoreWrongPhase() {
        var game = makeGame(roles: [.civilian, .civilian, .undercover])
        game.phase = .discussion

        game.eliminate(playerID: game.players[0].id)   // pas en phase de vote
        XCTAssertFalse(game.players[0].isEliminated)

        XCTAssertFalse(game.submitMrWhiteGuess("Chat")) // aucune devinette due
    }
}
