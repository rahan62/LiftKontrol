import Foundation

/// Web `tenant_members.system_role` → iOS menü kapsamı (şimdilik iki seviye: yönetici / teknisyen).
enum WorkspaceAccess: Equatable {
  case admin
  case technician

  /// Teknisyen veya portal: yalnızca bu rollerden oluşan üyelikler → dar menü. Aksi halde tam menü.
  /// Not: Roller küçük harfe çevrilir (DB / istemci farkı). Üyelik satırları sorguda **yalnızca oturum kullanıcısı** filtrelenmeli;
  /// aksi halde RLS kiracıdaki herkesin satırını döndürür ve herkes yönetici menüsü görür.
  static func resolve(systemRoles: [String]) -> WorkspaceAccess {
    let normalized = systemRoles
      .map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
      .filter { !$0.isEmpty }
    // Üyelik yoksa geniş menü vermeyelim (yanlış pozitif riski).
    guard !normalized.isEmpty else { return .technician }

    let techOnly: Set<String> = ["technician", "customer_portal_user"]
    let allTechLike = normalized.allSatisfy { techOnly.contains($0) }
    return allTechLike ? .technician : .admin
  }

  /// Teknisyen / portal: yalnızca saha, asansör, bakım, program, iş emirleri (+ gerekli detay rotaları).
  static let technicianWebPaths: Set<String> = [
    "/app/sites",
    "/app/sites/[id]",
    "/app/assets",
    "/app/assets/[id]",
    "/app/maintenance",
    "/app/schedule",
    "/app/schedule/clusters",
    "/app/work-orders",
    "/app/work-orders/new",
    "/app/work-orders/[id]",
  ]

  /// Menüde gösterim sırası (sidebar sırasından bağımsız).
  static let technicianPrimaryMenuPaths: [String] = [
    "/app/sites",
    "/app/assets",
    "/app/maintenance",
    "/app/schedule",
    "/app/work-orders",
  ]

  func includes(route: AppRoute) -> Bool {
    switch self {
    case .admin:
      return true
    case .technician:
      return Self.technicianWebPaths.contains(route.webPath)
    }
  }

  /// Web `canCreateElevatorRevisionForRole` ile aynı: teknisyen ve portal kullanıcıları oluşturamaz.
  static func canCreateRevisions(systemRole: String) -> Bool {
    let r = systemRole.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    return r != "technician" && r != "customer_portal_user"
  }
}
