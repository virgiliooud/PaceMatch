"use client";
import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

export default function Feed() {
  const [workouts, setWorkouts] = useState([]);
  const user = auth.currentUser;

  // Carregar treinos do Firestore
  const fetchWorkouts = async () => {
    const querySnapshot = await getDocs(collection(db, "workouts"));
    const workoutsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setWorkouts(workoutsData);
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  // Entrar em um treino
  const joinWorkout = async (workoutId, participants = []) => {
    if (!participants.includes(user.uid)) {
      const workoutRef = doc(db, "workouts", workoutId);
      await updateDoc(workoutRef, { participants: [...participants, user.uid] });
      fetchWorkouts();
    }
  };

  return (
    <div style={{
      background: "#000",
      color: "white",
      minHeight: "100vh",
      padding: "40px",
      fontFamily: "'League Spartan', sans-serif"
    }}>
      <link
        href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <h2 style={{ fontSize: "28px", marginBottom: "20px" }}>
        Feed de Treinos 👟
      </h2>

      {workouts.length === 0 && <p style={{ opacity: 0.7 }}>Nenhum treino disponível.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {workouts.map(workout => (
          <div key={workout.id} style={{
            background: "#111",
            padding: "20px",
            borderRadius: "8px"
          }}>
            <h3 style={{ fontSize: "20px", marginBottom: "5px" }}>{workout.name}</h3>
            <p style={{ opacity: 0.7, marginBottom: "5px" }}>Tipo: {workout.type}</p>
            <p style={{ opacity: 0.7, marginBottom: "10px" }}>Pace: {workout.pace}</p>
            <p style={{ opacity: 0.7, marginBottom: "10px" }}>
              Participantes: {workout.participants ? workout.participants.length : 0}
            </p>

            {!workout.participants?.includes(user.uid) ? (
              <button
                onClick={() => joinWorkout(workout.id, workout.participants || [])}
                style={{
                  background: "white",
                  color: "black",
                  padding: "10px 15px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                Entrar no treino
              </button>
            ) : (
              <p style={{ opacity: 0.7, fontWeight: 600 }}>Você está nesse treino ✅</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
    