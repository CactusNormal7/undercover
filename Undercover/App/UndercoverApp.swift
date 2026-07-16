import SwiftUI

@main
struct UndercoverApp: App {
    @State private var profileStore = ProfileStore()
    @State private var wordStore = WordStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(profileStore)
                .environment(wordStore)
        }
    }
}
