import SwiftUI

@main
struct UndercoverApp: App {
    @State private var profileStore = ProfileStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(profileStore)
        }
    }
}
