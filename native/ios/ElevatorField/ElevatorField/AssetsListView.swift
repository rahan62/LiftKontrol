import SwiftUI
import Supabase

struct AssetsListView: View {
  let client: SupabaseClient

  @State private var rows: [AssetListRowDTO] = []
  @State private var loadError: String?
  @State private var loading = true

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.Assets.listTitle, systemImage: "building.2", description: Text(loadError))
      } else if rows.isEmpty {
        ContentUnavailableView(TrStrings.Assets.listTitle, systemImage: "building.2", description: Text(TrStrings.Assets.empty))
      } else {
        List(rows) { row in
          NavigationLink {
            AssetDetailView(client: client, assetId: row.id)
          } label: {
            VStack(alignment: .leading, spacing: 4) {
              Text(row.unitCode)
                .font(.headline)
              Text(row.brandModelLine)
                .font(.caption)
                .foregroundStyle(.secondary)
              HStack {
                Text(row.siteDisplayName)
                  .font(.caption2)
                  .foregroundStyle(.tertiary)
                Spacer()
                if row.unsafeFlag {
                  Text(TrStrings.Assets.unsafe)
                    .font(.caption2)
                    .foregroundStyle(.red)
                }
              }
            }
          }
        }
      }
    }
    .navigationTitle(TrStrings.Assets.listTitle)
    .toolbar {
      ToolbarItem(placement: .primaryAction) {
        NavigationLink {
          AssetCreateView(client: client)
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
      let response: PostgrestResponse<[AssetListRowDTO]> = try await client
        .from("elevator_assets")
        .select("id, unit_code, brand, model, operational_status, unsafe_flag, site_id, sites(name)")
        .eq("tenant_id", value: tenantId)
        .order("unit_code", ascending: true)
        .execute()
      rows = response.value
    } catch {
      loadError = error.localizedDescription
    }
  }
}

private struct AssetListRowDTO: Decodable, Identifiable {
  let id: UUID
  let unitCode: String
  let brand: String?
  let model: String?
  let operationalStatus: String
  let unsafeFlag: Bool
  let siteId: UUID
  let sites: SiteNameEmbed?

  enum CodingKeys: String, CodingKey {
    case id
    case unitCode = "unit_code"
    case brand, model
    case operationalStatus = "operational_status"
    case unsafeFlag = "unsafe_flag"
    case siteId = "site_id"
    case sites
  }

  struct SiteNameEmbed: Decodable {
    let name: String?
  }

  var siteDisplayName: String {
    sites?.name ?? "—"
  }

  var brandModelLine: String {
    let b = brand?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let m = model?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    if b.isEmpty, m.isEmpty {
      return operationalStatus
    }
    if b.isEmpty { return m }
    if m.isEmpty { return b }
    return "\(b) · \(m)"
  }
}
