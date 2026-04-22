import SwiftUI

/// Alt `safeAreaInset` tab bar ile List/Form kaydırma içeriğinin çakışmaması için ek alt marj.
enum FieldTabBarChrome {
  /// `FieldQuickTabBar` yüksekliği + home indicator; 22 pt yetersizdi (son «Kaydet» satırı tab bar altında kalıyordu).
  static let listContentExtraBottom: CGFloat = 120
  static let insetSpacingAboveBar: CGFloat = 6
}

private struct FieldTabBarScrollContentInsetModifier: ViewModifier {
  func body(content: Content) -> some View {
    content.contentMargins(.bottom, FieldTabBarChrome.listContentExtraBottom, for: .scrollContent)
  }
}

extension View {
  func fieldTabBarScrollContentInset() -> some View {
    modifier(FieldTabBarScrollContentInsetModifier())
  }
}
