/**
 * src/hooks/useSession.js — Hook que carrega a sessão de checkout.
 *
 * NOTA: o arquivo original (useSession.js, solto na raiz) não pôde ser obtido
 * do GitHub pelas ferramentas disponíveis. Esta versão foi reconstruída para
 * casar EXATAMENTE com a resposta de api/get_session.php e com o contrato
 * esperado pelos componentes (CheckoutPage e MetodoPagamento desestruturam
 * { loja, carrinho, total, pixels } do objeto `sessao`).
 *
 * Se você tiver o arquivo original, basta substituí-lo aqui — o caminho e o
 * export nomeado `useSession` precisam ser mantidos.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { buscarSessao } from '../services/api';

export function useSession() {
  const { sessionId } = useParams();
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErro(null);
      try {
        if (!sessionId) throw new Error('Sessão inválida.');
        const dados = await buscarSessao(sessionId);
        if (ativo) setSessao(dados);
      } catch (err) {
        if (ativo) setErro(err?.message || 'Erro ao carregar o checkout.');
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [sessionId]);

  return { sessao, carregando, erro };
}

export default useSession;
