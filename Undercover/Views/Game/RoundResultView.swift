import SwiftUI

/// Révélation du rôle du joueur qui vient d'être éliminé.
struct RoundResultView: View {
    @Bindable var session: GameSession

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            if let eliminated = session.game.lastEliminated {
                VStack(spacing: Theme.Spacing.m) {
                    AvatarView(name: eliminated.name, imageData: eliminated.imageData, size: 96)
                        .opacity(0.5)

                    Text(eliminated.name)
                        .font(Theme.Typography.title(30))
                        .foregroundStyle(Theme.Colors.foreground)

                    Text("était \(eliminated.role.displayName)")
                        .font(.title3.weight(.medium))
                        .foregroundStyle(Theme.Colors.secondary)

                    if session.game.lastGuessWasCorrect == false {
                        Text("Sa proposition était fausse.")
                            .font(.subheadline)
                            .foregroundStyle(Theme.Colors.secondary)
                            .padding(.top, Theme.Spacing.xs)
                    }
                }
            }

            Spacer()

            Button("Continuer") {
                session.startNextRound()
            }
            .buttonStyle(.uPrimary)
        }
        .padding(.horizontal, Theme.Spacing.l)
        .padding(.bottom, Theme.Spacing.xl)
    }
}
