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
  Timestamp,
} from "firebase/firestore";
import styles from "../../styles/WorkoutPage.module.css";

import dynamic from "next/dynamic";
import axios from "axios";

const WorkoutMap = dynamic(() => import("../../components/WorkoutMap"), {
  ssr: false,
  loading: () => <p style={{ color: "#fff" }}>Carregando mapa...</p>,
});

export default function WorkoutPage() {
  const router = useRouter();
  const { id } = router.query;

  const [workout, setWorkout] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [user, setUser] = useState(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [styledRoute, setStyledRoute] = useState(null);

  // Estado da senha para treino privado
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const ORS_API_KEY =
    "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijk2MjE3OWE5YjI3MjRlMzVhNWYxNGU2MTNjMjJkNWNhIiwiaCI6Im11cm11cjY0In0=";

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (!id || !user) return;

    const loadWorkout = async () => {
      const ref = doc(db, "workouts", id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;

      const data = snap.data();
      if (!Array.isArray(data.participants)) data.participants = [];

      // Insere o criador automaticamente nos participantes se faltar
      if (data.creatorId === user.uid && !data.participants.includes(user.uid)) {
        await updateDoc(ref, {
          participants: arrayUnion(user.uid),
        });
        data.participants.push(user.uid);
      }

      setWorkout(data);

      // Se já existe rota, chama ORS para rota bonitinha
      if (data.route && data.route.length > 1) {
        try {
          const coords = data.route.map((p) => [p.lng, p.lat]);
          const res = await axios.post(
            "https://api.openrouteservice.org/v2/directions/foot-walking/geojson",
            { coordinates: coords },
            {
              headers: {
                Authorization: `Bearer ${ORS_API_KEY}`,
                "Content-Type": "application/json",
              },
            }
          );
          setStyledRoute(res.data);
        } catch (error) {
          console.error("Erro ao obter rota ORS", error);
          setStyledRoute(null);
        }
      }

      if (data.participants.length > 0) {
        loadParticipantsNames(data.participants);
      } else {
        setParticipants([]);
      }
    };

    loadWorkout();
  }, [id, user]);

  const loadParticipantsNames = async (ids) => {
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
  };

  // Atualizado: função para tentar entrar, validando senha se for treino privado
  const tryJoinWorkout = async () => {
    if (!user || !workout) return;

    // Se treino privado e usuário NÃO está participando
    if (
      workout.isPrivate &&
      !workout.participants.includes(user.uid)
    ) {
      setPasswordError(""); // limpa erro
      setShowPasswordModal(true);
      return;
    }

    // Se não é privado ou usuário já participa, entra direto
    await joinWorkout();
  };

  const joinWorkout = async () => {
    if (!user) return;

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

      const total = new Set([
        ...criadosSnap.docs.map((d) => d.id),
        ...entrouSnap.docs.map((d) => d.id),
      ]).size;

      if (total >= 3) {
        setShowLimitModal(true);
        return;
      }
    }

    const ref = doc(db, "workouts", id);
    await updateDoc(ref, {
      participants: arrayUnion(user.uid),
    });

    const newList = [...(workout.participants || []), user.uid];
    setWorkout({ ...workout, participants: newList });
    loadParticipantsNames(newList);
    setShowPasswordModal(false);
    setInputPassword("");
    setPasswordError("");
  };

  const leaveWorkout = async () => {
    if (!user) return;

    const ref = doc(db, "workouts", id);
    await updateDoc(ref, {
      participants: arrayRemove(user.uid),
    });

    const filtered = participants.filter((p) => p.id !== user.uid);
    setParticipants(filtered);
    setWorkout({
      ...workout,
      participants: workout.participants.filter((p) => p !== user.uid),
    });
  };

  // Validação de senha do modal
  const handlePasswordSubmit = async () => {
    if (inputPassword === workout.password) {
      await joinWorkout();
      setShowPasswordModal(false);
      setInputPassword("");
      setPasswordError("");
    } else {
      setPasswordError("Senha incorreta. Tente novamente.");
    }
  };

  if (!workout) return <p className={styles.empty}>Carregando treino...</p>;

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

      {/* MAPA: rota bonitinha ou original */}
      {styledRoute ? (
        <WorkoutMap route={styledRoute} showWaypoints={false} />
      ) : workout.route && workout.route.length > 0 ? (
        <WorkoutMap route={workout.route} showWaypoints={false} />
      ) : null}

      {user &&
      Array.isArray(workout.participants) &&
      workout.participants.includes(user.uid) ? (
        <button
          className={`${styles.button} ${styles.leave}`}
          onClick={leaveWorkout}
        >
          Sair do treino
        </button>
      ) : (
        <button
          className={`${styles.button} ${styles.join}`}
          onClick={tryJoinWorkout} // Agora chama aqui a validação de senha
        >
          Participar
        </button>
      )}

      <h2 className={styles.title} style={{ color: "#fff", marginTop: 40 }}>
        Participantes
      </h2>

      {participants.length === 0 ? (
        <p className={styles.empty}>Nenhum participante ainda.</p>
      ) : (
        <ul className={styles.list}>
          {participants.map((p) => (
            <li key={p.id} className={styles.listItem}>{p.name}</li>
          ))}
        </ul>
      )}

      {showLimitModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Limite atingido!</h2>
            <p>
              No plano básico, você só pode participar ou criar até{" "}
              <b>3 treinos por mês.</b>
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

      {/* Modal de senha para treino privado */}
      {showPasswordModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Treino Privado</h2>
            <p>Este treino é privado. Por favor, insira a senha para participar.</p>
            <input
              type="password"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
              autoFocus
            />
            {passwordError && (
              <p style={{ color: "red", marginBottom: "10px" }}>{passwordError}</p>
            )}
            <button className={styles.assinarBtn} onClick={handlePasswordSubmit}>
              Confirmar
            </button>
            <button
              className={styles.fecharBtn}
              onClick={() => {
                setShowPasswordModal(false);
                setInputPassword("");
                setPasswordError("");
              }}
              style={{ marginLeft: "10px" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
