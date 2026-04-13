import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS, SHADOWS, STATUS_THEME } from '../theme';

export default function ManageScreen() {
  const {
    selectedTour, selectedTourId,
    changeTourState, createMeetingPoint, deleteMeetingPoint,
    createPoi, deletePoi, showError,
  } = useApp();

  const [busy, setBusy] = useState(false);
  const [mpName, setMpName] = useState('');
  const [mpLat, setMpLat] = useState('');
  const [mpLng, setMpLng] = useState('');
  const [mpTime, setMpTime] = useState('');
  const [mpCurrent, setMpCurrent] = useState(true);
  const [poiTitle, setPoiTitle] = useState('');
  const [poiDesc, setPoiDesc] = useState('');
  const [poiLat, setPoiLat] = useState('');
  const [poiLng, setPoiLng] = useState('');

  const wrap = async (fn) => {
    setBusy(true);
    try { await fn(); } catch (e) { showError(e.message); }
    finally { setBusy(false); }
  };

  const parseNum = (v, label) => {
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error(`${label} must be a valid number`);
    return n;
  };

  const handleAddMp = () => wrap(async () => {
    if (!mpName.trim()) { showError('Name is required'); return; }
    const payload = {
      name: mpName.trim(),
      lat: parseNum(mpLat, 'Latitude'),
      lng: parseNum(mpLng, 'Longitude'),
      isCurrent: mpCurrent,
    };
    if (mpTime.trim()) payload.meetupTime = mpTime.trim();
    await createMeetingPoint(payload);
    setMpName(''); setMpLat(''); setMpLng(''); setMpTime('');
  });

  const handleAddPoi = () => wrap(async () => {
    if (!poiTitle.trim()) { showError('Title is required'); return; }
    await createPoi({
      title: poiTitle.trim(),
      description: poiDesc.trim() || undefined,
      lat: parseNum(poiLat, 'Latitude'),
      lng: parseNum(poiLng, 'Longitude'),
    });
    setPoiTitle(''); setPoiDesc(''); setPoiLat(''); setPoiLng('');
  });

  if (!selectedTour) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="construct-outline" size={56} color={COLORS.textMuted} />
        <Text style={styles.emptyTitle}>No Tour Selected</Text>
        <Text style={styles.emptySubtitle}>Go to Home and select a tour to manage</Text>
      </View>
    );
  }

  const mps = selectedTour.meetingPoints ?? [];
  const pois = selectedTour.pois ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tour status */}
      <View style={[styles.card, SHADOWS.small]}>
        <Text style={styles.cardTitle}>Tour Status</Text>
        <Text style={styles.tourName}>{selectedTour.name}</Text>
        <View style={styles.statusRow}>
          {['planned', 'active', 'ended'].map((s) => {
            const theme = STATUS_THEME[s];
            const active = selectedTour.status === s;
            return (
              <Pressable
                key={s}
                style={[styles.statusChip, { backgroundColor: active ? theme.bg : COLORS.bg, borderColor: active ? theme.text + '40' : COLORS.border }]}
                onPress={() => wrap(() => changeTourState(s))}
                disabled={busy}
              >
                <Text style={[styles.statusChipText, { color: active ? theme.text : COLORS.textMuted }]}>
                  {theme.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Meeting points section */}
      <View style={[styles.card, SHADOWS.small]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="flag-outline" size={18} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Meeting Points</Text>
        </View>

        <TextInput style={styles.input} value={mpName} onChangeText={setMpName} placeholder="Name" placeholderTextColor={COLORS.textMuted} />
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.flex1]} value={mpLat} onChangeText={setMpLat} placeholder="Latitude" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
          <TextInput style={[styles.input, styles.flex1]} value={mpLng} onChangeText={setMpLng} placeholder="Longitude" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
        </View>
        <TextInput style={styles.input} value={mpTime} onChangeText={setMpTime} placeholder="Meetup time (optional, e.g. 14:30)" placeholderTextColor={COLORS.textMuted} />
        <Pressable style={styles.toggleRow} onPress={() => setMpCurrent(v => !v)}>
          <Ionicons name={mpCurrent ? 'checkbox' : 'square-outline'} size={20} color={COLORS.primary} />
          <Text style={styles.toggleText}>Set as current meeting point</Text>
        </Pressable>
        <Pressable style={styles.addBtn} onPress={handleAddMp} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Add Meeting Point</Text>
            </>
          )}
        </Pressable>

        {mps.length > 0 && <View style={styles.divider} />}
        {mps.map((mp) => (
          <View key={mp.id} style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <View style={styles.listHeader}>
                <Text style={styles.listName}>{mp.name}</Text>
                {mp.isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Current</Text>
                  </View>
                )}
              </View>
              <Text style={styles.listMeta}>{mp.lat}, {mp.lng}</Text>
              {mp.meetupTime && <Text style={styles.listMeta}>Time: {mp.meetupTime}</Text>}
            </View>
            <Pressable style={styles.deleteBtn} onPress={() => wrap(() => deleteMeetingPoint(mp.id))}>
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </Pressable>
          </View>
        ))}
      </View>

      {/* POIs section */}
      <View style={[styles.card, SHADOWS.small]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="star-outline" size={18} color={COLORS.accent} />
          <Text style={styles.cardTitle}>Points of Interest</Text>
        </View>

        <TextInput style={styles.input} value={poiTitle} onChangeText={setPoiTitle} placeholder="Title" placeholderTextColor={COLORS.textMuted} />
        <TextInput style={styles.input} value={poiDesc} onChangeText={setPoiDesc} placeholder="Description (optional)" placeholderTextColor={COLORS.textMuted} multiline />
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.flex1]} value={poiLat} onChangeText={setPoiLat} placeholder="Latitude" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
          <TextInput style={[styles.input, styles.flex1]} value={poiLng} onChangeText={setPoiLng} placeholder="Longitude" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
        </View>
        <Pressable style={[styles.addBtn, { backgroundColor: COLORS.accent }]} onPress={handleAddPoi} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Add POI</Text>
            </>
          )}
        </Pressable>

        {pois.length > 0 && <View style={styles.divider} />}
        {pois.map((poi) => (
          <View key={poi.id} style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listName}>{poi.title}</Text>
              <Text style={styles.listMeta}>{poi.lat}, {poi.lng}</Text>
              {poi.description && <Text style={styles.listMeta}>{poi.description}</Text>}
            </View>
            <Pressable style={styles.deleteBtn} onPress={() => wrap(() => deletePoi(poi.id))}>
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </Pressable>
          </View>
        ))}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingTop: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySubtitle: { fontSize: 14, color: COLORS.textMuted },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 14, gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  tourName: { fontSize: 14, color: COLORS.textSecondary },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5,
  },
  statusChipText: { fontWeight: '700', fontSize: 13 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.bg,
  },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  flex1: { flex: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  listItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
  },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  listMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  currentBadge: { backgroundColor: COLORS.successLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  currentBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.successDark },
  deleteBtn: { padding: 8 },
});
