import SwiftUI
import Supabase
import UIKit

struct AssetDetailView: View {
  let client: SupabaseClient
  let assetId: UUID

  @State private var row: AssetDetailRow?
  @State private var financeRows: [FinanceEntryRowDTO] = []
  @State private var workOrderRows: [AssetWorkOrderRowDTO] = []
  @State private var currentMonthMaint: AssetCurrentMonthMaint?
  @State private var maintActionBusy = false
  @State private var loadError: String?
  @State private var loading = true
  /// Liste QR satırı için `load()` içinde ağ ile paralel üretilir (ilk açılışta ekstra layout işi olmasın).
  @State private var qrListPreviewImage: UIImage?
  @State private var qrListPreviewFailed = false
  /// Paylaşım yalnızca dosya hazır olduğunda açılır (ilk dokunuşta boş sheet önlenir).
  @State private var elevatorTagShareItem: ElevatorTagSharePayload?

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.Assets.listTitle, systemImage: "building.2", description: Text(loadError))
      } else if let row {
        List {
          Section {
            Text(TrStrings.Assets.detailHint)
              .font(.footnote)
              .foregroundStyle(.secondary)
          }
          Section(TrStrings.Maintenance.assetSectionTitle) {
            if let m = currentMonthMaint {
              HStack {
                Text(TrStrings.Maintenance.done)
                  .foregroundStyle(.green)
                Spacer()
                if let at = m.completedAt {
                  Text(String(at.prefix(16)).replacingOccurrences(of: "T", with: " "))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
              }
              Button(TrStrings.Maintenance.assetUnmark, role: .destructive) {
                Task { await unmarkCurrentMonthMaintenance(recordId: m.id) }
              }
              .disabled(maintActionBusy)
            } else {
              Text(TrStrings.Maintenance.pending)
                .foregroundStyle(.orange)
              Button(TrStrings.Maintenance.assetMarkComplete) {
                Task { await markCurrentMonthMaintenance() }
              }
              .disabled(maintActionBusy)
            }
            Text(TrStrings.Maintenance.assetMaintHint)
              .font(.caption2)
              .foregroundStyle(.tertiary)
          }
          Section(TrStrings.Assets.workOrdersSection) {
            NavigationLink {
              WorkOrderCreateView(client: client, presetAssetId: assetId)
            } label: {
              Label(TrStrings.Assets.newBreakdownWorkOrder, systemImage: "plus.circle")
            }
            if workOrderRows.isEmpty {
              Text(TrStrings.Assets.workOrdersEmpty)
                .foregroundStyle(.secondary)
            } else {
              ForEach(workOrderRows) { wo in
                NavigationLink {
                  WorkOrderDetailView(client: client, workOrderId: wo.id)
                } label: {
                  VStack(alignment: .leading, spacing: 4) {
                    Text(wo.number).font(.headline.monospaced())
                    HStack {
                      Text(wo.workTypeDisplay)
                        .font(.caption)
                      Spacer()
                      Text(wo.statusDisplay)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }
                    if wo.isEmergency {
                      Text(TrStrings.WorkOrders.emergency)
                        .font(.caption2)
                        .foregroundStyle(.red)
                    }
                  }
                }
              }
            }
          }
          Section(TrStrings.Assets.partsSection) {
            Text(TrStrings.Assets.partsSectionHint)
              .font(.caption)
              .foregroundStyle(.secondary)
            NavigationLink {
              PartsUsageRecordView(client: client, presetAssetId: assetId)
            } label: {
              Label(TrStrings.Assets.recordPartsUsage, systemImage: "square.and.pencil")
            }
            NavigationLink {
              PartsUsageListView(client: client, filterElevatorAssetId: assetId)
            } label: {
              Text(TrStrings.Assets.viewPartsForAsset)
            }
          }
          Section(TrStrings.Assets.unit) {
            LabeledContent(TrStrings.Assets.unitCodeLabel.replacingOccurrences(of: " *", with: ""), value: row.unitCode)
            LabeledContent(TrStrings.Assets.uniqueId, value: row.id.uuidString)
              .font(.caption)
            Text(TrStrings.Assets.idHint)
              .font(.caption2)
              .foregroundStyle(.tertiary)
            LabeledContent(TrStrings.Assets.customerParty, value: row.customerDisplayName)
            LabeledContent(TrStrings.Assets.site, value: row.siteDisplayName)
            NavigationLink {
              SiteDetailView(client: client, siteId: row.siteId)
            } label: {
              Text(TrStrings.Assets.goToSite)
            }
            LabeledContent(TrStrings.Assets.serial, value: row.serialNumber ?? "—")
            LabeledContent(TrStrings.Assets.operationalStatus, value: labelOperationalStatus(row.operationalStatus))
            if row.unsafeFlag {
              Text(TrStrings.Assets.unsafe)
                .font(.caption)
                .foregroundStyle(.red)
            }
          }
          qrSection(row: row)
          Section(TrStrings.Assets.maintenanceFeeSection) {
            LabeledContent(TrStrings.Assets.maintenanceFeeAmount, value: row.feeAmountDisplay)
            LabeledContent(TrStrings.Assets.feePeriodLabel, value: labelFeePeriod(row.maintenanceFeePeriod))
            if row.maintenanceFeePeriod == "yearly" {
              Text(TrStrings.Assets.periodYearlyNote)
                .font(.caption2)
                .foregroundStyle(.tertiary)
            } else if row.maintenanceFeePeriod == "monthly" {
              Text(TrStrings.Assets.maintenanceFeeHint)
                .font(.caption2)
                .foregroundStyle(.tertiary)
            }
          }
          Section(TrStrings.Assets.specsSection) {
            LabeledContent(TrStrings.Assets.elevatorType, value: labelElevatorType(row.elevatorType))
            LabeledContent(TrStrings.Assets.brand, value: row.brand ?? "—")
            LabeledContent(TrStrings.Assets.model, value: row.model ?? "—")
            LabeledContent(TrStrings.Assets.stops, value: fmtNum(row.stops))
            LabeledContent(TrStrings.Assets.capacityKg, value: fmtKg(row.capacityKg))
            LabeledContent(TrStrings.Assets.persons, value: fmtNum(row.persons))
            LabeledContent(TrStrings.Assets.speed, value: fmtSpeed(row.speed))
            LabeledContent(TrStrings.Assets.controller, value: row.controllerType ?? "—")
            LabeledContent(TrStrings.Assets.drive, value: row.driveType ?? "—")
            LabeledContent(TrStrings.Assets.door, value: row.doorType ?? "—")
            LabeledContent(TrStrings.Assets.commissionedAt, value: fmtDateOnly(row.commissionedAt))
            LabeledContent(TrStrings.Assets.takeoverAt, value: fmtDateOnly(row.takeoverAt))
          }
          if row.hasEn8120Info {
            Section(TrStrings.En8120.sectionTitle) {
              LabeledContent(TrStrings.En8120.controlAuthority, value: labelEn8120Authority(row.en8120ControlAuthority))
              LabeledContent(TrStrings.En8120.privateCompanyName, value: row.privateControlCompanyName ?? "—")
              LabeledContent(TrStrings.En8120.nextControlDue, value: fmtDateOnly(row.en8120NextControlDue))
              LabeledContent(TrStrings.En8120.transferBasis, value: labelMaintenanceTransfer(row.maintenanceTransferBasis))
            }
          }
          Section(TrStrings.Assets.financeSection) {
            if financeRows.isEmpty {
              Text(TrStrings.Finances.noEntriesAsset)
                .foregroundStyle(.secondary)
            } else {
              ForEach(financeRows) { e in
                VStack(alignment: .leading, spacing: 4) {
                  HStack {
                    Text(e.occurredOnDisplay)
                      .font(.caption)
                      .foregroundStyle(.secondary)
                    Spacer()
                    Text(e.amountLine)
                      .font(.subheadline.monospacedDigit())
                  }
                  Text(TrStrings.Finances.entryTypeLabel(e.entryType))
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                  Text(e.label)
                    .font(.subheadline)
                  Text("\(TrStrings.Finances.payment): \(e.paymentStatus)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                }
                .padding(.vertical, 2)
              }
            }
          }
        }
        .navigationTitle(row.unitCode)
        .toolbar {
          ToolbarItem(placement: .primaryAction) {
            NavigationLink {
              AssetEditView(client: client, assetId: assetId)
            } label: {
              Text(TrStrings.Common.edit)
            }
          }
        }
        .refreshable { await load() }
        .sheet(item: $elevatorTagShareItem) { payload in
          ShareSheet(items: [payload.image])
        }
      } else {
        ContentUnavailableView(TrStrings.Assets.listTitle, systemImage: "building.2", description: Text("—"))
      }
    }
    .navigationBarTitleDisplayMode(.inline)
    .fieldTabBarScrollContentInset()
    .task { await load() }
  }

  @ViewBuilder
  private func qrSection(row: AssetDetailRow) -> some View {
    let qrUrl = ElevatorQrUrl.resolved(
      publicBase: AppConfig.publicAppWebBaseURL,
      qrPayload: row.qrPayload,
      assetId: row.id
    )
    Section(TrStrings.Assets.qrTitle) {
      VStack(alignment: .leading, spacing: 12) {
        HStack(alignment: .top, spacing: 16) {
          Group {
            if let qrListPreviewImage {
              Image(uiImage: qrListPreviewImage)
                .interpolation(.none)
                .resizable()
                .scaledToFit()
            } else if qrListPreviewFailed {
              Image(systemName: "exclamationmark.triangle")
                .symbolRenderingMode(.hierarchical)
                .foregroundStyle(.orange)
                .accessibilityLabel(TrStrings.Common.errorTitle)
            } else {
              ProgressView()
                .progressViewStyle(.circular)
                .accessibilityLabel(TrStrings.Assets.qrTitle)
            }
          }
          .frame(width: 200, height: 200)
          Button {
            preparePrintTagShare(row: row, qrUrl: qrUrl)
          } label: {
            Label(TrStrings.Assets.qrPrintTag, systemImage: "square.and.arrow.down")
          }
          .buttonStyle(.bordered)
        }
        Text(qrUrl)
          .font(.caption)
          .foregroundStyle(.secondary)
          .textSelection(.enabled)
        Text(TrStrings.Assets.qrHint)
          .font(.caption2)
          .foregroundStyle(.tertiary)
      }
    }
  }

  private func preparePrintTagShare(row: AssetDetailRow, qrUrl: String) {
    guard
      let img = ElevatorPrintTagImage.make(
        qrUrl: qrUrl,
        elevatorId: row.id,
        siteName: row.sites?.display,
        noneLabel: TrStrings.Common.none
      )
    else { return }
    // Bir sonraki run loop’ta sheet — dokunma işleyicisi zaman aşımı / LS gürültüsünü hafifletmeye yardımcı olabilir.
    DispatchQueue.main.async {
      elevatorTagShareItem = ElevatorTagSharePayload(image: img)
    }
  }

  private func load() async {
    loading = true
    loadError = nil
    qrListPreviewImage = nil
    qrListPreviewFailed = false
    defer { loading = false }
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else {
        row = nil
        return
      }
      let assetRes: PostgrestResponse<AssetDetailRow> = try await client
        .from("elevator_assets")
        .select(
          """
          id, unit_code, customer_id, site_id, elevator_type, brand, model, serial_number,
          controller_type, drive_type, door_type, stops, capacity_kg, persons, speed,
          operational_status, unsafe_flag, qr_payload, maintenance_fee, maintenance_fee_period,
          en8120_control_authority, private_control_company_name, en8120_next_control_due, maintenance_transfer_basis,
          commissioned_at, takeover_at,
          customers(legal_name), sites(name)
          """
        )
        .eq("tenant_id", value: tenantId)
        .eq("id", value: assetId)
        .single()
        .execute()
      let loadedRow = assetRes.value
      let qrUrlString = ElevatorQrUrl.resolved(
        publicBase: AppConfig.publicAppWebBaseURL,
        qrPayload: loadedRow.qrPayload,
        assetId: loadedRow.id
      )

      let ym = Self.yearMonthFirstDayString(for: Date())
      // `async let … = client…execute()` çıkarımı PostgrestResponse<Void veriyor; Task.value ile hedef tür sabitlenir.
      async let finRes = try await Task {
        let r: PostgrestResponse<[FinanceEntryRowDTO]> = try await client
          .from("finance_entries")
          .select("id, entry_type, amount, currency, label, occurred_on, payment_status")
          .eq("tenant_id", value: tenantId)
          .eq("elevator_asset_id", value: assetId)
          .order("occurred_on", ascending: false)
          .execute()
        return r
      }.value
      async let maintRes = try await Task {
        let r: PostgrestResponse<[AssetCurrentMonthMaint]> = try await client
          .from("elevator_monthly_maintenance")
          .select("id, completed_at")
          .eq("tenant_id", value: tenantId)
          .eq("elevator_asset_id", value: assetId)
          .eq("year_month", value: ym)
          .limit(1)
          .execute()
        return r
      }.value
      async let woRes = try await Task {
        let r: PostgrestResponse<[AssetWorkOrderRowDTO]> = try await client
          .from("work_orders")
          .select("id, number, work_type, status, is_emergency")
          .eq("tenant_id", value: tenantId)
          .eq("elevator_asset_id", value: assetId)
          .order("created_at", ascending: false)
          .limit(15)
          .execute()
        return r
      }.value
      async let qrImg = Task.detached(priority: .userInitiated) {
        ElevatorQrImage.image(for: qrUrlString, pointWidth: 400)
      }.value

      let fin = try await finRes
      let maint = try await maintRes
      let wo = try await woRes
      let qrBitmap = await qrImg

      row = loadedRow
      financeRows = fin.value
      currentMonthMaint = maint.value.first
      workOrderRows = wo.value
      qrListPreviewImage = qrBitmap
      qrListPreviewFailed = qrBitmap == nil
    } catch {
      loadError = error.localizedDescription
      row = nil
      qrListPreviewImage = nil
      qrListPreviewFailed = false
    }
  }

  private static func yearMonthFirstDayString(for date: Date) -> String {
    let cal = Calendar.current
    let y = cal.component(.year, from: date)
    let m = cal.component(.month, from: date)
    return String(format: "%04d-%02d-01", y, m)
  }

  private func isoNowString() -> String {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f.string(from: Date())
  }

  private func markCurrentMonthMaintenance() async {
    maintActionBusy = true
    defer { maintActionBusy = false }
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else { return }
      let ym = Self.yearMonthFirstDayString(for: Date())
      let payload = MonthlyMaintenanceUpsertPayload(
        tenant_id: tenantId,
        elevator_asset_id: assetId,
        year_month: ym,
        completed_at: isoNowString(),
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

  private func unmarkCurrentMonthMaintenance(recordId: UUID) async {
    maintActionBusy = true
    defer { maintActionBusy = false }
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else { return }
      try await client
        .from("elevator_monthly_maintenance")
        .delete()
        .eq("tenant_id", value: tenantId)
        .eq("id", value: recordId)
        .execute()
      await load()
    } catch {
      loadError = error.localizedDescription
    }
  }

  private func fmtNum(_ v: Int?) -> String {
    guard let v else { return "—" }
    return String(v)
  }

  private func fmtKg(_ v: Double?) -> String {
    guard let v else { return "—" }
    return "\(Self.trimNum(v)) kg"
  }

  private func fmtSpeed(_ v: Double?) -> String {
    guard let v else { return "—" }
    return "\(Self.trimNum(v)) m/s"
  }

  private func fmtDateOnly(_ s: String?) -> String {
    guard let s, !s.isEmpty else { return "—" }
    return String(s.prefix(10))
  }

  private static func trimNum(_ d: Double) -> String {
    if d == floor(d) { return String(Int(d)) }
    return String(d)
  }

  private func labelElevatorType(_ value: String) -> String {
    let hit = Self.elevatorTypeLabels.first { $0.0 == value }
    return hit?.1 ?? (value.isEmpty ? "—" : value)
  }

  private func labelOperationalStatus(_ value: String) -> String {
    let hit = Self.operationalStatusLabels.first { $0.0 == value }
    return hit?.1 ?? (value.isEmpty ? "—" : value)
  }

  private func labelEn8120Authority(_ value: String?) -> String {
    guard let value, !value.isEmpty else { return "—" }
    let hit = Self.en8120AuthorityLabels.first { $0.0 == value }
    return hit?.1 ?? value
  }

  private func labelMaintenanceTransfer(_ value: String?) -> String {
    guard let value, !value.isEmpty else { return "—" }
    let hit = Self.maintenanceTransferLabels.first { $0.0 == value }
    return hit?.1 ?? value
  }

  private func labelFeePeriod(_ value: String?) -> String {
    guard let value, !value.isEmpty else { return "—" }
    if value == "monthly" { return TrStrings.Assets.periodMonthly }
    if value == "yearly" { return TrStrings.Assets.periodYearly }
    return value
  }

  private static let elevatorTypeLabels: [(String, String)] = [
    ("passenger", "Yolcu"),
    ("freight", "Yük"),
    ("hospital", "Hastane"),
    ("panoramic", "Panoramik"),
    ("dumbwaiter", "Servis asansörü"),
    ("platform", "Platform"),
    ("hydraulic", "Hidrolik"),
    ("traction", "Tahrikli"),
    ("mrl", "MRL"),
    ("other", "Diğer"),
  ]

  private static let operationalStatusLabels: [(String, String)] = [
    ("in_service", "Hizmette"),
    ("limited", "Kısıtlı"),
    ("out_of_service", "Hizmet dışı"),
    ("unsafe", "Güvensiz"),
    ("decommissioned", "Devreden çıkarıldı"),
  ]

  private static let en8120AuthorityLabels: [(String, String)] = [
    ("government", "Resmi / TSE"),
    ("private_control_company", "Akredite özel kuruluş"),
  ]

  private static let maintenanceTransferLabels: [(String, String)] = [
    ("direct_after_prior_expiry", "Önceki sözleşme bitiminden sonra doğrudan"),
    ("after_annual_en8120", "Yıllık EN 81-20 kontrolünden sonra"),
  ]
}

private struct ElevatorTagSharePayload: Identifiable {
  let id = UUID()
  let image: UIImage
}

struct AssetDetailRow: Decodable {
  let id: UUID
  let unitCode: String
  let customerId: UUID
  let siteId: UUID
  let elevatorType: String
  let brand: String?
  let model: String?
  let serialNumber: String?
  let controllerType: String?
  let driveType: String?
  let doorType: String?
  let stops: Int?
  let capacityKg: Double?
  let persons: Int?
  let speed: Double?
  let operationalStatus: String
  let unsafeFlag: Bool
  let qrPayload: String?
  let maintenanceFee: Double?
  let maintenanceFeePeriod: String?
  let en8120ControlAuthority: String?
  let privateControlCompanyName: String?
  let en8120NextControlDue: String?
  let maintenanceTransferBasis: String?
  let commissionedAt: String?
  let takeoverAt: String?
  let customers: NameEmbed?
  let sites: NameEmbed?

  struct NameEmbed: Decodable {
    let legalName: String?
    let name: String?

    enum CodingKeys: String, CodingKey {
      case legalName = "legal_name"
      case name
    }

    var display: String? {
      if let legalName, !legalName.isEmpty { return legalName }
      if let name, !name.isEmpty { return name }
      return nil
    }
  }

  enum CodingKeys: String, CodingKey {
    case id
    case unitCode = "unit_code"
    case customerId = "customer_id"
    case siteId = "site_id"
    case elevatorType = "elevator_type"
    case brand, model
    case serialNumber = "serial_number"
    case controllerType = "controller_type"
    case driveType = "drive_type"
    case doorType = "door_type"
    case stops
    case capacityKg = "capacity_kg"
    case persons, speed
    case operationalStatus = "operational_status"
    case unsafeFlag = "unsafe_flag"
    case qrPayload = "qr_payload"
    case maintenanceFee = "maintenance_fee"
    case maintenanceFeePeriod = "maintenance_fee_period"
    case en8120ControlAuthority = "en8120_control_authority"
    case privateControlCompanyName = "private_control_company_name"
    case en8120NextControlDue = "en8120_next_control_due"
    case maintenanceTransferBasis = "maintenance_transfer_basis"
    case commissionedAt = "commissioned_at"
    case takeoverAt = "takeover_at"
    case customers, sites
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id = try c.decode(UUID.self, forKey: .id)
    unitCode = try c.decode(String.self, forKey: .unitCode)
    customerId = try c.decode(UUID.self, forKey: .customerId)
    siteId = try c.decode(UUID.self, forKey: .siteId)
    elevatorType = try c.decode(String.self, forKey: .elevatorType)
    brand = try c.decodeIfPresent(String.self, forKey: .brand)
    model = try c.decodeIfPresent(String.self, forKey: .model)
    serialNumber = try c.decodeIfPresent(String.self, forKey: .serialNumber)
    controllerType = try c.decodeIfPresent(String.self, forKey: .controllerType)
    driveType = try c.decodeIfPresent(String.self, forKey: .driveType)
    doorType = try c.decodeIfPresent(String.self, forKey: .doorType)
    stops = Self.decodeIntFlexible(c, key: .stops)
    capacityKg = Self.decodeDoubleFlexible(c, key: .capacityKg)
    persons = Self.decodeIntFlexible(c, key: .persons)
    speed = Self.decodeDoubleFlexible(c, key: .speed)
    operationalStatus = try c.decode(String.self, forKey: .operationalStatus)
    unsafeFlag = try c.decode(Bool.self, forKey: .unsafeFlag)
    qrPayload = try c.decodeIfPresent(String.self, forKey: .qrPayload)
    maintenanceFee = Self.decodeDoubleFlexible(c, key: .maintenanceFee)
    maintenanceFeePeriod = try c.decodeIfPresent(String.self, forKey: .maintenanceFeePeriod)
    en8120ControlAuthority = try c.decodeIfPresent(String.self, forKey: .en8120ControlAuthority)
    privateControlCompanyName = try c.decodeIfPresent(String.self, forKey: .privateControlCompanyName)
    en8120NextControlDue = try Self.decodeDateString(c, key: .en8120NextControlDue)
    maintenanceTransferBasis = try c.decodeIfPresent(String.self, forKey: .maintenanceTransferBasis)
    commissionedAt = try Self.decodeDateString(c, key: .commissionedAt)
    takeoverAt = try Self.decodeDateString(c, key: .takeoverAt)
    customers = try c.decodeIfPresent(NameEmbed.self, forKey: .customers)
    sites = try c.decodeIfPresent(NameEmbed.self, forKey: .sites)
  }

  private static func decodeIntFlexible(_ c: KeyedDecodingContainer<CodingKeys>, key: CodingKeys) -> Int? {
    if let v = try? c.decode(Int.self, forKey: key) { return v }
    if let s = try? c.decode(String.self, forKey: key), let v = Int(s) { return v }
    if let d = try? c.decode(Double.self, forKey: key) { return Int(d) }
    return nil
  }

  private static func decodeDoubleFlexible(_ c: KeyedDecodingContainer<CodingKeys>, key: CodingKeys) -> Double? {
    if let v = try? c.decode(Double.self, forKey: key) { return v }
    if let s = try? c.decode(String.self, forKey: key), let v = Double(s.replacingOccurrences(of: ",", with: ".")) {
      return v
    }
    return nil
  }

  private static func decodeDateString(_ c: KeyedDecodingContainer<CodingKeys>, key: CodingKeys) throws -> String? {
    if let s = try? c.decode(String.self, forKey: key), !s.isEmpty { return s }
    return nil
  }

  var customerDisplayName: String {
    customers?.display ?? "—"
  }

  var siteDisplayName: String {
    sites?.display ?? "—"
  }

  var feeAmountDisplay: String {
    guard let maintenanceFee, maintenanceFee > 0 else { return "—" }
    return String(format: "%.2f", maintenanceFee)
  }

  var hasEn8120Info: Bool {
    (en8120ControlAuthority?.isEmpty == false)
      || (privateControlCompanyName?.isEmpty == false)
      || (en8120NextControlDue?.isEmpty == false)
      || (maintenanceTransferBasis?.isEmpty == false)
  }
}

private struct AssetCurrentMonthMaint: Decodable {
  let id: UUID
  let completedAt: String?

  enum CodingKeys: String, CodingKey {
    case id
    case completedAt = "completed_at"
  }
}

private struct AssetWorkOrderRowDTO: Decodable, Identifiable {
  let id: UUID
  let number: String
  let workType: String
  let status: String
  let isEmergency: Bool

  enum CodingKeys: String, CodingKey {
    case id, number, status
    case workType = "work_type"
    case isEmergency = "is_emergency"
  }

  var workTypeDisplay: String {
    switch workType {
    case "maintenance": return "Bakım"
    case "repair": return "Onarım"
    case "revision": return "Revizyon"
    case "assembly": return "Montaj"
    case "inspection": return "Kontrol"
    default: return workType.replacingOccurrences(of: "_", with: " ")
    }
  }

  var statusDisplay: String {
    switch status {
    case "draft": return "Taslak"
    case "open": return "Açık"
    case "in_progress": return "Devam ediyor"
    case "completed": return "Tamamlandı"
    case "cancelled": return "İptal"
    default: return status.replacingOccurrences(of: "_", with: " ")
    }
  }
}

private struct FinanceEntryRowDTO: Decodable, Identifiable {
  let id: UUID
  let entryType: String
  let currency: String
  let label: String
  let occurredOnRaw: String
  let paymentStatus: String
  let amountValue: Double

  enum CodingKeys: String, CodingKey {
    case id
    case entryType = "entry_type"
    case currency, label
    case occurredOn = "occurred_on"
    case paymentStatus = "payment_status"
    case amount
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id = try c.decode(UUID.self, forKey: .id)
    entryType = try c.decode(String.self, forKey: .entryType)
    currency = try c.decode(String.self, forKey: .currency)
    label = try c.decode(String.self, forKey: .label)
    paymentStatus = try c.decode(String.self, forKey: .paymentStatus)
    if let d = try? c.decode(Double.self, forKey: .amount) {
      amountValue = d
    } else if let s = try? c.decode(String.self, forKey: .amount),
      let d = Double(s.replacingOccurrences(of: ",", with: ".")) {
      amountValue = d
    } else {
      amountValue = 0
    }
    if let s = try? c.decode(String.self, forKey: .occurredOn) {
      occurredOnRaw = s
    } else {
      occurredOnRaw = ""
    }
  }

  var occurredOnDisplay: String {
    String(occurredOnRaw.prefix(10))
  }

  var amountLine: String {
    let f = NumberFormatter()
    f.locale = Locale(identifier: "tr_TR")
    f.minimumFractionDigits = 2
    f.maximumFractionDigits = 2
    f.numberStyle = .decimal
    let num = f.string(from: NSNumber(value: amountValue)) ?? String(amountValue)
    return "\(num) \(currency)"
  }
}
