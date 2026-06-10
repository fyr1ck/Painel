<?php
/**
 * conexao.php — Conexão PDO com o banco de dados MySQL
 *
 * Use via: require_once __DIR__ . '/../conexao.php';
 * Acesso:  $pdo (objeto PDO configurado e seguro)
 */

// ------------------------------------------------------------
// Configurações — idealmente carregadas de variáveis de ambiente
// ------------------------------------------------------------
define('DB_HOST',    getenv('DB_HOST')    ?: '127.0.0.1');
define('DB_PORT',    getenv('DB_PORT')    ?: '3306');
define('DB_NAME',    getenv('DB_NAME')    ?: 'rone_checkout');
define('DB_USER',    getenv('DB_USER')    ?: 'root');
define('DB_PASS',    getenv('DB_PASS')    ?: '');
define('DB_CHARSET', 'utf8mb4');

// ------------------------------------------------------------
// Configurações do app (carregue também de .env em produção)
// ------------------------------------------------------------
define('APP_URL',            getenv('APP_URL')            ?: 'https://painel.seudominio.com');
define('CHECKOUT_URL',       getenv('CHECKOUT_URL')       ?: 'https://pay.seudominio.com');
define('SHOPIFY_API_KEY',    getenv('SHOPIFY_API_KEY')    ?: 'sua_api_key_aqui');
define('SHOPIFY_API_SECRET', getenv('SHOPIFY_API_SECRET') ?: 'seu_api_secret_aqui');
define('SHOPIFY_SCOPES',     'read_products,read_orders,write_script_tags');

/**
 * Retorna uma conexão PDO singleton.
 * Lança PDOException com mensagem genérica em produção para não vazar dados.
 */
function getPDO(): PDO
{
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
    );

    $opcoes = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,   // Previne SQL Injection real
        PDO::ATTR_PERSISTENT         => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $opcoes);
    } catch (PDOException $e) {
        // Nunca exponha credenciais ou detalhes do banco em produção
        error_log('[RONE DB] Falha na conexão: ' . $e->getMessage());
        http_response_code(500);
        die(json_encode(['erro' => 'Erro interno. Tente novamente mais tarde.']));
    }

    return $pdo;
}

// Inicializa a conexão globalmente para compatibilidade
$pdo = getPDO();