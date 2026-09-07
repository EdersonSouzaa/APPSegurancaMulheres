import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { Coords } from '../hooks/use-location';
import { COR_CATEGORIA, type CategoriaPontoSeguro } from '../constants/pontosSeguros';

export type ZoneLevel = 'safe' | 'alert' | 'danger';

export type RiskZone = {
  id: string | number;
  lat: number;
  lng: number;
  radius: number;
  level: ZoneLevel;
  label?: string;
};

export type IncidentMarker = {
  id: string | number;
  lat: number;
  lng: number;
  type: 'error' | 'warning';
  title?: string;
  /** Contestado pela comunidade — o pino aparece esmaecido e marcado. */
  disputed?: boolean;
  confirmations?: number;
};

export type LatLngBounds = [[number, number], [number, number]];

/** Área marcada por alguém da comunidade e compartilhada no Firestore. */
export type MarkedZone = {
  id: string;
  lat: number;
  lng: number;
  level: ZoneLevel;
  radius: number;
  /** Quem marcou — mostrado no popup. */
  author?: string;
  /** true quando é da usuária logada: só nesse caso oferecemos remover. */
  mine?: boolean;
};

/** Ponto do mapa de calor: posição + peso já calculado pela tela. */
export type HeatPoint = { lat: number; lng: number; weight: number };

export type SafePlaceMarker = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  category: CategoriaPontoSeguro;
  phone?: string | null;
  address?: string | null;
  open24h?: boolean;
  verified: boolean;
};

/**
 * Textos que aparecem dentro do mapa.
 *
 * O HTML do Leaflet é montado em string, longe do provider de i18n, então a
 * tela passa tudo já traduzido. É por isso que o mapa também troca de idioma
 * junto com o resto do app em vez de ficar preso ao português.
 */
export type MapLabels = {
  youAreHere: string;
  markedArea: string;
  markedBy: string;
  disputed: string;
  reports: string;
  unverified: string;
  call: string;
  route: string;
  open24h: string;
  categories: Record<CategoriaPontoSeguro, string>;
};

const LABELS_PADRAO: MapLabels = {
  youAreHere: 'Você está aqui',
  markedArea: 'Área marcada',
  markedBy: 'Marcada por {nome}',
  disputed: 'Contestado pela comunidade',
  reports: '{n} confirmaram',
  unverified: 'Endereço aproximado — confirme antes de se deslocar',
  call: 'Ligar',
  route: 'Como chegar',
  open24h: 'Aberto 24 horas',
  categories: {
    delegacia: 'Delegacia da Mulher',
    policia: 'Polícia',
    saude: 'Saúde 24h',
    acolhimento: 'Acolhimento',
  },
};

type Props = {
  userCoords: Coords | null;
  riskZones: RiskZone[];
  incidents: IncidentMarker[];
  showIncidents: boolean;
  activeZoneFilter?: ZoneLevel | null;
  markedZones?: MarkedZone[];
  /** Non-null = "marking mode": the next map tap drops a zone of this color. */
  drawColor?: ZoneLevel | null;
  heatPoints?: HeatPoint[];
  showHeat?: boolean;
  safePlaces?: SafePlaceMarker[];
  showSafePlaces?: boolean;
  onMapPress?: (lat: number, lng: number) => void;
  onMarkPress?: (id: string) => void;
  onSafePlacePress?: (id: string, acao: 'ligar' | 'rota') => void;
  maxBounds?: LatLngBounds;
  initialCenter?: [number, number];
  initialZoom?: number;
  isDarkMode?: boolean;
  interactive?: boolean;
  labels?: Partial<MapLabels>;
  /** Descrição lida por leitores de tela — o mapa em si é inacessível. */
  accessibilityLabel?: string;
};

/**
 * react-native-webview não existe na web — lá o mapa roda dentro de um iframe.
 * Fora do componente porque Platform.OS é fixo durante toda a execução.
 */
const NA_WEB = Platform.OS === 'web';

const ZONE_COLORS: Record<ZoneLevel, string> = {
  safe: '#34C759',
  alert: '#FFCC00',
  danger: '#FF3B30',
};

const buildHtml = (isDarkMode: boolean, interactive: boolean) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: ${isDarkMode ? '#1A1A1A' : '#E8EAED'}; }
  ${interactive ? '' : 'body { pointer-events: none; } .leaflet-control-container { display: none !important; }'}
  .leaflet-control-attribution { display: none !important; }

  @keyframes userPulse {
    0%   { transform: scale(1);   opacity: 0.8; }
    70%  { transform: scale(2.4); opacity: 0;   }
    100% { transform: scale(2.4); opacity: 0;   }
  }
  .user-pulse {
    width: 22px; height: 22px; border-radius: 50%;
    background: rgba(0,122,255,0.35);
    animation: userPulse 1.8s ease-out infinite;
  }
  .user-dot {
    width: 14px; height: 14px; border-radius: 50%;
    background: #007AFF; border: 3px solid #fff;
    box-shadow: 0 2px 6px rgba(0,122,255,0.6);
  }
  .incident-pin {
    width: 26px; height: 26px; border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2px solid #fff;
    box-shadow: 0 3px 6px rgba(0,0,0,0.35);
    position: relative;
  }
  .incident-pin::after {
    content: '';
    position: absolute;
    top: 50%; left: 50%;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #fff;
    transform: translate(-50%, -50%) rotate(45deg);
  }
  .incident-triangle {
    width: 0; height: 0;
    border-left: 13px solid transparent;
    border-right: 13px solid transparent;
    border-bottom: 22px solid #FB8C00;
    filter: drop-shadow(0 2px 3px rgba(0,0,0,0.35));
    position: relative;
  }
  .incident-triangle::after {
    content: '!';
    position: absolute;
    top: 9px; left: -3.5px;
    width: 7px;
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    font-family: sans-serif;
    text-align: center;
  }
  /* Relato contestado pela comunidade: continua no mapa, mas apagado. */
  .incident-disputed { opacity: 0.42; filter: grayscale(0.6); }

  .safe-pin {
    width: 30px; height: 30px;
    border-radius: 50%;
    border: 3px solid #fff;
    box-shadow: 0 3px 7px rgba(0,0,0,0.35);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-family: sans-serif; font-weight: 800; font-size: 14px;
  }
  /* Endereço ainda não conferido: contorno tracejado sinaliza a incerteza. */
  .safe-pin-unverified { border-style: dashed; border-color: #FFF3CD; }

  .you-are-here {
    background: #fff;
    color: #1A1A1A;
    font-weight: 700;
    font-size: 12px;
    font-family: sans-serif;
    padding: 5px 10px;
    border-radius: 14px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    border: none !important;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .you-are-here::before {
    content: '';
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #007AFF;
    display: inline-block;
    margin-right: 4px;
  }
  .leaflet-tooltip.you-are-here-tip::before { display: none; }
  .risk-glow-pane path { filter: blur(7px); }
  /* Fallback do mapa de calor quando o plugin não carrega. */
  .heat-fallback-pane path { filter: blur(16px); }

  .popup-title { font-family: sans-serif; font-weight: 700; font-size: 13px; }
  .popup-sub { font-family: sans-serif; font-size: 11px; color: #666; display: block; margin-top: 3px; }
  .popup-warn { font-family: sans-serif; font-size: 11px; color: #B26A00; display: block; margin-top: 5px; }
  .popup-actions { margin-top: 8px; display: flex; gap: 6px; }
  .popup-btn {
    font-family: sans-serif; font-size: 11px; font-weight: 700;
    border: none; border-radius: 8px; padding: 6px 10px;
    background: #F35F74; color: #fff; cursor: pointer;
  }
  .popup-btn.ghost { background: #ECEFF1; color: #37474F; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
<script>
  const __interactive = ${interactive};
  const map = L.map('map', {
    zoomControl: __interactive,
    attributionControl: false,
    dragging: __interactive,
    touchZoom: __interactive,
    doubleClickZoom: __interactive,
    scrollWheelZoom: __interactive,
    boxZoom: __interactive,
    keyboard: __interactive,
    tap: __interactive,
  }).setView([-3.7319, -38.5267], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  // Pane com blur aplicado só nas zonas de risco — dá o efeito "heatmap" suave (glow) em vez de círculos duros.
  const glowPane = map.createPane('riskGlowPane');
  glowPane.classList.add('risk-glow-pane');
  glowPane.style.zIndex = 410;
  const riskRenderer = L.svg({ pane: 'riskGlowPane' });

  // Pane separado para o fallback do mapa de calor: blur mais forte, para as
  // manchas se fundirem em vez de virarem bolhas empilhadas.
  const heatPane = map.createPane('heatFallbackPane');
  heatPane.classList.add('heat-fallback-pane');
  heatPane.style.zIndex = 405;
  const heatFallbackRenderer = L.svg({ pane: 'heatFallbackPane' });

  let userPulseMarker = null;
  let userDotMarker = null;
  let userCircle = null;
  let riskLayer = L.layerGroup().addTo(map);
  let incidentsLayer = L.layerGroup().addTo(map);
  let markedLayer = L.layerGroup().addTo(map);
  let safeLayer = L.layerGroup().addTo(map);
  let heatLayer = null;
  let heatFallbackLayer = L.layerGroup().addTo(map);
  let drawMode = false;
  let firstFix = true;

  const pulseIcon = L.divIcon({ className: '', html: '<div class="user-pulse"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
  const dotIcon = L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });

  // Duas pontes: no celular o host e o WebView; na web e o iframe falando
  // com a pagina que o contem.
  function send(msg) {
    var data = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(data);
    else if (window.parent && window.parent !== window) window.parent.postMessage(data, '*');
  }

  // O host manda texto que veio de outras usuarias (titulo de relato, nome de
  // quem marcou). Escapar antes de concatenar em HTML e obrigatorio: sem isso,
  // um relato com <script> viraria execucao dentro do WebView.
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function setBounds(b) {
    if (b) {
      map.setMaxBounds(b);
      map.setMinZoom(13);
    }
  }

  function setView(lat, lng, z) {
    map.setView([lat, lng], z);
  }

  function setUser(lat, lng, accuracy, rotulo) {
    const latlng = [lat, lng];
    if (!userPulseMarker) {
      userPulseMarker = L.marker(latlng, { icon: pulseIcon, interactive: false }).addTo(map);
      userDotMarker = L.marker(latlng, { icon: dotIcon, interactive: false }).addTo(map);
      userDotMarker.bindTooltip(esc(rotulo || 'Você está aqui'), {
        permanent: true,
        direction: 'top',
        offset: [0, -6],
        className: 'you-are-here you-are-here-tip',
      }).openTooltip();
    } else {
      userPulseMarker.setLatLng(latlng);
      userDotMarker.setLatLng(latlng);
    }
    if (userCircle) userCircle.remove();
    if (accuracy && accuracy > 0) {
      userCircle = L.circle(latlng, { radius: accuracy, color: '#007AFF', weight: 1, fillOpacity: 0.06 }).addTo(map);
    }
    if (firstFix) { map.setView(latlng, 16); firstFix = false; }
  }

  function setRiskZones(zones, activeFilter) {
    riskLayer.clearLayers();
    zones.forEach(z => {
      const dim = activeFilter && activeFilter !== z.level;
      const opacity = dim ? 0.08 : 0.4;
      // Halo externo (bem suave, blur forte) + núcleo (blur leve) — dá o efeito de mancha de calor da referência.
      L.circle([z.lat, z.lng], {
        radius: z.radius * 1.5,
        renderer: riskRenderer,
        stroke: false,
        fillColor: z.color,
        fillOpacity: opacity * 0.5,
      }).addTo(riskLayer);
      L.circle([z.lat, z.lng], {
        radius: z.radius,
        renderer: riskRenderer,
        stroke: false,
        fillColor: z.color,
        fillOpacity: opacity,
      }).addTo(riskLayer);
      // Aro nítido por cima (sem blur), fino, só pra dar referência do centro/label ao tocar.
      L.circle([z.lat, z.lng], {
        radius: z.radius * 0.15,
        color: z.color,
        weight: 1,
        opacity: dim ? 0.25 : 0.7,
        fillColor: z.color,
        fillOpacity: 0,
      }).bindPopup('<b class="popup-title">' + esc(z.label || 'Area') + '</b>').addTo(riskLayer);
    });
  }

  function setIncidents(items, visible) {
    incidentsLayer.clearLayers();
    if (!visible) return;
    items.forEach(it => {
      const isWarning = it.type === 'warning';
      const extra = it.disputed ? ' incident-disputed' : '';
      const icon = isWarning
        ? L.divIcon({ className: '', html: '<div class="incident-triangle' + extra + '"></div>', iconSize: [26, 22], iconAnchor: [13, 20] })
        : L.divIcon({ className: '', html: '<div class="incident-pin' + extra + '" style="background:#E53935;"></div>', iconSize: [26, 26], iconAnchor: [13, 26] });

      let html = '<b class="popup-title">' + esc(it.title || 'Ocorrencia') + '</b>';
      if (it.confirmations) html += '<span class="popup-sub">' + esc(it.confirmations) + '</span>';
      if (it.disputedLabel) html += '<span class="popup-warn">' + esc(it.disputedLabel) + '</span>';

      L.marker([it.lat, it.lng], { icon }).bindPopup(html).addTo(incidentsLayer);
    });
  }

  /**
   * Mapa de calor por densidade de relatos.
   *
   * Caminho preferido: leaflet.heat, que faz a interpolação de verdade num
   * canvas. Se o plugin nao carregar (CDN bloqueada, aparelho offline), o
   * fallback desenha circulos borrados no proprio SVG — menos bonito, mas
   * transmite a mesma informacao de "aqui concentra mais", e o mapa nunca
   * fica sem a camada.
   */
  function setHeat(points, visible) {
    if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
    heatFallbackLayer.clearLayers();
    if (!visible || !points.length) return;

    if (typeof L.heatLayer === 'function') {
      heatLayer = L.heatLayer(points.map(p => [p.lat, p.lng, p.weight]), {
        radius: 34,
        blur: 26,
        maxZoom: 17,
        minOpacity: 0.28,
        gradient: { 0.2: '#2E7D32', 0.45: '#FFCC00', 0.7: '#FB8C00', 1.0: '#D32F2F' },
      }).addTo(map);
      return;
    }

    points.forEach(p => {
      const intensidade = Math.max(0.15, Math.min(1, p.weight));
      const cor = intensidade > 0.66 ? '#D32F2F' : intensidade > 0.33 ? '#FB8C00' : '#FFCC00';
      L.circle([p.lat, p.lng], {
        radius: 240 + intensidade * 260,
        renderer: heatFallbackRenderer,
        stroke: false,
        fillColor: cor,
        fillOpacity: 0.16 + intensidade * 0.3,
      }).addTo(heatFallbackLayer);
    });
  }

  function setMarkedZones(items) {
    markedLayer.clearLayers();
    items.forEach(z => {
      const circle = L.circle([z.lat, z.lng], {
        radius: z.radius,
        color: z.color,
        weight: 2,
        opacity: 1,
        fillColor: z.color,
        fillOpacity: z.mine ? 0.35 : 0.22,
        dashArray: z.mine ? '6 4' : null,
      }).addTo(markedLayer);

      let html = '<b class="popup-title">' + esc(z.label || 'Area marcada') + '</b>';
      if (z.authorLabel) html += '<span class="popup-sub">' + esc(z.authorLabel) + '</span>';
      circle.bindPopup(html);

      circle.on('click', function (ev) {
        L.DomEvent.stopPropagation(ev);
        send({ type: 'markClick', id: z.id, mine: !!z.mine });
      });
    });
  }

  function setSafePlaces(items, visible) {
    safeLayer.clearLayers();
    if (!visible) return;
    items.forEach(p => {
      const classe = 'safe-pin' + (p.verified ? '' : ' safe-pin-unverified');
      const icon = L.divIcon({
        className: '',
        html: '<div class="' + classe + '" style="background:' + esc(p.color) + '">' + esc(p.initial) + '</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      let html = '<b class="popup-title">' + esc(p.name) + '</b>';
      html += '<span class="popup-sub">' + esc(p.categoryLabel) + (p.open24h ? ' · ' + esc(p.open24hLabel) : '') + '</span>';
      if (p.address) html += '<span class="popup-sub">' + esc(p.address) + '</span>';
      if (!p.verified) html += '<span class="popup-warn">' + esc(p.unverifiedLabel) + '</span>';

      // Os botoes carregam a acao em data-*, e quem escuta e o delegador
      // abaixo. Nada de onclick inline: o texto vem de dados e montar codigo
      // JS por concatenacao dentro de um atributo e exatamente o caminho que
      // transforma um nome de lugar em execucao arbitraria.
      html += '<div class="popup-actions">';
      if (p.phone) {
        html += '<button class="popup-btn" data-ponto="' + esc(p.id) + '" data-acao="ligar">' + esc(p.callLabel) + '</button>';
      }
      html += '<button class="popup-btn ghost" data-ponto="' + esc(p.id) + '" data-acao="rota">' + esc(p.routeLabel) + '</button>';
      html += '</div>';

      L.marker([p.lat, p.lng], { icon }).bindPopup(html).addTo(safeLayer);
    });
  }

  // Delegacao unica para os botoes de qualquer popup de ponto de apoio.
  map.getContainer().addEventListener('click', function (ev) {
    var alvo = ev.target && ev.target.closest ? ev.target.closest('[data-ponto]') : null;
    if (!alvo) return;
    ev.preventDefault();
    ev.stopPropagation();
    send({ type: 'safePlaceAction', id: alvo.getAttribute('data-ponto'), acao: alvo.getAttribute('data-acao') });
  });

  function setDrawMode(active) {
    drawMode = !!active;
    map.getContainer().style.cursor = drawMode ? 'crosshair' : '';
  }

  map.on('click', function (e) {
    if (drawMode) send({ type: 'mapClick', lat: e.latlng.lat, lng: e.latlng.lng });
  });

  function recenter() {
    if (userDotMarker) map.setView(userDotMarker.getLatLng(), 16);
  }

  window.__map = {
    setBounds, setView, setUser, setRiskZones, setIncidents,
    setMarkedZones, setSafePlaces, setHeat, setDrawMode, recenter,
  };
  send({ type: 'ready' });
</script>
</body>
</html>`;

export const LeafletMap = React.forwardRef<{ recenter: () => void }, Props>(function LeafletMap(
  {
    userCoords,
    riskZones,
    incidents,
    showIncidents,
    activeZoneFilter = null,
    markedZones = [],
    drawColor = null,
    heatPoints = [],
    showHeat = false,
    safePlaces = [],
    showSafePlaces = false,
    onMapPress,
    onMarkPress,
    onSafePlacePress,
    maxBounds,
    initialCenter,
    initialZoom,
    isDarkMode = false,
    interactive = true,
    labels,
    accessibilityLabel,
  },
  ref
) {
  const rotulos = useMemo<MapLabels>(
    () => ({ ...LABELS_PADRAO, ...labels, categories: { ...LABELS_PADRAO.categories, ...labels?.categories } }),
    [labels]
  );
  const webRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const html = useMemo(() => buildHtml(isDarkMode, interactive), [isDarkMode, interactive]);

  const inject = (code: string) => {
    if (!readyRef.current) return;
    if (NA_WEB) {
      // O iframe usa srcDoc, então herda a origem da página e o
      // contentWindow é acessível diretamente.
      try {
        (iframeRef.current?.contentWindow as any)?.eval(code);
      } catch (e) {
        console.warn('[LeafletMap] não foi possível injetar no iframe:', e);
      }
      return;
    }
    webRef.current?.injectJavaScript(code + '; true;');
  };

  const zonesPayload = useMemo(
    () => riskZones.map((z) => ({
      lat: z.lat,
      lng: z.lng,
      radius: z.radius,
      label: z.label ?? null,
      level: z.level,
      color: ZONE_COLORS[z.level],
    })),
    [riskZones]
  );

  const markedPayload = useMemo(
    () => markedZones.map((z) => ({
      id: z.id,
      lat: z.lat,
      lng: z.lng,
      radius: z.radius,
      color: ZONE_COLORS[z.level],
      mine: z.mine ?? false,
      label: rotulos.markedArea,
      authorLabel: z.author ? rotulos.markedBy.replace('{nome}', z.author) : null,
    })),
    [markedZones, rotulos]
  );

  const incidentsPayload = useMemo(
    () => incidents.map((i) => ({
      lat: i.lat,
      lng: i.lng,
      type: i.type,
      title: i.title ?? null,
      disputed: i.disputed ?? false,
      confirmations: i.confirmations
        ? rotulos.reports.replace('{n}', String(i.confirmations))
        : null,
      disputedLabel: i.disputed ? rotulos.disputed : null,
    })),
    [incidents, rotulos]
  );

  const heatPayload = useMemo(
    () => heatPoints.map((p) => ({ lat: p.lat, lng: p.lng, weight: p.weight })),
    [heatPoints]
  );

  const safePayload = useMemo(
    () => safePlaces.map((p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      name: p.name,
      color: COR_CATEGORIA[p.category],
      initial: p.name.charAt(0).toUpperCase(),
      verified: p.verified,
      phone: p.phone ?? null,
      address: p.address ?? null,
      open24h: p.open24h ?? false,
      categoryLabel: rotulos.categories[p.category],
      open24hLabel: rotulos.open24h,
      unverifiedLabel: rotulos.unverified,
      callLabel: rotulos.call,
      routeLabel: rotulos.route,
    })),
    [safePlaces, rotulos]
  );

  useEffect(() => {
    if (!userCoords) return;
    inject(
      `window.__map.setUser(${userCoords.latitude}, ${userCoords.longitude}, 0, ${JSON.stringify(rotulos.youAreHere)})`
    );
  }, [userCoords, rotulos]);

  useEffect(() => {
    inject(`window.__map.setRiskZones(${JSON.stringify(zonesPayload)}, ${JSON.stringify(activeZoneFilter)})`);
  }, [zonesPayload, activeZoneFilter]);

  useEffect(() => {
    inject(`window.__map.setIncidents(${JSON.stringify(incidentsPayload)}, ${showIncidents})`);
  }, [incidentsPayload, showIncidents]);

  useEffect(() => {
    inject(`window.__map.setMarkedZones(${JSON.stringify(markedPayload)})`);
  }, [markedPayload]);

  useEffect(() => {
    inject(`window.__map.setHeat(${JSON.stringify(heatPayload)}, ${showHeat})`);
  }, [heatPayload, showHeat]);

  useEffect(() => {
    inject(`window.__map.setSafePlaces(${JSON.stringify(safePayload)}, ${showSafePlaces})`);
  }, [safePayload, showSafePlaces]);

  useEffect(() => {
    inject(`window.__map.setDrawMode(${drawColor != null})`);
  }, [drawColor]);

  React.useImperativeHandle(ref, () => ({
    recenter: () => inject('window.__map.recenter()'),
  }));

  // Guardado em ref para o listener da web sempre enxergar os props atuais
  // sem precisar reassinar o evento a cada render.
  const handleMessageRef = useRef<(raw: string) => void>(() => {});
  handleMessageRef.current = (raw: string) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'ready') {
        readyRef.current = true;
        if (maxBounds) {
          inject(`window.__map.setBounds(${JSON.stringify(maxBounds)})`);
        }
        if (initialCenter) {
          inject(`window.__map.setView(${initialCenter[0]}, ${initialCenter[1]}, ${initialZoom ?? 14})`);
        }
        if (userCoords) {
          inject(
            `window.__map.setUser(${userCoords.latitude}, ${userCoords.longitude}, 0, ${JSON.stringify(rotulos.youAreHere)})`
          );
        }
        inject(`window.__map.setRiskZones(${JSON.stringify(zonesPayload)}, ${JSON.stringify(activeZoneFilter)})`);
        inject(`window.__map.setIncidents(${JSON.stringify(incidentsPayload)}, ${showIncidents})`);
        inject(`window.__map.setMarkedZones(${JSON.stringify(markedPayload)})`);
        inject(`window.__map.setHeat(${JSON.stringify(heatPayload)}, ${showHeat})`);
        inject(`window.__map.setSafePlaces(${JSON.stringify(safePayload)}, ${showSafePlaces})`);
        inject(`window.__map.setDrawMode(${drawColor != null})`);
      } else if (msg.type === 'mapClick') {
        onMapPress?.(msg.lat, msg.lng);
      } else if (msg.type === 'markClick') {
        onMarkPress?.(msg.id);
      } else if (msg.type === 'safePlaceAction') {
        onSafePlacePress?.(msg.id, msg.acao);
      }
    } catch {}
  };

  // Na web o mapa fala com a página por postMessage, não pelo onMessage do WebView.
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const aoReceber = (evento: MessageEvent) => {
      if (iframeRef.current && evento.source !== iframeRef.current.contentWindow) return;
      if (typeof evento.data !== 'string') return;
      handleMessageRef.current(evento.data);
    };

    window.addEventListener('message', aoReceber);
    return () => window.removeEventListener('message', aoReceber);
  }, []);

  // Um iframe recriado perde o estado do Leaflet: readyRef precisa voltar a
  // false para o 'ready' seguinte reenviar zonas, incidentes e posição.
  useEffect(() => {
    readyRef.current = false;
  }, [html]);

  return (
    <View
      style={styles.container}
      pointerEvents={interactive ? 'auto' : 'none'}
      accessible={!!accessibilityLabel}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {NA_WEB ? (
        <iframe
          ref={iframeRef}
          srcDoc={html}
          title={accessibilityLabel ?? 'Mapa'}
          style={{
            border: 'none',
            width: '100%',
            height: '100%',
            display: 'block',
            backgroundColor: 'transparent',
          }}
        />
      ) : (
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          style={styles.web}
          scrollEnabled={interactive}
          javaScriptEnabled
          domStorageEnabled
          onMessage={(event) => handleMessageRef.current(event.nativeEvent.data)}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: 'transparent' },
});
