import SwiftUI

/// Mr. White démasqué : une unique chance de deviner le mot des civils.
/// S'il trouve, il gagne la partie sur-le-champ.
struct MrWhiteGuessView: View {
    @Bindable var session: GameSession

    @State private var guess = ""
    @FocusState private var isFocused: Bool

    private var guesser: Player? {
        session.game.pendingGuesserID.flatMap { session.game.player(id: $0) }
    }

    private var trimmedGuess: String {
        guess.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: Theme.Spacing.m) {
                Text("\(guesser?.name ?? "Ce joueur") était Mr. White.")
                    .font(Theme.Typography.title(28))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Theme.Colors.foreground)

                Text("Dernière chance : quel était le mot des civils ?")
                    .font(.subheadline)
                    .foregroundStyle(Theme.Colors.secondary)
                    .multilineTextAlignment(.center)

                TextField("Le mot des civils", text: $guess)
                    .font(.title3)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Theme.Colors.foreground)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .focused($isFocused)
                    .submitLabel(.done)
                    .onSubmit(submit)
                    .padding(.vertical, Theme.Spacing.m)
                    .overlay(alignment: .bottom) {
                        Rectangle()
                            .fill(Theme.Colors.separator)
                            .frame(height: 1)
                    }
                    .padding(.top, Theme.Spacing.m)
            }

            Spacer()

            Button("Valider", action: submit)
                .buttonStyle(.uPrimary)
                .disabled(trimmedGuess.isEmpty)
                .opacity(trimmedGuess.isEmpty ? 0.35 : 1)
        }
        .padding(.horizontal, Theme.Spacing.l)
        .padding(.bottom, Theme.Spacing.xl)
        .onAppear { isFocused = true }
    }

    private func submit() {
        guard !trimmedGuess.isEmpty else { return }
        isFocused = false
        session.submitMrWhiteGuess(trimmedGuess)
    }
}
