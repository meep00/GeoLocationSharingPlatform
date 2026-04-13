import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme';

const TABS = [
  { key: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { key: 'map', label: 'Map', icon: 'map-outline', iconActive: 'map' },
  { key: 'manage', label: 'Manage', icon: 'construct-outline', iconActive: 'construct', guideOnly: true },
  { key: 'settings', label: 'Settings', icon: 'settings-outline', iconActive: 'settings' },
];

export default function BottomNav({ activePage, onNavigate, role }) {
  const visibleTabs = TABS.filter(t => !t.guideOnly || role === 'guide');

  return (
    <View style={[styles.container, SHADOWS.large]}>
      {visibleTabs.map(tab => {
        const active = activePage === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => onNavigate(tab.key)}
          >
            <Ionicons
              name={active ? tab.iconActive : tab.icon}
              size={22}
              color={active ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {tab.label}
            </Text>
            {active && <View style={styles.indicator} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    fontSize: 11,
    marginTop: 2,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
});
