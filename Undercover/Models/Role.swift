import Foundation

enum Role: Equatable, CaseIterable {
    case civilian
    case undercover
    case mrWhite

    /// Libellé affiché une fois le rôle révélé — jamais avant.
    var displayName: String {
        switch self {
        case .civilian: return "Civil"
        case .undercover: return "Undercover"
        case .mrWhite: return "Mr. White"
        }
    }
}
