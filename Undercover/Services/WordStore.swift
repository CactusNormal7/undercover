import Foundation
import Observation

/// Charge les paires de mots depuis les CSV embarqués (dossier `words` du bundle).
/// Format attendu, une paire par ligne, en-tête inclus : `mot1,mot2,theme`.
@Observable
final class WordStore {
    private(set) var pairs: [WordPair] = []

    init() {
        load()
    }

    /// Thèmes présents, triés alphabétiquement.
    var themes: [String] {
        Set(pairs.map(\.theme)).sorted()
    }

    func pairs(inTheme theme: String) -> [WordPair] {
        pairs.filter { $0.theme == theme }
    }

    // MARK: Chargement

    private func load() {
        let urls = Bundle.main.urls(forResourcesWithExtension: "csv", subdirectory: "words") ?? []
        pairs = urls
            .sorted { $0.lastPathComponent < $1.lastPathComponent }
            .flatMap(Self.parse(url:))
    }

    private static func parse(url: URL) -> [WordPair] {
        guard let content = try? String(contentsOf: url, encoding: .utf8) else { return [] }

        return content
            .split(whereSeparator: \.isNewline)
            .dropFirst() // en-tête
            .compactMap { line in
                let fields = line
                    .split(separator: ",", omittingEmptySubsequences: false)
                    .map { $0.trimmingCharacters(in: .whitespaces) }

                guard fields.count == 3, !fields.contains(where: \.isEmpty) else { return nil }
                return WordPair(word1: fields[0], word2: fields[1], theme: fields[2])
            }
    }
}
