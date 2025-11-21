{route.map((point, idx) => (
  <CircleMarker
    key={`marker_${idx}_${point.lat}_${point.lng}`}
    center={[point.lat, point.lng]}
    radius={10}
    pathOptions={{
      color: idx === 0 ? "green" : idx === route.length - 1 ? "red" : "#6200ea",
      fillColor: idx === 0 ? "green" : idx === route.length - 1 ? "red" : "#6200ea",
      fillOpacity: 1
    }}
    onClick={() => handleRemoveWaypoint(idx)}
  />
))}
