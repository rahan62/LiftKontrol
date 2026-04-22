import AVFoundation
import SwiftUI
import Supabase
import UIKit

/// Ana kabuk: web `appNavItems` ile aynı rotalar. Menü `NavigationSplitView` yerine sheet + `Button` satırları —
/// iPad simülatörü / trackpad ortamında split sidebar’ın dokunmayı yutması sorununu önler.
struct MainShellView: View {
  let client: SupabaseClient
  let onSignOut: () async -> Void

  @State private var selected: AppRoute?
  @State private var menuPresented = false
  @State private var qrPresented = false
  @State private var navPath = NavigationPath()
  @State private var access: WorkspaceAccess = .admin

  private static let dashboard = AppRoute.sidebar[0]

  private var siteTabRoute: AppRoute {
    AppRoute.sidebar.first(where: { $0.webPath == "/app/sites" })
      ?? AppRoute(webPath: "/app/sites", title: "Saha / Binalar", systemImage: "mappin.and.ellipse")
  }

  private var assetsTabRoute: AppRoute {
    AppRoute.sidebar.first(where: { $0.webPath == "/app/assets" })
      ?? AppRoute(webPath: "/app/assets", title: "Asansörler", systemImage: "building.2")
  }

  private var scheduleTabRoute: AppRoute {
    AppRoute.sidebar.first(where: { $0.webPath == "/app/schedule" })
      ?? AppRoute(webPath: "/app/schedule", title: "Program / Sevkiyat", systemImage: "truck.box")
  }

  /// Alt tab çubuğunun ilk sekmesi: yönetici → Panel, teknisyen → Program.
  private var leadTabRoute: AppRoute {
    switch access {
    case .admin:
      return Self.dashboard
    case .technician:
      return scheduleTabRoute
    }
  }

  private var sidebarRoutes: [AppRoute] {
    AppRoute.sidebar.filter { access.includes(route: $0) }
  }

  /// Üst menü satırları; teknisyende sabit sıra ve sadece saha–asansör–bakım–program–iş emri.
  private var menuPrimarySectionRoutes: [AppRoute] {
    switch access {
    case .admin:
      return sidebarRoutes
    case .technician:
      return WorkspaceAccess.technicianPrimaryMenuPaths.compactMap { path in
        AppRoute.sidebar.first { $0.webPath == path }
      }
    }
  }

  private var additionalRoutes: [AppRoute] {
    AppRoute.additional.filter { access.includes(route: $0) }
  }

  private var nestedRoutes: [AppRoute] {
    AppRoute.nestedExamples.filter { access.includes(route: $0) }
  }

  var body: some View {
    NavigationStack(path: $navPath) {
      detailView(for: selected ?? leadTabRoute)
        .navigationDestination(for: UUID.self) { id in
          AssetDetailView(client: client, assetId: id)
        }
    }
    .safeAreaInset(edge: .bottom, spacing: FieldTabBarChrome.insetSpacingAboveBar) {
      FieldQuickTabBar(
        selectedWebPath: selected?.webPath ?? leadTabRoute.webPath,
        leadWebPath: leadTabRoute.webPath,
        leadTitle: access == .admin ? TrStrings.Tabs.dashboard : TrStrings.Tabs.program,
        leadSystemImage: access == .admin ? "rectangle.split.2x1" : "truck.box",
        onLeadTab: { selectRoute(leadTabRoute) },
        onSites: { selectRoute(siteTabRoute) },
        onScan: { qrPresented = true },
        onAssets: { selectRoute(assetsTabRoute) },
        onMenu: { menuPresented = true }
      )
    }
    .fullScreenCover(isPresented: $qrPresented) {
      ElevatorQrScanScreen(
        onAssetId: { id in
          qrPresented = false
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
            navPath.append(id)
          }
        },
        onDismiss: { qrPresented = false }
      )
    }
    .sheet(isPresented: $menuPresented) {
      menuSheet
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
    .task {
      await loadAccess()
    }
  }

  private func selectRoute(_ route: AppRoute) {
    guard access.includes(route: route) else { return }
    if selected?.webPath == route.webPath {
      navPath = NavigationPath()
      return
    }
    navPath = NavigationPath()
    selected = route
  }

  private var menuSheet: some View {
    NavigationStack {
      List {
        Section(TrStrings.Layout.menuSection) {
          ForEach(menuPrimarySectionRoutes) { route in
            menuRow(route)
          }
        }
        if access == .admin, !additionalRoutes.isEmpty {
          Section(TrStrings.Layout.otherSection) {
            ForEach(additionalRoutes) { route in
              menuRow(route)
            }
          }
        }
        if access == .admin, !nestedRoutes.isEmpty {
          Section(TrStrings.Layout.detailFormsSection) {
            ForEach(nestedRoutes) { route in
              menuRow(route)
            }
          }
        }
        Section(TrStrings.Layout.sessionSection) {
          Button(role: .destructive) {
            menuPresented = false
            Task { await onSignOut() }
          } label: {
            Label(TrStrings.Auth.signOut, systemImage: "rectangle.portrait.and.arrow.right")
          }
        }
      }
      .navigationTitle(TrStrings.Brand.appName)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button(TrStrings.Common.cancel) {
            menuPresented = false
          }
        }
      }
    }
  }

  @ViewBuilder
  private func menuRow(_ route: AppRoute) -> some View {
    let isCurrent = selected?.webPath == route.webPath
    Button {
      selected = route
      menuPresented = false
      navPath = NavigationPath()
    } label: {
      Label(route.title, systemImage: route.systemImage)
        .foregroundStyle(isCurrent ? Color.accentColor : Color.primary)
    }
    .buttonStyle(.plain)
  }

  private func loadAccess() async {
    do {
      let roles = try await TenantScope.myActiveSystemRoles(client: client)
      let next = WorkspaceAccess.resolve(systemRoles: roles)
      access = next
      let home: AppRoute = switch next {
      case .admin:
        Self.dashboard
      case .technician:
        scheduleTabRoute
      }
      if let sel = selected, next.includes(route: sel) {
        return
      }
      selected = home
    } catch {
      // Ağ / oturum hatasında tam menü vermeyelim.
      access = .technician
      if let sel = selected, access.includes(route: sel) {
        return
      }
      selected = scheduleTabRoute
    }
  }

  @ViewBuilder
  private func detailView(for route: AppRoute) -> some View {
    Group {
      switch route.webPath {
      case "/app":
        WorkspaceDashboardView(
          client: client,
          access: access,
          onNavigate: { path in
            if let r = AppRoute.allNavigableRoutes.first(where: { $0.webPath == path }) {
              selectRoute(r)
            }
          }
        )
      case "/app/onboarding":
        OnboardingView()
      case "/app/customers":
        CustomersListView(client: client)
      case "/app/customers/new":
        CustomerCreateView(client: client)
      case "/app/sites":
        SitesListView(client: client)
      case "/app/sites/new":
        SiteCreateView(client: client)
      case "/app/assets":
        AssetsListView(client: client)
      case "/app/assets/new":
        AssetCreateView(client: client)
      case "/app/maintenance":
        MaintenanceMonthView(client: client)
      case "/app/stock":
        StockListView(client: client)
      case "/app/maintenance/parts":
        PartsUsageListView(client: client)
      case "/app/schedule":
        ScheduleRoutePlanView(client: client)
      case "/app/schedule/clusters":
        ScheduleClustersView(client: client)
      case "/app/revision-articles":
        RevisionArticlesListView(client: client)
      case "/app/periodic-controls":
        PeriodicControlsListView(client: client)
      case "/app/revisions":
        ElevatorRevisionsListView(client: client)
      case "/app/work-orders":
        WorkOrdersListView(client: client)
      case "/app/contracts":
        ContractsListView(client: client)
      case "/app/contracts/new":
        ContractCreateView(client: client)
      case "/app/documents":
        TenantDocumentsListView(client: client)
      case "/app/work-orders/new":
        WorkOrderCreateView(client: client)
      case "/app/callbacks":
        CallbacksListView(client: client)
      case "/app/finances":
        FinancesListView(client: client)
      default:
        ModulePlaceholderView(route: route)
      }
    }
  }
}

// MARK: - QR payload (web `parseElevatorAssetIdFromScan` ile aynı mantık)

private enum ElevatorQrPayload {
  static func assetId(from raw: String) -> UUID? {
    let pattern = #"/app/assets/([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})"#
    guard let re = try? NSRegularExpression(pattern: pattern),
          let m = re.firstMatch(in: raw, range: NSRange(raw.startIndex..., in: raw)),
          let r = Range(m.range(at: 1), in: raw)
    else { return nil }
    let idStr = String(raw[r]).lowercased()
    return UUID(uuidString: idStr)
  }
}

// MARK: - AVFoundation scanner

private final class ElevatorQrScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
  var onCode: ((String) -> Void)?
  private let session = AVCaptureSession()
  private var previewLayer: AVCaptureVideoPreviewLayer?
  private var didEmit = false

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .black
    configureSession()
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    previewLayer?.frame = view.bounds
  }

  private func configureSession() {
    guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
          let input = try? AVCaptureDeviceInput(device: device),
          session.canAddInput(input)
    else { return }

    session.beginConfiguration()
    session.sessionPreset = .high
    session.addInput(input)

    let output = AVCaptureMetadataOutput()
    guard session.canAddOutput(output) else {
      session.commitConfiguration()
      return
    }
    session.addOutput(output)
    output.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
    output.metadataObjectTypes = [.qr]

    let layer = AVCaptureVideoPreviewLayer(session: session)
    layer.videoGravity = .resizeAspectFill
    layer.frame = view.bounds
    view.layer.insertSublayer(layer, at: 0)
    previewLayer = layer

    session.commitConfiguration()

    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      self?.session.startRunning()
    }
  }

  func metadataOutput(
    _ output: AVCaptureMetadataOutput,
    didOutput metadataObjects: [AVMetadataObject],
    from connection: AVCaptureConnection
  ) {
    guard !didEmit,
          let obj = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
          obj.type == .qr,
          let s = obj.stringValue
    else { return }
    didEmit = true
    session.stopRunning()
    onCode?(s)
  }
}

private struct ElevatorQrScannerRepresentable: UIViewControllerRepresentable {
  let onCode: (String) -> Void

  func makeUIViewController(context: Context) -> ElevatorQrScannerViewController {
    let vc = ElevatorQrScannerViewController()
    vc.onCode = onCode
    return vc
  }

  func updateUIViewController(_ uiViewController: ElevatorQrScannerViewController, context: Context) {}
}

// MARK: - Full-screen QR flow (kamera + yapıştır)

private struct ElevatorQrScanScreen: View {
  let onAssetId: (UUID) -> Void
  let onDismiss: () -> Void

  @State private var pasteText = ""
  @State private var banner: String?

  var body: some View {
    NavigationStack {
      ZStack(alignment: .bottom) {
        FieldTheme.scannerBackground
          .ignoresSafeArea()

        ElevatorQrScannerRepresentable { raw in
          handleRaw(raw)
        }
        .ignoresSafeArea()

        VStack(spacing: 0) {
          pasteCard
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 12)
      }
      .navigationTitle(TrStrings.Layout.qrScanTitle)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button(TrStrings.Common.cancel) { onDismiss() }
        }
      }
    }
    .preferredColorScheme(.dark)
  }

  private var pasteCard: some View {
    VStack(alignment: .leading, spacing: 10) {
      if let banner {
        Text(banner)
          .font(.footnote)
          .foregroundStyle(FieldTheme.pasteWarningForeground)
          .padding(10)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(FieldTheme.pasteWarningBackground)
          .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
      }

      Text(TrStrings.Layout.qrScanPasteHint)
        .font(.caption)
        .foregroundStyle(.secondary)

      TextField("https://…/app/assets/…", text: $pasteText, axis: .vertical)
        .textFieldStyle(.plain)
        .lineLimit(3...5)
        .padding(12)
        .background(FieldTheme.pasteFieldBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
          RoundedRectangle(cornerRadius: 12, style: .continuous)
            .strokeBorder(FieldTheme.pasteFieldStroke, lineWidth: 1)
        )

      Button {
        handleRaw(pasteText)
      } label: {
        Text(TrStrings.Layout.qrScanOpenPasted)
          .font(.subheadline.weight(.semibold))
          .frame(maxWidth: .infinity)
          .padding(.vertical, 12)
      }
      .buttonStyle(.borderedProminent)
      .tint(FieldTheme.primaryAction)
    }
    .padding(16)
    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .strokeBorder(FieldTheme.cardStroke, lineWidth: 1)
    )
  }

  private func handleRaw(_ raw: String) {
    if let id = ElevatorQrPayload.assetId(from: raw) {
      banner = nil
      onAssetId(id)
      return
    }
    banner = TrStrings.Layout.qrScanInvalid
  }
}

// MARK: - Colors (web slate / sade çizgi)

private enum FieldTheme {
  static let scannerBackground = Color(red: 0.07, green: 0.09, blue: 0.15)

  static var pasteFieldBackground: Color {
    Color(uiColor: UIColor { tc in
      tc.userInterfaceStyle == .dark ? UIColor(white: 0.12, alpha: 1) : UIColor(white: 1, alpha: 1)
    })
  }

  static var pasteFieldStroke: Color {
    Color(uiColor: UIColor { tc in
      tc.userInterfaceStyle == .dark ? UIColor(white: 1, alpha: 0.12) : UIColor(red: 0.88, green: 0.89, blue: 0.92, alpha: 1)
    })
  }

  static var cardStroke: Color {
    Color(uiColor: UIColor { tc in
      tc.userInterfaceStyle == .dark ? UIColor(white: 1, alpha: 0.10) : UIColor(red: 0.88, green: 0.89, blue: 0.92, alpha: 1)
    })
  }

  static let pasteWarningBackground = Color(red: 0.42, green: 0.30, blue: 0.05).opacity(0.35)
  static let pasteWarningForeground = Color(red: 1, green: 0.92, blue: 0.75)

  static let primaryAction = Color(red: 0.12, green: 0.16, blue: 0.23)

  static var barBackground: Color {
    Color(uiColor: UIColor { tc in
      tc.userInterfaceStyle == .dark
        ? UIColor(red: 0.07, green: 0.09, blue: 0.15, alpha: 0.94)
        : UIColor(red: 1, green: 1, blue: 1, alpha: 0.94)
    })
  }

  static var barTopDivider: Color {
    Color(uiColor: UIColor { tc in
      tc.userInterfaceStyle == .dark ? UIColor(white: 1, alpha: 0.10) : UIColor(red: 0.88, green: 0.89, blue: 0.92, alpha: 1)
    })
  }

  static var tabMuted: Color {
    Color(uiColor: UIColor { tc in
      tc.userInterfaceStyle == .dark ? UIColor(white: 1, alpha: 0.45) : UIColor(red: 0.45, green: 0.48, blue: 0.53, alpha: 1)
    })
  }

  static var tabSelected: Color {
    Color(uiColor: UIColor { tc in
      tc.userInterfaceStyle == .dark ? UIColor(white: 1, alpha: 0.95) : UIColor(red: 0.12, green: 0.16, blue: 0.23, alpha: 1)
    })
  }

  static var centerOuterRing: Color {
    Color(uiColor: UIColor { tc in
      tc.userInterfaceStyle == .dark ? UIColor(red: 0.07, green: 0.09, blue: 0.15, alpha: 1) : UIColor.white
    })
  }

  static var centerButtonFill: Color {
    Color(uiColor: UIColor { tc in
      tc.userInterfaceStyle == .dark ? UIColor.white : UIColor(red: 0.12, green: 0.16, blue: 0.23, alpha: 1)
    })
  }

  static var centerIcon: Color {
    Color(uiColor: UIColor { tc in
      tc.userInterfaceStyle == .dark ? UIColor(red: 0.12, green: 0.16, blue: 0.23, alpha: 1) : UIColor.white
    })
  }
}

// MARK: - Alt tab çubuğu (5: Panel veya Program · Sahalar · QR · Asansörler · Menü)

private struct FieldQuickTabBar: View {
  let selectedWebPath: String
  let leadWebPath: String
  let leadTitle: String
  let leadSystemImage: String
  let onLeadTab: () -> Void
  let onSites: () -> Void
  let onScan: () -> Void
  let onAssets: () -> Void
  let onMenu: () -> Void

  /// `\.safeAreaInsets` ortam anahtarı tüm hedef SDK’larda yok; ev göstergesi için pencere inset’i.
  private var windowSafeBottom: CGFloat {
    guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene else { return 0 }
    return scene.windows.first { $0.isKeyWindow }?.safeAreaInsets.bottom
      ?? scene.windows.first?.safeAreaInsets.bottom
      ?? 0
  }

  var body: some View {
    HStack(alignment: .bottom, spacing: 0) {
      tabItem(
        icon: leadSystemImage,
        title: leadTitle,
        selected: selectedWebPath == leadWebPath,
        action: onLeadTab
      )
      tabItem(
        icon: "mappin.and.ellipse",
        title: TrStrings.Tabs.sites,
        selected: selectedWebPath == "/app/sites",
        action: onSites
      )
      centerScanButton
      tabItem(
        icon: "building.2",
        title: TrStrings.Tabs.assets,
        selected: selectedWebPath == "/app/assets",
        action: onAssets
      )
      tabItem(
        icon: "line.3.horizontal",
        title: TrStrings.Tabs.menu,
        selected: false,
        action: onMenu
      )
    }
    .padding(.horizontal, 4)
    .padding(.top, 6)
    .padding(.bottom, max(8, windowSafeBottom))
    .background(FieldTheme.barBackground)
    .overlay(alignment: .top) {
      FieldTheme.barTopDivider.frame(height: 1)
    }
    .accessibilityElement(children: .contain)
  }

  private func tabItem(icon: String, title: String, selected: Bool, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      VStack(spacing: 3) {
        Image(systemName: icon)
          .font(.system(size: 20, weight: .medium))
          .symbolRenderingMode(.hierarchical)
        Text(title)
          .font(.system(size: 10, weight: .medium))
          .lineLimit(2)
          .multilineTextAlignment(.center)
          .minimumScaleFactor(0.85)
      }
      .frame(maxWidth: .infinity)
      .padding(.bottom, 2)
      .foregroundStyle(selected ? FieldTheme.tabSelected : FieldTheme.tabMuted)
    }
    .buttonStyle(.plain)
  }

  private var centerScanButton: some View {
    Button(action: onScan) {
      VStack(spacing: 4) {
        ZStack {
          Circle()
            .fill(FieldTheme.centerOuterRing)
            .frame(width: 64, height: 64)
            .shadow(color: .black.opacity(0.18), radius: 8, y: 3)
          Circle()
            .fill(FieldTheme.centerButtonFill)
            .frame(width: 54, height: 54)
          Image(systemName: "qrcode.viewfinder")
            .font(.system(size: 26, weight: .semibold))
            .foregroundStyle(FieldTheme.centerIcon)
        }
        .offset(y: -14)
        Text(TrStrings.Tabs.qrScan)
          .font(.system(size: 10, weight: .semibold))
          .foregroundStyle(FieldTheme.tabSelected)
          .offset(y: -10)
      }
      .frame(width: 76)
    }
    .buttonStyle(.plain)
    .accessibilityLabel(TrStrings.Tabs.qrScan)
  }
}
