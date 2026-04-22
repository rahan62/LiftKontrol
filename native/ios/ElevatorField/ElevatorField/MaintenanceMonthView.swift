import SwiftUI
import Supabase

struct MaintenanceMonthView: View {
  let client: SupabaseClient

  @State private var year: Int
  @State private var month: Int
  @State private var rows: [MaintenanceRowDisplay] = []
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
      monthPicker
      Group {
        if loading {
          ProgressView(TrStrings.Common.loading)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .padding(.top, 24)
        } else if let loadError {
          ContentUnavailableView(TrStrings.Maintenance.title, systemImage: "list.clipboard", description: Text(loadError))
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        } else {
          List(rows) { row in
            NavigationLink(value: row.id) {
              VStack(alignment: .leading, spacing: 6) {
                Text(row.unitCode)
                  .font(.headline)
                Text("\(TrStrings.Assets.customerName): \(row.customerName)")
                  .font(.caption)
                  .foregroundStyle(.secondary)
                Text("\(TrStrings.Assets.site): \(row.siteName)")
                  .font(.caption)
                  .foregroundStyle(.secondary)
                HStack {
                  Text(row.isDone ? TrStrings.Maintenance.done : TrStrings.Maintenance.pending)
                    .font(.subheadline)
                    .foregroundStyle(row.isDone ? .green : .orange)
                  Spacer()
                  if let completed = row.completedAt {
                    Text("\(TrStrings.Maintenance.completedAt): \(Self.formatDate(completed))")
                      .font(.caption2)
                      .foregroundStyle(.tertiary)
                  }
                }
              }
              .padding(.vertical, 4)
            }
            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
              if row.isDone, let mid = row.maintenanceRecordId {
                Button(role: .destructive) {
                  Task { await unmarkComplete(maintenanceId: mid) }
                } label: {
                  Label(TrStrings.Maintenance.unmarkSwipe, systemImage: "arrow.uturn.backward")
                }
              } else {
                Button {
                  Task { await markComplete(assetId: row.id) }
                } label: {
                  Label(TrStrings.Maintenance.markCompleteSwipe, systemImage: "checkmark.circle")
                }
                .tint(.green)
              }
            }
          }
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    .navigationTitle(TrStrings.Maintenance.title)
    .navigationBarTitleDisplayMode(.inline)
    .fieldTabBarScrollContentInset()
    .task(id: "\(year)-\(month)") { await load() }
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

  private func load() async {
    loading = true
    loadError = nil
    defer { loading = false }
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else {
        rows = []
        loadError = TrStrings.Maintenance.noTenant
        return
      }
      let ym = Self.yearMonthString(year: year, month: month)
      let assetsResponse: PostgrestResponse<[AssetMaintDTO]> = try await client
        .from("elevator_assets")
        .select("id, unit_code, sites(name), customers(legal_name)")
        .eq("tenant_id", value: tenantId)
        .execute()
      let maintResponse: PostgrestResponse<[MaintRecordDTO]> = try await client
        .from("elevator_monthly_maintenance")
        .select("id, elevator_asset_id, completed_at, notes")
        .eq("tenant_id", value: tenantId)
        .eq("year_month", value: ym)
        .execute()
      let byAsset = Dictionary(uniqueKeysWithValues: maintResponse.value.map { ($0.elevatorAssetId, $0) })
      let sorted = assetsResponse.value.sorted {
        let a = ($0.customers?.legalName ?? "", $0.sites?.name ?? "", $0.unitCode)
        let b = ($1.customers?.legalName ?? "", $1.sites?.name ?? "", $1.unitCode)
        return a < b
      }
      rows = sorted.map { a in
        let m = byAsset[a.id]
        return MaintenanceRowDisplay(
          id: a.id,
          maintenanceRecordId: m?.id,
          unitCode: a.unitCode,
          customerName: a.customers?.legalName ?? "—",
          siteName: a.sites?.name ?? "—",
          isDone: m != nil,
          completedAt: m?.completedAt
        )
      }
    } catch {
      loadError = error.localizedDescription
    }
  }

  private static func yearMonthString(year: Int, month: Int) -> String {
    String(format: "%04d-%02d-01", year, month)
  }

  private static func formatDate(_ iso: String) -> String {
    String(iso.prefix(16)).replacingOccurrences(of: "T", with: " ")
  }

  private func markComplete(assetId: UUID) async {
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else { return }
      let ym = Self.yearMonthString(year: year, month: month)
      let payload = MonthlyMaintenanceUpsertPayload(
        tenant_id: tenantId,
        elevator_asset_id: assetId,
        year_month: ym,
        completed_at: isoNow(),
        notes: nil,
        monthly_checklist: [String: String]()
      )
      try await client
        .from("elevator_monthly_maintenance")
        .upsert(
          payload,
          onConflict: "tenant_id,elevator_asset_id,year_month",
          returning: .minimal
        )
        .execute()
      await MonthlyMaintenanceFeeFinance.maybeCreateRowAfterMaintenanceComplete(
        client: client,
        tenantId: tenantId,
        assetId: assetId,
        yearMonth: ym
      )
      await load()
    } catch {
      loadError = error.localizedDescription
    }
  }

  private func unmarkComplete(maintenanceId: UUID) async {
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else { return }
      try await client
        .from("elevator_monthly_maintenance")
        .delete()
        .eq("tenant_id", value: tenantId)
        .eq("id", value: maintenanceId)
        .execute()
      await load()
    } catch {
      loadError = error.localizedDescription
    }
  }

  private func isoNow() -> String {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f.string(from: Date())
  }
}

private struct AssetMaintDTO: Decodable, Identifiable {
  let id: UUID
  let unitCode: String
  let sites: SiteN?
  let customers: CustomerN?

  enum CodingKeys: String, CodingKey {
    case id
    case unitCode = "unit_code"
    case sites, customers
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

private struct MaintRecordDTO: Decodable {
  let id: UUID
  let elevatorAssetId: UUID
  let completedAt: String?
  enum CodingKeys: String, CodingKey {
    case id
    case elevatorAssetId = "elevator_asset_id"
    case completedAt = "completed_at"
  }
}

private struct MaintenanceRowDisplay: Identifiable {
  let id: UUID
  let maintenanceRecordId: UUID?
  let unitCode: String
  let customerName: String
  let siteName: String
  let isDone: Bool
  let completedAt: String?
}

struct MonthlyMaintenanceUpsertPayload: Encodable {
  let tenant_id: UUID
  let elevator_asset_id: UUID
  let year_month: String
  let completed_at: String
  let notes: String?
  let monthly_checklist: [String: String]
}

// MARK: - Web `maybeCreateSiteMaintenanceFeeFinance` ile uyumlu otomatik finans satırı

enum MonthlyMaintenanceFeeFinance {
  static func marker(assetId: UUID, yearMonth: String) -> String {
    "AUTO_MAINTENANCE_MONTH_ASSET:\(assetId.uuidString.lowercased()):\(yearMonth)"
  }

  /// Bakım kaydı başarılı olduktan sonra; hata olursa bakım yine geçerlidir (yalnızca finans eklenmez).
  static func maybeCreateRowAfterMaintenanceComplete(
    client: SupabaseClient,
    tenantId: UUID,
    assetId: UUID,
    yearMonth: String
  ) async {
    do {
      try await createIfNeeded(client: client, tenantId: tenantId, assetId: assetId, yearMonth: yearMonth)
    } catch {
      #if DEBUG
      print("[MonthlyMaintenanceFeeFinance]", error.localizedDescription)
      #endif
    }
  }

  private static func createIfNeeded(
    client: SupabaseClient,
    tenantId: UUID,
    assetId: UUID,
    yearMonth: String
  ) async throws {
    let assetRes: PostgrestResponse<AssetFeeForFinance> = try await client
      .from("elevator_assets")
      .select("unit_code, maintenance_fee, maintenance_fee_period")
      .eq("tenant_id", value: tenantId)
      .eq("id", value: assetId)
      .single()
      .execute()
    let u = assetRes.value
    guard let amount = u.maintenanceFee, amount > 0, u.maintenanceFeePeriod == "monthly" else { return }

    let m = marker(assetId: assetId, yearMonth: yearMonth)
    struct NoteRow: Decodable {
      let notes: String?
    }
    let existing: PostgrestResponse<[NoteRow]> = try await client
      .from("finance_entries")
      .select("notes")
      .eq("tenant_id", value: tenantId)
      .eq("elevator_asset_id", value: assetId)
      .eq("entry_type", value: "fee")
      .order("occurred_on", ascending: false)
      .limit(80)
      .execute()
    if existing.value.contains(where: { ($0.notes ?? "").localizedStandardContains(m) }) { return }

    let rawCode = (u.unitCode ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    let unitLabel = rawCode.isEmpty ? "Ünite" : rawCode
    let monthTitle = trMonthYearLabel(yearMonthFirstDay: yearMonth)
    let label = "Aylık bakım ücreti — \(unitLabel) (\(monthTitle))"
    let notesBody =
      "\(m)\nAylık bakım kaydı tamamlandığında otomatik oluşturuldu."
    let occurredOn = String(yearMonth.prefix(10))

    let insert = FinanceEntryFeeInsert(
      tenant_id: tenantId,
      elevator_asset_id: assetId,
      amount: amount,
      label: label,
      notes: notesBody,
      occurred_on: occurredOn
    )
    try await client.from("finance_entries").insert(insert).execute()
  }

  private static func trMonthYearLabel(yearMonthFirstDay ym: String) -> String {
    let head = String(ym.prefix(10))
    let dfIn = DateFormatter()
    dfIn.locale = Locale(identifier: "en_US_POSIX")
    dfIn.timeZone = TimeZone(identifier: "UTC")
    dfIn.dateFormat = "yyyy-MM-dd"
    guard let d = dfIn.date(from: head) else { return head }
    let dfOut = DateFormatter()
    dfOut.locale = Locale(identifier: "tr_TR")
    dfOut.timeZone = TimeZone(identifier: "UTC")
    dfOut.dateFormat = "MMMM yyyy"
    dfOut.calendar = Calendar(identifier: .gregorian)
    return dfOut.string(from: d)
  }

  private struct AssetFeeForFinance: Decodable {
    let unitCode: String?
    let maintenanceFee: Double?
    let maintenanceFeePeriod: String?
    enum CodingKeys: String, CodingKey {
      case unitCode = "unit_code"
      case maintenanceFee = "maintenance_fee"
      case maintenanceFeePeriod = "maintenance_fee_period"
    }
    init(from decoder: Decoder) throws {
      let c = try decoder.container(keyedBy: CodingKeys.self)
      unitCode = try c.decodeIfPresent(String.self, forKey: .unitCode)
      maintenanceFeePeriod = try c.decodeIfPresent(String.self, forKey: .maintenanceFeePeriod)
      if let d = try? c.decode(Double.self, forKey: .maintenanceFee) {
        maintenanceFee = d
      } else if let s = try? c.decode(String.self, forKey: .maintenanceFee) {
        maintenanceFee = Double(s.replacingOccurrences(of: ",", with: "."))
      } else if let i = try? c.decode(Int.self, forKey: .maintenanceFee) {
        maintenanceFee = Double(i)
      } else {
        maintenanceFee = nil
      }
    }
  }

  private struct FinanceEntryFeeInsert: Encodable {
    let tenant_id: UUID
    let site_id: UUID? = nil
    let elevator_asset_id: UUID
    let entry_type: String = "fee"
    let amount: Double
    let currency: String = "TRY"
    let label: String
    let notes: String
    let occurred_on: String
    let payment_status: String = "unpaid"
  }
}
