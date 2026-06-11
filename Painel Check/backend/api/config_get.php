<?php
/** api/config_get.php — GET ?loja_id=: devolve as credenciais/config de uma loja. */
require __DIR__ . '/db.php';
$pdo = db();
$id = $_GET['loja_id'] ?? '';
if (!$id) json_out(['erro' => 'loja_id obrigatório.'], 400);
$l = $pdo->query("SELECT * FROM lojas WHERE id = " . $pdo->quote($id))->fetch();
if (!$l) json_out(['erro' => 'Loja não encontrada.'], 404);

json_out(['config' => [
    'moeda' => $l['moeda'], 'idioma' => $l['idioma'], 'cor' => $l['cor'], 'logo' => $l['logo'],
    'shopify_domain' => $l['shopify_domain'], 'shopify_token' => $l['shopify_token'],
    'whop_company_id' => $l['whop_company_id'], 'whop_key' => $l['whop_key'],
    'gateway' => $l['gateway'] ?: 'whop', 'stripe_key' => $l['stripe_key'],
    'pixel_fb' => $l['pixel_fb'], 'pixel_fb_token' => $l['pixel_fb_token'],
    'pixel_tt' => $l['pixel_tt'], 'pixel_tt_token' => $l['pixel_tt_token'],
    'detectar_moeda' => (bool) $l['detectar_moeda'], 'detectar_idioma' => (bool) $l['detectar_idioma'],
    'shopify_connected' => (bool) $l['shopify_connected'], 'whop_connected' => (bool) $l['whop_connected'],
]]);
