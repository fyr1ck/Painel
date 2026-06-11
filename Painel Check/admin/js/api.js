/* ===========================================================================
   api.js — Camada de dados do Painel.

   Funciona de dois jeitos:
   • USE_BACKEND = true  → consome os endpoints PHP reais (backend/api/*.php).
   • USE_BACKEND = false → usa localStorage (com dados de exemplo das telas),
                           para o painel FUNCIONAR mesmo aberto por duplo-clique.

   Para ir para produção: ligue USE_BACKEND e ajuste API_BASE.
   =========================================================================== */
window.API = (function () {
  'use strict';

  // ----- Configuração -------------------------------------------------------
  var USE_BACKEND = false;          // ← mude para true para usar o PHP
  var API_BASE = '';                // ← ex.: 'https://api.seudominio.com'

  // ----- Util ---------------------------------------------------------------
  function uid(prefix) {
    return prefix + '_' + Math.random().toString(16).slice(2, 12);
  }
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  // ----- Seed (mesmos dados das telas reais) --------------------------------
  function seed() {
    if (!localStorage.getItem('rone_lojas')) {
      save('rone_lojas', [
        { id: 'loja_11', nome: 'PRÜNE', checkout_id: 'loja11', moeda: 'ARS',
          idioma: 'es', cor: '#000000', logo: '', shopify_connected: true,
          whop_connected: true, shopify_domain: 'ydsepz-uu.myshopify.com',
          whop_company_id: 'biz_rEIQP9MIsW3Hbq', gateway: 'whop',
          pixel_tt: 'D8BR3MJC77UBL2TTSUBG', ativo: true },
        { id: 'loja_1', nome: 'PRÜNE', checkout_id: 'loja1', moeda: 'BRL',
          idioma: 'pt', cor: '#000000', logo: '', shopify_connected: false,
          whop_connected: false, shopify_domain: '', whop_company_id: '', ativo: true }
      ]);
    }
    if (!localStorage.getItem('rone_produtos')) save('rone_produtos', []);
    if (!localStorage.getItem('rone_pedidos')) {
      save('rone_pedidos', [
        { id: 'ped_316', loja_id: 'loja_11', cliente_nome: '', cliente_email: 'customer-199b120c@gmail.com', itens_count: 1, items_preview: 'Bota caña media Lucien en efe...', metodo: 'WHOP', valor: 44899.37, status: 'pending', created_at: '2026-06-09 21:54' },
        { id: 'ped_306', loja_id: 'loja_11', cliente_nome: '', cliente_email: 'customer-a28ebdf0@gmail.com', itens_count: 3, items_preview: 'CARTERA DE MANO THE CLUB EN CU... +2', metodo: 'WHOP', valor: 51283.77, status: 'pending', created_at: '2026-06-09 19:15' },
        { id: 'ped_305', loja_id: 'loja_11', cliente_nome: '', cliente_email: 'customer-b10838ec@gmail.com', itens_count: 3, items_preview: 'CARTERA DE MANO THE CLUB EN CU... +2', metodo: 'WHOP', valor: 51283.77, status: 'pending', created_at: '2026-06-09 19:13' },
        { id: 'ped_254', loja_id: 'loja_11', cliente_nome: 'Veronica Galladini', cliente_email: 'veronica.galladini@gmail.com', itens_count: 28, items_preview: 'Bolso J Gang en rubber – Negro... +27', metodo: 'WHOP', valor: 591844.07, status: 'pending', created_at: '2026-06-09 14:10' },
        { id: 'ped_251', loja_id: 'loja_11', cliente_nome: '', cliente_email: 'customer-bb180c6e@gmail.com', itens_count: 1, items_preview: 'SHOPPER VERA EN CUERO VEGETAL ...', metodo: 'WHOP', valor: 20837.54, status: 'pending', created_at: '2026-06-09 13:52' },
        { id: 'ped_250', loja_id: 'loja_11', cliente_nome: '', cliente_email: 'customer-00f840d9@gmail.com', itens_count: 3, items_preview: 'Bota caña baja June en cuero ... +2', metodo: 'WHOP', valor: 75345.60, status: 'pending', created_at: '2026-06-09 13:26' }
      ]);
    }
    if (!localStorage.getItem('rone_carrinhos')) {
      save('rone_carrinhos', [
        { id: uid('cart'), loja_id: 'loja_11', cliente_email: 'aec_8975@yahoo.com.ar', step: 'email', valor: 51283.77, ip: '190.189.240.124', quando: 'há 3h' },
        { id: uid('cart'), loja_id: 'loja_11', cliente_email: 'veronica.galladini@gmail.com', step: 'email', valor: 581847.07, ip: '181.228.62.15', quando: 'há 8h' },
        { id: uid('cart'), loja_id: 'loja_11', cliente_email: 'silpa@example.com', step: 'email', valor: 75345.60, ip: '190.18.253.79', quando: 'há 9h' }
      ]);
    }
  }
  seed();

  // ----- Backend (fetch) ----------------------------------------------------
  function get(path) {
    return fetch(API_BASE + path).then(function (r) { return r.json(); });
  }
  function post(path, body) {
    return fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  // ----- API pública --------------------------------------------------------
  return {
    usandoBackend: function () { return USE_BACKEND; },

    lojaAtual: function (id) {
      if (id) save('rone_loja_atual', id);
      return load('rone_loja_atual', 'loja_11');
    },

    // ---- LOJAS ----
    listLojas: function () {
      if (USE_BACKEND) return get('/api/lojas_list.php').then(function (r) { return r.lojas || []; });
      var lojas = load('rone_lojas', []);
      var prods = load('rone_produtos', []);
      lojas.forEach(function (l) {
        l.produtos = prods.filter(function (p) { return p.loja_id === l.id; }).length;
      });
      return Promise.resolve(lojas);
    },
    saveLoja: function (loja) {
      if (USE_BACKEND) return post('/api/loja_save.php', loja);
      var lojas = load('rone_lojas', []);
      if (loja.id) {
        var i = lojas.findIndex(function (l) { return l.id === loja.id; });
        if (i >= 0) lojas[i] = Object.assign(lojas[i], loja);
      } else {
        loja.id = uid('loja');
        loja.checkout_id = loja.checkout_id || loja.id;
        loja.ativo = true;
        lojas.push(loja);
      }
      save('rone_lojas', lojas);
      return Promise.resolve({ sucesso: true, loja: loja });
    },
    deleteLoja: function (id) {
      if (USE_BACKEND) return post('/api/loja_delete.php', { id: id });
      save('rone_lojas', load('rone_lojas', []).filter(function (l) { return l.id !== id; }));
      save('rone_produtos', load('rone_produtos', []).filter(function (p) { return p.loja_id !== id; }));
      return Promise.resolve({ sucesso: true });
    },

    // ---- PRODUTOS ----
    listProdutos: function (lojaId) {
      if (USE_BACKEND) return get('/api/produtos_list.php?loja_id=' + encodeURIComponent(lojaId)).then(function (r) { return r.produtos || []; });
      var prods = load('rone_produtos', []);
      return Promise.resolve(lojaId ? prods.filter(function (p) { return p.loja_id === lojaId; }) : prods);
    },
    saveProduto: function (prod) {
      if (USE_BACKEND) return post('/api/produto_save.php', prod);
      var prods = load('rone_produtos', []);
      if (prod.id) {
        var i = prods.findIndex(function (p) { return p.id === prod.id; });
        if (i >= 0) prods[i] = Object.assign(prods[i], prod);
      } else {
        prod.id = uid('prod');
        prod.checkout_url = '/pay/' + prod.id;
        prod.created_at = new Date().toISOString();
        prods.unshift(prod);
      }
      save('rone_produtos', prods);
      return Promise.resolve({ sucesso: true, produto: prod });
    },
    deleteProduto: function (id) {
      if (USE_BACKEND) return post('/api/produto_delete.php', { id: id });
      save('rone_produtos', load('rone_produtos', []).filter(function (p) { return p.id !== id; }));
      return Promise.resolve({ sucesso: true });
    },

    // ---- PEDIDOS / CARRINHOS (leitura) ----
    listPedidos: function (lojaId) {
      if (USE_BACKEND) return get('/api/pedidos_list.php?loja_id=' + encodeURIComponent(lojaId || '')).then(function (r) { return r.pedidos || []; });
      var ped = load('rone_pedidos', []);
      return Promise.resolve(lojaId ? ped.filter(function (p) { return p.loja_id === lojaId; }) : ped);
    },
    listCarrinhos: function (lojaId) {
      if (USE_BACKEND) return get('/api/carrinhos_list.php?loja_id=' + encodeURIComponent(lojaId || '')).then(function (r) { return r; });
      var carts = load('rone_carrinhos', []);
      if (lojaId) carts = carts.filter(function (c) { return c.loja_id === lojaId; });
      var perdido = carts.reduce(function (s, c) { return s + (+c.valor || 0); }, 0);
      return Promise.resolve({ total: carts.length, valor_perdido: perdido, carrinhos: carts });
    },

    // ---- CONFIG / CREDENCIAIS (Shopify, Whop, Stripe, Pixels) ----
    getConfig: function (lojaId) {
      if (USE_BACKEND) return get('/api/config_get.php?loja_id=' + encodeURIComponent(lojaId)).then(function (r) { return r.config || {}; });
      var lojas = load('rone_lojas', []);
      var l = lojas.filter(function (x) { return x.id === lojaId; })[0] || {};
      return Promise.resolve({
        moeda: l.moeda, idioma: l.idioma, cor: l.cor, logo: l.logo,
        shopify_domain: l.shopify_domain, shopify_token: l.shopify_token,
        whop_company_id: l.whop_company_id, whop_key: l.whop_key,
        gateway: l.gateway || 'whop', stripe_key: l.stripe_key,
        pixel_fb: l.pixel_fb, pixel_fb_token: l.pixel_fb_token,
        pixel_tt: l.pixel_tt, pixel_tt_token: l.pixel_tt_token,
        detectar_moeda: !!l.detectar_moeda, detectar_idioma: !!l.detectar_idioma,
        shopify_connected: !!l.shopify_connected, whop_connected: !!l.whop_connected
      });
    },
    saveConfig: function (cfg) {
      if (USE_BACKEND) return post('/api/config_save.php', cfg);
      var lojas = load('rone_lojas', []);
      var i = lojas.findIndex(function (x) { return x.id === cfg.loja_id; });
      if (i < 0) return Promise.resolve({ erro: 'Loja não encontrada' });
      Object.keys(cfg).forEach(function (k) { if (k !== 'loja_id') lojas[i][k] = cfg[k]; });
      lojas[i].shopify_connected = !!((lojas[i].shopify_domain && lojas[i].shopify_token)) || !!lojas[i].shopify_connected;
      lojas[i].whop_connected = !!(lojas[i].whop_key && lojas[i].whop_company_id);
      save('rone_lojas', lojas);
      return Promise.resolve({ sucesso: true, loja: lojas[i] });
    }
  };
})();
