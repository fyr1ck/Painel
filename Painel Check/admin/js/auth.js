/* ===========================================================================
   auth.js — Porteiro de login. Carregado no <head>, roda antes do painel.
   Sem token salvo → manda para login.html. Expõe RoneAuth.logout().
   (Modo local = porteiro no navegador. Segurança real vem do backend
   auth/login.php; veja BACKEND.md.)
   =========================================================================== */
(function () {
  'use strict';
  var page = location.pathname.split('/').pop();
  if (page === 'login.html') return;          // a tela de login não exige token
  try {
    if (!localStorage.getItem('rone_auth')) {
      location.replace('login.html');
      return;
    }
  } catch (e) {}
  window.RoneAuth = {
    logout: function () { try { localStorage.removeItem('rone_auth'); } catch (e) {} location.replace('login.html'); },
    email: function () { try { return localStorage.getItem('rone_auth_email') || ''; } catch (e) { return ''; } }
  };
})();
