import SwiftUI
import Supabase

struct WorkOrderDetailView: View {
  let client: SupabaseClient
  let workOrderId: UUID

  @State private var model: WorkOrderDetailModel?
  @State private var loadError: String?
  @State private var loading = true

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.WorkOrders.title, systemImage: "wrench.and.screwdriver", description: Text(loadError))
      } else if let model {
        List {
          Section {
            Text(TrStrings.WorkOrders.detailHint)
              .font(.footnote)
              .foregroundStyle(.secondary)
          }
          Section(TrStrings.WorkOrders.detailFault) {
            Text(model.faultSymptom ?? "—")
            Text("\(TrStrings.Customers.rootCausePrefix) \(model.faultRootCause ?? "—")")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
          Section(TrStrings.WorkOrders.detailNotes) {
            Text(model.internalNotes ?? "—")
          }
          Section {
            LabeledContent(TrStrings.WorkOrders.fieldNumber, value: model.number)
            LabeledContent(TrStrings.WorkOrders.fieldType, value: model.workType)
            LabeledContent(TrStrings.WorkOrders.fieldStatus, value: model.status)
            LabeledContent(TrStrings.WorkOrders.fieldPriority, value: model.priority)
          }
        }
      } else {
        ContentUnavailableView(TrStrings.WorkOrders.title, systemImage: "wrench.and.screwdriver", description: Text("Bulunamadı"))
      }
    }
    .navigationTitle(model.map { "WO \($0.number)" } ?? TrStrings.WorkOrders.title)
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
      let response: PostgrestResponse<WorkOrderDetailModel> = try await client
        .from("work_orders")
        .select()
        .eq("tenant_id", value: tenantId)
        .eq("id", value: workOrderId)
        .single()
        .execute()
      model = response.value
    } catch {
      loadError = error.localizedDescription
      model = nil
    }
  }
}

private struct WorkOrderDetailModel: Decodable {
  let number: String
  let workType: String
  let status: String
  let priority: String
  let faultSymptom: String?
  let faultRootCause: String?
  let internalNotes: String?

  enum CodingKeys: String, CodingKey {
    case number, status, priority
    case workType = "work_type"
    case faultSymptom = "fault_symptom"
    case faultRootCause = "fault_root_cause"
    case internalNotes = "internal_notes"
  }
}
