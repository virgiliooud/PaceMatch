import { MapContainer, TileLayer, Polyline, useMapEvents } from "react-leaflet";
import { useState } from "react";
import axios from "axios";
import "leaflet/dist/leaflet.css";

export default function MapCreator({ onRouteChange }) {
  const [waypoints, setWaypoints] = useState([]);
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const [distance, setDistance] = useState(0);

  const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijk2MjE3OWE5YjI3MjRlMzVhNWYxNGU2MTNjMjJkNWNhIiwiaCI6Im11cm11cjY0In0=";

  const calculateRoute = async (points) => {
    if (points.length < 2) {
      setRouteGeoJSON(null);
      setDistance(0);
      if (onRouteChange) onRouteChange(points, 0);
      return;
    }
    try {
      const coords = points.map(p => [p.lng, p.lat]);
      const body = { coordinates: coords };
      const res = await axios.post(
        "https://api.openrouteservice.org/v2/directions/foot-walking/geojson",
        body,
        {
          headers: {
            Authorization: `Bearer ${ORS_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      setRouteGeoJSON(res.data);
      const dist_km = res.data.features[0].properties.summary.distance / 1000;
      setDistance(dist_km);

      // Transformar coordenadas GeoJSON (lng, lat) em array {lat, lng} para o callback
      const detailedRoute = res.data.features[0].geometry.coordinates.map(
        ([lng, lat]) => ({ lat, lng })
      );

      if (onRouteChange) onRouteChange(detailedRoute, dist_km);
    } catch (err) {
      setRouteGeoJSON(null);
      setDistance(0);
      console.error("Erro ORS:", err.response ? err.response.data : err.message);
    }
  };

  function ClickHandler() {
    useMapEvents({
      click(e) {
        setWaypoints((prev) => {
          const newPoints = [...prev, e.latlng];
          calculateRoute(newPoints);
          return newPoints;
        });
      },
    });
    return null;
  }

  const removeWaypoint = (index) => {
    const newWaypoints = [...waypoints];
    newWaypoints.splice(index, 1);
    setWaypoints(newWaypoints);
    calculateRoute(newWaypoints);
  };

  return (
    <div style={{ height: "350px", width: "100%", marginBottom: 20 }}>
      <MapContainer center={[-27.5954, -48.548]} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
        />
        <ClickHandler />
        {/* Removido o bloco do Marker. Não exibe mais ícones! */}
        {routeGeoJSON && (
          <Polyline
            positions={routeGeoJSON.features[0].geometry.coordinates.map((c) => [c[1], c[0]])}
            color="#00c6ff"
          />
        )}
      </MapContainer>
      <p style={{ color: "#fff", fontWeight: 500, marginTop: 8 }}>Distância: {distance.toFixed(2)} km</p>
    </div>
  );
}
