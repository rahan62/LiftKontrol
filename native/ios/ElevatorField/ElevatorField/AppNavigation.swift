import Foundation

/// Mirrors `src/components/layout/app-nav-config.ts` (primary sidebar) plus other top-level `/app/*` pages.
/// Web path is the Next.js route; implement screens one-by-one in `MainShellView`.
struct AppRoute: Hashable, Identifiable {
  var id: String { webPath }

  /// Next.js path under /app (e.g. `/app/customers`).
  let webPath: String
  let title: String
  let systemImage: String

  /// Primary navigation (same order as web `appNavItems`).
  static let sidebar: [AppRoute] = [
    AppRoute(webPath: "/app", title: "Panel", systemImage: "rectangle.split.2x1"),
    AppRoute(webPath: "/app/customers", title: "Müşteriler", systemImage: "person.2"),
    AppRoute(webPath: "/app/accounting", title: "Muhasebe", systemImage: "function"),
    AppRoute(webPath: "/app/sites", title: "Saha / Binalar", systemImage: "mappin.and.ellipse"),
    AppRoute(webPath: "/app/assets", title: "Asansörler", systemImage: "building.2"),
    AppRoute(webPath: "/app/contracts", title: "Sözleşmeler", systemImage: "doc.text"),
    AppRoute(webPath: "/app/maintenance", title: "Bakım", systemImage: "list.clipboard"),
    AppRoute(webPath: "/app/revision-articles", title: "EN 81-20 maddeleri", systemImage: "bookmark"),
    AppRoute(webPath: "/app/periodic-controls", title: "Periyodik kontroller", systemImage: "checklist"),
    AppRoute(webPath: "/app/revisions", title: "Revizyonlar", systemImage: "square.stack.3d.up"),
    AppRoute(webPath: "/app/work-orders", title: "İş emirleri", systemImage: "wrench.and.screwdriver"),
    AppRoute(webPath: "/app/callbacks", title: "Geri aramalar", systemImage: "phone"),
    AppRoute(webPath: "/app/schedule", title: "Program / Sevkiyat", systemImage: "truck.box"),
    AppRoute(webPath: "/app/documents", title: "Belgeler", systemImage: "folder"),
    AppRoute(webPath: "/app/settings", title: "Ayarlar", systemImage: "gearshape"),
  ]

  /// Extra top-level pages that exist in the web app but are not in `appNavItems`.
  static let additional: [AppRoute] = []

  /// Form / nested routes to implement after list screens (matches common `*/new`, `*/[id]` pages).
  static let nestedExamples: [AppRoute] = [
    AppRoute(webPath: "/app/customers/new", title: "· Müşteri ekle", systemImage: "plus.circle"),
    AppRoute(webPath: "/app/sites/new", title: "· Saha ekle", systemImage: "plus.circle"),
    AppRoute(webPath: "/app/assets/new", title: "· Asansör ekle", systemImage: "plus.circle"),
    AppRoute(webPath: "/app/contracts/new", title: "· Sözleşme ekle", systemImage: "plus.circle"),
    AppRoute(webPath: "/app/accounting/entries/new", title: "· Muhasebe kaydı", systemImage: "plus.circle"),
    AppRoute(webPath: "/app/periodic-controls/new", title: "· Periyodik kontrol", systemImage: "plus.circle"),
    AppRoute(webPath: "/app/work-orders/new", title: "· Yeni iş emri", systemImage: "plus.circle"),
    AppRoute(webPath: "/app/work-orders/[id]", title: "· İş emri detayı", systemImage: "number"),
    AppRoute(webPath: "/app/customers/[id]", title: "· Müşteri detayı", systemImage: "person.crop.circle"),
    AppRoute(webPath: "/app/sites/[id]", title: "· Saha detayı", systemImage: "mappin.circle"),
    AppRoute(webPath: "/app/assets/[id]", title: "· Asansör detayı", systemImage: "cube"),
    AppRoute(webPath: "/app/revisions/[id]", title: "· Revizyon detayı", systemImage: "doc.richtext"),
    AppRoute(webPath: "/app/periodic-controls/[id]", title: "· Kontrol detayı", systemImage: "checklist"),
  ]

  static var allGroupedForPlaceholder: [String: [AppRoute]] {
    var groups: [String: [AppRoute]] = [
      "Menü": sidebar,
      "Detay / formlar (sırayla)": nestedExamples,
    ]
    if !additional.isEmpty {
      groups["Diğer sayfalar"] = additional
    }
    return groups
  }

  /// Panel özet satırları ve kısayollar için `webPath` → rota.
  static var allNavigableRoutes: [AppRoute] {
    sidebar + additional + nestedExamples
  }
}
