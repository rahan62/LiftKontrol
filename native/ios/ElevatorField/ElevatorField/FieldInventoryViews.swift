import SwiftUI
import Supabase

// MARK: - Stok kalemleri + depo miktarları

struct StockListView: View {
  let client: SupabaseClient

  @State private var rows: [StockItemListDTO] = []
  @State private var loadError: String?
  @State private var loading = true

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.Stock.title, systemImage: "shippingbox", description: Text(loadError))
      } else if rows.isEmpty {
        ContentUnavailableView(
          TrStrings.Stock.title,
          systemImage: "shippingbox",
          description: Text(TrStrings.Stock.empty)
        )
      } else {
        List(rows) { r in
          NavigationLink {
            StockItemDetailView(row: r)
          } label: {
            VStack(alignment: .leading, spacing: 4) {
              Text(r.sku).font(.headline.monospaced())
              Text(r.description).font(.subheadline).lineLimit(2)
              HStack {
                Text(TrStrings.Stock.onHandTotal(r.totalOnHand))
                  .font(.caption)
                  .foregroundStyle(r.isLowStock ? .orange : .secondary)
                Spacer()
                Text(r.uom).font(.caption2).foregroundStyle(.tertiary)
              }
            }
          }
        }
      }
    }
    .navigationTitle(TrStrings.Stock.title)
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
      let response: PostgrestResponse<[StockItemListDTO]> = try await client
        .from("stock_items")
        .select("""
          id,
          sku,
          description,
          uom,
          min_qty,
          max_qty,
          subsystem,
          part_category,
          manufacturer,
          oem_part_number,
          stock_balances(id, qty_on_hand, qty_reserved, stock_locations(name))
        """)
        .eq("tenant_id", value: tenantId)
        .order("sku", ascending: true)
        .limit(400)
        .execute()
      rows = response.value
    } catch {
      loadError = error.localizedDescription
    }
  }
}

private struct StockItemListDTO: Decodable, Identifiable {
  let id: UUID
  let sku: String
  let description: String
  let uom: String
  let minQty: Double?
  let maxQty: Double?
  let subsystem: String?
  let partCategory: String?
  let manufacturer: String?
  let oemPartNumber: String?
  let stockBalances: [BalanceEmbed]?

  enum CodingKeys: String, CodingKey {
    case id, sku, description, uom, subsystem, manufacturer
    case minQty = "min_qty"
    case maxQty = "max_qty"
    case partCategory = "part_category"
    case oemPartNumber = "oem_part_number"
    case stockBalances = "stock_balances"
  }

  var totalOnHand: Double {
    (stockBalances ?? []).reduce(0) { $0 + $1.qtyOnHand }
  }

  var isLowStock: Bool {
    guard let min = minQty, min > 0 else { return false }
    return totalOnHand < min
  }
}

private struct BalanceEmbed: Decodable, Identifiable {
  let id: UUID
  let qtyOnHand: Double
  let qtyReserved: Double?
  let stockLocations: LocName?

  enum CodingKeys: String, CodingKey {
    case id
    case qtyOnHand = "qty_on_hand"
    case qtyReserved = "qty_reserved"
    case stockLocations = "stock_locations"
  }

  struct LocName: Decodable {
    let name: String?
  }
}

private struct StockItemDetailView: View {
  let row: StockItemListDTO

  var body: some View {
    List {
      Section(TrStrings.Stock.sku) {
        Text(row.sku).monospaced()
      }
      Section(TrStrings.Stock.descriptionCol) {
        Text(row.description)
      }
      Section(TrStrings.Stock.minMax) {
        Text("\(fmtQty(row.minQty)) / \(fmtQty(row.maxQty))")
      }
      if let sub = row.subsystem, !sub.isEmpty {
        Section(TrStrings.Stock.subsystem) {
          Text(sub)
        }
      }
      if let c = row.partCategory, !c.isEmpty {
        Section(TrStrings.Stock.category) {
          Text(c)
        }
      }
      if let m = row.manufacturer, !m.isEmpty {
        Section(TrStrings.Stock.manufacturer) {
          Text(m)
        }
      }
      if let o = row.oemPartNumber, !o.isEmpty {
        Section(TrStrings.Stock.oem) {
          Text(o).monospaced()
        }
      }
      Section(TrStrings.Stock.balancesSection) {
        let balances = row.stockBalances ?? []
        if balances.isEmpty {
          Text(TrStrings.Stock.noBalances).foregroundStyle(.secondary)
        } else {
          ForEach(balances) { b in
            HStack {
              Text(b.stockLocations?.name ?? TrStrings.Stock.unknownLocation)
              Spacer()
              VStack(alignment: .trailing, spacing: 2) {
                Text(String(format: "%.2f %@", b.qtyOnHand, row.uom)).font(.caption.monospaced())
                if let r = b.qtyReserved, r > 0 {
                  Text(String(format: TrStrings.Stock.reservedFmt, r)).font(.caption2).foregroundStyle(.orange)
                }
              }
            }
          }
        }
      }
      Section {
        Text(TrStrings.Stock.detailHint)
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
    .navigationTitle(row.sku)
    .navigationBarTitleDisplayMode(.inline)
    .fieldTabBarScrollContentInset()
  }

  private func fmtQty(_ v: Double?) -> String {
    guard let v else { return "—" }
    return String(format: "%.2f", v)
  }
}

// MARK: - Parça kullanımı geçmişi (salt okuma; çıkış web’de)

struct PartsUsageListView: View {
  let client: SupabaseClient
  /// When set, list is limited to this elevator (e.g. from asset detail).
  var filterElevatorAssetId: UUID? = nil

  @State private var rows: [PartsUsageRowDTO] = []
  @State private var loadError: String?
  @State private var loading = true

  var body: some View {
    Group {
      if loading {
        ProgressView(TrStrings.Common.loading)
      } else if let loadError {
        ContentUnavailableView(TrStrings.PartsUsage.title, systemImage: "wrench.adjustable", description: Text(loadError))
      } else if rows.isEmpty {
        ContentUnavailableView(
          TrStrings.PartsUsage.title,
          systemImage: "wrench.adjustable",
          description: Text(TrStrings.PartsUsage.empty)
        )
      } else {
        List(rows) { r in
          VStack(alignment: .leading, spacing: 4) {
            HStack {
              Text(r.unitCode).font(.headline.monospaced())
              Spacer()
              Text(r.workTypeLabel).font(.caption2).padding(.horizontal, 6).padding(.vertical, 2)
                .background(.ultraThinMaterial).clipShape(RoundedRectangle(cornerRadius: 4))
            }
            Text("\(r.sku) · \(r.stockDescription)").font(.subheadline).lineLimit(2)
            HStack {
              Text(String(format: TrStrings.PartsUsage.qtyFmt, r.qty, r.unitPrice)).font(.caption.monospaced())
              Spacer()
              Text(String(r.createdAt.prefix(16)).replacingOccurrences(of: "T", with: " "))
                .font(.caption2)
                .foregroundStyle(.tertiary)
            }
            if r.workOrderId != nil {
              Text(TrStrings.PartsUsage.linkedWorkOrder).font(.caption2).foregroundStyle(.secondary)
            }
          }
          .padding(.vertical, 2)
        }
      }
    }
    .navigationTitle(filterElevatorAssetId == nil ? TrStrings.PartsUsage.title : TrStrings.PartsUsage.titleFiltered)
    .toolbar {
      ToolbarItem(placement: .primaryAction) {
        NavigationLink {
          PartsUsageRecordView(client: client, presetAssetId: filterElevatorAssetId)
        } label: {
          Image(systemName: "plus")
        }
      }
    }
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
      var q = client
        .from("service_parts_usage")
        .select("""
          id,
          created_at,
          qty,
          unit_price,
          work_type,
          batch_id,
          work_order_id,
          elevator_assets(unit_code),
          stock_items(sku, description, uom)
        """)
        .eq("tenant_id", value: tenantId)
      if let aid = filterElevatorAssetId {
        q = q.eq("elevator_asset_id", value: aid)
      }
      let response: PostgrestResponse<[PartsUsageRowDTO]> = try await q
        .order("created_at", ascending: false)
        .limit(filterElevatorAssetId == nil ? 120 : 80)
        .execute()
      rows = response.value
    } catch {
      loadError = error.localizedDescription
    }
  }
}

private struct PartsUsageRowDTO: Decodable, Identifiable {
  let id: UUID
  let createdAt: String
  let qty: Double
  let unitPrice: Double
  let workType: String
  let batchId: UUID
  let workOrderId: UUID?
  let elevatorAssets: UnitEmbed?
  let stockItems: StockEmbed?

  enum CodingKeys: String, CodingKey {
    case id
    case createdAt = "created_at"
    case qty
    case unitPrice = "unit_price"
    case workType = "work_type"
    case batchId = "batch_id"
    case workOrderId = "work_order_id"
    case elevatorAssets = "elevator_assets"
    case stockItems = "stock_items"
  }

  struct UnitEmbed: Decodable {
    let unitCode: String
    enum CodingKeys: String, CodingKey {
      case unitCode = "unit_code"
    }
  }

  struct StockEmbed: Decodable {
    let sku: String
    let description: String
    let uom: String
  }

  var unitCode: String { elevatorAssets?.unitCode ?? "—" }
  var sku: String { stockItems?.sku ?? "—" }
  var stockDescription: String { stockItems?.description ?? "—" }

  var workTypeLabel: String {
    switch workType {
    case "maintenance": return TrStrings.PartsUsage.wtMaintenance
    case "revision": return TrStrings.PartsUsage.wtRevision
    case "repair": return TrStrings.PartsUsage.wtRepair
    case "assembly": return TrStrings.PartsUsage.wtAssembly
    default: return workType
    }
  }
}

extension TrStrings {
  enum Stock {
    static let title = "Stok / Envanter"
    static let empty = "Henüz stok kalemi yok. Web’den «Yeni stok kalemi» ile ekleyin."
    static let sku = "SKU"
    static let descriptionCol = "Açıklama"
    static let subsystem = "Alt sistem"
    static let category = "Kategori"
    static let manufacturer = "Üretici"
    static let oem = "OEM kod"
    static let minMax = "Min / max"
    static let balancesSection = "Depo miktarları"
    static let noBalances = "Bakiye satırı yok."
    static let unknownLocation = "Konum"
    static let reservedFmt = "Rezerv: %.2f"
    static func onHandTotal(_ q: Double) -> String {
      String(format: "Elde: %.2f", q)
    }

    static let detailHint = "Yeni kalem, çıkış ve düzeltmeler web uygulamasındaki Stok modülünden yapılır."
  }

  enum PartsUsage {
    static let title = "Parça kullanımı"
    static let titleFiltered = "Parça kullanımı · ünite"
    static let empty = "Henüz parça çıkışı yok. «+» ile mobilde kayıt oluşturabilir veya web formunu kullanabilirsiniz."
    static let qtyFmt = "%.2f ad. × %.2f TRY"
    static let linkedWorkOrder = "İş emrine bağlı"
    static let wtMaintenance = "Bakım"
    static let wtRevision = "Revizyon"
    static let wtRepair = "Onarım"
    static let wtAssembly = "Montaj"
  }
}
