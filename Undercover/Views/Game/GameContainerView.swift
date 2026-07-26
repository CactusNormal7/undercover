import SwiftUI

/// Hôte de la partie : une seule vue plein écran qui bascule selon la phase.
/// Présentée en `fullScreenCover` pour qu'on ne puisse pas sortir par un
/// balayage arrière au milieu d'une manche.
struct GameContainerView: View {
    @Bindable var session: GameSession
    let onFinish: () -> Void

    @State private var showingQuitConfirmation = false

    var body: some View {
        ZStack {
            Theme.Colors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                topBar
                content
            }
        }
        .confirmationDialog(
            "Quitter la partie ?",
            isPresented: $showingQuitConfirmation,
            titleVisibility: .visible
        ) {
            Button("Quitter", role: .destructive) {
                session.abandon()
                onFinish()
            }
            Button("Continuer", role: .cancel) {}
        } message: {
            Text("La partie en cours sera perdue et aucune statistique ne sera enregistrée.")
        }
    }

    private var topBar: some View {
        HStack {
            if session.game.phase != .gameOver {
                Text("Manche \(session.game.currentRound)")
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(Theme.Colors.secondary)
                    .monospacedDigit()
            }

            Spacer()

            if session.game.phase != .gameOver {
                Button {
                    showingQuitConfirmation = true
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.Colors.foreground)
                        .frame(width: 32, height: 32)
                        .contentShape(Rectangle())
                }
            }
        }
        .padding(.horizontal, Theme.Spacing.l)
        .padding(.top, Theme.Spacing.s)
        .frame(height: 40)
    }

    @ViewBuilder
    private var content: some View {
        switch session.game.phase {
        case .wordReveal:
            WordRevealView(session: session)
        case .discussion:
            DiscussionView(session: session)
        case .voting:
            VotingView(session: session)
        case .roundResult:
            RoundResultView(session: session)
        case .mrWhiteGuess:
            MrWhiteGuessView(session: session)
        case .gameOver:
            GameOverView(session: session, onFinish: onFinish)
        case .setup:
            // Inatteignable : `Game.start` démarre directement en révélation.
            Color.clear
        }
    }
}
