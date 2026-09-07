import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { getStyles } from '../styles/ocorrencias.styles';
import { ToastNotification } from '../components/ToastNotification';
import { BackHomeButton } from '../components/BackHomeButton';
import { SuccessPopup } from '../components/SuccessPopup';
import { ValidacaoRelato } from '../components/ValidacaoRelato';
import { haptics } from '../lib/haptics';
import { useLocation } from '../hooks/use-location';
import {
  listarOcorrencias,
  listarOcorrenciasProximas,
  criarOcorrencia,
  atualizarOcorrencia,
  excluirOcorrencia,
  type OcorrenciaApp,
  type OcorrenciaTipo,
  type PeriodoFiltro,
} from '../services/ocorrencias';
import { meusVotos, type Voto } from '../services/validacoes';
import { auth } from '../services/firebase';

type Aba = 'proximas' | 'minhas';

const RAIOS = [500, 1000, 2000, 5000];

const PERIODOS: { valor: PeriodoFiltro; chave: 'mapa.periodo7' | 'mapa.periodo30' | 'mapa.periodo90' | 'mapa.periodoTudo' }[] = [
  { valor: '7d', chave: 'mapa.periodo7' },
  { valor: '30d', chave: 'mapa.periodo30' },
  { valor: '90d', chave: 'mapa.periodo90' },
  { valor: 'tudo', chave: 'mapa.periodoTudo' },
];

const CATEGORIAS = ['catAssedio', 'catRoubo', 'catSuspeita', 'catOutro'] as const;

function formatarDistancia(metros?: number) {
  if (metros == null) return null;
  return metros >= 1000 ? `${(metros / 1000).toFixed(1)}km` : `${Math.round(metros)}m`;
}

export default function Ocorrencias() {
  const { isDarkMode, theme } = useTheme();
  const { t, locale } = useI18n();
  const colors = Colors[theme];
  const styles = useMemo(() => getStyles(isDarkMode, colors), [isDarkMode, colors]);
  const { coords } = useLocation();

  const [ocorrencias, setOcorrencias] = useState<OcorrenciaApp[]>([]);
  const [votos, setVotos] = useState<Record<string, Voto>>({});
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const [aba, setAba] = useState<Aba>('proximas');
  const [raio, setRaio] = useState(1000);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('30d');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todos');

  const [modalVisible, setModalVisible] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<OcorrenciaTipo>('error');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'danger' | 'info'>('success');
  const [editSuccessVisible, setEditSuccessVisible] = useState(false);

  const uid = auth.currentUser?.uid ?? null;

  const showToast = useCallback((mensagem: string, tipoToast: 'success' | 'danger' | 'info') => {
    setToastMessage(mensagem);
    setToastType(tipoToast);
    setToastVisible(true);
  }, []);

  /**
   * Carrega a lista da aba ativa.
   *
   * "Próximas" traz o que a comunidade registrou em volta — é a aba onde a
   * validação faz sentido. "Meus relatos" traz só o que a usuária escreveu, e
   * é a única onde editar e excluir aparecem.
   */
  const carregar = useCallback(async () => {
    try {
      const dados =
        aba === 'minhas'
          ? await listarOcorrencias(undefined, periodo)
          : coords
            ? await listarOcorrenciasProximas(coords.latitude, coords.longitude, raio, undefined, periodo)
            : [];

      setOcorrencias(dados);
    } catch (e: any) {
      console.warn('[ocorrencias] falha ao carregar:', e);
      showToast(e?.message ?? t('ocorrencias.erroCarregar'), 'danger');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
    // Mesmo motivo do mapa: dependemos das coordenadas, não da identidade do
    // objeto que o hook de localização recria a cada leitura do GPS.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, periodo, raio, coords?.latitude, coords?.longitude, showToast, t]);

  useEffect(() => {
    setCarregando(true);
    carregar();
  }, [carregar]);

  // Os votos da usuária vêm numa consulta só, fora do ciclo da lista: eles não
  // mudam quando ela troca de raio ou de período.
  useEffect(() => {
    meusVotos().then(setVotos).catch(() => setVotos({}));
  }, []);

  const listaFiltrada = useMemo(() => {
    if (categoriaFiltro === 'todos') return ocorrencias;
    const alvo = t(`mapa.${categoriaFiltro}` as 'mapa.catAssedio').toLowerCase();
    return ocorrencias.filter(
      (o) => o.title.toLowerCase().includes(alvo) || o.description.toLowerCase().includes(alvo)
    );
  }, [ocorrencias, categoriaFiltro, t]);

  const formatarData = useCallback(
    (iso: string | null) => {
      if (!iso) return '';
      const data = new Date(iso);
      return `${data.toLocaleDateString(locale, { day: '2-digit', month: 'long' })}, ${data.toLocaleTimeString(
        locale,
        { hour: '2-digit', minute: '2-digit' }
      )}`;
    },
    [locale]
  );

  const podeSalvar = titulo.trim().length > 0 && descricao.trim().length > 0;

  const limparFormulario = () => {
    setTitulo('');
    setDescricao('');
    setTipo('error');
    setCategoriaSelecionada('');
    setEditandoId(null);
  };

  const fecharModal = () => {
    setModalVisible(false);
    limparFormulario();
  };

  const abrirCriacao = () => {
    haptics.toque();
    limparFormulario();
    setModalVisible(true);
  };

  const abrirEdicao = (item: OcorrenciaApp) => {
    haptics.toque();
    const conhecidas = CATEGORIAS.slice(0, 3).map((c) => t(`mapa.${c}` as 'mapa.catAssedio'));
    setEditandoId(item.id);
    setTitulo(item.title);
    setDescricao(item.description);
    setTipo(item.type);
    setCategoriaSelecionada(conhecidas.includes(item.title) ? item.title : t('mapa.catOutro'));
    setModalVisible(true);
  };

  const salvar = async () => {
    if (!podeSalvar || salvando) return;
    haptics.acao();
    setSalvando(true);

    try {
      if (editandoId != null) {
        await atualizarOcorrencia(editandoId, {
          title: titulo.trim(),
          description: descricao.trim(),
          type: tipo,
        });
        haptics.sucesso();
        fecharModal();
        setEditSuccessVisible(true);
        carregar();
      } else {
        // A coordenada é o que coloca o relato no mapa e na busca por raio.
        // Sem ela o registro ainda vale, só não aparece para quem está por perto.
        let lat: number | null = coords?.latitude ?? null;
        let lng: number | null = coords?.longitude ?? null;

        if (lat == null || lng == null) {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const ultima = await Location.getLastKnownPositionAsync({});
              const loc =
                ultima ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
              lat = loc.coords.latitude;
              lng = loc.coords.longitude;
            }
          } catch {
            // segue sem coordenada
          }
        }

        await criarOcorrencia({
          title: titulo.trim(),
          description: descricao.trim(),
          type: tipo,
          latitude: lat,
          longitude: lng,
        });

        haptics.sucesso();
        showToast(t('ocorrencias.registrada'), 'success');
        setCategoriaFiltro('todos');
        setAba('minhas');
        fecharModal();
      }
    } catch (e: any) {
      haptics.erro();
      Alert.alert(t('comum.erro'), e?.message ?? t('ocorrencias.erroSalvar'));
    } finally {
      setSalvando(false);
    }
  };

  const excluir = (item: OcorrenciaApp) => {
    haptics.aviso();
    Alert.alert(t('ocorrencias.excluirTitulo'), t('ocorrencias.excluirPergunta'), [
      { text: t('comum.cancelar'), style: 'cancel' },
      {
        text: t('comum.excluir'),
        style: 'destructive',
        onPress: async () => {
          try {
            await excluirOcorrencia(item.id);
            setOcorrencias((anteriores) => anteriores.filter((o) => o.id !== item.id));
            haptics.sucesso();
            showToast(t('ocorrencias.excluida'), 'success');
          } catch (e: any) {
            haptics.erro();
            Alert.alert(t('comum.erro'), e?.message ?? t('ocorrencias.erroExcluir'));
          }
        },
      },
    ]);
  };

  const aoValidar = (
    id: string,
    placar: { confirmacoes: number; refutacoes: number; meuVoto: Voto | null }
  ) => {
    setOcorrencias((anteriores) =>
      anteriores.map((o) =>
        o.id === id ? { ...o, confirmacoes: placar.confirmacoes, refutacoes: placar.refutacoes } : o
      )
    );
    setVotos((anteriores) => {
      const proximo = { ...anteriores };
      if (placar.meuVoto === null) delete proximo[id];
      else proximo[id] = placar.meuVoto;
      return proximo;
    });
  };

  const Chip = ({
    rotulo,
    ativo,
    onPress,
  }: {
    rotulo: string;
    ativo: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.filterChip, ativo && styles.activeFilterChip]}
      onPress={() => {
        haptics.selecao();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected: ativo }}
      accessibilityLabel={t('a11y.filtro', { nome: rotulo })}
    >
      <Text style={[styles.filterChipText, ativo && styles.activeFilterChipText]}>{rotulo}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <BackHomeButton style={{ marginRight: 15 }} />
        <View>
          <Text style={styles.headerTitle} accessibilityRole="header">
            {t('ocorrencias.titulo')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {aba === 'proximas' ? t('ocorrencias.subtituloProximas') : t('ocorrencias.subtituloMinhas')}
          </Text>
        </View>
      </View>

      <View style={styles.tabContainer} accessibilityRole="tablist">
        <TouchableOpacity
          style={[styles.tab, aba === 'proximas' && styles.activeTab]}
          onPress={() => {
            haptics.selecao();
            setAba('proximas');
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: aba === 'proximas' }}
        >
          <Text style={[styles.tabText, aba === 'proximas' && styles.activeTabText]}>
            {t('ocorrencias.abaProximas')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, aba === 'minhas' && styles.activeTab]}
          onPress={() => {
            haptics.selecao();
            setAba('minhas');
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: aba === 'minhas' }}
        >
          <Text style={[styles.tabText, aba === 'minhas' && styles.activeTabText]}>
            {t('ocorrencias.abaMinhas')}
          </Text>
        </TouchableOpacity>
      </View>

      {aba === 'proximas' && (
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>{t('ocorrencias.raioBusca')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            {RAIOS.map((valor) => (
              <Chip
                key={valor}
                rotulo={valor >= 1000 ? `${valor / 1000}km` : `${valor}m`}
                ativo={raio === valor}
                onPress={() => setRaio(valor)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>{t('ocorrencias.periodo')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          {PERIODOS.map((p) => (
            <Chip
              key={p.valor}
              rotulo={t(p.chave)}
              ativo={periodo === p.valor}
              onPress={() => setPeriodo(p.valor)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>{t('ocorrencias.categoria')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          <Chip
            rotulo={t('comum.todos')}
            ativo={categoriaFiltro === 'todos'}
            onPress={() => setCategoriaFiltro('todos')}
          />
          {CATEGORIAS.slice(0, 3).map((c) => (
            <Chip
              key={c}
              rotulo={t(`mapa.${c}` as 'mapa.catAssedio')}
              ativo={categoriaFiltro === c}
              onPress={() => setCategoriaFiltro(c)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.registerButton}
          activeOpacity={0.8}
          onPress={abrirCriacao}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.reportarOcorrencia')}
        >
          <MaterialIcons name="add-alert" size={24} color="#FFF" />
          <Text style={styles.registerButtonText}>{t('ocorrencias.nova')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => {
              setAtualizando(true);
              carregar();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {carregando ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : listaFiltrada.length > 0 ? (
          listaFiltrada.map((item) => {
            const souAutora = item.user_id === uid;
            const distancia = formatarDistancia(item.distance);

            return (
              <View key={item.id} style={styles.occurrenceCard}>
                <View style={{ flexDirection: 'row' }}>
                  <View style={styles.occurrenceIconBox}>
                    <MaterialIcons
                      name={item.type === 'error' ? 'error' : 'warning'}
                      size={30}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.occurrenceInfo}>
                    <Text style={styles.occurrenceTitle} numberOfLines={1}>
                      {item.title}
                    </Text>

                    <Text style={styles.occurrenceDescription} numberOfLines={2}>
                      {item.description}
                    </Text>

                    {distancia && (
                      <View style={styles.distanceBadge}>
                        <MaterialCommunityIcons name="map-marker-distance" size={12} color={colors.primary} />
                        <Text style={styles.distanceText} numberOfLines={1}>
                          {t('ocorrencias.distancia', { valor: distancia })}
                        </Text>
                      </View>
                    )}

                    <View style={styles.occurrenceTimeRow}>
                      <MaterialCommunityIcons name="clock-outline" size={12} color={colors.secondary} />
                      <Text style={styles.occurrenceTime} numberOfLines={1}>
                        {formatarData(item.created_at)}
                        {!souAutora && item.user_name
                          ? ` · ${t('ocorrencias.porFulana', { nome: item.user_name })}`
                          : ''}
                      </Text>
                    </View>
                  </View>

                  {souAutora && (
                    <View style={styles.occurrenceActionsRow}>
                      <TouchableOpacity
                        style={styles.cardActionButton}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        onPress={() => abrirEdicao(item)}
                        accessibilityRole="button"
                        accessibilityLabel={t('comum.editar')}
                      >
                        <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.cardActionButton, styles.cardActionButtonDanger]}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        onPress={() => excluir(item)}
                        accessibilityRole="button"
                        accessibilityLabel={t('comum.excluir')}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color="#E53935" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <ValidacaoRelato
                  ocorrenciaId={item.id}
                  confirmacoes={item.confirmacoes}
                  refutacoes={item.refutacoes}
                  meuVoto={votos[item.id] ?? null}
                  souAutora={souAutora}
                  onMudou={(placar) => aoValidar(item.id, placar)}
                  onMensagem={showToast}
                />
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <MaterialCommunityIcons name="shield-check-outline" size={50} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>{t('ocorrencias.vazioTitulo')}</Text>
            <Text style={styles.emptyText}>
              {aba === 'minhas'
                ? t('ocorrencias.vazioMinhasTexto')
                : !coords
                  ? t('ocorrencias.semGps')
                  : t('ocorrencias.vazioTexto')}
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={fecharModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle} accessibilityRole="header">
                    {editandoId != null ? t('ocorrencias.editar') : t('ocorrencias.registrar')}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {editandoId != null
                      ? t('ocorrencias.atualizeAbaixo')
                      : t('ocorrencias.informeOqueAconteceu')}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={fecharModal}
                  accessibilityRole="button"
                  accessibilityLabel={t('a11y.fecharModal')}
                >
                  <MaterialIcons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>{t('mapa.gravidade')}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                {(['error', 'warning'] as OcorrenciaTipo[]).map((valor) => {
                  const ativo = tipo === valor;
                  const rotulo =
                    valor === 'error' ? t('ocorrencias.tipoEmergencia') : t('ocorrencias.tipoAtencao');
                  const cor = valor === 'error' ? '#E53935' : '#FB8C00';
                  return (
                    <TouchableOpacity
                      key={valor}
                      style={[styles.filterChip, ativo && styles.activeFilterChip]}
                      onPress={() => {
                        haptics.selecao();
                        setTipo(valor);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: ativo }}
                      accessibilityLabel={rotulo}
                    >
                      <MaterialIcons
                        name={valor === 'error' ? 'error' : 'warning'}
                        size={15}
                        color={ativo ? '#FFF' : cor}
                      />
                      <Text style={[styles.filterChipText, ativo && styles.activeFilterChipText]}>
                        {'  ' + rotulo}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>{t('ocorrencias.categoria')}</Text>
              <View style={{ marginBottom: 16 }}>
                {CATEGORIAS.map((chave) => {
                  const rotulo = t(`mapa.${chave}` as 'mapa.catAssedio');
                  const marcada = categoriaSelecionada === rotulo;
                  const ehOutro = chave === 'catOutro';

                  return (
                    <TouchableOpacity
                      key={chave}
                      style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, minHeight: 44 }}
                      activeOpacity={0.7}
                      onPress={() => {
                        haptics.selecao();
                        setCategoriaSelecionada(rotulo);
                        // Nas três categorias fixas o título já é a própria
                        // categoria; em "Outro" a pessoa escreve o dela.
                        setTitulo(ehOutro ? '' : rotulo);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: marcada, selected: marcada }}
                      accessibilityLabel={rotulo}
                    >
                      <MaterialCommunityIcons
                        name={marcada ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={24}
                        color={marcada ? colors.primary : colors.secondary}
                      />
                      <Text style={{ marginLeft: 10, fontSize: 16, color: colors.text }}>{rotulo}</Text>
                    </TouchableOpacity>
                  );
                })}

                {categoriaSelecionada === t('mapa.catOutro') && (
                  <TextInput
                    style={[styles.input, { marginTop: 4 }]}
                    value={titulo}
                    onChangeText={setTitulo}
                    placeholder={t('ocorrencias.qualOcorrencia')}
                    placeholderTextColor={colors.secondary}
                    maxLength={40}
                    accessibilityLabel={t('ocorrencias.qualOcorrencia')}
                  />
                )}
              </View>

              <Text style={styles.inputLabel}>{t('ocorrencias.descricao')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={descricao}
                onChangeText={setDescricao}
                placeholder={t('ocorrencias.descrevaOqueAconteceu')}
                placeholderTextColor={colors.secondary}
                multiline
                textAlignVertical="top"
                maxLength={160}
                accessibilityLabel={t('ocorrencias.descricao')}
              />

              <TouchableOpacity
                style={[styles.saveButton, (!podeSalvar || salvando) && styles.saveButtonDisabled]}
                activeOpacity={0.85}
                onPress={salvar}
                disabled={!podeSalvar || salvando}
                accessibilityRole="button"
                accessibilityLabel={
                  editandoId != null ? t('ocorrencias.salvarAlteracoes') : t('ocorrencias.salvar')
                }
                accessibilityState={{ disabled: !podeSalvar || salvando, busy: salvando }}
              >
                {salvando ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={24} color="#FFF" />
                    <Text style={styles.saveButtonText}>
                      {editandoId != null ? t('ocorrencias.salvarAlteracoes') : t('ocorrencias.salvar')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <ToastNotification
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastVisible(false)}
      />

      <SuccessPopup
        visible={editSuccessVisible}
        onContinue={() => setEditSuccessVisible(false)}
        title={t('ocorrencias.atualizada')}
        message={t('ocorrencias.atualizadaTexto')}
      />
    </SafeAreaView>
  );
}
