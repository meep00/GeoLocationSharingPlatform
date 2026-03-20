import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { io } from 'socket.io-client';

const DEFAULT_REGION = {
  latitude: 52.2297,
  longitude: 21.0122,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08
};

export default function App() {
  const defaultGatewayUrl = useMemo(() => {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }, []);

  const [gatewayUrl, setGatewayUrl] = useState(defaultGatewayUrl);
  const [locationWsUrl, setLocationWsUrl] = useState(defaultGatewayUrl.replace(':3000', ':3003'));
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('tourist');
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activePage, setActivePage] = useState('home');

  const [tours, setTours] = useState([]);
  const [selectedTourId, setSelectedTourId] = useState('');
  const [selectedTour, setSelectedTour] = useState(null);

  const [createTourName, setCreateTourName] = useState('');
  const [createTourDescription, setCreateTourDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [newTourStatus, setNewTourStatus] = useState('active');
  const [meetingPointName, setMeetingPointName] = useState('');
  const [meetingPointLat, setMeetingPointLat] = useState('');
  const [meetingPointLng, setMeetingPointLng] = useState('');
  const [meetingPointTime, setMeetingPointTime] = useState('');
  const [meetingPointCurrent, setMeetingPointCurrent] = useState(true);
  const [poiTitle, setPoiTitle] = useState('');
  const [poiDescription, setPoiDescription] = useState('');
  const [poiLat, setPoiLat] = useState('');
  const [poiLng, setPoiLng] = useState('');

  const [socketConnected, setSocketConnected] = useState(false);
  const [socketStatus, setSocketStatus] = useState('Disconnected');
  const [lastGuideLocation, setLastGuideLocation] = useState(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);

  const socketRef = useRef(null);
  const trackingIntervalRef = useRef(null);
  const role = auth?.user?.role;

  const callApi = async (path, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    };
    if (auth?.accessToken) {
      headers.Authorization = `Bearer ${auth.accessToken}`;
    }

    const response = await fetch(`${gatewayUrl}${path}`, { ...options, headers });
    const text = await response.text();
    let payload = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { message: text };
      }
    }
    if (!response.ok) {
      const message =
        typeof payload?.message === 'string'
          ? payload.message
          : Array.isArray(payload?.message)
            ? payload.message.join(', ')
            : `Request failed (${response.status})`;
      throw new Error(message);
    }
    return payload;
  };

  const withFeedback = async (action, okMessage) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await action();
      if (okMessage) {
        setSuccess(okMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const parseNumber = (value, field) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new Error(`${field} must be a valid number`);
    }
    return parsed;
  };

  const loadMine = async (tokenOverride) => {
    const token = tokenOverride ?? auth?.accessToken;
    if (!token) {
      return;
    }
    const toursData = await callApi('/api/tours/mine', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setTours(Array.isArray(toursData) ? toursData : []);
  };

  const loadTourDetails = async (tourId) => {
    if (!tourId) {
      return;
    }
    const tourData = await callApi(`/api/tours/${tourId}`);
    setSelectedTour(tourData);
    setSelectedTourId(tourId);
  };

  const handleAuth = async () => {
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    await withFeedback(async () => {
      const authPayload =
        authMode === 'register'
          ? { email, password, role: registerRole }
          : { email, password };
      const data = await callApi(`/api/auth/${authMode}`, {
        method: 'POST',
        body: JSON.stringify(authPayload)
      });
      setAuth(data);
      setActivePage('home');
      await loadMine(data.accessToken);
    }, authMode === 'register' ? 'Registered successfully' : 'Logged in successfully');
  };

  const createTour = async () => {
    if (!createTourName.trim()) {
      setError('Tour name is required');
      return;
    }
    await withFeedback(async () => {
      const data = await callApi('/api/tours', {
        method: 'POST',
        body: JSON.stringify({
          name: createTourName.trim(),
          description: createTourDescription.trim() || undefined
        })
      });
      setCreateTourName('');
      setCreateTourDescription('');
      await loadMine();
      await loadTourDetails(data.id);
    }, 'Tour created');
  };

  const joinTour = async () => {
    if (!joinCode.trim()) {
      setError('Join code is required');
      return;
    }
    await withFeedback(async () => {
      const data = await callApi('/api/tours/join', {
        method: 'POST',
        body: JSON.stringify({ joinCode: joinCode.trim() })
      });
      setJoinCode('');
      await loadMine();
      setSelectedTour(data);
      setSelectedTourId(data.id);
    }, 'Joined tour');
  };

  const changeTourState = async () => {
    if (!selectedTourId) {
      setError('Select a tour first');
      return;
    }
    await withFeedback(async () => {
      await callApi(`/api/tours/${selectedTourId}/state`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newTourStatus })
      });
      await loadMine();
      await loadTourDetails(selectedTourId);
    }, 'Tour status updated');
  };

  const createMeetingPoint = async () => {
    if (!selectedTourId) {
      setError('Select a tour first');
      return;
    }
    if (!meetingPointName.trim()) {
      setError('Meeting point name is required');
      return;
    }
    await withFeedback(async () => {
      const payload = {
        name: meetingPointName.trim(),
        lat: parseNumber(meetingPointLat, 'Meeting lat'),
        lng: parseNumber(meetingPointLng, 'Meeting lng'),
        isCurrent: meetingPointCurrent
      };
      if (meetingPointTime.trim()) {
        payload.meetupTime = meetingPointTime.trim();
      }
      await callApi(`/api/tours/${selectedTourId}/meeting-points`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setMeetingPointName('');
      setMeetingPointLat('');
      setMeetingPointLng('');
      setMeetingPointTime('');
      await loadTourDetails(selectedTourId);
    }, 'Meeting point added');
  };

  const deleteMeetingPoint = async (meetingPointId) => {
    await withFeedback(async () => {
      await callApi(`/api/tours/${selectedTourId}/meeting-points/${meetingPointId}`, {
        method: 'DELETE'
      });
      await loadTourDetails(selectedTourId);
    }, 'Meeting point deleted');
  };

  const createPoi = async () => {
    if (!selectedTourId) {
      setError('Select a tour first');
      return;
    }
    if (!poiTitle.trim()) {
      setError('POI title is required');
      return;
    }
    await withFeedback(async () => {
      await callApi(`/api/tours/${selectedTourId}/pois`, {
        method: 'POST',
        body: JSON.stringify({
          title: poiTitle.trim(),
          description: poiDescription.trim() || undefined,
          lat: parseNumber(poiLat, 'POI lat'),
          lng: parseNumber(poiLng, 'POI lng')
        })
      });
      setPoiTitle('');
      setPoiDescription('');
      setPoiLat('');
      setPoiLng('');
      await loadTourDetails(selectedTourId);
    }, 'POI added');
  };

  const deletePoi = async (poiId) => {
    await withFeedback(async () => {
      await callApi(`/api/tours/${selectedTourId}/pois/${poiId}`, {
        method: 'DELETE'
      });
      await loadTourDetails(selectedTourId);
    }, 'POI deleted');
  };

  const emitGuideLocation = async () => {
    if (!socketRef.current || !selectedTourId || role !== 'guide') {
      return;
    }
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      setError('Location permission denied');
      return;
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });
    socketRef.current.emit('guide:location', {
      tourId: selectedTourId,
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      sentAt: new Date().toISOString()
    });
  };

  const startTracking = async () => {
    if (trackingEnabled || role !== 'guide') {
      return;
    }
    await emitGuideLocation();
    trackingIntervalRef.current = setInterval(() => {
      emitGuideLocation().catch(() => {
        setSocketStatus('Guide location publish failed');
      });
    }, 2000);
    setTrackingEnabled(true);
    setSuccess('Live tracking enabled');
  };

  const stopTracking = () => {
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
    setTrackingEnabled(false);
  };

  useEffect(() => {
    if (!auth?.accessToken) {
      return undefined;
    }

    const socket = io(locationWsUrl, {
      transports: ['websocket'],
      auth: { token: auth.accessToken },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 6000
    });

    socketRef.current = socket;
    socket.on('connect', () => {
      setSocketConnected(true);
      setSocketStatus('Connected');
      if (selectedTourId) {
        socket.emit('tour:subscribe', { tourId: selectedTourId });
        socket.emit('tour:last-known:request', { tourId: selectedTourId });
      }
    });
    socket.on('disconnect', () => {
      setSocketConnected(false);
      setSocketStatus('Disconnected, waiting for reconnect...');
    });
    socket.on('reconnect_attempt', () => {
      setSocketStatus('Reconnecting...');
    });
    socket.on('tour:subscribed', () => {
      setSocketStatus('Subscribed to selected tour');
    });
    socket.on('tour:error', (payload) => {
      const message = payload?.message || 'Tour subscription error';
      setError(String(message));
      setSocketStatus('Subscription error');
    });
    socket.on('guide:location:update', (payload) => {
      setLastGuideLocation(payload);
    });
    socket.on('guide:location:missing', () => {
      setSocketStatus('No guide location yet for selected tour');
    });

    return () => {
      stopTracking();
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [auth?.accessToken, locationWsUrl, selectedTourId]);

  useEffect(() => {
    if (!socketRef.current || !selectedTourId || !socketConnected) {
      return;
    }
    socketRef.current.emit('tour:subscribe', { tourId: selectedTourId });
    socketRef.current.emit('tour:last-known:request', { tourId: selectedTourId });
  }, [selectedTourId, socketConnected]);

  useEffect(() => {
    if (role !== 'guide' && trackingEnabled) {
      stopTracking();
    }
  }, [role, trackingEnabled]);

  const logout = () => {
    stopTracking();
    setAuth(null);
    setTours([]);
    setSelectedTour(null);
    setSelectedTourId('');
    setLastGuideLocation(null);
    setSocketConnected(false);
    setSocketStatus('Disconnected');
    setActivePage('home');
    setError('');
    setSuccess('Logged out');
  };

  const mapRegion = useMemo(() => {
    const source = lastGuideLocation || selectedTour?.currentMeetingPoint || selectedTour?.pois?.[0];
    if (!source) {
      return DEFAULT_REGION;
    }
    return {
      latitude: source.lat,
      longitude: source.lng,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03
    };
  }, [lastGuideLocation, selectedTour]);

  const renderAuthView = () => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Authentication</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.tabButton, authMode === 'login' && styles.tabButtonActive]}
          onPress={() => setAuthMode('login')}
        >
          <Text style={styles.tabButtonText}>Login</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, authMode === 'register' && styles.tabButtonActive]}
          onPress={() => setAuthMode('register')}
        >
          <Text style={styles.tabButtonText}>Register</Text>
        </Pressable>
      </View>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholder="Password"
      />
      {authMode === 'register' ? (
        <View style={styles.row}>
          <Pressable
            style={[styles.tabButton, registerRole === 'tourist' && styles.tabButtonActive]}
            onPress={() => setRegisterRole('tourist')}
          >
            <Text style={styles.tabButtonText}>tourist</Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, registerRole === 'guide' && styles.tabButtonActive]}
            onPress={() => setRegisterRole('guide')}
          >
            <Text style={styles.tabButtonText}>guide</Text>
          </Pressable>
        </View>
      ) : null}
      <Pressable style={styles.primaryButton} onPress={handleAuth} disabled={loading}>
        <Text style={styles.primaryButtonText}>{loading ? 'Please wait...' : 'Continue'}</Text>
      </Pressable>
    </View>
  );

  const renderHomePage = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Session</Text>
        <Text style={styles.metaText}>User: {auth.user.email}</Text>
        <Text style={styles.metaText}>Role: {auth.user.role}</Text>
        <View style={styles.row}>
          <Pressable style={styles.secondaryButton} onPress={() => withFeedback(loadMine)}>
            <Text style={styles.secondaryButtonText}>Refresh tours</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={logout}>
            <Text style={styles.secondaryButtonText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      {role === 'guide' ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Create Tour</Text>
          <TextInput
            style={styles.input}
            value={createTourName}
            onChangeText={setCreateTourName}
            placeholder="Tour name"
          />
          <TextInput
            style={styles.input}
            value={createTourDescription}
            onChangeText={setCreateTourDescription}
            placeholder="Tour description"
          />
          <Pressable style={styles.primaryButton} onPress={createTour}>
            <Text style={styles.primaryButtonText}>Create</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Join Tour</Text>
          <TextInput
            style={styles.input}
            value={joinCode}
            onChangeText={setJoinCode}
            autoCapitalize="characters"
            placeholder="Join code"
          />
          <Pressable style={styles.primaryButton} onPress={joinTour}>
            <Text style={styles.primaryButtonText}>Join</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>My Tours</Text>
        {tours.length === 0 ? <Text style={styles.hint}>No tours yet</Text> : null}
        {tours.map((tour) => (
          <Pressable
            key={tour.id}
            style={[styles.tourItem, selectedTourId === tour.id && styles.tourItemSelected]}
            onPress={() => withFeedback(() => loadTourDetails(tour.id), 'Tour loaded')}
          >
            <Text style={styles.tourTitle}>{tour.name}</Text>
            <Text style={styles.metaText}>Status: {tour.status}</Text>
            <Text style={styles.metaText}>Join code: {tour.joinCode}</Text>
          </Pressable>
        ))}
      </View>

      {selectedTour ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Selected Tour</Text>
          <Text style={styles.metaText}>Name: {selectedTour.name}</Text>
          <Text style={styles.metaText}>Status: {selectedTour.status}</Text>
          <Text style={styles.metaText}>Join code: {selectedTour.joinCode}</Text>
          <Text style={styles.metaText}>
            Current meeting:{' '}
            {selectedTour.currentMeetingPoint ? selectedTour.currentMeetingPoint.name : 'none'}
          </Text>
          <Text style={styles.hint}>Switch to Map to see live guide location and POIs.</Text>
        </View>
      ) : null}
    </>
  );

  const renderMapPage = () => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Live Tour Map</Text>
      {!selectedTour ? (
        <Text style={styles.hint}>Select a tour on Home page first.</Text>
      ) : (
        <>
          <MapView style={styles.map} initialRegion={mapRegion} region={mapRegion}>
            {selectedTour.currentMeetingPoint ? (
              <Marker
                coordinate={{
                  latitude: selectedTour.currentMeetingPoint.lat,
                  longitude: selectedTour.currentMeetingPoint.lng
                }}
                title={`Meeting: ${selectedTour.currentMeetingPoint.name}`}
                pinColor="#2563eb"
              />
            ) : null}
            {(selectedTour.pois ?? []).map((poi) => (
              <Marker
                key={poi.id}
                coordinate={{ latitude: poi.lat, longitude: poi.lng }}
                title={poi.title}
                description={poi.description ?? undefined}
                pinColor="#7c3aed"
              />
            ))}
            {lastGuideLocation ? (
              <Marker
                coordinate={{
                  latitude: lastGuideLocation.lat,
                  longitude: lastGuideLocation.lng
                }}
                title={lastGuideLocation.isFallback ? 'Guide (last known)' : 'Guide (live)'}
                description={`at ${new Date(lastGuideLocation.sentAt).toLocaleTimeString()}`}
                pinColor={lastGuideLocation.isFallback ? '#f59e0b' : '#16a34a'}
              />
            ) : null}
          </MapView>
          <Text style={styles.metaText}>Socket: {socketStatus}</Text>
          <Text style={styles.metaText}>
            Last guide location:{' '}
            {lastGuideLocation
              ? `${lastGuideLocation.lat.toFixed(5)}, ${lastGuideLocation.lng.toFixed(5)}`
              : 'unavailable'}
          </Text>
          <Text style={styles.metaText}>
            Fallback mode: {lastGuideLocation?.isFallback ? 'yes' : 'no'}
          </Text>
          {role === 'guide' ? (
            <View style={styles.row}>
              <Pressable
                style={styles.secondaryButton}
                onPress={trackingEnabled ? stopTracking : () => withFeedback(startTracking)}
              >
                <Text style={styles.secondaryButtonText}>
                  {trackingEnabled ? 'Stop tracking' : 'Start tracking'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => withFeedback(emitGuideLocation, 'Location sent')}
              >
                <Text style={styles.secondaryButtonText}>Send one location</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}
    </View>
  );

  const renderGuideManagePage = () => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Guide Management</Text>
      {!selectedTour ? (
        <Text style={styles.hint}>Select a tour first.</Text>
      ) : (
        <>
          <View style={styles.row}>
            {['planned', 'active', 'ended'].map((status) => (
              <Pressable
                key={status}
                style={[styles.tabButton, newTourStatus === status && styles.tabButtonActive]}
                onPress={() => setNewTourStatus(status)}
              >
                <Text style={styles.tabButtonText}>{status}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.secondaryButton} onPress={changeTourState}>
            <Text style={styles.secondaryButtonText}>Update tour state</Text>
          </Pressable>

          <Text style={styles.subsectionTitle}>New meeting point</Text>
          <TextInput
            style={styles.input}
            value={meetingPointName}
            onChangeText={setMeetingPointName}
            placeholder="Name"
          />
          <TextInput
            style={styles.input}
            value={meetingPointLat}
            onChangeText={setMeetingPointLat}
            placeholder="Latitude"
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            value={meetingPointLng}
            onChangeText={setMeetingPointLng}
            placeholder="Longitude"
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            value={meetingPointTime}
            onChangeText={setMeetingPointTime}
            placeholder="Meetup time ISO (optional)"
          />
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setMeetingPointCurrent((value) => !value)}
          >
            <Text style={styles.secondaryButtonText}>
              Is current: {meetingPointCurrent ? 'true' : 'false'}
            </Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={createMeetingPoint}>
            <Text style={styles.primaryButtonText}>Add meeting point</Text>
          </Pressable>

          <Text style={styles.subsectionTitle}>New POI</Text>
          <TextInput
            style={styles.input}
            value={poiTitle}
            onChangeText={setPoiTitle}
            placeholder="Title"
          />
          <TextInput
            style={styles.input}
            value={poiDescription}
            onChangeText={setPoiDescription}
            placeholder="Description"
          />
          <TextInput
            style={styles.input}
            value={poiLat}
            onChangeText={setPoiLat}
            placeholder="Latitude"
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            value={poiLng}
            onChangeText={setPoiLng}
            placeholder="Longitude"
            keyboardType="numeric"
          />
          <Pressable style={styles.primaryButton} onPress={createPoi}>
            <Text style={styles.primaryButtonText}>Add POI</Text>
          </Pressable>

          <Text style={styles.subsectionTitle}>Meeting points</Text>
          {(selectedTour.meetingPoints ?? []).map((meetingPoint) => (
            <View key={meetingPoint.id} style={styles.listItem}>
              <Text style={styles.listTitle}>{meetingPoint.name}</Text>
              <Text style={styles.metaText}>
                {meetingPoint.lat}, {meetingPoint.lng}
              </Text>
              <Text style={styles.metaText}>
                current: {meetingPoint.isCurrent ? 'true' : 'false'}
              </Text>
              <Pressable
                style={styles.dangerButton}
                onPress={() => deleteMeetingPoint(meetingPoint.id)}
              >
                <Text style={styles.dangerButtonText}>Delete</Text>
              </Pressable>
            </View>
          ))}

          <Text style={styles.subsectionTitle}>POIs</Text>
          {(selectedTour.pois ?? []).map((poi) => (
            <View key={poi.id} style={styles.listItem}>
              <Text style={styles.listTitle}>{poi.title}</Text>
              <Text style={styles.metaText}>
                {poi.lat}, {poi.lng}
              </Text>
              <Text style={styles.metaText}>{poi.description ?? 'No description'}</Text>
              <Pressable style={styles.dangerButton} onPress={() => deletePoi(poi.id)}>
                <Text style={styles.dangerButtonText}>Delete</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>GeoLocationSharingPlatform</Text>
        <Text style={styles.subtitle}>Multi-page mobile app with live guide tracking</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Backend Setup</Text>
          <TextInput
            style={styles.input}
            value={gatewayUrl}
            onChangeText={setGatewayUrl}
            autoCapitalize="none"
            placeholder="Gateway URL (e.g. http://10.0.2.2:3000)"
          />
          <TextInput
            style={styles.input}
            value={locationWsUrl}
            onChangeText={setLocationWsUrl}
            autoCapitalize="none"
            placeholder="Location WS URL (e.g. http://10.0.2.2:3003)"
          />
          <Text style={styles.hint}>Android emulator usually needs 10.0.2.2 instead of localhost.</Text>
        </View>

        {!auth ? (
          renderAuthView()
        ) : (
          <>
            <View style={styles.pageTabs}>
              <Pressable
                style={[styles.pageTab, activePage === 'home' && styles.pageTabActive]}
                onPress={() => setActivePage('home')}
              >
                <Text style={styles.pageTabText}>Home</Text>
              </Pressable>
              <Pressable
                style={[styles.pageTab, activePage === 'map' && styles.pageTabActive]}
                onPress={() => setActivePage('map')}
              >
                <Text style={styles.pageTabText}>Map</Text>
              </Pressable>
              {role === 'guide' ? (
                <Pressable
                  style={[styles.pageTab, activePage === 'manage' && styles.pageTabActive]}
                  onPress={() => setActivePage('manage')}
                >
                  <Text style={styles.pageTabText}>Manage</Text>
                </Pressable>
              ) : null}
            </View>

            {activePage === 'home' ? renderHomePage() : null}
            {activePage === 'map' ? renderMapPage() : null}
            {activePage === 'manage' && role === 'guide' ? renderGuideManagePage() : null}
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb'
  },
  content: {
    padding: 16,
    gap: 12
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a'
  },
  subtitle: {
    color: '#334155',
    marginBottom: 4
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  subsectionTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b'
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff'
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  primaryButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '700'
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 10
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontWeight: '600'
  },
  dangerButton: {
    marginTop: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10
  },
  dangerButtonText: {
    color: '#991b1b',
    fontWeight: '700'
  },
  tabButton: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f8fafc'
  },
  tabButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#dbeafe'
  },
  tabButtonText: {
    color: '#1e293b',
    fontWeight: '600'
  },
  tourItem: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    gap: 2
  },
  tourItemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff'
  },
  tourTitle: {
    color: '#0f172a',
    fontWeight: '700'
  },
  listItem: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 8
  },
  listTitle: {
    color: '#0f172a',
    fontWeight: '700'
  },
  metaText: {
    color: '#334155',
    fontSize: 13
  },
  hint: {
    color: '#64748b',
    fontSize: 12
  },
  error: {
    color: '#b91c1c',
    fontWeight: '600'
  },
  success: {
    color: '#15803d',
    fontWeight: '600'
  },
  map: {
    width: '100%',
    height: 320,
    borderRadius: 10
  },
  pageTabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#dbe1ea',
    borderRadius: 10,
    overflow: 'hidden'
  },
  pageTab: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f8fafc'
  },
  pageTabActive: {
    backgroundColor: '#dbeafe'
  },
  pageTabText: {
    textAlign: 'center',
    fontWeight: '700',
    color: '#1e293b'
  }
});
