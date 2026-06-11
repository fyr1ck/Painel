<?php
/** api/carrinhos_list.php — GET ?loja_id=: lista carrinhos abandonados + funil. */
require __DIR__ . '/db.php';
$pdo = db();
$lojaId = $_GET['loja_id'] ?? '';
if ($lojaId) {
    $stmt = $pdo->prepare("SELECT * FROM carrinhos WHERE loja_id = ? ORDER BY created_at DESC");
    $stmt->execute([$lojaId]);
    $carrinhos = $stmt->fetchAll();
} else {
    $carrinhos = $pdo->query("SELECT * FROM carrinhos ORDER BY created_at DESC")->fetchAll();
}
$perdido = array_sum(array_map(fn($c) => (float) $c['valor'], $carrinhos));
json_out([
    'total' => count($carrinhos),
    'valor_perdido' => $perdido,
    'carrinhos' => $carrinhos,
]);
