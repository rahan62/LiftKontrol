import SwiftUI
import Supabase

// MARK: - UTC range (web `dashboard-range` UTC ile uyumlu)

enum DashboardUTC {
  static let tz = TimeZone(secondsFromGMT: 0)!

  static var isoCal: Calendar {
    var c = Calendar(identifier: .gregorian)
    c.timeZone = tz
    return c
  }

  static func isoDayString(from d: Date) -> String {
    let y = isoCal.component(.year, from: d)
    let m = isoCal.component(.month, from: d)
    let day = isoCal.component(.day, from: d)
    return String(format: "%04d-%02d-%02d", y, m, day)
  }

  static func startOfUtcMonth(containing d: Date) -> Date {
    let y = isoCal.component(.year, from: d)
    let m = isoCal.component(.month, from: d)
    return isoCal.date(from: DateComponents(year: y, month: m, day: 1)) ?? d
  }

  static func endOfUtcMonth(containing d: Date) -> Date {
    let start = startOfUtcMonth(containing: d)
    guard let next = isoCal.date(byAdding: .month, value: 1, to: start) else { return d }
    return isoCal.date(byAdding: .day, value: -1, to: next) ?? d
  }

  static func defaultMonthBounds(reference: Date = Date()) -> (Date, Date) {
    (startOfUtcMonth(containing: reference), endOfUtcMonth(containing: reference))
  }

  static func inclusiveUtcMonthCount(from start: Date, to end: Date) -> Int {
    let lo = min(start, end)
    let hi = max(start, end)
    let s = startOfUtcMonth(containing: lo)
    let e = startOfUtcMonth(containing: hi)
    let y1 = isoCal.component(.year, from: s)
    let m1 = isoCal.component(.month, from: s)
    let y2 = isoCal.component(.year, from: e)
    let m2 = isoCal.component(.month, from: e)
    return max(1, (y2 - y1) * 12 + (m2 - m1) + 1)
  }

  static func clampRange(from: Date, to: Date) -> (Date, Date) {
    let lo = min(from, to)
    var hi = max(from, to)
    let days = isoCal.dateComponents([.day], from: lo, to: hi).day ?? 0
    if days > 731, let capped = isoCal.date(byAdding: .day, value: 731, to: lo) {
      hi = capped
    }
    return (lo, hi)
  }

  static func utcMidnightZ(isoDay: String) -> String { "\(isoDay)T00:00:00.000Z" }

  static func nextUtcMidnightZ(afterIsoDay day: String) -> String {
    let f = DateFormatter()
    f.calendar = isoCal
    f.locale = Locale(identifier: "en_US_POSIX")
    f.timeZone = tz
    f.dateFormat = "yyyy-MM-dd"
    guard let d = f.date(from: day),
          let next = isoCal.date(byAdding: .day, value: 1, to: d)
    else { return "\(day)T00:00:00.000Z" }
    return utcMidnightZ(isoDay: isoDayString(from: next))
  }

  static func monthStartIsoDays(from start: Date, to end: Date) -> [String] {
    let (a, b) = clampRange(from: start, to: end)
    let s = startOfUtcMonth(containing: a)
    let e = startOfUtcMonth(containing: b)
    var out: [String] = []
    var cur = s
    while cur <= e {
      out.append(isoDayString(from: cur))
      guard let n = isoCal.date(byAdding: .month, value: 1, to: cur) else { break }
      cur = n
      if out.count > 240 { break }
    }
    return out
  }
}

// MARK: - Dinamik özet

struct DashboardDynamicMetrics {
  let maintenanceExpectedSlots: Int
  let maintenanceCoveredCount: Int
  let revenueByCurrency: [String: Double]
  let failuresCreatedCount: Int
  let failuresUnsolvedCount: Int
  let periodicDueCount: Int

  static let empty = DashboardDynamicMetrics(
    maintenanceExpectedSlots: 0,
    maintenanceCoveredCount: 0,
    revenueByCurrency: [:],
    failuresCreatedCount: 0,
    failuresUnsolvedCount: 0,
    periodicDueCount: 0,
  )

  func revenueDisplay() -> String {
    if revenueByCurrency.isEmpty { return "—" }
    return revenueByCurrency.keys.sorted().map { cur in
      DashboardMetricMoney.format(amount: revenueByCurrency[cur] ?? 0, currency: cur)
    }.joined(separator: " · ")
  }
}

private extension String {
  var nilIfEmpty: String? {
    let t = trimmingCharacters(in: .whitespacesAndNewlines)
    return t.isEmpty ? nil : t
  }
}

enum DashboardMetricMoney {
  static func format(amount: Double, currency: String) -> String {
    let f = NumberFormatter()
    f.locale = Locale(identifier: "tr_TR")
    f.minimumFractionDigits = 2
    f.maximumFractionDigits = 2
    f.numberStyle = .decimal
    let num = f.string(from: NSNumber(value: amount)) ?? String(amount)
    let cur = currency.trimmingCharacters(in: .whitespacesAndNewlines)
    return cur.isEmpty ? num : "\(num) \(cur)"
  }
}

enum DashboardMetricsFetcher {
  static func fetch(
    client: SupabaseClient,
    tenantId: UUID,
    rangeStart: Date,
    rangeEnd: Date,
  ) async throws -> DashboardDynamicMetrics {
    let (a, b) = DashboardUTC.clampRange(from: rangeStart, to: rangeEnd)
    let fromISO = DashboardUTC.isoDayString(from: a)
    let toISO = DashboardUTC.isoDayString(from: b)
    let startZ = DashboardUTC.utcMidnightZ(isoDay: fromISO)
    let endExclusiveZ = DashboardUTC.nextUtcMidnightZ(afterIsoDay: toISO)

    async let eligibleTask = fetchEligibleElevatorCount(client: client, tenantId: tenantId)
    async let coveredTask = headMonthlyMaintenanceCovered(
      client: client,
      tenantId: tenantId,
      startZ: startZ,
      endExclusiveZ: endExclusiveZ,
    )
    async let revenueTask = aggregatePayments(
      client: client,
      tenantId: tenantId,
      fromISO: fromISO,
      toISO: toISO,
    )
    async let failuresTask = headFailuresCreated(
      client: client,
      tenantId: tenantId,
      startZ: startZ,
      endExclusiveZ: endExclusiveZ,
    )
    async let failuresOpenTask = headFailuresUnsolved(
      client: client,
      tenantId: tenantId,
      startZ: startZ,
      endExclusiveZ: endExclusiveZ,
    )
    async let periodicTask = headPeriodicDue(
      client: client,
      tenantId: tenantId,
      fromISO: fromISO,
      toISO: toISO,
    )

    let eligible = try await eligibleTask
    let months = DashboardUTC.inclusiveUtcMonthCount(from: a, to: b)

    return DashboardDynamicMetrics(
      maintenanceExpectedSlots: eligible * months,
      maintenanceCoveredCount: try await coveredTask,
      revenueByCurrency: try await revenueTask,
      failuresCreatedCount: try await failuresTask,
      failuresUnsolvedCount: try await failuresOpenTask,
      periodicDueCount: try await periodicTask,
    )
  }

  private static func fetchEligibleElevatorCount(client: SupabaseClient, tenantId: UUID) async throws -> Int {
    let response: PostgrestResponse<[OperationalRow]> = try await client
      .from("elevator_assets")
      .select("operational_status")
      .eq("tenant_id", value: tenantId)
      .execute()
    return response.value.filter { ($0.operationalStatus ?? "") != "decommissioned" }.count
  }

  private struct OperationalRow: Decodable {
    let operationalStatus: String?
    enum CodingKeys: String, CodingKey {
      case operationalStatus = "operational_status"
    }
  }

  private static func headMonthlyMaintenanceCovered(
    client: SupabaseClient,
    tenantId: UUID,
    startZ: String,
    endExclusiveZ: String,
  ) async throws -> Int {
    let response: PostgrestResponse<Void> = try await client
      .from("elevator_monthly_maintenance")
      .select("id", head: true, count: .exact)
      .eq("tenant_id", value: tenantId)
      .gte("completed_at", value: startZ)
      .lt("completed_at", value: endExclusiveZ)
      .execute()
    return response.count ?? 0
  }

  private static func aggregatePayments(
    client: SupabaseClient,
    tenantId: UUID,
    fromISO: String,
    toISO: String,
  ) async throws -> [String: Double] {
    let response: PostgrestResponse<[PaymentDecode]> = try await client
      .from("finance_entries")
      .select("amount,currency")
      .eq("tenant_id", value: tenantId)
      .eq("entry_type", value: "payment")
      .gte("occurred_on", value: fromISO)
      .lte("occurred_on", value: toISO)
      .limit(8000)
      .execute()
    var sums: [String: Double] = [:]
    for row in response.value {
      let cur = row.currency?.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty ?? "TRY"
      sums[cur, default: 0] += row.amountValue
    }
    return sums
  }

  private struct PaymentDecode: Decodable {
    let currency: String?
    let amountValue: Double

    enum CodingKeys: String, CodingKey {
      case currency
      case amount
    }

    init(from decoder: Decoder) throws {
      let c = try decoder.container(keyedBy: CodingKeys.self)
      currency = try c.decodeIfPresent(String.self, forKey: .currency)
      if let d = try? c.decode(Double.self, forKey: .amount) {
        amountValue = d
      } else if let s = try? c.decode(String.self, forKey: .amount),
                let d = Double(s.replacingOccurrences(of: ",", with: ".")) {
        amountValue = d
      } else {
        amountValue = 0
      }
    }
  }

  private static func headFailuresCreated(
    client: SupabaseClient,
    tenantId: UUID,
    startZ: String,
    endExclusiveZ: String,
  ) async throws -> Int {
    let response: PostgrestResponse<Void> = try await client
      .from("work_orders")
      .select("id", head: true, count: .exact)
      .eq("tenant_id", value: tenantId)
      .eq("work_type", value: "emergency_breakdown")
      .gte("created_at", value: startZ)
      .lt("created_at", value: endExclusiveZ)
      .execute()
    return response.count ?? 0
  }

  private static func headFailuresUnsolved(
    client: SupabaseClient,
    tenantId: UUID,
    startZ: String,
    endExclusiveZ: String,
  ) async throws -> Int {
    let response: PostgrestResponse<Void> = try await client
      .from("work_orders")
      .select("id", head: true, count: .exact)
      .eq("tenant_id", value: tenantId)
      .eq("work_type", value: "emergency_breakdown")
      .gte("created_at", value: startZ)
      .lt("created_at", value: endExclusiveZ)
      .not("status", operator: .eq, value: "completed")
      .not("status", operator: .eq, value: "cancelled")
      .execute()
    return response.count ?? 0
  }

  private static func headPeriodicDue(
    client: SupabaseClient,
    tenantId: UUID,
    fromISO: String,
    toISO: String,
  ) async throws -> Int {
    let response: PostgrestResponse<Void> = try await client
      .from("elevator_assets")
      .select("id", head: true, count: .exact)
      .eq("tenant_id", value: tenantId)
      .gte("en8120_next_control_due", value: fromISO)
      .lte("en8120_next_control_due", value: toISO)
      .execute()
    return response.count ?? 0
  }
}

// MARK: - Drill-down türü

enum DashboardMetricKind: Hashable {
  case maintenanceExpected
  case maintenanceCovered
  case revenue
  case failures
  case failuresOpen
  case periodicUpcoming

  var title: String {
    switch self {
    case .maintenanceExpected: TrStrings.Dashboard.maintenanceExpected
    case .maintenanceCovered: TrStrings.Dashboard.maintenanceCovered
    case .revenue: TrStrings.Dashboard.revenuePayments
    case .failures: TrStrings.Dashboard.failuresTotal
    case .failuresOpen: TrStrings.Dashboard.failuresOpen
    case .periodicUpcoming: TrStrings.Dashboard.periodicUpcoming
    }
  }
}

struct DashboardMetricListView: View {
  let client: SupabaseClient
  let kind: DashboardMetricKind
  let rangeStart: Date
  let rangeEnd: Date

  var body: some View {
    Group {
      switch kind {
      case .maintenanceExpected:
        DashboardMaintenanceExpectedList(client: client, rangeStart: rangeStart, rangeEnd: rangeEnd)
      case .maintenanceCovered:
        DashboardMaintenanceCoveredList(client: client, rangeStart: rangeStart, rangeEnd: rangeEnd)
      case .revenue:
        DashboardRevenuePaymentsList(client: client, rangeStart: rangeStart, rangeEnd: rangeEnd)
      case .failures:
        DashboardFailuresList(client: client, rangeStart: rangeStart, rangeEnd: rangeEnd, openOnly: false)
      case .failuresOpen:
        DashboardFailuresList(client: client, rangeStart: rangeStart, rangeEnd: rangeEnd, openOnly: true)
      case .periodicUpcoming:
        DashboardPeriodicDueList(client: client, rangeStart: rangeStart, rangeEnd: rangeEnd)
      }
    }
    .navigationTitle(kind.title)
    .navigationBarTitleDisplayMode(.inline)
    .fieldTabBarScrollContentInset()
  }
}

// MARK: - Paylaşılan gömülü satırlar

private struct DMNameEmbed: Decodable {
  let name: String?
}

private struct DMCustEmbed: Decodable {
  let legalName: String?
  enum CodingKeys: String, CodingKey {
    case legalName = "legal_name"
  }
}

private struct DMAssetLite: Decodable, Identifiable {
  let id: UUID
  let unitCode: String
  let operationalStatus: String?
  let sites: DMNameEmbed?
  let customers: DMCustEmbed?

  enum CodingKeys: String, CodingKey {
    case id
    case unitCode = "unit_code"
    case operationalStatus = "operational_status"
    case sites
    case customers
  }

  var siteName: String { sites?.name ?? "—" }
  var customerName: String { customers?.legalName ?? "—" }
}

private struct DMExpectedPair: Identifiable {
  let id: String
  let dueMonth: String
  let asset: DMAssetLite
}

private struct DashboardMaintenanceExpectedList: View {
  let client: SupabaseClient
  let rangeStart: Date
  let rangeEnd: Date

  @State private var pairs: [DMExpectedPair] = []
  @State private var loadError: String?
  @State private var loading = true

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.Dashboard.maintenanceExpected, systemImage: "calendar", description: Text(loadError))
      } else if pairs.isEmpty {
        ContentUnavailableView(TrStrings.Dashboard.maintenanceExpected, systemImage: "calendar", description: Text("—"))
      } else {
        List(pairs) { row in
          NavigationLink {
            AssetDetailView(client: client, assetId: row.asset.id)
          } label: {
            VStack(alignment: .leading, spacing: 4) {
              Text(row.asset.unitCode).font(.headline)
              Text("\(TrStrings.Dashboard.colDueMonth): \(String(row.dueMonth.prefix(10)))")
                .font(.caption)
              Text("\(TrStrings.Assets.site): \(row.asset.siteName)")
                .font(.caption2)
                .foregroundStyle(.secondary)
            }
          }
        }
      }
    }
    .task { await load() }
  }

  private func load() async {
    loading = true
    loadError = nil
    defer { loading = false }
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else {
        pairs = []
        return
      }
      let (a, b) = DashboardUTC.clampRange(from: rangeStart, to: rangeEnd)
      let response: PostgrestResponse<[DMAssetLite]> = try await client
        .from("elevator_assets")
        .select("id,unit_code,operational_status,sites(name),customers(legal_name)")
        .eq("tenant_id", value: tenantId)
        .execute()
      let assets = response.value.filter { ($0.operationalStatus ?? "") != "decommissioned" }
      let months = DashboardUTC.monthStartIsoDays(from: a, to: b)
      var out: [DMExpectedPair] = []
      for ym in months {
        for asset in assets {
          let id = "\(asset.id.uuidString.lowercased())-\(ym)"
          out.append(DMExpectedPair(id: id, dueMonth: ym, asset: asset))
          if out.count >= 200 { break }
        }
        if out.count >= 200 { break }
      }
      pairs = out
    } catch {
      loadError = error.localizedDescription
      pairs = []
    }
  }
}

private struct DMMaintRow: Decodable, Identifiable {
  let id: UUID
  let completedAt: String
  let yearMonth: String
  let elevatorAssetId: UUID
  enum CodingKeys: String, CodingKey {
    case id
    case completedAt = "completed_at"
    case yearMonth = "year_month"
    case elevatorAssetId = "elevator_asset_id"
  }
}

private struct DashboardMaintenanceCoveredList: View {
  let client: SupabaseClient
  let rangeStart: Date
  let rangeEnd: Date

  @State private var rows: [DMMaintDisplay] = []
  @State private var loadError: String?
  @State private var loading = true

  private struct DMMaintDisplay: Identifiable {
    let id: UUID
    let completedAt: String
    let yearMonth: String
    let unitCode: String
    let siteName: String
    let customerName: String
  }

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.Dashboard.maintenanceCovered, systemImage: "checkmark.circle", description: Text(loadError))
      } else if rows.isEmpty {
        ContentUnavailableView(TrStrings.Dashboard.maintenanceCovered, systemImage: "checkmark.circle", description: Text("—"))
      } else {
        List(rows) { row in
          VStack(alignment: .leading, spacing: 4) {
            Text(row.unitCode).font(.headline)
            Text("\(TrStrings.Dashboard.colCompletedAt): \(String(row.completedAt.prefix(16)).replacingOccurrences(of: "T", with: " "))")
              .font(.caption)
            Text("\(TrStrings.Dashboard.colYearMonth): \(String(row.yearMonth.prefix(10)))")
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
        }
      }
    }
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
      let (a, b) = DashboardUTC.clampRange(from: rangeStart, to: rangeEnd)
      let fromISO = DashboardUTC.isoDayString(from: a)
      let toISO = DashboardUTC.isoDayString(from: b)
      let startZ = DashboardUTC.utcMidnightZ(isoDay: fromISO)
      let endExclusiveZ = DashboardUTC.nextUtcMidnightZ(afterIsoDay: toISO)

      let maintRes: PostgrestResponse<[DMMaintRow]> = try await client
        .from("elevator_monthly_maintenance")
        .select("id,completed_at,year_month,elevator_asset_id")
        .eq("tenant_id", value: tenantId)
        .gte("completed_at", value: startZ)
        .lt("completed_at", value: endExclusiveZ)
        .order("completed_at", ascending: false)
        .limit(200)
        .execute()

      let assetRes: PostgrestResponse<[DMAssetLite]> = try await client
        .from("elevator_assets")
        .select("id,unit_code,operational_status,sites(name),customers(legal_name)")
        .eq("tenant_id", value: tenantId)
        .execute()
      let byId = Dictionary(uniqueKeysWithValues: assetRes.value.map { ($0.id, $0) })

      rows = maintRes.value.compactMap { m in
        guard let asset = byId[m.elevatorAssetId] else {
          return DMMaintDisplay(
            id: m.id,
            completedAt: m.completedAt,
            yearMonth: m.yearMonth,
            unitCode: "—",
            siteName: "—",
            customerName: "—",
          )
        }
        return DMMaintDisplay(
          id: m.id,
          completedAt: m.completedAt,
          yearMonth: m.yearMonth,
          unitCode: asset.unitCode,
          siteName: asset.siteName,
          customerName: asset.customerName,
        )
      }
    } catch {
      loadError = error.localizedDescription
      rows = []
    }
  }
}

private struct DMFinanceRow: Decodable, Identifiable {
  let id: UUID
  let amountRaw: String
  let currency: String?
  let label: String
  let occurredOn: String
  let elevatorAssetId: UUID?

  enum CodingKeys: String, CodingKey {
    case id
    case currency
    case label
    case occurredOn = "occurred_on"
    case elevatorAssetId = "elevator_asset_id"
    case amount
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id = try c.decode(UUID.self, forKey: .id)
    currency = try c.decodeIfPresent(String.self, forKey: .currency)
    label = try c.decode(String.self, forKey: .label)
    occurredOn = try c.decode(String.self, forKey: .occurredOn)
    elevatorAssetId = try c.decodeIfPresent(UUID.self, forKey: .elevatorAssetId)
    if let d = try? c.decode(Double.self, forKey: .amount) {
      amountRaw = String(d)
    } else if let s = try? c.decode(String.self, forKey: .amount) {
      amountRaw = s
    } else {
      amountRaw = "0"
    }
  }

  var amountDouble: Double {
    Double(amountRaw.replacingOccurrences(of: ",", with: ".")) ?? 0
  }
}

private struct DashboardRevenuePaymentsList: View {
  let client: SupabaseClient
  let rangeStart: Date
  let rangeEnd: Date

  @State private var rows: [DMFinanceRow] = []
  @State private var assetsById: [UUID: DMAssetLite] = [:]
  @State private var loadError: String?
  @State private var loading = true

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.Dashboard.revenuePayments, systemImage: "banknote", description: Text(loadError))
      } else if rows.isEmpty {
        ContentUnavailableView(TrStrings.Dashboard.revenuePayments, systemImage: "banknote", description: Text("—"))
      } else {
        List(rows) { row in
          VStack(alignment: .leading, spacing: 4) {
            Text(DashboardMetricMoney.format(amount: row.amountDouble, currency: row.currency ?? "TRY"))
              .font(.headline.monospacedDigit())
            Text(row.label).font(.subheadline)
            Text("\(TrStrings.Dashboard.colOccurredOn): \(String(row.occurredOn.prefix(10)))")
              .font(.caption)
              .foregroundStyle(.secondary)
            if let aid = row.elevatorAssetId, let unit = assetsById[aid]?.unitCode {
              Text("\(TrStrings.Assets.unit): \(unit)")
                .font(.caption2)
                .foregroundStyle(.tertiary)
            }
          }
        }
      }
    }
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
      let (a, b) = DashboardUTC.clampRange(from: rangeStart, to: rangeEnd)
      let fromISO = DashboardUTC.isoDayString(from: a)
      let toISO = DashboardUTC.isoDayString(from: b)

      async let fin: PostgrestResponse<[DMFinanceRow]> = client
        .from("finance_entries")
        .select("id,amount,currency,label,occurred_on,elevator_asset_id")
        .eq("tenant_id", value: tenantId)
        .eq("entry_type", value: "payment")
        .gte("occurred_on", value: fromISO)
        .lte("occurred_on", value: toISO)
        .order("occurred_on", ascending: false)
        .limit(200)
        .execute()

      async let assetRes: PostgrestResponse<[DMAssetLite]> = client
        .from("elevator_assets")
        .select("id,unit_code,operational_status,sites(name),customers(legal_name)")
        .eq("tenant_id", value: tenantId)
        .execute()

      let (fr, ar) = try await (fin, assetRes)
      rows = fr.value
      assetsById = Dictionary(uniqueKeysWithValues: ar.value.map { ($0.id, $0) })
    } catch {
      loadError = error.localizedDescription
      rows = []
    }
  }
}

private struct DMWoFailureRow: Decodable, Identifiable {
  let id: UUID
  let number: String
  let status: String
  let createdAt: String
  enum CodingKeys: String, CodingKey {
    case id
    case number
    case status
    case createdAt = "created_at"
  }
}

private struct DashboardFailuresList: View {
  let client: SupabaseClient
  let rangeStart: Date
  let rangeEnd: Date
  let openOnly: Bool

  @State private var rows: [DMWoFailureRow] = []
  @State private var loadError: String?
  @State private var loading = true

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(titleStr, systemImage: "exclamationmark.triangle", description: Text(loadError))
      } else if rows.isEmpty {
        ContentUnavailableView(titleStr, systemImage: "exclamationmark.triangle", description: Text("—"))
      } else {
        List(rows) { row in
          NavigationLink {
            WorkOrderDetailView(client: client, workOrderId: row.id)
          } label: {
            VStack(alignment: .leading, spacing: 4) {
              Text(row.number).font(.headline.monospaced())
              Text(row.status).font(.caption).foregroundStyle(.secondary)
              Text("\(TrStrings.Dashboard.colCreatedAt): \(String(row.createdAt.prefix(16)).replacingOccurrences(of: "T", with: " "))")
                .font(.caption2)
            }
          }
        }
      }
    }
    .task { await load() }
  }

  private var titleStr: String {
    openOnly ? TrStrings.Dashboard.failuresOpen : TrStrings.Dashboard.failuresTotal
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
      let (a, b) = DashboardUTC.clampRange(from: rangeStart, to: rangeEnd)
      let fromISO = DashboardUTC.isoDayString(from: a)
      let toISO = DashboardUTC.isoDayString(from: b)
      let startZ = DashboardUTC.utcMidnightZ(isoDay: fromISO)
      let endExclusiveZ = DashboardUTC.nextUtcMidnightZ(afterIsoDay: toISO)

      let response: PostgrestResponse<[DMWoFailureRow]>
      if openOnly {
        response = try await client
          .from("work_orders")
          .select("id,number,status,created_at")
          .eq("tenant_id", value: tenantId)
          .eq("work_type", value: "emergency_breakdown")
          .gte("created_at", value: startZ)
          .lt("created_at", value: endExclusiveZ)
          .not("status", operator: .eq, value: "completed")
          .not("status", operator: .eq, value: "cancelled")
          .order("created_at", ascending: false)
          .limit(200)
          .execute()
      } else {
        response = try await client
          .from("work_orders")
          .select("id,number,status,created_at")
          .eq("tenant_id", value: tenantId)
          .eq("work_type", value: "emergency_breakdown")
          .gte("created_at", value: startZ)
          .lt("created_at", value: endExclusiveZ)
          .order("created_at", ascending: false)
          .limit(200)
          .execute()
      }
      rows = response.value
    } catch {
      loadError = error.localizedDescription
      rows = []
    }
  }
}

private struct DMPeriodicRow: Decodable, Identifiable {
  let id: UUID
  let unitCode: String
  let en8120NextControlDue: String?
  let sites: DMNameEmbed?
  let customers: DMCustEmbed?
  enum CodingKeys: String, CodingKey {
    case id
    case unitCode = "unit_code"
    case en8120NextControlDue = "en8120_next_control_due"
    case sites
    case customers
  }

  var siteName: String { sites?.name ?? "—" }
  var customerName: String { customers?.legalName ?? "—" }
}

private struct DashboardPeriodicDueList: View {
  let client: SupabaseClient
  let rangeStart: Date
  let rangeEnd: Date

  @State private var rows: [DMPeriodicRow] = []
  @State private var loadError: String?
  @State private var loading = true

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.Dashboard.periodicUpcoming, systemImage: "checklist", description: Text(loadError))
      } else if rows.isEmpty {
        ContentUnavailableView(TrStrings.Dashboard.periodicUpcoming, systemImage: "checklist", description: Text("—"))
      } else {
        List(rows) { row in
          NavigationLink {
            AssetDetailView(client: client, assetId: row.id)
          } label: {
            VStack(alignment: .leading, spacing: 4) {
              Text(row.unitCode).font(.headline)
              Text("\(TrStrings.En8120.nextControlDue): \(String((row.en8120NextControlDue ?? "").prefix(10)))")
                .font(.caption)
              Text("\(TrStrings.Assets.site): \(row.siteName)")
                .font(.caption2)
                .foregroundStyle(.secondary)
            }
          }
        }
      }
    }
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
      let (a, b) = DashboardUTC.clampRange(from: rangeStart, to: rangeEnd)
      let fromISO = DashboardUTC.isoDayString(from: a)
      let toISO = DashboardUTC.isoDayString(from: b)

      let response: PostgrestResponse<[DMPeriodicRow]> = try await client
        .from("elevator_assets")
        .select("id,unit_code,en8120_next_control_due,sites(name),customers(legal_name)")
        .eq("tenant_id", value: tenantId)
        .gte("en8120_next_control_due", value: fromISO)
        .lte("en8120_next_control_due", value: toISO)
        .order("en8120_next_control_due", ascending: true)
        .limit(200)
        .execute()
      rows = response.value
    } catch {
      loadError = error.localizedDescription
      rows = []
    }
  }
}
