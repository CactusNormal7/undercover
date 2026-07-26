import SwiftUI

/// Le groupe débat et vote à voix haute ; une seule personne désigne ici
/// le joueur éliminé.
struct VotingView: View {
    @Bindable var session: GameSession

    @State private var selectedID: UUID?
    @State private var showingConfirmation = false

    private var selectedPlayer: Player? {
        selectedID.flatMap { session.game.player(id: $0) }
    }

    var body: some View {
        VStack(spacing: Theme.Spacing.l) {
            VStack(spacing: Theme.Spacing.s) {
                Text("Qui éliminer ?")
                    .font(Theme.Typography.title(30))
                    .foregroundStyle(Theme.Colors.foreground)

                Text("Votez à voix haute, puis désignez le joueur.")
                    .font(.subheadline)
                    .foregroundStyle(Theme.Colors.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, Theme.Spacing.l)

            ScrollView {
                VStack(spacing: Theme.Spacing.s) {
                    ForEach(session.game.alivePlayers) { player in
                        Button {
                            selectedID = player.id
                        } label: {
                            PlayerRow(
                                player: player,
                                isSelected: selectedID == player.id,
                                showsSelection: true
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            Button("Éliminer") {
                showingConfirmation = true
            }
            .buttonStyle(.uPrimary)
            .disabled(selectedID == nil)
            .opacity(selectedID == nil ? 0.35 : 1)
        }
        .padding(.horizontal, Theme.Spacing.l)
        .padding(.bottom, Theme.Spacing.xl)
        .confirmationDialog(
            "Éliminer ce joueur ?",
            isPresented: $showingConfirmation,
            titleVisibility: .visible
        ) {
            if let selectedPlayer {
                Button("Éliminer \(selectedPlayer.name)", role: .destructive) {
                    session.eliminate(selectedPlayer.id)
                    selectedID = nil
                }
            }
            Button("Annuler", role: .cancel) {}
        }
    }
}
