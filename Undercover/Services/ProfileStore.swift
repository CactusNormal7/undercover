import Foundation
import Observation

/// Source de vérité des profils, persistée en JSON dans le dossier Documents.
/// Léger et suffisant pour l'usage actuel ; migrera si besoin quand les stats arriveront.
@Observable
final class ProfileStore {
    private(set) var profiles: [Profile] = []

    private let fileURL: URL

    init(filename: String = "profiles.json") {
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        fileURL = documents.appendingPathComponent(filename)
        load()
    }

    // MARK: Mutations

    func add(name: String, imageData: Data?) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        profiles.append(Profile(name: trimmed, imageData: imageData))
        save()
    }

    func update(_ profile: Profile) {
        guard let index = profiles.firstIndex(where: { $0.id == profile.id }) else { return }
        profiles[index] = profile
        save()
    }

    func delete(at offsets: IndexSet) {
        profiles.remove(atOffsets: offsets)
        save()
    }

    func delete(_ profile: Profile) {
        profiles.removeAll { $0.id == profile.id }
        save()
    }

    // MARK: Persistance

    private func load() {
        guard
            let data = try? Data(contentsOf: fileURL),
            let decoded = try? JSONDecoder().decode([Profile].self, from: data)
        else { return }
        profiles = decoded
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(profiles) else { return }
        try? data.write(to: fileURL, options: [.atomic])
    }
}
