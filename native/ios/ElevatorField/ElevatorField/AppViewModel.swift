import Foundation
import Supabase
import SwiftUI

@MainActor
final class AppViewModel: ObservableObject {
  enum Phase {
    case misconfigured(String)
    case signedOut(SupabaseClient)
    case signedIn(SupabaseClient)
  }

  @Published private(set) var phase: Phase
  @Published var errorMessage: String?

  init() {
    guard let url = AppConfig.supabaseURL, let key = AppConfig.supabaseAnonKey else {
      phase = .misconfigured(AppConfig.configurationHint)
      return
    }
    let client = SupabaseClient(
      supabaseURL: url,
      supabaseKey: key,
      options: SupabaseClientOptions(
        auth: .init(emitLocalSessionAsInitialSession: true)
      )
    )
    phase = .signedOut(client)
    Task { await restoreSession(client: client) }
  }

  func restoreSession(client: SupabaseClient) async {
    do {
      let session = try await client.auth.session
      if session.isExpired {
        _ = try await client.auth.refreshSession()
      }
      phase = .signedIn(client)
    } catch {
      phase = .signedOut(client)
    }
  }

  func signOut() async {
    errorMessage = nil
    guard case let .signedIn(client) = phase else { return }
    do {
      try await client.auth.signOut()
      phase = .signedOut(client)
    } catch {
      errorMessage = error.localizedDescription
    }
  }
}
