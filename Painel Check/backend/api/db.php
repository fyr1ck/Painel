<?php
/**
 * api/db.php — Conexão e bootstrap do banco de dados.
 *
 * Segue o estilo do get_session.php (PDO + respostas JSON), mas funciona
 * "out of the box": usa SQLite por padrão (nenhum servidor de banco para
 * instalar). Em produção, defina as variáveis de ambiente para usar MySQL:
 *
 *   DB_DRIVER=mysql DB_HOST=... DB_NAME=... DB_USER=... DB_PASS=...
 *
 * Na primeira execução ele cria as tabelas e popula dados de exemplo
 * (baseados nas telas reais), para o painel já abrir com conteúdo.
 */

// ---- CORS + JSON (libera o painel/admin a consumir a API) -------------------
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/** Resposta JSON padronizada. */
function json_out($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Lê o corpo JSON de um POST. */
function read_json_body(): array {
    $raw = file_get_contents('php://input');
    $d = json_decode($raw, true);
    return is_array($d) ? $d : [];
}

/** Gera um id curto (ex.: prod_a1b2c3d4). */
function gen_id(string $prefix): string {
    return $prefix . '_' . bin2hex(random_bytes(5));
}

/** Conexão PDO (singleton). SQLite por padrão; MySQL via env. */
function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $driver = getenv('DB_DRIVER') ?: 'sqlite';
    try {
        if ($driver === 'mysql') {
            $host = getenv('DB_HOST') ?: '127.0.0.1';
            $name = getenv('DB_NAME') ?: 'rone';
            $user = getenv('DB_USER') ?: 'root';
            $pass = getenv('DB_PASS') ?: '';
            $pdo = new PDO("mysql:host=$host;dbname=$name;charset=utf8mb4", $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        } else {
            $file = getenv('DB_SQLITE') ?: (__DIR__ . '/../data/rone.sqlite');
            $pdo = new PDO('sqlite:' . $file, null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            $pdo->exec('PRAGMA foreign_keys = ON');
        }
    } catch (Throwable $e) {
        json_out(['erro' => 'Falha de conexão com o banco.', 'detalhe' => $e->getMessage()], 500);
    }

    init_schema($pdo);
    migrate($pdo);
    seed_if_empty($pdo);
    return $pdo;
}

/** Adiciona colunas de credenciais a bancos já existentes (idempotente). */
function migrate(PDO $pdo): void {
    $cols = [
        'shopify_token TEXT', 'whop_key TEXT', "gateway TEXT DEFAULT 'whop'",
        'stripe_key TEXT', 'pixel_fb TEXT', 'pixel_fb_token TEXT',
        'pixel_tt TEXT', 'pixel_tt_token TEXT',
        'detectar_moeda INTEGER DEFAULT 0', 'detectar_idioma INTEGER DEFAULT 0',
    ];
    foreach ($cols as $c) {
        try { $pdo->exec("ALTER TABLE lojas ADD COLUMN $c"); } catch (Throwable $e) { /* já existe */ }
    }
}

/** Cria as tabelas se ainda não existirem (SQL compatível com SQLite e MySQL). */
function init_schema(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS lojas (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        checkout_id TEXT,
        moeda TEXT DEFAULT 'BRL',
        idioma TEXT DEFAULT 'pt',
        cor TEXT DEFAULT '#000000',
        logo TEXT,
        shopify_connected INTEGER DEFAULT 0,
        whop_connected INTEGER DEFAULT 0,
        shopify_domain TEXT,
        shopify_token TEXT,
        whop_company_id TEXT,
        whop_key TEXT,
        gateway TEXT DEFAULT 'whop',
        stripe_key TEXT,
        pixel_fb TEXT,
        pixel_fb_token TEXT,
        pixel_tt TEXT,
        pixel_tt_token TEXT,
        detectar_moeda INTEGER DEFAULT 0,
        detectar_idioma INTEGER DEFAULT 0,
        ativo INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS produtos (
        id TEXT PRIMARY KEY,
        loja_id TEXT NOT NULL,
        nome TEXT NOT NULL,
        tipo TEXT DEFAULT 'fisico',
        descricao TEXT,
        imagem TEXT,
        moeda TEXT DEFAULT 'USD',
        idioma TEXT DEFAULT 'pt',
        cor TEXT,
        preco REAL DEFAULT 0,
        detectar_moeda INTEGER DEFAULT 0,
        detectar_idioma INTEGER DEFAULT 0,
        checkout_url TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS pedidos (
        id TEXT PRIMARY KEY,
        loja_id TEXT,
        cliente_nome TEXT,
        cliente_email TEXT,
        itens_count INTEGER DEFAULT 1,
        items_preview TEXT,
        metodo TEXT DEFAULT 'WHOP',
        valor REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS carrinhos (
        id TEXT PRIMARY KEY,
        loja_id TEXT,
        cliente_email TEXT,
        step TEXT DEFAULT 'email',
        valor REAL DEFAULT 0,
        cidade TEXT,
        ip TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS fretes (
        id TEXT PRIMARY KEY, loja_id TEXT, nome TEXT,
        preco REAL DEFAULT 0, dias_min INTEGER, dias_max INTEGER, ativo INTEGER DEFAULT 1
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS dominios (
        id TEXT PRIMARY KEY, loja_id TEXT, dominio TEXT,
        status TEXT DEFAULT 'Ativo', expira TEXT, criado TEXT DEFAULT CURRENT_TIMESTAMP
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS ads (
        id TEXT PRIMARY KEY, loja_id TEXT, plataforma TEXT, data TEXT,
        valor REAL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT UNIQUE, pass_hash TEXT,
        role TEXT DEFAULT 'admin', created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )");
}

/** Popula dados de exemplo (das telas) só se as tabelas estiverem vazias. */
function seed_if_empty(PDO $pdo): void {
    $n = (int) $pdo->query("SELECT COUNT(*) c FROM lojas")->fetch()['c'];
    if ($n > 0) return;

    // Lojas — espelha a tela "Minhas Lojas"
    $ins = $pdo->prepare("INSERT INTO lojas
        (id, nome, checkout_id, moeda, idioma, cor, shopify_connected, whop_connected, shopify_domain, whop_company_id, ativo)
        VALUES (?,?,?,?,?,?,?,?,?,?,1)");
    $ins->execute(['loja_11', 'Minha Loja', 'loja11', 'ARS', 'es', '#000000', 1, 1, 'ydsepz-uu.myshopify.com', 'biz_rEIQP9MIsW3Hbq']);
    $ins->execute(['loja_1', 'Loja 2', 'loja1', 'BRL', 'pt', '#000000', 0, 0, null, null]);

    // Alguns pedidos pendentes (tela "Pedidos")
    $p = $pdo->prepare("INSERT INTO pedidos
        (id, loja_id, cliente_nome, cliente_email, itens_count, items_preview, metodo, valor, status, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)");
    $p->execute(['ped_316', 'loja_11', null, 'customer-199b120c@gmail.com', 1, 'Bota caña media Lucien en efe...', 'WHOP', 44899.37, 'pending', '2026-06-09 21:54']);
    $p->execute(['ped_306', 'loja_11', null, 'customer-a28ebdf0@gmail.com', 3, 'CARTERA DE MANO THE CLUB EN CU... +2', 'WHOP', 51283.77, 'pending', '2026-06-09 19:15']);
    $p->execute(['ped_254', 'loja_11', 'Veronica Galladini', 'veronica.galladini@gmail.com', 28, 'Bolso J Gang en rubber – Negro... +27', 'WHOP', 591844.07, 'pending', '2026-06-09 14:10']);
    $p->execute(['ped_251', 'loja_11', null, 'customer-bb180c6e@gmail.com', 1, 'SHOPPER VERA EN CUERO VEGETAL ...', 'WHOP', 20837.54, 'pending', '2026-06-09 13:52']);

    // Carrinhos abandonados (tela "Carrinhos")
    $c = $pdo->prepare("INSERT INTO carrinhos
        (id, loja_id, cliente_email, step, valor, ip, created_at)
        VALUES (?,?,?,?,?,?,?)");
    $c->execute([gen_id('cart'), 'loja_11', 'aec_8975@yahoo.com.ar', 'email', 51283.77, '190.189.240.124', '2026-06-09 20:00']);
    $c->execute([gen_id('cart'), 'loja_11', 'veronica.galladini@gmail.com', 'email', 581847.07, '181.228.62.15', '2026-06-09 15:00']);
    $c->execute([gen_id('cart'), 'loja_11', 'silpa@example.com', 'email', 75345.60, '190.18.253.79', '2026-06-09 14:00']);

    // Métodos de entrega (tela "Fretes")
    $f = $pdo->prepare("INSERT INTO fretes (id, loja_id, nome, preco, ativo) VALUES (?,?,?,?,1)");
    $f->execute(['f1', 'loja_11', 'Envío gratis', 0]);
    $f->execute(['f2', 'loja_11', 'Envío prioritario', 9997]);

    // Domínio customizado (tela "Domínios")
    $d = $pdo->prepare("INSERT INTO dominios (id, loja_id, dominio, status, expira) VALUES (?,?,?,?,?)");
    $d->execute(['dom1', 'loja_11', 'pago.outletprune-oficial.com', 'Ativo', '88']);
}
