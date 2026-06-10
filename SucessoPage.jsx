/**
 * src/components/SucessoPage.jsx
 *
 * Tela de confirmação exibida após pagamento aprovado.
 * Recebe dados do pedido via router state (navigate('/sucesso', { state: { ... } }))
 * ou busca pela sessão ativa na URL.
 */
import React, { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { dispararEventoFB } from '../tracking/facebook';
import { dispararEventoTT } from '../tracking/tiktok';
import styles from './SucessoPage.module.css';

export default function SucessoPage() {
  const { sessionId } = useParams();
  const { state } = useLocation();

  const total  = state?.total  || 0;
  const moeda  = state?.moeda  || 'BRL';
  const pedido = state?.pedido || sessionId?.slice(-8).toUpperCase();
  const email  = state?.email  || '';

  const fmt = (v) =>
    new Intl.NumberFormat(moeda === 'ARS' ? 'es-AR' : 'pt-BR', {
      style: 'currency',
      currency: moeda,
    }).format(v);

  // Disparar eventos de Purchase uma única vez ao montar
  useEffect(() => {
    if (total > 0) {
      dispararEventoFB('Purchase', { value: total, currency: moeda });
      dispararEventoTT('Purchase', { value: total, currency: moeda });
    }
  }, []);

  return (
    <div className={styles.page}>
      <div className={`${styles.card} fade-up`}>
        <div className={styles.iconWrap}>
          <svg className={styles.checkIcon} viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="26" r="25" stroke="currentColor" strokeWidth="2" />
            <path
              d="M14 26l9 9 15-16"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className={styles.titulo}>Pedido confirmado!</h1>
        <p className={styles.sub}>
          Seu pagamento foi processado com sucesso.
        </p>

        {pedido && (
          <div className={styles.infoPedido}>
            <span className={styles.infoLabel}>Nº do pedido</span>
            <span className={styles.infoValor}>#{pedido}</span>
          </div>
        )}

        {total > 0 && (
          <div className={styles.infoPedido}>
            <span className={styles.infoLabel}>Total pago</span>
            <span className={styles.infoValor}>{fmt(total)}</span>
          </div>
        )}

        {email && (
          <p className={styles.emailMsg}>
            Uma confirmação foi enviada para <strong>{email}</strong>
          </p>
        )}

        <div className={styles.prox}>
          <p>O que acontece agora?</p>
          <ul>
            <li>📦 Seu pedido será preparado e enviado</li>
            <li>📧 Você receberá atualizações por e-mail</li>
            <li>🚚 Prazo de entrega conforme combinado</li>
          </ul>
        </div>
      </div>
    </div>
  );
}