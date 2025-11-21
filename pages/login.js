import { auth, provider } from "../firebase";
import { signInWithPopup, signInWithRedirect } from "firebase/auth";
import { useRouter } from "next/router";
import { useEffect } from "react";
import styles from "../styles/Login.module.css";

export default function Login() {
  const router = useRouter();

  useEffect(() => {
    if (auth.currentUser) {
      router.push("/home");
    }
  }, [router]);

  const dologin = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    try {
      if (isIOS) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    }
      catch (err) {
        console.log(err);
        alert("Erro ao logar");
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>PaceMatch</h1>
      <p className={styles.subtitle}>Conecte. Combine. Corra junto.</p>

      <button className={styles.loginButton} onClick={login}>
        Entrar com Google
      </button>
    </div>
  );
}
