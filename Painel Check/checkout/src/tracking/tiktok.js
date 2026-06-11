/**
 * src/tracking/tiktok.js — Helper do TikTok Pixel (browser).
 *
 * NOTA: arquivo original (tiktok.js na raiz) não pôde ser baixado do GitHub
 * pelas ferramentas disponíveis; reconstruído preservando o contrato usado por
 * MetodoPagamento.jsx: `dispararEventoTT(evento, params)`.
 */

/** Injeta o TikTok Pixel uma única vez. */
export function inicializarPixelTT(pixelId) {
  if (!pixelId || typeof window === 'undefined' || window.ttq) return;

  /* eslint-disable */
  !(function (w, d, t) {
    w.TiktokAnalyticsObject = t;
    var ttq = (w[t] = w[t] || []);
    ttq.methods = [
      'page', 'track', 'identify', 'instances', 'debug', 'on', 'off',
      'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie',
    ];
    ttq.setAndDefer = function (e, n) {
      e[n] = function () {
        e.push([n].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (var i = 0; i < ttq.methods.length; i++)
      ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.load = function (e, n) {
      var r = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._i = ttq._i || {};
      ttq._i[e] = [];
      ttq._i[e]._u = r;
      ttq._t = ttq._t || {};
      ttq._t[e] = +new Date();
      var o = d.createElement('script');
      o.type = 'text/javascript';
      o.async = !0;
      o.src = r + '?sdkid=' + e + '&lib=' + t;
      var a = d.getElementsByTagName('script')[0];
      a.parentNode.insertBefore(o, a);
    };
    ttq.load(pixelId);
    ttq.page();
  })(window, document, 'ttq');
  /* eslint-enable */
}

/** Dispara um evento do TikTok Pixel (defensivo). */
export function dispararEventoTT(evento, params = {}) {
  if (
    typeof window === 'undefined' ||
    !window.ttq ||
    typeof window.ttq.track !== 'function'
  )
    return;
  try {
    window.ttq.track(evento, params);
  } catch (_) {
    /* silencioso */
  }
}

export default dispararEventoTT;
