<?php
/**
 * api/get_session.php — Retorna os dados da sessão de checkout para o frontend Node.js
 *
 * Recebe: GET ?session_id=abc123
 * Retorna: JSON com dados do carrinho, config da loja (sem expor tokens), pixels
 *
 * Chamado pelo frontend React/Next.js ao carregar a página /pay/[SESSION_ID]
 */

require_once __DIR__ . '/../conexao.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . CHECKOUT_URL);
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ------------------------------------------------------------
// 1. Validar o session_id
// ------------------------------------------------------------
$sessionId = trim($_GET['session_id'] ?? '');

if (empty($sessionId) || !preg_match('/^[a-f0-9]{48}$/', $sessionId)) {
    http_response_code(400);
    die(json_encode(['erro' => 'Session ID inválido.']));
}

// ------------------------------------------------------------
// 2. Buscar pedido + config da loja (JOIN)
// ------------------------------------------------------------
$pdo = getPDO();

$sql = "
    SELECT
        p.id            AS pedido_id,
        p.session_id,
        p.dados_carrinho,
        p.total_venda,
        p.moeda,
        p.status,
        p.dados_cliente,
        l.shop_url,
        l.whop_company_id,
        l.pixel_facebook,
        l.pixel_tiktok,
        l.checkout_color,
        l.checkout_logo,
        l.moeda_padrao,
        l.idioma_padrao
    FROM pedidos p
    JOIN lojas_config l ON p.loja_id = l.id
    WHERE p.session_id = ?
      AND l.ativo = 1
    LIMIT 1
";

$stmt = $pdo->prepare($sql);
$stmt->execute([$sessionId]);
$dados = $stmt->fetch();

if (!$dados) {
    http_response_code(404);
    die(json_encode(['erro' => 'Sessão não encontrada ou expirada.']));
}

// Bloquear sessões já finalizadas
if (in_array($dados['status'], ['paid', 'failed'])) {
    http_response_code(410);
    die(json_encode(['erro' => 'Esta sessão de pagamento já foi encerrada.', 'status' => $dados['status']]));
}

// ------------------------------------------------------------
// 3. Retornar apenas o necessário — NUNCA expor access_tokens
// ------------------------------------------------------------
echo json_encode([
    'sessao' => [
        'id'     => $dados['session_id'],
        'status' => $dados['status'],
    ],
    'carrinho' => json_decode($dados['dados_carrinho'], true),
    'cliente'  => $dados['dados_cliente'] ? json_decode($dados['dados_cliente'], true) : null,
    'loja' => [
        'shop_url'       => $dados['shop_url'],
        'whop_company_id'=> $dados['whop_company_id'],
        'cor'            => $dados['checkout_color'] ?? '#000000',
        'logo'           => $dados['checkout_logo'],
        'moeda'          => $dados['moeda'] ?: $dados['moeda_padrao'],
        'idioma'         => $dados['idioma_padrao'],
    ],
    'pixels' => [
        'facebook' => $dados['pixel_facebook'],
        'tiktok'   => $dados['pixel_tiktok'],
    ],
    'total' => (float) $dados['total_venda'],
]);