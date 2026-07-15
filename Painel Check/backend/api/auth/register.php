<?php
/** api/auth/register.php — POST {email, senha} : cria a conta admin (apenas se ainda não existir nenhuma). */
require __DIR__ . '/../db.php';
$pdo = db();
$d = read_json_body();
$email = strtolower(trim($d['email'] ?? ''));
$senha = $d['senha'] ?? '';
if (!$email || strlen($senha) < 6) json_out(['erro' => 'E-mail válido e senha de 6+ caracteres são obrigatórios.'], 400);

$n = (int) $pdo->query("SELECT COUNT(*) c FROM users")->fetch()['c'];
if ($n > 0) json_out(['erro' => 'Já existe uma conta. Faça login.'], 409);

$id = gen_id('usr');
$pdo->prepare("INSERT INTO users (id, email, pass_hash, role) VALUES (?,?,?, 'admin')")
    ->execute([$id, $email, password_hash($senha, PASSWORD_DEFAULT)]);
$token = bin2hex(random_bytes(24));
json_out(['sucesso' => true, 'token' => $token, 'email' => $email, 'role' => 'admin']);
