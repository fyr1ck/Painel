<?php
/** api/frete_save.php — POST: cria/atualiza um frete. Body: {loja_id, nome, preco, dias_min, dias_max, id?} */
require __DIR__ . '/db.php';
$pdo = db();
$d = read_json_body();
if (empty($d['loja_id']) || !isset($d['nome'])) json_out(['erro' => 'loja_id e nome são obrigatórios.'], 400);
$preco = is_numeric($d['preco'] ?? 0) && $d['preco'] >= 0 ? (float) $d['preco'] : 0;
if (!empty($d['id'])) {
    $pdo->prepare("UPDATE fretes SET nome=?, preco=?, dias_min=?, dias_max=? WHERE id=?")
        ->execute([$d['nome'], $preco, $d['dias_min'] ?? null, $d['dias_max'] ?? null, $d['id']]);
    $id = $d['id'];
} else {
    $id = gen_id('f');
    $pdo->prepare("INSERT INTO fretes (id, loja_id, nome, preco, dias_min, dias_max, ativo) VALUES (?,?,?,?,?,?,1)")
        ->execute([$id, $d['loja_id'], $d['nome'], $preco, $d['dias_min'] ?? null, $d['dias_max'] ?? null]);
}
$f = $pdo->prepare("SELECT * FROM fretes WHERE id=?"); $f->execute([$id]);
json_out(['sucesso' => true, 'frete' => $f->fetch()]);
