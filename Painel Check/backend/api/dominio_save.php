<?php
/** api/dominio_save.php — POST {loja_id, dominio} : adiciona domínio customizado (CNAME → pay.nonexcheckout.com). */
require __DIR__ . '/db.php';
$pdo = db();
$d = read_json_body();
if (empty($d['loja_id']) || empty($d['dominio'])) json_out(['erro' => 'loja_id e dominio são obrigatórios.'], 400);
$dom = strtolower(trim($d['dominio']));
if (!preg_match('/^[a-z0-9.-]+\.[a-z]{2,}$/', $dom)) json_out(['erro' => 'Domínio inválido.'], 400);
$id = gen_id('dom');
$pdo->prepare("INSERT INTO dominios (id, loja_id, dominio, status, expira, criado) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)")
    ->execute([$id, $d['loja_id'], $dom, 'Ativo', '88']);
$r = $pdo->prepare("SELECT * FROM dominios WHERE id=?"); $r->execute([$id]);
json_out(['sucesso' => true, 'dominio' => $r->fetch()]);
