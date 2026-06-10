/**
 * checkout-node/src/hooks/useSession.js
 *
 * Hook React que busca os dados da sessão de checkout no backend PHP.
 * Gerencia: loading, erro, dados da sessão, config da loja e pixels.
 *
 * Ao carregar com sucesso, injeta os pixels de Facebook e TikTok
 * e dispara o evento InitiateCheckout via browser.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { injetarPixelFacebook, dispararEventoFB } from '../tracking/facebook';
import { injetarPixelTikTok, dispararEventoTT }   from '../tracking/tiktok';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.seudominio.com';

export function useSession() {
  const { sessionId } = useParams();

  const [sessao,   setSessao]   = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro,     setErro]     = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setErro('Session ID ausente na URL.');
      setCarregando(false);
      return;
    }

    const controller = new AbortController();

    async function carregarSessao() {
      try {
        const resposta = await fetch(
          `${API_URL}/api/get_session.php?session_id=${encodeURIComponent(sessionId)}`,
          { signal: controller.signal, credentials: 'omit' }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
          throw new Error(dados.erro || `Erro HTTP ${resposta.status}`);
        }

        setSessao(dados);

        // ── Injetar pixels e disparar InitiateCheckout ──────────
        if (dados.pixels?.facebook) {
          injetarPixelFacebook(dados.pixels.facebook);
          dispararEventoFB('InitiateCheckout', {
            value:    dados.total,
            currency: dados.loja?.moeda || 'BRL',
          });
        }

        if (dados.pixels?.tiktok) {
          injetarPixelTikTok(dados.pixels.tiktok);
          dispararEventoTT('InitiateCheckout', {
            value:    dados.total,
            currency: dados.loja?.moeda || 'BRL',
          });
        }

      } catch (err) {
        if (err.name !== 'AbortError') {
          setErro(err.message || 'Erro ao carregar sessão.');
        }
      } finally {
        setCarregando(false);
      }
    }

    carregarSessao();

    return () => controller.abort();
  }, [sessionId]);

  return { sessao, carregando, erro, sessionId };
}