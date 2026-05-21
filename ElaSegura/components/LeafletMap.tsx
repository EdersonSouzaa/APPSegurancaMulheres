import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { Coords } from '../hooks/use-location';

export type RiskZone = {
  id: string | number;
  lat: number;
  lng: number;
  radius: number;
  level: 'low' | 'medium' | 'high';
  label?: string;
};

export type IncidentMarker = {
  id: string | number;
  lat: number;
  lng: number;
  type: 'error' | 'warning';
  title?: string;
};

type Props = {
  userCoords: Coords | null;
  riskZones: RiskZone[];
  incidents: IncidentMarker[];
  showRiskZones: boolean;
  showIncidents: boolean;
  isDarkMode?: boolean;
  interactive?: boolean;
};

const RISK_COLORS = {
  low: '#FFC107',
  medium: '#FF9800',
  high: '#E53935',
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
  .user-pulse {
    width: 18px; height: 18px; border-radius: 50%;
    background: #4285F4; border: 3px solid #fff;
    box-shadow: 0 0 0 rgba(66,133,244,0.6); animation: pulse 1.8s infinite;
  }
  @keyframes pulse {
    0%   { box-shadow: 0 0 0 0 rgba(66,133,244,0.7); }
    70%  { box-shadow: 0 0 0 18px rgba(66,133,244,0); }
    100% { box-shadow: 0 0 0 0 rgba(66,133,244,0); }
  }
  .incident-pin {
    width: 24px; height: 24px; border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2px solid #fff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
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

  let userMarker = null;
  let userCircle = null;
  let riskLayer = L.layerGroup().addTo(map);
  let incidentsLayer = L.layerGroup().addTo(map);
  let firstFix = true;

  const userIcon = L.divIcon({ className: '', html: '<div class="user-pulse"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

  function send(msg) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }

  function setUser(lat, lng, accuracy) {
    if (!userMarker) {
      userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map);
    } else {
      userMarker.setLatLng([lat, lng]);
    }
    if (userCircle) userCircle.remove();
    if (accuracy && accuracy > 0) {
      userCircle = L.circle([lat, lng], { radius: accuracy, color: '#4285F4', weight: 1, fillOpacity: 0.08 }).addTo(map);
    }
    if (firstFix) { map.setView([lat, lng], 16); firstFix = false; }
  }

  function setRiskZones(zones, visible) {
    riskLayer.clearLayers();
    if (!visible) return;
    zones.forEach(z => {
      L.circle([z.lat, z.lng], {
        radius: z.radius, color: z.color, weight: 1, fillColor: z.color, fillOpacity: 0.25
      }).bindPopup('<b>' + (z.label || 'Área de risco') + '</b>').addTo(riskLayer);
    });
  }

  function setIncidents(items, visible) {
    incidentsLayer.clearLayers();
    if (!visible) return;
    items.forEach(it => {
      const color = it.type === 'error' ? '#E53935' : '#FB8C00';
      const icon = L.divIcon({
        className: '',
        html: '<div class="incident-pin" style="background:' + color + ';"></div>',
        iconSize: [24, 24], iconAnchor: [12, 24]
      });
      L.marker([it.lat, it.lng], { icon }).bindPopup('<b>' + (it.title || 'Ocorrência') + '</b>').addTo(incidentsLayer);
    });
  }

  function recenter() {
    if (userMarker) map.setView(userMarker.getLatLng(), 16);
  }

  window.__map = { setUser, setRiskZones, setIncidents, recenter };
  send({ type: 'ready' });
</script>
</body>
</html>`;

export const LeafletMap = React.forwardRef<{ recenter: () => void }, Props>(function LeafletMap(
  { userCoords, riskZones, incidents, showRiskZones, showIncidents, isDarkMode = false, interactive = true },
  ref
) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const html = useMemo(() => buildHtml(isDarkMode, interactive), [isDarkMode, interactive]);

  const inject = (code: string) => {
    if (!readyRef.current) return;
    webRef.current?.injectJavaScript(code + '; true;');
  };

  useEffect(() => {
    if (!userCoords) return;
    inject(`window.__map.setUser(${userCoords.latitude}, ${userCoords.longitude}, ${0})`);
  }, [userCoords]);

  useEffect(() => {
    const payload = riskZones.map((z) => ({
      lat: z.lat, lng: z.lng, radius: z.radius, label: z.label ?? null, color: RISK_COLORS[z.level],
    }));
    inject(`window.__map.setRiskZones(${JSON.stringify(payload)}, ${showRiskZones})`);
  }, [riskZones, showRiskZones]);

  useEffect(() => {
    const payload = incidents.map((i) => ({ lat: i.lat, lng: i.lng, type: i.type, title: i.title ?? null }));
    inject(`window.__map.setIncidents(${JSON.stringify(payload)}, ${showIncidents})`);
  }, [incidents, showIncidents]);

  React.useImperativeHandle(ref, () => ({
    recenter: () => inject('window.__map.recenter()'),
  }));

  return (
    <View style={styles.container} pointerEvents={interactive ? 'auto' : 'none'}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.web}
        scrollEnabled={interactive}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'ready') {
              readyRef.current = true;
              if (userCoords) {
                inject(`window.__map.setUser(${userCoords.latitude}, ${userCoords.longitude}, 0)`);
              }
              const zonesPayload = riskZones.map((z) => ({
                lat: z.lat, lng: z.lng, radius: z.radius, label: z.label ?? null, color: RISK_COLORS[z.level],
              }));
              inject(`window.__map.setRiskZones(${JSON.stringify(zonesPayload)}, ${showRiskZones})`);
              const incPayload = incidents.map((i) => ({ lat: i.lat, lng: i.lng, type: i.type, title: i.title ?? null }));
              inject(`window.__map.setIncidents(${JSON.stringify(incPayload)}, ${showIncidents})`);
            }
          } catch {}
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: 'transparent' },
});
