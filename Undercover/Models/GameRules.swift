import Foundation

// MARK: - Construction

extension Game {

    /// Construit une partie prête à jouer : rôles mélangés, mots distribués.
    ///
    /// Ne trappe jamais. Si `setup` est déséquilibré, la liste de rôles est
    /// complétée en civils ou tronquée pour couvrir exactement les profils
    /// retenus — l'UI garantit déjà l'équilibre, ceci n'est qu'un filet.
    static func start<G: RandomNumberGenerator>(
        profiles: [Profile],
        setup: GameSetup,
        pair: WordPair,
        using rng: inout G
    ) -> Game {
        // Résout les profils dans l'ordre de sélection, en dédoublonnant.
        var seen = Set<UUID>()
        let roster = setup.selectedProfileIDs.compactMap { id -> Profile? in
            guard seen.insert(id).inserted else { return nil }
            return profiles.first { $0.id == id }
        }

        // Second tirage : quel côté de la paire revient aux civils. Sans lui,
        // `word1` serait systématiquement le mot des civils.
        let civiliansTakeWord1 = Bool.random(using: &rng)
        let civilianWord = civiliansTakeWord1 ? pair.word1 : pair.word2
        let undercoverWord = civiliansTakeWord1 ? pair.word2 : pair.word1

        // Infiltrés en tête : une éventuelle troncature retire des civils.
        var roles: [Role] =
            Array(repeating: .undercover, count: max(0, setup.undercovers))
            + Array(repeating: .mrWhite, count: max(0, setup.mrWhites))
            + Array(repeating: .civilian, count: max(0, setup.civilians))

        if roles.count > roster.count {
            roles.removeLast(roles.count - roster.count)
        } else if roles.count < roster.count {
            roles += Array(repeating: .civilian, count: roster.count - roles.count)
        }
        roles.shuffle(using: &rng)

        let players = zip(roster, roles).map { profile, role in
            Player(
                id: profile.id,
                name: profile.name,
                role: role,
                word: Self.word(for: role, civilian: civilianWord, undercover: undercoverWord),
                imageData: profile.imageData
            )
        }

        return Game(
            players: players,
            civilianWord: civilianWord,
            undercoverWord: undercoverWord,
            theme: pair.theme,
            phase: .wordReveal,
            currentRound: 1,
            revealOrder: players.map(\.id),
            revealIndex: 0,
            speakingOrder: makeSpeakingOrder(among: players, using: &rng)
        )
    }

    static func start(profiles: [Profile], setup: GameSetup, pair: WordPair) -> Game {
        var rng = SystemRandomNumberGenerator()
        return start(profiles: profiles, setup: setup, pair: pair, using: &rng)
    }

    private static func word(for role: Role, civilian: String, undercover: String) -> String? {
        switch role {
        case .civilian: return civilian
        case .undercover: return undercover
        case .mrWhite: return nil
        }
    }
}

// MARK: - État dérivé

extension Game {

    var alivePlayers: [Player] { players.filter { !$0.isEliminated } }
    var aliveCivilians: [Player] { alivePlayers.filter { $0.role == .civilian } }
    /// Undercovers et Mr. White : le camp qui gagne à la parité.
    var aliveInfiltrators: [Player] { alivePlayers.filter { $0.role != .civilian } }

    func player(id: UUID) -> Player? { players.first { $0.id == id } }

    /// Joueur à qui tendre le téléphone ; `nil` quand tout le monde a vu son mot.
    var currentRevealPlayer: Player? {
        guard revealIndex >= 0, revealIndex < revealOrder.count else { return nil }
        return player(id: revealOrder[revealIndex])
    }

    var orderedSpeakers: [Player] { speakingOrder.compactMap { player(id: $0) } }

    /// `nil` tant que la partie continue. Ne tient pas compte d'une devinette
    /// de Mr. White en attente : celle-ci est arbitrée avant ce test.
    var currentOutcome: Outcome? {
        if aliveInfiltrators.isEmpty { return .civilians }
        if aliveInfiltrators.count >= aliveCivilians.count { return .infiltrators }
        return nil
    }

    /// Profils crédités d'une victoire, coéquipiers éliminés compris.
    func winnerIDs(for outcome: Outcome) -> Set<UUID> {
        switch outcome {
        case .civilians:
            return Set(players.filter { $0.role == .civilian }.map(\.id))
        case .infiltrators:
            return Set(players.filter { $0.role != .civilian }.map(\.id))
        case .mrWhiteGuessedWord(let id):
            // Règle du jeu commercial : le Mr. White l'emporte seul.
            return [id]
        }
    }
}

// MARK: - Ordre de parole

extension Game {

    /// Permutation des joueurs vivants. Mr. White ne parle jamais en premier :
    /// ouvrir le tour sans aucun mot serait intenable.
    static func makeSpeakingOrder<G: RandomNumberGenerator>(
        among players: [Player],
        using rng: inout G
    ) -> [UUID] {
        var order = players.filter { !$0.isEliminated }.shuffled(using: &rng)

        if let first = order.first,
           first.role == .mrWhite,
           let other = order.firstIndex(where: { $0.role != .mrWhite }) {
            order.swapAt(0, other)
        }
        return order.map(\.id)
    }
}

// MARK: - Transitions

extension Game {

    mutating func advanceReveal() {
        guard phase == .wordReveal else { return }
        revealIndex += 1
        if revealIndex >= revealOrder.count {
            phase = .discussion
        }
    }

    mutating func beginVoting() {
        guard phase == .discussion else { return }
        phase = .voting
    }

    /// Élimine le joueur désigné par le groupe.
    ///
    /// L'ordre des tests est déterminant : si la victime est un Mr. White, sa
    /// devinette est arbitrée **avant** la condition de victoire, pour qu'une
    /// bonne réponse batte une victoire civile survenant au même instant.
    mutating func eliminate(playerID: UUID) {
        guard phase == .voting,
              let index = players.firstIndex(where: { $0.id == playerID }),
              !players[index].isEliminated
        else { return }

        players[index].isEliminated = true
        lastEliminated = players[index]

        if players[index].role == .mrWhite {
            pendingGuesserID = playerID
            lastGuessWasCorrect = nil
            phase = .mrWhiteGuess
            return
        }

        concludeRoundOrFinish()
    }

    /// Unique tentative du Mr. White démasqué. Renvoie `true` s'il a trouvé.
    @discardableResult
    mutating func submitMrWhiteGuess(_ text: String) -> Bool {
        guard phase == .mrWhiteGuess, let guesserID = pendingGuesserID else { return false }

        let isCorrect = text.normalizedForGuess == civilianWord.normalizedForGuess
        lastGuessWasCorrect = isCorrect
        pendingGuesserID = nil

        if isCorrect {
            outcome = .mrWhiteGuessedWord(guesserID)
            phase = .gameOver
        } else {
            concludeRoundOrFinish()
        }
        return isCorrect
    }

    mutating func startNextRound<G: RandomNumberGenerator>(using rng: inout G) {
        guard phase == .roundResult else { return }
        currentRound += 1
        lastEliminated = nil
        lastGuessWasCorrect = nil
        speakingOrder = Self.makeSpeakingOrder(among: players, using: &rng)
        phase = .discussion
    }

    mutating func startNextRound() {
        var rng = SystemRandomNumberGenerator()
        startNextRound(using: &rng)
    }

    private mutating func concludeRoundOrFinish() {
        if let result = currentOutcome {
            outcome = result
            phase = .gameOver
        } else {
            phase = .roundResult
        }
    }
}
