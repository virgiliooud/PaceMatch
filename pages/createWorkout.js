import Link from "next/link";
import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, onSnapshot, doc, getDoc, query, orderBy } from "firebase/firestore";
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

const paceOptions = [
  "2:30", "2:45", "3:00", "3:15", "3:30", "3:45", "4:00", "4:15", "4:30", "4:45",
  "5:00", "5:15", "5:30", "5:45", "6:00", "6:15", "6:30", "6:45", "7:00", "7:15",
  "7:30", "7:45", "8:00", "8:15", "8:30", "8:45", "9:00", "9:15", "9:30", "9:45", "10:00"
];

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [userPlano, setUserPlano] = useState("basic");
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [cidadeFiltro, setCidadeFiltro] = useState("");
  const [paceFiltro, setPaceFiltro] = useState("");
  const [publicoPrivadoFiltro, setPublicoPrivadoFiltro] = useState("todos");
  const [nomeFiltro, setNomeFiltro] = useState("");

  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          const plano = userDoc.exists() ? userDoc.data().plano || "basic" : "basic";
          setUserPlano(plano);
        } catch (error) {
          console.error("❌ Erro ao buscar plano:", error);
        }
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    try {
      const workoutsQuery = query(
        collection(db, "workouts"), 
        orderBy("createdAt", "desc")
      );
      
      const unsub = onSnapshot(workoutsQuery, 
        (snapshot) => {
          const list = snapshot.docs.map((doc) => {
            const data = doc.data();
            return { 
              id: doc.id, 
              ...data,
              name: data.name || "Treino sem nome",
              location: data.location || "Local não definido",
              route: data.route || [],
              participants: data.participants || [],
              isPrivate: data.isPrivate || false
            };
          });
          
          setWorkouts(list);
          setLoading(false);
        },
        (error) => {
          console.error("❌ ERRO NO LISTENER:", error);
          setLoading(false);
        }
      );

      return unsub;
    } catch (error) {
      console.error("❌ ERRO AO CONFIGURAR LISTENER:", error);
      setLoading(false);
    }
  }, []);

  const workoutsValidos = workouts.filter((workout) => {
    if (!workout.name || workout.name.trim() === "" || !workout.route || workout.route.length === 0) {
      return false;
    }

    if (cidadeFiltro && workout.location !== cidadeFiltro) return false;

    if (paceFiltro && workout.pace && !workout.pace.includes(paceFiltro)) {
      return false;
    }

    if (publicoPrivadoFiltro === "publico" && workout.isPrivate) return false;
    if (publicoPrivadoFiltro === "privado" && !workout.isPrivate) return false;

    if (nomeFiltro && !workout.name.toLowerCase().includes(nomeFiltro.toLowerCase())) return false;
    
    return true;
  });

  const formatarData = (dateString) => {
    if (!dateString) return "Data não definida";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return "Data inválida";
    }
  };

  const isParticipante = (workout) => {
    return user && workout.participants?.includes(user.uid);
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.logoContainer}>
          <img src="/logo.png" alt="PaceMatch Logo" className={styles.logo} />
        </div>
        <h1 className={styles.welcomeTitle}>PaceMatch</h1>
        <p className={styles.welcomeSubtitle}>Encontre parceiros de treino perfeitos</p>
        <Link href="/login" className={styles.button}>
          🏃‍♂️ Fazer Login
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.logoContainer}>
          <img src="/logo.png" alt="PaceMatch Logo" className={styles.logo} />
        </div>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Carregando treinos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <img src="/logo.png" alt="PaceMatch Logo" className={styles.logo} />
        </div>

        <div className={styles.userSection}>
          <img
            src={user?.photoURL || "/default-avatar.png"}
            alt="Foto"
            onClick={() => router.push("/profile")}
            className={styles.profileImg}
          />
          <div 
            className={`${styles.planoBadge} ${userPlano === "premium" ? styles.premium : styles.basic}`}
            onClick={() => router.push("/assinatura")}
          >
            {userPlano === "premium" ? "⭐ Premium" : "🔹 Básico"}
          </div>
        </div>
      </div>

      {/* ✅ CORREÇÃO: EMOJI NÃO AZUL */}
      <div className={styles.welcomeSection}>
        <h1 className={styles.greeting}>
          Olá, {user.displayName?.split(" ")[0] || "Amigo"}! 👋
        </h1>
        <p className={styles.subText}>
          {workoutsValidos.length > 0 
            ? `📊 ${workoutsValidos.length} treinos disponíveis` 
            : "📝 Nenhum treino encontrado - seja o primeiro a criar!"}
        </p>
      </div>

      {/* Ações Rápidas */}
      <div className={styles.quickActions}>
        <Link href="/createWorkout" className={styles.primaryButton}>
          🏃‍♂️ Criar Treino
        </Link>
        <Link href="/myWorkouts" className={styles.secondaryButton}>
          📋 Meus Treinos
        </Link>
      </div>

      {/* Filtros */}
      <div className={styles.filtersSection}>
        <h3>🔍 Filtros</h3>
        
        <div className={styles.filtersGrid}>
          <select
            value={cidadeFiltro}
            onChange={(e) => setCidadeFiltro(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">🌆 Todas as cidades</option>
            {cidades.map((cidade) => (
              <option key={cidade} value={cidade}>
                {cidade}
              </option>
            ))}
          </select>

          {/* ✅ CORREÇÃO: FILTRO DE PACE ÚNICO */}
          <select
            value={paceFiltro}
            onChange={(e) => setPaceFiltro(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">⏱️ Todos os paces</option>
            {paceOptions.map((pace) => (
              <option key={pace} value={pace}>
                {pace} min/km
              </option>
            ))}
          </select>

          <select
            value={publicoPrivadoFiltro}
            onChange={(e) => setPublicoPrivadoFiltro(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="todos">🌐 Todos os treinos</option>
            <option value="publico">🔓 Apenas públicos</option>
            <option value="privado">🔒 Apenas privados</option>
          </select>

          <input
            type="text"
            placeholder="🔎 Buscar por nome..."
            value={nomeFiltro}
            onChange={(e) => setNomeFiltro(e.target.value)}
            className={styles.filterInput}
          />
        </div>

        {(cidadeFiltro || paceFiltro || publicoPrivadoFiltro !== "todos" || nomeFiltro) && (
          <button
            onClick={() => {
              setCidadeFiltro("");
              setPaceFiltro("");
              setPublicoPrivadoFiltro("todos");
              setNomeFiltro("");
            }}
            className={styles.clearFiltersButton}
          >
            🗑️ Limpar Filtros
          </button>
        )}
      </div>

      {/* Lista de Treinos */}
      <div className={styles.workoutsGrid}>
        {workoutsValidos.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🏃‍♂️</div>
            <h3>Nenhum treino encontrado</h3>
            <p>
              {workouts.length === 0 
                ? "Seja o primeiro a criar um treino!" 
                : "Tente ajustar os filtros para ver mais resultados."}
            </p>
            <Link href="/createWorkout" className={styles.button}>
              🏃‍♂️ Criar Primeiro Treino
            </Link>
          </div>
        ) : (
          workoutsValidos.map((workout) => (
            <div key={workout.id} className={styles.workoutCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.workoutName}>
                  {workout.name}
                  {workout.isPrivate && (
                    <span className={styles.privateBadge} title="Treino Privado">
                      🔒
                    </span>
                  )}
                </h3>
                <div className={styles.workoutMeta}>
                  <span className={styles.workoutType}>{workout.type}</span>
                  <span className={styles.workoutPace}>⏱️ {workout.pace}</span>
                </div>
              </div>

              <div className={styles.cardContent}>
                <div className={styles.workoutInfo}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>📍</span>
                    {workout.location}
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>📅</span>
                    {formatarData(workout.date)}
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>🕒</span>
                    {workout.time}
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>👥</span>
                    {workout.participants?.length || 0} participantes
                  </div>
                </div>

                {workout.distance && (
                  <div className={styles.distanceBadge}>
                    📏 {workout.distance} km
                  </div>
                )}
              </div>

              <div className={styles.cardActions}>
                <button
                  onClick={() => router.push(`/workout/${workout.id}`)}
                  className={styles.viewButton}
                >
                  👀 Ver Detalhes
                </button>
                
                {isParticipante(workout) && (
                  <button
                    onClick={() => router.push(`/workoutChats/${workout.id}`)}
                    className={styles.chatButton}
                  >
                    💬 Chat
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}