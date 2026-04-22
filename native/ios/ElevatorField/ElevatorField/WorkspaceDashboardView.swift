import SwiftUI
import Supabase

/// `/app` — web `getDashboardCounts` + `listUpcomingPeriodicControls` (20 gün) ile aynı mantık; kiracı: ilk üyelik.
struct WorkspaceDashboardView: View {
  let client: SupabaseClient
  let access: WorkspaceAccess
  /// Panel istatistik satırı → ilgili modül (`/app/...`).
  let onNavigate: (String) -> Void

  @State private var rows: [TenantMembershipRow] = []
  @State private var loadError: String?
  @State private var loading = true
  @State private var counts: DashboardCountsPayload?
  @State private var upcoming: [UpcomingPeriodicPayload] = []

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
      if !upcoming.isEmpty {
        Section {
          ForEach(upcoming, id: \.id) { row in
            NavigationLink {
              AssetDetailView(client: client, assetId: row.id)
            } label: {
              VStack(alignment: .leading, spacing: 6) {
                Text(row.unitCode)
                  .font(.headline)
                Text("\(TrStrings.Assets.site): \(row.siteName ?? "—")")
                  .font(.subheadline)
                  .foregroundStyle(.secondary)
                Text("\(TrStrings.Assets.customerName): \(row.customerName ?? "—")")
                  .font(.subheadline)
                  .foregroundStyle(.secondary)
                HStack {
                  Text("\(TrStrings.En8120.nextControlDue): \(row.nextControlDuePrefix)")
                    .font(.caption)
                  Spacer()
                  if let d = row.daysUntilDue {
                    Text("\(d) \(TrStrings.Dashboard.daysLeft)")
                      .font(.caption)
                      .foregroundStyle(.secondary)
                  }
                }
              }
              .padding(.vertical, 4)
            }
          }
        } header: {
          VStack(alignment: .leading, spacing: 4) {
            Text(TrStrings.Dashboard.upcomingPeriodic)
            Text(TrStrings.Dashboard.upcomingPeriodicHint)
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
      }
      Section(TrStrings.Membership.sectionTitle) {
        ForEach(rows, id: \.id) { row in
          VStack(alignment: .leading, spacing: 4) {
            Text(row.systemRole.replacingOccurrences(of: "_", with: " ").capitalized)
              .font(.subheadline)
            Text(row.tenantId.uuidString)
              .font(.caption2)
              .foregroundStyle(.tertiary)
          }
        }
      }
    }
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
        upcoming = []
        return
      }
      async let countsTask = fetchCounts(tenantId: tenantId)
      async let upcomingTask = fetchUpcoming(tenantId: tenantId)
      counts = try await countsTask
      upcoming = (try? await upcomingTask) ?? []
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

  private func fetchUpcoming(tenantId: UUID) async throws -> [UpcomingPeriodicPayload] {
    let today = Self.isoDateOnly.string(from: Date())
    let endDate = Calendar.current.date(byAdding: .day, value: 20, to: Date()) ?? Date()
    let end = Self.isoDateOnly.string(from: endDate)
    let response: PostgrestResponse<[UpcomingPeriodicRow]> = try await client
      .from("elevator_assets")
      .select("id,unit_code,en8120_next_control_due,sites(name),customers(legal_name)")
      .eq("tenant_id", value: tenantId)
      .gte("en8120_next_control_due", value: today)
      .lte("en8120_next_control_due", value: end)
      .order("en8120_next_control_due", ascending: true)
      .order("unit_code", ascending: true)
      .limit(20)
      .execute()
    return response.value.map(UpcomingPeriodicPayload.init(row:))
  }

  private static let isoDateOnly: DateFormatter = {
    let f = DateFormatter()
    f.calendar = Calendar(identifier: .gregorian)
    f.locale = Locale(identifier: "en_US_POSIX")
    f.timeZone = TimeZone(identifier: "UTC")
    f.dateFormat = "yyyy-MM-dd"
    return f
  }()
}

private struct DashboardCountsPayload {
  let customerCount: Int
  let contractCount: Int
  let assetCount: Int
  let workOrderCount: Int
  let openBreakdowns: Int
  let openCallbacks: Int
}

private struct UpcomingPeriodicRow: Decodable {
  let id: UUID
  let unitCode: String
  let en8120NextControlDue: String?
  let sites: SiteEmbed?
  let customers: CustomerEmbed?

  enum CodingKeys: String, CodingKey {
    case id
    case unitCode = "unit_code"
    case en8120NextControlDue = "en8120_next_control_due"
    case sites
    case customers
  }

  struct SiteEmbed: Decodable {
    let name: String?
  }

  struct CustomerEmbed: Decodable {
    let legalName: String?
    enum CodingKeys: String, CodingKey {
      case legalName = "legal_name"
    }
  }
}

private struct UpcomingPeriodicPayload: Identifiable {
  let id: UUID
  let unitCode: String
  let siteName: String?
  let customerName: String?
  let nextControlDuePrefix: String
  let daysUntilDue: Int?

  init(row: UpcomingPeriodicRow) {
    id = row.id
    unitCode = row.unitCode
    siteName = row.sites?.name
    customerName = row.customers?.legalName
    let raw = row.en8120NextControlDue ?? ""
    nextControlDuePrefix = String(raw.prefix(10))
    daysUntilDue = Self.computeDaysUntilDue(datePrefix: nextControlDuePrefix)
  }

  private static func computeDaysUntilDue(datePrefix: String) -> Int? {
    guard datePrefix.count >= 10 else { return nil }
    let f = DateFormatter()
    f.calendar = Calendar(identifier: .gregorian)
    f.locale = Locale(identifier: "en_US_POSIX")
    f.timeZone = TimeZone.current
    f.dateFormat = "yyyy-MM-dd"
    guard let target = f.date(from: String(datePrefix.prefix(10))) else { return nil }
    let cal = Calendar.current
    let start = cal.startOfDay(for: Date())
    let end = cal.startOfDay(for: target)
    return cal.dateComponents([.day], from: start, to: end).day
  }
}
