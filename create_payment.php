<?php
/**
 * api/create_payment.php — Cria um pagamento via Whop API
 *
 * Recebe: POST JSON { session_id, dados_cliente }
 * Retorna: { payment_url, tipo } para o frontend renderizar
 *
 * Fluxo:
 *  1. Busca sessão + credenciais Whop da loja
 *  2. Chama a Whop API para criar o pagamento
 *  3. Atualiza o pedido com o whop_payment_id
 *  4. Dispara CAPI de AddPaymentInfo (Facebook + TikTok)
 *  5. Retorna URL ou dados de embed para o frontend
 */

require_once __DIR__ . '/../conexao.php';
require_once __DIR__ . '/../tracking/capi.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . CHECKOUT_URL);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['erro' => 'Método não permitido.']));
}

// ------------------------------------------------------------
// 1. Ler e validar corpo da requisição
// ------------------------------------------------------------
$body  = file_get_contents('php://input');
$dados = json_decode($body, true);

$sessionId    = trim($dados['session_id']    ?? '');
$dadosCliente = $dados['dados_cliente']      ?? [];
$metodoPagto  = strtolower(trim($dados['metodo'] ?? 'pix'));

if (empty($sessionId) || !preg_match('/^[a-f0-9]{48}$/', $sessionId)) {
    http_response_code(400);
    die(json_encode(['erro' => 'Session ID inválido.']));
}

// ------------------------------------------------------------
// 2. Buscar pedido + credenciais Whop (mantidas server-side)
// ------------------------------------------------------------
$pdo = getPDO();

$sql = "
    SELECT
        p.id         AS pedido_id,
        p.session_id,
        p.total_venda,
        p.moeda,
        p.status,
        p.dados_carrinho,
        l.whop_company_id,
        l.whop_api_key,
        l.token_facebook_capi,
        l.pixel_facebook,
        l.token_tiktok_capi,
        l.pixel_tiktok,
        l.shop_url
    FROM pedidos p
    JOIN lojas_config l ON p.loja_id = l.id
    WHERE p.session_id = ?
      AND p.status = 'pending'
      AND l.ativo = 1
    LIMIT 1
";

$stmt = $pdo->prepare($sql);
$stmt->execute([$sessionId]);
$pedido = $stmt->fetch();

if (!$pedido) {
    http_response_code(404);
    die(json_encode(['erro' => 'Sessão não encontrada ou já processada.']));
}

if (empty($pedido['whop_api_key']) || empty($pedido['whop_company_id'])) {
    http_response_code(422);
    die(json_encode(['erro' => 'Gateway de pagamento não configurado para esta loja.']));
}

// ------------------------------------------------------------
// 3. Salvar dados do cliente no pedido
// ------------------------------------------------------------
if (!empty($dadosCliente)) {
    $pdo->prepare("
        UPDATE pedidos
        SET dados_cliente = :cliente, status = 'awaiting_payment', updated_at = NOW()
        WHERE session_id = :sid
    ")->execute([
        ':cliente' => json_encode($dadosCliente, JSON_UNESCAPED_UNICODE),
        ':sid'     => $sessionId,
    ]);
}

// ------------------------------------------------------------
// 4. Criar pagamento na Whop API
// ------------------------------------------------------------
$whopResposta = criarPagamentoWhop(
    $pedido['whop_api_key'],
    $pedido['whop_company_id'],
    $pedido['total_venda'],
    $pedido['moeda'],
    $sessionId,
    $dadosCliente
);

if (!$whopResposta['sucesso']) {
    http_response_code(502);
    die(json_encode(['erro' => 'Falha ao criar pagamento no gateway: ' . $whopResposta['mensagem']]));
}

// ------------------------------------------------------------
// 5. Atualizar pedido com o ID do pagamento Whop
// ------------------------------------------------------------
$pdo->prepare("
    UPDATE pedidos
    SET whop_payment_id = ?, metodo_pagamento = ?, updated_at = NOW()
    WHERE session_id = ?
")->execute([$whopResposta['payment_id'], $metodoPagto, $sessionId]);

// ------------------------------------------------------------
// 6. Disparar CAPI AddPaymentInfo (Facebook + TikTok)
// ------------------------------------------------------------
$ipCliente    = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
$userAgent    = $_SERVER['HTTP_USER_AGENT'] ?? '';

dispararEventoFacebook(
    $pedido['pixel_facebook'],
    $pedido['token_facebook_capi'],
    'AddPaymentInfo',
    [
        'email'        => $dadosCliente['email'] ?? '',
        'phone'        => $dadosCliente['telefone'] ?? '',
        'value'        => $pedido['total_venda'],
        'currency'     => $pedido['moeda'],
        'content_ids'  => extrairContentIds($pedido['dados_carrinho']),
        'ip'           => $ipCliente,
        'user_agent'   => $userAgent,
        'event_source' => 'https://' . $pedido['shop_url'],
    ]
);

dispararEventoTikTok(
    $pedido['pixel_tiktok'],
    $pedido['token_tiktok_capi'],
    'AddPaymentInfo',
    [
        'email'      => $dadosCliente['email'] ?? '',
        'phone'      => $dadosCliente['telefone'] ?? '',
        'value'      => $pedido['total_venda'],
        'currency'   => $pedido['moeda'],
        'ip'         => $ipCliente,
        'user_agent' => $userAgent,
    ]
);

// ------------------------------------------------------------
// 7. Retornar dados de pagamento para o frontend
// ------------------------------------------------------------
echo json_encode([
    'sucesso'      => true,
    'payment_id'   => $whopResposta['payment_id'],
    'payment_url'  => $whopResposta['payment_url'],
    'tipo'         => $whopResposta['tipo'],       // 'redirect' | 'embed' | 'pix'
    'pix_codigo'   => $whopResposta['pix_codigo'] ?? null,
    'pix_qrcode'   => $whopResposta['pix_qrcode'] ?? null,
]);

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

/**
 * Cria um intento de pagamento na Whop API.
 * Documentação: https://dev.whop.com/api-reference/v5/checkout
 */
function criarPagamentoWhop(
    string $apiKey,
    string $companyId,
    float  $total,
    string $moeda,
    string $sessionId,
    array  $dadosCliente
): array {
    // Whop trabalha com centavos para algumas moedas
    $valorCentavos = (int) round($total * 100);

    $payload = [
        'amount'       => $valorCentavos,
        'currency'     => strtolower($moeda),
        'company_id'   => $companyId,
        'metadata'     => [
            'session_id'   => $sessionId,
            'customer_email' => $dadosCliente['email'] ?? '',
        ],
        'redirect_url' => CHECKOUT_URL . '/pay/' . $sessionId . '/sucesso',
        'cancel_url'   => CHECKOUT_URL . '/pay/' . $sessionId,
    ];

    // Adicionar dados do comprador se disponíveis
    if (!empty($dadosCliente['email'])) {
        $payload['customer_email'] = $dadosCliente['email'];
    }

    $ch = curl_init('https://api.whop.com/v5/checkout/sessions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER     => [
            "Authorization: Bearer {$apiKey}",
            'Content-Type: application/json',
            'Accept: application/json',
        ],
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);

    $resposta = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErro = curl_error($ch);
    curl_close($ch);

    if ($curlErro) {
        error_log("[RONE Whop] cURL error: {$curlErro}");
        return ['sucesso' => false, 'mensagem' => 'Erro de conexão com gateway.'];
    }

    $dados = json_decode($resposta, true);

    if ($httpCode < 200 || $httpCode >= 300) {
        $msg = $dados['message'] ?? $dados['error'] ?? "HTTP {$httpCode}";
        error_log("[RONE Whop] Erro {$httpCode}: {$resposta}");
        return ['sucesso' => false, 'mensagem' => $msg];
    }

    return [
        'sucesso'    => true,
        'payment_id' => $dados['id']           ?? '',
        'payment_url'=> $dados['checkout_url'] ?? $dados['url'] ?? '',
        'tipo'       => 'redirect',
        'pix_codigo' => $dados['pix_code']     ?? null,
        'pix_qrcode' => $dados['pix_qr_code']  ?? null,
    ];
}

/**
 * Extrai os IDs de conteúdo dos itens do carrinho para rastreamento.
 */
function extrairContentIds(string $carrinhoJson): array
{
    $carrinho = json_decode($carrinhoJson, true) ?? [];
    $ids = [];
    foreach ($carrinho['items'] ?? [] as $item) {
        $ids[] = (string) ($item['variant_id'] ?? $item['product_id'] ?? '');
    }
    return array_filter($ids);
}