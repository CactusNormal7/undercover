import SwiftUI

/// Fin de partie : vainqueurs, mots dévoilés, et récapitulatif de la table.
struct GameOverView: View {
    @Bindable var session: GameSession
    let onFinish: () -> Void

    private var game: Game { session.game }

    private var headline: String {
        switch game.outcome {
        case .civilians: return "Les civils gagnent"
        case .infiltrators: return "Les infiltrés gagnent"
        case .mrWhiteGuessedWord(let id):
            return "\(game.player(id: id)?.name ?? "Mr. White") a trouvé le mot"
        case nil: return "Partie terminée"
        }
    }

    private var subtitle: String {
        switch game.outcome {
        case .civilians: return "Tous les infiltrés ont été démasqués."
        case .infiltrators: return "Ils sont aussi nombreux que les civils."
        case .mrWhiteGuessedWord: return "Démasqué, mais il gagne seul sur le fil."
        case nil: return ""
        }
    }

    var body: some View {
        VStack(spacing: Theme.Spacing.l) {
            VStack(spacing: Theme.Spacing.s) {
                Text(headline)
                    .font(Theme.Typography.title(30))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Theme.Colors.foreground)

                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(Theme.Colors.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, Theme.Spacing.m)

            words

            ScrollView {
                VStack(spacing: Theme.Spacing.s) {
                    ForEach(game.players) { player in
                        PlayerRow(player: player, detail: detail(for: player))
                    }
                }
            }

            VStack(spacing: Theme.Spacing.m) {
                Button("Rejouer") { session.replay() }
                    .buttonStyle(.uSecondary)

                Button("Terminer", action: onFinish)
                    .buttonStyle(.uPrimary)
            }
        }
        .padding(.horizontal, Theme.Spacing.l)
        .padding(.bottom, Theme.Spacing.xl)
    }

    private var words: some View {
        HStack(spacing: Theme.Spacing.m) {
            wordBlock(title: "Civils", word: game.civilianWord)
            Rectangle()
                .fill(Theme.Colors.separator)
                .frame(width: 1, height: 40)
            wordBlock(title: "Undercover", word: game.undercoverWord)
        }
        .frame(maxWidth: .infinity)
        .padding(Theme.Spacing.m)
        .overlay(
            RoundedRectangle(cornerRadius: Theme.Radius.button)
                .stroke(Theme.Colors.separator, lineWidth: 1)
        )
    }

    private func wordBlock(title: String, word: String) -> some View {
        VStack(spacing: 2) {
            Text(title.uppercased())
                .font(.caption2.weight(.semibold))
                .tracking(1)
                .foregroundStyle(Theme.Colors.secondary)
            Text(word)
                .font(.body.weight(.semibold))
                .foregroundStyle(Theme.Colors.foreground)
        }
        .frame(maxWidth: .infinity)
    }

    private func detail(for player: Player) -> String {
        let role = player.role.displayName
        guard let outcome = game.outcome else { return role }
        return game.winnerIDs(for: outcome).contains(player.id) ? "\(role) · gagne" : role
    }
}
