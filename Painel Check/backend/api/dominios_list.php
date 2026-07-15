<?php
/** api/dominios_list.php — GET ?loja_id= : lista domínios da loja. */
require __DIR__ . '/db.php';
$pdo = db();
$id = $_GET['loja_id'] ?? '';
$rows = $pdo->prepare("SELECT * FROM dominios WHERE loja_id = ? ORDER BY criado DESC");
$rows->execute([$id]);
json_out(['dominios' => $rows->fetchAll()]);
