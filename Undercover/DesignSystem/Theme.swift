import SwiftUI

/// Direction artistique de l'app : noir & blanc, minimaliste moderne.
/// Palette strictement monochrome, adaptative light/dark.
enum Theme {

    // MARK: Couleurs

    enum Colors {
        /// Fond de l'app : blanc pur en clair, noir pur en sombre.
        static let background = Color(uiColor: UIColor { trait in
            trait.userInterfaceStyle == .dark ? .black : .white
        })

        /// Couleur de premier plan (texte, éléments pleins) : inverse du fond.
        static let foreground = Color(uiColor: UIColor { trait in
            trait.userInterfaceStyle == .dark ? .white : .black
        })

        /// Texte secondaire / atténué — dérivé du premier plan, reste monochrome.
        static let secondary = foreground.opacity(0.55)

        /// Traits fins, bordures.
        static let separator = foreground.opacity(0.15)
    }

    // MARK: Espacements (échelle 4pt)

    enum Spacing {
        static let xs: CGFloat = 4
        static let s: CGFloat = 8
        static let m: CGFloat = 16
        static let l: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
    }

    // MARK: Rayons

    enum Radius {
        static let button: CGFloat = 14
    }

    // MARK: Typographie

    enum Typography {
        /// Grand titre de marque : gras, tracking resserré.
        static func title(_ size: CGFloat = 44) -> Font {
            .system(size: size, weight: .bold, design: .default)
        }
    }
}
