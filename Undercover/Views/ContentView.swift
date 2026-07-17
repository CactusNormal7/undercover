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

                    // Menu
                    VStack(spacing: Theme.Spacing.m) {
                        NavigationLink {
                            GameSetupView()
                        } label: {
                            Text("Nouvelle partie")
                        }
                        .buttonStyle(.uPrimary)

                        NavigationLink {
                            ProfilesView()
                        } label: {
                            Text("Profils")
                        }
                        .buttonStyle(.uSecondary)

                        Button("Règles du jeu") {
                            // À venir : écran des règles
                        }
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(Theme.Colors.secondary)
                        .padding(.top, Theme.Spacing.xs)
                    }
                }
                .padding(.horizontal, Theme.Spacing.l)
                .padding(.bottom, Theme.Spacing.xl)
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        SettingsView()
                    } label: {
                        Image(systemName: "gearshape")
                    }
                }
            }
        }
        .tint(Theme.Colors.foreground)
    }
}

#Preview {
    ContentView()
        .environment(ProfileStore())
        .environment(WordStore())
}

#Preview("Sombre") {
    ContentView()
        .environment(ProfileStore())
        .environment(WordStore())
        .preferredColorScheme(.dark)
}
