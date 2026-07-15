# Backend — Documentação (sem implementação)

> Este documento **mapeia** o backend PHP atual e descreve o destino arquitetural.
> Conforme combinado, **nada do backend foi reescrito** — aqui só documentamos.
>
> Legenda de confiança:
> - ✅ **Confirmado** — lido diretamente do código-fonte do repositório.
> - 🔎 **Inferido** — deduzido pelo nome do arquivo + pela forma como o frontend o consome. Reavaliar contra o arquivo real.

---

## 1. Visão geral

O backend é um conjunto de scripts PHP "soltos" (flat), cada um funcionando como um
endpoint independente, sem framework, router central ou camada de serviço. O frontend
React (pasta `checkout/`) conversa com ele via `import.meta.env.VITE_API_URL` + `/api/<arquivo>.php`.

Fluxo de ponta a ponta (e-commerce → checkout transparente → pagamento):

```
Loja Shopify (storefront)
   │  checkout-interceptor.js  intercepta o botão de compra
   ▼
save_pending_order.php  →  cria pedido (status=pending) + session_id (48 hex)
   │  redireciona para  {CHECKOUT_URL}/pay/{session_id}
   ▼
Frontend React  →  GET get_session.php?session_id=...   (carrega carrinho + branding + pixels)
   │  usuário preenche dados/endereço e escolhe pagamento
   ▼
POST create_payment.php  →  cria cobrança no gateway (Whop)  →  Pix (copia-e-cola/QR) ou Cartão (redirect)
   │
   ▼
whop_webhook.php  ←  Whop notifica pagamento aprovado/recusado  →  atualiza pedidos.status
   │
   ▼
capi.php  →  envia evento Purchase para a Meta Conversions API (server-side)
```

---

## 2. Endpoints / scripts

### `get_session.php` ✅
- **Método:** `GET`  ·  **Entrada:** `?session_id=<48 hex>` (validado por `^[a-f0-9]{48}$`).
- **Faz:** `JOIN` de `pedidos` + `lojas_config` pelo `session_id`; bloqueia sessões já `paid`/`failed` (HTTP 410); nunca expõe `access_token`.
- **Retorno (JSON):**
  ```json
  {
    "sessao":   { "id": "...", "status": "pending" },
    "carrinho": [ /* itens (dados_carrinho) */ ],
    "cliente":  { /* ou null */ },
    "loja":     { "shop_url": "...", "whop_company_id": "...", "cor": "#000000",
                  "logo": "...", "moeda": "BRL", "idioma": "pt" },
    "pixels":   { "facebook": "...", "tiktok": "..." },
    "total":    123.45
  }
  ```
- **CORS:** `Access-Control-Allow-Origin: CHECKOUT_URL`. Responde 204 ao `OPTIONS`.
- **Consumido por:** `checkout/src/hooks/useSession.js` → `services/api.js » buscarSessao()`.

### `create_payment.php` 🔎
- **Método:** `POST`  ·  **Entrada (JSON):** `{ session_id, metodo, dados_cliente }` (`metodo` = `pix` | `cartao`).
- **Faz:** valida a sessão, cria a cobrança no gateway (Whop) e atualiza o pedido com os dados de pagamento.
- **Retorno (JSON):** `{ sucesso, tipo: "pix", pix_codigo, pix_qrcode, payment_id, payment_url, erro }`.
  - **Pix:** retorna `pix_codigo` (copia-e-cola) + `pix_qrcode`.
  - **Cartão:** retorna `payment_url` → o front redireciona para o checkout do Whop.
- **Consumido por:** `checkout/src/components/MetodoPagamento.jsx` → `services/api.js » criarPagamento()`.

### `save_pending_order.php` 🔎
- **Método:** `POST` (chamado pelo storefront Shopify).
- **Faz:** recebe o carrinho, gera um `session_id` (48 hex), grava em `pedidos` com `status=pending` e devolve o `session_id` para o redirect ao checkout transparente.

### `whop_webhook.php` 🔎
- **Método:** `POST` (webhook do Whop).
- **Faz:** valida a assinatura do webhook, localiza o pedido pelo `payment_id`/`session_id` e atualiza `pedidos.status` para `paid`/`failed`. Em caso de aprovação, dispara o evento de conversão (via `capi.php`).

### `capi.php` 🔎
- **Faz:** envia o evento **Purchase** para a **Meta (Facebook) Conversions API** server-side (deduplicação com o pixel do browser via `event_id`). Pode conter também a lógica equivalente para a TikTok Events API.

### `shopify_callback.php` 🔎
- **Faz:** callback de **OAuth do Shopify** (instalação do app). Troca o `code` por `access_token` e persiste `shop_url` + token em `lojas_config`.

### `conexao.php` ✅ (parcial)
- **Expõe:** a constante `CHECKOUT_URL` e a função `getPDO()` (conexão PDO). 🔎 Provavelmente concentra também credenciais do banco e chaves de API (Whop, Meta). **Recomendado:** mover segredos para variáveis de ambiente (`.env`), fora do versionamento.

### `instalar.php` 🔎
- **Faz:** instalador único — cria as tabelas (executa o `schema.sql`) e possivelmente popula `lojas_config`. **Deve ser removido/protegido em produção.**

### `checkout-interceptor.js` 🔎 (roda no storefront, não é endpoint)
- Snippet injetado no tema da **loja Shopify**. Intercepta o clique de "Finalizar compra", coleta o carrinho, chama `save_pending_order.php` e redireciona para `{CHECKOUT_URL}/pay/{session_id}`.
- **Sugestão de organização:** mover para `backend/storefront/checkout-interceptor.js` (ou um repositório de tema), já que pertence ao Shopify e não ao app React.

---

## 3. Banco de dados

Tabelas confirmadas pelo `JOIN` em `get_session.php` (✅ colunas reais; tipos 🔎 sugeridos):

### `pedidos`
| Coluna           | Tipo (sugerido)                         | Observação                          |
|------------------|-----------------------------------------|-------------------------------------|
| `id`             | `BIGINT PK AUTO_INCREMENT`              |                                     |
| `session_id`     | `CHAR(48)` (índice único)              | 48 hex; validado no endpoint        |
| `dados_carrinho` | `JSON`                                  | itens do carrinho                   |
| `total_venda`    | `DECIMAL(10,2)`                         | retornado como `total`              |
| `moeda`          | `VARCHAR(3)`                            | fallback para `lojas_config.moeda_padrao` |
| `status`         | `ENUM('pending','paid','failed')`       |                                     |
| `dados_cliente`  | `JSON` (nullable)                       |                                     |
| `loja_id`        | `BIGINT FK → lojas_config.id`           |                                     |
| `payment_id`     | 🔎 `VARCHAR` (nullable)                 | id da cobrança no Whop              |
| `created_at`     | 🔎 `TIMESTAMP`                          |                                     |

### `lojas_config`
| Coluna            | Tipo (sugerido)        | Observação                                  |
|-------------------|------------------------|---------------------------------------------|
| `id`              | `BIGINT PK`            |                                             |
| `shop_url`        | `VARCHAR`              | domínio da loja Shopify                      |
| `whop_company_id` | `VARCHAR`              | exposto ao front                            |
| `pixel_facebook`  | `VARCHAR`              | exposto ao front                            |
| `pixel_tiktok`    | `VARCHAR`              | exposto ao front                            |
| `checkout_color`  | `VARCHAR(7)`           | cor da marca (`cor`)                         |
| `checkout_logo`   | `VARCHAR`              | URL do logo                                 |
| `moeda_padrao`    | `VARCHAR(3)`           |                                             |
| `idioma_padrao`   | `VARCHAR(5)`           |                                             |
| `ativo`           | `TINYINT(1)`           | `get_session.php` exige `ativo = 1`          |
| `access_token`    | 🔎 `VARCHAR` (secreto) | **nunca** retornado ao front                 |
| `whop_api_key`    | 🔎 `VARCHAR` (secreto) | usado por `create_payment.php`               |

> O `schema.sql` versionado é a fonte da verdade — conferir os tipos reais lá.

---

## 4. Integrações externas

- **Shopify** — OAuth (`shopify_callback.php`) + interceptação de checkout no storefront (`checkout-interceptor.js`).
- **Whop** — gateway de pagamento: criação de cobrança (`create_payment.php`) e confirmação via webhook (`whop_webhook.php`). Identificada por `whop_company_id`.
- **Pix** — método nativo do checkout (copia-e-cola + QR), emitido através do Whop.
- **Meta / TikTok** — pixels no browser (`tracking/facebook.js`, `tracking/tiktok.js`) + conversão server-side (`capi.php`) com deduplicação por `event_id`.

---

## 5. Destino arquitetural (a implementar depois)

Mapeamento dos scripts atuais para a estrutura MVC desejada. **Não implementado** — é o
guia para a próxima fase.

| Estrutura-alvo      | Recebe / responsabilidade                                                        | Vem de (atual)                                  |
|---------------------|----------------------------------------------------------------------------------|-------------------------------------------------|
| `config/`           | conexão PDO, env, constantes, chaves                                             | `conexao.php`                                    |
| `routes/`           | roteador único (`/api/...` → controller)                                         | (não existe — hoje é 1 arquivo por endpoint)     |
| `controllers/`      | orquestram request/response                                                       | `get_session.php`, `create_payment.php`, `save_pending_order.php`, `whop_webhook.php`, `shopify_callback.php` |
| `services/`         | regras de negócio (pagamento, sessão, conversões)                                | lógica hoje embutida em `create_payment.php`, `capi.php` |
| `repositories/`     | acesso a dados (`pedidos`, `lojas_config`)                                        | SQL hoje inline nos endpoints                    |
| `middlewares/`      | CORS, validação de input, verificação de assinatura de webhook                   | headers/validações repetidos em cada arquivo     |
| `utils/`            | helpers (geração de `session_id`, formatação, assinatura)                        | trechos espalhados                               |
| `storefront/`       | script do tema Shopify                                                            | `checkout-interceptor.js`                        |

### Pendências/segurança recomendadas
1. **Segredos fora do código** — mover credenciais de DB, `whop_api_key` e tokens para `.env`.
2. **Validação de webhook** — garantir verificação de assinatura em `whop_webhook.php`.
3. **Proteger/remover `instalar.php`** em produção.
4. **Centralizar CORS** num middleware (hoje repetido por endpoint).
5. **Idempotência** no webhook (evitar processar o mesmo pagamento duas vezes).

---

## ✅ Backend implementado (CRUD real)

Os endpoints abaixo já estão escritos em `backend/api/` seguindo o padrão do
`get_session.php` (PDO + respostas JSON). Por padrão usam **SQLite** (arquivo em
`backend/data/rone.sqlite`), criado e populado automaticamente na 1ª execução —
não precisa instalar banco. Para produção, é só apontar para MySQL via variáveis
de ambiente (ver `api/db.php`).

| Método | Endpoint                     | Função                                            |
|--------|------------------------------|---------------------------------------------------|
| GET    | `api/lojas_list.php`         | Lista as lojas (com contagem de produtos)         |
| POST   | `api/loja_save.php`          | Cria/atualiza uma loja                            |
| POST   | `api/loja_delete.php`        | Remove uma loja e seus produtos                   |
| GET    | `api/produtos_list.php`      | Lista produtos (`?loja_id=`)                       |
| POST   | `api/produto_save.php`       | Cria/atualiza produto + gera `checkout_url`        |
| POST   | `api/produto_delete.php`     | Remove um produto                                 |
| GET    | `api/pedidos_list.php`       | Lista pedidos (`?loja_id=&status=&q=`)            |
| GET    | `api/carrinhos_list.php`     | Lista carrinhos abandonados + total perdido       |

### Como rodar o backend (local, sem instalar banco)

```bash
cd backend
php -S localhost:8000          # PHP embutido; SQLite é criado em data/rone.sqlite
```

Depois, no painel, edite `admin/js/api.js`:

```js
var USE_BACKEND = true;                 // passa a consumir o PHP
var API_BASE = 'http://localhost:8000'; // base dos endpoints
```

Recarregue o `admin/index.html` — Produtos, Lojas, Pedidos e Carrinhos passam a
ler/gravar no banco via PHP. (Sem isso, o painel já funciona em modo local,
usando o `localStorage` do navegador.)

### Tabelas criadas automaticamente
`lojas`, `produtos`, `pedidos`, `carrinhos` (schema em `api/db.php`, função
`init_schema`). Os mesmos dados das telas são inseridos por `seed_if_empty`.

---

## 🔌 Como conectar suas APIs (Shopify, Whop, Stripe, Pixels)

As credenciais ficam por loja, na tabela `lojas`, gravadas pela tela do painel
(ou direto pelos endpoints abaixo). Cada loja tem seu próprio conjunto de chaves.

| Método | Endpoint                  | Função                                   |
|--------|---------------------------|------------------------------------------|
| GET    | `api/config_get.php`      | Lê as credenciais/config de uma loja (`?loja_id=`) |
| POST   | `api/config_save.php`     | Salva credenciais/config (recalcula "conectado") |
| POST   | `api/shopify_sync.php`    | Importa produtos da Shopify Admin API (`{loja_id}`) |

**Shopify** — em *Configurações → Integração Shopify → Conectar credenciais*:
1. Na Shopify: **Apps → Develop apps → Create an app**.
2. Conceda o escopo **read_products** (e o que mais precisar) e instale o app.
3. Copie o **Admin API access token** (`shpat_…`) e o domínio `sualoja.myshopify.com`.
4. Cole no painel e salve. O botão **Sincronizar Produtos** chama `shopify_sync.php`.

**Whop** — em *Integrações*: cole a **Whop Key (API)** e o **Whop Company ID**
(`biz_…`). Ao salvar, a loja passa a aparecer com **✓ WHOP**.

**Stripe** — em *Integrações*, selecione o cartão **Stripe** e informe a
**secret key** (`sk_live_…`). O checkout usa o Payment Element.

**Pixels (Facebook / TikTok)** — em *Pixels*: ID do pixel + token (CAPI / Events
API). São injetados no checkout para rastreamento e conversões server-side.

> Os secrets ficam no banco da sua hospedagem (nunca no front). Em produção,
> recomenda-se servir a API só por HTTPS e, se quiser, mascarar os tokens no
> `config_get.php` (devolvendo apenas presença em vez do valor).

### Ligando o painel ao backend
No `admin/js/api.js`: `USE_BACKEND = true` e `API_BASE = 'https://api.seudominio.com'`.
A partir daí o painel lê/grava tudo (lojas, produtos, pedidos, carrinhos e
credenciais) via PHP. Sem isso, ele funciona localmente no navegador.

---

## 🔐 Login (conta admin) e novos endpoints

| Método | Endpoint                     | Função                                            |
|--------|------------------------------|---------------------------------------------------|
| POST   | `api/auth/register.php`      | Cria a conta admin (só se nenhuma existir)         |
| POST   | `api/auth/login.php`         | Autentica (bcrypt) e devolve token                 |
| GET/POST | `api/fretes_list.php` · `frete_save.php` · `frete_delete.php` | CRUD de métodos de entrega |
| GET/POST | `api/dominios_list.php` · `dominio_save.php` · `dominio_delete.php` | CRUD de domínios |
| GET/POST | `api/ads_list.php` · `ad_save.php` · `ad_delete.php` | CRUD de custos de anúncio |
| POST   | `api/create_payment.php`     | Cobrança real via Stripe **ou** Whop (chaves da loja) |
| POST   | `api/shopify_push.php`       | Cria produto no catálogo da Shopify (write_products)  |

### Login
No **modo local** (sem backend) a tela `login.html` cria sua conta admin no
primeiro acesso (e-mail + senha, hash no navegador) e libera o painel. É um
**porteiro local**, não segurança de servidor. Para login real, ligue o backend
e troque a tela para chamar `auth/register.php` / `auth/login.php` (senha em
bcrypt via `password_hash`). O `auth.js` já bloqueia o acesso sem token e o
botão **Sair** encerra a sessão.

### Pagamentos (Stripe / Whop) — como funciona de verdade
O painel **guarda** suas chaves por loja. Quem **processa** o pagamento é o
checkout chamando `create_payment.php`, que:
- **Stripe:** cria um *PaymentIntent* com sua `sk_live_…` e devolve o
  `client_secret` para o checkout finalizar com o Payment Element.
- **Whop:** cria uma sessão de checkout com sua API key e devolve a URL de compra.
Ou seja: **sim, dá para plugar sua API da Stripe e da Whop direto no painel.**
O código está pronto; ajuste o `plan_id`/preço da Whop conforme sua conta e rode
no seu host (não há como testar cobrança real aqui).

### Produtos → Shopify (duas coisas diferentes)
- A tela **Produtos** gera **links de checkout avulsos** (seu checkout próprio) —
  isso funciona local e via backend.
- Se quiser **cadastrar o produto no catálogo da Shopify**, use `shopify_push.php`
  (app personalizado com escopo **write_products**). É um passo separado.

### Pixels de conversão — funcionam?
Os helpers do checkout (`src/tracking/facebook.js` e `tiktok.js`) **injetam o
pixel e disparam eventos** de verdade (PageView, e os eventos padrão de compra).
Eles agem quando o checkout é servido com o ID de pixel salvo no painel. O
complemento server-side (Conversions API / Events API) é feito por um `capi.php`
no backend. Resumo: **o disparo no navegador já é real**; o CAPI exige o backend no ar.

---

## 🔗 Integração com o Checkout (Pedidos e Carrinhos reais)

Estes endpoints são chamados **pelo checkout** e fazem as telas Pedidos e
Carrinhos deixarem de ser exemplo e passarem a contar de verdade:

| Método | Endpoint                    | Função                                              |
|--------|-----------------------------|-----------------------------------------------------|
| POST   | `api/checkout_order.php`    | Checkout registra o pedido (Pendente) → tela Pedidos |
| POST   | `api/checkout_track.php`    | Checkout rastreia o carrinho (email→endereço→pagamento) → Carrinhos + funil |

Fluxo real: **checkout** (Node) → `checkout_order.php` grava o pedido e
`create_payment.php` cobra (Whop/Stripe) → o painel lê de `pedidos_list.php` /
`carrinhos_list.php` com `USE_BACKEND = true`. Carrinho abandonado = sessão que
rastreou progresso mas não virou pedido pago. O "Valor perdido" foi removido; o
funil é calculado a partir dos pedidos + carrinhos reais.
