<?php
/** api/ads_list.php — GET ?loja_id= : lista custos de anúncio da loja. */
require __DIR__ . '/db.php';
$pdo = db();
$id = $_GET['loja_id'] ?? '';
$rows = $pdo->prepare("SELECT * FROM ads WHERE loja_id = ? ORDER BY data DESC, created_at DESC");
$rows->execute([$id]);
json_out(['ads' => $rows->fetchAll()]);
