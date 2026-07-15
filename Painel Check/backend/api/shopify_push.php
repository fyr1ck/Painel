<?php
/** api/shopify_push.php — POST {loja_id, nome, descricao, preco, imagem?}
 *  CRIA um produto no catálogo da Shopify a partir do painel (Admin API).
 *  Requer um app personalizado com escopo write_products e o token salvo na loja.
 *
 *  Obs.: a tela "Produtos" do painel gera LINKS DE CHECKOUT avulsos (checkout próprio).
 *  Este endpoint é o complemento para quem quer também cadastrar o item no catálogo
 *  da Shopify. São coisas diferentes — use conforme a necessidade.
 *
 *  ⚠️ Escrito e revisado, porém NÃO testado aqui (sem PHP/Internet). Rode no seu host.
 */
require __DIR__ . '/db.php';
$pdo = db();
$d = read_json_body();
$id = $d['loja_id'] ?? '';
if (!$id || empty($d['nome'])) json_out(['erro' => 'loja_id e nome são obrigatórios.'], 400);

$l = $pdo->query("SELECT * FROM lojas WHERE id = " . $pdo->quote($id))->fetch();
if (!$l) json_out(['erro' => 'Loja não encontrada.'], 404);
if (empty($l['shopify_domain']) || empty($l['shopify_token'])) {
    json_out(['erro' => 'Conecte a Shopify (domínio + Admin API token com escopo write_products).'], 400);
}

$payload = ['product' => [
    'title' => $d['nome'],
    'body_html' => $d['descricao'] ?? '',
    'status' => 'active',
    'variants' => [[ 'price' => (string) ($d['preco'] ?? '0') ]],
]];
if (!empty($d['imagem'])) {
    // Aceita URL pública; para base64 use 'attachment' em vez de 'src'.
    $payload['product']['images'] = [[ 'src' => $d['imagem'] ]];
}

$url = "https://{$l['shopify_domain']}/admin/api/2024-10/products.json";
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'X-Shopify-Access-Token: ' . $l['shopify_token'],
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$data = json_decode($resp, true);
if ($code < 200 || $code >= 300) json_out(['erro' => 'Shopify respondeu ' . $code, 'corpo' => $data], 502);

$prod = $data['product'] ?? [];
json_out(['sucesso' => true, 'shopify_product_id' => $prod['id'] ?? null, 'handle' => $prod['handle'] ?? null]);
