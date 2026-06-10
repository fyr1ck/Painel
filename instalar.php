<?php
/**
 * oauth/instalar.php — Inicia o fluxo OAuth da Shopify
 *
 * Uso: GET /oauth/instalar.php?shop=minha-loja.myshopify.com
 *
 * 1. Valida e sanitiza a URL da loja
 * 2. Gera um state CSRF seguro e salva na sessão
 * 3. Monta e redireciona para a URL de autorização da Shopify
 */

require_once __DIR__ . '/../conexao.php';

session_start();

// ------------------------------------------------------------
// 1. Receber e validar o parâmetro ?shop=
// ------------------------------------------------------------
$shop = trim($_GET['shop'] ?? '');

if (empty($shop)) {
    http_response_code(400);
    die('Parâmetro "shop" é obrigatório. Ex: ?shop=minha-loja.myshopify.com');
}

// Sanitiza: remove esquema, www e trailing slash
$shop = preg_replace('#^https?://#i', '', $shop);
$shop = preg_replace('#^www\.#i',     '', $shop);
$shop = rtrim($shop, '/');
$shop = strtolower($shop);

// Valida que é um domínio .myshopify.com legítimo
if (!preg_match('/^[a-z0-9\-]+\.myshopify\.com$/', $shop)) {
    http_response_code(400);
    die('URL de loja Shopify inválida. Use o formato: nome-da-loja.myshopify.com');
}

// ------------------------------------------------------------
// 2. Gerar state CSRF e armazenar na sessão
// ------------------------------------------------------------
$state = bin2hex(random_bytes(16)); // 32 caracteres hex seguros
$_SESSION['oauth_state'] = $state;
$_SESSION['oauth_shop']  = $shop;

// ------------------------------------------------------------
// 3. Montar a URL de autorização OAuth da Shopify
// ------------------------------------------------------------
$redirectUri  = APP_URL . '/oauth/shopify_callback.php';
$authUrl      = sprintf(
    'https://%s/admin/oauth/authorize?client_id=%s&scope=%s&redirect_uri=%s&state=%s',
    $shop,
    SHOPIFY_API_KEY,
    SHOPIFY_SCOPES,
    urlencode($redirectUri),
    $state
);

// Redireciona o lojista para a tela de autorização da Shopify
header('Location: ' . $authUrl);
exit;