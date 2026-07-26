import Foundation

extension String {
    /// Forme comparable d'un mot pour la devinette de Mr. White.
    ///
    /// Le corpus étant français, « crème », « Creme » et « creme » doivent
    /// compter comme une même réponse : sans ça, l'unique chance de Mr. White
    /// paraîtrait cassée pour une histoire d'accent.
    var normalizedForGuess: String {
        folding(
            options: [.diacriticInsensitive, .caseInsensitive, .widthInsensitive],
            locale: Locale(identifier: "fr_FR")
        )
        .trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
