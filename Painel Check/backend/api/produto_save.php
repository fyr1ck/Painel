<?php
/** api/produto_save.php — POST: cria ou atualiza um produto e gera o link de checkout.
 *  Body: { id?, loja_id, nome, tipo, descricao, imagem, moeda, idioma, cor, preco,
 *          detectar_moeda, detectar_idioma } */
require __DIR__ . '/db.php';
$pdo = db();
$d = read_json_body();

$nome = trim($d['nome'] ?? '');
$lojaId = $d['loja_id'] ?? '';
if ($nome === '') json_out(['erro' => 'Informe o nome do produto.'], 400);
if ($lojaId === '') json_out(['erro' => 'loja_id obrigatório.'], 400);

$campos = [
    'loja_id' => $lojaId,
    'nome' => $nome,
    'tipo' => $d['tipo'] ?? 'fisico',
    'descricao' => $d['descricao'] ?? null,
    'imagem' => $d['imagem'] ?? null,
    'moeda' => $d['moeda'] ?? 'USD',
    'idioma' => $d['idioma'] ?? 'pt',
    'cor' => $d['cor'] ?? null,
    'preco' => (float) ($d['preco'] ?? 0),
    'detectar_moeda' => !empty($d['detectar_moeda']) ? 1 : 0,
    'detectar_idioma' => !empty($d['detectar_idioma']) ? 1 : 0,
];

$id = $d['id'] ?? '';
if ($id) {
    $sets = implode(', ', array_map(fn($k) => "$k = :$k", array_keys($campos)));
    $pdo->prepare("UPDATE produtos SET $sets WHERE id = :id")->execute($campos + ['id' => $id]);
} else {
    $id = gen_id('prod');
    $cols = implode(', ', array_keys($campos)) . ', id, checkout_url';
    $vals = ':' . implode(', :', array_keys($campos)) . ', :id, :checkout_url';
    // Link de checkout avulso por produto (padrão /pay/<id>)
    $campos['checkout_url'] = '/pay/' . $id;
    $pdo->prepare("INSERT INTO produtos ($cols) VALUES ($vals)")
        ->execute($campos + ['id' => $id]);
}

$prod = $pdo->query("SELECT * FROM produtos WHERE id = " . $pdo->quote($id))->fetch();
json_out(['sucesso' => true, 'produto' => $prod]);
