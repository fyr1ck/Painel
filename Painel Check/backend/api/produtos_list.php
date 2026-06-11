<?php
/** api/produtos_list.php — GET ?loja_id=: lista produtos (de uma loja, se informado). */
require __DIR__ . '/db.php';
$pdo = db();
$lojaId = $_GET['loja_id'] ?? '';
if ($lojaId) {
    $stmt = $pdo->prepare("SELECT * FROM produtos WHERE loja_id = ? ORDER BY created_at DESC");
    $stmt->execute([$lojaId]);
} else {
    $stmt = $pdo->query("SELECT * FROM produtos ORDER BY created_at DESC");
}
json_out(['produtos' => $stmt->fetchAll()]);
