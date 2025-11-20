import { useState } from "react";
import styles from '../styles/Assinatura.module.css';

export default function Assinatura() {
  const [loading, setLoading] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Erro ao criar sessão de pagamento.");
      }
    } catch {
      alert("Erro ao conectar com o Stripe.");
    }
    setLoading(false);
  };

  // Função para produto teste (0,20)
  const handleSubscribeTest = async () => {
    setLoadingTest(true);
    try {
      const res = await fetch("/api/create-checkout-teste", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Erro ao criar sessão de teste.");
      }
    } catch {
      alert("Erro ao conectar com o Stripe (teste).");
    }
    setLoadingTest(false);
  };

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.titulo}>Escolha seu plano</h1>
      <div className={styles.cardContainer}>
        {/* Plano Básico */}
        <div className={`${styles.card} ${styles.basic}`}>
          <h2 className={styles.cardTitulo}>Básico</h2>
          <p className={styles.price}>Grátis</p>
          <ul className={styles.features}>
            <li>Participa/Criar até <b>3 treinos/mês</b></li>
            <li>Acesso ao mapa e rotas</li>
            <li>Visualiza participantes</li>
          </ul>
        </div>
        {/* Plano Premium */}
        <div className={`${styles.card} ${styles.premium}`}>
          <h2 className={styles.cardTitulo}>Premium</h2>
          <p className={styles.price}>R$ 14,90/mês</p>
          <ul className={styles.features}>
            <li><b>Treinos ilimitados</b>: participe e crie sem limite</li>
            <li>Prioridade no suporte</li>
            <li>Receba notificações exclusivas</li>
            <li>Acesso a futuras funções avançadas</li>
          </ul>
          <button
            className={styles.subscribeButton}
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? "Carregando..." : "Assinar Agora"}
          </button>
        </div>
        {/* Caixa de Checkout Teste */}
        <div className={`${styles.card} ${styles.teste}`}>
          <h2 className={styles.cardTitulo}>Teste Stripe</h2>
          <p className={styles.price}>R$ 0,20 (para testar)</p>
          <ul className={styles.features}>
            <li>Compra de teste integrando o Stripe</li>
            <li>Ideal para conferir o funcionamento</li>
          </ul>
          <button
            className={styles.subscribeButton}
            onClick={handleSubscribeTest}
            disabled={loadingTest}
          >
            {loadingTest ? "Carregando..." : "Testar Checkout"}
          </button>
        </div>
      </div>
    </div>
  );
}
