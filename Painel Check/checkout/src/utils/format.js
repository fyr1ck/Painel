/**
 * src/utils/format.js — Funções utilitárias de formatação.
 */

/** Formata um valor numérico como moeda, conforme idioma/moeda da loja. */
export function formatarMoeda(valor, moeda = 'BRL', idioma = 'pt') {
  const locale = idioma === 'pt' ? 'pt-BR' : 'es-AR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: moeda || 'BRL',
  }).format(Number(valor) || 0);
}

/** Máscara simples de CPF (pt-BR). */
export function mascararCPF(v = '') {
  return v
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/** Máscara simples de CEP (pt-BR). */
export function mascararCEP(v = '') {
  return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}
