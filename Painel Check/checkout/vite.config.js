import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ---------------------------------------------------------------------------
// Configuração do Vite para o Checkout (React 18)
// - O plugin @vitejs/plugin-react é OBRIGATÓRIO para transformar JSX.
//   Sem ele, nenhum arquivo .jsx compila — esta era uma das causas do build
//   quebrado (o package.json listava o plugin mas não havia vite.config.js).
// ---------------------------------------------------------------------------
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
