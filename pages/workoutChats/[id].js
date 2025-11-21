import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { db, auth } from "../../firebase";
import { collection, addDoc, onSnapshot, doc, setDoc, orderBy, query } from "firebase/firestore";
import styles from "../../styles/WorkoutChat.module.css";

export default function WorkoutChat() {
  const router = useRouter();
  const { id } = router.query;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return unsub;
  }, []);

  // Carregar dados do treino
  useEffect(() => {
    if (!id) return;
    
    const loadWorkout = async () => {
      try {
        const workoutDoc = await doc(db, "workouts", id);
        const workoutSnap = await getDoc(workoutDoc);
        if (workoutSnap.exists()) {
          setWorkout(workoutSnap.data());
        }
      } catch (error) {
        console.error("Erro ao carregar treino:", error);
      }
    };
    
    loadWorkout();
  }, [id]);

  // Criar documento do treino caso não exista
  useEffect(() => {
    if (!id) return;
    const chatDocRef = doc(db, "workoutChats", id);
    setDoc(chatDocRef, { exists: true }, { merge: true });
  }, [id]);

  // Carregar mensagens em tempo real
  useEffect(() => {
    if (!id) return;
    
    const messagesRef = collection(db, "workoutChats", id, "messages");
    const messagesQuery = query(messagesRef, orderBy("createdAt", "asc"));
    
    const unsub = onSnapshot(messagesQuery, (snap) => {
      const list = snap.docs.map((d) => ({ 
        id: d.id, 
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || new Date()
      }));
      setMessages(list);
      setLoading(false);
    });
    
    return unsub;
  }, [id]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!text.trim() || !user) return;

    try {
      await addDoc(collection(db, "workoutChats", id, "messages"), {
        text: text.trim(),
        user: user.displayName || "Usuário",
        uid: user.uid,
        photo: user.photoURL,
        createdAt: new Date(),
      });
      setText("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      alert("Erro ao enviar mensagem. Tente novamente.");
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.loginMessage}>
          <div className={styles.loginIcon}>🔒</div>
          <h2>Faça login para acessar o chat</h2>
          <p>Entre na sua conta para participar da conversa</p>
          <button 
            onClick={() => router.push("/login")}
            className={styles.loginButton}
          >
            🏃‍♂️ Fazer Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button 
          className={styles.backButton} 
          onClick={() => router.push(`/workout/${id}`)}
        >
          ← Voltar ao Treino
        </button>
        
        <div className={styles.chatInfo}>
          <h1 className={styles.title}>
            💬 Chat do Treino
          </h1>
          {workout && (
            <p className={styles.workoutName}>{workout.name}</p>
          )}
        </div>

        <div className={styles.userInfo}>
          <img
            src={user?.photoURL || "/default-avatar.png"}
            alt="Sua foto"
            className={styles.userAvatar}
          />
        </div>
      </div>

      {/* Área de Mensagens */}
      <div className={styles.messagesContainer}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Carregando mensagens...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyChat}>
            <div className={styles.emptyIcon}>💬</div>
            <h3>Nenhuma mensagem ainda</h3>
            <p>Seja o primeiro a enviar uma mensagem!</p>
          </div>
        ) : (
          <div className={styles.messages}>
            {messages.map((msg) => {
              const isOwnMessage = msg.uid === user.uid;
              return (
                <div 
                  key={msg.id} 
                  className={`${styles.messageWrapper} ${isOwnMessage ? styles.ownMessage : ''}`}
                >
                  <div className={styles.messageCard}>
                    {!isOwnMessage && (
                      <div className={styles.messageHeader}>
                        <img 
                          src={msg.photo || "/default-avatar.png"} 
                          alt={msg.user} 
                          className={styles.messageAvatar}
                        />
                        <div className={styles.messageUserInfo}>
                          <strong className={styles.messageUserName}>{msg.user}</strong>
                          <span className={styles.messageTime}>
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className={styles.messageContent}>
                      <p className={styles.messageText}>{msg.text}</p>
                      {isOwnMessage && (
                        <span className={styles.ownMessageTime}>
                          {formatTime(msg.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Área de Input */}
      <div className={styles.inputArea}>
        <div className={styles.inputContainer}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            className={styles.messageInput}
            maxLength={500}
          />
          <div className={styles.inputActions}>
            <span className={styles.charCount}>
              {text.length}/500
            </span>
            <button 
              className={styles.sendButton} 
              onClick={sendMessage}
              disabled={!text.trim()}
            >
              <span className={styles.sendIcon}>🚀</span>
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}