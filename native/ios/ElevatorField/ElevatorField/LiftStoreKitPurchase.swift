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
}
