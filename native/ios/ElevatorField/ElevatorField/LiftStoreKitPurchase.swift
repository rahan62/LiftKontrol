import Foundation
import StoreKit

enum LiftPurchaseError: LocalizedError {
  case misconfiguredProduct
  case productNotFound
  case cancelled
  case pending
  case unknown

  var errorDescription: String? {
    switch self {
    case .misconfiguredProduct:
      return TrStrings.Iap.misconfiguredProduct
    case .productNotFound:
      return TrStrings.Iap.productNotFound
    case .cancelled:
      return TrStrings.Iap.purchaseCancelled
    case .pending:
      return TrStrings.Iap.purchasePending
    case .unknown:
      return TrStrings.Iap.purchaseUnknown
    }
  }
}

/// Result of syncing with App Store and inspecting subscription state for `IAP_PRODUCT_ID`.
enum RestoreSubscriptionOutcome: Equatable {
  /// `Transaction.currentEntitlements` contains a verified transaction for our product (or equivalent via latest).
  case activeEntitlementFound
  /// İşlem geçmişi var ama artık geçerli erişim yok (yanlış zamanlama için `Transaction.latest` ile tekrar işaretlendi).
  case inactivePriorPurchase
  /// Bu ürün kimliği için bu Apple kimliğiyle kayıtlı işlem bulunmadı — farklı Apple hesabı, sandbox/canlı uyumsuzluğu veya hiç App Store ödemesi yok.
  case noMatchingPurchaseFound
}

@MainActor
enum LiftStoreKitPurchase {
  static var productId: String {
    (Bundle.main.object(forInfoDictionaryKey: "IAP_PRODUCT_ID") as? String)?
      .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
  }

  static func loadSubscriptionProduct() async throws -> Product {
    let id = productId
    guard !id.isEmpty, !id.contains("REPLACE_ME") else {
      throw LiftPurchaseError.misconfiguredProduct
    }
    let products = try await Product.products(for: [id])
    guard let first = products.first else {
      throw LiftPurchaseError.productNotFound
    }
    return first
  }

  /// Tamamlanmış işlem kimliği (`transaction.id`) — sunucu App Store Server API ile doğrular.
  static func purchase(_ product: Product) async throws -> String {
    let result = try await product.purchase()
    switch result {
    case .success(let verification):
      let transaction = try checkVerified(verification)
      let rawId = transaction.id
      await transaction.finish()
      return String(rawId)
    case .userCancelled:
      throw LiftPurchaseError.cancelled
    case .pending:
      throw LiftPurchaseError.pending
    @unknown default:
      throw LiftPurchaseError.unknown
    }
  }

  private static func checkVerified(_ result: VerificationResult<Transaction>) throws -> Transaction {
    switch result {
    case .unverified(_, let error):
      throw error
    case .verified(let safe):
      return safe
    }
  }

  /// Calls `AppStore.sync()` then inspects entitlements (`Transaction.currentEntitlements`) for `IAP_PRODUCT_ID`.
  /// If listed entitlements miss the product (gecikme, önbellek), non-revoked `Transaction.latest(for:)` ve süresi dolmamışsa yine başarılı sayılır.
  /// App access stays tied to Supabase login; callers should instruct the user to sign in after a successful restore.
  /// - Throws on misconfigured product id or StoreKit sync failure.
  static func restoreSubscriptionEntitlements() async throws -> RestoreSubscriptionOutcome {
    let id = productId
    guard !id.isEmpty, !id.contains("REPLACE_ME") else {
      throw LiftPurchaseError.misconfiguredProduct
    }
    try await AppStore.sync()

    for await verification in Transaction.currentEntitlements {
      guard case .verified(let transaction) = verification else { continue }
      if transaction.productID == id {
        return .activeEntitlementFound
      }
    }

    if let latestVerification = await Transaction.latest(for: id) {
      switch latestVerification {
      case .verified(let transaction):
        if transaction.revocationDate != nil {
          return .inactivePriorPurchase
        }
        let now = Date()
        if let expires = transaction.expirationDate {
          return expires >= now ? .activeEntitlementFound : .inactivePriorPurchase
        }
        // Non-subscription / beklenmedik süre bilgisi yok — en son işlem doğrulanmış ise erişimi var sayın.
        return .activeEntitlementFound
      case .unverified:
        break
      }
    }

    return .noMatchingPurchaseFound
  }
}
