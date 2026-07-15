<?php
/** api/auth/login.php — POST {email, senha} : autentica e devolve um token.
 *  Senhas verificadas com password_verify (hash bcrypt criado no register). */
require __DIR__ . '/../db.php';
$pdo = db();
$d = read_json_body();
$email = strtolower(trim($d['email'] ?? ''));
$senha = $d['senha'] ?? '';
if (!$email || !$senha) json_out(['erro' => 'Informe e-mail e senha.'], 400);

$u = $pdo->prepare("SELECT * FROM users WHERE email = ?");
$u->execute([$email]);
$user = $u->fetch();
if (!$user || !password_verify($senha, $user['pass_hash'])) json_out(['erro' => 'E-mail ou senha incorretos.'], 401);

$token = bin2hex(random_bytes(24));
// Em produção: salve o token (tabela sessions) ou use JWT. Aqui devolvemos para o cliente guardar.
json_out(['sucesso' => true, 'token' => $token, 'email' => $user['email'], 'role' => $user['role']]);
