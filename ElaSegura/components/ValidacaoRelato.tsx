import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/theme';
import { haptics } from '../lib/haptics';
import { votar, estaContestado, type Voto } from '../services/validacoes';

type Props = {
  ocorrenciaId: string;
  confirmacoes: number;
  refutacoes: number;
  meuVoto: Voto | null;
  /** true quando o relato é da própria usuária: ela não vota no que escreveu. */
  souAutora: boolean;
  onMudou?: (dados: { confirmacoes: number; refutacoes: number; meuVoto: Voto | null }) => void;
  onMensagem?: (texto: string, tipo: 'success' | 'danger' | 'info') => void;
};

/**
 * Validação comunitária de um relato.
 *
 * Existe porque um mapa colaborativo aberto acumula dois tipos de ruído: o
 * engano de boa-fé e a marcação mal-intencionada. Deixar a própria comunidade
 * dizer "eu vi, procede" ou "isso não confere" é o que separa um relato com
 * lastro de um palpite — e é o que alimenta o peso de cada ponto no mapa de
 * calor.
 *
 * A autora não vota no próprio relato: os botões aparecem desabilitados, com
 * o placar visível, em vez de sumirem. Some o botão, some a informação de que
 * a validação existe.
 */
export const ValidacaoRelato = ({
  ocorrenciaId,
  confirmacoes,
  refutacoes,
  meuVoto,
  souAutora,
  onMudou,
  onMensagem,
}: Props) => {
  const { t, tp } = useI18n();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const [enviando, setEnviando] = useState<Voto | null>(null);

  const contestado = estaContestado({ confirmacoes, refutacoes });

  const registrar = async (voto: Voto) => {
    if (souAutora || enviando) return;
    haptics.selecao();
    setEnviando(voto);
    try {
      const placar = await votar(ocorrenciaId, voto);
      haptics.sucesso();
      onMudou?.(placar);
      onMensagem?.(
        placar.meuVoto === null ? t('validacao.votoRemovido') : t('validacao.votoRegistrado'),
        'success'
      );
    } catch (e: any) {
      haptics.erro();
      onMensagem?.(e?.message ?? t('validacao.erroVoto'), 'danger');
    } finally {
      setEnviando(null);
    }
  };

  const resumo =
    confirmacoes === 0 && refutacoes === 0
      ? t('validacao.semVotos')
      : [
          confirmacoes > 0
            ? tp('validacao.confirmadoPorUm', 'validacao.confirmadoPor', confirmacoes)
            : null,
          refutacoes > 0 ? tp('validacao.refutadoPorUm', 'validacao.refutadoPor', refutacoes) : null,
        ]
          .filter(Boolean)
          .join(' · ');

  return (
    <View style={styles.wrapper}>
      <View style={styles.linhaResumo}>
        <Text style={[styles.resumo, { color: colors.secondary }]} numberOfLines={1}>
          {resumo}
        </Text>
        {contestado && (
          <View style={styles.selo}>
            <MaterialCommunityIcons name="alert-octagon-outline" size={12} color="#B26A00" />
            <Text style={styles.seloTexto}>{t('validacao.contestado')}</Text>
          </View>
        )}
      </View>

      <View style={styles.botoes}>
        <BotaoVoto
          icone="check-circle-outline"
          rotulo={t('validacao.confirmar')}
          rotuloA11y={t('a11y.confirmarRelato')}
          ativo={meuVoto === 'confirma'}
          corAtiva="#2E7D32"
          desabilitado={souAutora}
          carregando={enviando === 'confirma'}
          onPress={() => registrar('confirma')}
          colors={colors}
        />
        <BotaoVoto
          icone="close-circle-outline"
          rotulo={t('validacao.refutar')}
          rotuloA11y={t('a11y.refutarRelato')}
          ativo={meuVoto === 'refuta'}
          corAtiva="#C62828"
          desabilitado={souAutora}
          carregando={enviando === 'refuta'}
          onPress={() => registrar('refuta')}
          colors={colors}
        />
      </View>

      {souAutora && (
        <Text style={[styles.aviso, { color: colors.secondary }]}>{t('validacao.naoVotaProprio')}</Text>
      )}
    </View>
  );
};

const BotaoVoto = ({
  icone,
  rotulo,
  rotuloA11y,
  ativo,
  corAtiva,
  desabilitado,
  carregando,
  onPress,
  colors,
}: any) => (
  <TouchableOpacity
    style={[
      styles.botao,
      { borderColor: ativo ? corAtiva : colors.border },
      ativo && { backgroundColor: `${corAtiva}14` },
      desabilitado && styles.botaoDesabilitado,
    ]}
    onPress={onPress}
    disabled={desabilitado || carregando}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={rotuloA11y}
    accessibilityState={{ selected: ativo, disabled: desabilitado, busy: carregando }}
  >
    {carregando ? (
      <ActivityIndicator size="small" color={ativo ? corAtiva : colors.secondary} />
    ) : (
      <MaterialCommunityIcons name={icone} size={16} color={ativo ? corAtiva : colors.secondary} />
    )}
    <Text style={[styles.botaoTexto, { color: ativo ? corAtiva : colors.secondary }]}>{rotulo}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  wrapper: { marginTop: 10, gap: 8 },
  linhaResumo: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  resumo: { fontSize: 11.5, fontWeight: '600', flexShrink: 1 },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,193,7,0.16)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  seloTexto: { fontSize: 10, fontWeight: '700', color: '#B26A00' },
  botoes: { flexDirection: 'row', gap: 8 },
  botao: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.2,
    borderRadius: 10,
    paddingVertical: 8,
    minHeight: 40,
  },
  botaoDesabilitado: { opacity: 0.45 },
  botaoTexto: { fontSize: 12, fontWeight: '700' },
  aviso: { fontSize: 10.5, fontStyle: 'italic' },
});
