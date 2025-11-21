// pages/login.js - VERSÃO ULTRA-SIMPLES SEM FRESCURA
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { auth, provider } from "../firebase";
import { signInWithPopup } from "firebase/auth";
import styles from "../styles/Login.module.css";

export default function Login() {
  const router = useRouter();
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");

  // ⚠️ **REMOVER VERIFICAÇÃO DE AUTENTICAÇÃO - O _app.js JÁ FAZ ISSO**
  useEffect(() => {
    console.log("📱 Login page - Carregada");
  }, []);

  const handleLogin = async () => {
    setLoginLoading(true);
    setError("");

    try {
      console.log("🚀 Tentando login com popup...");
      
      // 🔥 **SEM REDIRECT - SEMPRE USAR POPUP**
      const result = await signInWithPopup(auth, provider);
      console.log("✅ Login bem-sucedido:", result.user.email);
      
      // ⚠️ **NÃO FAZER REDIRECIONAMENTO AQUI - O _app.js VAI CUIDAR DISSO**
      setLoginLoading(false);
      
    } catch (error) {
      console.error("❌ Erro no login:", error);
      setError(getErrorMessage(error));
      setLoginLoading(false);
    }
  };

  const getErrorMessage = (error) => {
    switch (error.code) {
      case 'auth/popup-blocked':
        return 'Pop-up bloqueado! Permita pop-ups para este site.';
      case 'auth/popup-closed-by-user':
        return 'Você fechou a janela de login.';
      default:
        return 'Erro ao fazer login. Tente novamente.';
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>PaceMatch</h1>
      <p className={styles.subtitle}>Conecte. Combine. Corra junto.</p>
      
      {error && (
        <div style={{
          color: "#ff6b6b", 
          marginBottom: 20,
          padding: "15px",
          background: "rgba(255,107,107,0.1)",
          borderRadius: "10px",
          textAlign: "center"
        }}>
          <strong>Erro:</strong> {error}
        </div>
      )}

      <button
        className={styles.loginButton}
        onClick={handleLogin}
        disabled={loginLoading}
      >
        {loginLoading ? "⏳ Entrando..." : "🚀 Entrar com Google"}
      </button>

      {/* MENSAGEM PARA IPHONE */}
      <div style={{
        marginTop: '20px',
        fontSize: '12px',
        color: '#ccc',
        textAlign: 'center',
        padding: '10px'
      }}>
        💡 <strong>Dica para iPhone:</strong> Se não funcionar, permita pop-ups nas configurações do Safari/Chrome.
      </div>
    </div>
  );
}