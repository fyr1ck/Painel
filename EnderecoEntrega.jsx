/**
 * src/components/EnderecoEntrega.jsx
 *
 * Etapa 2 do checkout — endereço de entrega.
 * Campos: CEP, logradouro, número, complemento, bairro, cidade, estado.
 * Busca automática de endereço via ViaCEP ao sair do campo CEP.
 */
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import styles from './EnderecoEntrega.module.css';

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO',
  'MA','MT','MS','MG','PA','PB','PR','PE','PI',
  'RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

function formatarCEP(valor) {
  return valor.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);
}

export default function EnderecoEntrega({ inicial = {}, onAvancar, onVoltar }) {
  const [buscandoCep, setBuscandoCep] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({ defaultValues: inicial });

  async function buscarCEP(cep) {
    const nums = cep.replace(/\D/g, '');
    if (nums.length !== 8) return;

    setBuscandoCep(true);
    clearErrors('cep');

    try {
      const res = await fetch(`https://viacep.com.br/ws/${nums}/json/`);
      const data = await res.json();

      if (data.erro) {
        setError('cep', { message: 'CEP não encontrado' });
        return;
      }

      setValue('logradouro', data.logradouro || '');
      setValue('bairro',     data.bairro     || '');
      setValue('cidade',     data.localidade || '');
      setValue('estado',     data.uf         || '');
    } catch {
      setError('cep', { message: 'Erro ao buscar CEP. Preencha manualmente.' });
    } finally {
      setBuscandoCep(false);
    }
  }

  return (
    <div className={`${styles.container} fade-up`}>
      <h2 className={styles.titulo}>Endereço de entrega</h2>

      <form onSubmit={handleSubmit(onAvancar)} noValidate>
        {/* CEP */}
        <div className={styles.campo}>
          <label className={styles.label}>CEP</label>
          <div className={styles.cepRow}>
            <input
              className={`${styles.input} ${errors.cep ? styles.inputErro : ''}`}
              placeholder="00000-000"
              maxLength={9}
              {...register('cep', {
                required: 'CEP obrigatório',
                minLength: { value: 9, message: 'CEP incompleto' },
                onChange: e => {
                  const fmt = formatarCEP(e.target.value);
                  setValue('cep', fmt);
                  if (fmt.length === 9) buscarCEP(fmt);
                },
              })}
            />
            {buscandoCep && <span className="spinner" />}
          </div>
          {errors.cep && <span className={styles.erro}>{errors.cep.message}</span>}
        </div>

        {/* Logradouro + Número */}
        <div className={styles.rowLogradouro}>
          <div className={styles.campo}>
            <label className={styles.label}>Rua / Avenida</label>
            <input
              className={`${styles.input} ${errors.logradouro ? styles.inputErro : ''}`}
              placeholder="Rua das Flores"
              {...register('logradouro', { required: 'Logradouro obrigatório' })}
            />
            {errors.logradouro && <span className={styles.erro}>{errors.logradouro.message}</span>}
          </div>

          <div className={styles.campo}>
            <label className={styles.label}>Número</label>
            <input
              className={`${styles.input} ${errors.numero ? styles.inputErro : ''}`}
              placeholder="123"
              {...register('numero', { required: 'Número obrigatório' })}
            />
            {errors.numero && <span className={styles.erro}>{errors.numero.message}</span>}
          </div>
        </div>

        {/* Complemento */}
        <div className={styles.campo}>
          <label className={styles.label}>Complemento <span className={styles.opcional}>(opcional)</span></label>
          <input
            className={styles.input}
            placeholder="Apto, bloco, andar..."
            {...register('complemento')}
          />
        </div>

        {/* Bairro */}
        <div className={styles.campo}>
          <label className={styles.label}>Bairro</label>
          <input
            className={`${styles.input} ${errors.bairro ? styles.inputErro : ''}`}
            placeholder="Centro"
            {...register('bairro', { required: 'Bairro obrigatório' })}
          />
          {errors.bairro && <span className={styles.erro}>{errors.bairro.message}</span>}
        </div>

        {/* Cidade + Estado */}
        <div className={styles.rowCidadeEstado}>
          <div className={styles.campo}>
            <label className={styles.label}>Cidade</label>
            <input
              className={`${styles.input} ${errors.cidade ? styles.inputErro : ''}`}
              placeholder="São Paulo"
              {...register('cidade', { required: 'Cidade obrigatória' })}
            />
            {errors.cidade && <span className={styles.erro}>{errors.cidade.message}</span>}
          </div>

          <div className={styles.campo}>
            <label className={styles.label}>Estado</label>
            <select
              className={`${styles.input} ${styles.select} ${errors.estado ? styles.inputErro : ''}`}
              {...register('estado', { required: 'Estado obrigatório' })}
            >
              <option value="">UF</option>
              {ESTADOS_BR.map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
            {errors.estado && <span className={styles.erro}>{errors.estado.message}</span>}
          </div>
        </div>

        {/* Ações */}
        <div className={styles.acoes}>
          <button type="button" className={styles.voltarBtn} onClick={onVoltar}>
            ← Voltar
          </button>
          <button type="submit" className={styles.avancarBtn}>
            Continuar → Pagamento
          </button>
        </div>
      </form>
    </div>
  );
}