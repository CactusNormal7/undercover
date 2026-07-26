import SwiftUI

struct RulesView: View {
    var body: some View {
        ZStack {
            Theme.Colors.background.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Spacing.l) {
                    section(
                        "Le but",
                        "Chaque joueur reçoit un mot secret. La majorité — les civils — partagent le même. Les undercovers en ont un autre, très proche. Mr. White, lui, n'a aucun mot."
                    )

                    section(
                        "Les rôles",
                        """
                        Civil — tu partages ton mot avec la majorité.

                        Undercover — ton mot est légèrement différent. Personne ne te dit que tu es undercover : c'est en écoutant les autres que tu dois t'en rendre compte.

                        Mr. White — tu n'as rien. Tu dois deviner de quoi on parle et faire semblant d'avoir un mot.
                        """
                    )

                    section(
                        "Le tour de table",
                        "Chacun décrit son mot avec un seul mot, dans l'ordre affiché. Interdit de prononcer son propre mot. Trop précis, tu te fais repérer ; trop vague, tu deviens suspect."
                    )

                    section(
                        "Le vote",
                        "Après le tour de table, débattez à voix haute et votez. Une personne désigne l'éliminé dans l'app, et son rôle est aussitôt dévoilé."
                    )

                    section(
                        "La revanche de Mr. White",
                        "Si Mr. White est éliminé, il a droit à une dernière tentative : deviner le mot des civils. S'il tombe juste, il remporte la partie à lui seul, même si les civils étaient sur le point de gagner."
                    )

                    section(
                        "Conditions de victoire",
                        """
                        Les civils gagnent en éliminant tous les undercovers et Mr. White.

                        Les infiltrés gagnent dès qu'ils sont aussi nombreux que les civils.
                        """
                    )
                }
                .padding(.horizontal, Theme.Spacing.l)
                .padding(.vertical, Theme.Spacing.l)
            }
        }
        .navigationTitle("Règles du jeu")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func section(_ title: String, _ body: String) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.s) {
            Text(title.uppercased())
                .font(.caption.weight(.semibold))
                .tracking(1)
                .foregroundStyle(Theme.Colors.secondary)

            Text(body)
                .font(.body)
                .foregroundStyle(Theme.Colors.foreground)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

#Preview {
    NavigationStack { RulesView() }
}
