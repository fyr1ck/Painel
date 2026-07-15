<?php
/** api/create_payment.php — POST {loja_id, valor, moeda, email, produto}
 *  Cria a cobrança no provedor configurado na loja (Stripe ou Whop) usando as
 *  chaves salvas no painel. É ISTO que conecta a sua API da Stripe/Whop ao checkout.
 *
 *  Fluxo: checkout (frontend) -> create_payment.php -> Stripe/Whop -> devolve
 *  client_secret (Stripe) ou checkout_url (Whop) para o frontend finalizar.
 *
 *  ⚠️ Escrito e revisado, porém NÃO testado neste ambiente (sem PHP/Internet).
 *     Rode no seu host com as chaves reais para validar.
 */
require __DIR__ . '/db.php';
$pdo = db();
$d = read_json_body();
$id = $d['loja_id'] ?? '';
$valor = (float) ($d['valor'] ?? 0);
$moeda = strtolower($d['moeda'] ?? 'usd');
if (!$id || $valor <= 0) json_out(['erro' => 'loja_id e valor (>0) são obrigatórios.'], 400);

$l = $pdo->query("SELECT * FROM lojas WHERE id = " . $pdo->quote($id))->fetch();
if (!$l) json_out(['erro' => 'Loja não encontrada.'], 404);
$gateway = $l['gateway'] ?: 'whop';

if ($gateway === 'stripe') {
    if (empty($l['stripe_key'])) json_out(['erro' => 'Configure a chave da Stripe no painel.'], 400);
    // Stripe espera o valor na menor unidade (centavos)
    $amount = (int) round($valor * 100);
    $ch = curl_init('https://api.stripe.com/v1/payment_intents');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_USERPWD => $l['stripe_key'] . ':',
        CURLOPT_POSTFIELDS => http_build_query([
            'amount' => $amount,
            'currency' => $moeda,
            'description' => $d['produto'] ?? 'Pedido',
            'receipt_email' => $d['email'] ?? null,
            'automatic_payment_methods[enabled]' => 'true',
        ]),
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $pi = json_decode($resp, true);
    if ($code !== 200) json_out(['erro' => 'Stripe: ' . ($pi['error']['message'] ?? 'falha'), 'http' => $code], 502);
    json_out(['sucesso' => true, 'gateway' => 'stripe', 'client_secret' => $pi['client_secret'], 'payment_intent' => $pi['id']]);
}

// Whop (padrão): cria uma sessão de checkout usando a API key da loja.
if (empty($l['whop_key'])) json_out(['erro' => 'Configure a Whop API Key no painel.'], 400);
$ch = curl_init('https://api.whop.com/api/v2/checkout_sessions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $l['whop_key'],
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'metadata' => ['email' => $d['email'] ?? '', 'produto' => $d['produto'] ?? ''],
        // Ajuste para o seu plan_id/price conforme sua conta Whop:
        'amount' => $valor, 'currency' => strtoupper($moeda),
    ]),
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$cs = json_decode($resp, true);
if ($code < 200 || $code >= 300) json_out(['erro' => 'Whop: falha ao criar checkout', 'http' => $code, 'corpo' => $cs], 502);
json_out(['sucesso' => true, 'gateway' => 'whop', 'checkout_url' => $cs['purchase_url'] ?? ($cs['url'] ?? null), 'session' => $cs['id'] ?? null]);
