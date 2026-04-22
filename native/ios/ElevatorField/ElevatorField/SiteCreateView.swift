import SwiftUI
import Supabase

struct SiteCreateView: View {
  let client: SupabaseClient

  @Environment(\.dismiss) private var dismiss

  @State private var customers: [CustomerOptionRow] = []
  @State private var selectedCustomerIndex = 0
  @State private var name = ""
  @State private var addrLine1 = ""
  @State private var addrCity = ""
  @State private var addrRegion = ""
  @State private var addrPostal = ""
  @State private var addrCountry = ""
  @State private var billingSame = true
  @State private var accessNotes = ""
  @State private var maintenanceNotes = ""
  @State private var busy = false
  @State private var message: String?
  @State private var loadingCustomers = true

  var body: some View {
    mainContent
      .navigationTitle(TrStrings.Sites.newTitle)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button(TrStrings.Common.cancel) { dismiss() }
        }
      }
      .fieldTabBarScrollContentInset()
      .task { await loadCustomers() }
  }

  @ViewBuilder
  private var mainContent: some View {
    if loadingCustomers {
      ProgressView(TrStrings.Common.loading)
    } else if customers.isEmpty {
      ContentUnavailableView {
        Label(TrStrings.Sites.newTitle, systemImage: "mappin.and.ellipse")
      } description: {
        Text(TrStrings.Sites.addCustomerFirst)
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
            TextField(TrStrings.Sites.title + " *", text: $name)
          }
          Section(TrStrings.Sites.serviceAddressSection) {
            TextField(TrStrings.Customers.addrLine1, text: $addrLine1)
            TextField(TrStrings.Customers.addrCity, text: $addrCity)
            TextField(TrStrings.Customers.addrRegion, text: $addrRegion)
            TextField(TrStrings.Customers.addrPostal, text: $addrPostal)
            TextField(TrStrings.Customers.addrCountry, text: $addrCountry)
            Toggle(TrStrings.Sites.billingSameLabel, isOn: $billingSame)
          }
          Section(TrStrings.Sites.accessSection) {
            TextField(TrStrings.Customers.notesLabel, text: $accessNotes, axis: .vertical)
              .lineLimit(2...4)
          }
          Section(TrStrings.Sites.maintenanceSection) {
            Text(TrStrings.Sites.maintenanceNotesHint)
              .font(.footnote)
              .foregroundStyle(.secondary)
            TextField(TrStrings.Customers.notesLabel, text: $maintenanceNotes, axis: .vertical)
              .lineLimit(2...4)
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
            .disabled(busy || customers.isEmpty || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
          }
      }
    }
  }

  private func loadCustomers() async {
    loadingCustomers = true
    defer { loadingCustomers = false }
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else {
        customers = []
        return
      }
      let response: PostgrestResponse<[CustomerOptionRow]> = try await client
        .from("customers")
        .select("id, legal_name")
        .eq("tenant_id", value: tenantId)
        .order("legal_name", ascending: true)
        .execute()
      customers = response.value
      selectedCustomerIndex = 0
    } catch {
      customers = []
    }
  }

  private func save() async {
    guard customers.indices.contains(selectedCustomerIndex),
      let tenantId = try? await TenantScope.firstTenantId(client: client) else { return }
    let customerId = customers[selectedCustomerIndex].id
    let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return }
    busy = true
    message = nil
    defer { busy = false }
    do {
      let payload = SiteInsertPayload(
        tenant_id: tenantId,
        customer_id: customerId,
        name: trimmed,
        service_address: ServiceAddrPayload(
          line1: addrLine1.trimmingCharacters(in: .whitespacesAndNewlines),
          city: addrCity.trimmingCharacters(in: .whitespacesAndNewlines),
          region: addrRegion.trimmingCharacters(in: .whitespacesAndNewlines),
          postal_code: addrPostal.trimmingCharacters(in: .whitespacesAndNewlines),
          country: addrCountry.trimmingCharacters(in: .whitespacesAndNewlines)
        ),
        billing_same_as_service: billingSame,
        access_instructions: accessNotes.isEmpty ? nil : accessNotes,
        machine_room_notes: nil,
        shaft_notes: nil,
        emergency_phones: nil,
        maintenance_fee: nil,
        maintenance_fee_period: nil,
        maintenance_notes: maintenanceNotes.isEmpty ? nil : maintenanceNotes,
        floor_count: nil,
        elevator_count: nil
      )
      let response: PostgrestResponse<SiteInsertedIdRow> = try await client
        .from("sites")
        .insert(payload, returning: .representation)
        .select("id")
        .single()
        .execute()
      _ = response.value.id
      dismiss()
    } catch {
      message = error.localizedDescription
    }
  }
}

private struct CustomerOptionRow: Decodable, Identifiable {
  let id: UUID
  let legalName: String
  enum CodingKeys: String, CodingKey {
    case id
    case legalName = "legal_name"
  }
}

private struct ServiceAddrPayload: Encodable {
  let line1: String
  let city: String
  let region: String
  let postal_code: String
  let country: String
}

private struct SiteInsertPayload: Encodable {
  let tenant_id: UUID
  let customer_id: UUID
  let name: String
  let service_address: ServiceAddrPayload
  let billing_same_as_service: Bool
  let access_instructions: String?
  let machine_room_notes: String?
  let shaft_notes: String?
  let emergency_phones: String?
  let maintenance_fee: Double?
  let maintenance_fee_period: String?
  let maintenance_notes: String?
  let floor_count: Int?
  let elevator_count: Int?
}

private struct SiteInsertedIdRow: Decodable {
  let id: UUID
}
