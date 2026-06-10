/**
 * src/components/ResumoPedido.jsx
 *
 * Sidebar de resumo do pedido: itens do carrinho, subtotal, frete, total.
 * Exibida ao lado do formulário em todas as etapas do checkout.
 */
import React, { useState } from 'react';
import styles from './ResumoPedido.module.css';

export default function ResumoPedido({ carrinho = [], total = 0, moeda = 'BRL' }) {
  const [expandido, setExpandido] = useState(false);

  const locale = moeda === 'ARS' ? 'es-AR' : 'pt-BR';

  const fmt = (valor) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: moeda }).format(valor);

  const subtotal = carrinho.reduce(
    (acc, item) => acc + (item.preco || 0) * (item.quantidade || 1),
    0
  );
  const frete = total - subtotal;

  return (
    <div className={styles.card}>
      {/* Cabeçalho — toggle em mobile */}
      <button
        type="button"
        className={styles.header}
        onClick={() => setExpandido(v => !v)}
      >
        <span className={styles.headerLabel}>
          🛒 Resumo do pedido
        </span>
        <span className={styles.headerTotal}>{fmt(total)}</span>
        <span className={`${styles.chevron} ${expandido ? styles.up : ''}`}>▾</span>
      </button>

      {/* Itens */}
      <div className={`${styles.corpo} ${expandido ? styles.aberto : ''}`}>
        <ul className={styles.itens}>
          {carrinho.map((item, i) => (
            <li key={item.id || i} className={styles.item}>
              <div className={styles.itemImg}>
                {item.imagem ? (
                  <img src={item.imagem} alt={item.nome} />
                ) : (
                  <div className={styles.imgPlaceholder} />
                )}
                {item.quantidade > 1 && (
                  <span className={styles.qtd}>{item.quantidade}</span>
                )}
              </div>
              <div className={styles.itemInfo}>
                <span className={styles.itemNome}>{item.nome}</span>
                {item.variante && (
                  <span className={styles.itemVariante}>{item.variante}</span>
                )}
              </div>
              <span className={styles.itemPreco}>
                {fmt((item.preco || 0) * (item.quantidade || 1))}
              </span>
            </li>
          ))}
        </ul>

        <div className={styles.divider} />

        <div className={styles.totais}>
          <div className={styles.linhaTotal}>
            <span>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
          <div className={styles.linhaTotal}>
            <span>Frete</span>
            <span className={frete === 0 ? styles.gratis : ''}>
              {frete === 0 ? 'Grátis' : fmt(frete)}
            </span>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.linhaTotalFinal}>
          <span>Total</span>
          <span>{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}