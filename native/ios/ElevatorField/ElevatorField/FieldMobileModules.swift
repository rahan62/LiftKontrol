import QuickLook
import SwiftUI
import Supabase
import UniformTypeIdentifiers

// MARK: - API

private enum MobileAPIError: LocalizedError {
  case missingPublicAppURL
  case badResponse(Int, String)
  case serverMessage(String)

  var errorDescription: String? {
    switch self {
    case .missingPublicAppURL:
      return TrStrings.MobileAPI.missingPublicURL
    case .badResponse(let code, let body):
      return "HTTP \(code): \(body)"
    case .serverMessage(let s):
      return s
    }
  }
}

private enum MobileAPI {
  static func baseURL() throws -> String {
    guard let raw = AppConfig.publicAppWebBaseURL else {
      throw MobileAPIError.missingPublicAppURL
    }
    var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    while s.hasSuffix("/") { s.removeLast() }
    return s
  }

  static func authorizedGETData(client: SupabaseClient, path: String) async throws -> Data {
    let base = try baseURL()
    guard let url = URL(string: "\(base)\(path)") else { throw MobileAPIError.missingPublicAppURL }
    let session = try await client.auth.session
    var req = URLRequest(url: url)
    req.httpMethod = "GET"
    req.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
    let (data, resp) = try await URLSession.shared.data(for: req)
    let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
    let text = String(data: data, encoding: .utf8) ?? ""
    guard code == 200 else { throw MobileAPIError.badResponse(code, text) }
    return data
  }

  static func authorizedDELETEJSON(client: SupabaseClient, path: String) async throws {
    let base = try baseURL()
    guard let url = URL(string: "\(base)\(path)") else { throw MobileAPIError.missingPublicAppURL }
    let session = try await client.auth.session
    var req = URLRequest(url: url)
    req.httpMethod = "DELETE"
    req.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
    let (data, resp) = try await URLSession.shared.data(for: req)
    let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
    let text = String(data: data, encoding: .utf8) ?? ""
    guard code == 200 else { throw MobileAPIError.badResponse(code, text) }
    struct Body: Decodable { let ok: Bool?; let error: String? }
    if let b = try? JSONDecoder().decode(Body.self, from: data), b.ok == false {
      throw MobileAPIError.serverMessage(b.error ?? text)
    }
  }

  static func authorizedPOSTJSON<T: Encodable>(client: SupabaseClient, path: String, body: T) async throws -> Data {
    let base = try baseURL()
    guard let url = URL(string: "\(base)\(path)") else { throw MobileAPIError.missingPublicAppURL }
    let session = try await client.auth.session
    var req = URLRequest(url: url)
    req.httpMethod = "POST"
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    req.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
    req.httpBody = try JSONEncoder().encode(body)
    let (data, resp) = try await URLSession.shared.data(for: req)
    let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
    let text = String(data: data, encoding: .utf8) ?? ""
    guard (200...299).contains(code) else { throw MobileAPIError.badResponse(code, text) }
    return data
  }

  static func authorizedPOSTMultipart(
    client: SupabaseClient,
    path: String,
    fields: [String: String],
    fileField: String,
    fileData: Data,
    fileName: String,
    mimeType: String
  ) async throws -> Data {
    let base = try baseURL()
    guard let url = URL(string: "\(base)\(path)") else { throw MobileAPIError.missingPublicAppURL }
    let session = try await client.auth.session
    let boundary = "Boundary-\(UUID().uuidString)"
    var body = Data()
    func append(_ s: String) { body.append(Data(s.utf8)) }

    for (k, v) in fields {
      append("--\(boundary)\r\n")
      append("Content-Disposition: form-data; name=\"\(k)\"\r\n\r\n")
      append("\(v)\r\n")
    }
    append("--\(boundary)\r\n")
    append("Content-Disposition: form-data; name=\"\(fileField)\"; filename=\"\(fileName)\"\r\n")
    append("Content-Type: \(mimeType)\r\n\r\n")
    body.append(fileData)
    append("\r\n")
    append("--\(boundary)--\r\n")

    var req = URLRequest(url: url)
    req.httpMethod = "POST"
    req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
    req.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
    req.httpBody = body

    let (data, resp) = try await URLSession.shared.data(for: req)
    let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
    let text = String(data: data, encoding: .utf8) ?? ""
    guard (200...299).contains(code) else { throw MobileAPIError.badResponse(code, text) }
    return data
  }

  /// Dosya olmadan `multipart/form-data` (sözleşme oluşturma gibi).
  static func authorizedPOSTMultipartFieldsOnly(client: SupabaseClient, path: String, fields: [String: String]) async throws -> Data {
    let base = try baseURL()
    guard let url = URL(string: "\(base)\(path)") else { throw MobileAPIError.missingPublicAppURL }
    let session = try await client.auth.session
    let boundary = "Boundary-\(UUID().uuidString)"
    var body = Data()
    func append(_ s: String) { body.append(Data(s.utf8)) }
    for (k, v) in fields {
      append("--\(boundary)\r\n")
      append("Content-Disposition: form-data; name=\"\(k)\"\r\n\r\n")
      append("\(v)\r\n")
    }
    append("--\(boundary)--\r\n")
    var req = URLRequest(url: url)
    req.httpMethod = "POST"
    req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
    req.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
    req.httpBody = body
    let (data, resp) = try await URLSession.shared.data(for: req)
    let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
    let text = String(data: data, encoding: .utf8) ?? ""
    guard (200...299).contains(code) else { throw MobileAPIError.badResponse(code, text) }
    return data
  }

  static func writeDataToTempFile(data: Data, suggestedName: String) throws -> URL {
    let safe = suggestedName.replacingOccurrences(of: "/", with: "_")
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("dl-\(UUID().uuidString)-\(safe)")
    try data.write(to: url)
    return url
  }
}

// MARK: - Quick Look

private struct QuickLookPreview: UIViewControllerRepresentable {
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
    init(url: URL) { self.item = url as NSURL }
    func numberOfPreviewItems(in controller: QLPreviewController) -> Int { 1 }
    func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
      item
    }
  }
}

private struct PreviewSheetItem: Identifiable {
  let id = UUID()
  let url: URL
}

// MARK: - Sözleşmeler

private struct ContractListRow: Decodable, Identifiable {
  let id: UUID
  let title: String
  let status: String
  let contractType: String
  let startAt: String?
  let endAt: String?
  let storedFilePath: String?
  let customers: CustomerEmbed?

  struct CustomerEmbed: Decodable {
    let legalName: String?
    enum CodingKeys: String, CodingKey {
      case legalName = "legal_name"
    }
  }

  enum CodingKeys: String, CodingKey {
    case id, title, status
    case contractType = "contract_type"
    case startAt = "start_at"
    case endAt = "end_at"
    case storedFilePath = "stored_file_path"
    case customers
  }

  var customerLine: String {
    let n = customers?.legalName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    return n.isEmpty ? "—" : n
  }
}

struct ContractsListView: View {
  let client: SupabaseClient

  @State private var rows: [ContractListRow] = []
  @State private var loadError: String?
  @State private var loading = true
  @State private var busyId: UUID?
  @State private var previewItem: PreviewSheetItem?
  @State private var actionError: String?

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.Contracts.title, systemImage: "doc.text", description: Text(loadError))
      } else if rows.isEmpty {
        ContentUnavailableView(TrStrings.Contracts.title, systemImage: "doc.text", description: Text(TrStrings.Contracts.empty))
      } else {
        List(rows) { r in
          Button {
            Task { await openContractFile(r) }
          } label: {
            VStack(alignment: .leading, spacing: 4) {
              Text(r.title).font(.headline)
              Text(r.customerLine).font(.caption).foregroundStyle(.secondary)
              HStack {
                Text(r.status).font(.caption2)
                Text(r.contractType).font(.caption2).foregroundStyle(.tertiary)
                Spacer()
                if r.storedFilePath?.isEmpty == false {
                  if busyId == r.id {
                    ProgressView().scaleEffect(0.85)
                  } else {
                    Image(systemName: "doc.fill").foregroundStyle(.secondary)
                  }
                } else {
                  Text(TrStrings.Contracts.noFile).font(.caption2).foregroundStyle(.tertiary)
                }
              }
            }
          }
          .disabled(r.storedFilePath == nil || r.storedFilePath?.isEmpty == true || busyId != nil)
        }
      }
    }
    .navigationTitle(TrStrings.Contracts.title)
    .toolbar {
      ToolbarItem(placement: .primaryAction) {
        NavigationLink {
          ContractCreateView(client: client)
        } label: {
          Image(systemName: "plus")
        }
      }
    }
    .fieldTabBarScrollContentInset()
    .task { await load() }
    .sheet(item: $previewItem) { item in
      QuickLookPreview(url: item.url)
    }
    .alert(TrStrings.Common.errorTitle, isPresented: Binding(
      get: { actionError != nil },
      set: { if !$0 { actionError = nil } }
    )) {
      Button(TrStrings.Common.ok, role: .cancel) { actionError = nil }
    } message: {
      if let actionError { Text(actionError) }
    }
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
      let response: PostgrestResponse<[ContractListRow]> = try await client
        .from("contracts")
        .select("id, title, status, contract_type, start_at, end_at, stored_file_path, customers(legal_name)")
        .eq("tenant_id", value: tenantId)
        .order("created_at", ascending: false)
        .limit(200)
        .execute()
      rows = response.value
    } catch {
      loadError = error.localizedDescription
    }
  }

  private func openContractFile(_ r: ContractListRow) async {
    guard r.storedFilePath?.isEmpty == false else { return }
    busyId = r.id
    defer { busyId = nil }
    do {
      let data = try await MobileAPI.authorizedGETData(
        client: client,
        path: "/api/mobile/contracts/\(r.id.uuidString.lowercased())/file"
      )
      let name = "\(r.title)-sozlesme".sanitizedFileName + ".bin"
      let url = try MobileAPI.writeDataToTempFile(data: data, suggestedName: name)
      previewItem = PreviewSheetItem(url: url)
    } catch {
      actionError = error.localizedDescription
    }
  }
}

// MARK: - Yeni sözleşme

private struct CustomerPickRow: Decodable, Identifiable {
  let id: UUID
  let legalName: String

  enum CodingKeys: String, CodingKey {
    case id
    case legalName = "legal_name"
  }
}

struct ContractCreateView: View {
  let client: SupabaseClient

  @Environment(\.dismiss) private var dismiss

  @State private var customers: [CustomerPickRow] = []
  @State private var customerId: UUID?
  @State private var titleText = ""
  @State private var counterpartyText = ""
  @State private var startDate = Date()
  @State private var hasEndDate = false
  @State private var endDate = Date()
  @State private var transferBasis: String = ""
  @State private var pickedURL: URL?
  @State private var fileImporterPresented = false

  @State private var loadError: String?
  @State private var loading = true
  @State private var saving = false
  @State private var actionError: String?
  @State private var doneMessage: String?

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.ContractCreate.title, systemImage: "doc.badge.plus", description: Text(loadError))
      } else {
        Form {
          Section(TrStrings.ContractCreate.customerSection) {
            Picker(TrStrings.ContractCreate.customerPicker, selection: $customerId) {
              Text(TrStrings.WorkOrderCreate.pickPlaceholder).tag(Optional<UUID>.none)
              ForEach(customers) { c in
                Text(c.legalName).tag(Optional(c.id))
              }
            }
          }
          Section(TrStrings.ContractCreate.titleSection) {
            TextField(TrStrings.ContractCreate.titlePlaceholder, text: $titleText)
            TextField(TrStrings.ContractCreate.counterpartyPlaceholder, text: $counterpartyText)
          }
          Section(TrStrings.ContractCreate.datesSection) {
            DatePicker(TrStrings.ContractCreate.startDate, selection: $startDate, displayedComponents: .date)
            Toggle(TrStrings.ContractCreate.hasEndDate, isOn: $hasEndDate)
            if hasEndDate {
              DatePicker(TrStrings.ContractCreate.endDate, selection: $endDate, displayedComponents: .date)
            }
          }
          Section(TrStrings.ContractCreate.transferSection) {
            Picker(TrStrings.ContractCreate.transferPicker, selection: $transferBasis) {
              Text(TrStrings.ContractCreate.transferNone).tag("")
              Text(TrStrings.ContractCreate.transferDirect).tag("direct_after_prior_expiry")
              Text(TrStrings.ContractCreate.transferAfterAnnual).tag("after_annual_en8120")
            }
          }
          Section(TrStrings.ContractCreate.fileSection) {
            Button {
              fileImporterPresented = true
            } label: {
              if let pickedURL {
                Text(pickedURL.lastPathComponent).lineLimit(2)
              } else {
                Text(TrStrings.ContractCreate.chooseFileOptional)
              }
            }
          }
          if let actionError {
            Section {
              Text(actionError).font(.footnote).foregroundStyle(.red)
            }
          }
          Section {
            Button {
              Task { await save() }
            } label: {
              if saving { ProgressView() } else { Text(TrStrings.ContractCreate.save) }
            }
            .disabled(saving || !canSave)
          }
        }
      }
    }
    .navigationTitle(TrStrings.ContractCreate.title)
    .navigationBarTitleDisplayMode(.inline)
    .fileImporter(
      isPresented: $fileImporterPresented,
      allowedContentTypes: [.data, .pdf, .image, .item],
      allowsMultipleSelection: false
    ) { result in
      switch result {
      case .success(let urls):
        pickedURL = urls.first
      case .failure:
        pickedURL = nil
      }
    }
    .fieldTabBarScrollContentInset()
    .task { await load() }
    .alert(TrStrings.ContractCreate.doneTitle, isPresented: Binding(
      get: { doneMessage != nil },
      set: { if !$0 { doneMessage = nil } }
    )) {
      Button(TrStrings.Common.ok) {
        doneMessage = nil
        dismiss()
      }
    } message: {
      if let doneMessage { Text(doneMessage) }
    }
  }

  private var canSave: Bool {
    let t = titleText.trimmingCharacters(in: .whitespacesAndNewlines)
    return customerId != nil && !t.isEmpty
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
      let response: PostgrestResponse<[CustomerPickRow]> = try await client
        .from("customers")
        .select("id, legal_name")
        .eq("tenant_id", value: tenantId)
        .order("legal_name", ascending: true)
        .limit(500)
        .execute()
      customers = response.value
    } catch {
      loadError = error.localizedDescription
    }
  }

  private func save() async {
    guard let cid = customerId else { return }
    let title = titleText.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !title.isEmpty else { return }
    let start = Self.apiFormatter.string(from: startDate)
    let endPart: String = {
      guard hasEndDate else { return "" }
      return Self.apiFormatter.string(from: endDate)
    }()
    saving = true
    actionError = nil
    defer { saving = false }
    do {
      let fields: [String: String] = [
        "customer_id": cid.uuidString.lowercased(),
        "title": title,
        "counterparty_name": counterpartyText.trimmingCharacters(in: .whitespacesAndNewlines),
        "start_at": start,
        "end_at": endPart,
        "maintenance_transfer_basis": transferBasis,
      ]
      let respData: Data
      if let url = pickedURL {
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        let data = try Data(contentsOf: url)
        guard !data.isEmpty else {
          actionError = TrStrings.Documents.emptyFile
          return
        }
        let fname = url.lastPathComponent.isEmpty ? "contract.pdf" : url.lastPathComponent
        let mime = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
        respData = try await MobileAPI.authorizedPOSTMultipart(
          client: client,
          path: "/api/mobile/contracts",
          fields: fields,
          fileField: "file",
          fileData: data,
          fileName: fname,
          mimeType: mime
        )
      } else {
        respData = try await MobileAPI.authorizedPOSTMultipartFieldsOnly(
          client: client,
          path: "/api/mobile/contracts",
          fields: fields
        )
      }
      try handleContractResponse(respData)
    } catch {
      actionError = error.localizedDescription
    }
  }

  private func handleContractResponse(_ respData: Data) throws {
    struct Body: Decodable { let ok: Bool?; let id: String?; let error: String? }
    let decoded = try JSONDecoder().decode(Body.self, from: respData)
    if decoded.ok == true {
      doneMessage = TrStrings.ContractCreate.doneBody
    } else {
      throw MobileAPIError.serverMessage(decoded.error ?? TrStrings.ContractCreate.failed)
    }
  }

  private static let apiFormatter: DateFormatter = {
    let f = DateFormatter()
    f.calendar = Calendar(identifier: .gregorian)
    f.locale = Locale(identifier: "en_US_POSIX")
    f.timeZone = TimeZone(identifier: "UTC")
    f.dateFormat = "yyyy-MM-dd"
    return f
  }()
}

// MARK: - Belgeler

private struct TenantDocumentRow: Decodable, Identifiable {
  let id: UUID
  let title: String
  let description: String?
  let createdAt: String
  let originalFilename: String?
  let customers: NameEmbed?
  let sites: NameEmbed?

  struct NameEmbed: Decodable {
    let name: String?
  }

  enum CodingKeys: String, CodingKey {
    case id, title, description
    case createdAt = "created_at"
    case originalFilename = "original_filename"
    case customers, sites
  }

  var subtitle: String {
    let c = customers?.name?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let s = sites?.name?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    switch (c.isEmpty, s.isEmpty) {
    case (false, false): return "\(c) · \(s)"
    case (false, true): return c
    case (true, false): return s
    default:
      return originalFilename?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    }
  }
}

struct TenantDocumentsListView: View {
  let client: SupabaseClient

  @State private var rows: [TenantDocumentRow] = []
  @State private var loadError: String?
  @State private var loading = true
  @State private var busyId: UUID?
  @State private var previewItem: PreviewSheetItem?
  @State private var actionError: String?
  @State private var uploadPresented = false
  @State private var deleteId: UUID?
  @State private var deleteConfirm = false

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.Documents.title, systemImage: "folder", description: Text(loadError))
      } else if rows.isEmpty {
        ContentUnavailableView(TrStrings.Documents.title, systemImage: "folder", description: Text(TrStrings.Documents.empty))
      } else {
        List {
          ForEach(rows) { r in
            Button {
              Task { await openDoc(r) }
            } label: {
              VStack(alignment: .leading, spacing: 4) {
                Text(r.title).font(.headline)
                if !r.subtitle.isEmpty {
                  Text(r.subtitle).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                }
                Text(String(r.createdAt.prefix(16)).replacingOccurrences(of: "T", with: " "))
                  .font(.caption2)
                  .foregroundStyle(.tertiary)
                if busyId == r.id {
                  ProgressView().padding(.top, 4)
                }
              }
            }
            .disabled(busyId != nil)
            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
              Button(TrStrings.Common.delete, role: .destructive) {
                deleteId = r.id
                deleteConfirm = true
              }
            }
          }
        }
      }
    }
    .navigationTitle(TrStrings.Documents.title)
    .toolbar {
      ToolbarItem(placement: .primaryAction) {
        Button {
          uploadPresented = true
        } label: {
          Image(systemName: "plus")
        }
      }
    }
    .sheet(isPresented: $uploadPresented) {
      NavigationStack {
        TenantDocumentUploadView(client: client) {
          uploadPresented = false
          Task { await load() }
        }
      }
    }
    .confirmationDialog(TrStrings.Documents.deleteConfirm, isPresented: $deleteConfirm, titleVisibility: .visible) {
      Button(TrStrings.Common.delete, role: .destructive) {
        if let id = deleteId { Task { await deleteDoc(id) } }
      }
      Button(TrStrings.Common.cancel, role: .cancel) { deleteId = nil }
    }
    .fieldTabBarScrollContentInset()
    .task { await load() }
    .sheet(item: $previewItem) { item in
      QuickLookPreview(url: item.url)
    }
    .alert(TrStrings.Common.errorTitle, isPresented: Binding(
      get: { actionError != nil },
      set: { if !$0 { actionError = nil } }
    )) {
      Button(TrStrings.Common.ok, role: .cancel) { actionError = nil }
    } message: {
      if let actionError { Text(actionError) }
    }
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
      let response: PostgrestResponse<[TenantDocumentRow]> = try await client
        .from("tenant_documents")
        .select("id, title, description, created_at, original_filename, customers(name), sites(name)")
        .eq("tenant_id", value: tenantId)
        .order("created_at", ascending: false)
        .limit(300)
        .execute()
      rows = response.value
    } catch {
      loadError = error.localizedDescription
    }
  }

  private func openDoc(_ r: TenantDocumentRow) async {
    busyId = r.id
    defer { busyId = nil }
    do {
      let data = try await MobileAPI.authorizedGETData(
        client: client,
        path: "/api/mobile/tenant-documents/\(r.id.uuidString.lowercased())/file"
      )
      let rawName = r.originalFilename?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
      let base = rawName.isEmpty ? "\(r.title)-belge" : rawName
      let url = try MobileAPI.writeDataToTempFile(data: data, suggestedName: base.sanitizedFileName)
      previewItem = PreviewSheetItem(url: url)
    } catch {
      actionError = error.localizedDescription
    }
  }

  private func deleteDoc(_ id: UUID) async {
    deleteId = nil
    do {
      try await MobileAPI.authorizedDELETEJSON(
        client: client,
        path: "/api/mobile/tenant-documents/\(id.uuidString.lowercased())"
      )
      await load()
    } catch {
      actionError = error.localizedDescription
    }
  }
}

private struct TenantDocumentUploadView: View {
  let client: SupabaseClient
  let onDone: () -> Void

  @Environment(\.dismiss) private var dismiss
  @State private var titleText = ""
  @State private var descriptionText = ""
  @State private var pickedURL: URL?
  @State private var fileImporterPresented = false
  @State private var saving = false
  @State private var errorText: String?

  var body: some View {
    Form {
      Section {
        TextField(TrStrings.Documents.fieldTitle, text: $titleText)
        TextField(TrStrings.Documents.fieldDescription, text: $descriptionText, axis: .vertical)
          .lineLimit(3...6)
      }
      Section(TrStrings.Documents.fileSection) {
        Button {
          fileImporterPresented = true
        } label: {
          if let pickedURL {
            Text(pickedURL.lastPathComponent).lineLimit(2)
          } else {
            Text(TrStrings.Documents.chooseFile)
          }
        }
      }
      if let errorText {
        Section {
          Text(errorText).foregroundStyle(.red).font(.footnote)
        }
      }
    }
    .navigationTitle(TrStrings.Documents.uploadTitle)
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .cancellationAction) {
        Button(TrStrings.Common.cancel) {
          dismiss()
        }
      }
      ToolbarItem(placement: .confirmationAction) {
        Button(TrStrings.Documents.save) {
          Task { await save() }
        }
        .disabled(saving || titleText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || pickedURL == nil)
      }
    }
    .fileImporter(
      isPresented: $fileImporterPresented,
      allowedContentTypes: [.data, .pdf, .image, .item],
      allowsMultipleSelection: false
    ) { result in
      switch result {
      case .success(let urls):
        pickedURL = urls.first
      case .failure:
        pickedURL = nil
      }
    }
  }

  private func save() async {
    let t = titleText.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !t.isEmpty, let url = pickedURL else { return }
    saving = true
    errorText = nil
    defer { saving = false }
    do {
      let accessed = url.startAccessingSecurityScopedResource()
      defer { if accessed { url.stopAccessingSecurityScopedResource() } }
      let data = try Data(contentsOf: url)
      guard !data.isEmpty else {
        errorText = TrStrings.Documents.emptyFile
        return
      }
      let fname = url.lastPathComponent
      let mime = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
      var fields: [String: String] = ["title": t]
      let desc = descriptionText.trimmingCharacters(in: .whitespacesAndNewlines)
      if !desc.isEmpty { fields["description"] = desc }

      let respData = try await MobileAPI.authorizedPOSTMultipart(
        client: client,
        path: "/api/mobile/tenant-documents",
        fields: fields,
        fileField: "file",
        fileData: data,
        fileName: fname.isEmpty ? "upload.bin" : fname,
        mimeType: mime
      )
      struct Body: Decodable { let ok: Bool?; let error: String? }
      let decoded = try JSONDecoder().decode(Body.self, from: respData)
      if decoded.ok != true {
        throw MobileAPIError.serverMessage(decoded.error ?? TrStrings.Documents.uploadFailed)
      }
      dismiss()
      onDone()
    } catch {
      errorText = error.localizedDescription
    }
  }
}

// MARK: - Arıza / iş emri oluştur

private struct AssetPickRow: Decodable, Identifiable, Hashable {
  let id: UUID
  let unitCode: String
  let siteId: UUID?
  enum CodingKeys: String, CodingKey {
    case id
    case unitCode = "unit_code"
    case siteId = "site_id"
  }
}

private struct FieldCrewRow: Decodable, Identifiable {
  let id: UUID
  let name: String
}

private struct WorkOrderOpenRow: Decodable, Identifiable {
  let id: UUID
  let number: String
  enum CodingKeys: String, CodingKey {
    case id, number
  }
}

struct WorkOrderCreateView: View {
  let client: SupabaseClient
  var presetAssetId: UUID?

  @State private var assets: [AssetPickRow] = []
  @State private var crews: [FieldCrewRow] = []
  @State private var selectedAssetId: UUID?
  @State private var faultText = ""
  @State private var workTypeBreakdown = false
  @State private var isEmergencyExtra = false
  @State private var blockingCrewId: UUID?
  @State private var loadError: String?
  @State private var loading = true
  @State private var saving = false
  @State private var resultMessage: String?
  @State private var actionError: String?

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.WorkOrderCreate.title, systemImage: "wrench.and.screwdriver", description: Text(loadError))
      } else {
        Form {
          Section(TrStrings.WorkOrderCreate.assetSection) {
            Picker(TrStrings.WorkOrderCreate.assetPicker, selection: $selectedAssetId) {
              Text(TrStrings.WorkOrderCreate.pickPlaceholder).tag(Optional<UUID>.none)
              ForEach(assets) { a in
                Text(a.unitCode).tag(Optional(a.id))
              }
            }
          }
          Section(TrStrings.WorkOrderCreate.faultSection) {
            TextField(TrStrings.WorkOrderCreate.faultPlaceholder, text: $faultText, axis: .vertical)
              .lineLimit(4...10)
          }
          Section(TrStrings.WorkOrderCreate.typeSection) {
            Toggle(TrStrings.WorkOrderCreate.emergencyBreakdown, isOn: $workTypeBreakdown)
            Toggle(TrStrings.WorkOrderCreate.markEmergency, isOn: $isEmergencyExtra)
          }
          Section(TrStrings.WorkOrderCreate.blockingSection) {
            Picker(TrStrings.WorkOrderCreate.blockingCrew, selection: $blockingCrewId) {
              Text(TrStrings.WorkOrderCreate.noCrew).tag(Optional<UUID>.none)
              ForEach(crews) { c in
                Text(c.name).tag(Optional(c.id))
              }
            }
          }
          Section {
            Button {
              Task { await submit() }
            } label: {
              if saving {
                ProgressView()
              } else {
                Text(TrStrings.WorkOrderCreate.submit)
              }
            }
            .disabled(saving || selectedAssetId == nil || faultText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
          }
        }
      }
    }
    .navigationTitle(TrStrings.WorkOrderCreate.title)
    .navigationBarTitleDisplayMode(.inline)
    .fieldTabBarScrollContentInset()
    .task { await load() }
    .alert(TrStrings.Common.errorTitle, isPresented: Binding(
      get: { actionError != nil },
      set: { if !$0 { actionError = nil } }
    )) {
      Button(TrStrings.Common.ok, role: .cancel) { actionError = nil }
    } message: {
      if let actionError { Text(actionError) }
    }
    .alert(TrStrings.WorkOrderCreate.createdTitle, isPresented: Binding(
      get: { resultMessage != nil },
      set: { if !$0 { resultMessage = nil } }
    )) {
      Button(TrStrings.Common.ok, role: .cancel) { resultMessage = nil }
    } message: {
      if let resultMessage { Text(resultMessage) }
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
      async let a: PostgrestResponse<[AssetPickRow]> = client
        .from("elevator_assets")
        .select("id, unit_code, site_id")
        .eq("tenant_id", value: tenantId)
        .order("unit_code", ascending: true)
        .limit(800)
        .execute()
      async let c: PostgrestResponse<[FieldCrewRow]> = client
        .from("field_crews")
        .select("id, name")
        .eq("tenant_id", value: tenantId)
        .order("name", ascending: true)
        .limit(200)
        .execute()
      let (ar, cr) = try await (a, c)
      assets = ar.value
      crews = cr.value
      if let presetAssetId, assets.contains(where: { $0.id == presetAssetId }) {
        selectedAssetId = presetAssetId
      }
    } catch {
      loadError = error.localizedDescription
    }
  }

  private func submit() async {
    guard let aid = selectedAssetId else { return }
    let fault = faultText.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !fault.isEmpty else { return }
    saving = true
    actionError = nil
    defer { saving = false }
    struct Body: Encodable {
      let elevator_asset_id: String
      let fault_symptom: String
      let work_type: String
      let is_emergency: Bool
      let blocking_crew_id: String?
    }
    let wt = workTypeBreakdown ? "emergency_breakdown" : "repair"
    let emerg = workTypeBreakdown || isEmergencyExtra
    let crew = blockingCrewId.map { $0.uuidString.lowercased() }
    let body = Body(
      elevator_asset_id: aid.uuidString.lowercased(),
      fault_symptom: fault,
      work_type: wt,
      is_emergency: emerg,
      blocking_crew_id: crew
    )
    do {
      let data = try await MobileAPI.authorizedPOSTJSON(client: client, path: "/api/mobile/work-orders/breakdown", body: body)
      struct R: Decodable { let ok: Bool?; let id: String?; let number: String?; let error: String? }
      let decoded = try JSONDecoder().decode(R.self, from: data)
      if decoded.ok == true, let num = decoded.number {
        resultMessage = TrStrings.WorkOrderCreate.createdBody(num)
        faultText = ""
      } else {
        actionError = decoded.error ?? TrStrings.WorkOrderCreate.failed
      }
    } catch {
      actionError = error.localizedDescription
    }
  }
}

// MARK: - Parça kullanımı kaydı

private struct StockPickRow: Decodable, Identifiable, Hashable {
  let id: UUID
  let sku: String
  let description: String
  let uom: String
}

private struct PartsLineDraft: Identifiable {
  let id = UUID()
  var stock: StockPickRow?
  var qty: String = "1"
  var unitPrice: String = "0"
}

struct PartsUsageRecordView: View {
  let client: SupabaseClient
  var presetAssetId: UUID?

  @State private var assets: [AssetPickRow] = []
  @State private var selectedAssetId: UUID?
  @State private var workType: String = "repair"
  @State private var workOrderId: UUID?
  @State private var openWorkOrders: [WorkOrderOpenRow] = []
  @State private var lines: [PartsLineDraft] = [PartsLineDraft()]
  @State private var stocks: [StockPickRow] = []
  @State private var stockSearch = ""
  @State private var loadError: String?
  @State private var loading = true
  @State private var saving = false
  @State private var resultMessage: String?
  @State private var actionError: String?
  @State private var pickingLineId: UUID?

  private var selectedAsset: AssetPickRow? {
    guard let id = selectedAssetId else { return nil }
    return assets.first { $0.id == id }
  }

  private var filteredStocks: [StockPickRow] {
    let q = stockSearch.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    if q.isEmpty { return Array(stocks.prefix(80)) }
    return stocks.filter {
      $0.sku.lowercased().contains(q) || $0.description.lowercased().contains(q)
    }.prefix(80).map { $0 }
  }

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.PartsRecord.title, systemImage: "shippingbox", description: Text(loadError))
      } else {
        Form {
          Section(TrStrings.PartsRecord.assetSection) {
            Picker(TrStrings.PartsRecord.assetPicker, selection: $selectedAssetId) {
              Text(TrStrings.WorkOrderCreate.pickPlaceholder).tag(Optional<UUID>.none)
              ForEach(assets) { a in
                Text(a.unitCode).tag(Optional(a.id))
              }
            }
            .onChange(of: selectedAssetId) { _, _ in
              Task { await loadOpenWorkOrders() }
            }
          }
          Section(TrStrings.PartsRecord.workTypeSection) {
            Picker(TrStrings.PartsRecord.workType, selection: $workType) {
              Text(TrStrings.PartsUsage.wtMaintenance).tag("maintenance")
              Text(TrStrings.PartsUsage.wtRevision).tag("revision")
              Text(TrStrings.PartsUsage.wtRepair).tag("repair")
              Text(TrStrings.PartsUsage.wtAssembly).tag("assembly")
            }
            .pickerStyle(.segmented)
          }
          Section(TrStrings.PartsRecord.workOrderSection) {
            Picker(TrStrings.PartsRecord.workOrderOptional, selection: $workOrderId) {
              Text(TrStrings.PartsRecord.noWorkOrder).tag(Optional<UUID>.none)
              ForEach(openWorkOrders) { w in
                Text(w.number).tag(Optional(w.id))
              }
            }
            .disabled(selectedAssetId == nil)
          }
          Section(TrStrings.PartsRecord.linesSection) {
            ForEach($lines) { $line in
              VStack(alignment: .leading, spacing: 8) {
                Button {
                  pickingLineId = line.id
                } label: {
                  HStack {
                    Text(line.stock?.sku ?? TrStrings.PartsRecord.pickStock)
                      .font(.headline.monospaced())
                    Spacer()
                    Image(systemName: "chevron.right").font(.caption).foregroundStyle(.secondary)
                  }
                }
                HStack {
                  TextField(TrStrings.PartsRecord.qty, text: $line.qty)
                    .keyboardType(.decimalPad)
                  TextField(TrStrings.PartsRecord.unitPrice, text: $line.unitPrice)
                    .keyboardType(.decimalPad)
                }
                .font(.subheadline)
              }
              .padding(.vertical, 4)
            }
            Button(TrStrings.PartsRecord.addLine) {
              lines.append(PartsLineDraft())
            }
            Button(TrStrings.PartsRecord.removeLastLine, role: .destructive) {
              if lines.count > 1 { lines.removeLast() }
            }
            .disabled(lines.count <= 1)
          }
          Section {
            Button {
              Task { await submit() }
            } label: {
              if saving { ProgressView() } else { Text(TrStrings.PartsRecord.submit) }
            }
            .disabled(saving || !canSubmit)
          }
        }
      }
    }
    .navigationTitle(TrStrings.PartsRecord.title)
    .navigationBarTitleDisplayMode(.inline)
    .fieldTabBarScrollContentInset()
    .task { await load() }
    .sheet(isPresented: Binding(
      get: { pickingLineId != nil },
      set: { if !$0 { pickingLineId = nil } }
    )) {
      NavigationStack {
        List(filteredStocks) { s in
          Button {
            if let pid = pickingLineId, let idx = lines.firstIndex(where: { $0.id == pid }) {
              lines[idx].stock = s
            }
            pickingLineId = nil
          } label: {
            VStack(alignment: .leading, spacing: 2) {
              Text(s.sku).font(.headline.monospaced())
              Text(s.description).font(.caption).lineLimit(2)
            }
          }
        }
        .searchable(text: $stockSearch, prompt: TrStrings.PartsRecord.searchStock)
        .navigationTitle(TrStrings.PartsRecord.pickStockTitle)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) {
            Button(TrStrings.Common.cancel) { pickingLineId = nil }
          }
        }
      }
    }
    .alert(TrStrings.Common.errorTitle, isPresented: Binding(
      get: { actionError != nil },
      set: { if !$0 { actionError = nil } }
    )) {
      Button(TrStrings.Common.ok, role: .cancel) { actionError = nil }
    } message: {
      if let actionError { Text(actionError) }
    }
    .alert(TrStrings.PartsRecord.savedTitle, isPresented: Binding(
      get: { resultMessage != nil },
      set: { if !$0 { resultMessage = nil } }
    )) {
      Button(TrStrings.Common.ok, role: .cancel) { resultMessage = nil }
    } message: {
      if let resultMessage { Text(resultMessage) }
    }
  }

  private var canSubmit: Bool {
    guard let a = selectedAsset, a.siteId != nil else { return false }
    var any = false
    for line in lines {
      guard line.stock != nil else { continue }
      let q = Double(line.qty.replacingOccurrences(of: ",", with: "."))
      let p = Double(line.unitPrice.replacingOccurrences(of: ",", with: "."))
      guard let q, let p, q > 0, p >= 0 else { return false }
      any = true
    }
    return any
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
      async let a: PostgrestResponse<[AssetPickRow]> = client
        .from("elevator_assets")
        .select("id, unit_code, site_id")
        .eq("tenant_id", value: tenantId)
        .order("unit_code", ascending: true)
        .limit(800)
        .execute()
      async let s: PostgrestResponse<[StockPickRow]> = client
        .from("stock_items")
        .select("id, sku, description, uom")
        .eq("tenant_id", value: tenantId)
        .order("sku", ascending: true)
        .limit(2000)
        .execute()
      let (ar, sr) = try await (a, s)
      assets = ar.value
      stocks = sr.value
      if let presetAssetId, assets.contains(where: { $0.id == presetAssetId }) {
        selectedAssetId = presetAssetId
      }
      await loadOpenWorkOrders()
    } catch {
      loadError = error.localizedDescription
    }
  }

  private func loadOpenWorkOrders() async {
    guard let tenantId = try? await TenantScope.firstTenantId(client: client),
          let aid = selectedAssetId
    else {
      openWorkOrders = []
      workOrderId = nil
      return
    }
    do {
      let response: PostgrestResponse<[WorkOrderOpenRow]> = try await client
        .from("work_orders")
        .select("id, number")
        .eq("tenant_id", value: tenantId)
        .eq("elevator_asset_id", value: aid)
        .not("status", operator: .eq, value: "completed")
        .not("status", operator: .eq, value: "cancelled")
        .order("created_at", ascending: false)
        .limit(40)
        .execute()
      openWorkOrders = response.value
      if let w = workOrderId, !openWorkOrders.contains(where: { $0.id == w }) {
        workOrderId = nil
      }
    } catch {
      openWorkOrders = []
    }
  }

  private func submit() async {
    guard let asset = selectedAsset, let siteId = asset.siteId else {
      actionError = TrStrings.PartsRecord.needsSite
      return
    }
    var parsed: [(String, Double, Double)] = []
    for line in lines {
      guard let st = line.stock else { continue }
      let q = Double(line.qty.replacingOccurrences(of: ",", with: "."))
      let p = Double(line.unitPrice.replacingOccurrences(of: ",", with: "."))
      guard let q, let p, q > 0 else { continue }
      parsed.append((st.id.uuidString.lowercased(), q, p))
    }
    guard !parsed.isEmpty else {
      actionError = TrStrings.PartsRecord.needLines
      return
    }
    struct LineE: Encodable {
      let stock_item_id: String
      let qty: Double
      let unit_price: Double
    }
    struct Body: Encodable {
      let elevator_asset_id: String
      let site_id: String
      let work_type: String
      let unit_code: String
      let work_order_id: String?
      let lines: [LineE]
    }
    let body = Body(
      elevator_asset_id: asset.id.uuidString.lowercased(),
      site_id: siteId.uuidString.lowercased(),
      work_type: workType,
      unit_code: asset.unitCode,
      work_order_id: workOrderId.map { $0.uuidString.lowercased() },
      lines: parsed.map { LineE(stock_item_id: $0.0, qty: $0.1, unit_price: $0.2) }
    )
    saving = true
    actionError = nil
    defer { saving = false }
    do {
      let data = try await MobileAPI.authorizedPOSTJSON(client: client, path: "/api/mobile/service-parts-usage", body: body)
      struct R: Decodable { let ok: Bool?; let batchId: String?; let error: String? }
      let decoded = try JSONDecoder().decode(R.self, from: data)
      if decoded.ok == true {
        resultMessage = TrStrings.PartsRecord.savedBody
        lines = [PartsLineDraft()]
        workOrderId = nil
        await loadOpenWorkOrders()
      } else {
        actionError = decoded.error ?? TrStrings.PartsRecord.failed
      }
    } catch {
      actionError = error.localizedDescription
    }
  }
}

// MARK: - Small helpers

private extension String {
  var sanitizedFileName: String {
    let bad = CharacterSet(charactersIn: "/\\:?%*|\"<>")
    return components(separatedBy: bad).joined(separator: "_")
  }
}
