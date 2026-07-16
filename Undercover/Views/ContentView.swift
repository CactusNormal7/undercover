import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Text("Undercover")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Button("Nouvelle partie") {
                    // À venir : lancement d'une partie
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()
        }
    }
}

#Preview {
    ContentView()
}
