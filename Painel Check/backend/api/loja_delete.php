<?php
/** api/loja_delete.php — POST { id }: remove a loja e seus produtos. */
require __DIR__ . '/db.php';
$pdo = db();
$id = read_json_body()['id'] ?? '';
if (!$id) json_out(['erro' => 'id obrigatório.'], 400);
$pdo->prepare("DELETE FROM produtos WHERE loja_id = ?")->execute([$id]);
$pdo->prepare("DELETE FROM lojas WHERE id = ?")->execute([$id]);
json_out(['sucesso' => true]);
