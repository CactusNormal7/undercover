import Foundation

/// Profil d'un joueur réutilisable d'une partie à l'autre.
struct Profile: Identifiable, Codable, Hashable {
    let id: UUID
    var name: String
    var imageData: Data?
    var gamesPlayed: Int
    var gamesWon: Int

    init(
        id: UUID = UUID(),
        name: String,
        imageData: Data? = nil,
        gamesPlayed: Int = 0,
        gamesWon: Int = 0
    ) {
        self.id = id
        self.name = name
        self.imageData = imageData
        self.gamesPlayed = gamesPlayed
        self.gamesWon = gamesWon
    }
}

extension Profile {
    enum CodingKeys: String, CodingKey {
        case id, name, imageData, gamesPlayed, gamesWon
    }

    /// Décodage tolérant aux profils enregistrés **avant** l'arrivée des
    /// statistiques : leur JSON n'a ni `gamesPlayed` ni `gamesWon`.
    ///
    /// Le décodeur synthétisé ignore les valeurs par défaut et lèverait
    /// `keyNotFound` sur chacun de ces fichiers. Or `ProfileStore.load()`
    /// avale l'erreur avec `try?` et repart d'une liste vide — la première
    /// sauvegarde suivante écraserait alors `profiles.json` avec `[]`.
    /// Autrement dit : sans cet init, tous les profils déjà créés sont perdus.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        imageData = try container.decodeIfPresent(Data.self, forKey: .imageData)
        gamesPlayed = try container.decodeIfPresent(Int.self, forKey: .gamesPlayed) ?? 0
        gamesWon = try container.decodeIfPresent(Int.self, forKey: .gamesWon) ?? 0
    }
}
