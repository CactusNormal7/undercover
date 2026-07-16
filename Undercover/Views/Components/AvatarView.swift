import SwiftUI

/// Avatar circulaire monochrome : photo du joueur, sinon ses initiales.
struct AvatarView: View {
    let name: String
    let imageData: Data?
    var size: CGFloat = 56

    var body: some View {
        Group {
            if let imageData, let uiImage = UIImage(data: imageData) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFill()
            } else {
                Theme.Colors.foreground.opacity(0.06)
                    .overlay(
                        Text(initials)
                            .font(.system(size: size * 0.4, weight: .semibold))
                            .foregroundStyle(Theme.Colors.foreground)
                    )
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().stroke(Theme.Colors.separator, lineWidth: 1))
    }

    private var initials: String {
        let letters = name
            .split(separator: " ")
            .prefix(2)
            .compactMap(\.first)
        let result = String(letters).uppercased()
        return result.isEmpty ? "?" : result
    }
}
