<?php
/** api/checkout_order.php — POST : o CHECKOUT registra um pedido (pendente) no painel.
 *  Body: {loja_id, produto_id, produto, email, nome, telefone, endereco, cidade, provincia, cep, valor, moeda}
 *  É isto que faz a tela "Pedidos" do painel ser real. */
require __DIR__ . '/db.php';
$pdo = db();
$d = read_json_body();
if (empty($d['loja_id']) || empty($d['email'])) json_out(['erro' => 'loja_id e email são obrigatórios.'], 400);

$id = gen_id('ped');
$valor = (float) ($d['valor'] ?? 0);
$pdo->prepare("INSERT INTO pedidos
    (id, loja_id, cliente_nome, cliente_email, itens_count, items_preview, metodo, valor, status, created_at)
    VALUES (?,?,?,?,?,?,?,?, 'pending', CURRENT_TIMESTAMP)")
    ->execute([$id, $d['loja_id'], $d['nome'] ?? null, $d['email'], 1, $d['produto'] ?? '', 'WHOP', $valor]);

// O carrinho virou pedido → remove o abandonado correspondente.
$pdo->prepare("DELETE FROM carrinhos WHERE loja_id = ? AND cliente_email = ?")->execute([$d['loja_id'], $d['email']]);

json_out(['sucesso' => true, 'pedido_id' => $id]);
