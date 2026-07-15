<?php
/** api/ad_save.php — POST {loja_id, plataforma, data, valor} : registra um custo de anúncio. */
require __DIR__ . '/db.php';
$pdo = db();
$d = read_json_body();
if (empty($d['loja_id']) || !isset($d['valor'])) json_out(['erro' => 'loja_id e valor são obrigatórios.'], 400);
$valor = is_numeric($d['valor']) && $d['valor'] > 0 ? (float) $d['valor'] : 0;
if ($valor <= 0) json_out(['erro' => 'Valor deve ser maior que zero.'], 400);
$id = gen_id('ad');
$pdo->prepare("INSERT INTO ads (id, loja_id, plataforma, data, valor, created_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)")
    ->execute([$id, $d['loja_id'], $d['plataforma'] ?? 'Ads', $d['data'] ?? date('Y-m-d'), $valor]);
$r = $pdo->prepare("SELECT * FROM ads WHERE id=?"); $r->execute([$id]);
json_out(['sucesso' => true, 'ad' => $r->fetch()]);
