import SwiftUI
import Supabase

struct CustomersListView: View {
  let client: SupabaseClient

  @State private var rows: [CustomerRowDTO] = []
  @State private var loadError: String?
  @State private var loading = true

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.Customers.title, systemImage: "person.2", description: Text(loadError))
      } else if rows.isEmpty {
        ContentUnavailableView(TrStrings.Customers.title, systemImage: "person.2", description: Text(TrStrings.Customers.empty))
      } else {
        List(rows) { row in
          NavigationLink {
            CustomerDetailView(client: client, customerId: row.id)
          } label: {
            VStack(alignment: .leading, spacing: 4) {
              Text(row.legalName)
                .font(.headline)
              HStack {
                Text(row.code ?? "—")
                  .font(.caption)
                  .foregroundStyle(.secondary)
                Spacer()
                Text(row.status)
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            }
          }
        }
      }
    }
    .navigationTitle(TrStrings.Customers.title)
    .toolbar {
      ToolbarItem(placement: .primaryAction) {
        NavigationLink {
          CustomerCreateView(client: client)
        } label: {
          Image(systemName: "plus")
        }
      }
    }
    .fieldTabBarScrollContentInset()
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
      let response: PostgrestResponse<[CustomerRowDTO]> = try await client
        .from("customers")
        .select("id, code, legal_name, status, updated_at")
        .eq("tenant_id", value: tenantId)
        .order("legal_name", ascending: true)
        .execute()
      rows = response.value
    } catch {
      loadError = error.localizedDescription
    }
  }
}

private struct CustomerRowDTO: Decodable, Identifiable {
  let id: UUID
  let code: String?
  let legalName: String
  let status: String

  enum CodingKeys: String, CodingKey {
    case id, code, status
    case legalName = "legal_name"
  }
}
