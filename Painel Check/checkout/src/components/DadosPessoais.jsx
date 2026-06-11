/**
 * src/components/DadosPessoais.jsx — Etapa 1 do checkout.
 *
 * COMPONENTE RECRIADO (estava ausente no projeto; o import em CheckoutPage
 * apontava para um arquivo inexistente). Contrato exigido pelo pai:
 *   props: { inicial: object, onAvancar: (dados) => void }
 *
 * Coleta nome, e-mail, telefone e documento. Usa react-hook-form (dependência
 * já presente no package.json). Ao validar, chama onAvancar(dados).
 */
import React from 'react';
import { useForm } from 'react-hook-form';
import styles from './DadosPessoais.module.css';

export default function DadosPessoais({ inicial = {}, onAvancar }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: inicial });

  return (
    <form className={`${styles.form} fade-up`} onSubmit={handleSubmit(onAvancar)}>
      <h2 className={styles.titulo}>Seus dados</h2>

      <div className={styles.campo}>
        <label htmlFor="nome">Nome completo</label>
        <input
          id="nome"
          type="text"
          placeholder="Nome e sobrenome"
          {...register('nome', { required: 'Informe seu nome completo.' })}
        />
        {errors.nome && <span className={styles.erro}>{errors.nome.message}</span>}
      </div>

      <div className={styles.campo}>
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          placeholder="voce@email.com"
          {...register('email', {
            required: 'Informe seu e-mail.',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'E-mail inválido.' },
          })}
        />
        {errors.email && <span className={styles.erro}>{errors.email.message}</span>}
      </div>

      <div className={styles.linha}>
        <div className={styles.campo}>
          <label htmlFor="telefone">Telefone / Celular</label>
          <input
            id="telefone"
            type="tel"
            placeholder="(00) 00000-0000"
            {...register('telefone', { required: 'Informe um telefone.' })}
          />
          {errors.telefone && (
            <span className={styles.erro}>{errors.telefone.message}</span>
          )}
        </div>

        <div className={styles.campo}>
          <label htmlFor="documento">Documento (CPF / DNI)</label>
          <input
            id="documento"
            type="text"
            placeholder="000.000.000-00"
            {...register('documento', { required: 'Informe seu documento.' })}
          />
          {errors.documento && (
            <span className={styles.erro}>{errors.documento.message}</span>
          )}
        </div>
      </div>

      <button type="submit" className={styles.avancar}>
        Continuar para entrega →
      </button>
    </form>
  );
}
