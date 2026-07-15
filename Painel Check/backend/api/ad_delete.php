<?php
/** api/ad_delete.php — POST {id} : remove um custo de anúncio. */
require __DIR__ . '/db.php';
$pdo = db();
$id = read_json_body()['id'] ?? '';
if (!$id) json_out(['erro' => 'id obrigatório.'], 400);
$pdo->prepare("DELETE FROM ads WHERE id=?")->execute([$id]);
json_out(['sucesso' => true]);
