<?php
/** api/frete_delete.php — POST {id} : remove um frete. */
require __DIR__ . '/db.php';
$pdo = db();
$id = read_json_body()['id'] ?? '';
if (!$id) json_out(['erro' => 'id obrigatório.'], 400);
$pdo->prepare("DELETE FROM fretes WHERE id=?")->execute([$id]);
json_out(['sucesso' => true]);
