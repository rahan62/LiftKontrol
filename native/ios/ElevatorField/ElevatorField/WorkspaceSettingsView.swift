import SwiftUI
import Supabase

/// Native Ayarlar: şimdilik hesap şifresi (web `/app/settings` ile paralel).
struct WorkspaceSettingsView: View {
  let client: SupabaseClient

  @State private var password = ""
  @State private var passwordConfirm = ""
  @State private var busy = false
  @State private var message: String?
  @State private var success = false

  private var passwordStroke: Color {
    if passwordConfirm.isEmpty { return Color.secondary.opacity(0.35) }
    if password != passwordConfirm { return Color.red.opacity(0.85) }
    if password.count >= 8 { return Color.green.opacity(0.7) }
    return Color.orange.opacity(0.65)
  }

  private var canSubmit: Bool {
    password.count >= 8 && password == passwordConfirm && !busy
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        Text(TrStrings.Settings.passwordSection)
          .font(.headline)

        Text(TrStrings.Settings.passwordFooter)
          .font(.footnote)
          .foregroundStyle(.secondary)

        secureRow(prompt: TrStrings.Auth.passwordNew, text: $password)
        secureRow(prompt: TrStrings.Auth.passwordAgainField, text: $passwordConfirm)

        if let message {
          Text(message)
            .font(.footnote)
            .foregroundStyle(Color.red.opacity(0.9))
        }
        if success {
          Text(TrStrings.Settings.passwordUpdated)
            .font(.footnote)
            .foregroundStyle(Color.green.opacity(0.85))
        }

        Button {
          Task { await savePassword() }
        } label: {
          Group {
            if busy {
              ProgressView()
            } else {
              Text(TrStrings.Settings.savePassword)
                .font(.headline)
            }
          }
          .frame(maxWidth: .infinity)
          .padding(.vertical, 12)
        }
        .buttonStyle(.borderedProminent)
        .disabled(!canSubmit)
      }
      .padding(16)
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .navigationTitle("Ayarlar")
    .navigationBarTitleDisplayMode(.inline)
    .fieldTabBarScrollContentInset()
  }

  private func secureRow(prompt: String, text: Binding<String>) -> some View {
    SecureField(
      "",
      text: text,
      prompt: Text(prompt).foregroundStyle(.secondary)
    )
    .textContentType(.newPassword)
    .padding(.horizontal, 12)
    .padding(.vertical, 10)
    .background(
      RoundedRectangle(cornerRadius: 10, style: .continuous)
        .fill(Color.secondary.opacity(0.06))
        .overlay(
          RoundedRectangle(cornerRadius: 10, style: .continuous)
            .strokeBorder(passwordStroke, lineWidth: 1.5)
        )
    )
  }

  private func savePassword() async {
    busy = true
    message = nil
    success = false
    defer { busy = false }
    guard password.count >= 8, password == passwordConfirm else {
      message = TrStrings.Settings.passwordFooter
      return
    }
    do {
      try await client.auth.update(user: UserAttributes(password: password))
      password = ""
      passwordConfirm = ""
      success = true
    } catch {
      message = "\(TrStrings.Auth.signInFailed): \(error.localizedDescription)"
    }
  }
}
