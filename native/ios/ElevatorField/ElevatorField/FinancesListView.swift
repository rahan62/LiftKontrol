import SwiftUI
import Supabase

struct FinancesListView: View {
  let client: SupabaseClient

  @State private var rows: [FinanceListRowDTO] = []
  @State private var loadError: String?
  @State private var loading = true

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.Finances.listTitle, systemImage: "banknote", description: Text(loadError))
      } else if rows.isEmpty {
        ContentUnavailableView(
          TrStrings.Finances.listTitle,
          systemImage: "banknote",
          description: Text(TrStrings.Finances.noEntries)
        )
      } else {
        List(rows) { row in
          VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
              Text(row.scopeLabel)
                .font(.subheadline)
                .foregroundStyle(.primary)
              Spacer()
              paymentBadge(row.paymentStatus)
            }
            HStack {
              Text(TrStrings.Finances.entryTypeLabel(row.entryType))
                .font(.caption)
                .foregroundStyle(.secondary)
              Spacer()
              Text(row.occurredOnDisplay)
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            Text(row.label)
              .font(.body)
            Text(row.amountLine)
              .font(.caption.monospacedDigit())
              .foregroundStyle(.secondary)
          }
          .padding(.vertical, 4)
        }
      }
    }
    .navigationTitle(TrStrings.Finances.listTitle)
    .fieldTabBarScrollContentInset()
    .task { await load() }
  }

  @ViewBuilder
  private func paymentBadge(_ status: String) -> some View {
    if status == "paid" {
      Text(TrStrings.Common.paid)
        .font(.caption2.weight(.medium))
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.green.opacity(0.18))
        .clipShape(Capsule())
    } else {
      Text(TrStrings.Common.unpaid)
        .font(.caption2.weight(.medium))
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.orange.opacity(0.2))
        .clipShape(Capsule())
    }
  }

  private func load() async {
    loading = true
    loadError = nil
    defer { loading = false }
    do {
      guard let tenantId = try await TenantScope.firstTenantId(client: client) else {
        rows = []
        return
      }
      let response: PostgrestResponse<[FinanceListRowDTO]> = try await client
        .from("finance_entries")
        .select(
          """
          id, site_id, elevator_asset_id, entry_type, amount, currency, label, occurred_on, payment_status,
          sites(name),
          elevator_assets(unit_code, sites(name))
          """
        )
        .eq("tenant_id", value: tenantId)
        .order("occurred_on", ascending: false)
        .limit(120)
        .execute()
      rows = response.value
    } catch {
      loadError = error.localizedDescription
      rows = []
    }
  }
}

private struct FinanceListRowDTO: Decodable, Identifiable {
  let id: UUID
  let siteId: UUID?
  let elevatorAssetId: UUID?
  let entryType: String
  let currency: String
  let label: String
  let occurredOnRaw: String
  let paymentStatus: String
  let amountValue: Double
  let sites: SiteNameOnly?
  let elevatorAssets: ElevatorAssetScope?

  struct SiteNameOnly: Decodable {
    let name: String?
  }

  struct ElevatorAssetScope: Decodable {
    let unitCode: String?
    let sites: SiteNameOnly?

    enum CodingKeys: String, CodingKey {
      case unitCode = "unit_code"
      case sites
    }
  }

  enum CodingKeys: String, CodingKey {
    case id
    case siteId = "site_id"
    case elevatorAssetId = "elevator_asset_id"
    case entryType = "entry_type"
    case currency, label
    case occurredOn = "occurred_on"
    case paymentStatus = "payment_status"
    case amount
    case sites
    case elevatorAssets = "elevator_assets"
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id = try c.decode(UUID.self, forKey: .id)
    siteId = try c.decodeIfPresent(UUID.self, forKey: .siteId)
    elevatorAssetId = try c.decodeIfPresent(UUID.self, forKey: .elevatorAssetId)
    entryType = try c.decode(String.self, forKey: .entryType)
    currency = try c.decode(String.self, forKey: .currency)
    label = try c.decode(String.self, forKey: .label)
    paymentStatus = try c.decode(String.self, forKey: .paymentStatus)
    sites = try c.decodeIfPresent(SiteNameOnly.self, forKey: .sites)
    elevatorAssets = try c.decodeIfPresent(ElevatorAssetScope.self, forKey: .elevatorAssets)
    if let d = try? c.decode(Double.self, forKey: .amount) {
      amountValue = d
    } else if let s = try? c.decode(String.self, forKey: .amount),
      let d = Double(s.replacingOccurrences(of: ",", with: ".")) {
      amountValue = d
    } else {
      amountValue = 0
    }
    if let s = try? c.decode(String.self, forKey: .occurredOn) {
      occurredOnRaw = s
    } else {
      occurredOnRaw = ""
    }
  }

  var occurredOnDisplay: String {
    String(occurredOnRaw.prefix(10))
  }

  var amountLine: String {
    let f = NumberFormatter()
    f.locale = Locale(identifier: "tr_TR")
    f.minimumFractionDigits = 2
    f.maximumFractionDigits = 2
    f.numberStyle = .decimal
    let num = f.string(from: NSNumber(value: amountValue)) ?? String(amountValue)
    return "\(num) \(currency)"
  }

  /// Web `finance_entries.scope_label` ile aynı mantık.
  var scopeLabel: String {
    if let name = sites?.name, !name.isEmpty {
      return name
    }
    if let ea = elevatorAssets {
      let unit = (ea.unitCode?.isEmpty == false) ? ea.unitCode! : "Ünite"
      let siteName = (ea.sites?.name?.isEmpty == false) ? ea.sites!.name! : "Saha"
      return "\(unit) · \(siteName)"
    }
    return "—"
  }
}
