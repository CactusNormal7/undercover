import SwiftUI

/// Tour de table : chacun décrit son mot, dans l'ordre affiché.
struct DiscussionView: View {
    @Bindable var session: GameSession

    var body: some View {
        VStack(spacing: Theme.Spacing.l) {
            VStack(spacing: Theme.Spacing.s) {
                Text("À vous de parler")
                    .font(Theme.Typography.title(30))
                    .foregroundStyle(Theme.Colors.foreground)

                Text("Un seul mot chacun, dans cet ordre.")
                    .font(.subheadline)
                    .foregroundStyle(Theme.Colors.secondary)
            }
            .padding(.top, Theme.Spacing.l)

            ScrollView {
                VStack(spacing: Theme.Spacing.s) {
                    ForEach(Array(session.game.orderedSpeakers.enumerated()), id: \.element.id) { index, player in
                        PlayerRow(player: player, leadingNumber: index + 1)
                    }
                }
            }

            Button("Passer au vote") {
                session.beginVoting()
            }
            .buttonStyle(.uPrimary)
        }
        .padding(.horizontal, Theme.Spacing.l)
        .padding(.bottom, Theme.Spacing.xl)
    }
}
