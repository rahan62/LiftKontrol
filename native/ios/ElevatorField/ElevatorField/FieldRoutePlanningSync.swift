import Foundation
import MapKit
import Supabase

/// Web `POST /api/mobile/recompute-route-clusters` — mobilde doğrudan Supabase insert sonrası küme tablosunu doldurur.
enum FieldRoutePlanningSync {
  static func triggerClusterRecompute(client: SupabaseClient) async {
    guard let base = AppConfig.publicAppWebBaseURL,
          let url = URL(string: "\(base)/api/mobile/recompute-route-clusters") else { return }
    guard let session = try? await client.auth.session else { return }
    var req = URLRequest(url: url)
    req.httpMethod = "POST"
    req.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    req.httpBody = Data("{}".utf8)
    _ = try? await URLSession.shared.data(for: req)
  }
}

/// Sıralı duraklar için Apple Haritalar sürüş yönlendirmesi (her durak ayrı işaret).
enum AppleMapsDrivingRouteOpener {
  static func openDrivingRoute(stops: [(lat: Double, lng: Double, title: String)]) {
    let items: [MKMapItem] = stops.compactMap { s in
      guard s.lat >= -90, s.lat <= 90, s.lng >= -180, s.lng <= 180 else { return nil }
      let coord = CLLocationCoordinate2D(latitude: s.lat, longitude: s.lng)
      let placemark = MKPlacemark(coordinate: coord)
      let item = MKMapItem(placemark: placemark)
      item.name = s.title
      return item
    }
    guard !items.isEmpty else { return }
    MKMapItem.openMaps(
      with: items,
      launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving]
    )
  }
}
