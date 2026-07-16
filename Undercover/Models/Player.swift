import Foundation

struct Player: Identifiable {
    let id: UUID
    var name: String
    var role: Role
    var word: String?
    var isEliminated: Bool

    init(
        id: UUID = UUID(),
        name: String,
        role: Role,
        word: String? = nil,
        isEliminated: Bool = false
    ) {
        self.id = id
        self.name = name
        self.role = role
        self.word = word
        self.isEliminated = isEliminated
    }
}
