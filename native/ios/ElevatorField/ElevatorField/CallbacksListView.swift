import SwiftUI
import Supabase

/// `callbacks`: önceki iş emrinden sonra açılan yeni iş emri (tekrar / geri arama) kayıtları — salt okuma.
struct CallbacksListView: View {
  let client: SupabaseClient

  @State private var rows: [CallbackRowDTO] = []
  @State private var loadError: String?
  @State private var loading = true

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.Callbacks.title, systemImage: "phone", description: Text(loadError))
      } else if rows.isEmpty {
        ContentUnavailableView(
          TrStrings.Callbacks.title,
          systemImage: "phone",
          description: Text(TrStrings.Callbacks.empty)
        )
      } else {
        List(rows) { row in
          NavigationLink {
            WorkOrderDetailView(client: client, workOrderId: row.newWorkOrderId)
          } label: {
            VStack(alignment: .leading, spacing: 6) {
              HStack {
                Text(String(format: TrStrings.Callbacks.newWoFmt, row.newNumberDisplay))
                  .font(.headline.monospaced())
                Spacer()
                Text(String(row.createdAt.prefix(16)).replacingOccurrences(of: "T", with: " "))
                  .font(.caption2)
                  .foregroundStyle(.tertiary)
              }
              Text(String(format: TrStrings.Callbacks.priorWoFmt, row.priorNumberDisplay))
                .font(.caption)
                .foregroundStyle(.secondary)
              if let code = row.reasonCode, !code.isEmpty {
                Text("\(TrStrings.Callbacks.reason): \(code)")
                  .font(.caption2)
                  .foregroundStyle(.secondary)
              }
              if let u = row.unitCode, !u.isEmpty {
                Text("\(TrStrings.Callbacks.unit): \(u)")
                  .font(.caption2)
                  .foregroundStyle(.tertiary)
              }
            }
            .padding(.vertical, 2)
          }
        }
      }
    }
    .navigationTitle(TrStrings.Callbacks.title)
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
        loadError = TrStrings.Maintenance.noTenant
        return
      }
      let response: PostgrestResponse<[CallbackRowDTO]> = try await client
        .from("callbacks")
        .select(
          """
          id,
          created_at,
          reason_code,
          prior_work_order_id,
          new_work_order_id,
          elevator_assets(unit_code),
          prior_wo:work_orders!callbacks_prior_work_order_id_fkey(number, status),
          new_wo:work_orders!callbacks_new_work_order_id_fkey(number, status)
          """
        )
        .eq("tenant_id", value: tenantId)
        .order("created_at", ascending: false)
        .limit(100)
        .execute()
      rows = response.value
    } catch {
      loadError = error.localizedDescription
    }
  }
}

private struct CallbackRowDTO: Decodable, Identifiable {
  let id: UUID
  let createdAt: String
  let reasonCode: String?
  let priorWorkOrderId: UUID
  let newWorkOrderId: UUID
  let elevatorAssets: UnitEmbed?
  let priorWo: WorkOrderEmbed?
  let newWo: WorkOrderEmbed?

  enum CodingKeys: String, CodingKey {
    case id
    case createdAt = "created_at"
    case reasonCode = "reason_code"
    case priorWorkOrderId = "prior_work_order_id"
    case newWorkOrderId = "new_work_order_id"
    case elevatorAssets = "elevator_assets"
    case priorWo = "prior_wo"
    case newWo = "new_wo"
  }

  struct UnitEmbed: Decodable {
    let unitCode: String?
    enum CodingKeys: String, CodingKey {
      case unitCode = "unit_code"
    }
  }

  struct WorkOrderEmbed: Decodable {
    let number: String
    let status: String?
  }

  var unitCode: String? { elevatorAssets?.unitCode }

  var priorNumberDisplay: String {
    if let n = priorWo?.number, !n.isEmpty { return n }
    return String(priorWorkOrderId.uuidString.prefix(8))
  }

  var newNumberDisplay: String {
    if let n = newWo?.number, !n.isEmpty { return n }
    return String(newWorkOrderId.uuidString.prefix(8))
  }
}
