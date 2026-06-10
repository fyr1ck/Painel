/**
 * src/tracking/facebook.js
 *
 * Wrapper do Facebook Pixel (fbq) para disparo de eventos browser-side.
 * O tracking server-side (CAPI) é feito pelo backend em capi.php.
 */

/**
 * Dispara um evento no Facebook Pixel.
 * @param {string} evento  — Nome do evento (ex: 'AddPaymentInfo', 'Purchase')
 * @param {object} dados   — Parâmetros do evento (value, currency, etc.)
 */
export function dispararEventoFB(evento, dados = {}) {
  try {
    if (typeof window.fbq === 'function') {
      window.fbq('track', evento, dados);
    }
  } catch (err) {
    console.warn('[FB Pixel] Falha ao disparar evento:', evento, err);
  }
}