import SwiftUI

/// Ligne de joueur réutilisée par la discussion, le vote et le récapitulatif.
/// La DA étant strictement monochrome, l'élimination s'exprime par l'opacité
/// et le texte barré — jamais par une couleur.
struct PlayerRow: View {
    let player: Player
    var detail: String?
    var isSelected: Bool = false
    var showsSelection: Bool = false
    var leadingNumber: Int?

    var body: some View {
        HStack(spacing: Theme.Spacing.m) {
            if let leadingNumber {
                Text("\(leadingNumber)")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.Colors.secondary)
                    .monospacedDigit()
                    .frame(width: 20, alignment: .leading)
            }

            AvatarView(name: player.name, imageData: player.imageData, size: 44)

            VStack(alignment: .leading, spacing: 2) {
                Text(player.name)
                    .font(.body.weight(.medium))
                    .foregroundStyle(Theme.Colors.foreground)
                    .strikethrough(player.isEliminated)

                if let detail {
                    Text(detail)
                        .font(.caption)
                        .foregroundStyle(Theme.Colors.secondary)
                }
            }

            Spacer(minLength: Theme.Spacing.s)

            if showsSelection {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22))
                    .foregroundStyle(Theme.Colors.foreground)
            }
        }
        .padding(Theme.Spacing.s)
        .background(
            RoundedRectangle(cornerRadius: Theme.Radius.button)
                .fill(isSelected ? Theme.Colors.foreground.opacity(0.05) : .clear)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Theme.Radius.button)
                .stroke(Theme.Colors.separator, lineWidth: 1)
        )
        .opacity(player.isEliminated ? 0.45 : 1)
        .contentShape(RoundedRectangle(cornerRadius: Theme.Radius.button))
    }
}
