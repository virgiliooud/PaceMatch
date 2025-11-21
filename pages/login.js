import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { auth, provider } from "../firebase";
import { signInWithPopup, signInWithRedirect } from "firebase/auth";
import styles from "../styles/Login.module.css";

export default function Login() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(
      (u) => {
        setUser(u);
        setCheckingAuth(false);
        if (u) {
          router.replace("/home");
        }
      },
      (err) => {
        setCheckingAuth(false);
        setError(err?.message || "Erro desconhecido na autenticação");
        console.error("onAuthStateChanged ERROR:", err);
      }
    );
    return unsub;
  }, [router]);

  const dologin = async () => {
    setLoginLoading(true);
    setError("");
    try {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (err) {
      setError(err?.message || "Erro ao logar");
      setLoginLoading(false);
      console.error("LOGIN ERROR:", err);
    }
  };

  if (checkingAuth)
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>PaceMatch</h1>
        <p className={styles.subtitle}>Conecte. Combine. Corra junto.</p>
        <div style={{marginTop: 20}}>Carregando...</div>
      </div>
    );
  // Se logado, não mostra login (protegido via .replace)
  if (user) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>PaceMatch</h1>
      <p className={styles.subtitle}>Conecte. Combine. Corra junto.</p>
      {error && (
        <div style={{color:"red",marginBottom:12}}>
          Erro: {error}
        </div>
      )}
      <button
        className={styles.loginButton}
        onClick={dologin}
        disabled={loginLoading}
      >
        {loginLoading ? "Entrando..." : "Entrar com Google"}
      </button>
    </div>
  );
}
