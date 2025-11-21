// pages/_app.js
import '../styles/global.css';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import AuthProvider from "../components/AuthProvider";

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [initialCheck, setInitialCheck] = useState(true);

  useEffect(() => {
    console.log("🔄 _app.js - Iniciando verificação de autenticação");
    
    const unsub = onAuthStateChanged(auth, (user) => {
      console.log("🔍 _app.js - Estado do usuário:", user ? `Logado (${user.email})` : "Não logado");
      console.log("📍 _app.js - Página atual:", router.pathname);

      // ⚠️ EVITAR REDIRECIONAMENTOS DURANTE O CARREGAMENTO INICIAL
      if (initialCheck) {
        console.log("🚫 _app.js - Ignorando redirecionamentos no carregamento inicial");
        setInitialCheck(false);
        setLoading(false);
        return;
      }

      // 🔧 LÓGICA DE REDIRECIONAMENTO CORRIGIDA
      if (!user) {
        // Usuário NÃO logado
        if (router.pathname !== "/login") {
          console.log("🔒 _app.js - Não logado, redirecionando para /login");
          router.push("/login");
        }
      } else {
        // Usuário LOGADO
        if (router.pathname === "/login") {
          console.log("✅ _app.js - Já logado, redirecionando para /home");
          router.push("/home");
        }
      }

      setLoading(false);
    });

    // ⏰ TIMEOUT DE SEGURANÇA - Evita loading infinito
    const timeoutId = setTimeout(() => {
      console.log("⏰ _app.js - Timeout de segurança, forçando saída do loading");
      setLoading(false);
      setInitialCheck(false);
    }, 3000);

    return () => {
      unsub();
      clearTimeout(timeoutId);
    };
  }, [router, initialCheck]);

  // 🔧 LOADING MELHORADO
  if (loading) {
    return (
      <div style={{
        background: "#000",
        color: "#fff",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "20px",
        flexDirection: "column",
        gap: "15px"
      }}>
        <div>🏃‍♂️ PaceMatch</div>
        <div style={{ 
          fontSize: "14px", 
          color: "#ccc",
          textAlign: "center"
        }}>
          Iniciando aplicação...
          <br />
          <span style={{ fontSize: "12px" }}>Aguarde alguns segundos</span>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}