/**
 * src/services/api.js — Camada única de acesso à API PHP (backend).
 *
 * Centraliza as chamadas HTTP que antes ficavam espalhadas/inline nos
 * componentes. Usa axios (já era dependência do projeto) e lê a URL base de
 * import.meta.env.VITE_API_URL (defina no arquivo .env — veja .env.example).
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.seudominio.com';

const http = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Busca os dados da sessão de checkout.
 * Espelha api/get_session.php → GET ?session_id=...
 * Retorna { sessao, carrinho, cliente, loja, pixels, total }.
 */
export async function buscarSessao(sessionId) {
  try {
    const { data } = await http.get('/api/get_session.php', {
      params: { session_id: sessionId },
    });
    return data;
  } catch (err) {
    const msg =
      err?.response?.data?.erro ||
      'Não foi possível carregar a sessão de checkout.';
    throw new Error(msg);
  }
}

/**
 * Cria o pagamento (Pix ou cartão via Whop).
 * Espelha api/create_payment.php → POST { session_id, metodo, dados_cliente }.
 */
export async function criarPagamento(payload) {
  try {
    const { data } = await http.post('/api/create_payment.php', payload);
    return data;
  } catch (err) {
    const msg =
      err?.response?.data?.erro || 'Falha ao processar pagamento.';
    throw new Error(msg);
  }
}

export default http;
