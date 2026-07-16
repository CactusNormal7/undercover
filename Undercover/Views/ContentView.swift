import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.Colors.background
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    Spacer()

                    // Marque
                    VStack(spacing: Theme.Spacing.s) {
                        Text("UNDERCOVER")
                            .font(Theme.Typography.title())
                            .tracking(2)
                            .foregroundStyle(Theme.Colors.foreground)

                        Text("Qui se cache parmi vous ?")
                            .font(.subheadline)
                            .foregroundStyle(Theme.Colors.secondary)
                    }

                    Spacer()

                    // Actions
                    VStack(spacing: Theme.Spacing.m) {
                        Button("Nouvelle partie") {
                            // À venir : lancement d'une partie
                        }
                        .buttonStyle(.uPrimary)

                        Button("Règles du jeu") {
                            // À venir : écran des règles
                        }
                        .buttonStyle(.uSecondary)
                    }
                }
                .padding(.horizontal, Theme.Spacing.l)
                .padding(.bottom, Theme.Spacing.xl)
            }
        }
    }
}

#Preview {
    ContentView()
}

#Preview("Sombre") {
    ContentView()
        .preferredColorScheme(.dark)
}
