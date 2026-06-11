# context/

Pasta reservada para React Contexts.

Hoje a sessão de checkout é carregada pelo hook `hooks/useSession.js`, consumido
diretamente por `pages/CheckoutPage.jsx` (há um único consumidor, então um
Context não é necessário ainda).

Se no futuro vários componentes precisarem da sessão sem "prop drilling",
promova o `useSession` para um `SessionProvider` aqui e troque o consumo por
`useContext(SessionContext)`.
