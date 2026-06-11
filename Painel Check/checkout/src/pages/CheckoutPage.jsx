/**
 * src/pages/CheckoutPage.jsx
 *
 * Tela principal de checkout: formulário de dados do cliente +
 * seleção de método de pagamento + integração Whop.
 *
 * Estrutura:
 *   Header (logo + nome da loja)
 *   └── Grid 2 colunas:
 *       ├── Coluna esq: Formulário (dados pessoais > entrega > pagamento)
 *       └── Coluna dir: Resumo do pedido
 *
 * (Lógica preservada do original. Apenas os imports dos sub-componentes foram
 *  corrigidos: estavam como './X' apontando para a raiz; agora apontam para
 *  ../components/X — pois este arquivo vive em pages/ e os sub-componentes em
 *  components/.)
 */
import React, { useState } from 'react';
import { useSession } from '../hooks/useSession';
import DadosPessoais from '../components/DadosPessoais';
import EnderecoEntrega from '../components/EnderecoEntrega';
import MetodoPagamento from '../components/MetodoPagamento';
import ResumoPedido from '../components/ResumoPedido';
import styles from './CheckoutPage.module.css';

export default function CheckoutPage() {
  const { sessao, carregando, erro } = useSession();

  // Etapas do formulário: 1 = dados pessoais, 2 = endereço, 3 = pagamento
  const [etapa, setEtapa] = useState(1);
  const [cliente, setCliente] = useState({});

  // ── Loading state ────────────────────────────────────────
  if (carregando) {
    return (
      <div className={styles.loading}>
        <div className="spinner" />
        <p>Carregando seu checkout...</p>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────
  if (erro) {
    return (
      <div className={styles.erro}>
        <p>⚠ {erro}</p>
      </div>
    );
  }

  const { loja, carrinho, total, pixels } = sessao;

  // Cor personalizada da loja (aplicada via CSS var inline)
  const estiloLoja = {
    '--cor-loja': loja?.cor || '#00A854',
  };

  // ── Handlers de etapa ────────────────────────────────────
  const avancarEtapa = (dadosEtapa) => {
    setCliente((prev) => ({ ...prev, ...dadosEtapa }));
    setEtapa((e) => e + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={styles.checkout} style={estiloLoja}>
      {/* Header */}
      <header className={styles.header}>
        {loja?.logo ? (
          <img src={loja.logo} alt={loja.shop_url} className={styles.logo} />
        ) : (
          <span className={styles.shopName}>
            {loja?.shop_url?.replace('.myshopify.com', '').toUpperCase()}
          </span>
        )}
        <div className={styles.seguranca}>
          <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
            <path
              d="M6 1L1 3v4c0 3.18 2.16 6.15 5 6.93C9.84 13.15 11 10.18 11 7V3L6 1z"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
            />
          </svg>
          Checkout seguro
        </div>
      </header>

      {/* Steps indicator */}
      <div className={styles.steps}>
        {['Dados', 'Endereço', 'Pagamento'].map((nome, i) => (
          <React.Fragment key={nome}>
            <div
              className={`${styles.step} ${etapa > i ? styles.done : ''} ${
                etapa === i + 1 ? styles.active : ''
              }`}
            >
              <span className={styles.stepNum}>{etapa > i + 1 ? '✓' : i + 1}</span>
              <span className={styles.stepLabel}>{nome}</span>
            </div>
            {i < 2 && (
              <div
                className={`${styles.stepLine} ${etapa > i + 1 ? styles.done : ''}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Main grid */}
      <main className={styles.grid}>
        {/* Formulário */}
        <section className={styles.formArea}>
          {etapa === 1 && (
            <DadosPessoais inicial={cliente} onAvancar={avancarEtapa} />
          )}
          {etapa === 2 && (
            <EnderecoEntrega
              inicial={cliente}
              onAvancar={avancarEtapa}
              onVoltar={() => setEtapa(1)}
            />
          )}
          {etapa === 3 && (
            <MetodoPagamento
              cliente={cliente}
              sessao={sessao}
              onVoltar={() => setEtapa(2)}
            />
          )}
        </section>

        {/* Resumo do pedido */}
        <aside className={styles.resumoArea}>
          <ResumoPedido carrinho={carrinho} total={total} moeda={loja?.moeda} />
        </aside>
      </main>
    </div>
  );
}
