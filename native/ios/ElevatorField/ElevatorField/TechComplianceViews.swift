import QuickLook
import SwiftUI
import Supabase

// MARK: - EN 81-20 maddeleri (salt okuma; ekleme web’de)

struct RevisionArticlesListView: View {
  let client: SupabaseClient

  @State private var rows: [RevisionArticleDTO] = []
  @State private var loadError: String?
  @State private var loading = true

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.RevisionArticles.title, systemImage: "bookmark", description: Text(loadError))
      } else if rows.isEmpty {
        ContentUnavailableView(
          TrStrings.RevisionArticles.title,
          systemImage: "bookmark",
          description: Text(TrStrings.RevisionArticles.empty)
        )
      } else {
        List(rows) { r in
          VStack(alignment: .leading, spacing: 4) {
            HStack {
              Text(r.articleCode).font(.headline.monospaced())
              Spacer()
              Text(r.ticketTier).font(.caption).foregroundStyle(.secondary)
            }
            Text(r.title).font(.subheadline)
            if let d = r.description, !d.isEmpty {
              Text(d).font(.caption).foregroundStyle(.secondary)
            }
            if let c = r.costLabel {
              Text(c).font(.caption.monospaced()).foregroundStyle(.tertiary)
            }
          }
          .padding(.vertical, 2)
        }
      }
    }
    .navigationTitle(TrStrings.RevisionArticles.title)
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
      let response: PostgrestResponse<[RevisionArticleDTO]> = try await client
        .from("revision_articles")
        .select("id, sort_order, article_code, title, description, ticket_tier, default_cost_try")
        .eq("tenant_id", value: tenantId)
        .order("sort_order", ascending: true)
        .order("article_code", ascending: true)
        .execute()
      rows = response.value
    } catch {
      loadError = error.localizedDescription
    }
  }
}

private struct RevisionArticleDTO: Decodable, Identifiable {
  let id: UUID
  let articleCode: String
  let title: String
  let description: String?
  let ticketTier: String
  let defaultCostTry: Double?

  enum CodingKeys: String, CodingKey {
    case id, title, description
    case articleCode = "article_code"
    case ticketTier = "ticket_tier"
    case defaultCostTry = "default_cost_try"
  }

  var costLabel: String? {
    guard let defaultCostTry else { return nil }
    return String(format: "%.2f TRY", defaultCostTry)
  }
}

// MARK: - Periyodik kontroller

struct PeriodicControlsListView: View {
  let client: SupabaseClient

  @State private var rows: [PeriodicControlListDTO] = []
  @State private var loadError: String?
  @State private var loading = true

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.PeriodicControls.title, systemImage: "checkmark.clipboard", description: Text(loadError))
      } else if rows.isEmpty {
        ContentUnavailableView(
          TrStrings.PeriodicControls.title,
          systemImage: "checkmark.clipboard",
          description: Text(TrStrings.PeriodicControls.empty)
        )
      } else {
        List(rows) { r in
          NavigationLink {
            PeriodicControlDetailView(client: client, controlId: r.id)
          } label: {
            VStack(alignment: .leading, spacing: 4) {
              Text(r.unitCode).font(.headline.monospaced())
              Text(r.siteName).font(.caption).foregroundStyle(.secondary)
              HStack {
                Text(String(r.controlDate.prefix(10))).font(.caption)
                Spacer()
                Text(r.issuerName ?? "—").font(.caption2).foregroundStyle(.tertiary)
              }
            }
          }
        }
      }
    }
    .navigationTitle(TrStrings.PeriodicControls.title)
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
      let response: PostgrestResponse<[PeriodicControlListDTO]> = try await client
        .from("periodic_controls")
        .select("""
          id,
          control_date,
          issuer_name,
          elevator_assets(unit_code, sites(name))
        """)
        .eq("tenant_id", value: tenantId)
        .order("control_date", ascending: false)
        .limit(100)
        .execute()
      rows = response.value
    } catch {
      loadError = error.localizedDescription
    }
  }
}

private struct PeriodicControlListDTO: Decodable, Identifiable {
  let id: UUID
  let controlDate: String
  let issuerName: String?
  let elevatorAssets: EANested?

  enum CodingKeys: String, CodingKey {
    case id
    case controlDate = "control_date"
    case issuerName = "issuer_name"
    case elevatorAssets = "elevator_assets"
  }

  var unitCode: String { elevatorAssets?.unitCode ?? "—" }
  var siteName: String { elevatorAssets?.sites?.name ?? "—" }
}

struct PeriodicControlDetailView: View {
  let client: SupabaseClient
  let controlId: UUID

  @State private var row: PeriodicControlDetailDTO?
  @State private var loadError: String?
  @State private var loading = true
  @State private var canCreateRevision = false
  @State private var showCreateRevision = false
  @State private var openRevision: OpenRevisionSheetItem?

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.PeriodicControls.detailTitle, systemImage: "doc", description: Text(loadError))
      } else if let row {
        List {
          Section(TrStrings.Assets.unit) {
            Text(row.unitCode).monospaced()
          }
          Section(TrStrings.Assets.site) {
            Text(row.siteName)
          }
          Section(TrStrings.Customers.title) {
            Text(row.customerName ?? "—")
          }
          Section(TrStrings.PeriodicControls.controlDate) {
            Text(String(row.controlDate.prefix(10)))
          }
          Section(TrStrings.PeriodicControls.issuer) {
            Text(row.issuerName ?? "—")
          }
          if let n = row.notes, !n.isEmpty {
            Section(TrStrings.Customers.notesLabel) {
              Text(n)
            }
          }
          Section(TrStrings.PeriodicControls.formPath) {
            Text(row.formFilePath).font(.caption2).textSelection(.enabled)
          }
        }
      } else {
        ContentUnavailableView(TrStrings.PeriodicControls.detailTitle, systemImage: "doc", description: Text("—"))
      }
    }
    .navigationTitle(TrStrings.PeriodicControls.detailTitle)
    .toolbar {
      if canCreateRevision, row != nil {
        ToolbarItem(placement: .primaryAction) {
          Button {
            showCreateRevision = true
          } label: {
            Label(TrStrings.PeriodicControls.createRevision, systemImage: "plus.square.on.square")
          }
        }
      }
    }
    .sheet(isPresented: $showCreateRevision) {
      CreateRevisionSheet(client: client, periodicControlId: controlId) { newId in
        showCreateRevision = false
        openRevision = OpenRevisionSheetItem(id: newId)
      }
    }
    .sheet(item: $openRevision) { item in
      NavigationStack {
        ElevatorRevisionDetailView(client: client, revisionId: item.id)
          .toolbar {
            ToolbarItem(placement: .cancellationAction) {
              Button(TrStrings.Common.cancel) {
                openRevision = nil
              }
            }
          }
      }
    }
    .fieldTabBarScrollContentInset()
    .task {
      await load()
      await loadCanCreateRevision()
    }
  }

  private func loadCanCreateRevision() async {
    do {
      guard let m = try await TenantScope.firstMembership(client: client) else {
        canCreateRevision = false
        return
      }
      canCreateRevision = WorkspaceAccess.canCreateRevisions(systemRole: m.systemRole)
    } catch {
      canCreateRevision = false
    }
  }

  private func load() async {
    loading = true
    loadError = nil
    defer { loading = false }
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else {
        loadError = TrStrings.Maintenance.noTenant
        return
      }
      let response: PostgrestResponse<PeriodicControlDetailDTO> = try await client
        .from("periodic_controls")
        .select("""
          id,
          control_date,
          issuer_name,
          notes,
          form_file_path,
          elevator_assets(unit_code, sites(name), customers(legal_name))
        """)
        .eq("tenant_id", value: tenantId)
        .eq("id", value: controlId)
        .single()
        .execute()
      row = response.value
    } catch {
      loadError = error.localizedDescription
    }
  }
}

private struct PeriodicControlDetailDTO: Decodable {
  let id: UUID
  let controlDate: String
  let issuerName: String?
  let notes: String?
  let formFilePath: String
  let elevatorAssets: EADetailNested?

  enum CodingKeys: String, CodingKey {
    case id
    case controlDate = "control_date"
    case issuerName = "issuer_name"
    case notes
    case formFilePath = "form_file_path"
    case elevatorAssets = "elevator_assets"
  }

  var unitCode: String { elevatorAssets?.unitCode ?? "—" }
  var siteName: String { elevatorAssets?.sites?.name ?? "—" }
  var customerName: String? { elevatorAssets?.customers?.legalName }
}

private struct OpenRevisionSheetItem: Identifiable {
  let id: UUID
}

// MARK: - Revizyon oluştur (web API; yalnızca ofis rolleri)

private struct CreateRevisionSheet: View {
  let client: SupabaseClient
  let periodicControlId: UUID
  let onCreated: (UUID) -> Void

  @Environment(\.dismiss) private var dismiss

  @State private var articles: [RevisionArticleDTO] = []
  @State private var selected = Set<UUID>()
  @State private var query = ""
  @State private var busy = false
  @State private var errorMessage: String?
  @State private var loadingArticles = true

  private var filtered: [RevisionArticleDTO] {
    let s = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    if s.isEmpty { return articles }
    return articles.filter {
      $0.articleCode.lowercased().contains(s)
        || $0.title.lowercased().contains(s)
        || ($0.description ?? "").lowercased().contains(s)
    }
  }

  private var previewTotal: Double {
    var t = 0.0
    for a in articles where selected.contains(a.id) {
      t += a.defaultCostTry ?? 0
    }
    return t
  }

  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        if loadingArticles {
          ProgressView(TrStrings.Common.loading).padding()
        } else {
          TextField(TrStrings.RevisionCreate.searchPlaceholder, text: $query)
            .textFieldStyle(.roundedBorder)
            .padding(.horizontal)
            .padding(.vertical, 8)
          List {
            ForEach(filtered) { a in
            Toggle(isOn: Binding(
              get: { selected.contains(a.id) },
              set: { on in
                if on { selected.insert(a.id) } else { selected.remove(a.id) }
              }
            )) {
              VStack(alignment: .leading, spacing: 4) {
                HStack {
                  Text(a.articleCode).font(.headline.monospaced())
                  Spacer()
                  Text(a.ticketTier).font(.caption2).foregroundStyle(.secondary)
                }
                Text(a.title).font(.subheadline)
                if let c = a.costLabel {
                  Text(c).font(.caption.monospaced()).foregroundStyle(.tertiary)
                }
              }
            }
            }
          }
          HStack {
            Text(TrStrings.RevisionCreate.previewTotal)
            Spacer()
            Text(String(format: "%.2f TRY", previewTotal)).font(.headline.monospaced()
            )
          }
          .padding()
          if let errorMessage {
            Text(errorMessage).font(.footnote).foregroundStyle(.red).padding(.horizontal)
          }
          Button {
            Task { await submit() }
          } label: {
            if busy {
              ProgressView(TrStrings.RevisionCreate.submitting)
            } else {
              Text(TrStrings.RevisionCreate.submit)
            }
          }
          .buttonStyle(.borderedProminent)
          .disabled(busy || selected.isEmpty)
          .padding(.bottom)
        }
      }
      .navigationTitle(TrStrings.RevisionCreate.sheetTitle)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button(TrStrings.Common.cancel) { dismiss() }
        }
      }
      .task { await loadArticles() }
    }
  }

  private func loadArticles() async {
    loadingArticles = true
    defer { loadingArticles = false }
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else {
        articles = []
        return
      }
      let response: PostgrestResponse<[RevisionArticleDTO]> = try await client
        .from("revision_articles")
        .select("id, sort_order, article_code, title, description, ticket_tier, default_cost_try")
        .eq("tenant_id", value: tenantId)
        .order("sort_order", ascending: true)
        .order("article_code", ascending: true)
        .execute()
      articles = response.value
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  private func submit() async {
    errorMessage = nil
    guard !selected.isEmpty else { return }
    busy = true
    defer { busy = false }
    do {
      let id = try await RevisionCreateAPI.create(
        client: client,
        periodicControlId: periodicControlId,
        revisionArticleIds: Array(selected)
      )
      onCreated(id)
      dismiss()
    } catch let e as RevisionCreateAPIError {
      errorMessage = e.localizedDescription
    } catch {
      errorMessage = error.localizedDescription
    }
  }
}

private enum RevisionCreateAPIError: LocalizedError {
  case missingPublicAppURL
  case badResponse(Int, String)
  case serverMessage(String)

  var errorDescription: String? {
    switch self {
    case .missingPublicAppURL:
      return TrStrings.RevisionCreate.missingPublicURL
    case .badResponse(let code, let body):
      return "HTTP \(code): \(body)"
    case .serverMessage(let s):
      return s
    }
  }
}

private enum RevisionCreateAPI {
  struct RequestBody: Encodable {
    let periodicControlId: String
    let revisionArticleIds: [String]
  }

  struct ResponseBody: Decodable {
    let ok: Bool
    let revisionId: String?
    let error: String?
  }

  static func create(client: SupabaseClient, periodicControlId: UUID, revisionArticleIds: [UUID]) async throws -> UUID {
    guard let baseRaw = AppConfig.publicAppWebBaseURL else {
      throw RevisionCreateAPIError.missingPublicAppURL
    }
    let base = baseRaw.trimmingCharacters(in: .whitespacesAndNewlines).trimmingSuffixSlash
    guard let url = URL(string: "\(base)/api/revisions/create") else {
      throw RevisionCreateAPIError.missingPublicAppURL
    }
    let session = try await client.auth.session
    var req = URLRequest(url: url)
    req.httpMethod = "POST"
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    req.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
    let body = RequestBody(
      periodicControlId: periodicControlId.uuidString.lowercased(),
      revisionArticleIds: revisionArticleIds.map { $0.uuidString.lowercased() }
    )
    req.httpBody = try JSONEncoder().encode(body)
    let (data, resp) = try await URLSession.shared.data(for: req)
    let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
    let text = String(data: data, encoding: .utf8) ?? ""
    guard let decoded = try? JSONDecoder().decode(ResponseBody.self, from: data) else {
      throw RevisionCreateAPIError.badResponse(code, text)
    }
    if decoded.ok, let sid = decoded.revisionId, let uuid = UUID(uuidString: sid) {
      return uuid
    }
    throw RevisionCreateAPIError.serverMessage(decoded.error ?? text)
  }
}

private enum RevisionOfferAPI {
  static func fetchPdf(client: SupabaseClient, revisionId: UUID) async throws -> URL {
    guard let baseRaw = AppConfig.publicAppWebBaseURL else {
      throw RevisionCreateAPIError.missingPublicAppURL
    }
    let base = baseRaw.trimmingCharacters(in: .whitespacesAndNewlines).trimmingSuffixSlash
    let path = "/api/revisions/\(revisionId.uuidString.lowercased())/offer"
    guard let url = URL(string: "\(base)\(path)") else {
      throw RevisionCreateAPIError.missingPublicAppURL
    }
    let session = try await client.auth.session
    var req = URLRequest(url: url)
    req.httpMethod = "GET"
    req.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
    let (data, resp) = try await URLSession.shared.data(for: req)
    let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
    let text = String(data: data, encoding: .utf8) ?? ""
    guard code == 200 else {
      throw RevisionCreateAPIError.badResponse(code, text)
    }
    guard data.count >= 4, data[0] == 0x25, data[1] == 0x50, data[2] == 0x44, data[3] == 0x46 else {
      throw RevisionCreateAPIError.badResponse(code, String(text.prefix(200)))
    }
    let temp = FileManager.default.temporaryDirectory
      .appendingPathComponent("revision-offer-\(revisionId.uuidString.lowercased())-\(UUID().uuidString).pdf")
    try data.write(to: temp)
    return temp
  }
}

/// `QLPreviewController` — SwiftUI sheet içinde PDF göstermek için.
private struct QuickLookPdfView: UIViewControllerRepresentable {
  let url: URL

  func makeUIViewController(context: Context) -> QLPreviewController {
    let c = QLPreviewController()
    c.dataSource = context.coordinator
    return c
  }

  func updateUIViewController(_ uiViewController: QLPreviewController, context: Context) {}

  func makeCoordinator() -> Coordinator {
    Coordinator(url: url)
  }

  final class Coordinator: NSObject, QLPreviewControllerDataSource {
    private let item: QLPreviewItem

    init(url: URL) {
      self.item = url as NSURL
    }

    func numberOfPreviewItems(in controller: QLPreviewController) -> Int { 1 }

    func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
      item
    }
  }
}

private struct OfferPdfPreviewSheetItem: Identifiable {
  let id = UUID()
  let url: URL
}

private extension String {
  var trimmingSuffixSlash: String {
    var s = self
    while s.hasSuffix("/") { s.removeLast() }
    return s
  }
}

// MARK: - Revizyonlar (asansör)

struct ElevatorRevisionsListView: View {
  let client: SupabaseClient

  @State private var rows: [ElevatorRevisionListDTO] = []
  @State private var loadError: String?
  @State private var loading = true

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.ElevatorRevisions.title, systemImage: "square.stack.3d.up", description: Text(loadError))
      } else if rows.isEmpty {
        ContentUnavailableView(
          TrStrings.ElevatorRevisions.title,
          systemImage: "square.stack.3d.up",
          description: Text(TrStrings.ElevatorRevisions.empty)
        )
      } else {
        List(rows) { r in
          NavigationLink {
            ElevatorRevisionDetailView(client: client, revisionId: r.id)
          } label: {
            VStack(alignment: .leading, spacing: 4) {
              HStack(alignment: .firstTextBaseline) {
                Text(r.unitCode).font(.headline.monospaced())
                Spacer(minLength: 0)
                if r.hasOfferPdf {
                  Image(systemName: "doc.richtext.fill")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .accessibilityLabel(TrStrings.ElevatorRevisions.listOfferPdfBadgeA11y)
                }
              }
              Text(r.siteName).font(.caption).foregroundStyle(.secondary)
              HStack {
                Text(String(r.createdAt.prefix(10))).font(.caption)
                Spacer()
                Text(r.approvalStatus).font(.caption2)
                Text(r.finalTicket ?? "—").font(.caption2).foregroundStyle(.secondary)
              }
              Text(r.totalLabel).font(.caption.monospaced()).foregroundStyle(.tertiary)
            }
          }
        }
      }
    }
    .navigationTitle(TrStrings.ElevatorRevisions.title)
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
      let response: PostgrestResponse<[ElevatorRevisionListDTO]> = try await client
        .from("elevator_revisions")
        .select("""
          id,
          created_at,
          approval_status,
          final_ticket,
          total_fee_try,
          offer_pdf_path,
          elevator_assets(unit_code, sites(name))
        """)
        .eq("tenant_id", value: tenantId)
        .order("created_at", ascending: false)
        .limit(80)
        .execute()
      rows = response.value
    } catch {
      loadError = error.localizedDescription
    }
  }
}

private struct ElevatorRevisionListDTO: Decodable, Identifiable {
  let id: UUID
  let createdAt: String
  let approvalStatus: String
  let finalTicket: String?
  let totalFeeTry: Double
  let offerPdfPath: String?
  let elevatorAssets: EANested?

  enum CodingKeys: String, CodingKey {
    case id
    case createdAt = "created_at"
    case approvalStatus = "approval_status"
    case finalTicket = "final_ticket"
    case totalFeeTry = "total_fee_try"
    case offerPdfPath = "offer_pdf_path"
    case elevatorAssets = "elevator_assets"
  }

  var unitCode: String { elevatorAssets?.unitCode ?? "—" }
  var siteName: String { elevatorAssets?.sites?.name ?? "—" }
  var totalLabel: String { String(format: "%.2f TRY", totalFeeTry) }

  var hasOfferPdf: Bool {
    guard let offerPdfPath else { return false }
    return !offerPdfPath.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }
}

struct ElevatorRevisionDetailView: View {
  let client: SupabaseClient
  let revisionId: UUID

  @State private var head: ElevatorRevisionHeadDTO?
  @State private var lines: [RevisionLineDTO] = []
  @State private var loadError: String?
  @State private var loading = true
  @State private var offerPreviewItem: OfferPdfPreviewSheetItem?
  @State private var offerDownloading = false
  @State private var offerDownloadError: String?

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.ElevatorRevisions.detailTitle, systemImage: "doc.richtext", description: Text(loadError))
      } else if let head {
        List {
          Section(TrStrings.Assets.unit) {
            Text(head.unitCode).monospaced()
          }
          Section(TrStrings.Assets.site) {
            Text(head.siteName)
          }
          Section(TrStrings.Customers.title) {
            Text(head.customerName ?? "—")
          }
          Section(TrStrings.ElevatorRevisions.approval) {
            Text(head.approvalStatus)
          }
          Section(TrStrings.ElevatorRevisions.finalTicket) {
            Text(head.finalTicket ?? "—")
          }
          Section(TrStrings.ElevatorRevisions.total) {
            Text(String(format: "%.2f TRY", head.totalFeeTry))
          }
          if let d = head.deadlineAtDisplay {
            Section(TrStrings.ElevatorRevisions.deadline) {
              Text(d)
            }
          }
          if head.hasOfferPdf {
            Section(TrStrings.ElevatorRevisions.offerPdf) {
              Button {
                Task { await downloadAndPreviewOffer() }
              } label: {
                if offerDownloading {
                  HStack {
                    ProgressView()
                    Text(TrStrings.ElevatorRevisions.downloadingOffer)
                  }
                } else {
                  Label(TrStrings.ElevatorRevisions.openOfferInApp, systemImage: "doc.text.fill")
                }
              }
              .disabled(offerDownloading || AppConfig.publicAppWebBaseURL == nil)
              if let offerDownloadError {
                Text(offerDownloadError)
                  .font(.caption)
                  .foregroundStyle(.red)
              }
              Text(
                AppConfig.publicAppWebBaseURL == nil
                  ? TrStrings.RevisionCreate.missingPublicURL
                  : TrStrings.ElevatorRevisions.offerPdfHint
              )
              .font(.caption)
              .foregroundStyle(.secondary)
            }
          }
          if let n = head.notes, !n.isEmpty {
            Section(TrStrings.WorkOrders.detailNotes) {
              Text(n)
            }
          }
          Section(TrStrings.ElevatorRevisions.linesSection) {
            ForEach(lines) { ln in
              VStack(alignment: .leading, spacing: 2) {
                Text("\(ln.articleCode) · \(ln.title)").font(.subheadline)
                HStack {
                  Text(ln.ticketTier).font(.caption2)
                  Spacer()
                  Text(String(format: "%.2f TRY", ln.unitPriceTry)).font(.caption.monospaced())
                }
                .foregroundStyle(.secondary)
              }
            }
          }
        }
      } else {
        ContentUnavailableView(TrStrings.ElevatorRevisions.detailTitle, systemImage: "doc.richtext", description: Text("—"))
      }
    }
    .navigationTitle(TrStrings.ElevatorRevisions.detailTitle)
    .fieldTabBarScrollContentInset()
    .task { await load() }
    .sheet(item: $offerPreviewItem) { item in
      ZStack(alignment: .topTrailing) {
        QuickLookPdfView(url: item.url)
          .ignoresSafeArea()
        Button {
          offerPreviewItem = nil
        } label: {
          Image(systemName: "xmark.circle.fill")
            .font(.title2)
            .symbolRenderingMode(.hierarchical)
            .padding(12)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(TrStrings.Common.cancel)
      }
    }
  }

  private func downloadAndPreviewOffer() async {
    offerDownloadError = nil
    offerDownloading = true
    defer { offerDownloading = false }
    do {
      let url = try await RevisionOfferAPI.fetchPdf(client: client, revisionId: revisionId)
      offerPreviewItem = OfferPdfPreviewSheetItem(url: url)
    } catch {
      offerDownloadError = error.localizedDescription
    }
  }

  private func load() async {
    loading = true
    loadError = nil
    defer { loading = false }
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else {
        loadError = TrStrings.Maintenance.noTenant
        return
      }
      let h: PostgrestResponse<ElevatorRevisionHeadDTO> = try await client
        .from("elevator_revisions")
        .select("""
          id,
          total_fee_try,
          notes,
          approval_status,
          final_ticket,
          deadline_at,
          offer_pdf_path,
          elevator_assets(unit_code, sites(name), customers(legal_name))
        """)
        .eq("tenant_id", value: tenantId)
        .eq("id", value: revisionId)
        .single()
        .execute()
      head = h.value

      let l: PostgrestResponse<[RevisionLineDTO]> = try await client
        .from("elevator_revision_lines")
        .select("""
          id,
          unit_price_try,
          sort_order,
          revision_articles(article_code, title, ticket_tier)
        """)
        .eq("tenant_id", value: tenantId)
        .eq("revision_id", value: revisionId)
        .order("sort_order", ascending: true)
        .execute()
      lines = l.value
    } catch {
      loadError = error.localizedDescription
    }
  }
}

private struct ElevatorRevisionHeadDTO: Decodable {
  let id: UUID
  let totalFeeTry: Double
  let notes: String?
  let approvalStatus: String
  let finalTicket: String?
  let deadlineAt: String?
  let offerPdfPath: String?
  let elevatorAssets: EADetailNested?

  enum CodingKeys: String, CodingKey {
    case id, notes
    case totalFeeTry = "total_fee_try"
    case approvalStatus = "approval_status"
    case finalTicket = "final_ticket"
    case deadlineAt = "deadline_at"
    case offerPdfPath = "offer_pdf_path"
    case elevatorAssets = "elevator_assets"
  }

  var unitCode: String { elevatorAssets?.unitCode ?? "—" }
  var siteName: String { elevatorAssets?.sites?.name ?? "—" }
  var customerName: String? { elevatorAssets?.customers?.legalName }

  var deadlineAtDisplay: String? {
    guard let deadlineAt, deadlineAt.count >= 10 else { return nil }
    return String(deadlineAt.prefix(10))
  }

  var hasOfferPdf: Bool {
    guard let offerPdfPath else { return false }
    return !offerPdfPath.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }
}

private struct RevisionLineDTO: Decodable, Identifiable {
  let id: UUID
  let unitPriceTry: Double
  let sortOrder: Int
  let revisionArticles: ArticleMini?

  enum CodingKeys: String, CodingKey {
    case id
    case unitPriceTry = "unit_price_try"
    case sortOrder = "sort_order"
    case revisionArticles = "revision_articles"
  }

  var articleCode: String { revisionArticles?.articleCode ?? "—" }
  var title: String { revisionArticles?.title ?? "—" }
  var ticketTier: String { revisionArticles?.ticketTier ?? "—" }

  struct ArticleMini: Decodable {
    let articleCode: String
    let title: String
    let ticketTier: String

    enum CodingKeys: String, CodingKey {
      case title
      case articleCode = "article_code"
      case ticketTier = "ticket_tier"
    }
  }
}

// MARK: - Paylaşılan gömülü tipler

private struct EANested: Decodable {
  let unitCode: String
  let sites: SiteName?

  enum CodingKeys: String, CodingKey {
    case unitCode = "unit_code"
    case sites
  }

  struct SiteName: Decodable {
    let name: String?
  }
}

private struct EADetailNested: Decodable {
  let unitCode: String
  let sites: EANested.SiteName?
  let customers: CustomerName?

  enum CodingKeys: String, CodingKey {
    case unitCode = "unit_code"
    case sites
    case customers
  }

  struct CustomerName: Decodable {
    let legalName: String?
    enum CodingKeys: String, CodingKey {
      case legalName = "legal_name"
    }
  }
}

extension TrStrings {
  enum RevisionArticles {
    static let title = "EN 81-20 maddeleri"
    static let empty = "Henüz madde yok. Web uygulamasından ekleyin."
  }

  enum PeriodicControls {
    static let title = "Periyodik kontroller"
    static let empty = "Kayıt yok. Web’den yeni kontrol ekleyin."
    static let detailTitle = "Periyodik kontrol"
    static let controlDate = "Kontrol tarihi"
    static let issuer = "Kuruluş / düzenleyen"
    static let formPath = "Form dosyası (yol)"
    static let createRevision = "Revizyon oluştur"
  }

  enum RevisionCreate {
    static let sheetTitle = "Revizyon — madde seçimi"
    static let searchPlaceholder = "Madde ara…"
    static let previewTotal = "Önizleme toplamı"
    static let submit = "Oluştur"
    static let submitting = "Oluşturuluyor…"
    static let missingPublicURL =
      "Web uygulaması adresi eksik. Xcode Local.xcconfig içinde PUBLIC_APP_URL (NEXT_PUBLIC_APP_URL ile aynı) tanımlayın."
  }

  enum ElevatorRevisions {
    static let title = "Revizyonlar"
    static let empty = "Revizyon kaydı yok."
    static let detailTitle = "Revizyon"
    static let approval = "Onay durumu"
    static let finalTicket = "Son bilet"
    static let total = "Toplam (TRY)"
    static let linesSection = "Maddeler"
    static let deadline = "Son başvuru tarihi"
    static let offerPdf = "Teklif PDF"
    static let openOfferInApp = "PDF’i uygulamada aç"
    static let downloadingOffer = "Teklif indiriliyor…"
    static let offerPdfHint =
      "Teklif PDF’i yukarıdaki düğme ile uygulama içinde indirip önizleyebilirsiniz."
    static let listOfferPdfBadgeA11y = "Teklif PDF mevcut"
  }
}
