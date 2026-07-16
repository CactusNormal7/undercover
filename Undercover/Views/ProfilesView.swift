import SwiftUI

struct ProfilesView: View {
    @Environment(ProfileStore.self) private var store
    @State private var showingEditor = false

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
                    showingEditor = true
                } label: {
                    Image(systemName: "plus")
                        .fontWeight(.semibold)
                }
                .tint(Theme.Colors.foreground)
            }
        }
        .sheet(isPresented: $showingEditor) {
            ProfileEditorView()
        }
    }

    private var list: some View {
        List {
            ForEach(store.profiles) { profile in
                HStack(spacing: Theme.Spacing.m) {
                    AvatarView(name: profile.name, imageData: profile.imageData)
                    Text(profile.name)
                        .font(.body.weight(.medium))
                        .foregroundStyle(Theme.Colors.foreground)
                }
                .padding(.vertical, Theme.Spacing.xs)
                .listRowBackground(Theme.Colors.background)
                .listRowSeparatorTint(Theme.Colors.separator)
            }
            .onDelete { store.delete(at: $0) }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
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

            Button("Créer un profil") { showingEditor = true }
                .buttonStyle(.uPrimary)
                .padding(.top, Theme.Spacing.s)
                .padding(.horizontal, Theme.Spacing.xl)
        }
        .padding(Theme.Spacing.l)
    }
}
