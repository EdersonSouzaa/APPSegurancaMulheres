import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { Coords } from '../hooks/use-location';

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
};

export type LatLngBounds = [[number, number], [number, number]];

/** User-placed area highlighted on the map (feat #71). */
export type MarkedZone = {
  id: string;
  lat: number;
  lng: number;
  level: ZoneLevel;
  radius: number;
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
  onMapPress?: (lat: number, lng: number) => void;
  onMarkPress?: (id: string) => void;
  maxBounds?: LatLngBounds;
  initialCenter?: [number, number];
  initialZoom?: number;
  isDarkMode?: boolean;
  interactive?: boolean;
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
  .risk-glow-pane path {
    filter: blur(7px);
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
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

  let userPulseMarker = null;
  let userDotMarker = null;
  let userCircle = null;
  let riskLayer = L.layerGroup().addTo(map);
  let incidentsLayer = L.layerGroup().addTo(map);
  let markedLayer = L.layerGroup().addTo(map);
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

  function setBounds(b) {
    if (b) {
      map.setMaxBounds(b);
      map.setMinZoom(13);
    }
  }

  function setView(lat, lng, z) {
    map.setView([lat, lng], z);
  }

  function setUser(lat, lng, accuracy) {
    const latlng = [lat, lng];
    if (!userPulseMarker) {
      userPulseMarker = L.marker(latlng, { icon: pulseIcon, interactive: false }).addTo(map);
      userDotMarker = L.marker(latlng, { icon: dotIcon, interactive: false }).addTo(map);
      userDotMarker.bindTooltip('Você está aqui', {
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
      }).bindPopup('<b>' + (z.label || 'Area') + '</b>').addTo(riskLayer);
    });
  }

  function setIncidents(items, visible) {
    incidentsLayer.clearLayers();
    if (!visible) return;
    items.forEach(it => {
      const isWarning = it.type === 'warning';
      const icon = isWarning
        ? L.divIcon({ className: '', html: '<div class="incident-triangle"></div>', iconSize: [26, 22], iconAnchor: [13, 20] })
        : L.divIcon({ className: '', html: '<div class="incident-pin" style="background:#E53935;"></div>', iconSize: [26, 26], iconAnchor: [13, 26] });
      L.marker([it.lat, it.lng], { icon }).bindPopup('<b>' + (it.title || 'Ocorrencia') + '</b>').addTo(incidentsLayer);
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
        fillOpacity: 0.35,
        dashArray: '6 4',
      }).addTo(markedLayer);
      circle.on('click', function (ev) {
        L.DomEvent.stopPropagation(ev);
        send({ type: 'markClick', id: z.id });
      });
    });
  }

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

  window.__map = { setBounds, setView, setUser, setRiskZones, setIncidents, setMarkedZones, setDrawMode, recenter };
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
    onMapPress,
    onMarkPress,
    maxBounds,
    initialCenter,
    initialZoom,
    isDarkMode = false,
    interactive = true,
  },
  ref
) {
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
    })),
    [markedZones]
  );

  useEffect(() => {
    if (!userCoords) return;
    inject(`window.__map.setUser(${userCoords.latitude}, ${userCoords.longitude}, 0)`);
  }, [userCoords]);

  useEffect(() => {
    inject(`window.__map.setRiskZones(${JSON.stringify(zonesPayload)}, ${JSON.stringify(activeZoneFilter)})`);
  }, [zonesPayload, activeZoneFilter]);

  useEffect(() => {
    const payload = incidents.map((i) => ({ lat: i.lat, lng: i.lng, type: i.type, title: i.title ?? null }));
    inject(`window.__map.setIncidents(${JSON.stringify(payload)}, ${showIncidents})`);
  }, [incidents, showIncidents]);

  useEffect(() => {
    inject(`window.__map.setMarkedZones(${JSON.stringify(markedPayload)})`);
  }, [markedPayload]);

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
          inject(`window.__map.setUser(${userCoords.latitude}, ${userCoords.longitude}, 0)`);
        }
        inject(`window.__map.setRiskZones(${JSON.stringify(zonesPayload)}, ${JSON.stringify(activeZoneFilter)})`);
        const incPayload = incidents.map((i) => ({ lat: i.lat, lng: i.lng, type: i.type, title: i.title ?? null }));
        inject(`window.__map.setIncidents(${JSON.stringify(incPayload)}, ${showIncidents})`);
        inject(`window.__map.setMarkedZones(${JSON.stringify(markedPayload)})`);
        inject(`window.__map.setDrawMode(${drawColor != null})`);
      } else if (msg.type === 'mapClick') {
        onMapPress?.(msg.lat, msg.lng);
      } else if (msg.type === 'markClick') {
        onMarkPress?.(msg.id);
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
    <View style={styles.container} pointerEvents={interactive ? 'auto' : 'none'}>
      {NA_WEB ? (
        <iframe
          ref={iframeRef}
          srcDoc={html}
          title="Mapa"
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
