/**
 * src/App.jsx — Casca da aplicação de Checkout.
 *
 * Antes (app.jsx na raiz): importava de ./components/CheckoutPage,
 * ./components/SucessoPage e ./components/ErroPage — pastas que não existiam
 * no disco (os arquivos estavam soltos na raiz). Agora a estrutura existe de
 * verdade e a tabela de rotas foi extraída para ./routes/AppRoutes.jsx.
 */
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes/AppRoutes';
import './styles/global.css';

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
      <AppRoutes />
    </BrowserRouter>
  );
}
