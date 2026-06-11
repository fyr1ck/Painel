<?php
/** api/shopify_sync.php — POST { loja_id }: importa produtos da Shopify Admin API.
 *
 *  Esqueleto pronto para produção. Usa o domínio + Admin API access token salvos
 *  pela loja (config_save.php). Crie um app personalizado na Shopify
 *  (Admin → Apps → Develop apps), conceda o escopo read_products e cole o token
 *  de acesso na tela de Configurações do painel.
 */
require __DIR__ . '/db.php';
$pdo = db();
$id = read_json_body()['loja_id'] ?? '';
if (!$id) json_out(['erro' => 'loja_id obrigatório.'], 400);

$l = $pdo->query("SELECT * FROM lojas WHERE id = " . $pdo->quote($id))->fetch();
if (!$l) json_out(['erro' => 'Loja não encontrada.'], 404);
if (empty($l['shopify_domain']) || empty($l['shopify_token'])) {
    json_out(['erro' => 'Conecte a Shopify primeiro (domínio + Admin API token).'], 400);
}

$url = "https://{$l['shopify_domain']}/admin/api/2024-10/products.json?limit=50";
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'X-Shopify-Access-Token: ' . $l['shopify_token'],
        'Content-Type: application/json',
    ],
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
if ($code !== 200) json_out(['erro' => 'Shopify respondeu ' . $code, 'corpo' => $resp], 502);

$data = json_decode($resp, true);
$importados = 0;
foreach (($data['products'] ?? []) as $p) {
    $pid = 'prod_shp_' . $p['id'];
    $preco = $p['variants'][0]['price'] ?? 0;
    $img = $p['image']['src'] ?? null;
    $pdo->prepare("INSERT OR REPLACE INTO produtos
        (id, loja_id, nome, tipo, descricao, imagem, moeda, idioma, preco, checkout_url, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)")
        ->execute([$pid, $id, $p['title'], 'fisico', strip_tags($p['body_html'] ?? ''), $img,
                   $l['moeda'], $l['idioma'], $preco, '/pay/' . $pid]);
    $importados++;
}
json_out(['sucesso' => true, 'importados' => $importados]);
