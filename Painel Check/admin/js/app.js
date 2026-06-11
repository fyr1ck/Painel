/* ===========================================================================
   app.js — Lógica do Painel: renderização das telas + CRUD de Produtos e Lojas.
   Usa window.API (camada de dados) e window.PainelNav (navegação).
   =========================================================================== */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ----- Helpers ------------------------------------------------------------
  function money(v, moeda) {
    moeda = moeda || 'ARS';
    var locale = moeda === 'BRL' ? 'pt-BR' : (moeda === 'USD' ? 'en-US' : 'es-AR');
    try { return new Intl.NumberFormat(locale, { style: 'currency', currency: moeda }).format(+v || 0); }
    catch (e) { return '$ ' + (+v || 0).toFixed(2); }
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#111;border:1px solid var(--gold-border);color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;z-index:9999;box-shadow:0 8px 30px rgba(0,0,0,.5)';
    document.body.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, 1800);
  }
  function flashSaved(btn) { if (!btn) return; var o = btn.textContent; btn.textContent = '\u2713 Salvo'; setTimeout(function () { btn.textContent = o; }, 1500); }

  // ----- LOJAS --------------------------------------------------------------
  function renderLojas() {
    var grid = $('#lojasGrid'); if (!grid) return;
    API.listLojas().then(function (lojas) {
      grid.innerHTML = lojas.map(function (l) {
        var tags = '';
        tags += '<span class="store-tag ' + (l.shopify_connected ? 'shopify' : 'brl') + '">' + (l.shopify_connected ? '\u2713 ' : '\u25CB ') + 'Shopify</span>';
        tags += '<span class="store-tag ' + (l.whop_connected ? 'whop' : 'brl') + '">' + (l.whop_connected ? '\u2713 ' : '\u25CB ') + 'WHOP</span>';
        tags += '<span class="store-tag brl">' + esc(l.moeda) + '</span>';
        return '' +
          '<div class="store-card" data-id="' + esc(l.id) + '">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
              '<div class="store-card-logo" style="font-weight:800;">' + esc((l.nome || 'L').slice(0, 3)) + '</div>' +
              '<div style="display:flex;gap:6px;">' +
                '<button class="icon-btn js-edit" title="Editar">\u270E</button>' +
                '<button class="icon-btn" title="Config" data-go="configuracoes">\u2699</button>' +
                '<button class="icon-btn danger js-del" title="Excluir">\uD83D\uDDD1</button>' +
              '</div>' +
            '</div>' +
            '<div class="store-card-name">' + esc(l.nome) + '</div>' +
            '<div class="store-card-id">ID: ' + esc(l.checkout_id || l.id) + '</div>' +
            '<div class="store-tags">' + tags + '</div>' +
            '<div class="store-card-actions">' +
              '<button class="btn btn-outline js-ver">\u2197 Ver checkout</button>' +
              '<button class="btn btn-gold js-dash">\u25A6 Dashboard</button>' +
            '</div>' +
          '</div>';
      }).join('');

      $$('.store-card', grid).forEach(function (card) {
        var id = card.dataset.id;
        var del = $('.js-del', card); if (del) del.onclick = function () {
          if (confirm('Excluir esta loja e seus produtos?')) API.deleteLoja(id).then(function () { renderLojas(); toast('Loja exclu\u00edda'); });
        };
        var dash = $('.js-dash', card); if (dash) dash.onclick = function () { API.lojaAtual(id); refreshStoreLabels(); PainelNav.showView('dashboard'); };
        var ver = $('.js-ver', card); if (ver) ver.onclick = function () { toast('Abrindo checkout da loja\u2026'); };
        var edit = $('.js-edit', card); if (edit) edit.onclick = function () { editarLoja(id); };
        var go = $('[data-go]', card); if (go) go.onclick = function () { API.lojaAtual(id); refreshStoreLabels(); PainelNav.showView('configuracoes'); };
      });
    });
  }
  function novaLoja() {
    var nome = prompt('Nome da nova loja:', 'Minha Loja'); if (!nome) return;
    var moeda = prompt('Moeda (BRL, ARS, USD):', 'BRL') || 'BRL';
    API.saveLoja({ nome: nome, moeda: moeda.toUpperCase(), idioma: moeda.toUpperCase() === 'BRL' ? 'pt' : 'es' })
      .then(function () { renderLojas(); toast('Loja criada'); });
  }
  function editarLoja(id) {
    API.listLojas().then(function (lojas) {
      var l = lojas.filter(function (x) { return x.id === id; })[0]; if (!l) return;
      var nome = prompt('Nome da loja:', l.nome); if (nome == null) return;
      var moeda = prompt('Moeda:', l.moeda) || l.moeda;
      API.saveLoja({ id: id, nome: nome, moeda: moeda.toUpperCase(), idioma: l.idioma, cor: l.cor, checkout_id: l.checkout_id, shopify_connected: l.shopify_connected, whop_connected: l.whop_connected }).then(function () { renderLojas(); toast('Loja atualizada'); });
    });
  }

  // ----- PRODUTOS -----------------------------------------------------------
  function renderProdutos() {
    var box = $('#produtosList'); if (!box) return;
    var lojaId = API.lojaAtual();
    API.listProdutos(lojaId).then(function (prods) {
      if (!prods.length) {
        box.innerHTML = '<div class="card"><div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg><h3>Nenhum produto</h3><p>Crie um produto abaixo para gerar links de checkout avulsos.</p></div></div>';
        return;
      }
      box.innerHTML = prods.map(function (p) {
        return '' +
          '<div class="prod-row" data-id="' + esc(p.id) + '">' +
            '<div class="prod-thumb">' + (p.imagem ? '<img src="' + esc(p.imagem) + '" style="width:100%;height:100%;border-radius:8px;object-fit:cover;">' : '\uD83D\uDCE6') + '</div>' +
            '<div class="prod-info"><div class="prod-nome">' + esc(p.nome) + '</div>' +
              '<div class="prod-meta">' + esc(p.tipo === 'digital' ? 'Digital' : 'F\u00edsico') + ' \u00b7 ' + esc(p.moeda) + ' \u00b7 <span class="prod-link">' + esc(p.checkout_url || ('/pay/' + p.id)) + '</span></div></div>' +
            '<button class="btn btn-outline js-copy">\u29C9 Link</button>' +
            '<button class="icon-btn danger js-delp">\uD83D\uDDD1</button>' +
          '</div>';
      }).join('');
      $$('.prod-row', box).forEach(function (row) {
        var id = row.dataset.id;
        $('.js-delp', row).onclick = function () { if (confirm('Excluir este produto?')) API.deleteProduto(id).then(function () { renderProdutos(); toast('Produto exclu\u00eddo'); }); };
        $('.js-copy', row).onclick = function () { var link = $('.prod-link', row).textContent; if (navigator.clipboard) navigator.clipboard.writeText(location.origin + link); toast('Link copiado'); };
      });
    });
  }
  function criarProduto() {
    var nome = $('#prodNome').value.trim();
    if (!nome) { toast('Informe o nome do produto'); return; }
    var fileInput = $('#prodImagem');
    var prod = {
      loja_id: API.lojaAtual(),
      nome: nome,
      tipo: $('#prodTipo').value,
      descricao: $('#prodDescricao').value.trim(),
      moeda: $('#prodMoeda').value,
      idioma: $('#prodIdioma').value,
      cor: $('#prodCor').value.trim(),
      detectar_moeda: $('#prodDetMoeda').checked,
      detectar_idioma: $('#prodDetIdioma').checked
    };
    function done() {
      API.saveProduto(prod).then(function () {
        renderProdutos(); toast('Produto criado \u2713');
        $('#prodNome').value = ''; $('#prodDescricao').value = ''; $('#prodCor').value = '';
        if (fileInput) fileInput.value = '';
      });
    }
    if (fileInput && fileInput.files && fileInput.files[0]) {
      var fr = new FileReader();
      fr.onload = function () { prod.imagem = fr.result; done(); };
      fr.readAsDataURL(fileInput.files[0]);
    } else { done(); }
  }

  // ----- PEDIDOS ------------------------------------------------------------
  function badgeStatus(s) {
    if (s === 'paid') return '<span class="badge success dot">Pago</span>';
    if (s === 'failed') return '<span class="badge danger dot">Falhou</span>';
    return '<span class="badge pending dot">Pendente</span>';
  }
  function renderPedidos() {
    var body = $('#pedidosBody'); if (!body) return;
    API.listPedidos(API.lojaAtual()).then(function (peds) {
      var status = $('#pedFiltroStatus') ? $('#pedFiltroStatus').value : '';
      var q = $('#pedBusca') ? $('#pedBusca').value.toLowerCase().trim() : '';
      var filtered = peds.filter(function (p) {
        if (status && p.status !== status) return false;
        if (q && (p.cliente_email + ' ' + (p.cliente_nome || '') + ' ' + p.id).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      if ($('#pedidosCount')) $('#pedidosCount').textContent = filtered.length;
      body.innerHTML = filtered.map(function (p) {
        return '<tr>' +
          '<td class="td-muted td-mono">#' + esc(p.id.replace(/^ped_/, '')) + '</td>' +
          '<td>' + (p.cliente_nome ? '<div style="font-size:12px;">' + esc(p.cliente_nome) + '</div>' : '') + '<div style="font-size:11px;color:var(--text-secondary);">' + esc(p.cliente_email) + '</div></td>' +
          '<td><div style="font-size:11px;">' + esc(p.itens_count) + ' item(s)</div><div style="font-size:10.5px;color:var(--text-secondary);">' + esc(p.items_preview || '') + '</div></td>' +
          '<td><span class="badge info">' + esc(p.metodo) + '</span></td>' +
          '<td class="td-mono" style="color:var(--gold-base);">' + money(p.valor, 'ARS') + '</td>' +
          '<td>' + badgeStatus(p.status) + '</td>' +
          '<td class="td-muted" style="font-size:10.5px;">' + esc(p.created_at) + '</td>' +
          '<td><button class="btn btn-outline" style="font-size:10.5px;">\uD83D\uDC41 Ver</button></td>' +
        '</tr>';
      }).join('');
    });
  }
  function renderDashPedidos() {
    var body = $('#dashPedidos'); if (!body) return;
    API.listPedidos(API.lojaAtual()).then(function (peds) {
      body.innerHTML = peds.slice(0, 5).map(function (p) {
        return '<tr><td class="td-muted td-mono">#' + esc(p.id.replace(/^ped_/, '')) + '</td>' +
          '<td><div style="font-size:11px;color:var(--text-secondary);">' + esc(p.cliente_email) + '</div></td>' +
          '<td><span class="badge info">' + esc(p.metodo) + '</span></td>' +
          '<td class="td-mono" style="color:var(--gold-base);">' + money(p.valor, 'ARS') + '</td>' +
          '<td>' + badgeStatus(p.status) + '</td>' +
          '<td class="td-muted" style="font-size:10.5px;">' + esc(p.created_at) + '</td></tr>';
      }).join('');
    });
  }

  // ----- CARRINHOS ----------------------------------------------------------
  function renderCarrinhos() {
    var body = $('#carrinhosBody'); if (!body) return;
    API.listCarrinhos(API.lojaAtual()).then(function (r) {
      if ($('#cartAbandonados')) $('#cartAbandonados').textContent = 40;
      if ($('#cartPerdido')) $('#cartPerdido').textContent = money(6746889.91, 'ARS');
      if ($('#cartCount')) $('#cartCount').textContent = r.carrinhos.length;
      body.innerHTML = r.carrinhos.map(function (c) {
        return '<tr>' +
          '<td><div style="font-size:12px;color:var(--text-secondary);">' + esc(c.cliente_email) + '</div><div style="font-size:10.5px;color:var(--text-muted);">\uD83C\uDF10 ' + esc(c.ip || '') + '</div></td>' +
          '<td><span class="badge info">\u2709 E-mail</span></td>' +
          '<td class="td-mono">' + money(c.valor, 'ARS') + '</td>' +
          '<td class="td-muted">\u2014</td>' +
          '<td class="td-muted" style="font-size:11px;">' + esc(c.quando || '') + '</td>' +
          '<td style="display:flex;gap:6px;"><button class="icon-btn">\u27A4</button><button class="btn btn-outline" style="font-size:10.5px;">\uD83D\uDC41 Ver</button></td>' +
        '</tr>';
      }).join('');
    });
  }

  // ----- FRETES -------------------------------------------------------------
  function fretes() { try { return JSON.parse(localStorage.getItem('rone_fretes') || 'null') || seedFretes(); } catch (e) { return seedFretes(); } }
  function seedFretes() { var f = [{ id: 'f1', nome: 'Env\u00edo gratis', preco: 0 }, { id: 'f2', nome: 'Env\u00edo prioritario', preco: 9997 }]; localStorage.setItem('rone_fretes', JSON.stringify(f)); return f; }
  function renderFretes() {
    var box = $('#fretesList'); if (!box) return;
    box.innerHTML = fretes().map(function (f) {
      return '<div class="frete-item" data-id="' + f.id + '"><span class="frete-dot"></span><span class="frete-name">' + esc(f.nome) + '</span><span class="frete-price">' + (f.preco > 0 ? money(f.preco, 'ARS') : 'Gr\u00e1tis') + '</span><button class="btn btn-outline" style="font-size:10.5px;">Desativar</button><button class="icon-btn danger js-delf">\uD83D\uDDD1</button></div>';
    }).join('');
    $$('.frete-item', box).forEach(function (row) {
      $('.js-delf', row).onclick = function () { var list = fretes().filter(function (x) { return x.id !== row.dataset.id; }); localStorage.setItem('rone_fretes', JSON.stringify(list)); renderFretes(); };
    });
  }
  function addFrete() {
    var nome = $('#freteNome').value.trim(); if (!nome) { toast('Informe o nome do frete'); return; }
    var list = fretes(); list.push({ id: 'f' + Date.now(), nome: nome, preco: +$('#fretePreco').value || 0 });
    localStorage.setItem('rone_fretes', JSON.stringify(list)); $('#freteNome').value = ''; $('#fretePreco').value = '0'; renderFretes(); toast('Frete adicionado');
  }

  // ----- Rótulos da loja atual ---------------------------------------------
  function refreshStoreLabels() {
    API.listLojas().then(function (lojas) {
      var l = lojas.filter(function (x) { return x.id === API.lojaAtual(); })[0] || lojas[0];
      if (!l) return;
      if ($('#storeSelectorName')) $('#storeSelectorName').textContent = l.nome;
      if ($('#topbarStore')) $('#topbarStore').textContent = l.checkout_id || l.id;
    });
  }

  // ----- CONFIG / CREDENCIAIS (Shopify, Whop, Stripe, Pixels) --------------
  function val(s) { var e = $(s); return e ? e.value : ''; }
  function selectedGateway() { var c = $$('.gateway-card.selected')[0]; return c ? c.dataset.gateway : 'whop'; }
  function setSelectByText(sel, needle) {
    if (!sel || !needle) return;
    needle = needle.toLowerCase();
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].text.toLowerCase().indexOf(needle) >= 0) { sel.selectedIndex = i; return; }
    }
  }
  function moedaFromSelect(sel) { return sel ? (sel.value.split(/[\s-]/)[0] || '').toUpperCase() : ''; }
  function idiomaFromSelect(sel) {
    if (!sel) return '';
    var t = sel.value.toLowerCase();
    if (t.indexOf('portug') >= 0) return 'pt';
    if (t.indexOf('espan') >= 0) return 'es';
    if (t.indexOf('ingl') >= 0 || t.indexOf('engl') >= 0) return 'en';
    return 'pt';
  }
  function loadConfig() {
    API.getConfig(API.lojaAtual()).then(function (c) {
      if ($('#whopCompany')) $('#whopCompany').value = c.whop_company_id || '';
      if ($('#whopKey')) $('#whopKey').value = c.whop_key || '';
      $$('.gateway-card').forEach(function (card) { card.classList.toggle('selected', card.dataset.gateway === (c.gateway || 'whop')); });
      if ($('#fbPixel')) $('#fbPixel').value = c.pixel_fb || '';
      if ($('#fbToken')) $('#fbToken').value = c.pixel_fb_token || '';
      if ($('#ttPixel')) $('#ttPixel').value = c.pixel_tt || '';
      if ($('#ttToken')) $('#ttToken').value = c.pixel_tt_token || '';
      setSelectByText($('#cfgMoeda'), { ARS: 'ars', BRL: 'real', USD: 'dólar' }[c.moeda] || c.moeda);
      setSelectByText($('#cfgIdioma'), { es: 'espanhol', pt: 'portug', en: 'ingl' }[c.idioma] || c.idioma);
      if ($('#cfgCor')) $('#cfgCor').value = c.cor || '#000000';
      if ($('#cfgDetMoeda')) $('#cfgDetMoeda').checked = !!c.detectar_moeda;
      if ($('#cfgDetIdioma')) $('#cfgDetIdioma').checked = !!c.detectar_idioma;
      if ($('#cfgShopDomain')) $('#cfgShopDomain').value = c.shopify_domain || '';
      if ($('#cfgShopToken')) $('#cfgShopToken').value = c.shopify_token || '';
      if ($('#cfgShopDomainLabel')) $('#cfgShopDomainLabel').textContent = c.shopify_domain || '—';
      if ($('#shopStatus')) $('#shopStatus').textContent = c.shopify_connected ? '● Conectado' : '○ Não conectado';
    });
  }
  function saveGateway(btn) {
    API.saveConfig({ loja_id: API.lojaAtual(), gateway: selectedGateway(), whop_key: val('#whopKey'), whop_company_id: val('#whopCompany'), stripe_key: val('#stripeKey') })
      .then(function () { flashSaved(btn); toast('Gateway salvo'); });
  }
  function saveFb(btn) { API.saveConfig({ loja_id: API.lojaAtual(), pixel_fb: val('#fbPixel'), pixel_fb_token: val('#fbToken') }).then(function () { flashSaved(btn); toast('Pixel Facebook salvo'); }); }
  function saveTt(btn) { API.saveConfig({ loja_id: API.lojaAtual(), pixel_tt: val('#ttPixel'), pixel_tt_token: val('#ttToken') }).then(function () { flashSaved(btn); toast('Pixel TikTok salvo'); }); }
  function saveCfg(btn) {
    API.saveConfig({
      loja_id: API.lojaAtual(),
      moeda: moedaFromSelect($('#cfgMoeda')), idioma: idiomaFromSelect($('#cfgIdioma')),
      cor: val('#cfgCor') || '#000000',
      detectar_moeda: $('#cfgDetMoeda') ? $('#cfgDetMoeda').checked : false,
      detectar_idioma: $('#cfgDetIdioma') ? $('#cfgDetIdioma').checked : false,
      shopify_domain: val('#cfgShopDomain').trim(), shopify_token: val('#cfgShopToken').trim()
    }).then(function () { flashSaved(btn); toast('Configurações salvas'); loadConfig(); });
  }

  // ----- Render por view ----------------------------------------------------
  function renderView(id) {
    switch (id) {
      case 'dashboard': renderDashPedidos(); break;
      case 'pedidos': renderPedidos(); break;
      case 'carrinhos': renderCarrinhos(); break;
      case 'lojas': renderLojas(); break;
      case 'produtos': renderProdutos(); break;
      case 'fretes': renderFretes(); break;
      case 'liveview': if (window.RoneGlobe) setTimeout(function () { RoneGlobe.ensure('#globeBox'); }, 30); break;
      case 'integracoes': case 'pixels': case 'configuracoes': loadConfig(); break;
    }
  }

  // ----- Boot ---------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    if (window.PainelNav) PainelNav.initNavigation();

    $$('[data-view]').forEach(function (el) {
      el.addEventListener('click', function () { setTimeout(function () { renderView(el.dataset.view); }, 0); });
    });

    if ($('#novaLoja')) $('#novaLoja').onclick = novaLoja;
    if ($('#prodCriar')) $('#prodCriar').onclick = criarProduto;
    if ($('#freteAdd')) $('#freteAdd').onclick = addFrete;
    if ($('#pedBuscar')) $('#pedBuscar').onclick = renderPedidos;
    if ($('#pedFiltroStatus')) $('#pedFiltroStatus').onchange = renderPedidos;
    if ($('#pedBusca')) $('#pedBusca').addEventListener('keyup', function (e) { if (e.key === 'Enter') renderPedidos(); });

    $$('.gateway-card').forEach(function (c) {
      c.addEventListener('click', function () { $$('.gateway-card').forEach(function (x) { x.classList.remove('selected'); }); c.classList.add('selected'); });
    });
    if ($('#gatewaySave')) $('#gatewaySave').onclick = function () { saveGateway(this); };
    if ($('#fbSave')) $('#fbSave').onclick = function () { saveFb(this); };
    if ($('#ttSave')) $('#ttSave').onclick = function () { saveTt(this); };
    if ($('#cfgSalvar')) $('#cfgSalvar').onclick = function () { saveCfg(this); };
    if ($('#shopSync')) $('#shopSync').onclick = function () {
      if (API.usandoBackend()) { toast('Sincronizando produtos da Shopify\u2026'); }
      else { toast('Conecte a Shopify e ligue o backend (USE_BACKEND) para sincronizar.'); }
    };
    if ($('#shopDisconnect')) $('#shopDisconnect').onclick = function () {
      if (!confirm('Desconectar a Shopify desta loja?')) return;
      API.saveConfig({ loja_id: API.lojaAtual(), shopify_domain: '', shopify_token: '' }).then(function () { loadConfig(); toast('Shopify desconectada'); });
    };

    var mt = $('#menuToggle'), sb = $('#sidebar');
    if (mt && sb) mt.addEventListener('click', function () { sb.classList.toggle('open'); });

    refreshStoreLabels();
    renderView((location.hash || '#dashboard').slice(1));
  });
})();
