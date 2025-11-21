import Link from "next/link";
import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/router";
import styles from "../styles/HomePage.module.css";

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
  "Manaus",
  "Florianópolis e região",
];

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [userPlano, setUserPlano] = useState("basic");
  const [workouts, setWorkouts] = useState([]);

  const [cidadeFiltro, setCidadeFiltro] = useState("");
  const [paceFiltro, setPaceFiltro] = useState("");
  const [publicoPrivadoFiltro, setPublicoPrivadoFiltro] = useState("todos");
  const [nomeFiltro, setNomeFiltro] = useState("");

  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);

      if (u) {
        const userDoc = await getDoc(doc(db, "users", u.uid));
        setUserPlano(userDoc.exists() ? userDoc.data().plano || "basic" : "basic");
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "workouts"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setWorkouts(list);
    });
    return unsub;
  }, []);

  // Filtra os treinos de acordo com os filtros aplicados
  const workoutsValidos = workouts.filter((w) => {
    if (!w.name || !w.name.trim() || !Array.isArray(w.route) || w.route.length <= 1) {
      return false;
    }
    if (cidadeFiltro && w.location !== cidadeFiltro) return false;
    if (paceFiltro && !w.pace.toLowerCase().includes(paceFiltro.toLowerCase())) return false;
    if (publicoPrivadoFiltro === "publico" && w.isPrivate) return false;
    if (publicoPrivadoFiltro === "privado" && !w.isPrivate) return false;
    if (nomeFiltro && !w.name.toLowerCase().includes(nomeFiltro.toLowerCase())) return false;
    return true;
  });

  if (!user)
    return (
      <div className={styles.container}>
        <h1 style={{ fontSize: "36px", marginBottom: "20px" }}>PaceMatch</h1>
        <Link href="/login" className={styles.button}>
          Fazer Login
        </Link>
      </div>
    );

  return (
    <div className={styles.container}>
      {/* Logo centralizada */}
      <div className={styles.logoContainer}>
        <img src="/logo.png" alt="PaceMatch Logo" className={styles.logo} />
      </div>

      {/* Top bar */}
      <div className={styles.topBar} style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img
          src={user?.photoURL}
          alt="Foto"
          onClick={() => router.push("/profile")}
          className={styles.profileImg}
        />
        <div
          style={{ color: "#fff", fontWeight: "bold", cursor: "pointer" }}
          onClick={() => router.push("/assinatura")}
        >
          Plano: {userPlano === "premium" ? "Premium" : "Básico"} (Clique para gerenciar)
        </div>
      </div>

      <h2 className={styles.greeting}>Olá, {user.displayName?.split(" ")[0]} 👟</h2>
      <p className={styles.subText}>Veja os treinos disponíveis:</p>

      {/* FILTROS */}
      <div className={styles.filtros}>
        <select
          value={cidadeFiltro}
          onChange={(e) => setCidadeFiltro(e.target.value)}
          className={styles.selectFiltro}
        >
          <option value="">Filtrar por cidade</option>
          {cidades.map((cidade) => (
            <option key={cidade} value={cidade}>
              {cidade}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Filtrar por pace (ex: 5:30)"
          value={paceFiltro}
          onChange={(e) => setPaceFiltro(e.target.value)}
          className={styles.inputFiltro}
        />

        <select
          value={publicoPrivadoFiltro}
          onChange={(e) => setPublicoPrivadoFiltro(e.target.value)}
          className={styles.selectFiltro}
        >
          <option value="todos">Todos</option>
          <option value="publico">Público</option>
          <option value="privado">Privado</option>
        </select>

        <input
          type="text"
          placeholder="Buscar por nome do treino"
          value={nomeFiltro}
          onChange={(e) => setNomeFiltro(e.target.value)}
          className={styles.inputFiltro}
          style={{ width: "auto", flexGrow: 1 }}
        />

        <button
          onClick={() => {
            setCidadeFiltro("");
            setPaceFiltro("");
            setPublicoPrivadoFiltro("todos");
            setNomeFiltro("");
          }}
          className={styles.botaoLimparFiltro}
        >
          Limpar filtros
        </button>
      </div>

      <div className={styles.buttonGroup}>
        <Link href="/createWorkout" className={styles.button}>
          + Criar Treino
        </Link>
        <Link href="/myWorkouts" className={styles.button}>
          Meus Treinos
        </Link>
      </div>

      {workoutsValidos.map((workout) => (
        <div key={workout.id} className={styles.card}>
          <h3>
            {workout.name}{" "}
            {workout.isPrivate && (
              <span title="Treino Privado" style={{ marginLeft: 8 }}>
                🔒
              </span>
            )}
          </h3>
          <p>Tipo: {workout.type}</p>
          <p>Pace: {workout.pace}</p>
          <p>Local: {workout.location}</p>
          <p>Horário: {workout.time}</p>
          <p>Data: {workout.date ? new Date(workout.date).toLocaleDateString() : ""}</p>
          <p>
            <b>{workout.isPrivate ? "Privado" : "Público"}</b>
          </p>
          <p className="participants">Participantes: {workout.participants?.length || 0}</p>
          <div className={styles.cardButtons}>
            <button
              onClick={() => router.push(`/workout/${workout.id}`)}
              className={styles.primaryButton}
            >
              Ver Treino
            </button>
            {/* Botão do chat aparece somente para participantes */}
            {user && workout.participants?.includes(user.uid) && (
              <button
                onClick={() => router.push(`/workoutChats/${workout.id}`)}
                className={styles.chatButton}
              >
                💬 Chat
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
