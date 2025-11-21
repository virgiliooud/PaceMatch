import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import {
  doc, getDoc, updateDoc, arrayUnion, arrayRemove,
  collection, query, where, getDocs, Timestamp,
} from "firebase/firestore";
import styles from "../../styles/WorkoutPage.module.css";
import axios from "axios";
import dynamic from "next/dynamic";

// Importação dinâmica dos componentes da react-leaflet para funcionar no Next.js SSR
const MapContainer = dynamic(
  () => import("react-leaflet").then(mod => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then(mod => mod.TileLayer),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then(mod => mod.Polyline),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then(mod => mod.CircleMarker),
  { ssr: false }
);

const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijk2MjE3OWE5YjI3MjRlMzVhNWYxNGU2MTNjMjJkNWNhIiwiaCI6Im11cm11cjY0In0=";

// Componente detalhado do mapa, só mostra início/fim
function DetailedRouteMap({ route }) {
  const [polyline, setPolyline] = useState([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => { setMapReady(true); }, []);
  useEffect(() => {
    async function fetchDetailedRoute() {
      if (!route || route.length < 2) {
        setPolyline([]);
        return;
      }
      try {
        const coords = route.map(p => [p.lng, p.lat]);
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
        const poly = res.data.features[0].geometry.coordinates.map(
          ([lng, lat]) => [lat, lng]
        );
        setPolyline(poly);
      } catch (err) {
        setPolyline([]);
        console.error("Erro ORS:", err?.response?.data || err);
      }
    }
    fetchDetailedRoute();
  }, [route]);

  const hasRoute = route && route.length > 0;
  const center = hasRoute ? [route[0].lat, route[0].lng] : [-27.5954, -48.548];

  if (!mapReady) {
    return (
      <div style={{
        height: "350px", width: "100%", background: "#f0f0f0",
        display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px"
      }}>
        <p>Carregando mapa...</p>
      </div>
    );
  }

  return (
    <div style={{ height: "350px", width: "100%", margin: "30px 0" }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
        />
        {polyline.length > 1 && (
          <Polyline
            positions={polyline}
            color="#00c6ff"
            weight={5}
            opacity={0.8}
          />
        )}
        {/* Início em verde */}
        {hasRoute && (
          <CircleMarker
            center={[route[0].lat, route[0].lng]}
            radius={10}
            pathOptions={{ color: "green", fillColor: "green", fillOpacity: 1, weight: 3 }}
          />
        )}
        {/* Final em vermelho */}
        {hasRoute && route.length > 1 && (
          <CircleMarker
            center={[route[route.length - 1].lat, route[route.length - 1].lng]}
            radius={10}
            pathOptions={{ color: "red", fillColor: "red", fillOpacity: 1, weight: 3 }}
          />
        )}
      </MapContainer>
    </div>
  );
}

export default function WorkoutPage() {
  const router = useRouter();
  const { id } = router.query;

  const [workout, setWorkout] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [user, setUser] = useState(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!id) return;
    const loadWorkout = async () => {
      try {
        const ref = doc(db, "workouts", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (!Array.isArray(data.participants)) {
            data.participants = [];
          }
          setWorkout(data);
          if (data.participants.length > 0) {
            loadParticipantsNames(data.participants);
          } else {
            setParticipants([]);
          }
        } else {
          setWorkout(null);
        }
      } catch (error) {
        console.error("Erro ao carregar treino:", error);
        setWorkout(null);
      }
    };
    loadWorkout();
  }, [id]);

  const loadParticipantsNames = async (ids) => {
    try {
      const list = [];
      for (const uid of ids) {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        list.push({
          id: uid,
          name: userSnap.exists() ? userSnap.data().name : "Usuário sem nome",
        });
      }
      setParticipants(list);
    } catch (error) {
      console.error("Erro ao carregar participantes:", error);
      setParticipants([]);
    }
  };

  const joinWorkout = async () => {
    if (!user || !workout) return;
    try {
      const userRef = await getDoc(doc(db, "users", user.uid));
      const plano = userRef.exists() ? userRef.data().plano || "basic" : "basic";
      if (plano === "basic") {
        const firstDay = new Date();
        firstDay.setDate(1);
        firstDay.setHours(0, 0, 0, 0);

        const qCriados = query(
          collection(db, "workouts"),
          where("creatorId", "==", user.uid),
          where("createdAt", ">=", Timestamp.fromDate(firstDay))
        );
        const qEntrou = query(
          collection(db, "workouts"),
          where("participants", "array-contains", user.uid),
          where("createdAt", ">=", Timestamp.fromDate(firstDay))
        );
        const [criadosSnap, entrouSnap] = await Promise.all([
          getDocs(qCriados),
          getDocs(qEntrou),
        ]);
        const criadosIds = criadosSnap.docs.map((doc) => doc.id);
        const entrouIds = entrouSnap.docs.map((doc) => doc.id);
        const totalUnico = new Set([...criadosIds, ...entrouIds]).size;

        if (totalUnico >= 3) {
          setShowLimitModal(true);
          return;
        }
      }
      const ref = doc(db, "workouts", id);
      await updateDoc(ref, {
        participants: arrayUnion(user.uid),
      });

      // Atualizar localmente
      const newParticipants = [...workout.participants, user.uid];
      setWorkout({
        ...workout,
        participants: newParticipants,
      });
      loadParticipantsNames(newParticipants);
    } catch (error) {
      console.error("Erro ao participar do treino:", error);
      alert("Erro ao participar do treino. Tente novamente.");
    }
  };

  const leaveWorkout = async () => {
    if (!user || !workout) return;
    try {
      const ref = doc(db, "workouts", id);
      await updateDoc(ref, {
        participants: arrayRemove(user.uid),
      });

      // Atualizar localmente
      const filteredParticipants = workout.participants.filter((p) => p !== user.uid);
      setWorkout({
        ...workout,
        participants: filteredParticipants,
      });
      setParticipants(participants.filter((p) => p.id !== user.uid));
    } catch (error) {
      console.error("Erro ao sair do treino:", error);
      alert("Erro ao sair do treino. Tente novamente.");
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          color: '#fff'
        }}>
          Carregando...
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className={styles.container}>
        <span
          className={styles.backLink}
          style={{ color: "#fff" }}
          onClick={() => router.push("/home")}
        >
          ← Voltar
        </span>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          color: '#fff'
        }}>
          Treino não encontrado
        </div>
      </div>
    );
  }

  const isParticipant = user && Array.isArray(workout.participants) && workout.participants.includes(user.uid);

  return (
    <div className={styles.container}>
      <span
        className={styles.backLink}
        style={{ color: "#fff" }}
        onClick={() => router.push("/home")}
      >
        ← Voltar
      </span>

      <h1 className={styles.title}>{workout.name}</h1>

      <div className={styles.card}>
        <p><strong>Tipo:</strong> {workout.type}</p>
        <p><strong>Pace:</strong> {workout.pace}</p>
        <p><strong>Local:</strong> {workout.location}</p>
        <p><strong>Horário:</strong> {workout.time}</p>
        {workout.date && (
          <p><strong>Data:</strong> {new Date(workout.date).toLocaleDateString()}</p>
        )}
        {workout.distance && (
          <p><strong>Distância:</strong> {workout.distance.toFixed(2)} km</p>
        )}
      </div>

      {workout.route && workout.route.length > 0 && (
        <DetailedRouteMap route={workout.route} />
      )}

      {/* Botão Participar/Sair */}
      {user ? (
        isParticipant ? (
          <button
            className={`${styles.button} ${styles.leave}`}
            onClick={leaveWorkout}
          >
            Sair do treino
          </button>
        ) : (
          <button
            className={`${styles.button} ${styles.join}`}
            onClick={joinWorkout}
          >
            Participar
          </button>
        )
      ) : (
        <button
          className={`${styles.button} ${styles.disabled}`}
          disabled
        >
          Faça login para participar
        </button>
      )}

      <h2 className={styles.title} style={{ color: "#fff", marginTop: 40 }}>
        Participantes ({participants.length})
      </h2>

      {participants.length === 0 ? (
        <p className={styles.empty}>Nenhum participante até agora.</p>
      ) : (
        <ul className={styles.list}>
          {participants.map((p) => (
            <li key={p.id} className={styles.listItem}>
              {p.name} {p.id === workout.creatorId && " (Criador)"}
            </li>
          ))}
        </ul>
      )}

      {/* Modal de limite */}
      {showLimitModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Limite atingido!</h2>
            <p>
              No plano básico, você só pode participar ou criar até <b>3 treinos</b> no mês.<br />
              Para liberar treinos ilimitados, assine o Premium!
            </p>
            <button
              className={styles.assinarBtn}
              onClick={() => {
                setShowLimitModal(false);
                router.push("/assinatura");
              }}
            >
              Assinar Premium
            </button>
            <button
              className={styles.fecharBtn}
              onClick={() => setShowLimitModal(false)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
