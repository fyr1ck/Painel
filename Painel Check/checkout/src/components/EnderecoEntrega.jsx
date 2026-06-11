/**
 * src/components/EnderecoEntrega.jsx — Etapa 2 do checkout.
 *
 * COMPONENTE RECRIADO (estava ausente). Contrato exigido pelo pai:
 *   props: { inicial: object, onAvancar: (dados) => void, onVoltar: () => void }
 *
 * Coleta o endereço de entrega. Inclui auto-preenchimento opcional por CEP
 * (ViaCEP) quando o CEP tem 8 dígitos. Ao validar, chama onAvancar(dados).
 */
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { mascararCEP } from '../utils/format';
import styles from './EnderecoEntrega.module.css';

export default function EnderecoEntrega({ inicial = {}, onAvancar, onVoltar }) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: inicial });
  const [buscandoCep, setBuscandoCep] = useState(false);

  // Auto-preenche endereço a partir do CEP (somente Brasil / ViaCEP).
  async function consultarCep(valor) {
    const cep = (valor || '').replace(/\D/g, '');
    if (cep.length !== 8) return;
    setBuscandoCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setValue('endereco', d.logradouro || '');
        setValue('bairro', d.bairro || '');
        setValue('cidade', d.localidade || '');
        setValue('estado', d.uf || '');
      }
    } catch (_) {
      /* silencioso — usuário pode preencher manualmente */
    } finally {
      setBuscandoCep(false);
    }
  }

  return (
    <form className={`${styles.form} fade-up`} onSubmit={handleSubmit(onAvancar)}>
      <h2 className={styles.titulo}>Endereço de entrega</h2>

      <div className={styles.linha}>
        <div className={`${styles.campo} ${styles.cepCampo}`}>
          <label htmlFor="cep">CEP / Código postal</label>
          <input
            id="cep"
            type="text"
            placeholder="00000-000"
            {...register('cep', {
              required: 'Informe o CEP.',
              onChange: (e) => {
                e.target.value = mascararCEP(e.target.value);
                consultarCep(e.target.value);
              },
            })}
          />
          {buscandoCep && <span className={styles.hint}>Buscando endereço...</span>}
          {errors.cep && <span className={styles.erro}>{errors.cep.message}</span>}
        </div>
      </div>

      <div className={styles.campo}>
        <label htmlFor="endereco">Endereço (rua / avenida)</label>
        <input
          id="endereco"
          type="text"
          placeholder="Rua, avenida..."
          {...register('endereco', { required: 'Informe o endereço.' })}
        />
        {errors.endereco && <span className={styles.erro}>{errors.endereco.message}</span>}
      </div>

      <div className={styles.linha}>
        <div className={`${styles.campo} ${styles.numeroCampo}`}>
          <label htmlFor="numero">Número</label>
          <input
            id="numero"
            type="text"
            placeholder="Nº"
            {...register('numero', { required: 'Nº' })}
          />
          {errors.numero && <span className={styles.erro}>{errors.numero.message}</span>}
        </div>
        <div className={styles.campo}>
          <label htmlFor="complemento">Complemento (opcional)</label>
          <input
            id="complemento"
            type="text"
            placeholder="Apto, bloco..."
            {...register('complemento')}
          />
        </div>
      </div>

      <div className={styles.campo}>
        <label htmlFor="bairro">Bairro</label>
        <input
          id="bairro"
          type="text"
          placeholder="Bairro"
          {...register('bairro', { required: 'Informe o bairro.' })}
        />
        {errors.bairro && <span className={styles.erro}>{errors.bairro.message}</span>}
      </div>

      <div className={styles.linha}>
        <div className={styles.campo}>
          <label htmlFor="cidade">Cidade</label>
          <input
            id="cidade"
            type="text"
            placeholder="Cidade"
            {...register('cidade', { required: 'Informe a cidade.' })}
          />
          {errors.cidade && <span className={styles.erro}>{errors.cidade.message}</span>}
        </div>
        <div className={`${styles.campo} ${styles.estadoCampo}`}>
          <label htmlFor="estado">Estado / Província</label>
          <input
            id="estado"
            type="text"
            placeholder="UF"
            {...register('estado', { required: 'UF' })}
          />
          {errors.estado && <span className={styles.erro}>{errors.estado.message}</span>}
        </div>
      </div>

      <div className={styles.acoes}>
        <button type="button" className={styles.voltar} onClick={onVoltar}>
          ← Voltar
        </button>
        <button type="submit" className={styles.avancar}>
          Ir para pagamento →
        </button>
      </div>
    </form>
  );
}
