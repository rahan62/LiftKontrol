import SwiftUI
import Supabase

struct CustomerCreateView: View {
  let client: SupabaseClient

  @Environment(\.dismiss) private var dismiss

  @State private var legalName = ""
  @State private var code = ""
  @State private var status = "active"
  @State private var notes = ""
  @State private var addrLine1 = ""
  @State private var addrCity = ""
  @State private var addrRegion = ""
  @State private var addrPostal = ""
  @State private var addrCountry = ""
  @State private var busy = false
  @State private var message: String?

  private let statuses = ["active", "inactive", "suspended"]

  var body: some View {
    Form {
      if let message {
        Section {
          Text(message).foregroundStyle(.red)
        }
      }
      Section {
        TextField(TrStrings.Customers.legalNameLabel, text: $legalName)
        TextField(TrStrings.Customers.codeLabel, text: $code)
        Picker(TrStrings.Customers.statusLabel, selection: $status) {
          ForEach(statuses, id: \.self) { Text($0) }
        }
        TextField(TrStrings.Customers.notesLabel, text: $notes, axis: .vertical)
          .lineLimit(3...6)
      }
      Section(TrStrings.Customers.billingSection) {
        TextField(TrStrings.Customers.addrLine1, text: $addrLine1)
        TextField(TrStrings.Customers.addrCity, text: $addrCity)
        TextField(TrStrings.Customers.addrRegion, text: $addrRegion)
        TextField(TrStrings.Customers.addrPostal, text: $addrPostal)
        TextField(TrStrings.Customers.addrCountry, text: $addrCountry)
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
        .disabled(busy || legalName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
      }
    }
    .navigationTitle(TrStrings.Customers.newTitle)
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .cancellationAction) {
        Button(TrStrings.Common.cancel) {
          dismiss()
        }
      }
    }
    .fieldTabBarScrollContentInset()
  }

  private func save() async {
    let name = legalName.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !name.isEmpty else {
      message = TrStrings.Customers.legalNameRequired
      return
    }
    busy = true
    message = nil
    defer { busy = false }
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else {
        message = TrStrings.Maintenance.noTenant
        return
      }
      let billing = BillingPayload(
        line1: addrLine1.trimmingCharacters(in: .whitespacesAndNewlines),
        city: addrCity.trimmingCharacters(in: .whitespacesAndNewlines),
        region: addrRegion.trimmingCharacters(in: .whitespacesAndNewlines),
        postal_code: addrPostal.trimmingCharacters(in: .whitespacesAndNewlines),
        country: addrCountry.trimmingCharacters(in: .whitespacesAndNewlines)
      )
      let codeTrim = code.trimmingCharacters(in: .whitespacesAndNewlines)
      let notesTrim = notes.trimmingCharacters(in: .whitespacesAndNewlines)
      let payload = NewCustomerPayload(
        tenant_id: tenantId,
        legal_name: name,
        code: codeTrim.isEmpty ? nil : codeTrim,
        status: status,
        notes: notesTrim.isEmpty ? nil : notesTrim,
        billing_address: billing
      )
      let response: PostgrestResponse<InsertedIdRow> = try await client
        .from("customers")
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

private struct BillingPayload: Encodable {
  let line1: String
  let city: String
  let region: String
  let postal_code: String
  let country: String
}

private struct NewCustomerPayload: Encodable {
  let tenant_id: UUID
  let legal_name: String
  let code: String?
  let status: String
  let notes: String?
  let billing_address: BillingPayload
}

private struct InsertedIdRow: Decodable {
  let id: UUID
}
