/* ===========================================================================
   app.js — Lógica do Painel.
   CRUD: Lojas, Produtos, Domínios, Ads (custos), Fretes, Configurações/credenciais.
   Modais no lugar de prompt/confirm (que são bloqueados em iframes de preview).
   Usa window.API (dados) e window.PainelNav (navegação).
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
  function val(s) { var e = $(s); return e ? e.value : ''; }
  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#111;border:1px solid var(--gold-border);color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;z-index:10001;box-shadow:0 8px 30px rgba(0,0,0,.5)';
    document.body.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, 1800);
  }
  function flashSaved(btn) { if (!btn) return; var o = btn.textContent; btn.textContent = '✓ Salvo'; setTimeout(function () { btn.textContent = o; }, 1500); }

  // ----- Modal (substitui prompt/confirm) -----------------------------------
  function modal(opts) {
    var ov = $('#modalOverlay'); if (!ov) return;
    $('#modalTitle').textContent = opts.title || '';
    $('#modalSub').textContent = opts.sub || '';
    $('#modalBody').innerHTML = opts.fieldsHTML || '';
    var ok = $('#modalOk'); ok.textContent = opts.okText || 'Confirmar';
    ok.style.display = opts.hideOk ? 'none' : '';
    ov.classList.add('open');
    var first = $('#modalBody input, #modalBody select, #modalBody textarea');
    if (first) setTimeout(function () { first.focus(); }, 60);
    function close() { ov.classList.remove('open'); ok.onclick = null; $('#modalCancel').onclick = null; ov.onclick = null; }
    $('#modalCancel').onclick = close;
    ok.onclick = function () { if (opts.onOk) { if (opts.onOk() === false) return; } close(); };
    ov.onclick = function (e) { if (e.target === ov) close(); };
  }
  function confirmModal(msg, onYes) {
    modal({ title: 'Confirmar', sub: msg, fieldsHTML: '', okText: 'Sim, continuar', onOk: function () { if (onYes) onYes(); } });
  }

  // ----- LOJAS --------------------------------------------------------------
  function renderLojas() {
    var grid = $('#lojasGrid'); if (!grid) return;
    API.listLojas().then(function (lojas) {
      grid.innerHTML = lojas.map(function (l) {
        var tags = '';
        tags += '<span class="store-tag ' + (l.shopify_connected ? 'shopify' : 'brl') + '">' + (l.shopify_connected ? '✓ ' : '○ ') + 'Shopify</span>';
        tags += '<span class="store-tag ' + (l.whop_connected ? 'whop' : 'brl') + '">' + (l.whop_connected ? '✓ ' : '○ ') + 'WHOP</span>';
        tags += '<span class="store-tag brl">' + esc(l.moeda) + '</span>';
        return '<div class="store-card" data-id="' + esc(l.id) + '">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
              '<div class="store-card-logo" style="font-weight:800;">' + esc((l.nome || 'L').slice(0, 3)) + '</div>' +
              '<div style="display:flex;gap:6px;">' +
                '<button class="icon-btn js-edit" title="Editar">✎</button>' +
                '<button class="icon-btn js-cfg" title="Config">⚙</button>' +
                '<button class="icon-btn danger js-del" title="Excluir">🗑</button>' +
              '</div></div>' +
            '<div class="store-card-name">' + esc(l.nome) + '</div>' +
            '<div class="store-card-id">ID: ' + esc(l.checkout_id || l.id) + '</div>' +
            '<div class="store-tags">' + tags + '</div>' +
            '<div class="store-card-actions">' +
              '<button class="btn btn-outline js-ver">↗ Ver checkout</button>' +
              '<button class="btn btn-gold js-dash">▦ Dashboard</button>' +
            '</div></div>';
      }).join('');
      $$('.store-card', grid).forEach(function (card) {
        var id = card.dataset.id;
        $('.js-del', card).onclick = function () { confirmModal('Excluir esta loja e seus produtos?', function () { API.deleteLoja(id).then(function () { renderLojas(); toast('Loja excluída'); }); }); };
        $('.js-dash', card).onclick = function () { API.lojaAtual(id); refreshStoreLabels(); PainelNav.showView('dashboard'); };
        $('.js-ver', card).onclick = function () { toast('Abrindo checkout da loja…'); };
        $('.js-edit', card).onclick = function () { editarLoja(id); };
        $('.js-cfg', card).onclick = function () { API.lojaAtual(id); refreshStoreLabels(); PainelNav.showView('configuracoes'); };
      });
    });
  }
  function lojaModal(loja) {
    var l = loja || {};
    modal({
      title: l.id ? 'Editar loja' : 'Nova loja',
      sub: 'Loja de checkout.',
      fieldsHTML:
        '<div class="form-group"><label class="form-label">Nome</label><input class="form-control" id="mlNome" value="' + esc(l.nome || '') + '" placeholder="Minha Loja"/></div>' +
        '<div class="form-row"><div class="form-group"><label class="form-label">Moeda</label><select class="form-control" id="mlMoeda">' +
          ['BRL', 'ARS', 'USD', 'EUR'].map(function (m) { return '<option' + (l.moeda === m ? ' selected' : '') + '>' + m + '</option>'; }).join('') +
        '</select></div><div class="form-group"><label class="form-label">Idioma</label><select class="form-control" id="mlIdioma">' +
          [['pt', 'Português'], ['es', 'Espanhol'], ['en', 'Inglês']].map(function (o) { return '<option value="' + o[0] + '"' + (l.idioma === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
        '</select></div></div>',
      okText: l.id ? 'Salvar' : 'Criar loja',
      onOk: function () {
        var nome = val('#mlNome').trim(); if (!nome) { toast('Informe o nome'); return false; }
        var dados = { nome: nome, moeda: val('#mlMoeda'), idioma: val('#mlIdioma') };
        if (l.id) { dados.id = l.id; dados.checkout_id = l.checkout_id; dados.shopify_connected = l.shopify_connected; dados.whop_connected = l.whop_connected; dados.cor = l.cor; }
        API.saveLoja(dados).then(function () { renderLojas(); refreshStoreLabels(); toast(l.id ? 'Loja atualizada' : 'Loja criada'); });
      }
    });
  }
  function novaLoja() { lojaModal(null); }
  function editarLoja(id) { API.listLojas().then(function (ls) { lojaModal(ls.filter(function (x) { return x.id === id; })[0]); }); }

  // ----- PRODUTOS -----------------------------------------------------------
  function renderProdutos() {
    var box = $('#produtosList'); if (!box) return;
    API.listProdutos(API.lojaAtual()).then(function (prods) {
      if (!prods.length) {
        box.innerHTML = '<div class="card"><div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg><h3>Nenhum produto</h3><p>Crie um produto abaixo para gerar links de checkout avulsos.</p></div></div>';
        return;
      }
      box.innerHTML = prods.map(function (p) {
        return '<div class="prod-row" data-id="' + esc(p.id) + '">' +
            '<div class="prod-thumb">' + (p.imagem ? '<img src="' + esc(p.imagem) + '" style="width:100%;height:100%;border-radius:8px;object-fit:cover;">' : '📦') + '</div>' +
            '<div class="prod-info"><div class="prod-nome">' + esc(p.nome) + '</div>' +
              '<div class="prod-meta">' + esc(p.tipo === 'digital' ? 'Digital' : 'Físico') + ' · ' + esc(p.moeda) + ' · <span class="prod-link">' + esc(p.checkout_url || ('/pay/' + p.id)) + '</span></div></div>' +
            '<button class="btn btn-outline js-copy">⧉ Link</button>' +
            '<button class="icon-btn danger js-delp">🗑</button></div>';
      }).join('');
      $$('.prod-row', box).forEach(function (row) {
        var id = row.dataset.id;
        $('.js-delp', row).onclick = function () { confirmModal('Excluir este produto?', function () { API.deleteProduto(id).then(function () { renderProdutos(); toast('Produto excluído'); }); }); };
        $('.js-copy', row).onclick = function () { var link = $('.prod-link', row).textContent; if (navigator.clipboard) navigator.clipboard.writeText(location.origin + link); toast('Link copiado'); };
      });
    });
  }
  function criarProduto() {
    var nome = val('#prodNome').trim();
    if (!nome) { toast('Informe o nome do produto'); return; }
    var fileInput = $('#prodImagem');
    var prod = {
      loja_id: API.lojaAtual(), nome: nome, tipo: val('#prodTipo'),
      preco: parseFloat(val('#prodPreco')) || 0,
      descricao: val('#prodDescricao').trim(), moeda: val('#prodMoeda'), idioma: val('#prodIdioma'),
      cor: val('#prodCor').trim(),
      detectar_moeda: $('#prodDetMoeda') ? $('#prodDetMoeda').checked : false,
      detectar_idioma: $('#prodDetIdioma') ? $('#prodDetIdioma').checked : false
    };
    function done() {
      API.saveProduto(prod).then(function () {
        renderProdutos(); toast('Produto criado ✓');
        $('#prodNome').value = ''; $('#prodDescricao').value = ''; $('#prodCor').value = '';
        if ($('#prodPreco')) $('#prodPreco').value = '';
        if (fileInput) fileInput.value = '';
      });
    }
    if (fileInput && fileInput.files && fileInput.files[0]) {
      var fr = new FileReader(); fr.onload = function () { prod.imagem = fr.result; done(); }; fr.readAsDataURL(fileInput.files[0]);
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
      var status = val('#pedFiltroStatus'); var q = (val('#pedBusca') || '').toLowerCase().trim();
      var filtered = peds.filter(function (p) {
        if (status && p.status !== status) return false;
        if (q && (p.cliente_email + ' ' + (p.cliente_nome || '') + ' ' + p.id).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      if ($('#pedidosCount')) $('#pedidosCount').textContent = filtered.length;
      body.innerHTML = filtered.length ? filtered.map(function (p) {
        return '<tr>' +
          '<td class="td-muted td-mono">#' + esc(p.id.replace(/^ped_/, '')) + '</td>' +
          '<td>' + (p.cliente_nome ? '<div style="font-size:12px;">' + esc(p.cliente_nome) + '</div>' : '') + '<div style="font-size:11px;color:var(--text-secondary);">' + esc(p.cliente_email) + '</div></td>' +
          '<td><div style="font-size:11px;">' + esc(p.itens_count) + ' item(s)</div><div style="font-size:10.5px;color:var(--text-secondary);">' + esc(p.items_preview || '') + '</div></td>' +
          '<td><span class="badge info">' + esc(p.metodo) + '</span></td>' +
          '<td class="td-mono" style="color:var(--gold-base);">' + money(p.valor, 'ARS') + '</td>' +
          '<td>' + badgeStatus(p.status) + '</td>' +
          '<td class="td-muted" style="font-size:10.5px;">' + esc(p.created_at) + '</td>' +
          '<td><button class="btn btn-outline" style="font-size:10.5px;">👁 Ver</button></td></tr>';
      }).join('') : '<tr><td colspan="8" class="td-muted" style="text-align:center;padding:30px;">Nenhum pedido ainda. Pedidos aparecem aqui quando o checkout registra vendas.</td></tr>';
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
    var lojaId = API.lojaAtual();
    Promise.all([API.listCarrinhos(lojaId), API.listPedidos(lojaId)]).then(function (res) {
      var r = res[0], peds = res[1] || [];
      var carts = r.carrinhos || [];
      var sessions = carts.length + peds.length;
      var comprou = peds.filter(function (p) { return p.status === 'paid'; }).length;
      var emEmail = carts.filter(function (c) { return c.cliente_email || c.email; }).length + peds.length;
      var emEnd = carts.filter(function (c) { return c.step === 'address' || c.step === 'payment'; }).length + peds.length;
      var emPay = carts.filter(function (c) { return c.step === 'payment'; }).length + peds.length;
      var parou = carts.filter(function (c) { return c.step === 'payment'; }).length;

      if ($('#cartAbandonados')) $('#cartAbandonados').textContent = carts.length;
      if ($('#cartCount')) $('#cartCount').textContent = carts.length;
      if ($('#cartConv')) $('#cartConv').textContent = (sessions ? (comprou / sessions * 100) : 0).toFixed(1).replace('.', ',') + '%';
      if ($('#cartParou')) $('#cartParou').textContent = parou;
      if ($('#fnSessoes')) $('#fnSessoes').textContent = sessions;

      function fn(countId, fillId, pctId, n) {
        var pct = sessions ? Math.round(n / sessions * 100) : 0;
        if ($('#' + countId)) $('#' + countId).textContent = n;
        if ($('#' + pctId)) $('#' + pctId).textContent = pct + '%';
        if ($('#' + fillId)) $('#' + fillId).style.width = (n > 0 ? Math.max(pct, 2) : 0) + '%';
      }
      fn('fnVisitCount', 'fnVisitFill', 'fnVisitPct', sessions);
      fn('fnEmailCount', 'fnEmailFill', 'fnEmailPct', emEmail);
      fn('fnEndCount', 'fnEndFill', 'fnEndPct', emEnd);
      fn('fnPayCount', 'fnPayFill', 'fnPayPct', emPay);
      fn('fnBuyCount', 'fnBuyFill', 'fnBuyPct', comprou);

      body.innerHTML = carts.length ? carts.map(function (c) {
        return '<tr>' +
          '<td><div style="font-size:12px;color:var(--text-secondary);">' + esc(c.cliente_email) + '</div><div style="font-size:10.5px;color:var(--text-muted);">🌐 ' + esc(c.ip || '') + '</div></td>' +
          '<td><span class="badge info">✉ ' + esc(c.step || 'E-mail') + '</span></td>' +
          '<td class="td-mono">' + money(c.valor, 'ARS') + '</td>' +
          '<td class="td-muted">' + esc(c.cidade || '—') + '</td>' +
          '<td class="td-muted" style="font-size:11px;">' + esc(c.quando || '') + '</td>' +
          '<td style="display:flex;gap:6px;"><button class="icon-btn">➤</button><button class="btn btn-outline" style="font-size:10.5px;">👁 Ver</button></td></tr>';
      }).join('') : '<tr><td colspan="6" class="td-muted" style="text-align:center;padding:30px;">Nenhum carrinho abandonado ainda.</td></tr>';
    });
  }

  // ----- FRETES -------------------------------------------------------------
  function renderFretes() {
    var box = $('#fretesList'); if (!box) return;
    API.listFretes(API.lojaAtual()).then(function (list) {
      box.innerHTML = list.length ? list.map(function (f) {
        return '<div class="frete-item" data-id="' + esc(f.id) + '"><span class="frete-dot"></span><span class="frete-name">' + esc(f.nome) + '</span><span class="frete-price">' + (f.preco > 0 ? money(f.preco, 'ARS') : 'Grátis') + '</span><button class="btn btn-outline" style="font-size:10.5px;">Desativar</button><button class="icon-btn danger js-delf">🗑</button></div>';
      }).join('') : '<p style="font-size:12px;color:var(--text-secondary);padding:6px 0;">Nenhum método de entrega ainda. Adicione um abaixo.</p>';
      $$('.frete-item', box).forEach(function (row) {
        $('.js-delf', row).onclick = function () { API.deleteFrete(row.dataset.id).then(function () { renderFretes(); }); };
      });
    });
  }
  function addFrete() {
    var nome = val('#freteNome').trim(); if (!nome) { toast('Informe o nome do frete'); return; }
    var preco = parseFloat(val('#fretePreco')); if (isNaN(preco) || preco < 0) preco = 0;
    API.saveFrete({ loja_id: API.lojaAtual(), nome: nome, preco: preco, dias_min: +val('#freteMin') || null, dias_max: +val('#freteMax') || null })
      .then(function () { $('#freteNome').value = ''; $('#fretePreco').value = '0'; $('#freteMin').value = ''; $('#freteMax').value = ''; renderFretes(); toast('Frete adicionado'); });
  }

  // ----- DOMÍNIOS -----------------------------------------------------------
  function renderDominios() {
    var box = $('#dominiosList'); if (!box) return;
    API.listDominios(API.lojaAtual()).then(function (list) {
      if ($('#domCount')) $('#domCount').textContent = list.length;
      if (!list.length) { box.innerHTML = '<div class="card"><div class="empty-state"><h3>Nenhum domínio</h3><p>Adicione um domínio customizado para o seu checkout.</p></div></div>'; return; }
      box.innerHTML = list.map(function (d) {
        return '<div class="domain-row" data-id="' + esc(d.id) + '"><div style="flex:1;">' +
            '<div style="display:flex;align-items:center;gap:10px;"><span class="domain-name">' + esc(d.dominio) + '</span><span class="badge success dot">' + esc(d.status || 'Ativo') + '</span><span style="font-size:11px;color:var(--text-secondary);">expira em ' + esc(d.expira || '88') + ' dias</span></div>' +
            '<div class="domain-meta"><span>🔗 CNAME → pay.nonexcheckout.com</span><span>Criado em ' + esc(d.criado || '—') + '</span></div></div>' +
          '<button class="btn btn-outline" style="font-size:10.5px;">↗ Abrir</button>' +
          '<button class="btn btn-outline" style="font-size:10.5px;">↻ Renovar</button>' +
          '<button class="icon-btn danger js-deld">🗑</button></div>';
      }).join('');
      $$('.domain-row', box).forEach(function (row) {
        $('.js-deld', row).onclick = function () { confirmModal('Remover este domínio?', function () { API.deleteDominio(row.dataset.id).then(function () { renderDominios(); toast('Domínio removido'); }); }); };
      });
    });
  }
  function addDominio() {
    modal({
      title: 'Adicionar domínio',
      sub: 'Subdomínio que apontará via CNAME para pay.nonexcheckout.com',
      fieldsHTML: '<div class="form-group"><label class="form-label">Domínio</label><input class="form-control" id="mdDom" placeholder="pago.sualoja.com"/></div>',
      okText: 'Adicionar',
      onOk: function () {
        var d = val('#mdDom').trim().toLowerCase(); if (!d) { toast('Informe o domínio'); return false; }
        API.saveDominio({ loja_id: API.lojaAtual(), dominio: d, criado: new Date().toLocaleDateString('pt-BR') }).then(function () { renderDominios(); toast('Domínio adicionado'); });
      }
    });
  }

  // ----- ADS (custos) -------------------------------------------------------
  function renderAds() {
    var lojaId = API.lojaAtual();
    Promise.all([API.listAds(lojaId), API.listPedidos(lojaId)]).then(function (res) {
      var ads = res[0], peds = res[1];
      var total = ads.reduce(function (s, a) { return s + (+a.valor || 0); }, 0);
      var receita = peds.filter(function (p) { return p.status === 'paid'; }).reduce(function (s, p) { return s + (+p.valor || 0); }, 0);
      var media = total / 30, lucro = receita - total, roas = total > 0 ? receita / total : 0;
      if ($('#adTotal')) $('#adTotal').textContent = money(total, 'ARS');
      if ($('#adTotalSub')) $('#adTotalSub').textContent = ads.length + ' lançamento(s)';
      if ($('#adMedia')) $('#adMedia').textContent = money(media, 'ARS');
      if ($('#adRoas')) $('#adRoas').textContent = total > 0 ? roas.toFixed(2) + 'x' : '—';
      if ($('#adLucro')) $('#adLucro').textContent = money(lucro, 'ARS');
      if ($('#adInvestDiario')) $('#adInvestDiario').textContent = money(total, 'ARS');
      var list = $('#adsList'), empty = $('#adsEmpty');
      if (!ads.length) { if (list) list.innerHTML = ''; if (empty) empty.style.display = ''; return; }
      if (empty) empty.style.display = 'none';
      list.innerHTML = ads.map(function (a) {
        return '<div class="ad-row" data-id="' + esc(a.id) + '"><div><div class="ad-plat">' + esc(a.plataforma || 'Ads') + '</div><div class="ad-date">' + esc(a.data || '') + '</div></div><div class="ad-amount">-' + money(a.valor, 'ARS') + '</div><button class="icon-btn danger js-dela">🗑</button></div>';
      }).join('');
      $$('.ad-row', list).forEach(function (row) { $('.js-dela', row).onclick = function () { API.deleteAd(row.dataset.id).then(function () { renderAds(); }); }; });
    });
  }
  function addAdCusto() {
    var hoje = new Date().toISOString().slice(0, 10);
    modal({
      title: 'Novo custo de anúncio',
      sub: 'Registre o gasto para calcular ROAS e lucro.',
      fieldsHTML:
        '<div class="form-row"><div class="form-group"><label class="form-label">Plataforma</label><select class="form-control" id="maPlat"><option>Facebook Ads</option><option>TikTok Ads</option><option>Google Ads</option><option>Outro</option></select></div>' +
        '<div class="form-group"><label class="form-label">Data</label><input class="form-control" id="maData" type="date" value="' + hoje + '"/></div></div>' +
        '<div class="form-group"><label class="form-label">Valor gasto</label><input class="form-control" id="maValor" type="number" step="0.01" placeholder="0,00"/></div>',
      okText: 'Adicionar custo',
      onOk: function () {
        var v = parseFloat(val('#maValor')); if (!(v > 0)) { toast('Informe um valor válido'); return false; }
        API.saveAd({ loja_id: API.lojaAtual(), plataforma: val('#maPlat'), data: val('#maData'), valor: v }).then(function () { renderAds(); toast('Custo adicionado'); });
      }
    });
  }

  // ----- CONFIG / CREDENCIAIS (Shopify, Whop, Stripe, Pixels) ---------------
  function selectedGateway() { var c = $$('.gateway-card.selected')[0]; return c ? c.dataset.gateway : 'whop'; }
  function setSelectByText(sel, needle) {
    if (!sel || !needle) return; needle = String(needle).toLowerCase();
    for (var i = 0; i < sel.options.length; i++) { if (sel.options[i].text.toLowerCase().indexOf(needle) >= 0) { sel.selectedIndex = i; return; } }
  }
  function moedaFromSelect(sel) { return sel ? (sel.value.split(/[\s-]/)[0] || '').toUpperCase() : ''; }
  function idiomaFromSelect(sel) {
    if (!sel) return ''; var t = sel.value.toLowerCase();
    if (t.indexOf('portug') >= 0) return 'pt'; if (t.indexOf('espan') >= 0) return 'es';
    if (t.indexOf('ingl') >= 0 || t.indexOf('engl') >= 0) return 'en'; return 'pt';
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
  function saveGateway(btn) { API.saveConfig({ loja_id: API.lojaAtual(), gateway: selectedGateway(), whop_key: val('#whopKey'), whop_company_id: val('#whopCompany'), stripe_key: val('#stripeKey') }).then(function () { flashSaved(btn); toast('Gateway salvo'); }); }
  function saveFb(btn) { API.saveConfig({ loja_id: API.lojaAtual(), pixel_fb: val('#fbPixel'), pixel_fb_token: val('#fbToken') }).then(function () { flashSaved(btn); toast('Pixel Facebook salvo'); }); }
  function saveTt(btn) { API.saveConfig({ loja_id: API.lojaAtual(), pixel_tt: val('#ttPixel'), pixel_tt_token: val('#ttToken') }).then(function () { flashSaved(btn); toast('Pixel TikTok salvo'); }); }
  function saveCfg(btn) {
    API.saveConfig({
      loja_id: API.lojaAtual(), moeda: moedaFromSelect($('#cfgMoeda')), idioma: idiomaFromSelect($('#cfgIdioma')),
      cor: val('#cfgCor') || '#000000',
      detectar_moeda: $('#cfgDetMoeda') ? $('#cfgDetMoeda').checked : false,
      detectar_idioma: $('#cfgDetIdioma') ? $('#cfgDetIdioma').checked : false,
      shopify_domain: val('#cfgShopDomain').trim(), shopify_token: val('#cfgShopToken').trim()
    }).then(function () { flashSaved(btn); toast('Configurações salvas'); loadConfig(); });
  }

  // ----- Nome da loja dinâmico (sem nome fixo no HTML) ----------------------
  function refreshStoreLabels() {
    API.listLojas().then(function (lojas) {
      var l = lojas.filter(function (x) { return x.id === API.lojaAtual(); })[0] || lojas[0];
      if (!l) return;
      $$('[data-store]').forEach(function (e) { e.textContent = l.nome; });
      if ($('#topbarStore')) $('#topbarStore').textContent = l.checkout_id || l.id;
    });
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
      case 'dominios': renderDominios(); break;
      case 'ads': renderAds(); break;
      case 'liveview': if (window.RoneGlobe) setTimeout(function () { RoneGlobe.ensure('#globeBox'); }, 30); break;
      case 'integracoes': case 'pixels': case 'configuracoes': loadConfig(); break;
    }
  }

  // ----- Boot ---------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    if (window.PainelNav) PainelNav.initNavigation();
    $$('[data-view]').forEach(function (el) { el.addEventListener('click', function () { setTimeout(function () { renderView(el.dataset.view); }, 0); }); });

    if ($('#novaLoja')) $('#novaLoja').onclick = novaLoja;
    if ($('#prodCriar')) $('#prodCriar').onclick = criarProduto;
    if ($('#freteAdd')) $('#freteAdd').onclick = addFrete;
    if ($('#domAdd')) $('#domAdd').onclick = addDominio;
    if ($('#adNovo')) $('#adNovo').onclick = addAdCusto;
    if ($('#adPrimeiro')) $('#adPrimeiro').onclick = addAdCusto;
    if ($('#pedBuscar')) $('#pedBuscar').onclick = renderPedidos;
    if ($('#pedFiltroStatus')) $('#pedFiltroStatus').onchange = renderPedidos;
    if ($('#pedBusca')) $('#pedBusca').addEventListener('keyup', function (e) { if (e.key === 'Enter') renderPedidos(); });

    $$('.gateway-card').forEach(function (c) { c.addEventListener('click', function () { $$('.gateway-card').forEach(function (x) { x.classList.remove('selected'); }); c.classList.add('selected'); }); });
    if ($('#gatewaySave')) $('#gatewaySave').onclick = function () { saveGateway(this); };
    if ($('#fbSave')) $('#fbSave').onclick = function () { saveFb(this); };
    if ($('#ttSave')) $('#ttSave').onclick = function () { saveTt(this); };
    if ($('#cfgSalvar')) $('#cfgSalvar').onclick = function () { saveCfg(this); };
    if ($('#shopSync')) $('#shopSync').onclick = function () {
      if (API.usandoBackend()) toast('Sincronizando produtos da Shopify…');
      else toast('Conecte a Shopify e ligue o backend (USE_BACKEND) para sincronizar.');
    };
    if ($('#shopDisconnect')) $('#shopDisconnect').onclick = function () { confirmModal('Desconectar a Shopify desta loja?', function () { API.saveConfig({ loja_id: API.lojaAtual(), shopify_domain: '', shopify_token: '' }).then(function () { loadConfig(); toast('Shopify desconectada'); }); }); };

    if ($('#navLogout')) $('#navLogout').onclick = function () { if (window.RoneAuth) RoneAuth.logout(); };

    // mostra o e-mail logado no rodapé da sidebar
    if (window.RoneAuth) { var em = RoneAuth.email(); var ue = $('.user-email'); if (em && ue) ue.textContent = em; }

    var mt = $('#menuToggle'), sb = $('#sidebar');
    if (mt && sb) mt.addEventListener('click', function () { sb.classList.toggle('open'); });

    refreshStoreLabels();
    renderView((location.hash || '#dashboard').slice(1));
  });
})();
