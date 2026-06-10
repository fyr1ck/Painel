<?php
/**
 * oauth/shopify_callback.php — Callback OAuth da Shopify
 *
 * Recebe o ?code= temporário, troca pelo access_token permanente,
 * faz UPSERT na tabela lojas_config e injeta a ScriptTag na loja.
 */

require_once __DIR__ . '/../conexao.php';

session_start();

// ------------------------------------------------------------
// 1. Validar parâmetros recebidos da Shopify
// ------------------------------------------------------------
$code  = $_GET['code']  ?? '';
$shop  = $_GET['shop']  ?? '';
$state = $_GET['state'] ?? '';
$hmac  = $_GET['hmac']  ?? '';

if (empty($code) || empty($shop) || empty($state) || empty($hmac)) {
    http_response_code(400);
    die(json_encode(['erro' => 'Parâmetros incompletos no callback.']));
}

// Verificar CSRF: o state deve bater com o da sessão
if (!isset($_SESSION['oauth_state']) || !hash_equals($_SESSION['oauth_state'], $state)) {
    http_response_code(403);
    die(json_encode(['erro' => 'State inválido. Possível ataque CSRF.']));
}

// Verificar HMAC da Shopify (evita callbacks forjados)
$queryParams = $_GET;
unset($queryParams['hmac']); // Remove o hmac antes de verificar
ksort($queryParams);
$queryString     = http_build_query($queryParams);
$hmacCalculado   = hash_hmac('sha256', $queryString, SHOPIFY_API_SECRET);

if (!hash_equals($hmacCalculado, $hmac)) {
    http_response_code(403);
    die(json_encode(['erro' => 'HMAC inválido. Requisição não autêntica.']));
}

// ------------------------------------------------------------
// 2. Trocar o code temporário pelo access_token permanente
// ------------------------------------------------------------
$tokenUrl = "https://{$shop}/admin/oauth/access_token";
$payload  = json_encode([
    'client_id'     => SHOPIFY_API_KEY,
    'client_secret' => SHOPIFY_API_SECRET,
    'code'          => $code,
]);

$ch = curl_init($tokenUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Accept: application/json',
    ],
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$resposta      = curl_exec($ch);
$httpCode      = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErro      = curl_error($ch);
curl_close($ch);

if ($curlErro || $httpCode !== 200) {
    error_log("[RONE OAuth] Falha ao obter token: HTTP {$httpCode} | {$curlErro} | {$resposta}");
    http_response_code(500);
    die(json_encode(['erro' => 'Falha ao obter o access token da Shopify.']));
}

$dados       = json_decode($resposta, true);
$accessToken = $dados['access_token'] ?? '';

if (empty($accessToken)) {
    http_response_code(500);
    die(json_encode(['erro' => 'Access token vazio na resposta da Shopify.']));
}

// ------------------------------------------------------------
// 3. UPSERT na tabela lojas_config
// ------------------------------------------------------------
$pdo = getPDO();

$sql = "
    INSERT INTO lojas_config (shop_url, access_token)
    VALUES (:shop, :token)
    ON DUPLICATE KEY UPDATE
        access_token = VALUES(access_token),
        updated_at   = NOW()
";

$stmt = $pdo->prepare($sql);
$stmt->execute([
    ':shop'  => $shop,
    ':token' => $accessToken,
]);

// Busca o ID da loja recem inserida/atualizada
$lojaId = $pdo->lastInsertId() ?: buscarLojaIdPorShop($pdo, $shop);

// ------------------------------------------------------------
// 4. Injetar a ScriptTag na loja do cliente via Shopify API
// ------------------------------------------------------------
$scriptTagId = criarScriptTag($shop, $accessToken);

if ($scriptTagId) {
    $pdo->prepare("UPDATE lojas_config SET script_tag_id = ? WHERE shop_url = ?")
        ->execute([$scriptTagId, $shop]);
}

// Limpa sessão de OAuth
unset($_SESSION['oauth_state'], $_SESSION['oauth_shop']);

// Redireciona para o painel do admin com sucesso
header('Location: ' . APP_URL . '/painel/?instalado=1&shop=' . urlencode($shop));
exit;

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

/**
 * Cria a ScriptTag na Shopify para injetar o interceptor de checkout.
 * Retorna o ID da ScriptTag criada ou null em caso de erro.
 */
function criarScriptTag(string $shop, string $token): ?int
{
    // URL pública do nosso script interceptor
    $scriptUrl = CHECKOUT_URL . '/checkout-interceptor.js';

    $url     = "https://{$shop}/admin/api/2024-01/script_tags.json";
    $payload = json_encode([
        'script_tag' => [
            'event' => 'onload',
            'src'   => $scriptUrl,
        ],
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            "X-Shopify-Access-Token: {$token}",
            'Content-Type: application/json',
            'Accept: application/json',
        ],
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);

    $resposta = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 201) {
        $dados = json_decode($resposta, true);
        return $dados['script_tag']['id'] ?? null;
    }

    error_log("[RONE ScriptTag] Falha HTTP {$httpCode}: {$resposta}");
    return null;
}

/**
 * Busca o ID da loja pelo shop_url (para o caso de UPDATE no UPSERT).
 */
function buscarLojaIdPorShop(PDO $pdo, string $shop): int
{
    $stmt = $pdo->prepare("SELECT id FROM lojas_config WHERE shop_url = ? LIMIT 1");
    $stmt->execute([$shop]);
    return (int) ($stmt->fetchColumn() ?: 0);
}