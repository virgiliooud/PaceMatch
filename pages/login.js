import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { auth, provider } from "../firebase";
import { signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged } from "firebase/auth";
import styles from "../styles/Login.module.css";

export default function Login() {
  const router = useRouter();
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 🔧 DETECTAR iOS
    const userAgent = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);
    
    console.log("User Agent:", userAgent);
    console.log("isIOS:", isIOSDevice);

    // 🔧 SOLUÇÃO PARA iPHONE: Gerenciamento de estado de auth simplificado
    const unsub = onAuthStateChanged(auth, (user) => {
      console.log("Auth State Changed - User:", user);
      
      if (user) {
        console.log("Usuário logado, redirecionando para /home");
        // Usar replace para evitar histórico de navegação problemático
        router.replace("/home");
      } else {
        console.log("Nenhum usuário logado");
      }
    });

    // 🔧 IMPORTANTE: No iOS, verificar se há resultado de redirect pendente
    if (isIOSDevice) {
      const checkRedirect = async () => {
        try {
          console.log("Verificando redirect result no iOS...");
          const result = await getRedirectResult(auth);
          if (result?.user) {
            console.log("Redirect result encontrado:", result.user);
            // O onAuthStateChanged vai capturar isso e redirecionar
          }
        } catch (err) {
          console.error("Erro no redirect check:", err);
        }
      };
      checkRedirect();
    }

    return unsub;
  }, [router]);

  const doLogin = async () => {
    setLoginLoading(true);
    setError("");
    
    try {
      console.log("Iniciando login... isIOS:", isIOS);

      // 🔧 ESTRATÉGIA DIFERENCIADA PARA iOS
      if (isIOS) {
        console.log("Usando signInWithRedirect para iOS");
        
        // IMPORTANTE: No iOS, usar redirect é mais confiável
        await signInWithRedirect(auth, provider);
        
        // Não setar loading false - o app vai recarregar
        return;
      } else {
        console.log("Usando signInWithPopup para outros dispositivos");
        const result = await signInWithPopup(auth, provider);
        console.log("Login popup success:", result.user);
        
        // No popup, podemos setar loading como false
        setLoginLoading(false);
        
        // O onAuthStateChanged vai capturar a mudança e redirecionar
      }
    } catch (err) {
      console.error("ERRO NO LOGIN:", err);
      setError(err?.message || "Erro ao fazer login");
      setLoginLoading(false);
    }
  };

  // 🔧 Loading específico para iOS
  if (loginLoading && isIOS) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>PaceMatch</h1>
        <p className={styles.subtitle}>Conecte. Combine. Corra junto.</p>
        <div style={{ 
          marginTop: 20, 
          color: '#fff',
          textAlign: 'center'
        }}>
          <div>🔗 Redirecionando para login...</div>
          <div style={{ 
            fontSize: '12px', 
            color: '#ccc',
            marginTop: '10px'
          }}>
            Se não redirecionar automaticamente, volte para o app
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
          color: "red", 
          marginBottom: 12,
          padding: "10px",
          background: "rgba(255,0,0,0.1)",
          borderRadius: "5px",
          textAlign: "center"
        }}>
          Erro: {error}
          <br />
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '10px',
              padding: '5px 10px',
              background: '#479b3d',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Tentar Novamente
          </button>
        </div>
      )}

      <button
        className={styles.loginButton}
        onClick={doLogin}
        disabled={loginLoading}
      >
        {loginLoading ? "Entrando..." : "Entrar com Google"}
      </button>

      {/* 🔧 Instruções específicas para iPhone */}
      {isIOS && (
        <div style={{
          marginTop: '20px',
          fontSize: '12px',
          color: '#ccc',
          textAlign: 'center',
          maxWidth: '300px',
          background: 'rgba(255,255,255,0.1)',
          padding: '10px',
          borderRadius: '5px'
        }}>
          📱 <strong>Para iPhone:</strong><br/>
          • Você será redirecionado para o Google<br/>
          • Após login, volte automaticamente para o app<br/>
          • Se travar, feche e abra o app novamente
        </div>
      )}
    </div>
  );
}