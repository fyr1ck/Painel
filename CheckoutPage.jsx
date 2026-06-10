/**
 * src/components/CheckoutPage.jsx
 *
 * Tela principal de checkout: formulário multi-etapa + resumo do pedido.
 *
 * Estrutura:
 *   Header (logo + nome da loja)
 *   StepIndicator (Dados → Endereço → Pagamento)
 *   └── Grid 2 colunas:
 *       ├── Coluna esq: Formulário por etapa
 *       └── Coluna dir: Resumo do pedido
 *
 * ALTERAÇÕES vs original:
 *   - Import useSession: '../hooks/useSession' → './hooks/useSession' (relativo a src/)
 *   - Import DadosPessoais, EnderecoEntrega, MetodoPagamento, ResumoPedido: criados
 *   - Removido style={{width:16,height:16}} do Spinner → usa classe .spinner do global.css
 */
import React, { useState } from 'react';
import { useSession }       from '../hooks/useSession';
import DadosPessoais        from './DadosPessoais';
import EnderecoEntrega      from './EnderecoEntrega';
import MetodoPagamento      from './MetodoPagamento';
import ResumoPedido         from './ResumoPedido';
import styles               from './CheckoutPage.module.css';

export default function CheckoutPage() {
  const { sessao, carregando, erro } = useSession();

  // Etapas: 1 = dados pessoais, 2 = endereço, 3 = pagamento
  const [etapa,   setEtapa]   = useState(1);
  const [cliente, setCliente] = useState({});

  // ── Loading ──────────────────────────────────────────────
  if (carregando) {
    return (
      <div className={styles.loading}>
        <span className="spinner" />
        <p>Carregando seu checkout...</p>
      </div>
    );
  }

  // ── Erro ─────────────────────────────────────────────────
  if (erro) {
    return (
      <div className={styles.erro}>
        <p>⚠ {erro}</p>
      </div>
    );
  }

  const { loja, carrinho, total } = sessao;

  // Cor personalizada da loja via CSS custom property
  const estiloLoja = { '--cor-loja': loja?.cor || '#00A854' };

  // ── Handler de avanço de etapa ────────────────────────────
  const avancarEtapa = (dadosEtapa) => {
    setCliente(prev => ({ ...prev, ...dadosEtapa }));
    setEtapa(e => e + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const ETAPAS = ['Dados', 'Endereço', 'Pagamento'];

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

      {/* Indicador de etapas */}
      <div className={styles.steps}>
        {ETAPAS.map((nome, i) => (
          <React.Fragment key={nome}>
            <div
              className={[
                styles.step,
                etapa > i     ? styles.done   : '',
                etapa === i+1 ? styles.active : '',
              ].join(' ')}
            >
              <span className={styles.stepNum}>
                {etapa > i + 1 ? '✓' : i + 1}
              </span>
              <span className={styles.stepLabel}>{nome}</span>
            </div>
            {i < 2 && (
              <div className={`${styles.stepLine} ${etapa > i+1 ? styles.done : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Grid principal */}
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

        {/* Resumo */}
        <aside className={styles.resumoArea}>
          <ResumoPedido
            carrinho={carrinho}
            total={total}
            moeda={loja?.moeda}
          />
        </aside>
      </main>
    </div>
  );
}