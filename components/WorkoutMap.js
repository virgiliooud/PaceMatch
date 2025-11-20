import { MapContainer, TileLayer, Polyline, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function WorkoutMap({ route }) {
  if (!route || route.length === 0) return null;

  // Centraliza o mapa no primeiro ponto do percurso
  const center = [route[0].lat, route[0].lng];

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
        {/* Linha conectando todos os waypoints */}
        <Polyline
          positions={route.map((p) => [p.lat, p.lng])}
          color="#00c6ff"
          weight={5}
          opacity={0.7}
        />

        {/* Destaca início em verde */}
        <CircleMarker
          center={[route[0].lat, route[0].lng]}
          radius={10}
          pathOptions={{ color: "green", fillColor: "green", fillOpacity: 1 }}
        />
        {/* Destaca final em vermelho */}
        <CircleMarker
          center={[route[route.length - 1].lat, route[route.length - 1].lng]}
          radius={10}
          pathOptions={{ color: "red", fillColor: "red", fillOpacity: 1 }}
        />
      </MapContainer>
    </div>
  );
}
