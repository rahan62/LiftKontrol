import SwiftUI

/// Web `/app/onboarding` — kiracı üyeliği yokken.
struct OnboardingView: View {
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        Text(TrStrings.Onboarding.title)
          .font(.title2.bold())
        Text(TrStrings.Onboarding.body)
          .font(.body)
          .foregroundStyle(.primary)
        Text(TrStrings.Onboarding.hint)
          .font(.subheadline)
          .foregroundStyle(.secondary)
        Text(TrStrings.Auth.landingOnlyOnWeb)
          .font(.caption)
          .foregroundStyle(.tertiary)
        Text(TrStrings.Onboarding.signOutViaMenu)
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding()
    }
    .navigationTitle(TrStrings.Layout.awaitingTenant)
    .navigationBarTitleDisplayMode(.inline)
    .fieldTabBarScrollContentInset()
  }
}
