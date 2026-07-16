import SwiftUI
import PhotosUI

struct ProfileEditorView: View {
    @Environment(ProfileStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    /// Profil à modifier ; `nil` pour une création.
    private let profile: Profile?

    @State private var name: String
    @State private var pickerItem: PhotosPickerItem?
    @State private var imageData: Data?

    init(profile: Profile? = nil) {
        self.profile = profile
        _name = State(initialValue: profile?.name ?? "")
        _imageData = State(initialValue: profile?.imageData)
    }

    private var isEditing: Bool { profile != nil }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.Colors.background.ignoresSafeArea()

                VStack(spacing: Theme.Spacing.xl) {
                    PhotosPicker(selection: $pickerItem, matching: .images) {
                        ZStack(alignment: .bottomTrailing) {
                            AvatarView(name: name, imageData: imageData, size: 120)
                            Image(systemName: "camera.fill")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Theme.Colors.background)
                                .padding(9)
                                .background(Theme.Colors.foreground, in: Circle())
                                .overlay(Circle().stroke(Theme.Colors.background, lineWidth: 2))
                        }
                    }
                    .padding(.top, Theme.Spacing.xl)

                    TextField("Nom du joueur", text: $name)
                        .font(.title3)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(Theme.Colors.foreground)
                        .padding(.vertical, Theme.Spacing.m)
                        .overlay(alignment: .bottom) {
                            Rectangle()
                                .fill(Theme.Colors.separator)
                                .frame(height: 1)
                        }

                    Spacer()

                    Button("Enregistrer") {
                        save()
                        dismiss()
                    }
                    .buttonStyle(.uPrimary)
                    .disabled(trimmedName.isEmpty)
                    .opacity(trimmedName.isEmpty ? 0.35 : 1)
                }
                .padding(.horizontal, Theme.Spacing.l)
                .padding(.bottom, Theme.Spacing.xl)
            }
            .navigationTitle(isEditing ? "Modifier le profil" : "Nouveau profil")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Annuler") { dismiss() }
                        .tint(Theme.Colors.foreground)
                }
            }
            .task(id: pickerItem) {
                if let pickerItem,
                   let data = try? await pickerItem.loadTransferable(type: Data.self) {
                    imageData = data
                }
            }
        }
    }

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func save() {
        if let profile {
            var updated = profile
            updated.name = trimmedName
            updated.imageData = imageData
            store.update(updated)
        } else {
            store.add(name: name, imageData: imageData)
        }
    }
}
