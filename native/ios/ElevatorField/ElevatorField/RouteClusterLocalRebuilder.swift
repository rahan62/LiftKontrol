import Foundation
import Supabase

/// Sunucu API veya önceden hesaplanmış satır olmasa bile, kiracı asansörlerinden kümeleri **doğrudan Supabase’e** yazar.
/// Sunucu `listRoutePointsForTenant` ile aynı öncelik: önce aktif bakım planlı üniteler, yoksa hizmet dışı olmayan tümü.
enum RouteClusterLocalRebuilder {
  private static let routePlanningKey = "route_planning"
  private static let earthKm = 6371.0
  private static let defaultRadiusKm = 2.0
  private static let maxRadiusKm = 15.0
  private static let minRadiusKm = 0.5
  private static let defaultMaxUnits = 10
  private static let maxUnitsCap = 50

  private struct RoutePoint {
    let assetId: UUID
    let siteId: UUID
    let lat: Double
    let lng: Double
  }

  static func rebuildAndPersist(client: SupabaseClient, tenantId: UUID) async throws {
    let planning = try await fetchRoutePlanning(client: client, tenantId: tenantId)
    var points = try await loadRoutePoints(client: client, tenantId: tenantId, maintenanceOnly: true)
    if points.isEmpty {
      points = try await loadRoutePoints(client: client, tenantId: tenantId, maintenanceOnly: false)
    }
    let clustersJson = clusterPayloads(from: points, maxPerCluster: planning.maxUnits)
    let payload = ClusterStateUpsertPayload(
      tenant_id: tenantId,
      radius_km: planning.radiusKm,
      clusters: clustersJson
    )
    try await client
      .from("tenant_route_cluster_state")
      .upsert(payload, onConflict: "tenant_id", returning: .minimal)
      .execute()
  }

  // MARK: - Settings

  private static func fetchRoutePlanning(client: SupabaseClient, tenantId: UUID) async throws -> (
    radiusKm: Double,
    maxUnits: Int
  ) {
    struct Row: Decodable {
      let value: RoutePlanningValue?
    }
    struct RoutePlanningValue: Decodable {
      let cluster_radius_km: Double?
      let max_units_per_cluster: Int?

      enum CodingKeys: String, CodingKey {
        case cluster_radius_km
        case max_units_per_cluster
      }

      init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        cluster_radius_km = try? c.decode(Double.self, forKey: .cluster_radius_km)
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
      .eq("key", value: routePlanningKey)
      .limit(1)
      .execute()
    let v = res.value.first?.value
    let r = clampRadius(v?.cluster_radius_km ?? defaultRadiusKm)
    let m = clampMaxUnits(v?.max_units_per_cluster ?? defaultMaxUnits)
    return (r, m)
  }

  private static func clampRadius(_ km: Double) -> Double {
    guard km.isFinite else { return defaultRadiusKm }
    return min(maxRadiusKm, max(minRadiusKm, (km * 100).rounded() / 100))
  }

  private static func clampMaxUnits(_ n: Int) -> Int {
    min(maxUnitsCap, max(1, n))
  }

  // MARK: - Load points (PostgREST)

  private static func loadRoutePoints(
    client: SupabaseClient,
    tenantId: UUID,
    maintenanceOnly: Bool
  ) async throws -> [RoutePoint] {
    struct AssetRow: Decodable {
      let id: UUID
      let siteId: UUID
      enum CodingKeys: String, CodingKey {
        case id
        case siteId = "site_id"
      }
    }
    struct PlanRow: Decodable {
      let assetId: UUID
      enum CodingKeys: String, CodingKey {
        case assetId = "asset_id"
      }
    }
    struct SiteRow: Decodable {
      let id: UUID
      let geo: GeoJson?
    }
    struct GeoJson: Decodable {
      let lat: Double?
      let lng: Double?
      let latitude: Double?
      let longitude: Double?
      var resolvedLat: Double? { lat ?? latitude }
      var resolvedLng: Double? { lng ?? longitude }
    }

    var q = client
      .from("elevator_assets")
      .select("id, site_id")
      .eq("tenant_id", value: tenantId)

    let assetRows: [AssetRow]
    if maintenanceOnly {
      q = q.eq("operational_status", value: "in_service")
      let plans: PostgrestResponse<[PlanRow]> = try await client
        .from("maintenance_plans")
        .select("asset_id")
        .eq("tenant_id", value: tenantId)
        .eq("active", value: true)
        .execute()
      let allowed = Set(plans.value.map(\.assetId))
      if allowed.isEmpty { return [] }
      let assets: PostgrestResponse<[AssetRow]> = try await q.execute()
      assetRows = assets.value.filter { allowed.contains($0.id) }
    } else {
      q = q.neq("operational_status", value: "decommissioned")
      let assets: PostgrestResponse<[AssetRow]> = try await q.execute()
      assetRows = assets.value
    }

    guard !assetRows.isEmpty else { return [] }

    let siteIds = Set(assetRows.map(\.siteId))
    let sites: PostgrestResponse<[SiteRow]> = try await client
      .from("sites")
      .select("id, geo")
      .eq("tenant_id", value: tenantId)
      .execute()
    var geoBySite: [UUID: GeoJson] = [:]
    for s in sites.value where siteIds.contains(s.id) {
      geoBySite[s.id] = s.geo
    }

    return assetRows.map { a in
      let g = geoBySite[a.siteId]
      let lat: Double
      let lng: Double
      if let la = g?.resolvedLat, let ln = g?.resolvedLng {
        lat = la
        lng = ln
      } else {
        let p = pseudoCoord(for: a.siteId)
        lat = p.lat
        lng = p.lng
      }
      return RoutePoint(assetId: a.id, siteId: a.siteId, lat: lat, lng: lng)
    }
  }

  private static func pseudoCoord(for siteId: UUID) -> (lat: Double, lng: Double) {
    let s = siteId.uuidString
    var h = 0
    for ch in s.utf8 {
      h = (31 &* h &+ Int(ch)) | 0
    }
    let u = Double(abs(h % 10_000)) / 10_000.0
    let v = Double(abs((h >> 8) % 10_000)) / 10_000.0
    return (36 + u * 6, 26 + v * 18)
  }

  // MARK: - Clustering (sunucu route-planning ile uyumlu)

  private static func clusterPayloads(from points: [RoutePoint], maxPerCluster: Int) -> [ClusterJsonPayload] {
    if points.isEmpty { return [] }
    let raw = capacitatedGeographicClusters(points, maxPerCluster: maxPerCluster)
    let ordered = raw.map { orderClusterByShortestWalk($0) }
    return ordered.enumerated().map { index, pts in
      let centroid = centroidOf(pts)
      return ClusterJsonPayload(
        index: index,
        centroid: CentroidPayload(lat: centroid.lat, lng: centroid.lng),
        ordered_asset_ids: pts.map { $0.assetId.uuidString.lowercased() },
        member_count: pts.count
      )
    }
  }

  /// Sunucu `capacitatedGeographicClusters` ile aynı sezgisel.
  private static func capacitatedGeographicClusters(_ points: [RoutePoint], maxPerCluster: Int) -> [[RoutePoint]] {
    let cap = min(maxUnitsCap, max(1, maxPerCluster))
    if points.isEmpty { return [] }
    var unassigned = points
    var clusters: [[RoutePoint]] = []
    while !unassigned.isEmpty {
      var bestIdx = 0
      var bestLat = unassigned[0].lat
      for i in 1 ..< unassigned.count {
        if unassigned[i].lat > bestLat {
          bestLat = unassigned[i].lat
          bestIdx = i
        }
      }
      var cluster: [RoutePoint] = [unassigned.remove(at: bestIdx)]
      while cluster.count < cap, !unassigned.isEmpty {
        let cen = centroidOf(cluster)
        var nextJ = 0
        var nextD = Double.infinity
        for j in unassigned.indices {
          let d = haversineKmLatLng(cen, unassigned[j].lat, unassigned[j].lng)
          if d < nextD {
            nextD = d
            nextJ = j
          }
        }
        cluster.append(unassigned.remove(at: nextJ))
      }
      clusters.append(cluster)
    }
    clusters.sort { centroidOf($0).lat > centroidOf($1).lat }
    return clusters
  }

  private static func haversineKmLatLng(_ a: (lat: Double, lng: Double), _ latB: Double, _ lngB: Double) -> Double {
    let r = { (d: Double) in d * .pi / 180 }
    let dLat = r(latB - a.lat)
    let dLng = r(lngB - a.lng)
    let x =
      sin(dLat / 2) * sin(dLat / 2)
        + cos(r(a.lat)) * cos(r(latB)) * sin(dLng / 2) * sin(dLng / 2)
    return 2 * earthKm * asin(min(1, sqrt(x)))
  }

  private static func haversineKm(_ a: RoutePoint, _ b: RoutePoint) -> Double {
    let r = { (d: Double) in d * .pi / 180 }
    let dLat = r(b.lat - a.lat)
    let dLng = r(b.lng - a.lng)
    let x =
      sin(dLat / 2) * sin(dLat / 2)
        + cos(r(a.lat)) * cos(r(b.lat)) * sin(dLng / 2) * sin(dLng / 2)
    return 2 * earthKm * asin(min(1, sqrt(x)))
  }

  private static func orderClusterByShortestWalk(_ points: [RoutePoint]) -> [RoutePoint] {
    if points.count <= 1 { return points }
    var remaining = points
    let startIdx = remaining.enumerated().max(by: { $0.element.lat < $1.element.lat })?.offset ?? 0
    var ordered: [RoutePoint] = [remaining.remove(at: startIdx)]
    while !remaining.isEmpty {
      let last = ordered[ordered.count - 1]
      var bestI = 0
      var bestD = Double.infinity
      for i in remaining.indices {
        let d = haversineKm(last, remaining[i])
        if d < bestD {
          bestD = d
          bestI = i
        }
      }
      ordered.append(remaining.remove(at: bestI))
    }
    return ordered
  }

  private static func centroidOf(_ points: [RoutePoint]) -> (lat: Double, lng: Double) {
    guard !points.isEmpty else { return (0, 0) }
    let slat = points.reduce(0) { $0 + $1.lat }
    let slng = points.reduce(0) { $0 + $1.lng }
    return (slat / Double(points.count), slng / Double(points.count))
  }

  // MARK: - Payload

  private struct ClusterStateUpsertPayload: Encodable {
    let tenant_id: UUID
    let radius_km: Double
    let clusters: [ClusterJsonPayload]
  }

  private struct ClusterJsonPayload: Encodable {
    let index: Int
    let centroid: CentroidPayload
    let ordered_asset_ids: [String]
    let member_count: Int
  }

  private struct CentroidPayload: Encodable {
    let lat: Double
    let lng: Double
  }
}
