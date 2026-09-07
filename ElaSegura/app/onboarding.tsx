import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Colors, type ThemeColors } from '../constants/theme';
import { Fonts } from '../constants/globalFont';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { haptics } from '../lib/haptics';
import { marcarOnboardingConcluido } from '../lib/preferencias';
import { criarContato, listarContatos } from '../services/contatos';

type Passo = 'localizacao' | 'notificacoes' | 'contato' | 'pronto';

const ORDEM: Passo[] = ['localizacao', 'notificacoes', 'contato', 'pronto'];

/** Máscara de telefone brasileiro, igual à usada na tela de contatos. */
function mascararTelefone(valor: string) {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

/**
 * Primeiro acesso: permissões e primeiro contato de confiança.
 *
 * Existe por um motivo concreto: sem localização o SOS não diz onde a pessoa
 * está, e sem nenhum contato de emergência o alerta não tem para quem ir. Até
 * aqui nada no app empurrava para isso — dava para usar o ElaSegura por
 * semanas com o recurso principal desligado, sem perceber.
 *
 * Nenhum passo é obrigatório. Quem quiser pode pular tudo e configurar depois
 * em Configurações; a tela só garante que a escolha seja consciente.
 */
export default function Onboarding() {
  const router = useRouter();
  const { isDarkMode, theme } = useTheme();
  const { t } = useI18n();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [passo, setPasso] = useState<Passo>('localizacao');
  const [localizacaoOk, setLocalizacaoOk] = useState<boolean | null>(null);
  const [notificacoesOk, setNotificacoesOk] = useState<boolean | null>(null);

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [salvandoContato, setSalvandoContato] = useState(false);
  const [contatoSalvo, setContatoSalvo] = useState(false);
  const [contatosExistentes, setContatosExistentes] = useState(0);
  const [erroContato, setErroContato] = useState<string | null>(null);

  const indice = ORDEM.indexOf(passo);

  // Quem já tem contatos não precisa cadastrar outro agora — o passo vira
  // uma confirmação em vez de um formulário.
  useEffect(() => {
    listarContatos()
      .then((lista) => setContatosExistentes(lista.filter((c) => c.emergencial).length))
      .catch(() => setContatosExistentes(0));
  }, []);

  const avancar = () => {
    haptics.toque();
    const proximo = ORDEM[Math.min(ORDEM.length - 1, indice + 1)];
    setPasso(proximo);
  };

  const concluir = async () => {
    haptics.sucesso();
    await marcarOnboardingConcluido();
    router.replace('/home');
  };

  const pularTudo = async () => {
    haptics.toque();
    await marcarOnboardingConcluido();
    router.replace('/home');
  };

  const pedirLocalizacao = async () => {
    haptics.acao();
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const concedida = status === 'granted';
      setLocalizacaoOk(concedida);
      if (concedida) haptics.sucesso();
    } catch {
      setLocalizacaoOk(false);
    }
  };

  const pedirNotificacoes = async () => {
    haptics.acao();
    try {
      const atual = await Notifications.getPermissionsAsync();
      const status = atual.granted
        ? atual
        : await Notifications.requestPermissionsAsync();
      setNotificacoesOk(status.granted);
      if (status.granted) haptics.sucesso();
    } catch {
      setNotificacoesOk(false);
    }
  };

  const salvarContato = async () => {
    if (!nome.trim() || telefone.replace(/\D/g, '').length < 10 || salvandoContato) return;
    haptics.acao();
    setSalvandoContato(true);
    setErroContato(null);
    try {
      // emergencial = true: o ponto do onboarding é justamente garantir que
      // exista alguém para o SOS avisar.
      await criarContato(nome.trim(), telefone.trim(), true);
      haptics.sucesso();
      setContatoSalvo(true);
      setPasso('pronto');
    } catch (e: any) {
      haptics.erro();
      setErroContato(e?.message ?? t('onboarding.contatoErro'));
    } finally {
      setSalvandoContato(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
          <View style={styles.topo}>
            <Text style={styles.passoTexto} accessibilityLiveRegion="polite">
              {t('onboarding.passo', { atual: indice + 1, total: ORDEM.length })}
            </Text>
            {passo !== 'pronto' && (
              <TouchableOpacity
                onPress={pularTudo}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={t('onboarding.pularTudo')}
              >
                <Text style={styles.pular}>{t('onboarding.pularTudo')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.barra}>
            {ORDEM.map((p, i) => (
              <View key={p} style={[styles.barraSegmento, i <= indice && styles.barraSegmentoAtivo]} />
            ))}
          </View>

          {passo === 'localizacao' && (
            <PassoConteudo
              styles={styles}
              colors={colors}
              icone="crosshairs-gps"
              titulo={t('onboarding.localizacaoTitulo')}
              texto={t('onboarding.localizacaoTexto')}
              statusOk={localizacaoOk === true ? t('onboarding.localizacaoOk') : null}
              statusErro={localizacaoOk === false ? t('onboarding.localizacaoNegada') : null}
              acaoRotulo={t('onboarding.localizacaoBotao')}
              onAcao={pedirLocalizacao}
              acaoConcluida={localizacaoOk === true}
              onAvancar={avancar}
              avancarRotulo={t('comum.continuar')}
            />
          )}

          {passo === 'notificacoes' && (
            <PassoConteudo
              styles={styles}
              colors={colors}
              icone="bell-ring-outline"
              titulo={t('onboarding.notificacoesTitulo')}
              texto={t('onboarding.notificacoesTexto')}
              statusOk={notificacoesOk === true ? t('onboarding.notificacoesOk') : null}
              statusErro={notificacoesOk === false ? t('onboarding.notificacoesNegada') : null}
              acaoRotulo={t('onboarding.notificacoesBotao')}
              onAcao={pedirNotificacoes}
              acaoConcluida={notificacoesOk === true}
              onAvancar={avancar}
              avancarRotulo={t('comum.continuar')}
            />
          )}

          {passo === 'contato' && (
            <View style={styles.bloco}>
              <View style={styles.iconeCirculo}>
                <MaterialCommunityIcons name="account-heart-outline" size={38} color={colors.primary} />
              </View>

              <Text style={styles.titulo} accessibilityRole="header">
                {t('onboarding.contatoTitulo')}
              </Text>
              <Text style={styles.texto}>{t('onboarding.contatoTexto')}</Text>

              {contatosExistentes > 0 && (
                <View style={styles.avisoOk}>
                  <MaterialCommunityIcons name="check-circle" size={16} color="#2E7D32" />
                  <Text style={styles.avisoOkTexto}>
                    {t('onboarding.contatoJaTem', { n: contatosExistentes })}
                  </Text>
                </View>
              )}

              <Text style={styles.rotuloCampo}>{t('onboarding.contatoNome')}</Text>
              <TextInput
                style={styles.campo}
                value={nome}
                onChangeText={setNome}
                placeholder={t('onboarding.contatoNomePlaceholder')}
                placeholderTextColor={colors.secondary}
                maxLength={40}
                accessibilityLabel={t('onboarding.contatoNome')}
              />

              <Text style={styles.rotuloCampo}>{t('onboarding.contatoTelefone')}</Text>
              <TextInput
                style={styles.campo}
                value={telefone}
                onChangeText={(v) => setTelefone(mascararTelefone(v))}
                placeholder="(85) 90000-0000"
                placeholderTextColor={colors.secondary}
                keyboardType="phone-pad"
                accessibilityLabel={t('onboarding.contatoTelefone')}
              />

              {erroContato && (
                <Text style={styles.erro} accessibilityLiveRegion="assertive">
                  {erroContato}
                </Text>
              )}

              <BotaoPrincipal
                styles={styles}
                colors={colors}
                rotulo={t('onboarding.contatoSalvar')}
                onPress={salvarContato}
                carregando={salvandoContato}
                desabilitado={!nome.trim() || telefone.replace(/\D/g, '').length < 10}
              />

              <TouchableOpacity
                style={styles.linkSecundario}
                onPress={avancar}
                accessibilityRole="button"
                accessibilityLabel={t('comum.pular')}
              >
                <Text style={styles.linkSecundarioTexto}>{t('comum.pular')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {passo === 'pronto' && (
            <View style={styles.bloco}>
              <View style={[styles.iconeCirculo, { backgroundColor: 'rgba(46,125,50,0.12)' }]}>
                <MaterialCommunityIcons name="shield-check" size={38} color="#2E7D32" />
              </View>

              <Text style={styles.titulo} accessibilityRole="header">
                {t('onboarding.prontoTitulo')}
              </Text>
              <Text style={styles.texto}>{t('onboarding.prontoTexto')}</Text>

              <View style={styles.resumo}>
                <ItemResumo
                  styles={styles}
                  ok={localizacaoOk === true}
                  rotulo={t('onboarding.localizacaoTitulo')}
                />
                <ItemResumo
                  styles={styles}
                  ok={notificacoesOk === true}
                  rotulo={t('onboarding.notificacoesTitulo')}
                />
                <ItemResumo
                  styles={styles}
                  ok={contatoSalvo || contatosExistentes > 0}
                  rotulo={t('onboarding.contatoTitulo')}
                />
              </View>

              <BotaoPrincipal
                styles={styles}
                colors={colors}
                rotulo={t('onboarding.prontoBotao')}
                onPress={concluir}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PassoConteudo = ({
  styles,
  colors,
  icone,
  titulo,
  texto,
  statusOk,
  statusErro,
  acaoRotulo,
  onAcao,
  acaoConcluida,
  onAvancar,
  avancarRotulo,
}: any) => (
  <View style={styles.bloco}>
    <View style={styles.iconeCirculo}>
      <MaterialCommunityIcons name={icone} size={38} color={colors.primary} />
    </View>

    <Text style={styles.titulo} accessibilityRole="header">
      {titulo}
    </Text>
    <Text style={styles.texto}>{texto}</Text>

    {statusOk && (
      <View style={styles.avisoOk} accessibilityLiveRegion="polite">
        <MaterialCommunityIcons name="check-circle" size={16} color="#2E7D32" />
        <Text style={styles.avisoOkTexto}>{statusOk}</Text>
      </View>
    )}

    {statusErro && (
      <View style={styles.avisoAtencao} accessibilityLiveRegion="polite">
        <MaterialCommunityIcons name="information-outline" size={16} color="#B26A00" />
        <Text style={styles.avisoAtencaoTexto}>{statusErro}</Text>
      </View>
    )}

    {!acaoConcluida && (
      <BotaoPrincipal styles={styles} colors={colors} rotulo={acaoRotulo} onPress={onAcao} />
    )}

    <TouchableOpacity
      style={acaoConcluida ? undefined : styles.linkSecundario}
      onPress={onAvancar}
      accessibilityRole="button"
      accessibilityLabel={avancarRotulo}
    >
      {acaoConcluida ? (
        <View style={styles.botaoSecundario}>
          <Text style={styles.botaoSecundarioTexto}>{avancarRotulo}</Text>
        </View>
      ) : (
        <Text style={styles.linkSecundarioTexto}>{avancarRotulo}</Text>
      )}
    </TouchableOpacity>
  </View>
);

const BotaoPrincipal = ({ styles, colors, rotulo, onPress, carregando, desabilitado }: any) => (
  <TouchableOpacity
    style={[styles.botaoWrapper, desabilitado && { opacity: 0.5 }]}
    activeOpacity={0.85}
    onPress={onPress}
    disabled={desabilitado || carregando}
    accessibilityRole="button"
    accessibilityLabel={rotulo}
    accessibilityState={{ disabled: !!desabilitado, busy: !!carregando }}
  >
    <LinearGradient
      colors={[colors.primary, '#C2185B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.botao}
    >
      {carregando ? (
        <ActivityIndicator color="#FFF" />
      ) : (
        <Text style={styles.botaoTexto}>{rotulo}</Text>
      )}
    </LinearGradient>
  </TouchableOpacity>
);

const ItemResumo = ({ styles, ok, rotulo }: any) => (
  <View style={styles.itemResumo}>
    <MaterialCommunityIcons
      name={ok ? 'check-circle' : 'circle-outline'}
      size={18}
      color={ok ? '#2E7D32' : '#9C97AC'}
    />
    <Text style={[styles.itemResumoTexto, !ok && { opacity: 0.6 }]}>{rotulo}</Text>
  </View>
);

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    conteudo: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },
    topo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 12,
      marginBottom: 12,
    },
    passoTexto: { fontSize: 13, fontWeight: '700', color: colors.secondary },
    pular: { fontSize: 13, fontWeight: '700', color: colors.primary },
    barra: { flexDirection: 'row', gap: 6, marginBottom: 28 },
    barraSegmento: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    barraSegmentoAtivo: { backgroundColor: colors.primary },
    bloco: { flex: 1, justifyContent: 'center' },
    iconeCirculo: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: 24,
    },
    titulo: {
      fontFamily: Fonts.display,
      fontSize: 26,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    texto: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.secondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    avisoOk: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(46,125,50,0.12)',
      padding: 12,
      borderRadius: 12,
      marginBottom: 16,
    },
    avisoOkTexto: { color: '#2E7D32', fontSize: 13, fontWeight: '600', flexShrink: 1 },
    avisoAtencao: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(255,193,7,0.16)',
      padding: 12,
      borderRadius: 12,
      marginBottom: 16,
    },
    avisoAtencaoTexto: { color: '#B26A00', fontSize: 13, fontWeight: '600', flexShrink: 1 },
    rotuloCampo: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
      marginTop: 8,
    },
    campo: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      minHeight: 50,
      color: colors.text,
      fontSize: 15,
    },
    erro: { color: '#C62828', fontSize: 12.5, marginTop: 10, fontWeight: '600' },
    botaoWrapper: { marginTop: 22, borderRadius: 16 },
    botao: {
      height: 54,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    botaoTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    botaoSecundario: {
      height: 54,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 14,
    },
    botaoSecundarioTexto: { color: colors.primary, fontSize: 16, fontWeight: 'bold' },
    linkSecundario: { alignSelf: 'center', marginTop: 18, minHeight: 44, justifyContent: 'center' },
    linkSecundarioTexto: { color: colors.secondary, fontSize: 14, fontWeight: '600' },
    resumo: { gap: 12, marginTop: 8, marginBottom: 8 },
    itemResumo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    itemResumoTexto: { fontSize: 14, color: colors.text, fontWeight: '600' },
  });
