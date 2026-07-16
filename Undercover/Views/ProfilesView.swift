import SwiftUI

struct ProfilesView: View {
    @Environment(ProfileStore.self) private var store

    @State private var activeSheet: Sheet?
    @State private var profileToDelete: Profile?

    private enum Sheet: Identifiable {
        case create
        case edit(Profile)

        var id: String {
            switch self {
            case .create: return "create"
            case .edit(let profile): return profile.id.uuidString
            }
        }
    }

    var body: some View {
        ZStack {
            Theme.Colors.background.ignoresSafeArea()

            if store.profiles.isEmpty {
                emptyState
            } else {
                list
            }
        }
        .navigationTitle("Profils")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    activeSheet = .create
                } label: {
                    Image(systemName: "plus")
                        .fontWeight(.semibold)
                }
                .tint(Theme.Colors.foreground)
            }
        }
        .sheet(item: $activeSheet) { sheet in
            switch sheet {
            case .create:
                ProfileEditorView()
            case .edit(let profile):
                ProfileEditorView(profile: profile)
            }
        }
        .confirmationDialog(
            "Supprimer ce profil ?",
            isPresented: Binding(
                get: { profileToDelete != nil },
                set: { if !$0 { profileToDelete = nil } }
            ),
            presenting: profileToDelete
        ) { profile in
            Button("Supprimer", role: .destructive) {
                store.delete(profile)
            }
            Button("Annuler", role: .cancel) {}
        } message: { profile in
            Text("« \(profile.name) » sera définitivement supprimé.")
        }
    }

    private var list: some View {
        ScrollView {
            LazyVStack(spacing: Theme.Spacing.s) {
                ForEach(store.profiles) { profile in
                    row(for: profile)
                }
            }
            .padding(.horizontal, Theme.Spacing.l)
            .padding(.top, Theme.Spacing.s)
        }
    }

    private func row(for profile: Profile) -> some View {
        HStack(spacing: Theme.Spacing.m) {
            AvatarView(name: profile.name, imageData: profile.imageData, size: 48)

            Text(profile.name)
                .font(.body.weight(.medium))
                .foregroundStyle(Theme.Colors.foreground)

            Spacer(minLength: Theme.Spacing.s)

            HStack(spacing: Theme.Spacing.s) {
                IconButton("pencil") {
                    activeSheet = .edit(profile)
                }
                IconButton("trash", role: .destructive) {
                    profileToDelete = profile
                }
            }
        }
        .padding(Theme.Spacing.s)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Theme.Colors.separator, lineWidth: 1)
        )
    }

    private var emptyState: some View {
        VStack(spacing: Theme.Spacing.m) {
            Image(systemName: "person.crop.circle.badge.plus")
                .font(.system(size: 46, weight: .light))
                .foregroundStyle(Theme.Colors.secondary)

            Text("Aucun profil")
                .font(.headline)
                .foregroundStyle(Theme.Colors.foreground)

            Text("Ajoutez des joueurs pour préparer vos parties.")
                .font(.subheadline)
                .foregroundStyle(Theme.Colors.secondary)
                .multilineTextAlignment(.center)

            Button("Créer un profil") { activeSheet = .create }
                .buttonStyle(.uPrimary)
                .padding(.top, Theme.Spacing.s)
                .padding(.horizontal, Theme.Spacing.xl)
        }
        .padding(Theme.Spacing.l)
    }
}
