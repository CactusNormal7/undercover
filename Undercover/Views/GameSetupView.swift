import SwiftUI

struct GameSetupView: View {
    @Environment(ProfileStore.self) private var profileStore
    @Environment(WordStore.self) private var wordStore
    @Environment(\.dismiss) private var dismiss

    @State private var setup = GameSetup()
    @State private var showingNewProfile = false
    @State private var showingPlayerSelection = false
    @State private var session: GameSession?
    @State private var startError: String?

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
        .sheet(isPresented: $showingPlayerSelection) {
            PlayerSelectionView(selectedIDs: $setup.selectedProfileIDs)
        }
        // `item:` et non `isPresented:` : la session doit être construite une
        // seule fois, au tap, pas à chaque réévaluation de la closure.
        .fullScreenCover(item: $session) { session in
            GameContainerView(session: session) {
                self.session = nil
                dismiss()
            }
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
                if !selectedProfiles.isEmpty {
                    selectedStrip
                }
                selectPlayersButton
            }
        }
    }

    /// Profils retenus, dans l'ordre de sélection.
    private var selectedProfiles: [Profile] {
        setup.selectedProfileIDs.compactMap { id in
            profileStore.profiles.first { $0.id == id }
        }
    }

    /// Aperçu horizontal des joueurs retenus : reste lisible quel que soit
    /// leur nombre, là où la liste complète débordait de l'écran.
    private var selectedStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.Spacing.m) {
                ForEach(selectedProfiles) { profile in
                    VStack(spacing: Theme.Spacing.xs) {
                        AvatarView(name: profile.name, imageData: profile.imageData, size: 52)
                        Text(profile.name)
                            .font(.caption)
                            .foregroundStyle(Theme.Colors.secondary)
                            .lineLimit(1)
                    }
                    .frame(width: 64)
                }
            }
            .padding(.vertical, Theme.Spacing.xs)
        }
    }

    private var selectPlayersButton: some View {
        Button {
            showingPlayerSelection = true
        } label: {
            HStack(spacing: Theme.Spacing.s) {
                Image(systemName: "person.2")
                    .font(.system(size: 17))
                Text(setup.selectedProfileIDs.isEmpty ? "Choisir les joueurs" : "Modifier la sélection")
                    .font(.body.weight(.medium))
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Theme.Colors.secondary)
            }
            .foregroundStyle(Theme.Colors.foreground)
            .padding(Theme.Spacing.m)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Theme.Colors.separator, lineWidth: 1)
            )
            .contentShape(RoundedRectangle(cornerRadius: 14))
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
                    // Jamais plus d'un rôle que de joueurs autour de la table.
                    if value.wrappedValue < setup.playerCount { value.wrappedValue += 1 }
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
                // Le `frame` ne dessine rien : sans `contentShape`, seuls les
                // pixels du glyphe étaient tapables. Le « − » n'est qu'un trait
                // fin, il en devenait quasi impossible à atteindre.
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    // MARK: Start

    private var startButton: some View {
        VStack(spacing: Theme.Spacing.s) {
            Button("Commencer la partie", action: start)
                .buttonStyle(.uPrimary)
                .disabled(!canStart)
                .opacity(canStart ? 1 : 0.35)

            if let startError {
                Text(startError)
                    .font(.footnote)
                    .foregroundStyle(Theme.Colors.secondary)
                    .multilineTextAlignment(.center)
            }
        }
    }

    private var canStart: Bool {
        setup.isBalanced && !wordStore.pairs.isEmpty
    }

    private func start() {
        guard let session = GameSession(
            setup: setup,
            profileStore: profileStore,
            wordStore: wordStore
        ) else {
            startError = "Impossible de lancer la partie : aucune paire de mots disponible."
            return
        }
        startError = nil
        self.session = session
    }

    // MARK: Helpers

    private func sectionTitle(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.caption.weight(.semibold))
            .tracking(1)
            .foregroundStyle(Theme.Colors.secondary)
    }

}
