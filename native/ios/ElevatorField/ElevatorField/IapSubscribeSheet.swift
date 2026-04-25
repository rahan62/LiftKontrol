import StoreKit
import SwiftUI
import Supabase

// Web `getMarketingPricing` / `/api/public/marketing-pricing` ile aynı alanlar.
private struct MarketingPricingDTO: Codable, Equatable {
  var eyebrow: String
  var title: String
  var description: String
  var campaignBadge: String
  var packageTitle: String
  var packageSubtitle: String
  var priceMain: String
  var priceUnit: String
  var priceNote: String
  var features: [String]
  var footerNote: String

  static let fallback = MarketingPricingDTO(
    eyebrow: "Şeffaf fiyat",
    title: "Tek paket. Tüm operasyonunuz.",
    description:
      "Gizli ücret yok, kullanıcı başına ek maliyet yok. İlk yılınıza özel kampanya fiyatı ile Lift Kontrol'ü hemen kullanmaya başlayın.",
    campaignBadge: "İlk yıla özel",
    packageTitle: "Lift Kontrol — Kurumsal",
    packageSubtitle: "Yıllık lisans · tüm modüller dahil",
    priceMain: "12.000",
    priceUnit: "TL",
    priceNote: "+ KDV · peşin yıllık faturalama",
    features: [
      "Sınırsız kullanıcı ve rol bazlı yetkilendirme",
      "Müşteri, saha ve asansör varlıkları — tek merkezden",
      "Aylık bakım planlama, arıza ve iş emirleri",
      "Günlük ekip sevkı ve rota planlama",
      "Periyodik kontrol, revizyon ve teklif süreçleri",
      "Stok, depo ve finans takibi",
      "iOS saha uygulaması ve QR ile asansör sayfası",
      "Çok kiracılı, güvenli bulut altyapısı",
    ],
    footerNote:
      "Fiyat, kampanya süresi ve kurumsal ihtiyaçlar için özel koşullar hakkında bilgi almak istiyorsanız iletişime geçebilirsiniz.",
  )
}

private enum IapSubscribePalette {
  static let bgTop = Color(red: 0.06, green: 0.08, blue: 0.13)
  static let bgBottom = Color(red: 0.04, green: 0.05, blue: 0.09)
  static let amber = Color(red: 0.96, green: 0.75, blue: 0.28)
  static let cardStroke = Color.white.opacity(0.12)
  static let cardFill = Color.white.opacity(0.06)
  static let muted = Color.white.opacity(0.55)
  static let barBackground = Color(red: 0.05, green: 0.06, blue: 0.1)
}

/// Web `/fiyatlar` ile aynı pazarlama metni + App Store fiyatı; altta sabit «Abone ol» CTA.
struct IapSubscribeSheet: View {
  let client: SupabaseClient
  let onCompleted: () async -> Void

  @Environment(\.dismiss) private var dismiss

  @State private var pricing: MarketingPricingDTO = .fallback
  @State private var storeProduct: Product?
  /// `Product.products` bittiğinde `true`; aksi halde UI sonsuz spinner gösterir.
  @State private var storePriceLoadFinished = false
  @State private var companyName = ""
  @State private var email = ""
  @State private var password = ""
  @State private var busy = false
  @State private var message: String?

  private let contentMaxWidth: CGFloat = 400

  var body: some View {
    NavigationStack {
      ZStack {
        LinearGradient(
          colors: [IapSubscribePalette.bgTop, IapSubscribePalette.bgBottom],
          startPoint: .top,
          endPoint: .bottom
        )
        .ignoresSafeArea()

        ScrollView {
          VStack(alignment: .leading, spacing: 20) {
            headerBlock
            packageCard
            featuresBlock
            Text(TrStrings.Iap.sheetIntro)
              .font(.subheadline)
              .foregroundStyle(IapSubscribePalette.muted)
            accountFields
            Text(pricing.footerNote)
              .font(.caption)
              .foregroundStyle(IapSubscribePalette.muted.opacity(0.85))
              .fixedSize(horizontal: false, vertical: true)

            Color.clear.frame(height: 96)
          }
          .padding(.horizontal, 20)
          .padding(.top, 8)
          .frame(maxWidth: contentMaxWidth)
          .frame(maxWidth: .infinity)
        }
        .scrollIndicators(.visible)
      }
      .navigationTitle(TrStrings.Iap.sheetTitle)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button(TrStrings.Common.cancel) {
            dismiss()
          }
          .disabled(busy)
          .foregroundStyle(.white.opacity(0.85))
        }
      }
      .toolbarBackground(.visible, for: .navigationBar)
      .toolbarBackground(IapSubscribePalette.bgTop.opacity(0.92), for: .navigationBar)
      .toolbarColorScheme(.dark, for: .navigationBar)
      .safeAreaInset(edge: .bottom, spacing: 0) {
        bottomBar
      }
      .task {
        async let m: Void = loadMarketing()
        async let p: Void = loadStoreProduct()
        _ = await (m, p)
      }
    }
  }

  private var headerBlock: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(pricing.eyebrow.uppercased())
        .font(.caption.weight(.semibold))
        .tracking(1.2)
        .foregroundStyle(IapSubscribePalette.amber)
      Text(pricing.title)
        .font(.title2.weight(.bold))
        .foregroundStyle(.white)
      Text(pricing.description)
        .font(.body)
        .foregroundStyle(Color.white.opacity(0.72))
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var packageCard: some View {
    VStack(alignment: .leading, spacing: 16) {
      HStack {
        Text(pricing.campaignBadge.uppercased())
          .font(.caption2.weight(.bold))
          .tracking(0.6)
          .foregroundStyle(IapSubscribePalette.amber)
          .padding(.horizontal, 10)
          .padding(.vertical, 5)
          .background(
            Capsule().strokeBorder(IapSubscribePalette.amber.opacity(0.45), lineWidth: 1)
          )
        Spacer(minLength: 0)
      }

      Text(pricing.packageTitle)
        .font(.headline)
        .foregroundStyle(.white)
      Text(pricing.packageSubtitle)
        .font(.subheadline)
        .foregroundStyle(IapSubscribePalette.muted)

      VStack(alignment: .leading, spacing: 6) {
        if let p = storeProduct {
          Text(p.displayPrice)
            .font(.system(size: 40, weight: .bold, design: .rounded))
            .foregroundStyle(.white)
          Text(TrStrings.Iap.appStorePriceLabel)
            .font(.caption)
            .foregroundStyle(IapSubscribePalette.muted)
          HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(pricing.priceMain)
              .font(.subheadline.weight(.medium))
            Text(pricing.priceUnit)
              .font(.subheadline)
          }
          .foregroundStyle(IapSubscribePalette.muted.opacity(0.9))
          Text(TrStrings.Iap.referencePriceLabel)
            .font(.caption2)
            .foregroundStyle(IapSubscribePalette.muted.opacity(0.75))
        } else if !storePriceLoadFinished {
          HStack(alignment: .firstTextBaseline, spacing: 4) {
            Text(pricing.priceMain)
              .font(.system(size: 40, weight: .bold, design: .rounded))
            Text(pricing.priceUnit)
              .font(.title3.weight(.semibold))
          }
          .foregroundStyle(.white)
          Text(TrStrings.Iap.referencePriceLabel)
            .font(.caption)
            .foregroundStyle(IapSubscribePalette.muted)
          ProgressView()
            .tint(IapSubscribePalette.amber)
            .scaleEffect(0.85)
          Text(TrStrings.Iap.pricingLoadingHint)
            .font(.caption2)
            .foregroundStyle(IapSubscribePalette.muted.opacity(0.8))
        } else {
          HStack(alignment: .firstTextBaseline, spacing: 4) {
            Text(pricing.priceMain)
              .font(.system(size: 40, weight: .bold, design: .rounded))
            Text(pricing.priceUnit)
              .font(.title3.weight(.semibold))
          }
          .foregroundStyle(.white)
          Text(TrStrings.Iap.referencePriceLabel)
            .font(.caption)
            .foregroundStyle(IapSubscribePalette.muted)
          Text(TrStrings.Iap.storePriceUnavailable)
            .font(.caption2)
            .foregroundStyle(IapSubscribePalette.muted.opacity(0.85))
            .fixedSize(horizontal: false, vertical: true)
        }
        Text(pricing.priceNote)
          .font(.subheadline)
          .foregroundStyle(IapSubscribePalette.muted)
      }
    }
    .padding(18)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .fill(IapSubscribePalette.cardFill)
        .overlay(
          RoundedRectangle(cornerRadius: 16, style: .continuous)
            .strokeBorder(IapSubscribePalette.cardStroke, lineWidth: 1)
        )
    )
  }

  private var featuresBlock: some View {
    VStack(alignment: .leading, spacing: 12) {
      ForEach(Array(pricing.features.enumerated()), id: \.offset) { _, line in
        HStack(alignment: .top, spacing: 10) {
          Image(systemName: "checkmark.circle.fill")
            .font(.body)
            .foregroundStyle(IapSubscribePalette.amber)
            .accessibilityHidden(true)
          Text(line)
            .font(.subheadline)
            .foregroundStyle(Color.white.opacity(0.88))
            .fixedSize(horizontal: false, vertical: true)
        }
      }
    }
  }

  private var accountFields: some View {
    VStack(alignment: .leading, spacing: 14) {
      Text(TrStrings.Iap.accountSection)
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(.white)

      fieldLabel(TrStrings.Iap.companyName)
      TextField("", text: $companyName)
        .textContentType(.organizationName)
        .textInputAutocapitalization(.words)
        .foregroundStyle(.white)
        .padding(12)
        .background(fieldBackground)

      fieldLabel(TrStrings.Auth.email)
      TextField("", text: $email)
        .textContentType(.emailAddress)
        .keyboardType(.emailAddress)
        .textInputAutocapitalization(.never)
        .foregroundStyle(.white)
        .padding(12)
        .background(fieldBackground)

      fieldLabel(TrStrings.Auth.password)
      SecureField("", text: $password)
        .textContentType(.newPassword)
        .foregroundStyle(.white)
        .padding(12)
        .background(fieldBackground)
    }
  }

  private func fieldLabel(_ text: String) -> some View {
    Text(text)
      .font(.caption)
      .foregroundStyle(IapSubscribePalette.muted)
  }

  private var fieldBackground: some View {
    RoundedRectangle(cornerRadius: 10, style: .continuous)
      .fill(Color.white.opacity(0.08))
      .overlay(
        RoundedRectangle(cornerRadius: 10, style: .continuous)
          .strokeBorder(Color.white.opacity(0.12), lineWidth: 1)
      )
  }

  private var bottomBar: some View {
    VStack(spacing: 10) {
      if let message {
        Text(message)
          .font(.footnote)
          .foregroundStyle(Color(red: 1, green: 0.45, blue: 0.45))
          .multilineTextAlignment(.center)
          .frame(maxWidth: .infinity)
      }
      Button {
        Task { await purchaseAndRegister() }
      } label: {
        Group {
          if busy {
            ProgressView()
              .tint(.white)
          } else {
            Text(TrStrings.Iap.subscribe)
              .font(.headline)
          }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(
          RoundedRectangle(cornerRadius: 12, style: .continuous)
            .fill(canSubmit && !busy ? IapSubscribePalette.amber : IapSubscribePalette.amber.opacity(0.35))
        )
        .foregroundStyle(Color(red: 0.12, green: 0.1, blue: 0.06))
      }
      .buttonStyle(.plain)
      .disabled(!canSubmit || busy)
      Text(TrStrings.Iap.purchaseAndRegister)
        .font(.caption2)
        .foregroundStyle(IapSubscribePalette.muted)
        .multilineTextAlignment(.center)
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 12)
    .frame(maxWidth: .infinity)
    .background(
      IapSubscribePalette.barBackground
        .shadow(color: .black.opacity(0.35), radius: 12, y: -4)
    )
  }

  private var canSubmit: Bool {
    !companyName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      && !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      && password.count >= 8
  }

  private func loadMarketing() async {
    guard let base = AppConfig.publicAppWebBaseURL?.trimmingCharacters(in: .whitespacesAndNewlines),
      let url = URL(string: base + "/api/public/marketing-pricing")
    else { return }
    do {
      let (data, response) = try await URLSession.shared.data(from: url)
      guard let http = response as? HTTPURLResponse, (200 ... 299).contains(http.statusCode) else { return }
      let decoded = try JSONDecoder().decode(MarketingPricingDTO.self, from: data)
      pricing = decoded
    } catch {
      pricing = .fallback
    }
  }

  private func loadStoreProduct() async {
    storePriceLoadFinished = false
    defer { storePriceLoadFinished = true }
    do {
      storeProduct = try await LiftStoreKitPurchase.loadSubscriptionProduct()
    } catch {
      storeProduct = nil
    }
  }

  private func purchaseAndRegister() async {
    busy = true
    message = nil
    defer { busy = false }

    guard let base = AppConfig.publicAppWebBaseURL, let api = URL(string: base + "/api/billing/apple/register-tenant") else {
      message = TrStrings.Iap.apiBaseMissing
      return
    }

    do {
      let product = try await LiftStoreKitPurchase.loadSubscriptionProduct()
      let transactionId = try await LiftStoreKitPurchase.purchase(product)

      var req = URLRequest(url: api)
      req.httpMethod = "POST"
      req.setValue("application/json", forHTTPHeaderField: "Content-Type")
      let payload: [String: String] = [
        "transactionId": transactionId,
        "companyName": companyName.trimmingCharacters(in: .whitespacesAndNewlines),
        "email": email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
        "password": password,
      ]
      req.httpBody = try JSONSerialization.data(withJSONObject: payload)

      let (data, response) = try await URLSession.shared.data(for: req)
      let status = (response as? HTTPURLResponse)?.statusCode ?? 0
      let decoded = try JSONDecoder().decode(RegisterTenantResponse.self, from: data)

      if !decoded.ok {
        if decoded.code == "EMAIL_EXISTS" {
          message = TrStrings.Iap.emailExists
        } else if decoded.code == "SUBSCRIPTION_ALREADY_USED" {
          message = TrStrings.Iap.subscriptionUsed
        } else {
          message = decoded.error ?? TrStrings.Iap.registerFailed
        }
        return
      }

      guard (200 ... 299).contains(status) else {
        message = decoded.error ?? TrStrings.Iap.registerFailed
        return
      }

      try await client.auth.signIn(
        email: email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
        password: password
      )
      dismiss()
      await onCompleted()
    } catch let e as LiftPurchaseError {
      message = e.localizedDescription
    } catch {
      message = "\(TrStrings.Iap.registerFailed): \(error.localizedDescription)"
    }
  }
}

private struct RegisterTenantResponse: Decodable {
  let ok: Bool
  let error: String?
  let code: String?
}
