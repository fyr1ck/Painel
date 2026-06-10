/**
 * checkout-interceptor.js — Interceptor de Checkout para Shopify
 *
 * Injetado via ScriptTag na loja do cliente.
 * Intercepta o clique em "Finalizar Compra" e redireciona
 * para o checkout independente RONE.
 *
 * IMPORTANTE: Este arquivo é servido pelo servidor do checkout
 * e injetado automaticamente em TODAS as páginas da loja Shopify.
 */

(function () {
  'use strict';

  // URL base do backend PHP — substituída dinamicamente pelo servidor
  var BACKEND_URL  = 'https://api.seudominio.com';
  var CHECKOUT_URL = 'https://pay.seudominio.com';

  // Detecta o shop_url a partir da URL atual (loja Shopify)
  var SHOP_URL = window.Shopify && window.Shopify.shop
    ? window.Shopify.shop
    : window.location.hostname;

  // Evita dupla execução
  if (window.__roneInterceptorAtivo) return;
  window.__roneInterceptorAtivo = true;

  // ----------------------------------------------------------
  // Utilitários
  // ----------------------------------------------------------

  /**
   * Busca os dados atuais do carrinho via API da Shopify.
   * @returns {Promise<Object>} Dados do carrinho (itens, total, moeda)
   */
  async function buscarCarrinho() {
    var resposta = await fetch('/cart.js', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    });

    if (!resposta.ok) {
      throw new Error('Falha ao buscar carrinho: ' + resposta.status);
    }

    return resposta.json();
  }

  /**
   * Envia os dados do carrinho para o backend PHP e
   * obtém o session_id único para o checkout.
   *
   * @param {Object} carrinho - Dados do carrinho da Shopify
   * @returns {Promise<string>} URL do checkout RONE
   */
  async function registrarSessaoCheckout(carrinho) {
    var moeda = window.Shopify && window.Shopify.currency
      ? window.Shopify.currency.active
      : 'BRL';

    var payload = {
      shop_url:  SHOP_URL,
      cart_data: {
        token:         carrinho.token,
        item_count:    carrinho.item_count,
        total_price:   carrinho.total_price,
        items: carrinho.items.map(function (item) {
          return {
            variant_id:  item.variant_id,
            product_id:  item.product_id,
            title:       item.title,
            quantity:    item.quantity,
            price:       item.price,
            sku:         item.sku,
            image:       item.image,
            product_type: item.product_type,
          };
        }),
      },
      // Shopify retorna preço em centavos — converte para reais/unidade principal
      total: carrinho.total_price / 100,
      moeda: moeda,
    };

    var resposta = await fetch(BACKEND_URL + '/api/save_pending_order.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit',
    });

    if (!resposta.ok) {
      var erro = await resposta.json().catch(function () { return {}; });
      throw new Error(erro.erro || 'Erro ao registrar sessão: ' + resposta.status);
    }

    var dados = await resposta.json();

    if (!dados.sucesso || !dados.checkout_url) {
      throw new Error('Resposta inválida do servidor.');
    }

    return dados.checkout_url;
  }

  /**
   * Handler principal: busca o carrinho, registra a sessão e redireciona.
   * @param {Event} evento - Evento de clique ou submit interceptado
   */
  async function interceptarCheckout(evento) {
    // Verifica se o carrinho não está vazio
    if (window.Shopify && window.Shopify.cart && window.Shopify.cart.item_count === 0) {
      return; // Deixa o fluxo nativo continuar para carrinhos vazios
    }

    evento.preventDefault();
    evento.stopPropagation();

    // Feedback visual enquanto processa
    var botao = evento.currentTarget || evento.target;
    var textoOriginal = botao ? botao.textContent : '';
    if (botao && botao.disabled !== undefined) {
      botao.disabled = true;
      botao.textContent = 'Aguarde...';
    }

    try {
      var carrinho     = await buscarCarrinho();
      var checkoutUrl  = await registrarSessaoCheckout(carrinho);

      // Redireciona para o checkout RONE
      window.location.href = checkoutUrl;

    } catch (erro) {
      console.error('[RONE Checkout] Erro ao interceptar:', erro);

      // Restaura o botão em caso de erro
      if (botao && botao.disabled !== undefined) {
        botao.disabled = false;
        botao.textContent = textoOriginal;
      }

      // Fallback: redireciona para o checkout nativo da Shopify
      // para não bloquear a venda em caso de falha do nosso sistema
      console.warn('[RONE Checkout] Usando checkout nativo como fallback.');
      window.location.href = '/checkout';
    }
  }

  // ----------------------------------------------------------
  // Estratégias de interceptação
  // ----------------------------------------------------------

  /**
   * Estratégia 1: Interceptar formulários com action="/checkout"
   * Funciona na maioria dos temas Shopify padrão (Dawn, Debut, etc.)
   */
  function interceptarFormularios() {
    var formularios = document.querySelectorAll(
      'form[action="/checkout"], form[action*="checkout"]'
    );

    formularios.forEach(function (form) {
      if (form.dataset.roneAtivo) return;
      form.dataset.roneAtivo = '1';
      form.addEventListener('submit', interceptarCheckout, true);
    });
  }

  /**
   * Estratégia 2: Interceptar botões com href ou atributos de checkout
   * Para temas que usam links em vez de forms.
   */
  function interceptarBotoes() {
    var seletores = [
      'a[href="/checkout"]',
      'a[href*="checkout"]',
      'button[name="checkout"]',
      'input[name="checkout"]',
      '[data-action="add-to-cart"]',
    ];

    document.querySelectorAll(seletores.join(', ')).forEach(function (el) {
      if (el.dataset.roneAtivo) return;
      el.dataset.roneAtivo = '1';
      el.addEventListener('click', interceptarCheckout, true);
    });
  }

  /**
   * Estratégia 3: MutationObserver para temas com conteúdo dinâmico
   * (carrinhos drawer/sidebar que são inseridos no DOM por JavaScript)
   */
  function observarDOM() {
    var observer = new MutationObserver(function (mutacoes) {
      var temNovoConteudo = mutacoes.some(function (m) {
        return m.addedNodes.length > 0;
      });

      if (temNovoConteudo) {
        interceptarFormularios();
        interceptarBotoes();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // ----------------------------------------------------------
  // Inicialização
  // ----------------------------------------------------------

  /**
   * Inicializa o interceptor após o DOM estar pronto.
   */
  function inicializar() {
    interceptarFormularios();
    interceptarBotoes();
    observarDOM();

    // Segunda varredura após 1.5s para temas lentos
    setTimeout(function () {
      interceptarFormularios();
      interceptarBotoes();
    }, 1500);
  }

  // Aguarda o DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
  } else {
    inicializar();
  }

})();