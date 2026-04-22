import SwiftUI

@main
struct ElevatorFieldApp: App {
  @StateObject private var model = AppViewModel()

  var body: some Scene {
    WindowGroup {
      RootView(model: model)
    }
  }
}
