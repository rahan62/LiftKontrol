import SwiftUI
import Supabase

struct CustomerDetailView: View {
  let client: SupabaseClient
  let customerId: UUID

  @State private var model: CustomerDetailModel?
  @State private var loadError: String?
  @State private var loading = true

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.Customers.title, systemImage: "person", description: Text(loadError))
      } else if let model {
        List {
          Section {
            Text(TrStrings.Customers.detailHint)
              .font(.footnote)
              .foregroundStyle(.secondary)
          }
          Section(TrStrings.Customers.billingCard) {
            Text(model.billingSummary)
              .font(.subheadline)
          }
          Section(TrStrings.Customers.notesCard) {
            Text(model.notes ?? "—")
              .font(.subheadline)
          }
          Section {
            LabeledContent(TrStrings.Customers.statusLabel, value: model.status)
            if let code = model.code, !code.isEmpty {
              LabeledContent(TrStrings.Customers.codeLabel, value: code)
            }
          }
        }
      } else {
        ContentUnavailableView(TrStrings.Customers.title, systemImage: "person", description: Text("Bulunamadı"))
      }
    }
    .navigationTitle(model?.legalName ?? TrStrings.Customers.title)
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
        model = nil
        return
      }
      let response: PostgrestResponse<CustomerDetailModel> = try await client
        .from("customers")
        .select()
        .eq("tenant_id", value: tenantId)
        .eq("id", value: customerId)
        .single()
        .execute()
      model = response.value
    } catch {
      loadError = error.localizedDescription
      model = nil
    }
  }
}

private struct CustomerDetailModel: Decodable {
  let id: UUID
  let legalName: String
  let code: String?
  let status: String
  let notes: String?
  let billingSummary: String

  enum CodingKeys: String, CodingKey {
    case id
    case legalName = "legal_name"
    case code, status, notes
    case billingAddress = "billing_address"
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id = try c.decode(UUID.self, forKey: .id)
    legalName = try c.decode(String.self, forKey: .legalName)
    code = try c.decodeIfPresent(String.self, forKey: .code)
    status = try c.decode(String.self, forKey: .status)
    notes = try c.decodeIfPresent(String.self, forKey: .notes)
    if let bill = try? c.decode([String: String].self, forKey: .billingAddress), !bill.isEmpty {
      billingSummary = bill
        .sorted(by: { $0.key < $1.key })
        .map { "\($0.key): \($0.value)" }
        .joined(separator: "\n")
    } else {
      billingSummary = "—"
    }
  }
}
