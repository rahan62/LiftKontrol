import SwiftUI

struct RootView: View {
  @ObservedObject var model: AppViewModel

  var body: some View {
    Group {
      switch model.phase {
      case .misconfigured(let hint):
        ScrollView {
          Text(hint)
            .font(.body)
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
        }
      case .signedOut(let client):
        NavigationStack {
          LoginView(client: client) {
            await model.restoreSession(client: client)
          }
        }
      case .signedIn(let client):
        MainShellView(client: client) {
          await model.signOut()
        }
      }
    }
  }
}
