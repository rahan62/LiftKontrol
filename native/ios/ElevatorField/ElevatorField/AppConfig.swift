import Foundation

enum AppConfig {
  /// Raw value from Info.plist (after build setting substitution).
  static var rawSupabaseURLString: String? {
    (Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String)?
      .trimmingCharacters(in: .whitespacesAndNewlines)
  }

  static var supabaseURL: URL? {
    guard var s = rawSupabaseURLString, !s.isEmpty else { return nil }
    s = s.trimmingCharacters(in: .whitespacesAndNewlines)
    if (s.hasPrefix("'") && s.hasSuffix("'")) || (s.hasPrefix("\"") && s.hasSuffix("\"")) {
      s.removeFirst()
      s.removeLast()
      s = s.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    // xcconfig cannot contain `//` (starts a comment). Build may emit this workaround:
    s = s.replacingOccurrences(of: "https:/$()/", with: "https://")
    s = s.replacingOccurrences(of: "http:/$()/", with: "http://")
    // Common mistake: pasting DATABASE_URL (Postgres) instead of the REST API URL.
    if s.lowercased().hasPrefix("postgresql:") || s.lowercased().hasPrefix("postgres:") {
      return nil
    }
    // If someone used plain `https://` in xcconfig, `//` may have been treated as a comment — value becomes `https:`.
    if s == "https:" || s == "http:" {
      return nil
    }
    guard !s.contains("REPLACE_ME") else { return nil }
    guard let url = URL(string: s), url.host != nil else { return nil }
    guard let scheme = url.scheme?.lowercased(), scheme == "https" || scheme == "http" else { return nil }
    return url
  }

  static var supabaseAnonKey: String? {
    guard var k = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String else { return nil }
    k = k.trimmingCharacters(in: .whitespacesAndNewlines)
    if (k.hasPrefix("'") && k.hasSuffix("'")) || (k.hasPrefix("\"") && k.hasSuffix("\"")) {
      k.removeFirst()
      k.removeLast()
      k = k.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    guard !k.isEmpty, !k.contains("REPLACE_ME") else { return nil }
    return k
  }

  static var isPostgresURLMisconfiguration: Bool {
    guard let raw = rawSupabaseURLString else { return false }
    let l = raw.lowercased()
    return l.hasPrefix("postgresql:") || l.hasPrefix("postgres:")
  }

  /// Türkçe kullanıcı mesajı (`TrStrings.ConfigHints` ile hizalı).
  static var configurationHint: String {
    isPostgresURLMisconfiguration ? TrStrings.ConfigHints.postgresUrlHint : TrStrings.ConfigHints.genericHint
  }

  /// Web panel kök adresi; yeni asansör kaydında QR metni (`qr_payload`) için kullanılır. Web’deki `NEXT_PUBLIC_APP_URL` ile aynı olmalıdır.
  static var publicAppWebBaseURL: String? {
    guard var s = Bundle.main.object(forInfoDictionaryKey: "PUBLIC_APP_URL") as? String else { return nil }
    s = s.trimmingCharacters(in: .whitespacesAndNewlines)
    if (s.hasPrefix("'") && s.hasSuffix("'")) || (s.hasPrefix("\"") && s.hasSuffix("\"")) {
      s.removeFirst()
      s.removeLast()
      s = s.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    s = s.replacingOccurrences(of: "https:/$()/", with: "https://")
    s = s.replacingOccurrences(of: "http:/$()/", with: "http://")
    guard !s.isEmpty else { return nil }
    guard !s.contains("REPLACE_ME") else { return nil }
    if s == "https:" || s == "http:" { return nil }
    guard let url = URL(string: s), url.host != nil else { return nil }
    guard let scheme = url.scheme?.lowercased(), scheme == "https" || scheme == "http" else { return nil }
    var out = s.trimmingCharacters(in: .whitespacesAndNewlines)
    while out.hasSuffix("/") { out.removeLast() }
    return out.isEmpty ? nil : out
  }

  /// Web `src/app/privacy` — App Store “Privacy Policy URL” alanı ile aynı rota.
  static var marketingPrivacyPolicyURL: URL? {
    guard let base = publicAppWebBaseURL else { return nil }
    return URL(string: base + "/privacy")
  }

  /// Apple’ın standart lisans metni; App Açıklaması veya metadata’da EULA olarak verilebilen işlevsel bağlantı.
  static let appStoreStandardEULAURL = URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!
}
