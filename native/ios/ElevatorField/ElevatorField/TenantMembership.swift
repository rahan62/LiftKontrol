import Foundation
import Supabase

/// Rows from `tenant_members`. RLS kiracıdaki diğer üyeleri de gösterebilir; sorguda `user_id = auth.uid()` kullanın.
struct TenantMembershipRow: Decodable {
  let id: UUID
  let tenantId: UUID
  let systemRole: String

  enum CodingKeys: String, CodingKey {
    case id
    case tenantId = "tenant_id"
    case systemRole = "system_role"
  }
}

enum TenantScope {
  private static func currentUserId(client: SupabaseClient) async throws -> UUID {
    try await client.auth.session.user.id
  }

  /// Web oturumunda tek kiracı seçilir; mobilde şimdilik bu kullanıcının ilk aktif üyeliği.
  static func firstTenantId(client: SupabaseClient) async throws -> UUID? {
    let uid = try await currentUserId(client: client)
    let response: PostgrestResponse<[TenantMembershipRow]> = try await client
      .from("tenant_members")
      .select("id, tenant_id, system_role")
      .eq("user_id", value: uid)
      .eq("is_active", value: true)
      .order("joined_at", ascending: true)
      .limit(1)
      .execute()
    return response.value.first?.tenantId
  }

  static func firstMembership(client: SupabaseClient) async throws -> TenantMembershipRow? {
    let uid = try await currentUserId(client: client)
    let response: PostgrestResponse<[TenantMembershipRow]> = try await client
      .from("tenant_members")
      .select("id, tenant_id, system_role")
      .eq("user_id", value: uid)
      .eq("is_active", value: true)
      .order("joined_at", ascending: true)
      .limit(1)
      .execute()
    return response.value.first
  }

  /// Menü RBAC: yalnızca oturum kullanıcısının aktif `system_role` değerleri (kiracıdaki diğer üyeleri dahil etmeyin).
  static func myActiveSystemRoles(client: SupabaseClient) async throws -> [String] {
    let uid = try await currentUserId(client: client)
    let response: PostgrestResponse<[RoleOnlyRow]> = try await client
      .from("tenant_members")
      .select("system_role")
      .eq("user_id", value: uid)
      .eq("is_active", value: true)
      .execute()
    return response.value.map(\.systemRole)
  }

  private struct RoleOnlyRow: Decodable {
    let systemRole: String
    enum CodingKeys: String, CodingKey {
      case systemRole = "system_role"
    }
  }
}
