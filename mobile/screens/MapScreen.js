import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context/AppContext";
import { COLORS, SHADOWS } from "../theme";

const DEFAULT_REGION = {
  latitude: 52.2297,
  longitude: 21.0122,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

export default function MapScreen() {
  const {
    selectedTour,
    role,
    socketConnected,
    socketStatus,
    lastGuideLocation,
    isGuideLocationStale,
    lastGuideUpdateTime,
    myLocation,
    setMyLocation,
    trackingEnabled,
    startTracking,
    stopTracking,
    emitGuideLocation,
    showError,
  } = useApp();

  const [showLegend, setShowLegend] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const watchRef = useRef(null);
  const initialRegionRef = useRef(null);

  useEffect(() => {
    let sub = null;
    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") return;
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 5,
          timeInterval: 3000,
        },
        (loc) =>
          setMyLocation({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          }),
      );
      watchRef.current = sub;
    })();
    return () => {
      sub?.remove();
      watchRef.current = null;
    };
  }, [setMyLocation]);

  if (!selectedTour) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="map-outline" size={56} color={COLORS.textMuted} />
        <Text style={styles.emptyTitle}>No Tour Selected</Text>
        <Text style={styles.emptySubtitle}>
          Go to Home and select a tour first
        </Text>
      </View>
    );
  }

  const meetingPoints = selectedTour.meetingPoints ?? [];
  const currentMeetingPoint = selectedTour.currentMeetingPoint;
  const pois = selectedTour.pois ?? [];

  if (!initialRegionRef.current) {
    const src =
      lastGuideLocation || myLocation || currentMeetingPoint || pois[0];
    initialRegionRef.current = src
      ? {
          latitude: src.lat,
          longitude: src.lng,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }
      : DEFAULT_REGION;
  }

  const staleSeconds = lastGuideUpdateTime
    ? Math.round((Date.now() - lastGuideUpdateTime) / 1000)
    : null;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegionRef.current}
        showsUserLocation
        showsMyLocationButton
        onMapReady={() => setMapReady(true)}
      >
        {/* Meeting points */}
        {meetingPoints.map((mp) => (
          <Marker
            key={mp.id}
            coordinate={{ latitude: mp.lat, longitude: mp.lng }}
            title={`${mp.isCurrent ? "\u2605 " : ""}Meeting: ${mp.name}`}
            description={mp.meetupTime ? `Time: ${mp.meetupTime}` : undefined}
            pinColor={mp.isCurrent ? "#2563EB" : "#60A5FA"}
          />
        ))}

        {/* POIs */}
        {pois.map((poi) => (
          <Marker
            key={poi.id}
            coordinate={{ latitude: poi.lat, longitude: poi.lng }}
            title={poi.title}
            description={poi.description ?? undefined}
            pinColor="#7C3AED"
          />
        ))}

        {/* Guide location */}
        {lastGuideLocation && (
          <Marker
            coordinate={{
              latitude: lastGuideLocation.lat,
              longitude: lastGuideLocation.lng,
            }}
            title={
              lastGuideLocation.isFallback
                ? "Guide (last known)"
                : "Guide (live)"
            }
            description={`at ${new Date(lastGuideLocation.sentAt).toLocaleTimeString()}`}
          >
            <View
              style={[
                styles.guideDot,
                (isGuideLocationStale || lastGuideLocation.isFallback) &&
                  styles.guideDotStale,
              ]}
            >
              <Ionicons name="navigate" size={16} color="#fff" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Status bar overlay */}
      <View style={[styles.statusBar, SHADOWS.medium]}>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: socketConnected ? COLORS.success : COLORS.danger,
            },
          ]}
        />
        <Text style={styles.statusText} numberOfLines={1}>
          {socketStatus}
        </Text>
        {isGuideLocationStale && lastGuideLocation && (
          <View style={styles.staleBadge}>
            <Ionicons name="warning" size={12} color={COLORS.warningDark} />
            <Text style={styles.staleText}>{staleSeconds}s ago</Text>
          </View>
        )}
      </View>

      {/* Legend toggle */}
      <Pressable
        style={[styles.legendToggle, SHADOWS.small]}
        onPress={() => setShowLegend(!showLegend)}
      >
        <Ionicons
          name="information-circle-outline"
          size={22}
          color={COLORS.textSecondary}
        />
      </Pressable>

      {showLegend && (
        <View style={[styles.legendPanel, SHADOWS.medium]}>
          <Text style={styles.legendTitle}>Map Legend</Text>
          <LegendRow
            color="#4A90D9"
            label="Your location (blue dot)"
            icon="ellipse"
          />
          <LegendRow color="#16A34A" label="Guide (live)" icon="navigate" />
          <LegendRow
            color="#F59E0B"
            label="Guide (stale/last known)"
            icon="navigate"
          />
          <LegendRow color="#2563EB" label="Current meeting point" icon="pin" />
          <LegendRow color="#60A5FA" label="Meeting point" icon="pin" />
          <LegendRow color="#7C3AED" label="Point of interest" icon="pin" />
        </View>
      )}

      {/* Bottom info panel */}
      <View style={[styles.bottomPanel, SHADOWS.large]}>
        {currentMeetingPoint && (
          <View style={styles.infoRow}>
            <Ionicons name="flag" size={16} color={COLORS.primary} />
            <Text style={styles.infoText}>
              {currentMeetingPoint.name}
              {currentMeetingPoint.meetupTime
                ? ` \u2022 ${currentMeetingPoint.meetupTime}`
                : ""}
            </Text>
          </View>
        )}

        {lastGuideLocation && (
          <View style={styles.infoRow}>
            <Ionicons
              name="navigate"
              size={16}
              color={isGuideLocationStale ? COLORS.warning : COLORS.success}
            />
            <Text style={styles.infoText}>
              Guide: {lastGuideLocation.lat.toFixed(5)},{" "}
              {lastGuideLocation.lng.toFixed(5)}
              {lastGuideLocation.isFallback ? " (fallback)" : ""}
            </Text>
          </View>
        )}

        {role === "guide" && (
          <View style={styles.trackingRow}>
            <Pressable
              style={[
                styles.trackBtn,
                trackingEnabled ? styles.trackBtnStop : styles.trackBtnStart,
              ]}
              onPress={trackingEnabled ? stopTracking : startTracking}
            >
              <Ionicons
                name={trackingEnabled ? "pause-circle" : "play-circle"}
                size={18}
                color="#fff"
              />
              <Text style={styles.trackBtnText}>
                {trackingEnabled ? "Stop Tracking" : "Start Tracking"}
              </Text>
            </Pressable>
            <Pressable style={styles.sendOnceBtn} onPress={emitGuideLocation}>
              <Ionicons
                name="locate-outline"
                size={18}
                color={COLORS.primary}
              />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function LegendRow({ color, label, icon }) {
  return (
    <View style={styles.legendRow}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    gap: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  emptySubtitle: { fontSize: 14, color: COLORS.textMuted },

  guideDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.success,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  guideDotStale: {
    backgroundColor: COLORS.warning,
  },

  statusBar: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  staleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.warningLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  staleText: { fontSize: 11, fontWeight: "700", color: COLORS.warningDark },

  legendToggle: {
    position: "absolute",
    top: 56,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  legendPanel: {
    position: "absolute",
    top: 56,
    right: 56,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    minWidth: 200,
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendLabel: { fontSize: 12, color: COLORS.textSecondary },

  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    gap: 8,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },

  trackingRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  trackBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
  },
  trackBtnStart: { backgroundColor: COLORS.success },
  trackBtnStop: { backgroundColor: COLORS.danger },
  trackBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  sendOnceBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
});
