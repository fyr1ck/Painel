/**
 * src/components/DadosPessoais.jsx
 *
 * Etapa 1 do checkout — dados pessoais do cliente.
 * Campos: nome completo, e-mail, CPF, telefone.
 */
import React from 'react';
import { useForm } from 'react-hook-form';
import styles from './DadosPessoais.module.css';

function formatarCPF(valor) {
  return valor
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);
}

function formatarTelefone(valor) {
  return valor
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{4})$/, '$1-$2')
    .slice(0, 15);
}

function validarCPF(cpf) {
  const nums = cpf.replace(/\D/g, '');
  if (nums.length !== 11 || /^(\d)\1+$/.test(nums)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(nums[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(nums[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(nums[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(nums[10]);
}

export default function DadosPessoais({ inicial = {}, onAvancar }) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: inicial });

  return (
    <div className={`${styles.container} fade-up`}>
      <h2 className={styles.titulo}>Seus dados</h2>

      <form onSubmit={handleSubmit(onAvancar)} noValidate>
        {/* Nome completo */}
        <div className={styles.campo}>
          <label className={styles.label}>Nome completo</label>
          <input
            className={`${styles.input} ${errors.nome ? styles.inputErro : ''}`}
            placeholder="Como aparece no documento"
            {...register('nome', {
              required: 'Nome obrigatório',
              minLength: { value: 3, message: 'Nome muito curto' },
            })}
          />
          {errors.nome && <span className={styles.erro}>{errors.nome.message}</span>}
        </div>

        {/* E-mail */}
        <div className={styles.campo}>
          <label className={styles.label}>E-mail</label>
          <input
            type="email"
            className={`${styles.input} ${errors.email ? styles.inputErro : ''}`}
            placeholder="seu@email.com"
            {...register('email', {
              required: 'E-mail obrigatório',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'E-mail inválido' },
            })}
          />
          {errors.email && <span className={styles.erro}>{errors.email.message}</span>}
        </div>

        {/* CPF / Telefone lado a lado */}
        <div className={styles.row}>
          <div className={styles.campo}>
            <label className={styles.label}>CPF</label>
            <input
              className={`${styles.input} ${errors.cpf ? styles.inputErro : ''}`}
              placeholder="000.000.000-00"
              maxLength={14}
              {...register('cpf', {
                required: 'CPF obrigatório',
                validate: v => validarCPF(v) || 'CPF inválido',
                onChange: e => setValue('cpf', formatarCPF(e.target.value)),
              })}
            />
            {errors.cpf && <span className={styles.erro}>{errors.cpf.message}</span>}
          </div>

          <div className={styles.campo}>
            <label className={styles.label}>Telefone / WhatsApp</label>
            <input
              className={`${styles.input} ${errors.telefone ? styles.inputErro : ''}`}
              placeholder="(00) 00000-0000"
              maxLength={15}
              {...register('telefone', {
                required: 'Telefone obrigatório',
                minLength: { value: 14, message: 'Telefone inválido' },
                onChange: e => setValue('telefone', formatarTelefone(e.target.value)),
              })}
            />
            {errors.telefone && <span className={styles.erro}>{errors.telefone.message}</span>}
          </div>
        </div>

        <button type="submit" className={styles.avancarBtn}>
          Continuar → Endereço
        </button>
      </form>
    </div>
  );
}