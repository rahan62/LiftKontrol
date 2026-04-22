import SwiftUI
import Supabase

struct AssetCreateView: View {
  let client: SupabaseClient
  var defaultCustomerId: UUID?
  var defaultSiteId: UUID?

  @Environment(\.dismiss) private var dismiss

  @State private var customers: [CustomerPickRow] = []
  @State private var sites: [SitePickRow] = []
  @State private var selectedCustomerIndex = 0
  @State private var selectedSiteIndex = 0
  @State private var unitCode = ""
  @State private var selectedElevatorTypeIndex = 0
  @State private var selectedOperationalIndex = 0
  @State private var brand = ""
  @State private var model = ""
  @State private var serialNumber = ""
  @State private var controllerType = ""
  @State private var driveType = ""
  @State private var doorType = ""
  @State private var stopsText = ""
  @State private var capacityText = ""
  @State private var personsText = ""
  @State private var speedText = ""
  @State private var maintenanceFeeText = ""
  @State private var feePeriodPickerIndex = 0
  @State private var en8120AuthorityIndex = 0
  @State private var en8120CompanyName = ""
  @State private var en8120PlanDateEnabled = false
  @State private var en8120PlanDate = Calendar.current.startOfDay(for: Date())
  @State private var en8120ManualDateText = ""
  @State private var transferBasisIndex = 0
  @State private var unsafeFlag = false
  @State private var busy = false
  @State private var message: String?
  @State private var loading = true

  var body: some View {
    mainContent
      .navigationTitle(TrStrings.Assets.newTitle)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button(TrStrings.Common.cancel) { dismiss() }
        }
      }
      .fieldTabBarScrollContentInset()
      .task { await bootstrap() }
  }

  @ViewBuilder
  private var mainContent: some View {
    if loading {
      ProgressView(TrStrings.Common.loading)
    } else if customers.isEmpty {
      ContentUnavailableView {
        Label(TrStrings.Assets.newTitle, systemImage: "building.2")
      } description: {
        Text(TrStrings.Assets.addPrereq)
      } actions: {
        NavigationLink(TrStrings.Sites.goNewCustomer) {
          CustomerCreateView(client: client)
        }
      }
    } else {
      Form {
          if let message {
            Section {
              Text(message).foregroundStyle(.red)
            }
          }
          Section {
            Picker(TrStrings.Customers.title, selection: $selectedCustomerIndex) {
              ForEach(customers.indices, id: \.self) { i in
                Text(customers[i].legalName).tag(i)
              }
            }
            .onChange(of: selectedCustomerIndex) { _, _ in
              Task { await loadSites(resetSelection: true) }
            }
            if sites.isEmpty {
              Text(TrStrings.Assets.addPrereq)
                .font(.footnote)
                .foregroundStyle(.secondary)
            } else {
              Picker(TrStrings.Assets.site, selection: $selectedSiteIndex) {
                ForEach(sites.indices, id: \.self) { i in
                  Text(sites[i].name).tag(i)
                }
              }
            }
            TextField(TrStrings.Assets.unitCodeLabel, text: $unitCode)
            Picker(TrStrings.Assets.elevatorType, selection: $selectedElevatorTypeIndex) {
              ForEach(Self.elevatorTypeOptions.indices, id: \.self) { i in
                Text(Self.elevatorTypeOptions[i].label).tag(i)
              }
            }
            Picker(TrStrings.Assets.operationalStatus, selection: $selectedOperationalIndex) {
              ForEach(Self.operationalOptions.indices, id: \.self) { i in
                Text(Self.operationalOptions[i].label).tag(i)
              }
            }
            Toggle(TrStrings.Assets.unsafeToggle, isOn: $unsafeFlag)
          }
          Section(TrStrings.Assets.specsSection) {
            TextField(TrStrings.Assets.brand, text: $brand)
            TextField(TrStrings.Assets.model, text: $model)
            TextField(TrStrings.Assets.serial, text: $serialNumber)
            TextField(TrStrings.Assets.controller, text: $controllerType)
            TextField(TrStrings.Assets.drive, text: $driveType)
            TextField(TrStrings.Assets.door, text: $doorType)
            TextField(TrStrings.Assets.stops, text: $stopsText)
              .keyboardType(.numberPad)
            TextField(TrStrings.Assets.capacityKg, text: $capacityText)
              .keyboardType(.decimalPad)
            TextField(TrStrings.Assets.persons, text: $personsText)
              .keyboardType(.numberPad)
            TextField(TrStrings.Assets.speed, text: $speedText)
              .keyboardType(.decimalPad)
          }
          Section(TrStrings.Assets.maintenanceFeeSection) {
            Text(TrStrings.Assets.maintenanceFeeHint)
              .font(.footnote)
              .foregroundStyle(.secondary)
            TextField(TrStrings.Assets.maintenanceFeeAmount, text: $maintenanceFeeText)
              .keyboardType(.decimalPad)
            Picker(TrStrings.Assets.feePeriodLabel, selection: $feePeriodPickerIndex) {
              Text(TrStrings.Assets.periodNone).tag(0)
              Text(TrStrings.Assets.periodMonthly).tag(1)
              Text(TrStrings.Assets.periodYearly).tag(2)
            }
            Text(TrStrings.Assets.periodYearlyNote)
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
          Section(TrStrings.En8120.sectionTitle) {
            VStack(alignment: .leading, spacing: 12) {
              Picker(TrStrings.En8120.controlAuthority, selection: $en8120AuthorityIndex) {
                Text(TrStrings.Assets.periodNone).tag(0)
                Text("Resmi / TSE").tag(1)
                Text("Akredite özel kuruluş").tag(2)
              }
              TextField(TrStrings.En8120.privateCompanyName, text: $en8120CompanyName)
              Toggle(TrStrings.En8120.planDateToggle, isOn: $en8120PlanDateEnabled)
              if en8120PlanDateEnabled {
                DatePicker(
                  TrStrings.En8120.nextControlDue,
                  selection: $en8120PlanDate,
                  displayedComponents: .date
                )
                .environment(\.locale, Locale(identifier: "tr_TR"))
                TextField("İsteğe bağlı: 28.03.2026 veya 2026-03-28", text: $en8120ManualDateText)
                  .keyboardType(.numbersAndPunctuation)
              }
              Text(TrStrings.En8120.nextControlDueHint)
                .font(.caption2)
                .foregroundStyle(.secondary)
              Picker(TrStrings.En8120.transferBasis, selection: $transferBasisIndex) {
                Text(TrStrings.Assets.periodNone).tag(0)
                Text("Önceki sözleşme bitiminden sonra doğrudan").tag(1)
                Text("Yıllık EN 81-20 kontrolünden sonra").tag(2)
              }
            }
            .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
          }
          Section {
            Button {
              Task { await save() }
            } label: {
              if busy {
                ProgressView(TrStrings.Customers.saving)
              } else {
                Text(TrStrings.Customers.save)
              }
            }
            .disabled(
              busy || sites.isEmpty || unitCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                || invalidFeeWithoutPeriod)
          }
      }
    }
  }

  /// Ücret girilmiş ama dönem seçilmemiş (aylık/yıllık zorunlu).
  private var invalidFeeWithoutPeriod: Bool {
    let raw = maintenanceFeeText.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespacesAndNewlines)
    guard !raw.isEmpty, let n = Double(raw), n > 0 else { return false }
    return feePeriodPickerIndex == 0
  }

  private func bootstrap() async {
    loading = true
    defer { loading = false }
    await loadCustomers()
    if let d = defaultCustomerId, let idx = customers.firstIndex(where: { $0.id == d }) {
      selectedCustomerIndex = idx
    } else {
      selectedCustomerIndex = 0
    }
    await loadSites(resetSelection: false)
    if let s = defaultSiteId, let sidx = sites.firstIndex(where: { $0.id == s }) {
      selectedSiteIndex = sidx
    }
  }

  private func loadCustomers() async {
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else {
        customers = []
        return
      }
      let response: PostgrestResponse<[CustomerPickRow]> = try await client
        .from("customers")
        .select("id, legal_name")
        .eq("tenant_id", value: tenantId)
        .order("legal_name", ascending: true)
        .execute()
      customers = response.value
    } catch {
      customers = []
    }
  }

  private func loadSites(resetSelection: Bool) async {
    guard customers.indices.contains(selectedCustomerIndex) else {
      sites = []
      return
    }
    let cid = customers[selectedCustomerIndex].id
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else {
        sites = []
        return
      }
      let response: PostgrestResponse<[SitePickRow]> = try await client
        .from("sites")
        .select("id, name")
        .eq("tenant_id", value: tenantId)
        .eq("customer_id", value: cid)
        .order("name", ascending: true)
        .execute()
      sites = response.value
      if resetSelection {
        selectedSiteIndex = 0
        if let s = defaultSiteId, let sidx = sites.firstIndex(where: { $0.id == s }) {
          selectedSiteIndex = sidx
        }
      } else if !sites.indices.contains(selectedSiteIndex) {
        selectedSiteIndex = 0
      }
    } catch {
      sites = []
    }
  }

  private func save() async {
    guard customers.indices.contains(selectedCustomerIndex),
      sites.indices.contains(selectedSiteIndex),
      let tenantId = try? await TenantScope.firstTenantId(client: client) else { return }
    let customerId = customers[selectedCustomerIndex].id
    let siteId = sites[selectedSiteIndex].id
    let trimmedCode = unitCode.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmedCode.isEmpty else { return }
    let typeVal = Self.elevatorTypeOptions[selectedElevatorTypeIndex].value
    let opVal = Self.operationalOptions[selectedOperationalIndex].value
    let feeRaw = maintenanceFeeText.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespacesAndNewlines)
    let feeParsed = Double(feeRaw).flatMap { $0 > 0 ? $0 : nil }
    let periodOut: String? = {
      guard feeParsed != nil else { return nil }
      switch feePeriodPickerIndex {
      case 1: return "monthly"
      case 2: return "yearly"
      default: return nil
      }
    }()
    let en8120Auth: String?
    switch en8120AuthorityIndex {
    case 1: en8120Auth = "government"
    case 2: en8120Auth = "private_control_company"
    default: en8120Auth = nil
    }
    let transferOut: String?
    switch transferBasisIndex {
    case 1: transferOut = "direct_after_prior_expiry"
    case 2: transferOut = "after_annual_en8120"
    default: transferOut = nil
    }
    let dueOut: String? = {
      guard en8120PlanDateEnabled else { return nil }
      let manualTrim = en8120ManualDateText.trimmingCharacters(in: .whitespacesAndNewlines)
      if !manualTrim.isEmpty {
        return En8120NextControlDueFormatting.normalizedPostgresDate(fromUserInput: manualTrim)
      }
      return En8120NextControlDueFormatting.postgresDateString(from: en8120PlanDate)
    }()
    if en8120PlanDateEnabled, dueOut == nil {
      message = TrStrings.En8120.invalidDate
      return
    }
    let companyOut = en8120CompanyName.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty
    busy = true
    message = nil
    defer { busy = false }
    do {
      let payload = AssetInsertPayload(
        tenant_id: tenantId,
        customer_id: customerId,
        site_id: siteId,
        unit_code: trimmedCode,
        elevator_type: typeVal,
        brand: brand.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty,
        model: model.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty,
        serial_number: serialNumber.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty,
        controller_type: controllerType.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty,
        drive_type: driveType.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty,
        door_type: doorType.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty,
        stops: Int(stopsText.trimmingCharacters(in: .whitespacesAndNewlines)),
        capacity_kg: Double(capacityText.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespacesAndNewlines)),
        persons: Int(personsText.trimmingCharacters(in: .whitespacesAndNewlines)),
        speed: Double(speedText.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespacesAndNewlines)),
        operational_status: opVal,
        unsafe_flag: unsafeFlag,
        en8120_control_authority: en8120Auth,
        private_control_company_name: companyOut,
        en8120_next_control_due: dueOut,
        maintenance_transfer_basis: transferOut,
        maintenance_fee: periodOut != nil ? feeParsed : nil,
        maintenance_fee_period: periodOut
      )
      let response: PostgrestResponse<AssetInsertedIdRow> = try await client
        .from("elevator_assets")
        .insert(payload, returning: .representation)
        .select("id")
        .single()
        .execute()
      let newId = response.value.id
      if let base = AppConfig.publicAppWebBaseURL {
        let qrUrl = "\(base)/app/assets/\(newId.uuidString.lowercased())"
        try await client
          .from("elevator_assets")
          .update(QrPayloadUpdate(qr_payload: qrUrl))
          .eq("tenant_id", value: tenantId)
          .eq("id", value: newId)
          .execute()
      }
      await FieldRoutePlanningSync.triggerClusterRecompute(client: client)
      dismiss()
    } catch {
      message = error.localizedDescription
    }
  }

  private struct Opt {
    let value: String
    let label: String
  }

  private static let elevatorTypeOptions: [Opt] = [
    Opt(value: "passenger", label: "Yolcu"),
    Opt(value: "freight", label: "Yük"),
    Opt(value: "hospital", label: "Hastane"),
    Opt(value: "panoramic", label: "Panoramik"),
    Opt(value: "dumbwaiter", label: "Servis asansörü"),
    Opt(value: "platform", label: "Platform"),
    Opt(value: "hydraulic", label: "Hidrolik"),
    Opt(value: "traction", label: "Tahrikli"),
    Opt(value: "mrl", label: "MRL"),
    Opt(value: "other", label: "Diğer"),
  ]

  private static let operationalOptions: [Opt] = [
    Opt(value: "in_service", label: "Hizmette"),
    Opt(value: "limited", label: "Kısıtlı"),
    Opt(value: "out_of_service", label: "Hizmet dışı"),
    Opt(value: "unsafe", label: "Güvensiz"),
    Opt(value: "decommissioned", label: "Devreden çıkarıldı"),
  ]
}

private struct CustomerPickRow: Decodable, Identifiable {
  let id: UUID
  let legalName: String
  enum CodingKeys: String, CodingKey {
    case id
    case legalName = "legal_name"
  }
}

private struct SitePickRow: Decodable, Identifiable {
  let id: UUID
  let name: String
}

private struct QrPayloadUpdate: Encodable {
  let qr_payload: String
}

private struct AssetInsertPayload: Encodable {
  let tenant_id: UUID
  let customer_id: UUID
  let site_id: UUID
  let unit_code: String
  let elevator_type: String
  let brand: String?
  let model: String?
  let serial_number: String?
  let controller_type: String?
  let drive_type: String?
  let door_type: String?
  let stops: Int?
  let capacity_kg: Double?
  let persons: Int?
  let speed: Double?
  let operational_status: String
  let unsafe_flag: Bool
  let en8120_control_authority: String?
  let private_control_company_name: String?
  let en8120_next_control_due: String?
  let maintenance_transfer_basis: String?
  let maintenance_fee: Double?
  let maintenance_fee_period: String?
}

private struct AssetInsertedIdRow: Decodable {
  let id: UUID
}

private extension String {
  var nilIfEmpty: String? {
    let t = trimmingCharacters(in: .whitespacesAndNewlines)
    return t.isEmpty ? nil : t
  }
}
