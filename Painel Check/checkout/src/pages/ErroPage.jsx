/**
 * src/pages/ErroPage.jsx — Tela de erro / sessão inválida.
 *
 * PÁGINA RECRIADA (estava ausente). Rota: /erro (e fallback de qualquer rota
 * não reconhecida). Mostra uma mensagem amigável e um botão para tentar de novo.
 */
import React from 'react';
import { useLocation } from 'react-router-dom';
import styles from './ErroPage.module.css';

export default function ErroPage() {
  const location = useLocation();
  const mensagem =
    location.state?.mensagem ||
    'Não foi possível carregar este checkout. O link pode ter expirado ou ser inválido.';

  return (
    <div className={styles.tela}>
      <div className={`${styles.card} fade-up`}>
        <div className={styles.iconeWrap}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 8v5M12 16.5v.5M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className={styles.titulo}>Algo deu errado</h1>
        <p className={styles.sub}>{mensagem}</p>

        <button className={styles.botao} onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
