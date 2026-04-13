import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { COLORS, SHADOWS } from '../theme';

export default function Toast({ message, type = 'error', onDismiss }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-30)).current;

  useEffect(() => {
    if (!message) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -30, duration: 300, useNativeDriver: true }),
      ]).start(() => onDismiss?.());
    }, type === 'success' ? 2500 : 4000);

    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  const isSuccess = type === 'success';

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: isSuccess ? COLORS.successDark : COLORS.dangerDark },
        { opacity, transform: [{ translateY }] },
        SHADOWS.medium,
      ]}
    >
      <Text style={styles.icon}>{isSuccess ? '\u2713' : '\u2717'}</Text>
      <Text style={styles.text} numberOfLines={3}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  icon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 10,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
