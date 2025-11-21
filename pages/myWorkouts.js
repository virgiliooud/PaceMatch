import Link from "next/link";
import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, onSnapshot, doc, deleteDoc, query, where, orderBy } from "firebase/firestore";
import { useRouter } from "next/router";
import styles from "../styles/MyWorkouts.module.css";

export default function MyWorkouts() {
  const [user, setUser] = useState(null);
  const [myWorkouts, setMyWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const workoutsQuery = query(
      collection(db, "workouts"),
      where("participants", "array-contains", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(workoutsQuery, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(
          w =>
            w.name &&
            w.name.trim().length > 0 &&
            Array.isArray(w.route) &&
            w.route.length > 0
        );
      setMyWorkouts(list);
      setLoading(false);
    });

    return unsub;
  }, [user]);

  const handleDelete = async (id) => {
    const confirm = window.confirm("Tem certeza que deseja deletar este treino? Essa ação não pode ser desfeita.");
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, "workouts", id));
      alert("Treino deletado com sucesso!");
    } catch (error) {
      alert("Erro ao deletar treino: " + error.message);
    }
  };

  const formatarData = (dateString) => {
    if (!dateString) return "Data não definida";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return "Data inválida";
    }
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.logoContainer}>
          <img src="/logo.png" alt="PaceMatch Logo" className={styles.logo} />
        </div>
        <div className={styles.loginMessage}>
          <h1 className={styles.loginTitle}>Faça login primeiro</h1>
          <p className={styles.loginSubtitle}>Acesse sua conta para ver seus treinos</p>
          <Link href="/login" className={styles.loginButton}>
            🏃‍♂️ Fazer Login
          </Link>
        </div>
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
          <p>Carregando seus treinos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/home" className={styles.backButton}>
          ← Voltar
        </Link>
        
        <div className={styles.logoContainer}>
          <img src="/logo.png" alt="PaceMatch Logo" className={styles.logo} />
        </div>

        <div className={styles.userInfo}>
          <img
            src={user?.photoURL || "/default-avatar.png"}
            alt="Foto"
            className={styles.profileImg}
          />
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className={styles.content}>
        <div className={styles.welcomeSection}>
          <h1 className={styles.title}>Meus Treinos</h1>
          <p className={styles.subtitle}>
            {myWorkouts.length > 0 
              ? `🎯 ${myWorkouts.length} treinos encontrados` 
              : "📝 Você ainda não participa de nenhum treino"}
          </p>
        </div>

        {/* Ação Rápida */}
        <div className={styles.quickAction}>
          <Link href="/createWorkout" className={styles.createButton}>
            🏃‍♂️ Criar Novo Treino
          </Link>
        </div>

        {/* Lista de Treinos */}
        <div className={styles.workoutsGrid}>
          {myWorkouts.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🏃‍♂️</div>
              <h3>Nenhum treino encontrado</h3>
              <p>Você ainda não está participando de nenhum treino.</p>
              <div className={styles.emptyActions}>
                <Link href="/createWorkout" className={styles.primaryButton}>
                  🏃‍♂️ Criar Primeiro Treino
                </Link>
                <Link href="/home" className={styles.secondaryButton}>
                  🔍 Explorar Treinos
                </Link>
              </div>
            </div>
          ) : (
            myWorkouts.map((workout) => (
              <div key={workout.id} className={styles.workoutCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.workoutTitleSection}>
                    <h3 className={styles.workoutName}>
                      {workout.name}
                      {workout.isPrivate && (
                        <span className={styles.privateBadge} title="Treino Privado">
                          🔒
                        </span>
                      )}
                      {workout.creatorId === user.uid && (
                        <span className={styles.ownerBadge} title="Você é o criador">
                          👑
                        </span>
                      )}
                    </h3>
                    <div className={styles.workoutMeta}>
                      <span className={styles.workoutType}>{workout.type}</span>
                      <span className={styles.workoutPace}>⏱️ {workout.pace}</span>
                    </div>
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
                  
                  <button
                    onClick={() => router.push(`/workoutChats/${workout.id}`)}
                    className={styles.chatButton}
                  >
                    💬 Chat
                  </button>

                  {workout.creatorId === user.uid && (
                    <button
                      onClick={() => handleDelete(workout.id)}
                      className={styles.deleteButton}
                    >
                      🗑️ Deletar
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}