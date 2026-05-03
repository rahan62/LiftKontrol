import CoreImage
import CoreImage.CIFilterBuiltins
import SwiftUI
import UIKit

struct ShareSheet: UIViewControllerRepresentable {
  let items: [Any]

  func makeUIViewController(context: Context) -> UIActivityViewController {
    UIActivityViewController(activityItems: items, applicationActivities: nil)
  }

  func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

/// Web `canonicalElevatorUrl` + asset sayfası `qrUrl` seçimi ile aynı mantık.
enum ElevatorQrUrl {
  static func resolved(publicBase: String?, qrPayload: String?, assetId: UUID) -> String {
    let trimmed = qrPayload?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    if !trimmed.isEmpty { return trimmed }
    let path = "/go/\(assetId.uuidString.lowercased())"
    guard let root = normalizedRoot(publicBase), !root.isEmpty else { return path }
    return "\(root)\(path)"
  }

  private static func normalizedRoot(_ publicBase: String?) -> String? {
    guard let s = publicBase?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty else { return nil }
    var out = s
    while out.hasSuffix("/") { out.removeLast() }
    return out.isEmpty ? nil : out
  }
}

enum ElevatorQrImage {
  /// Tek bağlam — her QR için `CIContext()` oluşturmak ana iş parçacığında belirgin maliyet yaratır.
  private static let ciContext = CIContext(options: nil)

  /// QR modülleri net kalsın diye ölçeklenmiş bitmap (web `qrcode` genişliği ~400 px ile uyumlu).
  static func image(for string: String, pointWidth: CGFloat = 400) -> UIImage? {
    let data = Data(string.utf8)
    let filter = CIFilter.qrCodeGenerator()
    filter.message = data
    filter.correctionLevel = "M"
    guard let raw = filter.outputImage else { return nil }
    let scale = pointWidth / raw.extent.width
    let scaled = raw.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    guard let cg = ciContext.createCGImage(scaled, from: scaled.extent) else { return nil }
    return UIImage(cgImage: cg, scale: 1, orientation: .up)
  }
}

/// Web `elevator-print-tag-button.tsx` düzeni (900×…, QR 400, paddings).
enum ElevatorPrintTagImage {
  private static let tagW: CGFloat = 900
  private static let padX: CGFloat = 56
  private static let padTop: CGFloat = 52
  private static let padBottom: CGFloat = 52
  private static let qrSize: CGFloat = 400
  private static let gapQrToId: CGFloat = 30
  private static let gapIdToSite: CGFloat = 24
  private static let idFontSize: CGFloat = 14
  private static let siteFontSize: CGFloat = 19
  private static let idLineHeight: CGFloat = 20
  private static let siteLineHeight: CGFloat = 28

  static func make(qrUrl: String, elevatorId: UUID, siteName: String?, noneLabel: String) -> UIImage? {
    guard let qrImage = ElevatorQrImage.image(for: qrUrl, pointWidth: qrSize) else { return nil }
    let idLines = Self.idLines(elevatorId.uuidString.lowercased())
    let siteLines = Self.wrapSiteLabel(
      displaySite(siteName, noneLabel: noneLabel),
      maxWidth: tagW - padX * 2,
      font: .systemFont(ofSize: siteFontSize, weight: .semibold)
    )

    let height =
      padTop + qrSize + gapQrToId + CGFloat(idLines.count) * idLineHeight + gapIdToSite
        + CGFloat(siteLines.count) * siteLineHeight + padBottom

    let format = UIGraphicsImageRendererFormat()
    format.scale = 2
    format.opaque = true

    let renderer = UIGraphicsImageRenderer(size: CGSize(width: tagW, height: height), format: format)
    return renderer.image { rc in
      UIColor.white.setFill()
      rc.fill(CGRect(x: 0, y: 0, width: tagW, height: height))

      let qrX = (tagW - qrSize) / 2
      qrImage.draw(in: CGRect(x: qrX, y: padTop, width: qrSize, height: qrSize))

      let paragraphCenter = NSMutableParagraphStyle()
      paragraphCenter.alignment = .center

      var y = padTop + qrSize + gapQrToId
      let idAttrs: [NSAttributedString.Key: Any] = [
        .font: UIFont.monospacedDigitSystemFont(ofSize: idFontSize, weight: .medium),
        .foregroundColor: UIColor(red: 15 / 255, green: 23 / 255, blue: 42 / 255, alpha: 1),
        .paragraphStyle: paragraphCenter,
      ]
      for line in idLines {
        let r = CGRect(x: padX, y: y, width: tagW - padX * 2, height: idLineHeight)
        (line as NSString).draw(with: r, options: [.usesLineFragmentOrigin], attributes: idAttrs, context: nil)
        y += idLineHeight
      }

      y += gapIdToSite
      let siteAttrs: [NSAttributedString.Key: Any] = [
        .font: UIFont.systemFont(ofSize: siteFontSize, weight: .semibold),
        .foregroundColor: UIColor(red: 15 / 255, green: 23 / 255, blue: 42 / 255, alpha: 1),
        .paragraphStyle: paragraphCenter,
      ]
      for line in siteLines {
        let r = CGRect(x: padX, y: y, width: tagW - padX * 2, height: siteLineHeight)
        (line as NSString).draw(with: r, options: [.usesLineFragmentOrigin], attributes: siteAttrs, context: nil)
        y += siteLineHeight
      }
    }
  }

  private static func displaySite(_ siteName: String?, noneLabel: String) -> String {
    let s = siteName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    return s.isEmpty ? noneLabel : s
  }

  private static func idLines(_ id: String) -> [String] {
    let s = id.trimmingCharacters(in: .whitespacesAndNewlines)
    if s.isEmpty { return [TrStrings.Common.none] }
    var lines: [String] = []
    let chunk = 30
    var i = s.startIndex
    while i < s.endIndex {
      let end = s.index(i, offsetBy: chunk, limitedBy: s.endIndex) ?? s.endIndex
      lines.append(String(s[i ..< end]))
      i = end
    }
    return lines
  }

  private static func wrapSiteLabel(_ text: String, maxWidth: CGFloat, font: UIFont) -> [String] {
    let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
    if t.isEmpty { return [TrStrings.Common.none] }

    let words = t.split(whereSeparator: \.isWhitespace).map(String.init)
    var lines: [String] = []
    var line = ""
    for word in words {
      let candidate = line.isEmpty ? word : "\(line) \(word)"
      let w = (candidate as NSString).size(withAttributes: [.font: font]).width
      if w <= maxWidth {
        line = candidate
        continue
      }
      if !line.isEmpty {
        lines.append(line)
        line = ""
      }
      let wordW = (word as NSString).size(withAttributes: [.font: font]).width
      if wordW <= maxWidth {
        line = word
        continue
      }
      var rest = word
      while !rest.isEmpty {
        var n = rest.count
        while n > 1 {
          let prefix = String(rest.prefix(n))
          if (prefix as NSString).size(withAttributes: [.font: font]).width <= maxWidth { break }
          n -= 1
        }
        if n < 1 { n = 1 }
        let take = String(rest.prefix(n))
        lines.append(take)
        rest = String(rest.dropFirst(n))
      }
    }
    if !line.isEmpty { lines.append(line) }
    return lines.isEmpty ? [TrStrings.Common.none] : lines
  }
}
