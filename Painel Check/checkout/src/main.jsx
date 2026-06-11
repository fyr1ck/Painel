/**
 * src/main.jsx — Ponto de entrada do bundle React.
 *
 * Estava AUSENTE no projeto original: havia <App> mas nada o renderizava no DOM,
 * e não existia index.html de entrada para o Vite. Sem este arquivo o app nunca
 * montava. Aqui criamos a raiz e renderizamos <App />.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
