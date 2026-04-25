import SwiftUI
import Supabase

/// Giriş: marka koyu lacivert / mavi vurgu (logo paletine yakın), ortalanmış alanlar.
struct LoginView: View {
  let client: SupabaseClient
  let onSignedIn: () async -> Void

  @State private var email = ""
  @State private var password = ""
  @State private var busy = false
  @State private var message: String?
  @State private var showSignupInfo = false
  @State private var showIapSubscribe = false

  private let contentMaxWidth: CGFloat = 320

  var body: some View {
    ZStack {
      LinearGradient(
        colors: [LoginBrand.bgTop, LoginBrand.bgBottom],
        startPoint: .top,
        endPoint: .bottom
      )
      .ignoresSafeArea()

      VStack(spacing: 0) {
        HStack {
          Spacer(minLength: 0)
          Button {
            showSignupInfo = true
          } label: {
            Image(systemName: "info.circle")
              .font(.title3)
              .foregroundStyle(.white.opacity(0.65))
          }
          .accessibilityLabel(TrStrings.Auth.aboutSignup)
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)

        Spacer(minLength: 24)

        VStack(spacing: 20) {
          VStack(spacing: 8) {
            Text(TrStrings.Brand.appName)
              .font(.title.bold())
              .foregroundStyle(.white)
            Text(TrStrings.Auth.tagline)
              .font(.subheadline)
              .foregroundStyle(.white.opacity(0.72))
              .multilineTextAlignment(.center)
          }
          .padding(.horizontal, 8)

          VStack(spacing: 14) {
            TextField(
              "",
              text: $email,
              prompt: Text(TrStrings.Auth.email).foregroundStyle(.white.opacity(0.42))
            )
            .textContentType(.username)
            .textInputAutocapitalization(.never)
            .keyboardType(.emailAddress)
            .foregroundStyle(.white)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(
              RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(LoginBrand.fieldFill)
                .overlay(
                  RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(LoginBrand.fieldBorder, lineWidth: 1)
                )
            )

            SecureField(
              "",
              text: $password,
              prompt: Text(TrStrings.Auth.password).foregroundStyle(.white.opacity(0.42))
            )
            .textContentType(.password)
            .foregroundStyle(.white)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(
              RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(LoginBrand.fieldFill)
                .overlay(
                  RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(LoginBrand.fieldBorder, lineWidth: 1)
                )
            )

            if let message {
              Text(message)
                .font(.footnote)
                .foregroundStyle(Color(red: 1, green: 0.45, blue: 0.45))
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
            }

            Button {
              Task { await signIn() }
            } label: {
              Group {
                if busy {
                  ProgressView()
                    .tint(.white)
                } else {
                  Text(TrStrings.Auth.signIn)
                    .font(.headline)
                }
              }
              .frame(maxWidth: .infinity)
              .padding(.vertical, 14)
              .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                  .fill(canSubmit ? LoginBrand.accent : LoginBrand.accentDisabled)
              )
              .foregroundStyle(.white)
            }
            .disabled(!canSubmit || busy)
            .buttonStyle(.plain)
          }
          .frame(maxWidth: contentMaxWidth)
        }
        .frame(maxWidth: .infinity)

        Spacer(minLength: 16)

        Button {
          showIapSubscribe = true
        } label: {
          Text(TrStrings.Iap.subscribe)
            .font(.subheadline.weight(.semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(
              RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Color.white.opacity(0.35), lineWidth: 1)
            )
            .foregroundStyle(.white)
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 24)
        .padding(.bottom, 4)

        Text(TrStrings.Auth.membersOnlyFooter)
          .font(.caption)
          .foregroundStyle(.white.opacity(0.5))
          .multilineTextAlignment(.center)
          .padding(.horizontal, 24)
          .padding(.bottom, 20)
      }
    }
    .toolbar(.hidden, for: .navigationBar)
    .sheet(isPresented: $showSignupInfo) {
      SignupInfoView()
    }
    .sheet(isPresented: $showIapSubscribe) {
      IapSubscribeSheet(client: client, onCompleted: onSignedIn)
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }
  }

  private var canSubmit: Bool {
    !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !password.isEmpty
  }

  private func signIn() async {
    busy = true
    message = nil
    defer { busy = false }
    do {
      try await client.auth.signIn(
        email: email.trimmingCharacters(in: .whitespacesAndNewlines),
        password: password
      )
      await onSignedIn()
    } catch {
      message = "\(TrStrings.Auth.signInFailed): \(error.localizedDescription)"
    }
  }
}

private enum LoginBrand {
  /// Logo ile uyumlu koyu lacivert arka plan
  static let bgTop = Color(red: 0.07, green: 0.10, blue: 0.18)
  static let bgBottom = Color(red: 0.04, green: 0.06, blue: 0.11)
  /// Açık mavi vurgu (glyph / ikon mavisi)
  static let accent = Color(red: 0.25, green: 0.55, blue: 0.96)
  static let accentDisabled = Color(red: 0.25, green: 0.55, blue: 0.96).opacity(0.35)
  static let fieldFill = Color.white.opacity(0.08)
  static let fieldBorder = Color.white.opacity(0.14)
}

private struct SignupInfoView: View {
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 16) {
          Text(TrStrings.Signup.title)
            .font(.headline)
          Text(TrStrings.Signup.intro)
            .font(.body)
            .foregroundStyle(.primary)
          Text(TrStrings.Signup.customersNote)
            .font(.subheadline)
            .foregroundStyle(.secondary)
          Text(TrStrings.Auth.noPublicSignup)
            .font(.footnote)
            .foregroundStyle(.secondary)
          Text(TrStrings.Auth.landingOnlyOnWeb)
            .font(.caption)
            .foregroundStyle(.tertiary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .navigationTitle(TrStrings.Auth.aboutSignup)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button(TrStrings.Common.cancel) {
            dismiss()
          }
        }
      }
    }
  }
}
