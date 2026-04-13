import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS, SHADOWS } from '../theme';

export default function SettingsScreen() {
  const { gatewayUrl, setGatewayUrl, locationWsUrl, setLocationWsUrl } = useApp();

  return (
    <View style={styles.container}>
      <View style={[styles.card, SHADOWS.small]}>
        <View style={styles.header}>
          <Ionicons name="server-outline" size={20} color={COLORS.primary} />
          <Text style={styles.title}>Backend Configuration</Text>
        </View>
        <Text style={styles.hint}>
          Configure the URLs for the backend services. Android emulator typically uses 10.0.2.2 instead of localhost.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>API Gateway URL</Text>
          <TextInput
            style={styles.input}
            value={gatewayUrl}
            onChangeText={setGatewayUrl}
            autoCapitalize="none"
            placeholder="http://10.0.2.2:3000"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Location WebSocket URL</Text>
          <TextInput
            style={styles.input}
            value={locationWsUrl}
            onChangeText={setLocationWsUrl}
            autoCapitalize="none"
            placeholder="http://10.0.2.2:3003"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      </View>

      <View style={[styles.card, SHADOWS.small]}>
        <View style={styles.header}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.textMuted} />
          <Text style={styles.title}>About</Text>
        </View>
        <Text style={styles.aboutText}>GeoTour v0.1.0</Text>
        <Text style={styles.aboutText}>Real-time group tour tracking platform</Text>
        <Text style={styles.aboutMuted}>
          Microservices: Gateway :3000, Auth :3001, Tours :3002, Location :3003
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16, paddingTop: 8 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 14, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  hint: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  field: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14,
    color: COLORS.text, backgroundColor: COLORS.bg,
  },
  aboutText: { fontSize: 14, color: COLORS.textSecondary },
  aboutMuted: { fontSize: 12, color: COLORS.textMuted },
});
