<?php
/** api/config_save.php — POST: salva credenciais/config de uma loja.
 *  Body: { loja_id, ...qualquer campo de config }.
 *  Recalcula shopify_connected / whop_connected conforme as chaves presentes. */
require __DIR__ . '/db.php';
$pdo = db();
$d = read_json_body();
$id = $d['loja_id'] ?? '';
if (!$id) json_out(['erro' => 'loja_id obrigatório.'], 400);

$l = $pdo->query("SELECT * FROM lojas WHERE id = " . $pdo->quote($id))->fetch();
if (!$l) json_out(['erro' => 'Loja não encontrada.'], 404);

$permitidos = ['nome','moeda','idioma','cor','logo','shopify_domain','shopify_token',
    'whop_company_id','whop_key','gateway','stripe_key','pixel_fb','pixel_fb_token',
    'pixel_tt','pixel_tt_token','detectar_moeda','detectar_idioma'];

$set = [];
$args = [];
foreach ($permitidos as $k) {
    if (!array_key_exists($k, $d)) continue;
    $v = $d[$k];
    if ($k === 'detectar_moeda' || $k === 'detectar_idioma') $v = (int) (bool) $v;
    $set[] = "$k = :$k";
    $args[$k] = $v;
}

// Valores efetivos após o save (para recalcular os "conectado")
$eff = function ($k) use ($d, $l) { return array_key_exists($k, $d) ? $d[$k] : $l[$k]; };
$shopOn = (!empty($eff('shopify_domain')) && !empty($eff('shopify_token'))) ? 1 : (int) $l['shopify_connected'];
$whopOn = (!empty($eff('whop_key')) && !empty($eff('whop_company_id'))) ? 1 : 0;
$set[] = 'shopify_connected = :shopify_connected'; $args['shopify_connected'] = $shopOn;
$set[] = 'whop_connected = :whop_connected'; $args['whop_connected'] = $whopOn;

$args['id'] = $id;
$pdo->prepare("UPDATE lojas SET " . implode(', ', $set) . " WHERE id = :id")->execute($args);

$loja = $pdo->query("SELECT * FROM lojas WHERE id = " . $pdo->quote($id))->fetch();
json_out(['sucesso' => true, 'loja' => $loja]);
