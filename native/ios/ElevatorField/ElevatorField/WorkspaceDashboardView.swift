import SwiftUI
import Supabase

/// Web `/app` paneli; tarih aralığına göre dönem özetleri ve liste drill-down.
struct WorkspaceDashboardView: View {
  let client: SupabaseClient
  let access: WorkspaceAccess
  let onNavigate: (String) -> Void

  @State private var rows: [TenantMembershipRow] = []
  @State private var loadError: String?
  @State private var loading = true
  @State private var counts: DashboardCountsPayload?
  @State private var dynamicMetrics: DashboardDynamicMetrics = .empty
  @State private var rangeStart: Date = DashboardUTC.defaultMonthBounds().0
  @State private var rangeEnd: Date = DashboardUTC.defaultMonthBounds().1

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(
          TrStrings.Membership.loadFailed,
          systemImage: "exclamationmark.triangle",
          description: Text(loadError)
        )
      } else if rows.isEmpty {
        OnboardingView()
      } else {
        dashboardList
      }
    }
    .navigationTitle(TrStrings.Dashboard.title)
    .navigationBarTitleDisplayMode(.large)
    .fieldTabBarScrollContentInset()
    .task { await load() }
  }

  private var dashboardList: some View {
    List {
      Section {
        Text(TrStrings.Dashboard.subtitle)
          .font(.subheadline)
          .foregroundStyle(.secondary)
        Text(TrStrings.Dashboard.tenantScopeNote)
          .font(.caption)
          .foregroundStyle(.tertiary)
      }

      Section {
        DatePicker(TrStrings.Dashboard.dateFrom, selection: $rangeStart, displayedComponents: .date)
        DatePicker(TrStrings.Dashboard.dateTo, selection: $rangeEnd, displayedComponents: .date)
        Button(TrStrings.Dashboard.applyRange) {
          Task { await load() }
        }
      } header: {
        Text(TrStrings.Dashboard.rangeSection)
      } footer: {
        Text(TrStrings.Dashboard.rangeHint)
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      Section {
        NavigationLink {
          DashboardMetricListView(client: client, kind: .maintenanceExpected, rangeStart: rangeStart, rangeEnd: rangeEnd)
        } label: {
          dashboardMetricLabel(
            title: TrStrings.Dashboard.maintenanceExpected,
            value: "\(dynamicMetrics.maintenanceExpectedSlots)",
            caption: TrStrings.Dashboard.maintenanceExpectedHint
          )
        }
        NavigationLink {
          DashboardMetricListView(client: client, kind: .maintenanceCovered, rangeStart: rangeStart, rangeEnd: rangeEnd)
        } label: {
          dashboardMetricLabel(
            title: TrStrings.Dashboard.maintenanceCovered,
            value: "\(dynamicMetrics.maintenanceCoveredCount)",
            caption: TrStrings.Dashboard.maintenanceCoveredHint
          )
        }
        NavigationLink {
          DashboardMetricListView(client: client, kind: .revenue, rangeStart: rangeStart, rangeEnd: rangeEnd)
        } label: {
          dashboardMetricLabel(
            title: TrStrings.Dashboard.revenuePayments,
            value: dynamicMetrics.revenueDisplay(),
            caption: TrStrings.Dashboard.revenuePaymentsHint
          )
        }
        NavigationLink {
          DashboardMetricListView(client: client, kind: .failures, rangeStart: rangeStart, rangeEnd: rangeEnd)
        } label: {
          dashboardMetricLabel(
            title: TrStrings.Dashboard.failuresTotal,
            value: "\(dynamicMetrics.failuresCreatedCount)",
            caption: TrStrings.Dashboard.failuresTotalHint
          )
        }
        NavigationLink {
          DashboardMetricListView(client: client, kind: .failuresOpen, rangeStart: rangeStart, rangeEnd: rangeEnd)
        } label: {
          dashboardMetricLabel(
            title: TrStrings.Dashboard.failuresOpen,
            value: "\(dynamicMetrics.failuresUnsolvedCount)",
            caption: TrStrings.Dashboard.failuresOpenHint,
            emphasizeValue: dynamicMetrics.failuresUnsolvedCount > 0
          )
        }
        NavigationLink {
          DashboardMetricListView(client: client, kind: .periodicUpcoming, rangeStart: rangeStart, rangeEnd: rangeEnd)
        } label: {
          dashboardMetricLabel(
            title: TrStrings.Dashboard.periodicUpcoming,
            value: "\(dynamicMetrics.periodicDueCount)",
            caption: TrStrings.Dashboard.periodicUpcomingHint
          )
        }
      } header: {
        Text(TrStrings.Dashboard.dynamicMetrics)
      } footer: {
        Text(TrStrings.Dashboard.listLimitNote)
          .font(.caption2)
          .foregroundStyle(.tertiary)
      }

      if let counts {
        Section(TrStrings.Dashboard.portfolio) {
          statNavigationRow(label: TrStrings.Dashboard.customers, value: counts.customerCount, path: "/app/customers")
          statNavigationRow(label: TrStrings.Dashboard.contracts, value: counts.contractCount, path: "/app/contracts")
          statNavigationRow(label: TrStrings.Dashboard.elevators, value: counts.assetCount, path: "/app/assets")
          statNavigationRow(label: TrStrings.Dashboard.workOrders, value: counts.workOrderCount, path: "/app/work-orders")
        }
        Section(TrStrings.Dashboard.risk) {
          statNavigationRow(
            label: TrStrings.Dashboard.openBreakdowns,
            value: counts.openBreakdowns,
            path: "/app/work-orders",
            emphasize: counts.openBreakdowns > 0
          )
          statNavigationRow(label: TrStrings.Dashboard.callbacks, value: counts.openCallbacks, path: "/app/callbacks")
        }
      }
    }
  }

  private func dashboardMetricLabel(title: String, value: String, caption: String, emphasizeValue: Bool = false)
    -> some View
  {
    VStack(alignment: .leading, spacing: 6) {
      Text(title)
        .font(.subheadline)
        .foregroundStyle(.primary)
      Text(value)
        .font(.title2.weight(.semibold))
        .foregroundStyle(emphasizeValue ? Color.red : Color.primary)
      Text(caption)
        .font(.caption2)
        .foregroundStyle(.tertiary)
        .fixedSize(horizontal: false, vertical: true)
    }
    .padding(.vertical, 4)
  }

  @ViewBuilder
  private func statNavigationRow(label: String, value: Int, path: String, emphasize: Bool = false) -> some View {
    let route = AppRoute.allNavigableRoutes.first(where: { $0.webPath == path })
    let tappable = route.map { access.includes(route: $0) } ?? false
    if tappable {
      Button {
        onNavigate(path)
      } label: {
        statRowContent(label: label, value: value, emphasize: emphasize)
      }
      .buttonStyle(.plain)
      .accessibilityHint(TrStrings.Dashboard.openModuleHint)
    } else {
      statRowContent(label: label, value: value, emphasize: emphasize)
    }
  }

  private func statRowContent(label: String, value: Int, emphasize: Bool) -> some View {
    HStack {
      Text(label)
      Spacer()
      Text("\(value)")
        .fontWeight(.semibold)
        .foregroundStyle(emphasize ? Color.red : Color.primary)
    }
  }

  private func load() async {
    loading = true
    loadError = nil
    defer { loading = false }
    do {
      let uid = try await client.auth.session.user.id
      let membershipResponse: PostgrestResponse<[TenantMembershipRow]> = try await client
        .from("tenant_members")
        .select("id, tenant_id, system_role")
        .eq("user_id", value: uid)
        .eq("is_active", value: true)
        .order("joined_at", ascending: true)
        .execute()
      rows = membershipResponse.value
      guard let tenantId = rows.first?.tenantId else {
        counts = nil
        dynamicMetrics = .empty
        return
      }
      async let countsTask = fetchCounts(tenantId: tenantId)
      async let dynTask = DashboardMetricsFetcher.fetch(
        client: client,
        tenantId: tenantId,
        rangeStart: rangeStart,
        rangeEnd: rangeEnd
      )
      counts = try await countsTask
      dynamicMetrics = (try? await dynTask) ?? .empty
    } catch {
      loadError = error.localizedDescription
    }
  }

  private func fetchCounts(tenantId: UUID) async throws -> DashboardCountsPayload {
    let t = tenantId
    async let customerCount = headCount(table: "customers", tenantId: t)
    async let contractCount = headCount(table: "contracts", tenantId: t)
    async let assetCount = headCount(table: "elevator_assets", tenantId: t)
    async let workOrderCount = headCount(table: "work_orders", tenantId: t)
    async let openBreakdowns = headCountOpenBreakdowns(tenantId: t)
    async let openCallbacks = headCount(table: "callbacks", tenantId: t)
    return try await DashboardCountsPayload(
      customerCount: customerCount,
      contractCount: contractCount,
      assetCount: assetCount,
      workOrderCount: workOrderCount,
      openBreakdowns: openBreakdowns,
      openCallbacks: openCallbacks
    )
  }

  private func headCount(table: String, tenantId: UUID) async throws -> Int {
    let response: PostgrestResponse<Void> = try await client
      .from(table)
      .select("id", head: true, count: .exact)
      .eq("tenant_id", value: tenantId)
      .execute()
    return response.count ?? 0
  }

  private func headCountOpenBreakdowns(tenantId: UUID) async throws -> Int {
    let response: PostgrestResponse<Void> = try await client
      .from("work_orders")
      .select("id", head: true, count: .exact)
      .eq("tenant_id", value: tenantId)
      .eq("work_type", value: "emergency_breakdown")
      .not("status", operator: .eq, value: "completed")
      .not("status", operator: .eq, value: "cancelled")
      .execute()
    return response.count ?? 0
  }
}

private struct DashboardCountsPayload {
  let customerCount: Int
  let contractCount: Int
  let assetCount: Int
  let workOrderCount: Int
  let openBreakdowns: Int
  let openCallbacks: Int
}
