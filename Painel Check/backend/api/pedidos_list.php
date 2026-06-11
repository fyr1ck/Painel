<?php
/** api/pedidos_list.php — GET ?loja_id=&status=&q=: lista pedidos. */
require __DIR__ . '/db.php';
$pdo = db();
$where = [];
$args = [];
if (!empty($_GET['loja_id'])) { $where[] = 'loja_id = ?'; $args[] = $_GET['loja_id']; }
if (!empty($_GET['status'])) { $where[] = 'status = ?'; $args[] = $_GET['status']; }
if (!empty($_GET['q'])) {
    $where[] = '(cliente_email LIKE ? OR cliente_nome LIKE ? OR id LIKE ?)';
    $like = '%' . $_GET['q'] . '%';
    array_push($args, $like, $like, $like);
}
$sql = "SELECT * FROM pedidos";
if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
$sql .= ' ORDER BY created_at DESC';
$stmt = $pdo->prepare($sql);
$stmt->execute($args);
$pedidos = $stmt->fetchAll();
json_out(['total' => count($pedidos), 'pedidos' => $pedidos]);
