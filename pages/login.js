// pages/login.js - VERSÃO DEFINITIVA PARA IPHONE
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { auth, provider } from "../firebase";
import { signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import styles from "../styles/Login.module.css";

export default function Login() {
  const router = useRouter();
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 🔧 DETECTAR iOS CORRETAMENTE
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);
    
    console.log("📱 Dispositivo iOS:", isIOSDevice);
    console.log("👤 User Agent:", navigator.userAgent);

    // 🔧 VERIFICAR REDIRECT RESULT (CRUCIAL PARA IPHONE)
    const checkRedirect = async () => {
      try {
        console.log("🔄 Verificando resultado de redirect...");
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("✅ Login via redirect bem-sucedido!");
          console.log("👤 Usuário:", result.user.email);
          router.replace("/home");
          return;
        }
      } catch (redirectError) {
        console.error("❌ Erro no redirect:", redirectError);
      }

      // 🔧 VERIFICAR SE JÁ ESTÁ LOGADO
      const unsubscribe = auth.onAuthStateChanged((user) => {
        console.log("🔍 Estado da autenticação:", user ? `Logado (${user.email})` : "Não logado");
        
        if (user) {
          console.log("✅ Usuário já logado, redirecionando para /home");
          router.replace("/home");
        }
      });

      return unsubscribe;
    };

    checkRedirect();
  }, [router]);

  const handleLogin = async () => {
    setLoginLoading(true);
    setError("");

    try {
      console.log("🚀 Iniciando processo de login...");
      console.log("📱 É iOS?", isIOS);

      if (isIOS) {
        // 🔥 IPHONE: SEMPRE USAR REDIRECT
        console.log("📱 Usando signInWithRedirect para iPhone");
        await signInWithRedirect(auth, provider);
        // ⚠️ NÃO CHAME setLoginLoading(false) AQUI!
        // O app vai ser redirecionado e recarregado
      } else {
        // 💻 OUTROS DISPOSITIVOS: USAR POPUP
        console.log("💻 Usando signInWithPopup para outros dispositivos");
        const result = await signInWithPopup(auth, provider);
        console.log("✅ Login popup bem-sucedido:", result.user.email);
        setLoginLoading(false);
        // O onAuthStateChanged vai redirecionar automaticamente
      }
    } catch (error) {
      console.error("❌ Erro durante o login:", error);
      console.error("🔍 Código do erro:", error.code);
      console.error("🔍 Mensagem do erro:", error.message);
      
      setError(getErrorMessage(error));
      setLoginLoading(false);
    }
  };

  // 🔧 TRADUZIR ERROS DO FIREBASE
  const getErrorMessage = (error) => {
    const errorCode = error.code;
    
    switch (errorCode) {
      case 'auth/popup-blocked':
        return 'Pop-up bloqueado! Permita pop-ups para este site.';
      case 'auth/popup-closed-by-user':
        return 'Login cancelado. Feche a janela?';
      case 'auth/network-request-failed':
        return 'Erro de conexão. Verifique sua internet.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas. Tente novamente mais tarde.';
      default:
        return error.message || 'Erro desconhecido ao fazer login';
    }
  };

  // 🔧 LOADING ESPECÍFICO PARA IPHONE
  if (loginLoading && isIOS) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>PaceMatch</h1>
        <p className={styles.subtitle}>Conecte. Combine. Corra junto.</p>
        <div style={{ 
          marginTop: 40, 
          color: '#fff',
          textAlign: 'center',
          padding: '30px'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '15px' }}>🔗</div>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>Redirecionando...</div>
          <div style={{ 
            fontSize: '14px', 
            color: '#ccc',
            marginTop: '15px',
            lineHeight: '1.5'
          }}>
            Você está sendo redirecionado para o Google.<br/>
            Aguarde o processo automático.
          </div>
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
          color: "#ff6b6b", 
          marginBottom: 20,
          padding: "15px",
          background: "rgba(255,107,107,0.1)",
          borderRadius: "10px",
          textAlign: "center",
          border: "1px solid rgba(255,107,107,0.3)"
        }}>
          <strong>Erro:</strong> {error}
          <br />
          <div style={{ marginTop: '12px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                background: '#479b3d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔄 Recarregar
            </button>
            <button 
              onClick={() => setError("")}
              style={{
                padding: '8px 16px',
                background: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ✕ Limpar
            </button>
          </div>
        </div>
      )}

      <button
        className={styles.loginButton}
        onClick={handleLogin}
        disabled={loginLoading}
        style={{
          opacity: loginLoading ? 0.7 : 1,
          cursor: loginLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {loginLoading ? (
          <span>⏳ Entrando...</span>
        ) : (
          <span>🚀 Entrar com Google</span>
        )}
      </button>

      {/* 🔧 INFORMAÇÕES ESPECÍFICAS PARA IPHONE */}
      {isIOS && !loginLoading && (
        <div style={{
          marginTop: '25px',
          fontSize: '13px',
          color: '#ddd',
          textAlign: 'center',
          maxWidth: '320px',
          background: 'rgba(255,255,255,0.05)',
          padding: '15px',
          borderRadius: '8px',
          lineHeight: '1.5'
        }}>
          <div style={{ fontSize: '15px', marginBottom: '8px', fontWeight: 'bold' }}>📱 Instruções para iPhone</div>
          • Você será redirecionado para o Google<br/>
          • Faça seu login normalmente<br/>
          • <strong>Permita o redirecionamento</strong> de volta para o app<br/>
          • O processo é automático após o login
        </div>
      )}

      {/* 🔧 BOTÃO DE DEBUG - APENAS PARA DESENVOLVIMENTO */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => {
            console.log("🐛 DEBUG INFO:");
            console.log("User Agent:", navigator.userAgent);
            console.log("isIOS:", isIOS);
            console.log("Auth Current User:", auth.currentUser);
          }}
          style={{
            marginTop: '15px',
            padding: '5px 10px',
            background: 'transparent',
            color: '#666',
            border: '1px solid #666',
            borderRadius: '4px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          🐛 Debug Info
        </button>
      )}
    </div>
  );
}