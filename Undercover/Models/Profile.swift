import Foundation

/// Profil d'un joueur réutilisable d'une partie à l'autre.
/// Pour l'instant on persiste le nom et l'image ; les statistiques viendront plus tard.
struct Profile: Identifiable, Codable, Hashable {
    let id: UUID
    var name: String
    var imageData: Data?

    init(id: UUID = UUID(), name: String, imageData: Data? = nil) {
        self.id = id
        self.name = name
        self.imageData = imageData
    }
}
