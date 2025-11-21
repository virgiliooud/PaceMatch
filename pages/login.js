import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { auth, provider } from "../firebase";
import { signInWithPopup, signInWithRedirect } from "firebase/auth";
import styles from "../styles/Login.module.css";

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        router.replace("/home");
      }
    });
    return unsub;
  }, [router]);

  const dologin = async () => {
    setLoading(true);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    try {
      if (isIOS) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (err) {
      console.log(err);
      alert("Erro ao logar");
      setLoading(false);
    }
  };

  if (user) return <div className={styles.container}>Carregando...</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>PaceMatch</h1>
      <p className={styles.subtitle}>Conecte. Combine. Corra junto.</p>
      <button className={styles.loginButton} onClick={dologin} disabled={loading}>
        {loading ? "Entrando..." : "Entrar com Google"}
      </button>
    </div>
  );
}
