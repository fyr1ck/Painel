-- ============================================================
-- RONE CHECKOUT — Schema do Banco de Dados
-- Criado para MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS rone_checkout
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rone_checkout;

-- ------------------------------------------------------------
-- Tabela: lojas_config
-- Armazena a configuração de cada lojista conectado via OAuth
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lojas_config (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_url            VARCHAR(255) NOT NULL UNIQUE COMMENT 'Ex: minha-loja.myshopify.com',
  access_token        VARCHAR(255) NOT NULL               COMMENT 'Token shpat_... obtido via OAuth',
  whop_company_id     VARCHAR(100)     NULL               COMMENT 'ID da empresa no Whop (biz_...)',
  whop_api_key        VARCHAR(255)     NULL               COMMENT 'Chave de API do Whop',
  pixel_facebook      VARCHAR(100)     NULL               COMMENT 'ID do Pixel do Facebook',
  token_facebook_capi VARCHAR(500)     NULL               COMMENT 'Token de Acesso para a CAPI do Facebook',
  pixel_tiktok        VARCHAR(100)     NULL               COMMENT 'ID do Pixel do TikTok',
  token_tiktok_capi   VARCHAR(500)     NULL               COMMENT 'Token de Acesso para a Events API do TikTok',
  checkout_color      VARCHAR(7)       NULL DEFAULT '#000000' COMMENT 'Cor hex da tela de checkout',
  checkout_logo       VARCHAR(500)     NULL               COMMENT 'URL pública do logo do checkout',
  moeda_padrao        VARCHAR(10)      NULL DEFAULT 'BRL'  COMMENT 'Moeda padrão (BRL, USD, ARS...)',
  idioma_padrao       VARCHAR(10)      NULL DEFAULT 'pt'   COMMENT 'Idioma padrão (pt, es, en...)',
  script_tag_id       BIGINT UNSIGNED  NULL               COMMENT 'ID da ScriptTag criada na Shopify',
  ativo               TINYINT(1)       NOT NULL DEFAULT 1  COMMENT '1 = ativa, 0 = desativada',
  created_at          TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_shop_url (shop_url)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabela: pedidos
-- Gerencia sessões de checkout, pedidos pendentes e vendas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  loja_id           INT UNSIGNED    NOT NULL,
  session_id        VARCHAR(64)     NOT NULL UNIQUE       COMMENT 'UUID único da sessão de checkout',
  pending_order_id  VARCHAR(100)        NULL              COMMENT 'ID do pedido na Shopify (se criado)',
  whop_payment_id   VARCHAR(100)        NULL              COMMENT 'ID do pagamento/membership no Whop',
  dados_carrinho    JSON            NOT NULL              COMMENT 'Itens, quantidades, variantes do carrinho',
  total_venda       DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
  moeda             VARCHAR(10)     NOT NULL DEFAULT 'BRL',
  status            ENUM('pending','awaiting_payment','paid','failed','refunded')
                    NOT NULL DEFAULT 'pending'            COMMENT 'Estado atual do pedido',
  dados_cliente     JSON                NULL              COMMENT 'Nome, e-mail, endereço, telefone',
  ip_cliente        VARCHAR(45)         NULL              COMMENT 'IP para rastreamento e fraude',
  metodo_pagamento  VARCHAR(50)         NULL              COMMENT 'pix, credit_card, etc.',
  pago_em           TIMESTAMP           NULL,
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_session   (session_id),
  INDEX idx_loja_id   (loja_id),
  INDEX idx_status    (status),
  INDEX idx_created   (created_at),
  CONSTRAINT fk_pedidos_loja
    FOREIGN KEY (loja_id) REFERENCES lojas_config (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;