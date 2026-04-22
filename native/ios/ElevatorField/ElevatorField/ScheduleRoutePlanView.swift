import SwiftUI
import Supabase

/// Saha teknisyeni: aylık rota planı, günlük duraklar, Apple Haritalar’da sıralı yönlendirme.
/// Aynı takvimde `en8120_next_control_due` tarihi o aya düşen üniteler «periyodik kontrol» olarak günlük listelenir.
/// Bakım rotası ofiste web’den üretilir; mobil çoğunlukla okur (Supabase RLS).
struct ScheduleRoutePlanView: View {
  let client: SupabaseClient

  private enum ProgramMode: String, CaseIterable {
    case monthly
    case daily
  }

  @State private var year: Int
  @State private var month: Int
  @State private var programMode: ProgramMode = .monthly
  @State private var crews: [FieldCrewRow] = []
  @State private var selectedCrewId: UUID?
  @State private var planId: UUID?
  @State private var stops: [DailyStopDisplay] = []
  @State private var periodicRows: [PeriodicDueDisplay] = []
  @State private var blockers: [WorkOrderBlockerRow] = []
  @State private var fieldDispatchStops: [FieldDispatchStopRow] = []
  @State private var loadError: String?
  @State private var loading = true

  init(client: SupabaseClient) {
    self.client = client
    let cal = Calendar.current
    let now = Date()
    _year = State(initialValue: cal.component(.year, from: now))
    _month = State(initialValue: cal.component(.month, from: now))
  }

  var body: some View {
    VStack(spacing: 0) {
      programModePicker
      if programMode == .monthly {
        monthPicker
      }
      if !crews.isEmpty {
        Picker(TrStrings.Schedule.crew, selection: $selectedCrewId) {
          ForEach(crews) { c in
            Text(c.name).tag(Optional(c.id))
          }
        }
        .pickerStyle(.menu)
        .padding(.horizontal)
      }
      List {
        if loading {
          Section {
            HStack {
              Spacer()
              ProgressView(TrStrings.Common.loading)
              Spacer()
            }
            .padding(.vertical, 8)
            .listRowBackground(Color.clear)
          }
        } else if let loadError {
          Section {
            ContentUnavailableView(
              TrStrings.Schedule.title,
              systemImage: "map",
              description: Text(loadError)
            )
            .listRowInsets(EdgeInsets())
            .listRowBackground(Color.clear)
          }
        } else if programMode == .daily {
          dailyListSections
        } else {
          monthlyListSections
        }
      }
    }
    .navigationTitle(TrStrings.Schedule.title)
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        NavigationLink {
          ScheduleClustersView(client: client)
        } label: {
          Image(systemName: "circle.hexagongrid")
        }
        .accessibilityLabel(TrStrings.Schedule.clustersTitle)
      }
    }
    .fieldTabBarScrollContentInset()
    .task(id: "\(year)-\(month)-\(programMode.rawValue)") { await load() }
    .onChange(of: selectedCrewId) { old, _ in
      guard old != nil else { return }
      Task { await load() }
    }
  }

  private var programModePicker: some View {
    Picker("", selection: $programMode) {
      Text(TrStrings.Schedule.viewMonthly).tag(ProgramMode.monthly)
      Text(TrStrings.Schedule.viewDaily).tag(ProgramMode.daily)
    }
    .pickerStyle(.segmented)
    .padding(.horizontal)
    .padding(.top, 8)
  }

  @ViewBuilder
  private var dailyListSections: some View {
    if !blockers.isEmpty {
      Section {
        ForEach(blockers) { b in
          VStack(alignment: .leading, spacing: 4) {
            Text(b.number).font(.headline)
            if let f = b.faultSymptom, !f.isEmpty {
              Text(f).font(.caption).foregroundStyle(.secondary)
            }
          }
        }
      } header: {
        Text(TrStrings.Schedule.blockingSection)
      }
    }
    Section {
      Text(TrStrings.Schedule.dailyTodayPlan)
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
    if fieldDispatchStops.isEmpty {
      Section {
        Text(TrStrings.Schedule.dailyEmpty)
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
    } else {
      Section {
        Button {
          openDailyDispatchInAppleMaps(fieldDispatchStops)
        } label: {
          Label(TrStrings.Schedule.openInMaps, systemImage: "map")
        }
        .buttonStyle(.borderless)
        .disabled(fieldDispatchStops.isEmpty)
      }
      ForEach(fieldDispatchStops) { s in
        NavigationLink {
          AssetDetailView(client: client, assetId: s.assetId)
        } label: {
          HStack(alignment: .top, spacing: 10) {
            Text("\(s.sequence + 1).")
              .font(.caption.monospacedDigit())
              .foregroundStyle(.secondary)
              .frame(width: 28, alignment: .trailing)
            VStack(alignment: .leading, spacing: 2) {
              Text(s.unitCode).font(.subheadline.weight(.semibold))
              Text(s.siteName).font(.caption).foregroundStyle(.secondary)
            }
          }
        }
      }
    }
  }

  @ViewBuilder
  private var monthlyListSections: some View {
    if crews.isEmpty {
      Section {
        Text(TrStrings.Schedule.noCrews)
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
    }

    if planId == nil, !crews.isEmpty, selectedCrewId != nil {
      Section {
        Text(TrStrings.Schedule.noPlan)
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
    }

    if !blockers.isEmpty {
      Section {
        ForEach(blockers) { b in
          VStack(alignment: .leading, spacing: 4) {
            Text(b.number).font(.headline)
            if let f = b.faultSymptom, !f.isEmpty {
              Text(f).font(.caption).foregroundStyle(.secondary)
            }
          }
        }
      } header: {
        Text(TrStrings.Schedule.blockingSection)
      }
    }

    if mergedDaySections.isEmpty {
      Section {
        Text(TrStrings.Schedule.emptyMonth)
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
    } else {
      ForEach(mergedDaySections, id: \.date) { day in
        Section {
          if !day.periodic.isEmpty {
            ForEach(day.periodic) { p in
              HStack(alignment: .top, spacing: 10) {
                Image(systemName: "checkmark.shield.fill")
                  .foregroundStyle(.teal)
                  .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                  Text(TrStrings.Schedule.periodicSection)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
                  Text(p.unitCode).font(.subheadline.weight(.semibold))
                  Text("\(TrStrings.Schedule.periodicBadge) · \(p.siteName)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                  Text("\(TrStrings.Assets.customerParty): \(p.customerName)")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                }
              }
              .padding(.vertical, 2)
            }
          }
          Button {
            openDayInAppleMaps(day.stops)
          } label: {
            Label(TrStrings.Schedule.openInMaps, systemImage: "map")
          }
          .buttonStyle(.borderless)
          .disabled(day.stops.isEmpty)
          if day.stops.isEmpty && !day.periodic.isEmpty {
            Text(TrStrings.Schedule.periodicNoRouteStops)
              .font(.caption)
              .foregroundStyle(.tertiary)
          }
          ForEach(day.stops) { s in
            HStack(alignment: .top) {
              Text("\(s.sequence + 1).")
                .font(.caption.monospacedDigit())
                .foregroundStyle(.secondary)
                .frame(width: 28, alignment: .trailing)
              VStack(alignment: .leading, spacing: 2) {
                Text(s.unitCode).font(.subheadline.weight(.semibold))
                Text(s.siteName).font(.caption).foregroundStyle(.secondary)
              }
            }
          }
        } header: {
          Text(day.date)
        }
      }
    }
  }

  private var groupedRouteDays: [(date: String, stops: [DailyStopDisplay])] {
    let dict = Dictionary(grouping: stops) { $0.serviceDate }
    return dict.keys.sorted().map { k in
      (date: k, stops: (dict[k] ?? []).sorted { $0.sequence < $1.sequence })
    }
  }

  private var mergedDaySections: [(date: String, periodic: [PeriodicDueDisplay], stops: [DailyStopDisplay])] {
    let routeDict = Dictionary(uniqueKeysWithValues: groupedRouteDays.map { ($0.date, $0.stops) })
    let periodicDict = Dictionary(grouping: periodicRows) { $0.dueDate }
    let allDates = Set(routeDict.keys).union(periodicDict.keys)
    return allDates.sorted().map { d in
      (date: d, periodic: periodicDict[d] ?? [], stops: routeDict[d] ?? [])
    }
  }

  private var monthPicker: some View {
    HStack {
      Button(TrStrings.Maintenance.prevMonth) { shiftMonth(-1) }
      Spacer()
      Text(String(format: "%04d · %02d", year, month))
        .font(.headline.monospacedDigit())
      Spacer()
      Button(TrStrings.Maintenance.nextMonth) { shiftMonth(1) }
    }
    .padding()
    .background(.ultraThinMaterial)
  }

  private func shiftMonth(_ delta: Int) {
    var y = year
    var m = month + delta
    while m < 1 {
      m += 12
      y -= 1
    }
    while m > 12 {
      m -= 12
      y += 1
    }
    year = y
    month = m
  }

  private func monthRangeIso() -> (start: String, end: String) {
    let cal = Calendar(identifier: .gregorian)
    var c = DateComponents()
    c.year = year
    c.month = month
    c.day = 1
    guard let start = cal.date(from: c),
      let nextMonth = cal.date(byAdding: .month, value: 1, to: start),
      let end = cal.date(byAdding: .day, value: -1, to: nextMonth)
    else {
      return ("1970-01-01", "1970-01-31")
    }
    let f = DateFormatter()
    f.calendar = cal
    f.locale = Locale(identifier: "en_US_POSIX")
    f.timeZone = TimeZone.current
    f.dateFormat = "yyyy-MM-dd"
    return (f.string(from: start), f.string(from: end))
  }

  private func load() async {
    loading = true
    loadError = nil
    defer { loading = false }
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else {
        crews = []
        planId = nil
        stops = []
        periodicRows = []
        blockers = []
        fieldDispatchStops = []
        loadError = TrStrings.Maintenance.noTenant
        return
      }
      let crewResponse: PostgrestResponse<[FieldCrewRow]> = try await client
        .from("field_crews")
        .select("id, name")
        .eq("tenant_id", value: tenantId)
        .order("name")
        .execute()
      crews = crewResponse.value
      if selectedCrewId == nil {
        selectedCrewId = crews.first?.id
      }

      guard let crewId = selectedCrewId else {
        planId = nil
        stops = []
        blockers = []
        fieldDispatchStops = []
        return
      }

      if programMode == .daily {
        periodicRows = []
        planId = nil
        stops = []
        do {
          try await loadBlockers(tenantId: tenantId, crewId: crewId)
          try await loadFieldDispatch(tenantId: tenantId, crewId: crewId)
        } catch is CancellationError {
          return
        } catch {
          loadError = error.localizedDescription
          fieldDispatchStops = []
        }
        return
      }

      fieldDispatchStops = []
      try await loadPeriodicDues(tenantId: tenantId)

      do {
        let ym = String(format: "%04d-%02d", year, month)
        let planResponse: PostgrestResponse<[PlanIdRow]> = try await client
          .from("monthly_route_plans")
          .select("id")
          .eq("tenant_id", value: tenantId)
          .eq("crew_id", value: crewId)
          .eq("year_month", value: ym)
          .limit(1)
          .execute()
        guard let pid = planResponse.value.first?.id else {
          planId = nil
          stops = []
          try await loadBlockers(tenantId: tenantId, crewId: crewId)
          return
        }
        planId = pid
        let stopsResponse: PostgrestResponse<[DailyStopDTO]> = try await client
          .from("daily_route_stops")
          .select("""
            id, service_date, sequence, cluster_index, elevator_asset_id, site_id,
            elevator_assets(unit_code),
            sites(name, geo)
          """)
          .eq("tenant_id", value: tenantId)
          .eq("plan_id", value: pid)
          .order("service_date", ascending: true)
          .order("sequence", ascending: true)
          .execute()
        stops = stopsResponse.value.map { dto in
          DailyStopDisplay(
            id: dto.id,
            siteId: dto.siteId,
            serviceDate: String(dto.serviceDate.prefix(10)),
            sequence: dto.sequence,
            unitCode: dto.elevatorAssets?.unitCode ?? "—",
            siteName: dto.sites?.name ?? "—",
            latitude: dto.sites?.geo?.resolvedLat,
            longitude: dto.sites?.geo?.resolvedLng
          )
        }
        try await loadBlockers(tenantId: tenantId, crewId: crewId)
      } catch is CancellationError {
        return
      } catch {
        loadError = error.localizedDescription
        planId = nil
        stops = []
        blockers = []
      }
    } catch is CancellationError {
      return
    } catch {
      loadError = error.localizedDescription
      planId = nil
      stops = []
      periodicRows = []
      blockers = []
      fieldDispatchStops = []
    }
  }

  private static func istanbulDateOnly() -> String {
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = TimeZone(identifier: "Europe/Istanbul") ?? .current
    let c = cal.dateComponents([.year, .month, .day], from: Date())
    guard let y = c.year, let m = c.month, let d = c.day else { return "1970-01-01" }
    return String(format: "%04d-%02d-%02d", y, m, d)
  }

  private func loadFieldDispatch(tenantId: UUID, crewId: UUID) async throws {
    let today = Self.istanbulDateOnly()
    let dRes: PostgrestResponse<[DispatchIdRow]> = try await client
      .from("daily_crew_dispatches")
      .select("id")
      .eq("tenant_id", value: tenantId)
      .eq("crew_id", value: crewId)
      .eq("dispatch_date", value: today)
      .limit(1)
      .execute()
    guard let dispatchId = dRes.value.first?.id else {
      fieldDispatchStops = []
      return
    }
    let sRes: PostgrestResponse<[FieldDispatchStopDTO]> = try await client
      .from("daily_crew_dispatch_stops")
      .select("""
        id, sequence, elevator_asset_id, site_id,
        elevator_assets(unit_code),
        sites(name, geo)
      """)
      .eq("tenant_id", value: tenantId)
      .eq("dispatch_id", value: dispatchId)
      .order("sequence", ascending: true)
      .execute()
    fieldDispatchStops = sRes.value.map { dto in
      FieldDispatchStopRow(
        id: dto.id,
        sequence: dto.sequence,
        assetId: dto.elevatorAssetId,
        siteId: dto.siteId,
        unitCode: dto.elevatorAssets?.unitCode ?? "—",
        siteName: dto.sites?.name ?? "—",
        latitude: dto.sites?.geo?.resolvedLat,
        longitude: dto.sites?.geo?.resolvedLng
      )
    }
  }

  private func loadPeriodicDues(tenantId: UUID) async throws {
    let range = monthRangeIso()
    let response: PostgrestResponse<[PeriodicDueRow]> = try await client
      .from("elevator_assets")
      .select("id,unit_code,en8120_next_control_due,sites(name),customers(legal_name)")
      .eq("tenant_id", value: tenantId)
      .gte("en8120_next_control_due", value: range.start)
      .lte("en8120_next_control_due", value: range.end)
      .order("en8120_next_control_due", ascending: true)
      .order("unit_code", ascending: true)
      .execute()
    periodicRows = response.value.compactMap { row in
      let d = PeriodicDueDisplay(row: row)
      return d.dueDate.count >= 10 ? d : nil
    }
  }

  private func loadBlockers(tenantId: UUID, crewId: UUID) async throws {
    let r: PostgrestResponse<[WorkOrderBlockerRow]> = try await client
      .from("work_orders")
      .select("id, number, fault_symptom, status")
      .eq("tenant_id", value: tenantId)
      .eq("blocking_crew_id", value: crewId)
      .or("work_type.eq.repair,work_type.eq.emergency_breakdown")
      .execute()
    blockers = r.value.filter { $0.status != "completed" && $0.status != "cancelled" }
  }

  /// `sites.geo` yoksa sunucu kümelemesiyle aynı sahte nokta (site_id hash → ~36–42°N, 26–44°E).
  /// Ülke geneline dağılmış pinler görüyorsanız çoğunlukla gerçek koordinat yok, bu yedek noktadır.
  private func pseudoCoord(for siteId: UUID) -> (lat: Double, lng: Double) {
    let s = siteId.uuidString
    var h = 0
    for ch in s.utf8 {
      h = (31 &* h &+ Int(ch)) | 0
    }
    let u = Double(abs(h % 10_000)) / 10_000.0
    let v = Double(abs((h >> 8) % 10_000)) / 10_000.0
    return (36 + u * 6, 26 + v * 18)
  }

  private func coordForRouteStop(_ s: DailyStopDisplay) -> (lat: Double, lng: Double) {
    if let la = s.latitude, let ln = s.longitude { return (la, ln) }
    return pseudoCoord(for: s.siteId)
  }

  private func coordForDispatchStop(_ s: FieldDispatchStopRow) -> (lat: Double, lng: Double) {
    if let la = s.latitude, let ln = s.longitude { return (la, ln) }
    return pseudoCoord(for: s.siteId)
  }

  private func openDayInAppleMaps(_ dayStops: [DailyStopDisplay]) {
    guard !dayStops.isEmpty else { return }
    let sorted = dayStops.sorted { $0.sequence < $1.sequence }
    let n = sorted.count
    let stops: [(lat: Double, lng: Double, title: String)] = sorted.enumerated().map { i, s in
      let c = coordForRouteStop(s)
      return (c.lat, c.lng, "\(i + 1)/\(n) · \(s.unitCode) — \(s.siteName)")
    }
    AppleMapsDrivingRouteOpener.openDrivingRoute(stops: stops)
  }

  private func openDailyDispatchInAppleMaps(_ stops: [FieldDispatchStopRow]) {
    guard !stops.isEmpty else { return }
    let sorted = stops.sorted { $0.sequence < $1.sequence }
    let n = sorted.count
    let mapped: [(lat: Double, lng: Double, title: String)] = sorted.enumerated().map { i, s in
      let c = coordForDispatchStop(s)
      return (c.lat, c.lng, "\(i + 1)/\(n) · \(s.unitCode) — \(s.siteName)")
    }
    AppleMapsDrivingRouteOpener.openDrivingRoute(stops: mapped)
  }
}

// MARK: - Models

private struct DispatchIdRow: Decodable {
  let id: UUID
}

private struct FieldDispatchStopRow: Identifiable {
  let id: UUID
  let sequence: Int
  let assetId: UUID
  let siteId: UUID
  let unitCode: String
  let siteName: String
  let latitude: Double?
  let longitude: Double?
}

private struct FieldDispatchStopDTO: Decodable {
  let id: UUID
  let sequence: Int
  let elevatorAssetId: UUID
  let siteId: UUID
  let elevatorAssets: AssetMini?
  let sites: SiteMini?

  struct AssetMini: Decodable {
    let unitCode: String
    enum CodingKeys: String, CodingKey {
      case unitCode = "unit_code"
    }
  }

  struct SiteMini: Decodable {
    let name: String?
    let geo: GeoBlob?

    struct GeoBlob: Decodable {
      let lat: Double?
      let lng: Double?
      let latitude: Double?
      let longitude: Double?
      var resolvedLat: Double? { lat ?? latitude }
      var resolvedLng: Double? { lng ?? longitude }
    }
  }

  enum CodingKeys: String, CodingKey {
    case id, sequence
    case elevatorAssetId = "elevator_asset_id"
    case siteId = "site_id"
    case elevatorAssets = "elevator_assets"
    case sites
  }
}

private struct FieldCrewRow: Decodable, Identifiable {
  let id: UUID
  let name: String
}

private struct PlanIdRow: Decodable {
  let id: UUID
}

private struct WorkOrderBlockerRow: Decodable, Identifiable {
  let id: UUID
  let number: String
  let faultSymptom: String?
  let status: String

  enum CodingKeys: String, CodingKey {
    case id, number, status
    case faultSymptom = "fault_symptom"
  }
}

private struct PeriodicDueRow: Decodable {
  let id: UUID
  let unitCode: String
  let en8120NextControlDue: String?
  let sites: SiteN?
  let customers: CustomerN?

  enum CodingKeys: String, CodingKey {
    case id
    case unitCode = "unit_code"
    case en8120NextControlDue = "en8120_next_control_due"
    case sites
    case customers
  }

  struct SiteN: Decodable {
    let name: String?
  }

  struct CustomerN: Decodable {
    let legalName: String?
    enum CodingKeys: String, CodingKey {
      case legalName = "legal_name"
    }
  }
}

private struct PeriodicDueDisplay: Identifiable {
  let id: UUID
  let unitCode: String
  let dueDate: String
  let siteName: String
  let customerName: String

  init(row: PeriodicDueRow) {
    id = row.id
    unitCode = row.unitCode
    dueDate = String((row.en8120NextControlDue ?? "").prefix(10))
    siteName = row.sites?.name ?? "—"
    customerName = row.customers?.legalName ?? "—"
  }
}

private struct DailyStopDTO: Decodable {
  let id: UUID
  let serviceDate: String
  let sequence: Int
  let elevatorAssetId: UUID
  let siteId: UUID
  let clusterIndex: Int
  let elevatorAssets: AssetN?
  let sites: SiteN?

  enum CodingKeys: String, CodingKey {
    case id
    case serviceDate = "service_date"
    case sequence
    case elevatorAssetId = "elevator_asset_id"
    case siteId = "site_id"
    case clusterIndex = "cluster_index"
    case elevatorAssets = "elevator_assets"
    case sites
  }

  struct AssetN: Decodable {
    let unitCode: String
    enum CodingKeys: String, CodingKey {
      case unitCode = "unit_code"
    }
  }

  struct SiteN: Decodable {
    let name: String?
    let geo: GeoBlob?
  }

  /// Esnek geo jsonb: lat/lng veya latitude/longitude.
  struct GeoBlob: Decodable {
    let lat: Double?
    let lng: Double?
    let latitude: Double?
    let longitude: Double?

    var resolvedLat: Double? { lat ?? latitude }
    var resolvedLng: Double? { lng ?? longitude }
  }
}

private struct DailyStopDisplay: Identifiable {
  let id: UUID
  let siteId: UUID
  let serviceDate: String
  let sequence: Int
  let unitCode: String
  let siteName: String
  let latitude: Double?
  let longitude: Double?
}
