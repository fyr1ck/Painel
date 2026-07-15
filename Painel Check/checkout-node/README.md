# Checkout rone (Node puro) — corrigido e integrado

Checkout nativo, sem dependências, que recebe os dados do painel pela URL e
**grava o pedido e o carrinho no painel** (alimenta as telas Pedidos e Carrinhos).

## Rodar
```bash
cd checkout-node
npm start          # sobe em http://localhost:3010
```

## Link que o painel gera
```
/pay/<produto_id>?loja_id=..&nome=..&img=..&logo=..&preco=<centavos>&frete=<centavos>&moeda=ARS&idioma=es&api=https://api.seudominio.com
```
- `preco`/`frete` em **centavos** (ex.: 44999 = ARS $449,99).
- `api` = base do painel (backend PHP). Sem ela, o checkout roda em **modo demo**
  (não grava pedido nem cobra).

## O que ele faz quando o cliente paga
1. `POST {api}/api/checkout_order.php` → registra o pedido como **Pendente** (aparece em Pedidos).
2. `POST {api}/api/create_payment.php` → cria a cobrança no provedor (Whop/Stripe) e redireciona.
3. Enquanto o cliente preenche, dispara `POST {api}/api/checkout_track.php` (email → endereço → pagamento),
   alimentando **Carrinhos Abandonados** e o **funil**.

## ⚠️ Segurança (importante)
A versão original capturava número de cartão em texto no próprio servidor — isso é
**risco de PCI** e não deve ir pra produção. Aqui o pagamento é feito pelo provedor
(Whop hospedado, ou Stripe com Elements). Não envie dados de cartão para o seu Node.

## O que foi corrigido da versão do sócio
- Template estava escapado (`\${...}`) → mostrava o código na tela. **Corrigido.**
- Removido o `Wharf` (lixo) do resumo.
- `enviarPagamento()` e `alterarFreteDoPainel()` não existiam → **implementados.**
- Preço/moeda/logo/produto/frete agora são **dinâmicos** (vinham fixos).
- Passou a **registrar pedido + rastrear carrinho** no painel.
