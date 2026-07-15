/**
 * checkout-node/app.js — Checkout nativo (Node puro) INTEGRADO ao painel rone.
 *
 * Correções sobre a versão original do sócio:
 *  - Template literal estava ESCAPADO (\${...}) → mostrava o código na tela. Corrigido.
 *  - Removido o "Wharf" (lixo) da linha do resumo.
 *  - enviarPagamento() e alterarFreteDoPainel() não existiam → implementados.
 *  - Preço, moeda, logo, produto, frete e loja agora são DINÂMICOS (via query).
 *  - Passou a GRAVAR o pedido e rastrear o carrinho no painel (alimenta Pedidos/Carrinhos).
 *  - Pagamento via painel (create_payment.php → Whop/Stripe). NÃO capturamos cartão
 *    no servidor (risco PCI); o pagamento é feito pelo provedor.
 *
 * Link gerado pelo painel:
 *   /pay/<produto_id>?loja_id=..&nome=..&img=..&logo=..&preco=<centavos>&frete=<centavos>&moeda=ARS&idioma=es&api=https://api.seudominio.com
 */
const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3010;

const traducoes = {
  es: { resumo: 'Mostrar resumen del pedido', contacto: 'Contacto', email: 'Correo electrónico o número de teléfono móvil', ofertas: 'Enviarme novedades y ofertas por correo electrónico', entrega: 'Entrega', nombre: 'Nombre', apellido: 'Apellido', direccion: 'Dirección', apartamento: 'Casa, apartamento, etc. (opcional)', ciudad: 'Ciudad', provincia: 'Provincia', codigo_postal: 'Código postal', telefono: 'Teléfono (para novedades de envío)', metodo_envio: 'Método de envío', gratis: 'Gratis', pago: 'Pago', tarjeta: 'Tarjeta de crédito', num_tarjeta: 'Número de tarjeta', vencimento: 'Expiración (MM/AA)', cvc: 'Código de seguridad', nome_tarjeta: 'Nombre en la tarjeta', btn_pagar: 'Pagar ahora', procesando: 'Procesando...', subtotal: 'Subtotal', envio: 'Envío', total: 'Total', tienda: 'Tu Tienda', producto: 'Producto de la Tienda', variante: 'Variante seleccionada' },
  pt: { resumo: 'Mostrar resumo do pedido', contacto: 'Contato', email: 'E-mail ou número de celular', ofertas: 'Quero receber novidades e ofertas por e-mail', entrega: 'Entrega', nombre: 'Nome', apellido: 'Sobrenome', direccion: 'Endereço', apartamento: 'Casa, apartamento, etc. (opcional)', ciudad: 'Cidade', provincia: 'Estado', codigo_postal: 'CEP', telefono: 'Telefone (para novidades do envio)', metodo_envio: 'Forma de envio', gratis: 'Grátis', pago: 'Pagamento', tarjeta: 'Cartão de crédito', num_tarjeta: 'Número do cartão', vencimento: 'Validade (MM/AA)', cvc: 'Código de segurança', nome_tarjeta: 'Nome no cartão', btn_pagar: 'Pagar agora', procesando: 'Processando...', subtotal: 'Subtotal', envio: 'Frete', total: 'Total', tienda: 'Sua Loja', producto: 'Produto da Loja', variante: 'Variante selecionada' },
  en: { resumo: 'Show order summary', contacto: 'Contact', email: 'Email or mobile phone number', ofertas: 'Email me with news and offers', entrega: 'Delivery', nombre: 'First name', apellido: 'Last name', direccion: 'Address', apartamento: 'Apartment, suite, etc. (optional)', ciudad: 'City', provincia: 'State', codigo_postal: 'ZIP code', telefono: 'Phone (for shipping updates)', metodo_envio: 'Shipping method', gratis: 'Free', pago: 'Payment', tarjeta: 'Credit card', num_tarjeta: 'Card number', vencimento: 'Expiration (MM/YY)', cvc: 'Security code', nome_tarjeta: 'Name on card', btn_pagar: 'Pay now', procesando: 'Processing...', subtotal: 'Subtotal', envio: 'Shipping', total: 'Total', tienda: 'Your Store', producto: 'Store Product', variante: 'Selected variant' }
};

function fmt(locale, cents) {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((cents || 0) / 100);
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const parsed = url.parse(req.url, true);
  if (!parsed.pathname.startsWith('/pay/')) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not Found'); return; }

  const q = parsed.query;
  const idioma = ['es', 'pt', 'en'].indexOf(q.idioma) >= 0 ? q.idioma : 'es';
  const t = traducoes[idioma];
  const moeda = String(q.moeda || 'ARS').toUpperCase();
  const locale = moeda === 'BRL' ? 'pt-BR' : (moeda === 'USD' ? 'en-US' : 'es-AR');

  const precoCent = parseInt(q.preco, 10) > 0 ? parseInt(q.preco, 10) : 4167508;
  const freteCent = parseInt(q.frete, 10) >= 0 ? parseInt(q.frete, 10) : 0;
  const totalCent = precoCent + freteCent;

  const logoUrl = q.logo || '';
  const itemImage = q.img || '';
  const nomeProduto = q.nome || t.producto;
  const lojaId = q.loja_id || '';
  const produtoId = parsed.pathname.split('/')[2] || q.produto || '';
  const apiBase = q.api || '';

  const imgTag = itemImage
    ? '<img src="' + itemImage + '" class="w-9 h-9 object-cover rounded">'
    : '<div class="w-9 h-9 bg-gray-100 rounded"></div>';
  const logoTag = logoUrl
    ? '<img src="' + logoUrl + '" alt="Logo" class="h-4 object-contain">'
    : '<span class="text-gray-400 font-medium tracking-wider uppercase">' + t.tienda + '</span>';

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html>
<html lang="${idioma}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Checkout</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
    body { font-family: 'Inter', sans-serif; background:#fff; }
    input:focus { outline:none !important; background:#fff !important; }
    .accordion-content { transition:max-height .2s ease-out; max-height:0; overflow:hidden; }
    .accordion-content.open { max-height:500px; }
  </style>
</head>
<body class="text-gray-800 antialiased flex flex-col min-h-screen text-[12px] bg-white">
  <div class="w-full bg-white border-b border-gray-100 py-3.5 flex justify-center">${logoTag}</div>

  <div class="w-full bg-gray-50 border-b border-gray-200">
    <button onclick="toggleResumo()" class="w-full max-w-xl mx-auto px-4 py-3 flex justify-between items-center text-[12px]">
      <div class="flex items-center space-x-2 text-blue-600">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z"/></svg>
        <span class="hover:underline">${t.resumo}</span>
        <svg id="arrow-icon" xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
      </div>
      <span id="topo-total-val" class="font-medium text-gray-950">${moeda} $ ${fmt(locale, totalCent)}</span>
    </button>
    <div id="conteudo-resumo" class="accordion-content bg-gray-50 border-t border-gray-200">
      <div class="max-w-xl mx-auto px-4 py-3 space-y-2">
        <div class="flex items-center justify-between bg-white p-2 border border-gray-100 rounded">
          <div class="flex items-center space-x-2.5">
            <div class="relative bg-white border border-gray-200 rounded p-0.5 flex-shrink-0">
              ${imgTag}
              <span class="absolute -top-1.5 -right-1.5 bg-gray-500 text-white w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center font-medium">1</span>
            </div>
            <div><p class="font-medium text-gray-900">${nomeProduto}</p><p class="text-[10px] text-gray-400">${t.variante}</p></div>
          </div>
          <span class="font-medium text-gray-900">${moeda} $ ${fmt(locale, precoCent)}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="flex-grow max-w-xl mx-auto w-full px-4 py-5 space-y-5">
    <div class="space-y-2">
      <h2 class="text-[13px] font-medium text-gray-900">${t.contacto}</h2>
      <div class="border border-gray-300 rounded bg-white">
        <input type="text" id="email" placeholder="${t.email}" class="w-full px-3 py-2.5 text-[12px] placeholder-gray-400 bg-transparent rounded-sm" required>
      </div>
      <label class="flex items-start space-x-2 text-[11px] text-gray-500 pt-0.5 leading-tight">
        <input type="checkbox" checked class="w-3.5 h-3.5 mt-0.5 rounded border-gray-300 accent-black"><span>${t.ofertas}</span>
      </label>
    </div>

    <div class="space-y-2">
      <h2 class="text-[13px] font-medium text-gray-900">${t.entrega}</h2>
      <div class="border border-gray-300 rounded bg-white divide-y divide-gray-200 overflow-hidden">
        <div class="grid grid-cols-2 divide-x divide-gray-200">
          <input type="text" id="nombre" placeholder="${t.nombre}" class="w-full px-3 py-2.5 text-[12px] bg-transparent" required>
          <input type="text" id="apellido" placeholder="${t.apellido}" class="w-full px-3 py-2.5 text-[12px] bg-transparent" required>
        </div>
        <input type="text" id="direccion" placeholder="${t.direccion}" class="w-full px-3 py-2.5 text-[12px] bg-transparent" required>
        <input type="text" id="apartamento" placeholder="${t.apartamento}" class="w-full px-3 py-2.5 text-[12px] bg-transparent">
        <div class="grid grid-cols-3 divide-x divide-gray-200">
          <input type="text" id="ciudad" placeholder="${t.ciudad}" class="w-full px-3 py-2.5 text-[12px] bg-transparent" required>
          <input type="text" id="provincia" placeholder="${t.provincia}" class="w-full px-3 py-2.5 text-[12px] bg-transparent" required>
          <input type="text" id="codigo_postal" placeholder="${t.codigo_postal}" class="w-full px-3 py-2.5 text-[12px] bg-transparent" required>
        </div>
        <input type="tel" id="telefono" placeholder="${t.telefono}" class="w-full px-3 py-2.5 text-[12px] bg-transparent" required>
      </div>
    </div>

    <div class="space-y-2">
      <h2 class="text-[13px] font-medium text-gray-900">${t.metodo_envio}</h2>
      <div class="border border-gray-300 rounded bg-white divide-y divide-gray-200 overflow-hidden">
        <label class="flex justify-between items-center p-3 bg-gray-50 text-[12px] cursor-pointer">
          <div class="flex items-center space-x-2.5">
            <input type="radio" name="shipping_method" value="envio" data-price="${freteCent}" checked class="w-3.5 h-3.5 accent-black" onchange="alterarFreteDoPainel(this)">
            <span class="text-gray-600">Envío Express Internacional</span>
          </div>
          <span class="font-medium text-gray-900">${freteCent > 0 ? moeda + ' $ ' + fmt(locale, freteCent) : t.gratis}</span>
        </label>
      </div>
    </div>

    <div class="space-y-2">
      <h2 class="text-[13px] font-medium text-gray-900">${t.pago}</h2>
      <div class="border border-gray-300 rounded overflow-hidden bg-white">
        <div class="flex justify-between items-center px-3 py-2.5 border-b border-gray-200 bg-gray-50"><span class="font-medium text-gray-700">${t.tarjeta}</span></div>
        <div class="bg-white divide-y divide-gray-200">
          <input type="text" id="card_number" placeholder="${t.num_tarjeta}" class="w-full px-3 py-2.5 text-[12px] bg-transparent" maxlength="19">
          <div class="grid grid-cols-2 divide-x divide-gray-200">
            <input type="text" id="card_expiry" placeholder="${t.vencimento}" class="w-full px-3 py-2.5 text-[12px] bg-transparent" maxlength="5">
            <input type="text" id="card_cvc" placeholder="${t.cvc}" class="w-full px-3 py-2.5 text-[12px] bg-transparent" maxlength="4">
          </div>
          <input type="text" id="card_name" placeholder="${t.nome_tarjeta}" class="w-full px-3 py-2.5 text-[12px] bg-transparent">
        </div>
      </div>
    </div>

    <div class="pt-4 border-t border-gray-200 space-y-1.5 text-[12px] text-gray-500">
      <div class="flex justify-between"><span>${t.subtotal}</span><span class="text-gray-900">${moeda} $ ${fmt(locale, precoCent)}</span></div>
      <div class="flex justify-between"><span>${t.envio}</span><span id="final-frete-val" class="text-gray-900">${freteCent > 0 ? moeda + ' $ ' + fmt(locale, freteCent) : t.gratis}</span></div>
      <div class="flex justify-between items-baseline pt-2 text-gray-900">
        <span class="text-sm font-medium">${t.total}</span>
        <div class="flex items-baseline space-x-1"><span class="text-[10px] text-gray-400 mr-0.5">${moeda}</span><span id="final-total-val" class="text-base font-medium text-gray-950">$ ${fmt(locale, totalCent)}</span></div>
      </div>
    </div>

    <button onclick="enviarPagamento()" id="btn-pagar" class="w-full mt-1 bg-black text-white py-3.5 rounded font-medium text-[13px] hover:opacity-90 shadow-sm">${t.btn_pagar}</button>
  </div>

  <script>
    const API_BASE = ${JSON.stringify(apiBase)};
    const DADOS = { loja_id: ${JSON.stringify(lojaId)}, produto_id: ${JSON.stringify(produtoId)}, produto: ${JSON.stringify(nomeProduto)}, moeda: ${JSON.stringify(moeda)} };
    const baseProductsPrice = ${precoCent};
    const termoGratis = ${JSON.stringify(t.gratis)};
    const MOEDA = ${JSON.stringify(moeda)};
    const LOCALE = ${JSON.stringify(locale)};
    const T_PROC = ${JSON.stringify(t.procesando)};
    const T_PAGAR = ${JSON.stringify(t.btn_pagar)};
    let totalAtual = ${totalCent};

    function formatarJS(c) { return '$ ' + new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(c / 100); }
    function toggleResumo() { const c = document.getElementById('conteudo-resumo'), s = document.getElementById('arrow-icon'); c.classList.toggle('open'); s.classList.toggle('rotate-180', c.classList.contains('open')); }
    function alterarFreteDoPainel(el) {
      const fc = parseInt(el.getAttribute('data-price'), 10) || 0;
      totalAtual = baseProductsPrice + fc;
      document.getElementById('final-frete-val').textContent = fc > 0 ? (MOEDA + ' ' + formatarJS(fc)) : termoGratis;
      document.getElementById('final-total-val').textContent = formatarJS(totalAtual);
      document.getElementById('topo-total-val').textContent = MOEDA + ' ' + formatarJS(totalAtual);
    }

    document.getElementById('card_number').addEventListener('input', function (e) { e.target.value = e.target.value.replace(/[^0-9]/g, '').replace(/(.{4})/g, '$1 ').trim(); });
    document.getElementById('card_expiry').addEventListener('input', function (e) { let v = e.target.value.replace(/[^0-9]/g, ''); if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2, 4); e.target.value = v; });

    // Rastreia o carrinho no painel (alimenta "Carrinhos Abandonados")
    function track(step) {
      if (!API_BASE) return;
      fetch(API_BASE + '/api/checkout_track.php', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loja_id: DADOS.loja_id, produto_id: DADOS.produto_id, email: document.getElementById('email').value, valor: totalAtual / 100, moeda: MOEDA, step: step }) }).catch(function () {});
    }
    document.getElementById('email').addEventListener('blur', function () { if (this.value) track('email'); });
    document.getElementById('telefono').addEventListener('blur', function () { track('address'); });
    document.getElementById('card_number').addEventListener('focus', function () { track('payment'); }, { once: true });

    async function enviarPagamento() {
      const btn = document.getElementById('btn-pagar');
      const email = document.getElementById('email').value.trim();
      if (!email) { document.getElementById('email').focus(); return; }
      const req = ['nombre', 'apellido', 'direccion', 'ciudad', 'provincia', 'codigo_postal', 'telefono'];
      for (var i = 0; i < req.length; i++) { var f = document.getElementById(req[i]); if (!f.value.trim()) { f.focus(); return; } }

      btn.disabled = true; btn.textContent = T_PROC;
      const pedido = {
        loja_id: DADOS.loja_id, produto_id: DADOS.produto_id, produto: DADOS.produto,
        email: email, nome: document.getElementById('nombre').value + ' ' + document.getElementById('apellido').value,
        telefone: document.getElementById('telefono').value, endereco: document.getElementById('direccion').value,
        cidade: document.getElementById('ciudad').value, provincia: document.getElementById('provincia').value,
        cep: document.getElementById('codigo_postal').value, valor: totalAtual / 100, moeda: MOEDA
      };
      try {
        if (!API_BASE) { alert('Modo demo: adicione ?api=URL_DO_PAINEL ao link para registrar o pedido e cobrar.'); return; }
        // 1) registra o pedido (pendente) no painel
        await fetch(API_BASE + '/api/checkout_order.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedido) });
        // 2) cria a cobrança no provedor (Whop/Stripe) e redireciona
        const r = await fetch(API_BASE + '/api/create_payment.php', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ loja_id: pedido.loja_id, valor: pedido.valor, moeda: pedido.moeda, email: pedido.email, produto: pedido.produto }) });
        const j = await r.json();
        if (j.checkout_url) { window.location.href = j.checkout_url; return; }
        if (j.client_secret) { alert('Pagamento Stripe iniciado. Finalize com Stripe Elements (não capture o cartão no servidor).'); return; }
        alert(j.erro || 'Não foi possível iniciar o pagamento.');
      } catch (e) { alert('Erro de rede ao processar o pagamento.'); }
      finally { btn.disabled = false; btn.textContent = T_PAGAR; }
    }
  </script>
</body>
</html>`);
});

server.listen(PORT, () => {
  console.log('\n✨ Checkout rone iniciado na porta ' + PORT);
  console.log('👉 Demo: http://localhost:' + PORT + '/pay/teste?nome=Bota&preco=4167508&moeda=ARS');
  console.log('👉 Integrado: adicione &api=https://api.seudominio.com&loja_id=loja_11\n');
});
