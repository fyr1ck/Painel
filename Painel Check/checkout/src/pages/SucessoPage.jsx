/**
 * src/pages/SucessoPage.jsx — Confirmação pós-pagamento.
 *
 * PÁGINA RECRIADA (estava ausente; o import em App/AppRoutes apontava para um
 * arquivo inexistente). Rota: /pay/:sessionId/sucesso.
 *
 * Observação: api/get_session.php retorna 410 para sessões já pagas, então
 * aqui mostramos uma confirmação estática segura (sem refazer a busca da
 * sessão). O evento Purchase de servidor é feito pelo backend (CAPI/webhook).
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import styles from './SucessoPage.module.css';

export default function SucessoPage() {
  const { sessionId } = useParams();
  const ref = sessionId ? sessionId.slice(0, 8).toUpperCase() : '--------';

  return (
    <div className={styles.tela}>
      <div className={`${styles.card} fade-up`}>
        <div className={styles.checkWrap}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12.5l4.5 4.5L19 7"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className={styles.titulo}>Pagamento confirmado</h1>
        <p className={styles.sub}>
          Recebemos seu pedido com sucesso. Você receberá os detalhes da entrega
          por e-mail em instantes.
        </p>

        <div className={styles.refBox}>
          <span>Referência do pedido</span>
          <strong>#{ref}</strong>
        </div>

        <p className={styles.rodape}>
          Pode fechar esta página com segurança.
        </p>
      </div>
    </div>
  );
}
