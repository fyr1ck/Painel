<?php
/** api/fretes_list.php — GET ?loja_id= : lista métodos de entrega da loja. */
require __DIR__ . '/db.php';
$pdo = db();
$id = $_GET['loja_id'] ?? '';
$rows = $pdo->prepare("SELECT * FROM fretes WHERE loja_id = ? ORDER BY preco ASC");
$rows->execute([$id]);
json_out(['fretes' => $rows->fetchAll()]);
