import StoreKit
import SwiftUI

@main
struct ElevatorFieldApp: App {
  @StateObject private var model = AppViewModel()

  init() {
    Task {
      for await update in Transaction.updates {
        if case .verified(let transaction) = update {
          await transaction.finish()
        }
      }
    }
  }

  var body: some Scene {
    WindowGroup {
      RootView(model: model)
    }
  }
}
