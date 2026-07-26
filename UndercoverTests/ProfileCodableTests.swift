import XCTest
@testable import Undercover

/// Garde-fou contre la perte de données : les profils enregistrés avant
/// l'arrivée des statistiques doivent continuer à se décoder. Sans ça,
/// `ProfileStore.load()` repart d'une liste vide et la sauvegarde suivante
/// écrase `profiles.json`.
final class ProfileCodableTests: XCTestCase {

    func testDecodesLegacyProfileWithoutStats() throws {
        let legacy = """
        [{"id":"E621E1F8-C36C-495A-93FC-0C247A3E6E5F","name":"Alice"}]
        """.data(using: .utf8)!

        let profiles = try JSONDecoder().decode([Profile].self, from: legacy)

        XCTAssertEqual(profiles.count, 1)
        XCTAssertEqual(profiles[0].name, "Alice")
        XCTAssertEqual(profiles[0].gamesPlayed, 0)
        XCTAssertEqual(profiles[0].gamesWon, 0)
    }

    func testDecodesMixedLegacyAndCurrentProfiles() throws {
        let mixed = """
        [
          {"id":"E621E1F8-C36C-495A-93FC-0C247A3E6E5F","name":"Legacy"},
          {"id":"F47AC10B-58CC-4372-A567-0E02B2C3D479","name":"Neuf","gamesPlayed":12,"gamesWon":7}
        ]
        """.data(using: .utf8)!

        let profiles = try JSONDecoder().decode([Profile].self, from: mixed)

        XCTAssertEqual(profiles.count, 2)
        XCTAssertEqual(profiles[0].gamesPlayed, 0)
        XCTAssertEqual(profiles[1].gamesPlayed, 12)
        XCTAssertEqual(profiles[1].gamesWon, 7)
    }

    func testRoundTripPreservesStatsAndImage() throws {
        let original = Profile(name: "Bob", imageData: Data([0xAB, 0xCD]), gamesPlayed: 5, gamesWon: 2)

        let decoded = try JSONDecoder().decode(Profile.self, from: JSONEncoder().encode(original))

        XCTAssertEqual(decoded.id, original.id)
        XCTAssertEqual(decoded.name, "Bob")
        XCTAssertEqual(decoded.imageData, Data([0xAB, 0xCD]))
        XCTAssertEqual(decoded.gamesPlayed, 5)
        XCTAssertEqual(decoded.gamesWon, 2)
    }

    func testNewProfileStartsWithZeroedStats() {
        let profile = Profile(name: "Neuf")
        XCTAssertEqual(profile.gamesPlayed, 0)
        XCTAssertEqual(profile.gamesWon, 0)
    }

    func testMissingRequiredKeyStillFails() {
        let broken = #"[{"name":"SansID"}]"#.data(using: .utf8)!
        XCTAssertThrowsError(try JSONDecoder().decode([Profile].self, from: broken))
    }
}
