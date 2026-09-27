export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteStop extends LatLng {
  id: string;
  title: string;
  subtitle: string;
}

/** Khoảng cách đường chim bay giữa 2 điểm (km), công thức haversine. */
export function distanceKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function pathLength(start: LatLng, stops: LatLng[]) {
  let total = 0;
  let prev = start;
  for (const s of stops) {
    total += distanceKm(prev, s);
    prev = s;
  }
  return total;
}

/**
 * Sắp thứ tự ghé các thùng cho quãng đường ngắn:
 * 1. Láng giềng gần nhất: từ điểm xuất phát, luôn đi tới thùng gần nhất chưa ghé.
 * 2. Cải thiện 2-opt: thử đảo ngược từng đoạn, đoạn nào làm tổng đường ngắn đi thì giữ.
 * Với vài chục thùng thì chạy tức thì và thường gần tối ưu.
 */
export function optimizeRoute<T extends LatLng>(start: LatLng, stops: T[]): { order: T[]; totalKm: number } {
  const remaining = [...stops];
  const order: T[] = [];
  let current: LatLng = start;
  while (remaining.length > 0) {
    let nearest = 0;
    for (let i = 1; i < remaining.length; i++) {
      if (distanceKm(current, remaining[i]) < distanceKm(current, remaining[nearest])) nearest = i;
    }
    current = remaining.splice(nearest, 1)[0];
    order.push(current as T);
  }

  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < order.length - 1; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const candidate = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
        if (pathLength(start, candidate) + 1e-9 < pathLength(start, order)) {
          order.splice(0, order.length, ...candidate);
          improved = true;
        }
      }
    }
  }

  return { order, totalKm: pathLength(start, order) };
}

/**
 * Không có vị trí xuất phát: thử lần lượt bắt đầu từ mỗi thùng, lấy lộ trình
 * ngắn nhất (thùng đầu tiên chính là điểm xuất phát).
 */
export function optimizeRouteFromAnyStop<T extends LatLng>(stops: T[]): { start: T; order: T[]; totalKm: number } {
  let best: { start: T; order: T[]; totalKm: number } | null = null;
  for (const first of stops) {
    const rest = stops.filter((s) => s !== first);
    const { order, totalKm } = optimizeRoute(first, rest);
    if (!best || totalKm < best.totalKm) best = { start: first, order: [first, ...order], totalKm };
  }
  return best!;
}

/** Link Google Maps chỉ đường lần lượt qua các điểm (đi bộ/xe đẩy thu gom). */
export function googleMapsRouteUrl(start: LatLng, order: LatLng[]) {
  const fmt = (p: LatLng) => `${p.lat},${p.lng}`;
  const destination = order[order.length - 1];
  const waypoints = order.slice(0, -1).map(fmt).join('|');
  return (
    `https://www.google.com/maps/dir/?api=1&origin=${fmt(start)}&destination=${fmt(destination)}` +
    (waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : '') +
    '&travelmode=walking'
  );
}

/** Trang Leaflet: điểm xuất phát, các thùng đánh số theo thứ tự và đường nối. */
export function buildRouteMapHtml(start: LatLng, order: RouteStop[]) {
  const data = JSON.stringify({ start, order }).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; background: #F7F8F5; }
      .stop { width: 26px; height: 26px; border-radius: 50%; background: #16a34a; color: #fff;
              font: bold 13px sans-serif; display: flex; align-items: center; justify-content: center;
              border: 2px solid #fff; box-shadow: 0 0 3px rgba(0,0,0,0.4); }
      .start { width: 16px; height: 16px; border-radius: 50%; background: #2563eb; border: 3px solid #fff;
               box-shadow: 0 0 3px rgba(0,0,0,0.5); }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      var d = ${data};
      var map = L.map('map', { zoomControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      var points = [[d.start.lat, d.start.lng]];
      L.marker([d.start.lat, d.start.lng], {
        icon: L.divIcon({ className: '', html: '<div class="start"></div>', iconSize: [16, 16] }),
      }).addTo(map).bindPopup('<b>Điểm xuất phát</b>');
      d.order.forEach(function (s, i) {
        points.push([s.lat, s.lng]);
        L.marker([s.lat, s.lng], {
          icon: L.divIcon({ className: '', html: '<div class="stop">' + (i + 1) + '</div>', iconSize: [26, 26] }),
        }).addTo(map).bindPopup('<b>' + (i + 1) + '. ' + s.title + '</b>' + s.subtitle);
      });
      L.polyline(points, { color: '#16a34a', weight: 4, opacity: 0.8, dashArray: '8 6' }).addTo(map);
      map.fitBounds(points, { padding: [40, 40] });
    </script>
  </body>
</html>`;
}
