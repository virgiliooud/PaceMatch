import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  Timestamp
} from "firebase/firestore";
import styles from '../../styles/WorkoutPage.module.css';

import { MapContainer, TileLayer, Polyline, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function WorkoutPage() {
  const router = useRouter();
  const { id } = router.query;

  const [workout, setWorkout] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [user, setUser] = useState(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (!id) return;

    const loadWorkout = async () => {
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
      }
    };

    loadWorkout();
  }, [id]);

  const loadParticipantsNames = async (ids) => {
    const list = [];
    for (const uid of ids) {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      list.push({
        id: uid,
        name: userSnap.exists() ? userSnap.data().name : "Usuário sem nome"
      });
    }
    setParticipants(list);
  };

  const joinWorkout = async () => {
    if (!user) return;

    // Verifica o plano e faz limitação igual createWorkout.js
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

      const [criadosSnap, entrouSnap] = await Promise.all([getDocs(qCriados), getDocs(qEntrou)]);
      const criadosIds = criadosSnap.docs.map(doc => doc.id);
      const entrouIds = entrouSnap.docs.map(doc => doc.id);
      const totalUnico = new Set([...criadosIds, ...entrouIds]).size;

      if (totalUnico >= 3) {
        setShowLimitModal(true);
        return; // Bloqueia entrada
      }
    }

    const ref = doc(db, "workouts", id);
    await updateDoc(ref, {
      participants: arrayUnion(user.uid)
    });

    loadParticipantsNames([...workout.participants, user.uid]);

    setWorkout({
      ...workout,
      participants: [...workout.participants, user.uid]
    });
  };

  const leaveWorkout = async () => {
    if (!user) return;
    const ref = doc(db, "workouts", id);

    await updateDoc(ref, {
      participants: arrayRemove(user.uid)
    });

    const filtered = participants.filter((p) => p.id !== user.uid);
    setParticipants(filtered);

    setWorkout({
      ...workout,
      participants: workout.participants.filter((p) => p !== user.uid)
    });
  };

  if (!workout) return <p className={styles.empty}>Carregando...</p>;

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
        {workout.date && <p><strong>Data:</strong> {new Date(workout.date).toLocaleDateString()}</p>}
        {workout.distance && <p><strong>Distância:</strong> {workout.distance.toFixed(2)} km</p>}
      </div>

      {workout.route && workout.route.length > 0 && (
        <div style={{ height: "300px", width: "100%", maxWidth: "600px", margin: "20px auto", borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          <MapContainer
            style={{ height: "100%", width: "100%" }}
            center={[workout.route[0].lat, workout.route[0].lng]}
            zoom={15}
            scrollWheelZoom={true}
            dragging={true}
            doubleClickZoom={true}
            zoomControl={true}
            attributionControl={false}
            keyboard={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
            />
            <Polyline
              positions={workout.route.map(p => [p.lat, p.lng])}
              color="#00c6ff"
              weight={5}
              opacity={0.7}
            />
            <CircleMarker
              center={[workout.route[0].lat, workout.route[0].lng]}
              radius={10}
              pathOptions={{ color: "green", fillColor: "green", fillOpacity: 1 }}
            />
            <CircleMarker
              center={[workout.route[workout.route.length - 1].lat, workout.route[workout.route.length - 1].lng]}
              radius={10}
              pathOptions={{ color: "red", fillColor: "red", fillOpacity: 1 }}
            />
          </MapContainer>
        </div>
      )}

      {user && Array.isArray(workout.participants) && workout.participants.includes(user.uid) ? (
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
      )}

      <h2 className={styles.title} style={{ color: "#fff", marginTop: 40 }}>
        Participantes
      </h2>

      {participants.length === 0 ? (
        <p className={styles.empty}>Nenhum participante até agora.</p>
      ) : (
        <ul className={styles.list}>
          {participants.map((p) => (
            <li key={p.id} className={styles.listItem}>
              {p.name}
            </li>
          ))}
        </ul>
      )}

      {/* Modal Limite */}
      {showLimitModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Limite atingido!</h2>
            <p>
              No plano básico, você só pode participar ou criar até <b>3 treinos</b> no mês.<br />
              Para liberar treinos ilimitados, assine o Premium!
            </p>
            <button className={styles.assinarBtn} onClick={() => {
              setShowLimitModal(false);
              router.push("/assinatura"); // Altere para sua rota de assinatura
            }}>
              Assinar Premium
            </button>
            <button className={styles.fecharBtn} onClick={() => setShowLimitModal(false)}>Fechar</button>
          </div>
        </div>
      )}

    </div>
  );
}
