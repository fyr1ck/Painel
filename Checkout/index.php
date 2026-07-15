<?php
/**
 * CHECKOUT ANOVAERA — com PAGAMENTO EMBARCADO da Whop (cartão na própria página)
 * -----------------------------------------------------------------------------
 * O formulário (contato + entrega) é seu, branded. O pagamento aparece embaixo,
 * dentro de um iframe seguro da Whop (cartão, Apple Pay, Google Pay) — o cliente
 * NÃO sai da sua página.
 *
 * Precisa de um PLAN ID da Whop no link:
 *   /pay/<produto_id>?...&plan=plan_XXXXXXXX
 *
 * - Com  plan=...  -> mostra o checkout embarcado da Whop (cartão na página).
 * - Sem  plan=...  -> volta ao fluxo antigo (botão -> cria pagamento -> redireciona).
 *
 * (!) O embed da Whop precisa do SEU plan_id e de teste ao vivo (nao da pra testar aqui).
 */

$API_BASE = 'https://anovaeracheckout.com';

$traducoes = [
  'es' => ['resumo'=>'Mostrar resumen del pedido','contacto'=>'Contacto','email'=>'Correo electrónico','ofertas'=>'Enviarme novedades y ofertas','entrega'=>'Entrega','nombre'=>'Nombre','apellido'=>'Apellido','direccion'=>'Dirección','apartamento'=>'Casa, apartamento, etc. (opcional)','ciudad'=>'Ciudad','provincia'=>'Provincia','codigo_postal'=>'Código postal','telefono'=>'Teléfono','metodo_envio'=>'Método de envío','gratis'=>'Gratis','subtotal'=>'Subtotal','envio'=>'Envío','total'=>'Total','tienda'=>'Tu Tienda','producto'=>'Producto','variante'=>'Variante seleccionada','finalizar'=>'Finalizar compra','procesando'=>'Procesando...','pais'=>'País / Región','pago'=>'Pago','seguro'=>'Pago seguro y encriptado','sucesso'=>'¡Pago aprobado! Gracias por tu compra.'],
  'pt' => ['resumo'=>'Mostrar resumo do pedido','contacto'=>'Contato','email'=>'E-mail','ofertas'=>'Quero receber novidades e ofertas','entrega'=>'Entrega','nombre'=>'Nome','apellido'=>'Sobrenome','direccion'=>'Endereço','apartamento'=>'Casa, apto, etc. (opcional)','ciudad'=>'Cidade','provincia'=>'Estado','codigo_postal'=>'CEP','telefono'=>'Telefone','metodo_envio'=>'Forma de envio','gratis'=>'Grátis','subtotal'=>'Subtotal','envio'=>'Frete','total'=>'Total','tienda'=>'Sua Loja','producto'=>'Produto','variante'=>'Variante selecionada','finalizar'=>'Finalizar compra','procesando'=>'Processando...','pais'=>'País / Região','pago'=>'Pagamento','seguro'=>'Pagamento seguro e criptografado','sucesso'=>'Pagamento aprovado! Obrigado pela compra.'],
  'en' => ['resumo'=>'Show order summary','contacto'=>'Contact','email'=>'Email','ofertas'=>'Email me with news and offers','entrega'=>'Delivery','nombre'=>'First name','apellido'=>'Last name','direccion'=>'Address','apartamento'=>'Apartment, etc. (optional)','ciudad'=>'City','provincia'=>'State','codigo_postal'=>'ZIP code','telefono'=>'Phone','metodo_envio'=>'Shipping method','gratis'=>'Free','subtotal'=>'Subtotal','envio'=>'Shipping','total'=>'Total','tienda'=>'Your Store','producto'=>'Product','variante'=>'Selected variant','finalizar'=>'Place order','procesando'=>'Processing...','pais'=>'Country / Region','pago'=>'Payment','seguro'=>'Secure, encrypted payment','sucesso'=>'Payment approved! Thank you for your purchase.'],
];

function fmt($locale,$c){ $v=($c??0)/100; return $locale==='en-US'?number_format($v,2,'.',','):number_format($v,2,',','.'); }
function e($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

$q = $_GET;

$idioma = $q['idioma'] ?? '';
if ($idioma === '') {
  $al = strtolower($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '');
  if (strpos($al,'pt') === 0)      $idioma = 'pt';
  elseif (strpos($al,'en') === 0)  $idioma = 'en';
  else                             $idioma = 'es';
}
if (!in_array($idioma, ['es','pt','en'], true)) $idioma = 'es';
$t = $traducoes[$idioma];

$moeda  = strtoupper($q['moeda'] ?? 'ARS');
$locale = $moeda==='BRL' ? 'pt-BR' : ($moeda==='USD' ? 'en-US' : 'es-AR');
$paisCode = $moeda==='BRL' ? 'BR' : ($moeda==='USD' ? 'US' : 'AR');

$precoCent = (isset($q['preco']) && (int)$q['preco']>0) ? (int)$q['preco'] : 4167508;
$freteCent = (isset($q['frete']) && (int)$q['frete']>=0) ? (int)$q['frete'] : 0;
$totalCent = $precoCent + $freteCent;

$logoUrl    = $q['logo'] ?? '';
$itemImage  = $q['img'] ?? '';
$nomeProduto= $q['nome'] ?? $t['producto'];
$lojaId     = $q['loja_id'] ?? '';
$planId     = $q['plan'] ?? '';

$produtoId = $q['produto'] ?? '';
if ($produtoId === '') {
  $path = trim(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/');
  $segs = $path===''? [] : explode('/', $path);
  $last = end($segs);
  if ($last && $last!=='index.php') $produtoId = $last;
}

$logoTag = $logoUrl ? '<img src="'.e($logoUrl).'" alt="Logo" style="height:18px;object-fit:contain">' : '<span style="color:#9aa3af;font-weight:500;letter-spacing:.08em;text-transform:uppercase">'.e($t['tienda']).'</span>';
$imgTag  = $itemImage ? '<img src="'.e($itemImage).'" style="width:36px;height:36px;object-fit:cover;border-radius:4px">' : '<div style="width:36px;height:36px;background:#f1f1f1;border-radius:4px"></div>';
?>
<!DOCTYPE html>
<html lang="<?= e($idioma) ?>">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Checkout</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <?php if ($planId): ?>
  <!-- Loader do checkout embarcado da Whop -->
  <script async defer src="https://js.whop.com/static/checkout/loader.js"></script>
  <?php endif; ?>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
    body{font-family:'Inter',sans-serif;background:#fff;}
    input:focus,select:focus{outline:none!important;background:#fff!important;}
    .acc{transition:max-height .2s ease-out;max-height:0;overflow:hidden;} .acc.open{max-height:600px;}
    .whop-checkout-wrapper iframe{border:0!important;}
  </style>
</head>
<body class="text-gray-800 antialiased flex flex-col min-h-screen text-[12px]">

  <div class="w-full bg-white border-b border-gray-100 py-3.5 flex justify-center"><?= $logoTag ?></div>

  <div class="w-full bg-gray-50 border-b border-gray-200">
    <button type="button" onclick="document.getElementById('resumo').classList.toggle('open')" class="w-full max-w-xl mx-auto px-4 py-3 flex justify-between items-center">
      <span class="text-blue-600">▾ <?= e($t['resumo']) ?></span>
      <span class="font-medium text-gray-950"><?= e($moeda) ?> $ <?= fmt($locale,$totalCent) ?></span>
    </button>
    <div id="resumo" class="acc bg-gray-50 border-t border-gray-200">
      <div class="max-w-xl mx-auto px-4 py-3">
        <div class="flex items-center justify-between bg-white p-2 border border-gray-100 rounded">
          <div class="flex items-center space-x-2.5">
            <div class="relative bg-white border border-gray-200 rounded p-0.5"><?= $imgTag ?>
              <span class="absolute -top-1.5 -right-1.5 bg-gray-500 text-white w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center">1</span></div>
            <div><p class="font-medium text-gray-900"><?= e($nomeProduto) ?></p><p class="text-[10px] text-gray-400"><?= e($t['variante']) ?></p></div>
          </div>
          <span class="font-medium text-gray-900"><?= e($moeda) ?> $ <?= fmt($locale,$precoCent) ?></span>
        </div>
      </div>
    </div>
  </div>

  <form id="form" class="flex-grow max-w-xl mx-auto w-full px-4 py-5 space-y-5">
    <div class="space-y-2">
      <h2 class="text-[13px] font-medium text-gray-900"><?= e($t['contacto']) ?></h2>
      <div class="border border-gray-300 rounded bg-white"><input type="email" id="email" placeholder="<?= e($t['email']) ?>" class="w-full px-3 py-2.5 bg-transparent" required></div>
      <label class="flex items-start space-x-2 text-[11px] text-gray-500 pt-0.5"><input type="checkbox" checked class="w-3.5 h-3.5 mt-0.5 accent-black"><span><?= e($t['ofertas']) ?></span></label>
    </div>

    <div class="space-y-2">
      <h2 class="text-[13px] font-medium text-gray-900"><?= e($t['entrega']) ?></h2>
      <div class="border border-gray-300 rounded bg-white px-3 py-1.5">
        <label class="text-[9px] text-gray-400 uppercase tracking-wide"><?= e($t['pais']) ?></label>
        <select id="pais" class="w-full bg-transparent text-[12px] py-1" onchange="trocarMoeda(this.value)">
          <option value="ARS" <?= $moeda==='ARS'?'selected':'' ?>>Argentina (ARS)</option>
          <option value="BRL" <?= $moeda==='BRL'?'selected':'' ?>>Brasil (BRL)</option>
          <option value="USD" <?= $moeda==='USD'?'selected':'' ?>>Internacional (USD)</option>
        </select>
      </div>
      <div class="border border-gray-300 rounded bg-white divide-y divide-gray-200 overflow-hidden">
        <div class="grid grid-cols-2 divide-x divide-gray-200">
          <input type="text" id="nombre" placeholder="<?= e($t['nombre']) ?>" class="w-full px-3 py-2.5 bg-transparent" required>
          <input type="text" id="apellido" placeholder="<?= e($t['apellido']) ?>" class="w-full px-3 py-2.5 bg-transparent" required>
        </div>
        <input type="text" id="direccion" placeholder="<?= e($t['direccion']) ?>" class="w-full px-3 py-2.5 bg-transparent" required>
        <input type="text" id="apartamento" placeholder="<?= e($t['apartamento']) ?>" class="w-full px-3 py-2.5 bg-transparent">
        <div class="grid grid-cols-3 divide-x divide-gray-200">
          <input type="text" id="ciudad" placeholder="<?= e($t['ciudad']) ?>" class="w-full px-3 py-2.5 bg-transparent" required>
          <input type="text" id="provincia" placeholder="<?= e($t['provincia']) ?>" class="w-full px-3 py-2.5 bg-transparent" required>
          <input type="text" id="cep" placeholder="<?= e($t['codigo_postal']) ?>" class="w-full px-3 py-2.5 bg-transparent" required>
        </div>
        <input type="tel" id="telefono" placeholder="<?= e($t['telefono']) ?>" class="w-full px-3 py-2.5 bg-transparent" required>
      </div>
    </div>

    <div class="space-y-2">
      <h2 class="text-[13px] font-medium text-gray-900"><?= e($t['metodo_envio']) ?></h2>
      <div class="border border-gray-300 rounded bg-white">
        <label class="flex justify-between items-center p-3 bg-gray-50">
          <span class="flex items-center space-x-2.5"><input type="radio" checked class="w-3.5 h-3.5 accent-black"><span class="text-gray-600">Envío Express</span></span>
          <span class="font-medium text-gray-900"><?= $freteCent>0?e($moeda).' $ '.fmt($locale,$freteCent):e($t['gratis']) ?></span>
        </label>
      </div>
    </div>

    <div class="pt-4 border-t border-gray-200 space-y-1.5 text-gray-500">
      <div class="flex justify-between"><span><?= e($t['subtotal']) ?></span><span class="text-gray-900"><?= e($moeda) ?> $ <?= fmt($locale,$precoCent) ?></span></div>
      <div class="flex justify-between"><span><?= e($t['envio']) ?></span><span class="text-gray-900"><?= $freteCent>0?e($moeda).' $ '.fmt($locale,$freteCent):e($t['gratis']) ?></span></div>
      <div class="flex justify-between items-baseline pt-2 text-gray-900"><span class="text-sm font-medium"><?= e($t['total']) ?></span><span class="text-base font-medium"><?= e($moeda) ?> $ <?= fmt($locale,$totalCent) ?></span></div>
    </div>

    <?php if ($planId): ?>
    <div class="space-y-2 pt-2">
      <h2 class="text-[13px] font-medium text-gray-900"><?= e($t['pago']) ?></h2>
      <p class="text-[11px] text-gray-400">🔒 <?= e($t['seguro']) ?></p>
      <div class="border border-gray-300 rounded bg-white overflow-hidden">
        <div id="whop-embed"
             data-whop-checkout-plan-id="<?= e($planId) ?>"
             data-whop-checkout-theme="light"
             data-whop-checkout-hide-email="true"
             data-whop-checkout-hide-address="true"
             data-whop-checkout-hide-price="true"
             data-whop-checkout-on-complete="onWhopComplete"
             data-whop-checkout-on-state-change="onWhopState"
             data-whop-checkout-style-container-padding-x="14"
             data-whop-checkout-style-container-padding-y="14"
             style="min-height:120px;"></div>
      </div>
    </div>
    <?php else: ?>
    <button type="submit" id="btn" class="w-full mt-1 bg-black text-white py-3.5 rounded font-medium text-[13px] hover:opacity-90"><?= e($t['finalizar']) ?></button>
    <?php endif; ?>
    <p id="erro" class="text-[12px] text-red-600 hidden"></p>
  </form>

  <div id="sucesso" style="display:none;position:fixed;inset:0;background:#fff;z-index:50;align-items:center;justify-content:center;text-align:center;padding:30px;">
    <div style="max-width:360px">
      <div style="width:56px;height:56px;border-radius:16px;background:#16a34a;color:#fff;display:grid;place-items:center;margin:0 auto 18px;font-size:28px;">✓</div>
      <h2 style="font-size:18px;font-weight:600;color:#111;"><?= e($t['sucesso']) ?></h2>
    </div>
  </div>

  <script>
    var API   = <?= json_encode($API_BASE) ?>;
    var PLAN  = <?= json_encode($planId) ?>;
    var DADOS = { loja_id: <?= json_encode($lojaId) ?>, produto_id: <?= json_encode($produtoId) ?>,
                  produto: <?= json_encode($nomeProduto) ?>, moeda: <?= json_encode($moeda) ?>,
                  precoCent: <?= (int)$precoCent ?>, freteCent: <?= (int)$freteCent ?>, pais: <?= json_encode($paisCode) ?> };

    function val(id){ var el=document.getElementById(id); return el?el.value.trim():''; }
    function trocarMoeda(m){ var p=new URLSearchParams(window.location.search); p.set('moeda',m); window.location.search=p.toString(); }

    function track(step){
      try{ fetch(API+'/api/checkout_track.php',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({loja_id:DADOS.loja_id,produto_id:DADOS.produto_id,email:val('email'),
        valor:(DADOS.precoCent+DADOS.freteCent)/100,moeda:DADOS.moeda,step:step})}).catch(function(){}); }catch(e){}
    }
    document.getElementById('email').addEventListener('blur',function(){ if(this.value) track('email'); });
    document.getElementById('telefono').addEventListener('blur',function(){ track('address'); });

    function gravarPedido(){
      return fetch(API+'/api/checkout_order.php',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({loja_id:DADOS.loja_id,produto_id:DADOS.produto_id,produto:DADOS.produto,
          email:val('email'),nome:(val('nombre')+' '+val('apellido')).trim(),telefone:val('telefono'),
          valor:(DADOS.precoCent+DADOS.freteCent)/100,moeda:DADOS.moeda})});
    }

    if (PLAN) {
      var whopReady = false;
      function syncWhop(){
        if (!whopReady || !window.wco) return;
        var email = val('email');
        if (email) { try { wco.setEmail('whop-embed', email); } catch(e){} }
        var line1 = val('direccion');
        if (line1) {
          try {
            wco.setAddress('whop-embed', {
              name: (val('nombre')+' '+val('apellido')).trim() || 'Cliente',
              country: DADOS.pais, line1: line1, line2: val('apartamento'),
              city: val('ciudad'), state: val('provincia'), postalCode: val('cep')
            });
          } catch(e){}
        }
      }
      window.onWhopState = function(state){ if (state==='ready'){ whopReady = true; syncWhop(); } };
      ['email','nombre','apellido','direccion','apartamento','ciudad','provincia','cep'].forEach(function(id){
        var el=document.getElementById(id); if(el) el.addEventListener('blur', syncWhop);
      });
      window.onWhopComplete = function(planId, receiptId){
        track('payment');
        gravarPedido().catch(function(){}).then(function(){
          document.getElementById('sucesso').style.display='flex';
        });
      };
    } else {
      document.getElementById('form').addEventListener('submit', function(ev){
        ev.preventDefault();
        var btn=document.getElementById('btn'), erro=document.getElementById('erro');
        erro.classList.add('hidden');
        if(!val('email')){ return; }
        btn.disabled=true; btn.textContent=<?= json_encode($t['procesando']) ?>; track('payment');
        var valor=(DADOS.precoCent+DADOS.freteCent)/100;
        gravarPedido().then(function(r){return r.json();})
        .then(function(){
          return fetch(API+'/api/create_payment.php',{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({loja_id:DADOS.loja_id,valor:valor,moeda:DADOS.moeda,email:val('email'),produto:DADOS.produto})});
        })
        .then(function(r){return r.json();})
        .then(function(p){
          if(p && p.checkout_url){ window.location.href=p.checkout_url; }
          else { erro.textContent=(p&&p.erro)?p.erro:'Pagamento não configurado. Pedido registrado.'; erro.classList.remove('hidden'); btn.disabled=false; btn.textContent=<?= json_encode($t['finalizar']) ?>; }
        })
        .catch(function(){ erro.textContent='Erro de conexão. Tente novamente.'; erro.classList.remove('hidden'); btn.disabled=false; btn.textContent=<?= json_encode($t['finalizar']) ?>; });
      });
    }
  </script>
</body>
</html>