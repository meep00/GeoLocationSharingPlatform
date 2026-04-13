import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS, SHADOWS } from '../theme';

const DEFAULT_CENTER = { lat: 52.2297, lng: 21.0122 };

export default function MapScreen() {
  const {
    selectedTour, role,
    socketConnected, socketStatus,
    lastGuideLocation, isGuideLocationStale, lastGuideUpdateTime,
    myLocation, setMyLocation,
    trackingEnabled, startTracking, stopTracking, emitGuideLocation,
  } = useApp();

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 },
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [setMyLocation]);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      const L = window.L;
      const center = myLocation || DEFAULT_CENTER;
      const map = L.map(mapContainerRef.current).setView([center.lat, center.lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      mapInstanceRef.current = map;
    };
    document.head.appendChild(script);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;

    const L = window.L;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (myLocation) {
      const m = L.circleMarker([myLocation.lat, myLocation.lng], {
        radius: 8, fillColor: '#4A90D9', color: '#fff', weight: 2, fillOpacity: 1,
      }).addTo(map).bindPopup('You are here');
      markersRef.current.push(m);
    }

    const meetingPoints = selectedTour?.meetingPoints ?? [];
    meetingPoints.forEach((mp) => {
      const color = mp.isCurrent ? '#2563EB' : '#60A5FA';
      const m = L.circleMarker([mp.lat, mp.lng], {
        radius: 10, fillColor: color, color: '#fff', weight: 2, fillOpacity: 1,
      }).addTo(map).bindPopup(`${mp.isCurrent ? '\u2605 ' : ''}${mp.name}${mp.meetupTime ? ` (${mp.meetupTime})` : ''}`);
      markersRef.current.push(m);
    });

    const pois = selectedTour?.pois ?? [];
    pois.forEach((poi) => {
      const m = L.circleMarker([poi.lat, poi.lng], {
        radius: 8, fillColor: '#7C3AED', color: '#fff', weight: 2, fillOpacity: 1,
      }).addTo(map).bindPopup(`${poi.title}${poi.description ? ': ' + poi.description : ''}`);
      markersRef.current.push(m);
    });

    if (lastGuideLocation) {
      const color = isGuideLocationStale ? '#F59E0B' : '#16A34A';
      const m = L.circleMarker([lastGuideLocation.lat, lastGuideLocation.lng], {
        radius: 10, fillColor: color, color: '#fff', weight: 3, fillOpacity: 1,
      }).addTo(map).bindPopup(
        lastGuideLocation.isFallback ? 'Guide (last known)' : 'Guide (live)',
      );
      markersRef.current.push(m);
    }
  }, [selectedTour, myLocation, lastGuideLocation, isGuideLocationStale]);

  if (!selectedTour) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="map-outline" size={56} color={COLORS.textMuted} />
        <Text style={styles.emptyTitle}>No Tour Selected</Text>
        <Text style={styles.emptySubtitle}>Go to Home and select a tour first</Text>
      </View>
    );
  }

  const currentMeetingPoint = selectedTour.currentMeetingPoint;
  const staleSeconds = lastGuideUpdateTime
    ? Math.round((Date.now() - lastGuideUpdateTime) / 1000)
    : null;

  return (
    <View style={styles.container}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }} />

      <View style={[styles.statusBar, SHADOWS.medium]}>
        <View style={[styles.statusDot, { backgroundColor: socketConnected ? COLORS.success : COLORS.danger }]} />
        <Text style={styles.statusText} numberOfLines={1}>{socketStatus}</Text>
        {isGuideLocationStale && lastGuideLocation && (
          <View style={styles.staleBadge}>
            <Ionicons name="warning" size={12} color={COLORS.warningDark} />
            <Text style={styles.staleText}>{staleSeconds}s ago</Text>
          </View>
        )}
      </View>

      <Pressable style={[styles.legendToggle, SHADOWS.small]} onPress={() => setShowLegend(!showLegend)}>
        <Ionicons name="information-circle-outline" size={22} color={COLORS.textSecondary} />
      </Pressable>

      {showLegend && (
        <View style={[styles.legendPanel, SHADOWS.medium]}>
          <Text style={styles.legendTitle}>Map Legend</Text>
          <LegendRow color="#4A90D9" label="You are here" />
          <LegendRow color="#16A34A" label="Guide (live)" />
          <LegendRow color="#F59E0B" label="Guide (stale/last known)" />
          <LegendRow color="#2563EB" label="Meeting point (current)" />
          <LegendRow color="#60A5FA" label="Meeting point" />
          <LegendRow color="#7C3AED" label="Point of interest" />
        </View>
      )}

      <View style={[styles.bottomPanel, SHADOWS.large]}>
        {currentMeetingPoint && (
          <View style={styles.infoRow}>
            <Ionicons name="flag" size={16} color={COLORS.primary} />
            <Text style={styles.infoText}>
              {currentMeetingPoint.name}
              {currentMeetingPoint.meetupTime ? ` \u2022 ${currentMeetingPoint.meetupTime}` : ''}
            </Text>
          </View>
        )}
        {lastGuideLocation && (
          <View style={styles.infoRow}>
            <Ionicons name="navigate" size={16} color={isGuideLocationStale ? COLORS.warning : COLORS.success} />
            <Text style={styles.infoText}>
              Guide: {lastGuideLocation.lat.toFixed(5)}, {lastGuideLocation.lng.toFixed(5)}
              {lastGuideLocation.isFallback ? ' (fallback)' : ''}
            </Text>
          </View>
        )}
        {role === 'guide' && (
          <View style={styles.trackingRow}>
            <Pressable
              style={[styles.trackBtn, trackingEnabled ? styles.trackBtnStop : styles.trackBtnStart]}
              onPress={trackingEnabled ? stopTracking : startTracking}
            >
              <Ionicons name={trackingEnabled ? 'pause-circle' : 'play-circle'} size={18} color="#fff" />
              <Text style={styles.trackBtnText}>{trackingEnabled ? 'Stop Tracking' : 'Start Tracking'}</Text>
            </Pressable>
            <Pressable style={styles.sendOnceBtn} onPress={emitGuideLocation}>
              <Ionicons name="locate-outline" size={18} color={COLORS.primary} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function LegendRow({ color, label }) {
  return (
    <View style={styles.legendRow}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySubtitle: { fontSize: 14, color: COLORS.textMuted },
  statusBar: {
    position: 'absolute', top: 12, left: 12, right: 12, zIndex: 10,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  staleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.warningLight, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  staleText: { fontSize: 11, fontWeight: '700', color: COLORS.warningDark },
  legendToggle: {
    position: 'absolute', top: 56, right: 12, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
  },
  legendPanel: {
    position: 'absolute', top: 56, right: 56, zIndex: 10,
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 12, gap: 6, minWidth: 200,
  },
  legendTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendLabel: { fontSize: 12, color: COLORS.textSecondary },
  bottomPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 16, gap: 8,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  trackingRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  trackBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, paddingVertical: 10,
  },
  trackBtnStart: { backgroundColor: COLORS.success },
  trackBtnStop: { backgroundColor: COLORS.danger },
  trackBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sendOnceBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
});
