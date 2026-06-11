/**
 * src/tracking/facebook.js — Helper do Meta Pixel (browser).
 *
 * NOTA: arquivo original (facebook.js na raiz) não pôde ser baixado do GitHub
 * pelas ferramentas disponíveis; esta versão foi reconstruída preservando o
 * contrato usado por MetodoPagamento.jsx: `dispararEventoFB(evento, params)`.
 * O CAPI (server-side) continua sendo feito pelo PHP (capi.php).
 */

/** Injeta o Meta Pixel uma única vez e dispara o PageView inicial. */
export function inicializarPixelFB(pixelId) {
  if (!pixelId || typeof window === 'undefined' || window.fbq) return;

  /* eslint-disable */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
}

/** Dispara um evento padrão do Pixel (defensivo: só age se o fbq existir). */
export function dispararEventoFB(evento, params = {}) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  try {
    window.fbq('track', evento, params);
  } catch (_) {
    /* silencioso — tracking nunca deve quebrar o checkout */
  }
}

export default dispararEventoFB;
