import SwiftUI

struct GameSetupView: View {
    @Environment(ProfileStore.self) private var profileStore

    @State private var setup = GameSetup()
    @State private var showingNewProfile = false

    var body: some View {
        ZStack {
            Theme.Colors.background.ignoresSafeArea()

            ScrollView {
                VStack(spacing: Theme.Spacing.xl) {
                    playersSection
                    rolesSection
                    startButton
                }
                .padding(.horizontal, Theme.Spacing.l)
                .padding(.vertical, Theme.Spacing.l)
            }
        }
        .navigationTitle("Nouvelle partie")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingNewProfile) {
            ProfileEditorView()
        }
        .onChange(of: setup.playerCount) { _, _ in
            setup.resetRolesToDefault()
        }
    }

    // MARK: Joueurs

    private var playersSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.m) {
            HStack(alignment: .firstTextBaseline) {
                sectionTitle("Joueurs")
                Spacer()
                Text("\(setup.playerCount)")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(Theme.Colors.foreground)
                    .monospacedDigit()
            }

            if profileStore.profiles.isEmpty {
                emptyProfiles
            } else {
                VStack(spacing: Theme.Spacing.s) {
                    ForEach(profileStore.profiles) { profile in
                        profileRow(profile)
                    }
                    newProfileButton
                }
            }
        }
    }

    private func profileRow(_ profile: Profile) -> some View {
        let isSelected = setup.selectedProfileIDs.contains(profile.id)

        return Button {
            toggle(profile)
        } label: {
            HStack(spacing: Theme.Spacing.m) {
                AvatarView(name: profile.name, imageData: profile.imageData, size: 44)

                Text(profile.name)
                    .font(.body.weight(.medium))
                    .foregroundStyle(Theme.Colors.foreground)

                Spacer(minLength: Theme.Spacing.s)

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22, weight: .regular))
                    .foregroundStyle(Theme.Colors.foreground)
            }
            .padding(Theme.Spacing.s)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(isSelected ? Theme.Colors.foreground.opacity(0.05) : .clear)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Theme.Colors.separator, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var newProfileButton: some View {
        Button {
            showingNewProfile = true
        } label: {
            HStack(spacing: Theme.Spacing.s) {
                Image(systemName: "plus.circle")
                    .font(.system(size: 18, weight: .regular))
                Text("Nouveau profil")
                    .font(.body.weight(.medium))
            }
            .foregroundStyle(Theme.Colors.secondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Theme.Spacing.m)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .strokeBorder(Theme.Colors.separator, style: StrokeStyle(lineWidth: 1, dash: [4]))
            )
        }
        .buttonStyle(.plain)
    }

    private var emptyProfiles: some View {
        VStack(spacing: Theme.Spacing.s) {
            Text("Aucun profil pour l'instant.")
                .font(.subheadline)
                .foregroundStyle(Theme.Colors.secondary)
            Button("Créer un profil") { showingNewProfile = true }
                .buttonStyle(.uPrimary)
        }
        .padding(Theme.Spacing.l)
        .frame(maxWidth: .infinity)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Theme.Colors.separator, lineWidth: 1)
        )
    }

    // MARK: Rôles

    private var rolesSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.m) {
            HStack(alignment: .firstTextBaseline) {
                sectionTitle("Rôles")
                Spacer()
                Text("\(setup.totalRoles) / \(setup.playerCount)")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(setup.isBalanced ? Theme.Colors.secondary : .red)
                    .monospacedDigit()
            }

            VStack(spacing: Theme.Spacing.s) {
                roleStepper(title: "Civils",
                            subtitle: "Ils partagent le même mot",
                            value: $setup.civilians)

                roleStepper(title: "Undercover",
                            subtitle: "Un mot proche, mais différent",
                            value: $setup.undercovers)

                roleStepper(title: "Mr. White",
                            subtitle: "Aucun mot, doit bluffer",
                            value: $setup.mrWhites)
            }

            if setup.playerCount >= GameSetup.minPlayers && !setup.isBalanced {
                Text("Le total des rôles doit être égal au nombre de joueurs (\(setup.playerCount)).")
                    .font(.footnote)
                    .foregroundStyle(.red)
            }
        }
    }

    private func roleStepper(title: String, subtitle: String, value: Binding<Int>) -> some View {
        HStack(spacing: Theme.Spacing.m) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.body.weight(.medium))
                    .foregroundStyle(Theme.Colors.foreground)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(Theme.Colors.secondary)
            }

            Spacer(minLength: Theme.Spacing.s)

            HStack(spacing: 0) {
                stepperButton(systemName: "minus") {
                    if value.wrappedValue > 0 { value.wrappedValue -= 1 }
                }
                Text("\(value.wrappedValue)")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(Theme.Colors.foreground)
                    .frame(minWidth: 28)
                    .monospacedDigit()
                stepperButton(systemName: "plus") {
                    value.wrappedValue += 1
                }
            }
            .padding(.horizontal, 4)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Theme.Colors.separator, lineWidth: 1)
            )
        }
        .padding(Theme.Spacing.s)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Theme.Colors.separator, lineWidth: 1)
        )
    }

    private func stepperButton(systemName: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Theme.Colors.foreground)
                .frame(width: 32, height: 32)
        }
        .buttonStyle(.plain)
    }

    // MARK: Start

    private var startButton: some View {
        Button("Commencer la partie") {
            // La distribution des mots / rôles arrivera dans une prochaine itération.
        }
        .buttonStyle(.uPrimary)
        .disabled(!setup.isBalanced)
        .opacity(setup.isBalanced ? 1 : 0.35)
    }

    // MARK: Helpers

    private func sectionTitle(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.caption.weight(.semibold))
            .tracking(1)
            .foregroundStyle(Theme.Colors.secondary)
    }

    private func toggle(_ profile: Profile) {
        if let index = setup.selectedProfileIDs.firstIndex(of: profile.id) {
            setup.selectedProfileIDs.remove(at: index)
        } else {
            setup.selectedProfileIDs.append(profile.id)
        }
    }
}
