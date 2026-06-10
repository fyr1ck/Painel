/**
 * src/App.jsx — Roteamento principal do Checkout
 *
 * Rotas:
 *   /pay/:sessionId          — Tela de checkout (dados + pagamento)
 *   /pay/:sessionId/sucesso  — Tela de confirmação pós-pagamento
 *   /erro                    — Tela de erro genérico
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import CheckoutPage from './components/CheckoutPage';
import SucessoPage  from './components/SucessoPage';
import ErroPage     from './components/ErroPage';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#111',
            color: '#fff',
            border: '1px solid rgba(0,168,84,0.3)',
            fontSize: '13px',
          },
        }}
      />
      <Routes>
        <Route path="/pay/:sessionId"         element={<CheckoutPage />} />
        <Route path="/pay/:sessionId/sucesso" element={<SucessoPage />} />
        <Route path="/erro"                   element={<ErroPage />} />
        <Route path="*"                       element={<Navigate to="/erro" replace />} />
      </Routes>
    </BrowserRouter>
  );
}