import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme';

const API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey ?? '';

const AUTOCOMPLETE_URL =
  'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const DETAILS_URL =
  'https://maps.googleapis.com/maps/api/place/details/json';

export default function PlaceSearchInput({ onPlaceSelected, placeholder }) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);

  const fetchPredictions = useCallback(async (text) => {
    if (!text || text.length < 2 || !API_KEY) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    try {
      const url = `${AUTOCOMPLETE_URL}?input=${encodeURIComponent(text)}&key=${API_KEY}&language=pl`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.predictions?.length) {
        setPredictions(data.predictions);
        setShowDropdown(true);
      } else {
        setPredictions([]);
        setShowDropdown(false);
      }
    } catch {
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(query), 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchPredictions]);

  const handleSelect = useCallback(async (prediction) => {
    setShowDropdown(false);
    setQuery(prediction.structured_formatting?.main_text ?? prediction.description);
    setPredictions([]);

    if (!API_KEY) return;
    try {
      const url = `${DETAILS_URL}?place_id=${prediction.place_id}&fields=geometry,name,formatted_address&key=${API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.result?.geometry?.location) {
        const loc = data.result.geometry.location;
        onPlaceSelected?.({
          lat: loc.lat,
          lng: loc.lng,
          name: data.result.name ?? '',
          address: data.result.formatted_address ?? '',
        });
      }
    } catch {
      /* silently ignore */
    }
  }, [onPlaceSelected]);

  const handleClear = () => {
    setQuery('');
    setPredictions([]);
    setShowDropdown(false);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputRow}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder ?? 'Search for a place...'}
          placeholderTextColor={COLORS.textMuted}
          autoCorrect={false}
        />
        {loading && <ActivityIndicator size="small" color={COLORS.primary} style={styles.spinner} />}
        {query.length > 0 && !loading && (
          <Pressable onPress={handleClear} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </Pressable>
        )}
      </View>

      {showDropdown && predictions.length > 0 && (
        <View style={[styles.dropdown, SHADOWS.medium]}>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {predictions.map((item) => (
              <Pressable key={item.place_id} style={styles.item} onPress={() => handleSelect(item)}>
                <Ionicons name="location-outline" size={16} color={COLORS.textMuted} style={styles.itemIcon} />
                <View style={styles.itemTextWrap}>
                  <Text style={styles.itemMain} numberOfLines={1}>
                    {item.structured_formatting?.main_text ?? item.description}
                  </Text>
                  {item.structured_formatting?.secondary_text ? (
                    <Text style={styles.itemSub} numberOfLines={1}>
                      {item.structured_formatting.secondary_text}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.attribution}>Powered by Google</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { zIndex: 10 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 10,
  },
  searchIcon: { marginRight: 6 },
  input: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.text,
  },
  spinner: { marginLeft: 6 },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 220,
    overflow: 'hidden',
  },
  list: { maxHeight: 196 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  itemIcon: { marginRight: 10 },
  itemTextWrap: { flex: 1 },
  itemMain: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  itemSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  attribution: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 4,
  },
});
