import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents, Popup } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";

if (typeof window !== "undefined") {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

export default function MapCreator({ route = [], onRouteChange, singlePoint = false }) {
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const [distance, setDistance] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijk2MjE3OWE5YjI3MjRlMzVhNWYxNGU2MTNjMjJkNWNhIiwiaCI6Im11cm11cjY0In0=";

  // CALCULA ROTA APENAS NO MODO MAPA E COM +2 PONTOS
  useEffect(() => {
    if (!singlePoint && route.length >= 2) {
      calculateRoute(route);
    } else {
      setRouteGeoJSON(null);
      setDistance(0);
    }
  }, [route, singlePoint]);

  const calculateRoute = async (points) => {
    if (points.length < 2 || singlePoint) {
      setRouteGeoJSON(null);
      setDistance(0);
      return;
    }

    setCalculating(true);
    try {
      const coords = points.map(p => [p.lng, p.lat]);
      const body = { 
        coordinates: coords,
        instructions: false
      };
      
      console.log("📍 Calculando rota com pontos:", points.length);
      
      const res = await axios.post(
        "https://api.openrouteservice.org/v2/directions/foot-walking/geojson",
        body,
        {
          headers: {
            Authorization: ORS_API_KEY,
            "Content-Type": "application/json",
          },
          timeout: 10000
        }
      );
      
      if (res.data && res.data.features && res.data.features[0]) {
        setRouteGeoJSON(res.data);
        const dist_km = res.data.features[0].properties.summary.distance / 1000;
        setDistance(dist_km);
        
        console.log("✅ Rota calculada:", dist_km.toFixed(2), "km");
        
        // ATUALIZA O PAI COM A DISTÂNCIA
        if (onRouteChange) {
          onRouteChange(route, dist_km);
        }
      }
    } catch (err) {
      console.error("❌ Erro ao calcular rota:", err.response?.data || err.message);
      setRouteGeoJSON(null);
      setDistance(0);
      
      // FALLBACK: calcula distância aproximada se a API falhar
      if (route.length >= 2 && onRouteChange) {
        const approxDistance = calculateApproximateDistance(route);
        setDistance(approxDistance);
        onRouteChange(route, approxDistance);
      }
    } finally {
      setCalculating(false);
    }
  };

  // CALCULA DISTÂNCIA APROXIMADA (FALLBACK)
  const calculateApproximateDistance = (points) => {
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const dist = calculateHaversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
      totalDistance += dist;
    }
    return totalDistance;
  };

  // FÓRMULA HAVERSINE PARA DISTÂNCIA ENTRE DOIS PONTOS
  const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleRemoveWaypoint = (removeIdx) => {
    const newRoute = route.filter((_, idx) => idx !== removeIdx);
    if (onRouteChange) {
      if (singlePoint) {
        onRouteChange([], 0);
      } else {
        onRouteChange(newRoute, distance);
      }
    }
  };

  function MapClickHandler() {
    useMapEvents({
      click(e) {
        if (singlePoint) {
          // MODO PONTO ÚNICO: substitui sempre
          const newRoute = [e.latlng];
          if (onRouteChange) onRouteChange(newRoute, 0);
        } else {
          // MODO ROTA: adiciona ponto
          const newRoute = [...route, e.latlng];
          if (onRouteChange) onRouteChange(newRoute, distance);
        }
      },
    });
    return null;
  }

  if (!isClient) {
    return (
      <div style={{ 
        height: "350px", 
        width: "100%", 
        background: "#333", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "#fff",
        borderRadius: "8px",
        marginBottom: 20
      }}>
        Carregando mapa...
      </div>
    );
  }

  const hasRoute = route.length > 0;
  const centerPoint = hasRoute ? [route[0].lat, route[0].lng] : [-27.5954, -48.548];

  return (
    <div style={{ height: "350px", width: "100%", marginBottom: 20, position: "relative" }}>
      
      {/* LOADING OVERLAY */}
      {calculating && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          color: "white",
          fontSize: "16px"
        }}>
          🗺️ Calculando rota...
        </div>
      )}

      <MapContainer
        center={centerPoint}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
        />
        <MapClickHandler />

        {/* RENDERIZA POLYLINE APENAS NO MODO MAPA COM +2 PONTOS */}
        {!singlePoint && routeGeoJSON && route.length >= 2 && (
          <Polyline
            positions={routeGeoJSON.features[0].geometry.coordinates.map((c) => [c[1], c[0]])}
            color="#00c6ff"
            weight={5}
            opacity={0.7}
          />
        )}

        {/* FALLBACK: POLYLINE SIMPLES SE API FALHAR */}
        {!singlePoint && !routeGeoJSON && route.length >= 2 && (
          <Polyline
            positions={route.map(point => [point.lat, point.lng])}
            color="#ff4444"
            weight={3}
            opacity={0.7}
            dashArray="5, 5"
          />
        )}

        {/* MARCADORES */}
        {route.map((point, idx) => (
          <Marker
            key={`marker-${idx}-${point.lat}-${point.lng}`}
            position={[point.lat, point.lng]}
            eventHandlers={{
              click: () => handleRemoveWaypoint(idx)
            }}
          >
            <Popup>
              <div style={{ textAlign: 'center', minWidth: '150px' }}>
                <strong>
                  {singlePoint ? "📍 Ponto de Início" : 
                   idx === 0 ? "🏁 Início" :
                   idx === route.length - 1 ? "🎯 Final" :
                   `📍 Ponto ${idx + 1}`}
                </strong>
                <br />
                Lat: {point.lat.toFixed(6)}
                <br />
                Lng: {point.lng.toFixed(6)}
                <br />
                <button 
                  onClick={() => handleRemoveWaypoint(idx)}
                  style={{
                    background: '#ff4444',
                    color: 'white',
                    border: 'none',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    marginTop: '8px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {singlePoint ? "Remover" : "Remover Ponto"}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* STATUS DA ROTA */}
      <div style={{
        position: "absolute",
        top: "10px",
        left: "10px",
        background: "rgba(255,255,255,0.9)",
        padding: "8px 12px",
        borderRadius: "6px",
        fontSize: "12px",
        zIndex: 500,
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
      }}>
        {singlePoint ? (
          <>📍 Modo: <strong>Ponto Único</strong> | Pontos: {route.length}</>
        ) : (
          <>🗺️ Modo: <strong>Rota Completa</strong> | Pontos: {route.length} | Dist: {distance.toFixed(2)}km</>
        )}
      </div>
    </div>
  );
}