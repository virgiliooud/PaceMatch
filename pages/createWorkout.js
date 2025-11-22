import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { useRouter } from "next/router";
import styles from "../styles/CreateWorkout.module.css";
import dynamic from 'next/dynamic';

const MapCreator = dynamic(() => import("../components/MapCreator"), {
  ssr: false,
  loading: () => (
    <div style={{ 
      height: "350px", 
      width: "100%", 
      background: "#333", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      color: "#fff",
      borderRadius: "8px",
      marginBottom: "20px"
    }}>
      Carregando mapa...
    </div>
  )
});

const cidades = [
  "São Paulo",
  "Rio de Janeiro",
  "Florianópolis e região",
  "Belo Horizonte",
  "Curitiba",
  "Porto Alegre",
  "Brasília",
  "Recife",
  "Fortaleza",
  "Salvador",
];

const generatePaceOptions = () => {
  const options = [];
  for (let min = 2; min <= 10; min++) {
    for (let sec = (min === 2 ? 30 : 0); sec < 60; sec += 15) {
      if (min === 10 && sec > 0) break;
      const paceValue = `${min}:${sec.toString().padStart(2, '0')}`;
      options.push(paceValue);
    }
  }
  return options;
};

const paceOptions = generatePaceOptions();

export default function CreateWorkout() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [paceMin, setPaceMin] = useState("");
  const [paceMax, setPaceMax] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [route, setRoute] = useState([]);
  const [distance, setDistance] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [routeMethod, setRouteMethod] = useState("map");
  const [customDistance, setCustomDistance] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isSubmitting) {
      setHasUnsavedChanges(false);
      return;
    }

    if (name || type || paceMin || paceMax || location || date || time || route.length > 0 || customDistance) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [name, type, paceMin, paceMax, location, date, time, route, customDistance, isSubmitting]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Tem certeza que quer sair? Seus dados serão perdidos!';
        return 'Tem certeza que quer sair? Seus dados serão perdidos!';
      }
    };

    const handleRouteChange = (url) => {
      if (hasUnsavedChanges && url !== router.asPath) {
        setShowExitConfirm(true);
        router.events.emit('routeChangeError');
        throw 'Route change aborted.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [hasUnsavedChanges, router]);

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
    } else {
      router.back();
    }
  };

  const confirmExit = () => {
    setShowExitConfirm(false);
    setHasUnsavedChanges(false);
    router.back();
  };

  const cancelExit = () => {
    setShowExitConfirm(false);
  };

  useEffect(() => {
    if (routeMethod === "distance") {
      setRoute(prev => prev.length > 1 ? [prev[0]] : prev);
      setDistance(0);
    }
  }, [routeMethod]);

  const handleMapClick = (waypoints, dist) => {
    if (routeMethod === "distance") {
      if (waypoints.length > 0) {
        setRoute([waypoints[0]]);
        setDistance(0);
      }
    } else {
      setRoute(waypoints);
      setDistance(dist || 0);
    }
  };

  const handleClearRoute = () => {
    setRoute([]);
    setDistance(0);
    if (routeMethod === "distance") {
      setCustomDistance("");
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    
    console.log("🚀 INICIANDO CRIAÇÃO DE TREINO...");
    setIsSubmitting(true);
    
    if (!user) {
      alert("❌ Você precisa estar logado!");
      setIsSubmitting(false);
      return;
    }

    console.log("✅ Usuário logado:", user.uid, user.email);

    if (isPrivate && password.trim().length < 4) {
      alert("Para criar um treino privado, informe uma senha com pelo menos 4 caracteres.");
      setIsSubmitting(false);
      return;
    }

    if (!paceMin || !paceMax) {
      alert("Selecione o intervalo de pace!");
      setIsSubmitting(false);
      return;
    }

    if (routeMethod === "map" && route.length < 2) {
      alert("Crie uma rota com pelo menos 2 pontos no mapa!");
      setIsSubmitting(false);
      return;
    }

    if (routeMethod === "distance" && (!customDistance || parseFloat(customDistance) <= 0)) {
      alert("Informe uma distância válida!");
      setIsSubmitting(false);
      return;
    }

    if (routeMethod === "distance" && route.length === 0) {
      alert("Marque o ponto de início no mapa!");
      setIsSubmitting(false);
      return;
    }

    console.log("🔍 DEBUG - Antes de salvar:");
    console.log("User:", user);
    console.log("User UID:", user?.uid);
    console.log("Workout Data:", {
      name, type, paceMin, paceMax, location, date, time,
      routeLength: route.length,
      distance, routeMethod, customDistance
    });

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
      const criadosIds = criadosSnap.docs.map((doc) => doc.id);
      const entrouIds = entrouSnap.docs.map((doc) => doc.id);
      const totalUnico = new Set([...criadosIds, ...entrouIds]).size;

      if (totalUnico >= 3) {
        setShowLimitModal(true);
        setIsSubmitting(false);
        return;
      }
    }

    const serializedRoute = route.map(point => ({
      lat: Number(point.lat),
      lng: Number(point.lng)
    }));

    const pointsToSave = routeMethod === "map" ? serializedRoute : [serializedRoute[0]];
    const finalDistance = routeMethod === "map" ? distance : parseFloat(customDistance);

    const serializedStartPoint = route.length > 0 ? {
      lat: Number(route[0].lat),
      lng: Number(route[0].lng)
    } : null;

    if (!name || !type || !location || !date || !time) {
      alert("Preencha todos os campos!");
      setIsSubmitting(false);
      return;
    }

    try {
      const workoutData = {
        name: name.trim(),
        type: type.trim(),
        pace: `${paceMin} - ${paceMax}`,
        paceMin: paceMin,
        paceMax: paceMax,
        location: location,
        date: date,
        time: time,
        route: pointsToSave,
        distance: Number(finalDistance.toFixed(2)),
        routeMethod: routeMethod,
        startPoint: routeMethod === "distance" ? serializedStartPoint : null,
        participants: [user.uid],
        creatorId: user.uid,
        createdAt: Timestamp.now(),
        isPrivate: isPrivate,
        password: isPrivate ? password.trim() : null,
      };

      console.log("📤 ENVIANDO PARA FIREBASE:");
      console.log(JSON.stringify(workoutData, null, 2));

      const docRef = await addDoc(collection(db, "workouts"), workoutData);
      
      console.log("✅ TREINO CRIADO COM SUCESSO! ID:", docRef.id);
      
      const savedDoc = await getDoc(docRef);
      if (savedDoc.exists()) {
        console.log("✅ CONFIRMADO: Treino salvo no Firebase:", savedDoc.data());
        alert("🎉 Treino criado com sucesso!");
        setHasUnsavedChanges(false);
        setIsSubmitting(false);
        router.push("/home");
      } else {
        throw new Error("Treino não foi salvo no Firebase");
      }

    } catch (error) {
      console.error("❌ ERRO CRÍTICO AO CRIAR TREINO:");
      console.error("Código:", error.code);
      console.error("Mensagem:", error.message);
      console.error("Stack:", error.stack);
      
      alert(`Erro ao criar treino: ${error.message}`);
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.container}>
      {showExitConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Sair sem salvar?</h2>
            <p>Tem certeza que quer sair? Todo o treino não salvo será perdido!</p>
            <div className={styles.modalButtons}>
              <button className={styles.cancelButton} onClick={cancelExit}>
                Cancelar
              </button>
              <button className={styles.confirmButton} onClick={confirmExit}>
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.header}>
        <button onClick={handleBackClick} className={styles.backButton}>
          ← Voltar
        </button>
        <h1 className={styles.titulo}>Criar Novo Treino</h1>
      </div>

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
          <label className={styles.label}>Pace (min/km)</label>
          <div className={styles.paceRange}>
            <select
              className={styles.paceSelect}
              value={paceMin}
              onChange={(e) => setPaceMin(e.target.value)}
              required
            >
              <option value="">De...</option>
              {paceOptions.map((pace) => (
                <option key={`min-${pace}`} value={pace}>
                  {pace}
                </option>
              ))}
            </select>
            <span className={styles.paceSeparator}>até</span>
            <select
              className={styles.paceSelect}
              value={paceMax}
              onChange={(e) => setPaceMax(e.target.value)}
              required
            >
              <option value="">Até...</option>
              {paceOptions.map((pace) => (
                <option key={`max-${pace}`} value={pace}>
                  {pace}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Cidade</label>
          <select
            className={styles.input}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          >
            <option value="">Selecione...</option>
            {cidades.map((cidade) => (
              <option value={cidade} key={cidade}>
                {cidade}
              </option>
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

        <div className={styles.inputGroup}>
          <label className={styles.label}>Método de Rota</label>
          <div className={styles.routeMethod}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                value="map"
                checked={routeMethod === "map"}
                onChange={(e) => setRouteMethod(e.target.value)}
              />
              Marcar trajeto completo no mapa
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                value="distance"
                checked={routeMethod === "distance"}
                onChange={(e) => setRouteMethod(e.target.value)}
              />
              Definir distância manual (apenas ponto de início)
            </label>
          </div>
        </div>

        {routeMethod === "distance" && (
          <div className={styles.inputGroup}>
            <label className={styles.label}>Distância (km)</label>
            <input
              className={styles.input}
              type="number"
              step="0.1"
              min="0.1"
              value={customDistance}
              onChange={(e) => setCustomDistance(e.target.value)}
              required={routeMethod === "distance"}
              placeholder="Ex: 5.0"
            />
          </div>
        )}

        <div className={styles.mapSection}>
          <div className={styles.mapContainer}>
            <MapCreator
              route={route}
              onRouteChange={handleMapClick}
              singlePoint={routeMethod === "distance"}
              showRemoveButtons={false}
            />
          </div>
          
          <div className={styles.routeSummary}>
            {routeMethod === "map" ? (
              <>
                <div className={styles.summaryItem}>
                  <span>📍 Pontos na rota:</span>
                  <strong>{route.length}</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>📏 Distância:</span>
                  <strong>{distance.toFixed(2)} km</strong>
                </div>
                
                {route.length > 0 && (
                  <button
                    type="button"
                    className={styles.clearRouteButton}
                    onClick={handleClearRoute}
                  >
                    🗑️ Limpar Rota
                  </button>
                )}
                
                <div className={styles.instructions}>
                  💡 Clique no mapa para ADICIONAR pontos • Clique nos pontos para REMOVER
                </div>
              </>
            ) : (
              <>
                <div className={styles.summaryItem}>
                  <span>📍 Ponto de início:</span>
                  <strong>{route.length > 0 ? "Definido" : "Não definido"}</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>📏 Distância:</span>
                  <strong>{customDistance || "0"} km</strong>
                </div>
                
                {route.length > 0 && (
                  <button
                    type="button"
                    className={styles.clearRouteButton}
                    onClick={handleClearRoute}
                  >
                    🗑️ Remover Ponto de Início
                  </button>
                )}
                
                <div className={styles.instructions}>
                  💡 Clique no mapa para DEFINIR o ponto de início
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>
            Treino Privado?{" "}
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
          </label>
        </div>

        {isPrivate && (
          <div className={styles.inputGroup}>
            <label className={styles.label}>Senha para o treino</label>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={isPrivate}
              minLength={4}
            />
          </div>
        )}

        <button
          className={styles.submitButton}
          type="submit"
          disabled={
            routeMethod === "map" 
              ? route.length < 2 
              : routeMethod === "distance" 
                ? !customDistance || parseFloat(customDistance) <= 0 || route.length === 0
                : true
          }
        >
          {isSubmitting ? (
            <>
              <div className={styles.spinner}></div>
              Salvando...
            </>
          ) : routeMethod === "map" && route.length < 2 ? (
            "Adicione pelo menos 2 pontos no mapa"
          ) : routeMethod === "distance" && (!customDistance || parseFloat(customDistance) <= 0) ? (
            "Informe uma distância válida"
          ) : routeMethod === "distance" && route.length === 0 ? (
            "Marque o ponto de início no mapa"
          ) : (
            "Criar Treino"
          )}
        </button>
      </form>

      {showLimitModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Limite atingido!</h2>
            <p>
              No plano básico, você só pode participar ou criar até{" "}
              <b>3 treinos</b> no mês.
              <br />
              Para liberar treinos ilimitados, assine o Premium!
            </p>
            <div className={styles.modalButtons}>
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
        </div>
      )}
    </div>
  );
}