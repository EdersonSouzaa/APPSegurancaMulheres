import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
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

type Props = {
  userCoords: Coords | null;
  riskZones: RiskZone[];
  incidents: IncidentMarker[];
  showIncidents: boolean;
  activeZoneFilter?: ZoneLevel | null;
  maxBounds?: LatLngBounds;
  initialCenter?: [number, number];
  initialZoom?: number;
  isDarkMode?: boolean;
  interactive?: boolean;
};

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

  let userPulseMarker = null;
  let userDotMarker = null;
  let userCircle = null;
  let riskLayer = L.layerGroup().addTo(map);
  let incidentsLayer = L.layerGroup().addTo(map);
  let firstFix = true;

  const pulseIcon = L.divIcon({ className: '', html: '<div class="user-pulse"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
  const dotIcon = L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });

  function send(msg) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
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
      const opacity = dim ? 0.10 : 0.35;
      const strokeOpacity = dim ? 0.3 : 1.0;
      L.circle([z.lat, z.lng], {
        radius: z.radius,
        color: z.color,
        weight: 2,
        opacity: strokeOpacity,
        fillColor: z.color,
        fillOpacity: opacity,
      }).bindPopup('<b>' + (z.label || 'Area') + '</b>').addTo(riskLayer);
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
      L.marker([it.lat, it.lng], { icon }).bindPopup('<b>' + (it.title || 'Ocorrencia') + '</b>').addTo(incidentsLayer);
    });
  }

  function recenter() {
    if (userDotMarker) map.setView(userDotMarker.getLatLng(), 16);
  }

  window.__map = { setBounds, setView, setUser, setRiskZones, setIncidents, recenter };
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
    maxBounds,
    initialCenter,
    initialZoom,
    isDarkMode = false,
    interactive = true,
  },
  ref
) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const html = useMemo(() => buildHtml(isDarkMode, interactive), [isDarkMode, interactive]);

  const inject = (code: string) => {
    if (!readyRef.current) return;
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
