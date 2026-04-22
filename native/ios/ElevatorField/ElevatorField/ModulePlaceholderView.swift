import SwiftUI

/// Until the native screen is implemented, show web parity path for QA / deep-link planning.
struct ModulePlaceholderView: View {
  let route: AppRoute

  var body: some View {
    ContentUnavailableView {
      Label(route.title, systemImage: route.systemImage)
    } description: {
      VStack(alignment: .leading, spacing: 8) {
        Text(TrStrings.Module.placeholderDescription)
          .font(.subheadline)
          .foregroundStyle(.secondary)
        Text("\(TrStrings.Module.webRoutePrefix) \(route.webPath)")
          .font(.caption)
          .textSelection(.enabled)
          .foregroundStyle(.tertiary)
      }
      .frame(maxWidth: .infinity)
    }
    .navigationTitle(route.title)
    .navigationBarTitleDisplayMode(.inline)
    .fieldTabBarScrollContentInset()
  }
}
