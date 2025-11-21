// pages/_app.js - VERSÃO ANTI-LOOP
import '../styles/global.css';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import AuthProvider from "../components/AuthProvider";

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🚀 _app.js - Iniciando verificação");
    
    const unsub = onAuthStateChanged(auth, (user) => {
      console.log("👤 _app.js - Usuário:", user ? `LOGADO (${user.email})` : "NÃO LOGADO");
      console.log("📍 _app.js - Rota atual:", router.pathname);

      // ⚠️ **CRUCIAL: SEMPRE FINALIZAR LOADING PRIMEIRO**
      setLoading(false);

      // ⚠️ **EVITAR REDIRECIONAMENTOS CONFLITANTES**
      setTimeout(() => {
        if (!user) {
          // USUÁRIO NÃO LOGADO
          if (router.pathname !== "/login") {
            console.log("➡️ _app.js - Indo para /login (não logado)");
            router.push("/login");
          }
        } else {
          // USUÁRIO LOGADO  
          if (router.pathname === "/login") {
            console.log("➡️ _app.js - Indo para /home (já logado)");
            router.push("/home");
          }
        }
      }, 100);
    });

    // ⏰ TIMEOUT DE SEGURANÇA
    const timeout = setTimeout(() => {
      console.log("⏰ _app.js - Timeout, forçando saída do loading");
      setLoading(false);
    }, 3000);

    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, [router]);

  if (loading) {
    return (
      <div style={{
        background: "#000",
        color: "#fff",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
        flexDirection: "column",
        gap: "10px"
      }}>
        <div>🏃‍♂️ PaceMatch</div>
        <div style={{ fontSize: "14px", color: "#ccc" }}>Carregando...</div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}