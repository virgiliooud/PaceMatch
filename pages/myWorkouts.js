import Link from "next/link";
import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import styles from "../styles/HomePage.module.css";
import { useRouter } from "next/router";

export default function MyWorkouts() {
  const [user, setUser] = useState(null);
  const [myWorkouts, setMyWorkouts] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [trainingToDelete, setTrainingToDelete] = useState(null);
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

  const handleDeleteClick = (id) => {
    setTrainingToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!trainingToDelete) return;

    try {
      await deleteDoc(doc(db, "workouts", trainingToDelete));
      // Remove os alerts nativos que não funcionam no iPhone
      // Você pode adicionar um toast ou feedback visual depois
      setShowDeleteModal(false);
      setTrainingToDelete(null);
    } catch (error) {
      console.error("Erro ao deletar treino: ", error);
      setShowDeleteModal(false);
      setTrainingToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setTrainingToDelete(null);
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
      {/* Modal de Confirmação */}
      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Deletar Treino?</h3>
            <p className={styles.modalText}>
              Tem certeza que quer deletar esse treino? Essa porra não tem volta!
            </p>
            <div className={styles.modalButtons}>
              <button
                onClick={cancelDelete}
                className={styles.cancelButton}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className={styles.confirmDeleteButton}
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}

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
                onClick={() => handleDeleteClick(workout.id)}
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