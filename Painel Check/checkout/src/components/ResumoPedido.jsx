/**
 * src/components/ResumoPedido.jsx — Coluna direita do checkout.
 *
 * COMPONENTE RECRIADO (estava ausente). Contrato exigido pelo pai:
 *   props: { carrinho: array, total: number, moeda: string }
 *
 * O formato exato de cada item do carrinho (dados_carrinho no backend) não é
 * fixo, então a leitura é tolerante a diferentes chaves (title/titulo,
 * price/preco, quantity/quantidade, image/imagem...).
 */
import React from 'react';
import { formatarMoeda } from '../utils/format';
import styles from './ResumoPedido.module.css';

function lerItem(item = {}) {
  return {
    titulo: item.titulo || item.title || item.nome || item.name || 'Produto',
    variante: item.variante || item.variant_title || item.variacao || '',
    qtd: Number(item.quantidade || item.quantity || item.qtd || 1),
    preco: Number(item.preco || item.price || item.valor || item.line_price || 0),
    imagem: item.imagem || item.image || item.img || item.foto || '',
  };
}

export default function ResumoPedido({ carrinho = [], total = 0, moeda = 'BRL' }) {
  const itens = Array.isArray(carrinho) ? carrinho.map(lerItem) : [];

  return (
    <div className={styles.resumo}>
      <h3 className={styles.titulo}>Resumo do pedido</h3>

      <div className={styles.itens}>
        {itens.length === 0 && (
          <p className={styles.vazio}>Nenhum item no carrinho.</p>
        )}

        {itens.map((it, i) => (
          <div className={styles.item} key={i}>
            <div className={styles.thumbWrap}>
              {it.imagem ? (
                <img src={it.imagem} alt={it.titulo} className={styles.thumb} />
              ) : (
                <div className={styles.thumbPlaceholder}>📦</div>
              )}
              <span className={styles.qtdBadge}>{it.qtd}</span>
            </div>
            <div className={styles.itemInfo}>
              <span className={styles.itemNome}>{it.titulo}</span>
              {it.variante && (
                <span className={styles.itemVariante}>{it.variante}</span>
              )}
            </div>
            <span className={styles.itemPreco}>
              {formatarMoeda(it.preco * it.qtd, moeda)}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.linhaTotal}>
        <span>Total</span>
        <strong>{formatarMoeda(total, moeda)}</strong>
      </div>

      <div className={styles.selo}>
        <svg width="13" height="15" viewBox="0 0 12 14" fill="none">
          <path
            d="M6 1L1 3v4c0 3.18 2.16 6.15 5 6.93C9.84 13.15 11 10.18 11 7V3L6 1z"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="none"
          />
        </svg>
        Compra protegida e dados criptografados
      </div>
    </div>
  );
}
