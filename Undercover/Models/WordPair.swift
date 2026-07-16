import Foundation

/// Paire de mots proches utilisée pour une manche : l'un des deux va aux civils,
/// l'autre à l'undercover (l'attribution se fera à la distribution).
struct WordPair: Identifiable, Hashable {
    let id = UUID()
    let word1: String
    let word2: String
    let theme: String
}
