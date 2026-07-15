<?php
/** api/dominio_delete.php — POST {id} : remove um domínio. */
require __DIR__ . '/db.php';
$pdo = db();
$id = read_json_body()['id'] ?? '';
if (!$id) json_out(['erro' => 'id obrigatório.'], 400);
$pdo->prepare("DELETE FROM dominios WHERE id=?")->execute([$id]);
json_out(['sucesso' => true]);
