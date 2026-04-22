import Foundation

/// `elevator_assets.en8120_next_control_due` Postgres `date` — yalnızca `yyyy-MM-dd` gönderilir.
enum En8120NextControlDueFormatting {
  private static let gregorian = Calendar(identifier: .gregorian)

  /// Takvimden seçilen günü yerel takvim bileşenleriyle `yyyy-MM-dd` yapar (UTC kayması yok).
  static func postgresDateString(from date: Date, calendar: Calendar = .current) -> String? {
    let c = calendar.dateComponents([.year, .month, .day], from: date)
    guard let y = c.year, let m = c.month, let d = c.day else { return nil }
    guard y >= 1900 && y <= 2200, m >= 1 && m <= 12, d >= 1 && d <= 31 else { return nil }
    guard isValidGregorianDay(year: y, month: m, day: d) else { return nil }
    return String(format: "%04d-%02d-%02d", y, m, d)
  }

  /// Kullanıcı veya API metninden güvenli tarih: ISO `yyyy-MM-dd`, `gg.aa.yyyy`, `gg/aa/yyyy` (isteğe bağlı 2 haneli yıl).
  static func normalizedPostgresDate(fromUserInput raw: String) -> String? {
    let s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    if s.isEmpty { return nil }
    let head = String(s.prefix { $0 != "T" && $0 != " " }.prefix(10))
    if let ymd = parseIsoYmd(head) { return ymd }
    let compact = s.replacingOccurrences(of: " ", with: "")
    if let ymd = parseDmy(compact) { return ymd }
    return nil
  }

  /// Kayıtlı değerden `DatePicker` başlangıcı; çözülemezse bugün (gün başı).
  static func pickerDate(stored: String?, calendar: Calendar = .current) -> Date {
    guard let stored, !stored.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      return calendar.startOfDay(for: Date())
    }
    guard let norm = normalizedPostgresDate(fromUserInput: stored),
          let parts = splitYmd(norm),
          let date = calendar.date(from: DateComponents(year: parts.y, month: parts.m, day: parts.d))
    else {
      return calendar.startOfDay(for: Date())
    }
    return calendar.startOfDay(for: date)
  }

  static func hasStoredDate(_ stored: String?) -> Bool {
    guard let s = stored?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty else { return false }
    return normalizedPostgresDate(fromUserInput: s) != nil
  }

  // MARK: - Private

  private static func splitYmd(_ ymd: String) -> (y: Int, m: Int, d: Int)? {
    let p = ymd.split(separator: "-")
    guard p.count == 3,
          let y = Int(p[0]), let m = Int(p[1]), let d = Int(p[2]) else { return nil }
    return (y, m, d)
  }

  private static func parseIsoYmd(_ s: String) -> String? {
    let p = "^([0-9]{4})-([0-9]{2})-([0-9]{2})$"
    guard let re = try? NSRegularExpression(pattern: p),
          let m = re.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)),
          m.numberOfRanges == 4,
          let yR = Range(m.range(at: 1), in: s),
          let moR = Range(m.range(at: 2), in: s),
          let dR = Range(m.range(at: 3), in: s),
          let y = Int(s[yR]), let mo = Int(s[moR]), let d = Int(s[dR])
    else { return nil }
    guard isValidGregorianDay(year: y, month: mo, day: d) else { return nil }
    return String(format: "%04d-%02d-%02d", y, mo, d)
  }

  /// Gün.ay.yıl veya gün/ay/yıl (Türkiye).
  private static func parseDmy(_ s: String) -> String? {
    let unified = s.replacingOccurrences(of: "/", with: ".")
    let bits = unified.split(separator: ".").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    guard bits.count == 3,
          let d = Int(bits[0]),
          let m = Int(bits[1])
    else { return nil }
    let yRaw = String(bits[2])
    guard let yNum = Int(yRaw) else { return nil }
    let y: Int
    if yRaw.count == 2 {
      y = yNum >= 70 ? 1900 + yNum : 2000 + yNum
    } else {
      y = yNum
    }
    guard isValidGregorianDay(year: y, month: m, day: d) else { return nil }
    return String(format: "%04d-%02d-%02d", y, m, d)
  }

  private static func isValidGregorianDay(year y: Int, month m: Int, day d: Int) -> Bool {
    guard y >= 1900 && y <= 2200, m >= 1 && m <= 12, d >= 1 && d <= 31 else { return false }
    var comp = DateComponents()
    comp.year = y
    comp.month = m
    comp.day = d
    guard let date = gregorian.date(from: comp) else { return false }
    let check = gregorian.dateComponents([.year, .month, .day], from: date)
    return check.year == y && check.month == m && check.day == d
  }
}
