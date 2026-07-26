import SwiftUI

/// Sélection des joueurs d'une partie, présentée en feuille.
/// Sortie de l'écran de configuration : au-delà d'une poignée de profils,
/// tout lister à plat rendait la préparation interminable.
struct PlayerSelectionView: View {
    @Environment(ProfileStore.self) private var profileStore
    @Environment(\.dismiss) private var dismiss

    @Binding var selectedIDs: [UUID]

    @State private var query = ""
    @State private var showingNewProfile = false

    private var filteredProfiles: [Profile] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return profileStore.profiles }
        return profileStore.profiles.filter { $0.name.localizedCaseInsensitiveContains(q) }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.Colors.background.ignoresSafeArea()

                if profileStore.profiles.isEmpty {
                    emptyState
                } else {
                    list
                }
            }
            .navigationTitle("Joueurs")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $query, prompt: "Rechercher un joueur")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        showingNewProfile = true
                    } label: {
                        Image(systemName: "plus")
                            .fontWeight(.semibold)
                    }
                    .tint(Theme.Colors.foreground)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("OK") { dismiss() }
                        .fontWeight(.semibold)
                        .tint(Theme.Colors.foreground)
                }
            }
            .sheet(isPresented: $showingNewProfile) {
                ProfileEditorView()
            }
        }
    }

    private var list: some View {
        VStack(spacing: 0) {
            selectionSummary

            List {
                ForEach(filteredProfiles) { profile in
                    Button {
                        toggle(profile)
                    } label: {
                        row(for: profile)
                    }
                    .buttonStyle(.plain)
                    .listRowBackground(Theme.Colors.background)
                    .listRowSeparatorTint(Theme.Colors.separator)
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .overlay {
                if filteredProfiles.isEmpty {
                    ContentUnavailableView.search(text: query)
                }
            }
        }
    }

    private func row(for profile: Profile) -> some View {
        let isSelected = selectedIDs.contains(profile.id)

        return HStack(spacing: Theme.Spacing.m) {
            AvatarView(name: profile.name, imageData: profile.imageData, size: 44)

            Text(profile.name)
                .font(.body.weight(.medium))
                .foregroundStyle(Theme.Colors.foreground)

            Spacer(minLength: Theme.Spacing.s)

            Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 22))
                .foregroundStyle(Theme.Colors.foreground)
        }
        .padding(.vertical, Theme.Spacing.xs)
        .contentShape(Rectangle())
    }

    private var selectionSummary: some View {
        HStack {
            Text(selectedIDs.isEmpty
                 ? "Aucun joueur sélectionné"
                 : "\(selectedIDs.count) sélectionné\(selectedIDs.count > 1 ? "s" : "")")
                .font(.footnote)
                .foregroundStyle(Theme.Colors.secondary)

            Spacer()

            if !selectedIDs.isEmpty {
                Button("Tout désélectionner") { selectedIDs.removeAll() }
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(Theme.Colors.foreground)
            }
        }
        .padding(.horizontal, Theme.Spacing.l)
        .padding(.bottom, Theme.Spacing.s)
    }

    private var emptyState: some View {
        VStack(spacing: Theme.Spacing.m) {
            Image(systemName: "person.crop.circle.badge.plus")
                .font(.system(size: 46, weight: .light))
                .foregroundStyle(Theme.Colors.secondary)

            Text("Aucun profil")
                .font(.headline)
                .foregroundStyle(Theme.Colors.foreground)

            Text("Créez des joueurs pour pouvoir les ajouter à une partie.")
                .font(.subheadline)
                .foregroundStyle(Theme.Colors.secondary)
                .multilineTextAlignment(.center)

            Button("Créer un profil") { showingNewProfile = true }
                .buttonStyle(.uPrimary)
                .padding(.top, Theme.Spacing.s)
                .padding(.horizontal, Theme.Spacing.xl)
        }
        .padding(Theme.Spacing.l)
    }

    /// Conserve l'ordre d'ajout : c'est aussi l'ordre de passage à la révélation.
    private func toggle(_ profile: Profile) {
        if let index = selectedIDs.firstIndex(of: profile.id) {
            selectedIDs.remove(at: index)
        } else {
            selectedIDs.append(profile.id)
        }
    }
}
