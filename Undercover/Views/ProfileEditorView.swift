import SwiftUI
import PhotosUI

struct ProfileEditorView: View {
    @Environment(ProfileStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var pickerItem: PhotosPickerItem?
    @State private var imageData: Data?

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
                        store.add(name: name, imageData: imageData)
                        dismiss()
                    }
                    .buttonStyle(.uPrimary)
                    .disabled(trimmedName.isEmpty)
                    .opacity(trimmedName.isEmpty ? 0.35 : 1)
                }
                .padding(.horizontal, Theme.Spacing.l)
                .padding(.bottom, Theme.Spacing.xl)
            }
            .navigationTitle("Nouveau profil")
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
}
