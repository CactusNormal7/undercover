import SwiftUI

/// Bouton-icône carré à bords arrondis, monochrome — cohérent avec la DA.
struct IconButton: View {
    let systemName: String
    var role: ButtonRole?
    let action: () -> Void

    init(_ systemName: String, role: ButtonRole? = nil, action: @escaping () -> Void) {
        self.systemName = systemName
        self.role = role
        self.action = action
    }

    var body: some View {
        Button(role: role, action: action) {
            Image(systemName: systemName)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Theme.Colors.foreground)
                .frame(width: 40, height: 40)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Theme.Colors.foreground.opacity(0.06))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Theme.Colors.separator, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}
