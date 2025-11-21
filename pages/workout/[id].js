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
  loading: () => (
    <div className={styles.loadingMap}>
      <div className={styles.spinner}></div>
      <p>Carregando mapa...</p>
    </div>
  ),
});

export default function WorkoutPage() {
  const router = useRouter();
  const { id } = router.query;

  const [workout, setWorkout] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
      setLoading(true);
      try {
        const ref = doc(db, "workouts", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setLoading(false);
          return;
        }

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
          await loadParticipantsNames(data.participants);
        } else {
          setParticipants([]);
        }
      } catch (error) {
        console.error("Erro ao carregar treino:", error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkout();
  }, [id, user]);

  const loadParticipantsNames = async (ids) => {
    const list = [];
    for (const uid of ids) {
      try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        list.push({
          id: uid,
          name: userSnap.exists() ? userSnap.data().name : "Usuário sem nome",
          photoURL: userSnap.exists() ? userSnap.data().photoURL : null,
        });
      } catch (error) {
        console.error("Erro ao carregar participante:", error);
      }
    }
    setParticipants(list);
  };

  const tryJoinWorkout = async () => {
    if (!user || !workout) return;

    // Se treino privado e usuário NÃO está participando
    if (
      workout.isPrivate &&
      !workout.participants.includes(user.uid)
    ) {
      setPasswordError("");
      setShowPasswordModal(true);
      return;
    }

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
    await loadParticipantsNames(newList);
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

  const handlePasswordSubmit = async () => {
    if (inputPassword === workout.password) {
      await joinWorkout();
    } else {
      setPasswordError("Senha incorreta. Tente novamente.");
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

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Carregando treino...</p>
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>❌</div>
          <h2>Treino não encontrado</h2>
          <p>O treino que você está procurando não existe ou foi removido.</p>
          <button onClick={() => router.push("/home")} className={styles.primaryButton}>
            🏠 Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  const isParticipant = user && workout.participants?.includes(user.uid);
  const isCreator = user && workout.creatorId === user.uid;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button onClick={() => router.push("/home")} className={styles.backButton}>
          ← Voltar
        </button>
        
        <div className={styles.logoContainer}>
          <img src="/logo.png" alt="PaceMatch Logo" className={styles.logo} />
        </div>

        <div className={styles.userInfo}>
          {user && (
            <img
              src={user?.photoURL || "/default-avatar.png"}
              alt="Foto"
              className={styles.profileImg}
            />
          )}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className={styles.content}>
        {/* Cabeçalho do Treino */}
        <div className={styles.workoutHeader}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>
              {workout.name}
              {workout.isPrivate && (
                <span className={styles.privateBadge} title="Treino Privado">
                  🔒
                </span>
              )}
              {isCreator && (
                <span className={styles.ownerBadge} title="Você é o criador">
                  👑
                </span>
              )}
            </h1>
            <p className={styles.subtitle}>{workout.type}</p>
          </div>

          <div className={styles.workoutMeta}>
            <span className={styles.paceBadge}>⏱️ {workout.pace}</span>
            {workout.distance && (
              <span className={styles.distanceBadge}>📏 {workout.distance} km</span>
            )}
          </div>
        </div>

        {/* Informações do Treino */}
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <div className={styles.infoItem}>
              <span className={styles.infoIcon}>📍</span>
              <div>
                <div className={styles.infoLabel}>Local</div>
                <div className={styles.infoValue}>{workout.location}</div>
              </div>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoIcon}>📅</span>
              <div>
                <div className={styles.infoLabel}>Data</div>
                <div className={styles.infoValue}>{formatarData(workout.date)}</div>
              </div>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoIcon}>🕒</span>
              <div>
                <div className={styles.infoLabel}>Horário</div>
                <div className={styles.infoValue}>{workout.time}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Mapa */}
        <div className={styles.mapSection}>
          <h3 className={styles.sectionTitle}>📍 Rota do Treino</h3>
          {styledRoute ? (
            <WorkoutMap route={styledRoute} showWaypoints={false} />
          ) : workout.route && workout.route.length > 0 ? (
            <WorkoutMap route={workout.route} showWaypoints={false} />
          ) : (
            <div className={styles.noMap}>
              <div className={styles.noMapIcon}>🗺️</div>
              <p>Nenhuma rota definida para este treino</p>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className={styles.actions}>
          {user ? (
            isParticipant ? (
              <div className={styles.actionButtons}>
                <button
                  className={styles.chatButton}
                  onClick={() => router.push(`/workoutChats/${workout.id}`)}
                >
                  💬 Ir para o Chat
                </button>
                <button
                  className={styles.leaveButton}
                  onClick={leaveWorkout}
                >
                  🏃‍♂️ Sair do Treino
                </button>
              </div>
            ) : (
              <button
                className={styles.joinButton}
                onClick={tryJoinWorkout}
              >
                🎯 Participar do Treino
              </button>
            )
          ) : (
            <div className={styles.loginPrompt}>
              <p>Faça login para participar deste treino</p>
              <button
                onClick={() => router.push("/login")}
                className={styles.loginButton}
              >
                🏃‍♂️ Fazer Login
              </button>
            </div>
          )}
        </div>

        {/* Participantes */}
        <div className={styles.participantsSection}>
          <h3 className={styles.sectionTitle}>
            👥 Participantes ({participants.length})
          </h3>
          
          {participants.length === 0 ? (
            <div className={styles.emptyParticipants}>
              <div className={styles.emptyIcon}>👤</div>
              <p>Nenhum participante ainda</p>
              <small>Seja o primeiro a participar!</small>
            </div>
          ) : (
            <div className={styles.participantsGrid}>
              {participants.map((participant) => (
                <div key={participant.id} className={styles.participantCard}>
                  <img
                    src={participant.photoURL || "/default-avatar.png"}
                    alt={participant.name}
                    className={styles.participantAvatar}
                  />
                  <div className={styles.participantInfo}>
                    <div className={styles.participantName}>
                      {participant.name}
                      {participant.id === workout.creatorId && (
                        <span className={styles.creatorBadge} title="Criador do treino">
                          👑
                        </span>
                      )}
                    </div>
                    <div className={styles.participantRole}>
                      {participant.id === workout.creatorId ? "Criador" : "Participante"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showLimitModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalIcon}>🚫</div>
            <h2>Limite Atingido!</h2>
            <p>
              No plano básico, você só pode participar ou criar até{" "}
              <strong>3 treinos por mês</strong>.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.primaryButton}
                onClick={() => {
                  setShowLimitModal(false);
                  router.push("/assinatura");
                }}
              >
                ⭐ Assinar Premium
              </button>
              <button
                className={styles.secondaryButton}
                onClick={() => setShowLimitModal(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalIcon}>🔒</div>
            <h2>Treino Privado</h2>
            <p>Este treino é privado. Insira a senha para participar.</p>
            <input
              type="password"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              className={styles.passwordInput}
              placeholder="Digite a senha..."
              autoFocus
            />
            {passwordError && (
              <p className={styles.errorText}>{passwordError}</p>
            )}
            <div className={styles.modalActions}>
              <button
                className={styles.primaryButton}
                onClick={handlePasswordSubmit}
              >
                ✅ Confirmar
              </button>
              <button
                className={styles.secondaryButton}
                onClick={() => {
                  setShowPasswordModal(false);
                  setInputPassword("");
                  setPasswordError("");
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}