import Foundation

/// Joueur d'une partie en cours. `id` reprend l'identifiant du `Profile`
/// correspondant, pour pouvoir recréditer les statistiques en fin de partie.
struct Player: Identifiable {
    let id: UUID
    var name: String
    var role: Role
    var word: String?
    var isEliminated: Bool
    /// Photo recopiée du profil au lancement : évite d'aller interroger
    /// `ProfileStore` à chaque ligne affichée, et survit à la suppression
    /// d'un profil en cours de partie.
    var imageData: Data?

    init(
        id: UUID = UUID(),
        name: String,
        role: Role,
        word: String? = nil,
        isEliminated: Bool = false,
        imageData: Data? = nil
    ) {
        self.id = id
        self.name = name
        self.role = role
        self.word = word
        self.isEliminated = isEliminated
        self.imageData = imageData
    }
}
