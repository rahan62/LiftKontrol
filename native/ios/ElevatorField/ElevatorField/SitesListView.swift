import SwiftUI
import Supabase

struct SitesListView: View {
  let client: SupabaseClient

  @State private var rows: [SiteListRowDTO] = []
  @State private var loadError: String?
  @State private var loading = true

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.Sites.title, systemImage: "mappin.and.ellipse", description: Text(loadError))
      } else if rows.isEmpty {
        ContentUnavailableView(TrStrings.Sites.title, systemImage: "mappin.and.ellipse", description: Text(TrStrings.Sites.empty))
      } else {
        List(rows) { row in
          NavigationLink {
            SiteDetailView(client: client, siteId: row.id)
          } label: {
            VStack(alignment: .leading, spacing: 4) {
              Text(row.name)
                .font(.headline)
              Text("\(TrStrings.Assets.customerParty): \(row.customerDisplayName)")
                .font(.caption)
                .foregroundStyle(.secondary)
              if let u = row.updatedAtShort {
                Text("\(TrStrings.Sites.updated): \(u)")
                  .font(.caption2)
                  .foregroundStyle(.tertiary)
              }
            }
          }
        }
      }
    }
    .navigationTitle(TrStrings.Sites.title)
    .toolbar {
      ToolbarItem(placement: .primaryAction) {
        NavigationLink {
          SiteCreateView(client: client)
        } label: {
          Image(systemName: "plus")
        }
      }
    }
    .fieldTabBarScrollContentInset()
    .task { await load() }
  }

  private func load() async {
    loading = true
    loadError = nil
    defer { loading = false }
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else {
        rows = []
        return
      }
      let response: PostgrestResponse<[SiteListRowDTO]> = try await client
        .from("sites")
        .select("id, name, customer_id, updated_at, customers(legal_name)")
        .eq("tenant_id", value: tenantId)
        .order("name", ascending: true)
        .execute()
      rows = response.value
    } catch {
      loadError = error.localizedDescription
    }
  }
}

private struct SiteListRowDTO: Decodable, Identifiable {
  let id: UUID
  let name: String
  let customerId: UUID
  let updatedAt: String?
  let customers: CustomerNameEmbed?

  enum CodingKeys: String, CodingKey {
    case id, name, customers
    case customerId = "customer_id"
    case updatedAt = "updated_at"
  }

  struct CustomerNameEmbed: Decodable {
    let legalName: String?
    enum CodingKeys: String, CodingKey {
      case legalName = "legal_name"
    }
  }

  var customerDisplayName: String {
    customers?.legalName ?? "—"
  }

  var updatedAtShort: String? {
    guard let updatedAt else { return nil }
    return String(updatedAt.prefix(10))
  }
}
