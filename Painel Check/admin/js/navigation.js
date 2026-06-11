/* ===========================================================================
   navigation.js — Navegação entre as "views" do Painel Admin (SPA).

   Substitui os antigos handlers inline `onclick="showView('x')"`.
   Cada elemento navegável usa `data-view="x"` no HTML e o binding é feito aqui
   via addEventListener — nenhum JavaScript inline no markup.

   Escrito como script comum (não-módulo) para funcionar também ao abrir o
   index.html direto do disco (file://), sem precisar de servidor.
   =========================================================================== */
(function (global) {
  'use strict';

  /** Mapa id-da-view -> título exibido no topbar (#pageTitle). */
  var TITULOS = {
    dashboard: 'DASHBOARD',
    liveview: 'LIVE VIEW',
    pedidos: 'PEDIDOS',
    carrinhos: 'CARRINHOS',
    ads: 'ADS',
    configuracoes: 'CONFIGURAÇÕES',
    fretes: 'FRETES',
    integracoes: 'INTEGRAÇÕES',
    produtos: 'PRODUTOS',
    pixels: 'PIXELS',
    lojas: 'LOJAS',
    dominios: 'DOMÍNIOS'
  };

  /** Mostra a view solicitada e atualiza estados visuais. */
  function showView(viewId) {
    // 1. Alterna a seção visível
    document.querySelectorAll('.view').forEach(function (sec) {
      sec.classList.toggle('active', sec.id === 'view-' + viewId);
    });

    // 2. Marca o item de menu correspondente como ativo
    document.querySelectorAll('.nav-item[data-view]').forEach(function (item) {
      item.classList.toggle('active', item.dataset.view === viewId);
    });

    // 3. Atualiza o título do topbar
    var titulo = document.getElementById('pageTitle');
    if (titulo && TITULOS[viewId]) titulo.textContent = TITULOS[viewId];

    // 4. Fecha a sidebar no mobile após navegar
    var sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('open');

    // 5. Sincroniza o hash (defensivo: replaceState pode falhar em file://)
    try {
      if (location.hash !== '#' + viewId) {
        history.replaceState(null, '', '#' + viewId);
      }
    } catch (e) {
      /* em file:// alguns navegadores bloqueiam replaceState — ignorar */
    }
  }

  /** Liga todos os elementos com [data-view] ao showView. */
  function initNavigation() {
    document.querySelectorAll('[data-view]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        showView(el.dataset.view);
      });
    });
    var inicial = (location.hash || '#dashboard').slice(1);
    showView(inicial);
  }

  // Expõe no escopo global para o app.js consumir
  global.PainelNav = { showView: showView, initNavigation: initNavigation };
})(window);
