/**
 * checkout-node/src/components/MetodoPagamento.jsx
 *
 * Etapa 3 do checkout: seleção de método de pagamento e criação via Whop.
 * Suporta: Pix (copia-e-cola + QR Code) e Cartão (redirect Whop).
 */

import React, { useState } from 'react';
import { useParams }        from 'react-router-dom';
import toast                from 'react-hot-toast';
import { dispararEventoFB } from '../tracking/facebook';
import { dispararEventoTT } from '../tracking/tiktok';
import styles               from './MetodoPagamento.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.seudominio.com';

export default function MetodoPagamento({ cliente, sessao, onVoltar }) {
  const { sessionId } = useParams();
  const [metodo,       setMetodo]       = useState('pix');
  const [processando,  setProcessando]  = useState(false);
  const [pixDados,     setPixDados]     = useState(null);
  const [pixCopiado,   setPixCopiado]   = useState(false);

  const { total, loja } = sessao;

  // ── Formatar moeda ───────────────────────────────────────
  const formatarValor = (v) => new Intl.NumberFormat(
    loja?.idioma === 'pt' ? 'pt-BR' : 'es-AR',
    { style: 'currency', currency: loja?.moeda || 'BRL' }
  ).format(v);

  // ── Criar pagamento ──────────────────────────────────────
  async function criarPagamento() {
    setProcessando(true);

    try {
      const resposta = await fetch(`${API_URL}/api/create_payment.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({
          session_id:    sessionId,
          metodo:        metodo,
          dados_cliente: cliente,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.erro || 'Falha ao processar pagamento.');
      }

      // Disparar AddPaymentInfo via browser (CAPI é feito pelo PHP)
      dispararEventoFB('AddPaymentInfo', {
        value:    total,
        currency: loja?.moeda || 'BRL',
      });
      dispararEventoTT('AddPaymentInfo', {
        value:    total,
        currency: loja?.moeda || 'BRL',
      });

      // Tratar resposta por tipo
      if (dados.tipo === 'pix' && dados.pix_codigo) {
        setPixDados({
          codigo:  dados.pix_codigo,
          qrcode:  dados.pix_qrcode,
          payId:   dados.payment_id,
        });
      } else if (dados.payment_url) {
        // Redirect para checkout do Whop (cartão, boleto, etc.)
        window.location.href = dados.payment_url;
      }

    } catch (err) {
      toast.error(err.message || 'Erro ao processar pagamento. Tente novamente.');
    } finally {
      setProcessando(false);
    }
  }

  // ── Copiar código Pix ────────────────────────────────────
  async function copiarPix() {
    try {
      await navigator.clipboard.writeText(pixDados.codigo);
      setPixCopiado(true);
      toast.success('Código Pix copiado!');
      setTimeout(() => setPixCopiado(false), 3000);
    } catch {
      toast.error('Erro ao copiar. Copie manualmente.');
    }
  }

  // ── Tela de Pix gerado ───────────────────────────────────
  if (pixDados) {
    return (
      <div className={`${styles.container} fade-up`}>
        <div className={styles.pixCard}>
          <div className={styles.pixHeader}>
            <div className={styles.pixIcon}>⬡</div>
            <div>
              <h2 className={styles.pixTitulo}>Pix gerado com sucesso</h2>
              <p className={styles.pixSub}>Escaneie o QR Code ou copie o código abaixo</p>
            </div>
          </div>

          {pixDados.qrcode && (
            <div className={styles.qrWrap}>
              <img src={pixDados.qrcode} alt="QR Code Pix" className={styles.qrCode} />
            </div>
          )}

          <div className={styles.pixCodigo}>
            <code className={styles.codigoTexto}>{pixDados.codigo}</code>
            <button
              className={`${styles.copiarBtn} ${pixCopiado ? styles.copiado : ''}`}
              onClick={copiarPix}
            >
              {pixCopiado ? '✓ Copiado' : '📋 Copiar'}
            </button>
          </div>

          <div className={styles.pixInfo}>
            <p>💡 O código expira em <strong>30 minutos</strong></p>
            <p>Após o pagamento, aguarde a confirmação na tela.</p>
          </div>

          <div className={styles.totalFinal}>
            Total: <strong>{formatarValor(total)}</strong>
          </div>
        </div>
      </div>
    );
  }

  // ── Seleção de método ────────────────────────────────────
  return (
    <div className={`${styles.container} fade-up`}>
      <h2 className={styles.titulo}>Forma de pagamento</h2>

      <div className={styles.metodos}>
        <label className={`${styles.metodo} ${metodo === 'pix' ? styles.selecionado : ''}`}>
          <input
            type="radio"
            name="metodo"
            value="pix"
            checked={metodo === 'pix'}
            onChange={() => setMetodo('pix')}
          />
          <div className={styles.metodoIcon}>⬡</div>
          <div className={styles.metodoInfo}>
            <strong>Pix</strong>
            <span>Aprovação imediata</span>
          </div>
          <span className={styles.desconto}>-5%</span>
        </label>

        <label className={`${styles.metodo} ${metodo === 'cartao' ? styles.selecionado : ''}`}>
          <input
            type="radio"
            name="metodo"
            value="cartao"
            checked={metodo === 'cartao'}
            onChange={() => setMetodo('cartao')}
          />
          <div className={styles.metodoIcon}>💳</div>
          <div className={styles.metodoInfo}>
            <strong>Cartão de Crédito</strong>
            <span>Visa, Mastercard, Elo</span>
          </div>
        </label>
      </div>

      <div className={styles.totalFinal}>
        Total a pagar: <strong>{formatarValor(total)}</strong>
      </div>

      <div className={styles.acoes}>
        <button className={styles.voltarBtn} onClick={onVoltar} disabled={processando}>
          ← Voltar
        </button>
        <button
          className={styles.pagarBtn}
          onClick={criarPagamento}
          disabled={processando}
        >
          {processando ? (
            <><span className="spinner" style={{width:16,height:16}} /> Processando...</>
          ) : (
            `Pagar ${formatarValor(total)}`
          )}
        </button>
      </div>

      <div className={styles.ssl}>
        🔒 Pagamento 100% seguro e criptografado
      </div>
    </div>
  );
}