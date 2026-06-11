# RONE Platform — Checkout Transparente + Painel Admin

Monorepo reorganizado em **três sistemas independentes**, antes misturados num único repositório plano:

```
rone-platform/
├── checkout/     → Front-end do Checkout (React 18 + Vite)   ← compila e roda
├── admin/        → Painel Admin (HTML + CSS + JS modularizado)
└── backend/      → Documentação do backend PHP (BACKEND.md)  ← não reimplementado
```

> Veja o **RELATORIO.md** (na raiz) para o detalhamento completo do que foi corrigido,
> criado e reorganizado, e para as observações de transparência sobre os limites desta entrega.

---

## checkout/ — Front-end (React + Vite)

```bash
cd checkout
npm install
cp .env.example .env      # ajuste VITE_API_URL para a URL real da sua API PHP
npm run dev               # ambiente de desenvolvimento (http://localhost:5173)
npm run build             # build de produção em dist/
```

Rotas:
- `/pay/:sessionId` — tela de checkout (dados → endereço → pagamento)
- `/pay/:sessionId/sucesso` — confirmação
- `/erro` — erro / sessão inválida

A API base é lida de `import.meta.env.VITE_API_URL` e os endpoints seguem o padrão
`/api/get_session.php` e `/api/create_payment.php`.

---

## admin/ — Painel Admin

É um site estático (não precisa de build nem de `npm install`).

**Forma mais simples:** dê **duplo-clique** em `admin/index.html` — ele abre no navegador
com o CSS e a navegação funcionando (os scripts são arquivos comuns, então rodam via `file://`).

**Opcional** (recomendado se for testar muita coisa), servir por HTTP:

```bash
cd admin
python3 -m http.server 8080      # depois acesse http://localhost:8080
```

O CSS foi separado por responsabilidade em `admin/css/` e a navegação entre telas
está em `admin/js/` (sem nenhum `onclick` inline no HTML).

---

## backend/ — Backend PHP

Os arquivos PHP **permanecem no seu repositório** (não foram reescritos nesta fase).
O arquivo `backend/BACKEND.md` documenta cada endpoint, o banco de dados, as integrações
(Shopify, Whop, Pix, Meta/TikTok) e o destino arquitetural sugerido (MVC).
