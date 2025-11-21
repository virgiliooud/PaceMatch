import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents, Popup } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";

// Corrige o bug de marker padrão sumido no Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function MapCreator({ route = [], onRouteChange }) {
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const [distance, setDistance] = useState(0);

  const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijk2MjE3OWE5YjI3MjRlMzVhNWYxNGU2MTNjMjJkNWNhIiwiaCI6Im11cm11cjY0In0=";

  useEffect(() => {
    if (route.length < 2) {
      setRouteGeoJSON(null);
      setDistance(0);
      return;
    }
    calculateRoute(route);
    // eslint-disable-next-line
  }, [route]);

  const calculateRoute = async (points) => {
    if (points.length < 2) {
      setRouteGeoJSON(null);
      setDistance(0);
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
    } catch (err) {
      setRouteGeoJSON(null);
      setDistance(0);
      console.error("Erro ORS:", err);
    }
  };

  const handleRemoveWaypoint = (removeIdx) => {
    const newRoute = route.filter((_, idx) => idx !== removeIdx);
    if (onRouteChange) onRouteChange(newRoute, distance);
  };

  function MapClickHandler() {
    useMapEvents({
      click(e) {
        const newRoute = [...route, e.latlng];
        if (onRouteChange) onRouteChange(newRoute, distance);
      },
    });
    return null;
  }

  const hasRoute = route.length > 0;

  return (
    <div style={{ height: "350px", width: "100%", marginBottom: 20 }}>
      <MapContainer
        center={hasRoute ? [route[0].lat, route[0].lng] : [-27.5954, -48.548]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
        />
        <MapClickHandler />

        {/* Polyline primeiro */}
        {routeGeoJSON && (
          <Polyline
            positions={routeGeoJSON.features[0].geometry.coordinates.map((c) => [c[1], c[0]])}
            color="#00c6ff"
            weight={5}
            opacity={0.7}
          />
        )}

        {/* One Marker for each waypoint */}
        {route.map((point, idx) => (
          <Marker
            key={`wp-marker-${idx}`}
            position={[point.lat, point.lng]}
            eventHandlers={{
              click: () => handleRemoveWaypoint(idx)
            }}
          >
            <Popup>
              Clique para remover este ponto!<br />
              {idx === 0
                ? "Início"
                : idx === route.length - 1
                ? "Final"
                : `Waypoint ${idx + 1}`}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <p style={{ color: "#fff", fontWeight: 500, marginTop: 8 }}>
        Pontos na rota: {route.length} <br />
        Distância: {distance.toFixed(2)} km
      </p>
      <small style={{ color: "#aaa" }}>
        &#9432; Clique no mapa para adicionar pontos. Clique em qualquer marcador para REMOVER.
      </small>
    </div>
  );
}
