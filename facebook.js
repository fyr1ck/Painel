/**
 * checkout-node/src/tracking/facebook.js
 *
 * Injeção do Pixel do Facebook e disparo de eventos via browser.
 * Os eventos CAPI (server-side) são disparados pelo PHP via capi.php.
 *
 * Eventos suportados: InitiateCheckout, AddPaymentInfo, Purchase
 */

/**
 * Injeta o script do Pixel do Facebook no <head> da página.
 * Idempotente — só injeta uma vez mesmo se chamado múltiplas vezes.
 *
 * @param {string} pixelId — ID do Pixel (ex: "123456789")
 */
export function injetarPixelFacebook(pixelId) {
  if (!pixelId || window.fbq) return;

  // Snippet padrão do Facebook Pixel (minificado e anotado)
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;
    n=f.fbq=function(){
      n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments);
    };
    if(!f._fbq) f._fbq=n;
    n.push=n;
    n.loaded=!0;
    n.version='2.0';
    n.queue=[];
    t=b.createElement(e);
    t.async=!0;
    t.src=v;
    s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
}

/**
 * Dispara um evento padrão via Facebook Pixel (browser-side).
 *
 * @param {string} evento — Nome do evento (InitiateCheckout, etc.)
 * @param {Object} dados  — Dados do evento (value, currency, content_ids, etc.)
 */
export function dispararEventoFB(evento, dados = {}) {
  if (typeof window.fbq !== 'function') return;

  window.fbq('track', evento, {
    value:        dados.value    || 0,
    currency:     dados.currency || 'BRL',
    content_ids:  dados.content_ids  || [],
    content_type: 'product',
    order_id:     dados.order_id     || undefined,
    num_items:    dados.num_items    || undefined,
  });
}

/**
 * Obtém os cookies do Facebook (_fbc, _fbp) para enriquecer a CAPI.
 * @returns {{ fbc: string|null, fbp: string|null }}
 */
export function obterCookiesFacebook() {
  const cookies = Object.fromEntries(
    document.cookie.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );

  return {
    fbc: cookies['_fbc'] || null,
    fbp: cookies['_fbp'] || null,
  };
}