import Link from "next/link";
import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import styles from "../styles/HomePage.module.css";
import { useRouter } from "next/router";

export default function MyWorkouts() {
  const [user, setUser] = useState(null);
  const [myWorkouts, setMyWorkouts] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(collection(db, "workouts"), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(
          w =>
            w.participants?.includes(user.uid) &&
            w.name &&
            w.name.trim().length > 0 &&
            Array.isArray(w.route) &&
            w.route.length > 1
        );
      setMyWorkouts(list);
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

  if (!user)
    return (
      <div className={styles.loginMessage}>
        <h1>Faça login primeiro</h1>
        <Link href="/login" className={styles.loginLink}>
          Ir para Login
        </Link>
      </div>
    );

  return (
    <div className={styles.container}>
      <Link href="/home" className={styles.backLink}>
        ← Voltar à Home
      </Link>

      <h2 className={styles.title}>Meus Treinos</h2>

      {myWorkouts.map((workout) => (
        <div key={workout.id} className={styles.card}>
          <h3>{workout.name}</h3>
          <p>Tipo: {workout.type}</p>
          <p>Pace: {workout.pace}</p>
          <p>Local: {workout.location}</p>
          <p>Horário: {workout.time}</p>
          <p className={styles.participants}>
            Participantes: {workout.participants ? workout.participants.length : 0}
          </p>

          <div className={styles.cardButtons}>
            <button
              className={styles.primaryButton}
              onClick={() => router.push(`/workout/${workout.id}`)}
            >
              Ver Treino
            </button>

            {workout.creatorId === user.uid && (
              <button
                className={styles.deleteButton}
                onClick={() => handleDelete(workout.id)}
              >
                Deletar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
