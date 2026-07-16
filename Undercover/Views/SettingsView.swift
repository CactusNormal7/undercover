import SwiftUI

struct SettingsView: View {
    @Environment(WordStore.self) private var words

    var body: some View {
        ZStack {
            Theme.Colors.background.ignoresSafeArea()

            List {
                NavigationLink {
                    WordPairsView()
                } label: {
                    HStack(spacing: Theme.Spacing.m) {
                        Image(systemName: "text.book.closed")
                            .font(.system(size: 18))
                            .foregroundStyle(Theme.Colors.foreground)
                            .frame(width: 28)

                        VStack(alignment: .leading, spacing: 2) {
                            Text("Paires de mots")
                                .font(.body.weight(.medium))
                                .foregroundStyle(Theme.Colors.foreground)

                            Text("\(words.pairs.count) paires · \(words.themes.count) thèmes")
                                .font(.caption)
                                .foregroundStyle(Theme.Colors.secondary)
                        }
                    }
                    .padding(.vertical, Theme.Spacing.xs)
                }
                .listRowBackground(Theme.Colors.background)
                .listRowSeparatorTint(Theme.Colors.separator)
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
        }
        .navigationTitle("Paramètres")
    }
}
