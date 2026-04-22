import SwiftUI
import Supabase

struct WorkOrdersListView: View {
  let client: SupabaseClient

  @State private var rows: [WorkOrderRowDTO] = []
  @State private var loadError: String?
  @State private var loading = true

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.WorkOrders.title, systemImage: "wrench.and.screwdriver", description: Text(loadError))
      } else if rows.isEmpty {
        ContentUnavailableView(
          TrStrings.WorkOrders.title,
          systemImage: "wrench.and.screwdriver",
          description: Text(TrStrings.WorkOrders.empty)
        )
      } else {
        List(rows) { row in
          NavigationLink {
            WorkOrderDetailView(client: client, workOrderId: row.id)
          } label: {
            VStack(alignment: .leading, spacing: 4) {
              Text(row.number)
                .font(.headline.monospaced())
              HStack {
                Text(row.workType)
                  .font(.caption)
                Spacer()
                Text(row.status)
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
              if row.isEmergency {
                Text(TrStrings.WorkOrders.emergency)
                  .font(.caption2)
                  .foregroundStyle(.red)
              }
            }
          }
        }
      }
    }
    .navigationTitle(TrStrings.WorkOrders.title)
    .toolbar {
      ToolbarItem(placement: .primaryAction) {
        NavigationLink {
          WorkOrderCreateView(client: client)
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
      let response: PostgrestResponse<[WorkOrderRowDTO]> = try await client
        .from("work_orders")
        .select("id, number, work_type, status, priority, is_emergency, elevator_asset_id")
        .eq("tenant_id", value: tenantId)
        .order("created_at", ascending: false)
        .limit(50)
        .execute()
      rows = response.value
    } catch {
      loadError = error.localizedDescription
    }
  }
}

private struct WorkOrderRowDTO: Decodable, Identifiable {
  let id: UUID
  let number: String
  let workType: String
  let status: String
  let priority: String
  let isEmergency: Bool

  enum CodingKeys: String, CodingKey {
    case id, number, status, priority
    case workType = "work_type"
    case isEmergency = "is_emergency"
  }
}
