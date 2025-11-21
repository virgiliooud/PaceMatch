import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import styles from "../styles/CreateWorkout.module.css";

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

export default function CreateWorkout() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userPlano, setUserPlano] = useState("basic");
  const [loading, setLoading] = useState(false);

  // Estados do formulário
  const [formData, setFormData] = useState({
    name: "",
    type: "running",
    location: "",
    date: "",
    time: "",
    pace: "",
    paceMin: "",
    paceMax: "",
    distance: "",
    description: "",
    isPrivate: false,
    route: []
  });

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          const plano = userDoc.exists() ? userDoc.data().plano || "basic" : "basic";
          setUserPlano(plano);
        } catch (error) {
          console.error("Erro ao buscar plano:", error);
        }
      } else {
        router.push("/login");
      }
    });
    return unsub;
  }, [router]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handlePaceChange = (e) => {
    const paceValue = e.target.value;
    setFormData(prev => ({
      ...prev,
      pace: paceValue,
      // Define min e max automaticamente baseado no pace selecionado
      paceMin: paceValue,
      paceMax: paceValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Você precisa estar logado para criar um treino!");
      return;
    }

    // Validações básicas
    if (!formData.name.trim()) {
      alert("Por favor, insira um nome para o treino!");
      return;
    }

    if (!formData.location) {
      alert("Por favor, selecione uma cidade!");
      return;
    }

    if (!formData.date || !formData.time) {
      alert("Por favor, insira data e hora do treino!");
      return;
    }

    if (!formData.pace) {
      alert("Por favor, selecione um pace!");
      return;
    }

    setLoading(true);

    try {
      const workoutData = {
        ...formData,
        createdBy: user.uid,
        createdByName: user.displayName || user.email,
        createdAt: serverTimestamp(),
        participants: [user.uid], // Criador é automaticamente participante
        participantCount: 1
      };

      const docRef = await addDoc(collection(db, "workouts"), workoutData);
      
      console.log("✅ Treino criado com ID:", docRef.id);
      alert("Treino criado com sucesso!");
      router.push("/");
      
    } catch (error) {
      console.error("❌ Erro ao criar treino:", error);
      alert("Erro ao criar treino. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button 
          onClick={() => router.back()} 
          className={styles.backButton}
        >
          ← Voltar
        </button>
        
        <div className={styles.userSection}>
          <img
            src={user?.photoURL || "/default-avatar.png"}
            alt="Foto"
            className={styles.profileImg}
          />
          <div className={`${styles.planoBadge} ${userPlano === "premium" ? styles.premium : styles.basic}`}>
            {userPlano === "premium" ? "⭐ Premium" : "🔹 Básico"}
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>🏃‍♂️ Criar Novo Treino</h1>
        <p className={styles.subtitle}>Compartilhe seu treino e encontre parceiros</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Nome do Treino */}
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>
              Nome do Treino *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex: Corrida no Parque, Treino Longo Domingo..."
              className={styles.input}
              required
            />
          </div>

          {/* Tipo de Treino */}
          <div className={styles.formGroup}>
            <label htmlFor="type" className={styles.label}>
              Tipo de Treino
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              className={styles.select}
            >
              <option value="running">🏃‍♂️ Corrida</option>
              <option value="cycling">🚴‍♂️ Ciclismo</option>
              <option value="walking">🚶‍♂️ Caminhada</option>
              <option value="trail">🥾 Trail Running</option>
            </select>
          </div>

          {/* Localização */}
          <div className={styles.formGroup}>
            <label htmlFor="location" className={styles.label}>
              Cidade *
            </label>
            <select
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className={styles.select}
              required
            >
              <option value="">Selecione uma cidade</option>
              {cidades.map((cidade) => (
                <option key={cidade} value={cidade}>
                  {cidade}
                </option>
              ))}
            </select>
          </div>

          {/* Data e Hora */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="date" className={styles.label}>
                Data *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className={styles.input}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="time" className={styles.label}>
                Hora *
              </label>
              <input
                type="time"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className={styles.input}
                required
              />
            </div>
          </div>

          {/* Pace */}
          <div className={styles.formGroup}>
            <label htmlFor="pace" className={styles.label}>
              Pace (min/km) *
            </label>
            <select
              id="pace"
              name="pace"
              value={formData.pace}
              onChange={handlePaceChange}
              className={styles.select}
              required
            >
              <option value="">Selecione o pace</option>
              {paceOptions.map((pace) => (
                <option key={pace} value={pace}>
                  {pace} min/km
                </option>
              ))}
            </select>
          </div>

          {/* Distância */}
          <div className={styles.formGroup}>
            <label htmlFor="distance" className={styles.label}>
              Distância (km) - Opcional
            </label>
            <input
              type="number"
              id="distance"
              name="distance"
              value={formData.distance}
              onChange={handleChange}
              placeholder="Ex: 5, 10, 21.1..."
              step="0.1"
              min="0"
              className={styles.input}
            />
          </div>

          {/* Descrição */}
          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Descrição - Opcional
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Descreva seu treino, local de encontro, observações..."
              rows="4"
              className={styles.textarea}
            />
          </div>

          {/* Treino Privado */}
          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="isPrivate"
                checked={formData.isPrivate}
                onChange={handleChange}
                className={styles.checkbox}
              />
              <span className={styles.checkboxText}>
                🔒 Tornar treino privado
              </span>
            </label>
            <small className={styles.helpText}>
              Treinos privados são visíveis apenas para participantes convidados
            </small>
          </div>

          {/* Botões */}
          <div className={styles.buttonGroup}>
            <button
              type="button"
              onClick={() => router.back()}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "Criando..." : "🎯 Criar Treino"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}