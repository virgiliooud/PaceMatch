import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import { collection, addDoc, onSnapshot, doc, setDoc } from "firebase/firestore";
import styles from "../../styles/WorkoutChat.module.css";

export default function WorkoutChat() {
  const router = useRouter();
  const { id } = router.query;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return unsub;
  }, []);

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
    const unsub = onSnapshot(messagesRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(list);
    });
    return unsub;
  }, [id]);

  async function sendMessage() {
    if (!text.trim() || !user) return;

    await addDoc(collection(db, "workoutChats", id, "messages"), {
      text,
      user: user.displayName,
      uid: user.uid,
      photo: user.photoURL,
      createdAt: new Date(),
    });

    setText("");
  }

  return (
    <div className={styles.container}>
      <button className={styles.backButton} onClick={() => router.push(`/workout/${id}`)}>
        ⬅ Voltar ao treino
      </button>

      <h2 className={styles.title}>Chat do Treino</h2>

      <div className={styles.messages}>
        {messages.map((msg) => (
          <div key={msg.id} className={styles.messageCard}>
            <div className={styles.messageHeader}>
              <img src={msg.photo} alt={msg.user} />
              <strong>{msg.user}</strong>
            </div>
            <p className={styles.messageText}>{msg.text}</p>
          </div>
        ))}
      </div>

      <div className={styles.inputArea}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite sua mensagem..."
        />
        <button className={styles.sendButton} onClick={sendMessage}>
          Enviar
        </button>
      </div>
    </div>
  );
}
