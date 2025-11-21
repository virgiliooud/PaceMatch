import { MapContainer, TileLayer, Polyline, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

/**
 * @param {Object[]} route - Array de pontos [{lat, lng}]
 * @param {boolean} showWaypoints - Se true, exibe os waypoints intermediários
 */
export default function WorkoutMap({ route = [], showWaypoints = false }) {
  // Cidade padrão para centralizar caso route esteja vazio (ex: São Paulo)
  const fallbackCenter = [-23.55, -46.63];

  const hasRoute = Array.isArray(route) && route.length > 0;
  const center = hasRoute ? [route[0].lat, route[0].lng] : fallbackCenter;

  return (
    <div
      style={{
        height: "300px",
        width: "100%",
        maxWidth: "600px",
        margin: "20px auto",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      <MapContainer
        style={{ height: "100%", width: "100%" }}
        center={center}
        zoom={15}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
        />
        {hasRoute && (
          <>
            {/* Linha conectando todos os waypoints */}
            <Polyline
              positions={route.map((p) => [p.lat, p.lng])}
              color="#00c6ff"
              weight={5}
              opacity={0.7}
            />

            {/* Início em verde */}
            <CircleMarker
              center={[route[0].lat, route[0].lng]}
              radius={10}
              pathOptions={{ color: "green", fillColor: "green", fillOpacity: 1 }}
            />
            {/* Final em vermelho */}
            <CircleMarker
              center={[route[route.length - 1].lat, route[route.length - 1].lng]}
              radius={10}
              pathOptions={{ color: "red", fillColor: "red", fillOpacity: 1 }}
            />

            {/* Waypoints intermediários (apenas se showWaypoints for true) */}
            {showWaypoints &&
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
