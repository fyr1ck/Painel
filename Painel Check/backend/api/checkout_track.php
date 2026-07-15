<?php
/** api/checkout_track.php — POST : o CHECKOUT rastreia o progresso do carrinho.
 *  Body: {loja_id, produto_id, email, valor, moeda, step}  (step: email|address|payment)
 *  Cria/atualiza o carrinho. Carrinho abandonado = sessão sem pedido pago.
 *  É isto que faz a tela "Carrinhos Abandonados" e o funil serem reais. */
require __DIR__ . '/db.php';
$pdo = db();
$d = read_json_body();
if (empty($d['loja_id']) || empty($d['email'])) json_out(['erro' => 'loja_id e email são obrigatórios.'], 400);

$step = in_array($d['step'] ?? 'email', ['email', 'address', 'payment'], true) ? $d['step'] : 'email';
$valor = (float) ($d['valor'] ?? 0);

$ex = $pdo->prepare("SELECT id FROM carrinhos WHERE loja_id = ? AND cliente_email = ?");
$ex->execute([$d['loja_id'], $d['email']]);
$row = $ex->fetch();
if ($row) {
    $pdo->prepare("UPDATE carrinhos SET step = ?, valor = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?")
        ->execute([$step, $valor, $row['id']]);
    $id = $row['id'];
} else {
    $id = gen_id('cart');
    $pdo->prepare("INSERT INTO carrinhos (id, loja_id, cliente_email, step, valor, created_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)")
        ->execute([$id, $d['loja_id'], $d['email'], $step, $valor]);
}
json_out(['sucesso' => true, 'cart_id' => $id]);
