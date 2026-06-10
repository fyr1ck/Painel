/**
 * src/hooks/useSession.js
 *
 * Hook que busca os dados da sessão de checkout pelo sessionId da URL.
 * Retorna: { sessao, carregando, erro }
 *
 * Estrutura esperada de sessao:
 *   { loja, carrinho, total, pixels }
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.seudominio.com';

export function useSession() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();

  const [sessao,     setSessao]     = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro,       setErro]       = useState(null);

  useEffect(() => {
    if (!sessionId) {
      navigate('/erro', { replace: true });
      return;
    }

    let cancelado = false;

    async function buscarSessao() {
      try {
        const resposta = await fetch(
          `${API_URL}/api/get_session.php?session_id=${encodeURIComponent(sessionId)}`,
          { credentials: 'omit' }
        );

        if (!resposta.ok) {
          throw new Error('Sessão inválida ou expirada.');
        }

        const dados = await resposta.json();

        if (!dados.sucesso || !dados.sessao) {
          throw new Error(dados.erro || 'Sessão não encontrada.');
        }

        if (!cancelado) setSessao(dados.sessao);
      } catch (err) {
        if (!cancelado) setErro(err.message || 'Erro ao carregar checkout.');
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    buscarSessao();

    return () => { cancelado = true; };
  }, [sessionId, navigate]);

  return { sessao, carregando, erro };
}