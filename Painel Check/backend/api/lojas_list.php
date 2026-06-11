<?php
/** api/lojas_list.php — GET: lista todas as lojas. */
require __DIR__ . '/db.php';
$pdo = db();
$lojas = $pdo->query("SELECT * FROM lojas ORDER BY created_at ASC")->fetchAll();
foreach ($lojas as &$l) {
    $l['shopify_connected'] = (bool) $l['shopify_connected'];
    $l['whop_connected'] = (bool) $l['whop_connected'];
    $l['ativo'] = (bool) $l['ativo'];
    $l['produtos'] = (int) $pdo->query(
        "SELECT COUNT(*) c FROM produtos WHERE loja_id = " . $pdo->quote($l['id'])
    )->fetch()['c'];
}
json_out(['lojas' => $lojas]);
