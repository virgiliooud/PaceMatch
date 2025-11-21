import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { auth, provider } from "../firebase";
import { signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import styles from "../styles/Login.module.css";

export default function Login() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // 🔧 CORREÇÃO PARA SAFARI: Verificar se há resultado de redirecionamento
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log("Redirect result encontrado:", result.user);
          setUser(result.user);
          router.replace("/home");
          return;
        }
      } catch (err) {
        console.error("Erro no redirect result:", err);
      }

      // Se não há redirect, verifica auth state normal
      const unsub = auth.onAuthStateChanged(
        (u) => {
          console.log("Auth state changed:", u);
          setUser(u);
          setCheckingAuth(false);
          if (u) {
            router.replace("/home");
          }
        },
        (err) => {
          console.error("onAuthStateChanged ERROR:", err);
          setCheckingAuth(false);
          setError(err?.message || "Erro na autenticação");
        }
      );
      
      return unsub;
    };

    checkRedirectResult();
  }, [router]);

  const doLogin = async () => {
    setLoginLoading(true);
    setError("");
    try {
      // 🔧 CORREÇÃO: Detecção mais robusta de dispositivos iOS/Safari
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
      
      console.log("User Agent:", navigator.userAgent);
      console.log("isIOS:", isIOS, "isSafari:", isSafari);

      // Usar redirect para iOS/Safari
      if (isIOS || isSafari) {
        console.log("Usando signInWithRedirect para Safari/iOS");
        await signInWithRedirect(auth, provider);
        // Não setar loading false aqui - o redirect vai acontecer
        return;
      } else {
        console.log("Usando signInWithPopup para outros navegadores");
        await signInWithPopup(auth, provider);
        setLoginLoading(false);
      }
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setError(err?.message || "Erro ao fazer login");
      setLoginLoading(false);
    }
  };

  // 🔧 CORREÇÃO: Timeout para evitar tela preta infinita no Safari
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (checkingAuth) {
        console.log("Timeout - forçando saída do loading");
        setCheckingAuth(false);
      }
    }, 5000); // 5 segundos máximo

    return () => clearTimeout(timeout);
  }, [checkingAuth]);

  // 🔧 CORREÇÃO: Loading mais informativo
  if (checkingAuth) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>PaceMatch</h1>
        <p className={styles.subtitle}>Conecte. Combine. Corra junto.</p>
        <div style={{ 
          marginTop: 20, 
          color: '#fff',
          textAlign: 'center'
        }}>
          <div>Verificando autenticação...</div>
          <div style={{ 
            fontSize: '12px', 
            color: '#ccc',
            marginTop: '10px'
          }}>
            Se demorar, recarregue a página
          </div>
        </div>
      </div>
    );
  }

  // Se já está logado, não mostra nada (vai redirecionar)
  if (user) {
    return (
      <div className={styles.container}>
        <div style={{ color: '#fff', textAlign: 'center' }}>
          Redirecionando...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>PaceMatch</h1>
      <p className={styles.subtitle}>Conecte. Combine. Corra junto.</p>
      
      {error && (
        <div style={{
          color: "red", 
          marginBottom: 12,
          padding: "10px",
          background: "rgba(255,0,0,0.1)",
          borderRadius: "5px",
          textAlign: "center"
        }}>
          Erro: {error}
        </div>
      )}

      <button
        className={styles.loginButton}
        onClick={doLogin}
        disabled={loginLoading}
      >
        {loginLoading ? "Entrando..." : "Entrar com Google"}
      </button>

      {/* 🔧 CORREÇÃO: Mensagem específica para Safari */}
      <div style={{
        marginTop: '20px',
        fontSize: '12px',
        color: '#ccc',
        textAlign: 'center'
      }}>
        {navigator.userAgent.toLowerCase().includes('safari') && 
         !navigator.userAgent.toLowerCase().includes('chrome') && 
         "No Safari, você será redirecionado para o login do Google"}
      </div>
    </div>
  );
}