import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, STATUS_THEME } from '../theme';

export default function TourCard({ tour, selected, onPress }) {
  const status = STATUS_THEME[tour.status] ?? STATUS_THEME.planned;

  return (
    <Pressable
      style={[styles.card, SHADOWS.small, selected && styles.selected]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{tour.name}</Text>
        <View style={[styles.badge, { backgroundColor: status.bg }]}>
          <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
        </View>
      </View>

      {tour.description ? (
        <Text style={styles.description} numberOfLines={2}>{tour.description}</Text>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.infoRow}>
          <Ionicons name="key-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.code}>{tour.joinCode}</Text>
        </View>
        {selected && (
          <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  selected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EFF6FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  code: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
});
