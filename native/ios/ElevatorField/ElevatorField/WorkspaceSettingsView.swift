import SwiftUI
import Supabase

/// Native Ayarlar: hesap şifresi ve Apple kılavuzu uyumu için kalıcı hesap silme.
struct WorkspaceSettingsView: View {
  let client: SupabaseClient
  var onAccountDeleted: (() async -> Void)? = nil

  @State private var password = ""
  @State private var passwordConfirm = ""
  @State private var busy = false
  @State private var message: String?
  @State private var success = false

  @State private var deleteSheetPresented = false
  @State private var deletePassword = ""
  @State private var deletePhrase = ""
  @State private var deleteBusy = false
  @State private var deleteMessage: String?

  private var passwordStroke: Color {
    if passwordConfirm.isEmpty { return Color.secondary.opacity(0.35) }
    if password != passwordConfirm { return Color.red.opacity(0.85) }
    if password.count >= 8 { return Color.green.opacity(0.7) }
    return Color.orange.opacity(0.65)
  }

  private var canSubmit: Bool {
    password.count >= 8 && password == passwordConfirm && !busy
  }

  private var deleteCanSubmit: Bool {
    deletePassword.count >= 8 && deletePhrase.trimmingCharacters(in: .whitespacesAndNewlines) == token
      && !deleteBusy
  }

  private var token: String { TrStrings.Settings.deleteConfirmPhraseToken }

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

        Divider()
          .padding(.vertical, 8)

        Text(TrStrings.Settings.accountDeletionSection)
          .font(.headline)
        Text(TrStrings.Settings.accountDeletionFooter)
          .font(.footnote)
          .foregroundStyle(.secondary)
          .fixedSize(horizontal: false, vertical: true)

        Button(role: .destructive) {
          deleteMessage = nil
          deleteSheetPresented = true
        } label: {
          Text(TrStrings.Settings.deleteAccount)
            .font(.subheadline.weight(.semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
        }
        .buttonStyle(.bordered)
        .disabled(busy || deleteBusy)
      }
      .padding(16)
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .navigationTitle(TrStrings.Settings.title)
    .navigationBarTitleDisplayMode(.inline)
    .fieldTabBarScrollContentInset()
    .sheet(isPresented: $deleteSheetPresented) {
      deleteAccountSheet
    }
  }

  private var deleteAccountSheet: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 16) {
          Text(String(format: TrStrings.Settings.deleteConfirmPhraseHintFmt, token))
            .font(.footnote)
            .foregroundStyle(.secondary)
            .fixedSize(horizontal: false, vertical: true)

          Text(TrStrings.Settings.deletePasswordPrompt)
            .font(.caption)
            .foregroundStyle(.secondary)
          SecureField("", text: $deletePassword)
            .textContentType(.password)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(
              RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color.secondary.opacity(0.06))
            )

          Text(TrStrings.Settings.deleteConfirmPhraseLabel)
            .font(.caption)
            .foregroundStyle(.secondary)
          TextField(token, text: $deletePhrase)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(
              RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color.secondary.opacity(0.06))
            )

          if let deleteMessage {
            Text(deleteMessage)
              .font(.footnote)
              .foregroundStyle(Color.red.opacity(0.9))
              .fixedSize(horizontal: false, vertical: true)
          }

          Button(role: .destructive) {
            Task { await performAccountDeletion() }
          } label: {
            Group {
              if deleteBusy {
                HStack(spacing: 8) {
                  ProgressView()
                  Text(TrStrings.Settings.deleteBusy)
                }
              } else {
                Text(TrStrings.Settings.deleteSubmit)
                  .font(.headline)
              }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
          }
          .buttonStyle(.borderedProminent)
          .tint(.red)
          .disabled(!deleteCanSubmit || deleteBusy)
        }
        .padding(16)
      }
      .navigationTitle(TrStrings.Settings.deleteAccountSheetTitle)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button(TrStrings.Settings.deleteClose) {
            deleteSheetPresented = false
          }
          .disabled(deleteBusy)
        }
      }
    }
    .presentationDetents([.medium, .large])
    .presentationDragIndicator(.visible)
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

  private func performAccountDeletion() async {
    deleteBusy = true
    deleteMessage = nil
    defer { deleteBusy = false }
    guard let base = AppConfig.publicAppWebBaseURL?.trimmingCharacters(in: .whitespacesAndNewlines),
      let url = URL(string: base + "/api/account/delete")
    else {
      deleteMessage = TrStrings.Iap.apiBaseMissing
      return
    }
    do {
      let session = try await client.auth.session
      let access = session.accessToken.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !access.isEmpty else {
        deleteMessage = TrStrings.Auth.signInFailed
        return
      }

      let payload: [String: Any] = [
        "password": deletePassword,
        "confirmation": deletePhrase.trimmingCharacters(in: .whitespacesAndNewlines),
      ]
      let body = try JSONSerialization.data(withJSONObject: payload)

      var req = URLRequest(url: url)
      req.httpMethod = "POST"
      req.setValue("application/json", forHTTPHeaderField: "Content-Type")
      req.setValue("Bearer \(access)", forHTTPHeaderField: "Authorization")
      req.httpBody = body

      let (data, response) = try await URLSession.shared.data(for: req)
      let status = (response as? HTTPURLResponse)?.statusCode ?? 0
      let decoded = try JSONDecoder().decode(DeleteAccountResponse.self, from: data)

      if !decoded.ok {
        deleteMessage = decoded.error ?? TrStrings.Auth.signInFailed
        if status == 401 {
          deleteMessage = decoded.error ?? TrStrings.Iap.invalidPasswordForExistingEmail
        }
        return
      }

      guard (200 ... 299).contains(status) else {
        deleteMessage = decoded.error ?? TrStrings.Auth.signInFailed
        return
      }

      deleteSheetPresented = false
      try? await client.auth.signOut()
      if let onAccountDeleted {
        await onAccountDeleted()
      }
    } catch {
      deleteMessage = "\(TrStrings.Auth.signInFailed): \(error.localizedDescription)"
    }
  }
}

private struct DeleteAccountResponse: Decodable {
  let ok: Bool
  let error: String?
  let code: String?
}
