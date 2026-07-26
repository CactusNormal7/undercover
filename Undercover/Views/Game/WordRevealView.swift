import SwiftUI

/// Révélation pass-the-phone : chaque joueur découvre son mot à tour de rôle.
struct WordRevealView: View {
    @Bindable var session: GameSession

    var body: some View {
        Group {
            if let player = session.game.currentRevealPlayer {
                RevealCard(player: player) {
                    session.advanceReveal()
                }
                // Réinitialise l'état interne au joueur suivant.
                .id(player.id)
            } else {
                Color.clear
            }
        }
        .padding(.horizontal, Theme.Spacing.l)
        .padding(.bottom, Theme.Spacing.xl)
    }
}

private struct RevealCard: View {
    let player: Player
    let onDone: () -> Void

    @State private var isRevealed = false

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            if isRevealed {
                // ⚠️ Civils et undercovers voient exactement le même écran :
                // un undercover ne doit jamais apprendre son rôle, il doit le
                // déduire. Et l'écran de Mr. White garde la même silhouette
                // (même typo, même sous-titre, même bouton au même endroit),
                // sinon la table le repère d'un simple coup d'œil de loin.
                VStack(spacing: Theme.Spacing.m) {
                    Text(player.word ?? "Mr. White")
                        .font(Theme.Typography.title(52))
                        .minimumScaleFactor(0.5)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(Theme.Colors.foreground)

                    Text(player.word == nil
                         ? "Tu n'as pas de mot. À toi de bluffer."
                         : "Décris-le sans jamais le prononcer.")
                        .font(.subheadline)
                        .foregroundStyle(Theme.Colors.secondary)
                        .multilineTextAlignment(.center)
                }
            } else {
                VStack(spacing: Theme.Spacing.m) {
                    AvatarView(name: player.name, imageData: player.imageData, size: 96)

                    Text(player.name)
                        .font(Theme.Typography.title(34))
                        .foregroundStyle(Theme.Colors.foreground)

                    Text("Prends le téléphone, toi seul dois voir l'écran.")
                        .font(.subheadline)
                        .foregroundStyle(Theme.Colors.secondary)
                        .multilineTextAlignment(.center)
                }
            }

            Spacer()

            Button(isRevealed ? "J'ai vu" : "Voir mon mot") {
                if isRevealed {
                    onDone()
                } else {
                    isRevealed = true
                }
            }
            .buttonStyle(.uPrimary)
        }
    }
}
