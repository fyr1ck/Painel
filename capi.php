<?php
/**
 * api/whop_webhook.php — Recebe notificações de pagamento da Whop
 *
 * Fluxo:
 *  1. Verifica assinatura HMAC do webhook
 *  2. Atualiza o status do pedido no banco
 *  3. Dispara o evento 'Purchase' via CAPI (Facebook e TikTok)
 *  4. Confirma o pedido na Shopify (opcional: cria o pedido via Admin API)
 */

require_once __DIR__ . '/../conexao.php';
require_once __DIR__ . '/../tracking/capi.php';

// Whop envia o payload como raw body
$payloadRaw = file_get_contents('php://input');
$headers    = getallheaders();

// ------------------------------------------------------------
// 1. Verificar assinatura HMAC do Whop
// ------------------------------------------------------------
$assinaturaRecebida = $headers['Whop-Signature'] ?? $headers['X-Whop-Signature'] ?? '';
$assinaturaEsperada = hash_hmac('sha256', $payloadRaw, getenv('WHOP_WEBHOOK_SECRET') ?: '');

if (!hash_equals($assinaturaEsperada, $assinaturaRecebida)) {
    error_log('[RONE Webhook] Assinatura inválida: ' . $assinaturaRecebida);
    http_response_code(401);
    die('Assinatura inválida.');
}

$evento = json_decode($payloadRaw, true);
$tipo   = $evento['type'] ?? '';

// Só nos interessa o evento de pagamento confirmado
if ($tipo !== 'payment.completed' && $tipo !== 'membership.created') {
    http_response_code(200);
    die('Evento ignorado.');
}

$metadata   = $evento['data']['metadata'] ?? [];
$sessionId  = $metadata['session_id']     ?? '';
$paymentId  = $evento['data']['id']       ?? '';

if (empty($sessionId)) {
    http_response_code(200);
    die('Sem session_id nos metadados.');
}

// ------------------------------------------------------------
// 2. Buscar e atualizar o pedido
// ------------------------------------------------------------
$pdo = getPDO();

$sql = "
    SELECT
        p.id, p.loja_id, p.total_venda, p.moeda, p.dados_cliente,
        p.dados_carrinho, p.status,
        l.shop_url, l.access_token,
        l.pixel_facebook, l.token_facebook_capi,
        l.pixel_tiktok,   l.token_tiktok_capi
    FROM pedidos p
    JOIN lojas_config l ON p.loja_id = l.id
    WHERE p.session_id = ?
    LIMIT 1
";

$stmt = $pdo->prepare($sql);
$stmt->execute([$sessionId]);
$pedido = $stmt->fetch();

if (!$pedido || $pedido['status'] === 'paid') {
    http_response_code(200);
    die('Pedido não encontrado ou já pago.');
}

// Atualiza status para 'paid'
$pdo->prepare("
    UPDATE pedidos
    SET status = 'paid', whop_payment_id = ?, pago_em = NOW(), updated_at = NOW()
    WHERE session_id = ?
")->execute([$paymentId, $sessionId]);

// ------------------------------------------------------------
// 3. Disparar CAPI Purchase (Facebook e TikTok)
// ------------------------------------------------------------
$dadosCliente = $pedido['dados_cliente']
    ? json_decode($pedido['dados_cliente'], true)
    : [];

$contentIds = extrairContentIdsFromJson($pedido['dados_carrinho']);

dispararEventoFacebook(
    $pedido['pixel_facebook'],
    $pedido['token_facebook_capi'],
    'Purchase',
    [
        'email'        => $dadosCliente['email'] ?? '',
        'phone'        => $dadosCliente['telefone'] ?? '',
        'value'        => (float) $pedido['total_venda'],
        'currency'     => $pedido['moeda'],
        'content_ids'  => $contentIds,
        'order_id'     => $sessionId,
        'ip'           => '',        // IP não disponível em webhook server-side
        'user_agent'   => '',
        'event_source' => 'https://' . $pedido['shop_url'],
    ]
);

dispararEventoTikTok(
    $pedido['pixel_tiktok'],
    $pedido['token_tiktok_capi'],
    'Purchase',
    [
        'email'    => $dadosCliente['email'] ?? '',
        'value'    => (float) $pedido['total_venda'],
        'currency' => $pedido['moeda'],
        'order_id' => $sessionId,
    ]
);

// ------------------------------------------------------------
// 4. Criar/confirmar pedido na Shopify via Admin API (opcional)
// ------------------------------------------------------------
criarPedidoShopify($pedido);

http_response_code(200);
echo json_encode(['recebido' => true]);

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function extrairContentIdsFromJson(string $json): array
{
    $carrinho = json_decode($json, true) ?? [];
    return array_filter(array_map(fn($i) => (string)($i['variant_id'] ?? ''), $carrinho['items'] ?? []));
}

/**
 * Cria o pedido na Shopify para disparar o fulfillment da loja.
 */
function criarPedidoShopify(array $pedido): void
{
    if (empty($pedido['access_token']) || empty($pedido['shop_url'])) return;

    $dadosCliente = json_decode($pedido['dados_cliente'] ?? '{}', true);
    $carrinho     = json_decode($pedido['dados_carrinho'],         true);

    $lineItems = array_map(fn($item) => [
        'variant_id' => $item['variant_id'] ?? null,
        'quantity'   => $item['quantity']   ?? 1,
        'price'      => $item['price']      ?? '0.00',
    ], $carrinho['items'] ?? []);

    $payload = json_encode([
        'order' => [
            'line_items'         => $lineItems,
            'financial_status'   => 'paid',
            'fulfillment_status' => null,
            'email'              => $dadosCliente['email'] ?? '',
            'phone'              => $dadosCliente['telefone'] ?? '',
            'billing_address'    => [
                'first_name' => $dadosCliente['nome']    ?? '',
                'address1'   => $dadosCliente['endereco'] ?? '',
                'city'       => $dadosCliente['cidade']  ?? '',
                'province'   => $dadosCliente['estado']  ?? '',
                'zip'        => $dadosCliente['cep']     ?? '',
                'country'    => $dadosCliente['pais']    ?? 'BR',
            ],
            'note' => 'Pedido via RONE Checkout. Session: ' . ($pedido['id'] ?? ''),
        ],
    ]);

    $url = "https://{$pedido['shop_url']}/admin/api/2024-01/orders.json";
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            "X-Shopify-Access-Token: {$pedido['access_token']}",
            'Content-Type: application/json',
        ],
        CURLOPT_TIMEOUT => 15,
    ]);

    $resposta = curl_exec($ch);
    $code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code !== 201) {
        error_log("[RONE Shopify Order] Falha HTTP {$code}: {$resposta}");
    }
}