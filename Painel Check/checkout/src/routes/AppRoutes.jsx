/**
 * src/routes/AppRoutes.jsx — Tabela de rotas do Checkout.
 *
 * Rotas:
 *   /pay/:sessionId           → Tela de checkout (dados + endereço + pagamento)
 *   /pay/:sessionId/sucesso   → Confirmação pós-pagamento
 *   /erro                     → Tela de erro
 *   *                         → Redireciona para /erro
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CheckoutPage from '../pages/CheckoutPage';
import SucessoPage from '../pages/SucessoPage';
import ErroPage from '../pages/ErroPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/pay/:sessionId" element={<CheckoutPage />} />
      <Route path="/pay/:sessionId/sucesso" element={<SucessoPage />} />
      <Route path="/erro" element={<ErroPage />} />
      <Route path="*" element={<Navigate to="/erro" replace />} />
    </Routes>
  );
}
