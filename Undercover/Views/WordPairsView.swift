import SwiftUI

struct WordPairsView: View {
    @Environment(WordStore.self) private var words
    @State private var query = ""

    var body: some View {
        ZStack {
            Theme.Colors.background.ignoresSafeArea()

            List {
                ForEach(filteredThemes, id: \.self) { theme in
                    Section {
                        ForEach(pairs(inTheme: theme)) { pair in
                            row(for: pair)
                        }
                    } header: {
                        Text(theme.uppercased())
                            .font(.caption.weight(.semibold))
                            .tracking(1)
                            .foregroundStyle(Theme.Colors.secondary)
                    }
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .overlay {
                if filteredPairs.isEmpty {
                    ContentUnavailableView.search(text: query)
                }
            }
        }
        .navigationTitle("Paires de mots")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $query, prompt: "Rechercher un mot ou un thème")
    }

    private func row(for pair: WordPair) -> some View {
        HStack(spacing: Theme.Spacing.m) {
            Text(pair.word1)
                .font(.body.weight(.medium))
                .foregroundStyle(Theme.Colors.foreground)

            Spacer(minLength: Theme.Spacing.s)

            Text(pair.word2)
                .font(.body)
                .foregroundStyle(Theme.Colors.secondary)
        }
        .padding(.vertical, 2)
        .listRowBackground(Theme.Colors.background)
        .listRowSeparatorTint(Theme.Colors.separator)
    }

    // MARK: Filtrage

    private var filteredPairs: [WordPair] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return words.pairs }

        return words.pairs.filter {
            $0.word1.localizedCaseInsensitiveContains(q)
                || $0.word2.localizedCaseInsensitiveContains(q)
                || $0.theme.localizedCaseInsensitiveContains(q)
        }
    }

    private var filteredThemes: [String] {
        Set(filteredPairs.map(\.theme)).sorted()
    }

    private func pairs(inTheme theme: String) -> [WordPair] {
        filteredPairs.filter { $0.theme == theme }
    }
}
