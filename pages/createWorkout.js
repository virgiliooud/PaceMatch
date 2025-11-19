import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, query, where, getDocs, doc, getDoc, Timestamp } from "firebase/firestore";
import { useRouter } from "next/router";
import styles from "../styles/CreateWorkout.module.css";
import dynamic from "next/dynamic";

const MapCreator = dynamic(() => import("../components/MapCreator"), { ssr: false });

// Lista de cidades para seleção
const cidades = [
  "São Paulo",
  "Rio de Janeiro",
  "Belo Horizonte",
  "Curitiba",
  "Porto Alegre",
  "Brasília",
  "Recife",
  "Fortaleza",
  "Salvador",
  "Manaus"
  // Adicione mais cidades conforme sua necessidade
];

export default function CreateWorkout() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [pace, setPace] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [route, setRoute] = useState([]);
  const [distance, setDistance] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) {
      alert("Você precisa estar logado!");
      return;
    }

    const userRef = await getDoc(doc(db, "users", user.uid));
    const plano = userRef.exists() ? userRef.data().plano || "basic" : "basic";

    // Limitação para o plano básico
    if (plano === "basic") {
      const firstDay = new Date();
      firstDay.setDate(1); firstDay.setHours(0, 0, 0, 0);

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
      const criadosIds = criadosSnap.docs.map((doc) => doc.id);
      const entrouIds = entrouSnap.docs.map((doc) => doc.id);
      const totalUnico = new Set([...criadosIds, ...entrouIds]).size;

      if (totalUnico >= 3) {
        setShowLimitModal(true);
        return;
      }
    }

    const pointsToSave = route.map(p => ({ lat: p.lat, lng: p.lng }));

    if (!name || !type || !pace || !location || !date || !time || pointsToSave.length < 2) {
      alert("Preencha todos os campos e crie uma rota com pelo menos 2 pontos!");
      return;
    }

    try {
      await addDoc(collection(db, "workouts"), {
        name,
        type,
        pace,
        location,
        date,
        time,
        route: pointsToSave,
        distance,
        participants: [],
        creatorId: user.uid,
        createdAt: Timestamp.now(),
      });
      alert("Treino criado com sucesso!");
      router.push("/home");
    } catch (error) {
      alert("Erro ao criar treino: " + error.message);
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.titulo}>Criar Novo Treino</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Nome do treino</label>
          <input
            className={styles.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Tipo</label>
          <input
            className={styles.input}
            type="text"
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Pace</label>
          <input
            className={styles.input}
            type="text"
            value={pace}
            onChange={(e) => setPace(e.target.value)}
            required
          />
        </div>
        {/* Select de cidade */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>Cidade</label>
          <select
            className={styles.input}
            value={location}
            onChange={e => setLocation(e.target.value)}
            required
          >
            <option value="">Selecione...</option>
            {cidades.map((cidade) => (
              <option value={cidade} key={cidade}>{cidade}</option>
            ))}
          </select>
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Dia</label>
          <input
            className={styles.input}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Horário</label>
          <input
            className={styles.input}
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>
        <div className={styles.mapContainer}>
          <MapCreator
            onRouteChange={(waypoints, dist) => {
              setRoute(waypoints);
              setDistance(dist);
            }}
          />
        </div>
        <button className={styles.submitButton} type="submit">Criar Treino</button>
      </form>

      {/* Modal limite */}
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
              router.push("/assinatura");
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
