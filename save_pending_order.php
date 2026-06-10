<?php
/**
 * api/save_pending_order.php — Salva o pedido pendente vindo do interceptor JS
 *
 * Recebe: POST JSON com { shop_url, cart_data, total, moeda }
 * Retorna: { session_id, checkout_url }
 *
 * Chamado pelo checkout-interceptor.js antes de redirecionar o comprador.
 */

require_once __DIR__ . '/../conexao.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');           // Restringir ao domínio Shopify em produção
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['erro' => 'Método não permitido.']));
}

// ------------------------------------------------------------
// 1. Ler e validar o corpo da requisição
// ------------------------------------------------------------
$body = file_get_contents('php://input');
$dados = json_decode($body, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    die(json_encode(['erro' => 'JSON inválido no corpo da requisição.']));
}

$shopUrl     = trim($dados['shop_url']   ?? '');
$cartData    = $dados['cart_data']       ?? null;
$total       = (float) ($dados['total'] ?? 0);
$moeda       = strtoupper(trim($dados['moeda'] ?? 'BRL'));

if (empty($shopUrl) || empty($cartData) || $total <= 0) {
    http_response_code(400);
    die(json_encode(['erro' => 'Campos obrigatórios ausentes: shop_url, cart_data, total.']));
}

// ------------------------------------------------------------
// 2. Buscar a loja no banco pelo shop_url
// ------------------------------------------------------------
$pdo  = getPDO();
$stmt = $pdo->prepare("SELECT id FROM lojas_config WHERE shop_url = ? AND ativo = 1 LIMIT 1");
$stmt->execute([$shopUrl]);
$loja = $stmt->fetch();

if (!$loja) {
    http_response_code(404);
    die(json_encode(['erro' => 'Loja não encontrada ou inativa.']));
}

// ------------------------------------------------------------
// 3. Gerar Session ID único e salvar o pedido pendente
// ------------------------------------------------------------
$sessionId = bin2hex(random_bytes(24)); // 48 caracteres hex — único e seguro
$ipCliente = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';

$sql = "
    INSERT INTO pedidos
        (loja_id, session_id, dados_carrinho, total_venda, moeda, status, ip_cliente)
    VALUES
        (:loja_id, :session_id, :carrinho, :total, :moeda, 'pending', :ip)
";

$stmt = $pdo->prepare($sql);
$stmt->execute([
    ':loja_id'    => $loja['id'],
    ':session_id' => $sessionId,
    ':carrinho'   => json_encode($cartData, JSON_UNESCAPED_UNICODE),
    ':total'      => $total,
    ':moeda'      => $moeda,
    ':ip'         => substr($ipCliente, 0, 45),
]);

// ------------------------------------------------------------
// 4. Retornar o session_id e a URL de redirecionamento
// ------------------------------------------------------------
echo json_encode([
    'sucesso'      => true,
    'session_id'   => $sessionId,
    'checkout_url' => CHECKOUT_URL . '/pay/' . $sessionId,
]);