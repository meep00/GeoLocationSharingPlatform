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
import { COLORS, SHADOWS } from '../theme';
import TourCard from '../components/TourCard';

export default function HomeScreen() {
  const {
    auth, role, logout, tours, selectedTourId, selectedTour,
    loadMine, selectTour, createTour, joinTour,
    showError, setActivePage,
  } = useApp();

  const [tourName, setTourName] = useState('');
  const [tourDesc, setTourDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const wrap = async (fn) => {
    setBusy(true);
    try { await fn(); } catch (e) { showError(e.message); }
    finally { setBusy(false); }
  };

  const handleCreate = () => wrap(async () => {
    if (!tourName.trim()) { showError('Tour name is required'); return; }
    await createTour(tourName.trim(), tourDesc.trim());
    setTourName(''); setTourDesc(''); setShowCreate(false);
  });

  const handleJoin = () => wrap(async () => {
    if (!joinCode.trim()) { showError('Join code is required'); return; }
    await joinTour(joinCode.trim());
    setJoinCode(''); setShowJoin(false);
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User header */}
      <View style={[styles.userCard, SHADOWS.small]}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Ionicons
              name={role === 'guide' ? 'compass' : 'people'}
              size={20}
              color="#fff"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userEmail} numberOfLines={1}>{auth.user.email}</Text>
            <Text style={styles.userRole}>{role === 'guide' ? 'Guide' : 'Tourist'}</Text>
          </View>
        </View>
        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
        </Pressable>
      </View>

      {/* Quick actions */}
      <View style={styles.actionsRow}>
        {role === 'guide' ? (
          <Pressable
            style={[styles.actionBtn, styles.actionPrimary, SHADOWS.small]}
            onPress={() => { setShowCreate(!showCreate); setShowJoin(false); }}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionPrimaryText}>Create Tour</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.actionBtn, styles.actionPrimary, SHADOWS.small]}
            onPress={() => { setShowJoin(!showJoin); setShowCreate(false); }}
          >
            <Ionicons name="enter-outline" size={20} color="#fff" />
            <Text style={styles.actionPrimaryText}>Join Tour</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.actionBtn, styles.actionSecondary, SHADOWS.small]}
          onPress={() => wrap(loadMine)}
        >
          <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
          <Text style={styles.actionSecondaryText}>Refresh</Text>
        </Pressable>
      </View>

      {/* Create tour form */}
      {showCreate && (
        <View style={[styles.formCard, SHADOWS.small]}>
          <Text style={styles.formTitle}>New Tour</Text>
          <TextInput
            style={styles.input}
            value={tourName}
            onChangeText={setTourName}
            placeholder="Tour name"
            placeholderTextColor={COLORS.textMuted}
          />
          <TextInput
            style={styles.input}
            value={tourDesc}
            onChangeText={setTourDesc}
            placeholder="Description (optional)"
            placeholderTextColor={COLORS.textMuted}
            multiline
          />
          <Pressable style={styles.submitBtn} onPress={handleCreate} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" size="small" /> : (
              <Text style={styles.submitText}>Create</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Join tour form */}
      {showJoin && (
        <View style={[styles.formCard, SHADOWS.small]}>
          <Text style={styles.formTitle}>Join a Tour</Text>
          <TextInput
            style={styles.input}
            value={joinCode}
            onChangeText={setJoinCode}
            autoCapitalize="characters"
            placeholder="Enter join code"
            placeholderTextColor={COLORS.textMuted}
          />
          <Pressable style={styles.submitBtn} onPress={handleJoin} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" size="small" /> : (
              <Text style={styles.submitText}>Join</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Selected tour summary */}
      {selectedTour && (
        <View style={[styles.selectedCard, SHADOWS.small]}>
          <View style={styles.selectedHeader}>
            <Ionicons name="flag" size={18} color={COLORS.primary} />
            <Text style={styles.selectedTitle}>{selectedTour.name}</Text>
          </View>
          <Text style={styles.meta}>
            Meeting point: {selectedTour.currentMeetingPoint?.name ?? 'None set'}
          </Text>
          <Text style={styles.meta}>
            POIs: {selectedTour.pois?.length ?? 0}
          </Text>
          <Pressable
            style={styles.mapLink}
            onPress={() => setActivePage('map')}
          >
            <Ionicons name="map-outline" size={16} color={COLORS.primary} />
            <Text style={styles.mapLinkText}>Open map</Text>
          </Pressable>
        </View>
      )}

      {/* Tour list */}
      <Text style={styles.sectionLabel}>My Tours</Text>
      {tours.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="airplane-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>
            {role === 'guide' ? 'Create your first tour above' : 'Join a tour with a code'}
          </Text>
        </View>
      ) : (
        tours.map((t) => (
          <TourCard
            key={t.id}
            tour={t}
            selected={selectedTourId === t.id}
            onPress={() => wrap(() => selectTour(t.id))}
          />
        ))
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingTop: 8 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  userEmail: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  userRole: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  logoutBtn: { padding: 8 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14 },
  actionPrimary: { backgroundColor: COLORS.primary },
  actionSecondary: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border },
  actionPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  actionSecondaryText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  formCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 14, gap: 10 },
  formTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.bg,
  },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  selectedCard: {
    backgroundColor: COLORS.primaryLight, borderRadius: 16, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  selectedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  selectedTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primaryDark },
  meta: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  mapLinkText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
});
