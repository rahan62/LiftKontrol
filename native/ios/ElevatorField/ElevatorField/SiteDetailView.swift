import CoreLocation
import MapKit
import SwiftUI
import Supabase

struct SiteDetailView: View {
  let client: SupabaseClient
  let siteId: UUID

  @State private var detail: SiteDetailDTO?
  @State private var assets: [SiteAssetBrief] = []
  @State private var loadError: String?
  @State private var loading = true
  @State private var geoFetchBusy = false
  @State private var geoFetchMessage: String?

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.Sites.title, systemImage: "mappin.and.ellipse", description: Text(loadError))
      } else if let detail {
        List {
          Section {
            Text(TrStrings.Sites.detailHint)
              .font(.footnote)
              .foregroundStyle(.secondary)
          }
          Section(TrStrings.Sites.maintenanceSection) {
            Text(TrStrings.Sites.periodicFeeOnElevators)
              .font(.footnote)
              .foregroundStyle(.secondary)
            Text(detail.maintenanceNotes ?? "—")
              .font(.subheadline)
          }
          Section(TrStrings.Sites.serviceAddressSection) {
            Text(detail.serviceAddressText)
              .font(.subheadline)
            LabeledContent(TrStrings.Sites.billingSameLabel, value: detail.billingSameAsService ? "Evet" : "Hayır")
            if let line = detail.geoCoordinateLine {
              LabeledContent(TrStrings.Sites.geoMapLocation, value: line)
                .font(.subheadline)
            }
            Text(TrStrings.Sites.geoFetchHint)
              .font(.caption)
              .foregroundStyle(.secondary)
            Button {
              Task { await fetchAndSaveGeoFromAddress(detail: detail) }
            } label: {
              if geoFetchBusy {
                Label(TrStrings.Sites.geoFetchBusy, systemImage: "location.magnifyingglass")
              } else {
                Label(TrStrings.Sites.geoFetchFromAddress, systemImage: "mappin.and.ellipse")
              }
            }
            .buttonStyle(.borderless)
            .disabled(geoFetchBusy || loading)
            if let geoFetchMessage {
              Text(geoFetchMessage)
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }
          Section(TrStrings.Sites.accessSection) {
            Text(detail.accessInstructions ?? "—")
            if let m = detail.machineRoomNotes, !m.isEmpty {
              Text("\(TrStrings.Sites.machineRoom): \(m)").font(.caption).foregroundStyle(.secondary)
            }
            if let s = detail.shaftNotes, !s.isEmpty {
              Text("\(TrStrings.Sites.shaft): \(s)").font(.caption).foregroundStyle(.secondary)
            }
            if let e = detail.emergencyPhones, !e.isEmpty {
              Text(e).font(.caption).foregroundStyle(.secondary)
            }
          }
          Section(TrStrings.Sites.assetsOnSite) {
            if assets.isEmpty {
              Text(TrStrings.Assets.empty).foregroundStyle(.secondary)
            } else {
              ForEach(assets) { a in
                NavigationLink {
                  AssetDetailView(client: client, assetId: a.id)
                } label: {
                  VStack(alignment: .leading, spacing: 2) {
                    Text(a.unitCode).font(.headline)
                    Text(a.operationalStatus).font(.caption).foregroundStyle(.secondary)
                    if let line = a.feeLine {
                      Text(line).font(.caption2).foregroundStyle(.tertiary)
                    }
                  }
                }
              }
            }
          }
          Section {
            NavigationLink {
              AssetCreateView(client: client, defaultCustomerId: detail.customerId, defaultSiteId: siteId)
            } label: {
              Label(TrStrings.Assets.newTitle, systemImage: "plus.circle")
            }
          }
        }
        .navigationTitle(detail.name)
      } else {
        ContentUnavailableView(TrStrings.Sites.title, systemImage: "mappin.and.ellipse", description: Text("—"))
      }
    }
    .navigationBarTitleDisplayMode(.inline)
    .fieldTabBarScrollContentInset()
    .task { await load() }
  }

  private func load() async {
    loading = true
    loadError = nil
    defer { loading = false }
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else {
        detail = nil
        return
      }
      let siteRes: PostgrestResponse<SiteDetailDTO> = try await client
        .from("sites")
        .select(
          "id, name, customer_id, service_address, geo, billing_same_as_service, access_instructions, machine_room_notes, shaft_notes, emergency_phones, maintenance_notes, customers(legal_name)"
        )
        .eq("tenant_id", value: tenantId)
        .eq("id", value: siteId)
        .single()
        .execute()
      detail = siteRes.value
      let assetRes: PostgrestResponse<[SiteAssetBrief]> = try await client
        .from("elevator_assets")
        .select("id, unit_code, operational_status, maintenance_fee, maintenance_fee_period")
        .eq("tenant_id", value: tenantId)
        .eq("site_id", value: siteId)
        .order("unit_code", ascending: true)
        .execute()
      assets = assetRes.value
    } catch {
      loadError = error.localizedDescription
      detail = nil
    }
  }

  private func fetchAndSaveGeoFromAddress(detail: SiteDetailDTO) async {
    guard let query = detail.geocodeQueryFromServiceAddress(), !query.isEmpty else {
      geoFetchMessage = TrStrings.Sites.geoFetchNoAddress
      return
    }
    geoFetchBusy = true
    geoFetchMessage = nil
    defer { geoFetchBusy = false }
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else { return }
      let coord = try await Self.geocodeAddressString(query)
      let ts = Self.isoGeocodedTimestamp()
      let payload = SiteGeoColumnUpdate(
        geo: SiteGeoPayload(lat: coord.latitude, lng: coord.longitude, geocodedAt: ts))
      try await client
        .from("sites")
        .update(payload)
        .eq("tenant_id", value: tenantId)
        .eq("id", value: siteId)
        .execute()
      await FieldRoutePlanningSync.triggerClusterRecompute(client: client)
      geoFetchMessage = TrStrings.Sites.geoFetchOk
      await load()
    } catch {
      if case SiteGeocodeError.noPlacemark = error {
        geoFetchMessage = TrStrings.Sites.geoFetchNoResult
      } else {
        geoFetchMessage = error.localizedDescription
      }
    }
  }

  private static func geocodeAddressString(_ address: String) async throws -> CLLocationCoordinate2D {
    if #available(iOS 26.0, *) {
      guard let request = MKGeocodingRequest(addressString: address) else {
        throw SiteGeocodeError.noPlacemark
      }
      let items = try await request.mapItems
      guard let first = items.first else {
        throw SiteGeocodeError.noPlacemark
      }
      return first.location.coordinate
    } else {
      let geocoder = CLGeocoder()
      return try await withCheckedThrowingContinuation { cont in
        geocoder.geocodeAddressString(address) { placemarks, error in
          if let error {
            cont.resume(throwing: error)
            return
          }
          guard let coord = placemarks?.first?.location?.coordinate else {
            cont.resume(throwing: SiteGeocodeError.noPlacemark)
            return
          }
          cont.resume(returning: coord)
        }
      }
    }
  }

  private static func isoGeocodedTimestamp() -> String {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f.string(from: Date())
  }
}

private enum SiteGeocodeError: Error {
  case noPlacemark
}

private struct SiteGeoColumnUpdate: Encodable {
  let geo: SiteGeoPayload
}

private struct SiteGeoPayload: Encodable {
  let lat: Double
  let lng: Double
  let source: String
  let geocoded_at: String

  init(lat: Double, lng: Double, geocodedAt: String) {
    self.lat = lat
    self.lng = lng
    self.source = "apple_geocoder"
    self.geocoded_at = geocodedAt
  }

  enum CodingKeys: String, CodingKey {
    case lat, lng, source
    case geocoded_at
  }
}

private struct SiteDetailDTO: Decodable {
  let id: UUID
  let name: String
  let customerId: UUID
  let serviceAddress: [String: String]?
  let geo: SiteDetailGeo?
  let billingSameAsService: Bool
  let accessInstructions: String?
  let machineRoomNotes: String?
  let shaftNotes: String?
  let emergencyPhones: String?
  let maintenanceNotes: String?
  let customers: SiteDetailDTO.CustomerEmbed?

  struct CustomerEmbed: Decodable {
    let legalName: String?
    enum CodingKeys: String, CodingKey {
      case legalName = "legal_name"
    }
  }

  enum CodingKeys: String, CodingKey {
    case id, name, customers, geo
    case customerId = "customer_id"
    case serviceAddress = "service_address"
    case billingSameAsService = "billing_same_as_service"
    case accessInstructions = "access_instructions"
    case machineRoomNotes = "machine_room_notes"
    case shaftNotes = "shaft_notes"
    case emergencyPhones = "emergency_phones"
    case maintenanceNotes = "maintenance_notes"
  }

  var serviceAddressText: String {
    guard let serviceAddress, !serviceAddress.isEmpty else { return "—" }
    return serviceAddress
      .sorted(by: { $0.key < $1.key })
      .map { "\($0.key): \($0.value)" }
      .joined(separator: "\n")
  }

  var geoCoordinateLine: String? {
    guard let geo, let la = geo.resolvedLat, let ln = geo.resolvedLng else { return nil }
    return String(format: "%.5f, %.5f", la, ln)
  }

  /// Web `formatServiceAddressForGeocode` ile aynı sıra; ülke boşsa «Türkiye» eklenir (CLGeocoder için).
  func geocodeQueryFromServiceAddress() -> String? {
    guard let serviceAddress else { return nil }
    let keys = ["line1", "line2", "city", "region", "postal_code", "country"]
    let parts = keys.compactMap { key -> String? in
      guard let raw = serviceAddress[key] else { return nil }
      let v = raw.trimmingCharacters(in: .whitespacesAndNewlines)
      return v.isEmpty ? nil : v
    }
    guard !parts.isEmpty else { return nil }
    var line = parts.joined(separator: ", ")
    let countryVal = serviceAddress["country"]?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    if countryVal.isEmpty {
      line += ", Türkiye"
    }
    return line
  }
}

private struct SiteDetailGeo: Decodable {
  let lat: Double?
  let lng: Double?
  let latitude: Double?
  let longitude: Double?

  var resolvedLat: Double? { lat ?? latitude }
  var resolvedLng: Double? { lng ?? longitude }
}

private struct SiteAssetBrief: Decodable, Identifiable {
  let id: UUID
  let unitCode: String
  let operationalStatus: String
  private let maintenanceFee: Double?
  private let maintenanceFeePeriod: String?

  enum CodingKeys: String, CodingKey {
    case id
    case unitCode = "unit_code"
    case operationalStatus = "operational_status"
    case maintenanceFee = "maintenance_fee"
    case maintenanceFeePeriod = "maintenance_fee_period"
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id = try c.decode(UUID.self, forKey: .id)
    unitCode = try c.decode(String.self, forKey: .unitCode)
    operationalStatus = try c.decode(String.self, forKey: .operationalStatus)
    maintenanceFeePeriod = try c.decodeIfPresent(String.self, forKey: .maintenanceFeePeriod)
    if let d = try? c.decode(Double.self, forKey: .maintenanceFee) {
      maintenanceFee = d
    } else if let s = try? c.decode(String.self, forKey: .maintenanceFee), let d = Double(s.replacingOccurrences(of: ",", with: ".")) {
      maintenanceFee = d
    } else {
      maintenanceFee = nil
    }
  }

  var feeLine: String? {
    guard let maintenanceFee, maintenanceFee > 0 else { return nil }
    let p: String =
      maintenanceFeePeriod == "yearly"
        ? TrStrings.Assets.periodYearly
        : (maintenanceFeePeriod == "monthly" ? TrStrings.Assets.periodMonthly : "")
    let amt = String(format: "%.2f", maintenanceFee)
    if p.isEmpty { return "\(amt) TRY" }
    return "\(amt) TRY · \(p)"
  }
}
