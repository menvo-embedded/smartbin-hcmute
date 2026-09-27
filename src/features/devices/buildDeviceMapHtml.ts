export interface DeviceMapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  /** Màu chấm tròn trên bản đồ — hex, ví dụ '#16a34a'. */
  color: string;
}

/**
 * Dựng trang HTML nhúng Leaflet + OpenStreetMap để hiển thị trong WebView.
 * Dùng OSM thay vì Google Maps để không cần API key / tài khoản thanh toán.
 * Sau khi tải, gọi `window.updateMarkers(markers)` (injectJavaScript) để
 * cập nhật marker mà không dựng lại trang.
 */
export function buildDeviceMapHtml(markers: DeviceMapMarker[], center: { lat: number; lng: number }): string {
  const markersJson = JSON.stringify(markers).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; background: #F7F8F5; }
      .device-pin { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 3px rgba(0,0,0,0.4); }
      .leaflet-popup-content b { display: block; margin-bottom: 2px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      var map = L.map('map', { zoomControl: false }).setView([${center.lat}, ${center.lng}], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      function pinIcon(color) {
        return L.divIcon({
          className: '',
          html: '<div class="device-pin" style="background:' + color + ';"></div>',
          iconSize: [18, 18],
        });
      }

      // Giữ marker theo id để app cập nhật màu/nội dung tại chỗ (realtime)
      // qua window.updateMarkers, không phải tải lại cả bản đồ.
      var byId = {};
      window.updateMarkers = function (list) {
        list.forEach(function (m) {
          var popup = '<b>' + m.title + '</b>' + m.subtitle;
          if (byId[m.id]) {
            byId[m.id].setIcon(pinIcon(m.color)).setPopupContent(popup);
          } else {
            byId[m.id] = L.marker([m.lat, m.lng], { icon: pinIcon(m.color) }).addTo(map).bindPopup(popup);
          }
        });
      };
      window.updateMarkers(${markersJson});
    </script>
  </body>
</html>`;
}
