import SwiftUI
import Supabase

/// Web `/app/schedule/clusters` — `tenant_route_cluster_state` özet listesi.
struct ScheduleClustersView: View {
  let client: SupabaseClient

  @State private var radiusKm: Double = 2
  @State private var maxUnitsDisplay: Int = 10
  @State private var clusters: [ClusterItemRow] = []
  @State private var updatedAt: String?
  @State private var loading = true
  @State private var loadError: String?

  private struct ClusterItemRow: Identifiable {
    let id: Int
    let assetIds: [UUID]
    var memberCount: Int { assetIds.count }
  }

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(
          TrStrings.Schedule.clustersTitle,
          systemImage: "circle.hexagongrid",
          description: Text(loadError)
        )
      } else if clusters.isEmpty {
        ContentUnavailableView(
          TrStrings.Schedule.clustersTitle,
          systemImage: "circle.hexagongrid",
          description: Text(TrStrings.Schedule.clustersEmpty)
        )
      } else {
        List {
          Section {
            Text(String(format: TrStrings.Schedule.clustersRadiusFmt, radiusKm))
              .font(.caption)
              .foregroundStyle(.secondary)
            Text(String(format: TrStrings.Schedule.clustersMaxUnitsFmt, maxUnitsDisplay))
              .font(.caption)
              .foregroundStyle(.secondary)
            if let updatedAt {
              Text("\(TrStrings.Schedule.clustersUpdated): \(updatedAt)")
                .font(.caption2)
                .foregroundStyle(.tertiary)
            }
          }
          ForEach(clusters) { c in
            Section("\(TrStrings.Schedule.clusterIndex) #\(c.id + 1) — \(c.memberCount) ünite") {
              ForEach(c.assetIds, id: \.self) { aid in
                NavigationLink {
                  AssetDetailView(client: client, assetId: aid)
                } label: {
                  Text(aid.uuidString.prefix(8) + "…")
                    .font(.caption.monospaced())
                }
              }
            }
          }
        }
      }
    }
    .navigationTitle(TrStrings.Schedule.clustersTitle)
    .navigationBarTitleDisplayMode(.inline)
    .fieldTabBarScrollContentInset()
    .task { await load() }
    .refreshable {
      await FieldRoutePlanningSync.triggerClusterRecompute(client: client)
      await load()
    }
  }

  private func load() async {
    loading = true
    loadError = nil
    defer { loading = false }
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else {
        loadError = TrStrings.Maintenance.noTenant
        clusters = []
        return
      }
      try await fetchAndApplyClusters(tenantId: tenantId)
      if clusters.isEmpty {
        await FieldRoutePlanningSync.triggerClusterRecompute(client: client)
        try await fetchAndApplyClusters(tenantId: tenantId)
      }
      if clusters.isEmpty {
        try await RouteClusterLocalRebuilder.rebuildAndPersist(client: client, tenantId: tenantId)
        try await fetchAndApplyClusters(tenantId: tenantId)
      }
      try? await fetchMaxUnitsForDisplay(tenantId: tenantId)
    } catch {
      loadError = error.localizedDescription
      clusters = []
    }
  }

  private func fetchMaxUnitsForDisplay(tenantId: UUID) async throws {
    struct Row: Decodable {
      let value: PlanningVal?
    }
    struct PlanningVal: Decodable {
      let max_units_per_cluster: Int?
      enum CodingKeys: String, CodingKey {
        case max_units_per_cluster
      }
      init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let i = try? c.decode(Int.self, forKey: .max_units_per_cluster) {
          max_units_per_cluster = i
        } else if let d = try? c.decode(Double.self, forKey: .max_units_per_cluster) {
          max_units_per_cluster = Int(d)
        } else {
          max_units_per_cluster = nil
        }
      }
    }
    let res: PostgrestResponse<[Row]> = try await client
      .from("tenant_settings")
      .select("value")
      .eq("tenant_id", value: tenantId)
      .eq("key", value: "route_planning")
      .limit(1)
      .execute()
    let raw = res.value.first?.value?.max_units_per_cluster ?? 10
    maxUnitsDisplay = min(50, max(1, raw))
  }

  private func fetchAndApplyClusters(tenantId: UUID) async throws {
    let response: PostgrestResponse<[ClusterStateDTO]> = try await client
      .from("tenant_route_cluster_state")
      .select("radius_km, clusters, updated_at")
      .eq("tenant_id", value: tenantId)
      .limit(1)
      .execute()
    guard let row = response.value.first else {
      clusters = []
      return
    }
    radiusKm = row.radiusKm
    updatedAt = row.updatedAt.map { String($0.prefix(16)).replacingOccurrences(of: "T", with: " ") }
    clusters = row.clusters.map { item in
      let ids = item.orderedAssetIds.compactMap { uuidFromClusterString($0) }
      return ClusterItemRow(id: item.index, assetIds: ids)
    }
  }

  /// PostgREST bazen UUID’yi farklı büyük/küçük harf veya süslü parantezsiz döndürebilir.
  private func uuidFromClusterString(_ raw: String) -> UUID? {
    let s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    if let u = UUID(uuidString: s) { return u }
    if let u = UUID(uuidString: s.lowercased()) { return u }
    if let u = UUID(uuidString: s.uppercased()) { return u }
    return nil
  }
}

private struct ClusterStateDTO: Decodable {
  let radiusKm: Double
  let clusters: [ClusterJsonItem]
  let updatedAt: String?

  enum CodingKeys: String, CodingKey {
    case radiusKm = "radius_km"
    case clusters
    case updatedAt = "updated_at"
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    if let d = try? c.decode(Double.self, forKey: .radiusKm) {
      radiusKm = d
    } else if let s = try? c.decode(String.self, forKey: .radiusKm) {
      radiusKm = Double(s) ?? 2
    } else {
      radiusKm = 2
    }
    clusters = (try? c.decode([ClusterJsonItem].self, forKey: .clusters)) ?? []
    if let s = try? c.decode(String.self, forKey: .updatedAt) {
      updatedAt = s
    } else {
      updatedAt = nil
    }
  }
}

private struct ClusterJsonItem: Decodable {
  let index: Int
  let orderedAssetIds: [String]

  enum CodingKeys: String, CodingKey {
    case index
    case orderedAssetIds = "ordered_asset_ids"
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    if let i = try? c.decode(Int.self, forKey: .index) {
      index = i
    } else if let d = try? c.decode(Double.self, forKey: .index) {
      index = Int(d)
    } else {
      index = 0
    }
    orderedAssetIds = (try? c.decode([String].self, forKey: .orderedAssetIds)) ?? []
  }
}
