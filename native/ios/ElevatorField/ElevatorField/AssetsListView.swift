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
      loadError = Self.userFacingListError(error)
    }
  }

  private static func userFacingListError(_ error: Error) -> String {
    if let pe = error as? PostgrestError, pe.code == "PGRST116" {
      return TrStrings.Assets.listLoadPostgrestAmbiguous
    }
    return error.localizedDescription
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

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id = try c.decode(UUID.self, forKey: .id)
    unitCode = try c.decode(String.self, forKey: .unitCode)
    brand = try c.decodeIfPresent(String.self, forKey: .brand)
    model = try c.decodeIfPresent(String.self, forKey: .model)
    operationalStatus = try c.decode(String.self, forKey: .operationalStatus)
    unsafeFlag = try c.decode(Bool.self, forKey: .unsafeFlag)
    siteId = try c.decode(UUID.self, forKey: .siteId)
    if c.contains(.sites) {
      if let one = try? c.decode(SiteNameEmbed.self, forKey: .sites) {
        sites = one
      } else if let arr = try? c.decode([SiteNameEmbed].self, forKey: .sites) {
        sites = arr.first
      } else {
        sites = nil
      }
    } else {
      sites = nil
    }
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
