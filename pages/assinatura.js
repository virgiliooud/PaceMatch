import { useState } from "react";
import styles from '../styles/Assinatura.module.css';

export default function Assinatura() {
  const [loading, setLoading] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);
  const [loadingCoach, setLoadingCoach] = useState(false);

  const handleSubscribe = async (plano = "premium") => {
    if (plano === "premium") {
      setLoading(true);
    } else if (plano === "coach") {
      setLoadingCoach(true);
    }

    try {
      const endpoint = plano === "coach" ? "/api/create-checkout-coach" : "/api/create-checkout-session";
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Erro ao criar sessão de pagamento.");
      }
    } catch {
      alert("Erro ao conectar com o Stripe.");
    }

    if (plano === "premium") {
      setLoading(false);
    } else if (plano === "coach") {
      setLoadingCoach(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Hero Section */}
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Eleve Seus <span className={styles.gradientText}>Treinos</span> 
            <br />ao Próximo Nível
          </h1>
          <p className={styles.heroSubtitle}>
            Junte-se à comunidade de corredores mais motivada do Brasil. 
            <br />Treinos ilimitados, conexões reais e resultados extraordinários.
          </p>
        </div>
      </div>

      {/* Planos Section */}
      <div className={styles.plansSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Escolha Seu <span className={styles.gradientText}>Plano Perfeito</span>
          </h2>
          <p className={styles.sectionSubtitle}>
            Do corredor casual ao atleta profissional, temos o plano ideal para você
          </p>
        </div>

        <div className={styles.cardContainer}>
          {/* Plano Básico */}
          <div className={`${styles.card} ${styles.basic}`}>
            <div className={styles.cardHeader}>
              <div className={styles.cardBadge}>Grátis</div>
              <h3 className={styles.cardTitle}>Iniciante</h3>
              <div className={styles.priceContainer}>
                <span className={styles.price}>R$ 0</span>
                <span className={styles.pricePeriod}>/sempre</span>
              </div>
            </div>
            
            <ul className={styles.features}>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>✅</span>
                <span>Até <strong>3 treinos por mês</strong></span>
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>✅</span>
                <span>Mapa e rotas básicas</span>
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>✅</span>
                <span>Visualiza participantes</span>
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>❌</span>
                <span className={styles.featureDisabled}>Chat ilimitado</span>
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>❌</span>
                <span className={styles.featureDisabled}>Treinos privados</span>
              </li>
            </ul>

            <button className={styles.cardButton} disabled>
              Plano Atual
            </button>
          </div>

          {/* Plano Premium - DESTAQUE */}
          <div className={`${styles.card} ${styles.premium} ${styles.featured}`}>
            <div className={styles.featuredBadge}>🌟 MAIS POPULAR</div>
            <div className={styles.cardHeader}>
              <div className={styles.cardBadge}>Premium</div>
              <h3 className={styles.cardTitle}>Corredor Avançado</h3>
              <div className={styles.priceContainer}>
                <span className={styles.price}>R$ 14,90</span>
                <span className={styles.pricePeriod}>/mês</span>
              </div>
              <div className={styles.saveBadge}>
                <span>🎯 Melhor custo-benefício</span>
              </div>
            </div>
            
            <ul className={styles.features}>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>🚀</span>
                <span><strong>Treinos ILIMITADOS</strong></span>
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>🔓</span>
                <span>Acesso a todos os treinos privados</span>
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>💬</span>
                <span>Chat ilimitado em todos os treinos</span>
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>⭐</span>
                <span>Prioridade no suporte</span>
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>🔔</span>
                <span>Notificações exclusivas</span>
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>🎁</span>
                <span>Novos recursos primeiro</span>
              </li>
            </ul>

            <button 
              className={`${styles.cardButton} ${styles.premiumButton}`}
              onClick={() => handleSubscribe("premium")}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className={styles.spinner}></div>
                  Processando...
                </>
              ) : (
                <>
                  🏃‍♂️ Começar Agora
                  <span className={styles.buttonSubtext}>7 dias de garantia</span>
                </>
              )}
            </button>
            
            <div className={styles.guarantee}>
              ✅ Garantia de satisfação ou seu dinheiro de volta
            </div>
          </div>

          {/* Plano Assessoria */}
          <div className={`${styles.card} ${styles.coach}`}>
            <div className={styles.cardHeader}>
              <div className={styles.cardBadge}>Profissional</div>
              <h3 className={styles.cardTitle}>Assessoria</h3>
              <div className={styles.priceContainer}>
                <span className={styles.price}>R$ 199</span>
                <span className={styles.pricePeriod}>/mês</span>
              </div>
            </div>
            
            <ul className={styles.features}>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>👑</span>
                <span><strong>20 contas Premium</strong> para alunos</span>
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>📊</span>
                <span>Painel de gerenciamento de alunos</span>
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>👨‍🏫</span>
                <span>Conta assessor com recursos avançados</span>
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>📈</span>
                <span>Relatórios de desempenho</span>
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>🎯</span>
                <span>Treinos personalizados em massa</span>
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>💎</span>
                <span>Suporte prioritário 24/7</span>
              </li>
            </ul>

            <button 
              className={`${styles.cardButton} ${styles.coachButton}`}
              onClick={() => handleSubscribe("coach")}
              disabled={loadingCoach}
            >
              {loadingCoach ? (
                <>
                  <div className={styles.spinner}></div>
                  Processando...
                </>
              ) : (
                <>
                  👨‍🏫 Quero Ser Assessor
                  <span className={styles.buttonSubtext}>Perfect for coaches</span>
                </>
              )}
            </button>
            
            <div className={styles.coachNote}>
              💡 Ideal para assessorias esportivas e grupos de treino
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className={styles.faqSection}>
        <h2 className={styles.sectionTitle}>Perguntas Frequentes</h2>
        <div className={styles.faqGrid}>
          <div className={styles.faqItem}>
            <h4>Posso cancelar a qualquer momento?</h4>
            <p>Sim! Você pode cancelar seu plano premium quando quiser, sem taxas escondidas.</p>
          </div>
          <div className={styles.faqItem}>
            <h4>Como funciona a garantia?</h4>
            <p>Se em 7 dias você não estiver satisfeito, devolvemos 100% do seu dinheiro.</p>
          </div>
          <div className={styles.faqItem}>
            <h4>Posso mudar de plano?</h4>
            <p>Sim, você pode fazer upgrade ou downgrade a qualquer momento.</p>
          </div>
          <div className={styles.faqItem}>
            <h4>O plano assessoria inclui suporte?</h4>
            <p>Sim! Suporte prioritário 24/7 para todos os planos de assessoria.</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2>Pronto para Transformar Seus Treinos?</h2>
          <p>Junte-se a milhares de corredores que já descobriram o poder do treino em grupo</p>
          <button 
            className={styles.ctaButton}
            onClick={() => handleSubscribe("premium")}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className={styles.spinner}></div>
                Redirecionando...
              </>
            ) : (
              "🏃‍♂️ Quero Ser Premium Agora!"
            )}
          </button>
          <div className={styles.ctaGuarantee}>
            ✅ <strong>Garantia de 7 dias</strong> - Sem riscos, sem compromisso
          </div>
        </div>
      </div>
    </div>
  );
}