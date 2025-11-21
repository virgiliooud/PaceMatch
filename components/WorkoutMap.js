import { MapContainer, TileLayer, Polyline, CircleMarker, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function WorkoutMap({ route = [], showWaypoints = false }) {
  const fallbackCenter = [-23.55, -46.63];

  // Se route for objeto GeoJSON, extrai primeiro ponto para centralizar
  let center = fallbackCenter;
  if (Array.isArray(route) && route.length > 0) {
    center = [route[0].lat, route[0].lng];
  } else if (route?.type === "FeatureCollection") {
    const coords = route.features[0].geometry.coordinates;
    center = [coords[0][1], coords[0][0]]; // [lat, lng]
  }

  const hasRoute = (Array.isArray(route) && route.length > 0) || (route?.type === "FeatureCollection");

  return (
    <div style={{
      height: "300px",
      width: "100%",
      maxWidth: "600px",
      margin: "20px auto",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    }}>
      <MapContainer style={{ height: "100%", width: "100%" }} center={center} zoom={15} scrollWheelZoom>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
        />

        {hasRoute && (
          <>
            {/* Se for GeoJSON, usa GeoJSON para desenhar a rota com curvas */}
            {route?.type === "FeatureCollection" ? (
              <GeoJSON data={route} style={{ color: "#00c6ff", weight: 5, opacity: 0.7 }} />
            ) : (
              /* Se for array simples de pontos, desenha polilinha reta */
              <Polyline positions={route.map((p) => [p.lat, p.lng])} color="#00c6ff" weight={5} opacity={0.7} />
            )}

            {/* Começo em verde */}
            <CircleMarker
              center={Array.isArray(route) ? [route[0].lat, route[0].lng] : center}
              radius={10}
              pathOptions={{ color: "green", fillColor: "green", fillOpacity: 1 }}
            />
            {/* Final em vermelho */}
            <CircleMarker
              center={
                Array.isArray(route)
                  ? [route[route.length - 1].lat, route[route.length - 1].lng]
                  : [route.features[0].geometry.coordinates.slice(-1)[0][1], route.features[0].geometry.coordinates.slice(-1)[0][0]]
              }
              radius={10}
              pathOptions={{ color: "red", fillColor: "red", fillOpacity: 1 }}
            />

            {/* Waypoints intermediários, só para array de pontos */}
            {showWaypoints && Array.isArray(route) &&
              route.slice(1, -1).map((point, idx) => (
                <CircleMarker
                  key={idx}
                  center={[point.lat, point.lng]}
                  radius={7}
                  pathOptions={{ color: "#6200ea", fillColor: "#6200ea", fillOpacity: 0.7 }}
                />
              ))}
          </>
        )}
      </MapContainer>
    </div>
  );
}
