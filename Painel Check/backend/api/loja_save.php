<?php
/** api/loja_save.php — POST: cria ou atualiza uma loja.
 *  Body: { id?, nome, moeda, idioma, cor, logo, checkout_id,
 *          shopify_connected, whop_connected, shopify_domain, whop_company_id, ativo } */
require __DIR__ . '/db.php';
$pdo = db();
$d = read_json_body();

$nome = trim($d['nome'] ?? '');
if ($nome === '') json_out(['erro' => 'Informe o nome da loja.'], 400);

$campos = [
    'nome' => $nome,
    'checkout_id' => $d['checkout_id'] ?? null,
    'moeda' => $d['moeda'] ?? 'BRL',
    'idioma' => $d['idioma'] ?? 'pt',
    'cor' => $d['cor'] ?? '#000000',
    'logo' => $d['logo'] ?? null,
    'shopify_connected' => !empty($d['shopify_connected']) ? 1 : 0,
    'whop_connected' => !empty($d['whop_connected']) ? 1 : 0,
    'shopify_domain' => $d['shopify_domain'] ?? null,
    'whop_company_id' => $d['whop_company_id'] ?? null,
    'ativo' => isset($d['ativo']) ? (int) (bool) $d['ativo'] : 1,
];

$id = $d['id'] ?? '';
if ($id) {
    $sets = implode(', ', array_map(fn($k) => "$k = :$k", array_keys($campos)));
    $stmt = $pdo->prepare("UPDATE lojas SET $sets WHERE id = :id");
    $stmt->execute($campos + ['id' => $id]);
} else {
    $id = gen_id('loja');
    if (!$campos['checkout_id']) $campos['checkout_id'] = $id;
    $cols = implode(', ', array_keys($campos)) . ', id';
    $vals = ':' . implode(', :', array_keys($campos)) . ', :id';
    $stmt = $pdo->prepare("INSERT INTO lojas ($cols) VALUES ($vals)");
    $stmt->execute($campos + ['id' => $id]);
}

$loja = $pdo->query("SELECT * FROM lojas WHERE id = " . $pdo->quote($id))->fetch();
json_out(['sucesso' => true, 'loja' => $loja]);
