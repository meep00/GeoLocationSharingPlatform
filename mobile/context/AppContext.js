import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const defaultGateway = useMemo(
    () => (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000'),
    [],
  );

  const [gatewayUrl, setGatewayUrl] = useState(defaultGateway);
  const [locationWsUrl, setLocationWsUrl] = useState(defaultGateway.replace(':3000', ':3003'));
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activePage, setActivePage] = useState('home');

  const [tours, setTours] = useState([]);
  const [selectedTourId, setSelectedTourId] = useState('');
  const [selectedTour, setSelectedTour] = useState(null);

  const [socketConnected, setSocketConnected] = useState(false);
  const [socketStatus, setSocketStatus] = useState('Disconnected');
  const [lastGuideLocation, setLastGuideLocation] = useState(null);
  const [lastGuideUpdateTime, setLastGuideUpdateTime] = useState(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [myLocation, setMyLocation] = useState(null);

  const socketRef = useRef(null);
  const trackingIntervalRef = useRef(null);
  const selectedTourIdRef = useRef(selectedTourId);
  const prevTourIdRef = useRef('');
  const toastTimer = useRef(null);

  const role = auth?.user?.role;

  useEffect(() => { selectedTourIdRef.current = selectedTourId; }, [selectedTourId]);

  /* ── Feedback ── */
  const showError = useCallback((msg) => {
    setError(msg); setSuccess('');
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setError(''), 4000);
  }, []);

  const showSuccess = useCallback((msg) => {
    setSuccess(msg); setError('');
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setSuccess(''), 3000);
  }, []);

  const clearFeedback = useCallback(() => { setError(''); setSuccess(''); }, []);

  /* ── API helper ── */
  const callApi = useCallback(async (path, options = {}) => {
    const headers = { 'Content-Type': 'application/json', ...(options.headers ?? {}) };
    if (auth?.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
    const res = await fetch(`${gatewayUrl}${path}`, { ...options, headers });
    const text = await res.text();
    let payload = {};
    if (text) {
      try { payload = JSON.parse(text); } catch { payload = { message: text }; }
    }
    if (!res.ok) {
      const message = typeof payload?.message === 'string'
        ? payload.message
        : Array.isArray(payload?.message) ? payload.message.join(', ')
        : `Request failed (${res.status})`;
      throw new Error(message);
    }
    return payload;
  }, [auth?.accessToken, gatewayUrl]);

  /* ── Tours loading ── */
  const loadMine = useCallback(async (tokenOverride) => {
    const token = tokenOverride ?? auth?.accessToken;
    if (!token) return;
    const data = await callApi('/api/tours/mine', { headers: { Authorization: `Bearer ${token}` } });
    setTours(Array.isArray(data) ? data : []);
  }, [auth?.accessToken, callApi]);

  const loadTourDetails = useCallback(async (tourId) => {
    if (!tourId) return;
    const data = await callApi(`/api/tours/${tourId}`);
    setSelectedTour(data);
    setSelectedTourId(tourId);
  }, [callApi]);

  /* ── Tour selection with cleanup ── */
  const selectTour = useCallback(async (tourId) => {
    const prev = prevTourIdRef.current;
    if (prev && prev !== tourId && socketRef.current) {
      socketRef.current.emit('tour:unsubscribe', { tourId: prev });
    }
    setLastGuideLocation(null);
    setLastGuideUpdateTime(null);
    await loadTourDetails(tourId);
    prevTourIdRef.current = tourId;
  }, [loadTourDetails]);

  /* ── Auth ── */
  const handleAuth = useCallback(async (email, password, mode, registerRole) => {
    setLoading(true);
    clearFeedback();
    try {
      const body = mode === 'register' ? { email, password, role: registerRole } : { email, password };
      const data = await callApi(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify(body) });
      setAuth(data);
      showSuccess(mode === 'register' ? 'Registered successfully' : 'Logged in');
      const toursData = await callApi('/api/tours/mine', { headers: { Authorization: `Bearer ${data.accessToken}` } });
      setTours(Array.isArray(toursData) ? toursData : []);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }, [callApi, clearFeedback, showError, showSuccess]);

  const logout = useCallback(() => {
    if (trackingIntervalRef.current) { clearInterval(trackingIntervalRef.current); trackingIntervalRef.current = null; }
    setTrackingEnabled(false);
    setAuth(null);
    setTours([]);
    setSelectedTour(null);
    setSelectedTourId('');
    setLastGuideLocation(null);
    setLastGuideUpdateTime(null);
    setSocketConnected(false);
    setSocketStatus('Disconnected');
    setMyLocation(null);
    setActivePage('home');
    showSuccess('Logged out');
  }, [showSuccess]);

  /* ── Tour operations ── */
  const createTour = useCallback(async (name, description) => {
    const data = await callApi('/api/tours', { method: 'POST', body: JSON.stringify({ name, description: description || undefined }) });
    await loadMine();
    await loadTourDetails(data.id);
    showSuccess('Tour created');
    return data;
  }, [callApi, loadMine, loadTourDetails, showSuccess]);

  const joinTour = useCallback(async (joinCode) => {
    const data = await callApi('/api/tours/join', { method: 'POST', body: JSON.stringify({ joinCode }) });
    await loadMine();
    setSelectedTour(data);
    setSelectedTourId(data.id);
    showSuccess('Joined tour');
    return data;
  }, [callApi, loadMine, showSuccess]);

  const changeTourState = useCallback(async (status) => {
    if (!selectedTourId) throw new Error('Select a tour first');
    await callApi(`/api/tours/${selectedTourId}/state`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await loadMine();
    await loadTourDetails(selectedTourId);
    showSuccess('Tour status updated');
  }, [callApi, selectedTourId, loadMine, loadTourDetails, showSuccess]);

  /* ── Meeting points ── */
  const createMeetingPoint = useCallback(async (payload) => {
    if (!selectedTourId) throw new Error('Select a tour first');
    await callApi(`/api/tours/${selectedTourId}/meeting-points`, { method: 'POST', body: JSON.stringify(payload) });
    await loadTourDetails(selectedTourId);
    showSuccess('Meeting point added');
  }, [callApi, selectedTourId, loadTourDetails, showSuccess]);

  const deleteMeetingPoint = useCallback(async (id) => {
    await callApi(`/api/tours/${selectedTourId}/meeting-points/${id}`, { method: 'DELETE' });
    await loadTourDetails(selectedTourId);
    showSuccess('Meeting point deleted');
  }, [callApi, selectedTourId, loadTourDetails, showSuccess]);

  /* ── POIs ── */
  const createPoi = useCallback(async (payload) => {
    if (!selectedTourId) throw new Error('Select a tour first');
    await callApi(`/api/tours/${selectedTourId}/pois`, { method: 'POST', body: JSON.stringify(payload) });
    await loadTourDetails(selectedTourId);
    showSuccess('POI added');
  }, [callApi, selectedTourId, loadTourDetails, showSuccess]);

  const deletePoi = useCallback(async (id) => {
    await callApi(`/api/tours/${selectedTourId}/pois/${id}`, { method: 'DELETE' });
    await loadTourDetails(selectedTourId);
    showSuccess('POI deleted');
  }, [callApi, selectedTourId, loadTourDetails, showSuccess]);

  /* ── Guide location emission ── */
  const emitGuideLocation = useCallback(async () => {
    if (!socketRef.current || !selectedTourIdRef.current || role !== 'guide') return;
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') { showError('Location permission denied'); return; }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    socketRef.current.emit('guide:location', {
      tourId: selectedTourIdRef.current,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      sentAt: new Date().toISOString(),
    });
  }, [role, showError]);

  const startTracking = useCallback(async () => {
    if (trackingEnabled || role !== 'guide') return;
    await emitGuideLocation();
    trackingIntervalRef.current = setInterval(() => {
      emitGuideLocation().catch(() => setSocketStatus('Location publish failed'));
    }, 2000);
    setTrackingEnabled(true);
    showSuccess('Live tracking enabled');
  }, [trackingEnabled, role, emitGuideLocation, showSuccess]);

  const stopTracking = useCallback(() => {
    if (trackingIntervalRef.current) { clearInterval(trackingIntervalRef.current); trackingIntervalRef.current = null; }
    setTrackingEnabled(false);
  }, []);

  /* ── Socket management ── */
  useEffect(() => {
    if (!auth?.accessToken) return undefined;

    const socket = io(locationWsUrl, {
      transports: ['websocket'],
      auth: { token: auth.accessToken },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 6000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      setSocketStatus('Connected');
      const tid = selectedTourIdRef.current;
      if (tid) {
        socket.emit('tour:subscribe', { tourId: tid });
        socket.emit('tour:last-known:request', { tourId: tid });
      }
    });
    socket.on('disconnect', () => { setSocketConnected(false); setSocketStatus('Reconnecting...'); });
    socket.on('reconnect_attempt', () => setSocketStatus('Reconnecting...'));
    socket.on('tour:subscribed', () => setSocketStatus('Subscribed to tour'));
    socket.on('tour:error', (p) => {
      const msg = p?.message || 'Socket error';
      if (msg === 'Only guide can publish location') return;
      showError(msg);
      setSocketStatus('Error');
    });
    socket.on('guide:location:update', (p) => { setLastGuideLocation(p); setLastGuideUpdateTime(Date.now()); });
    socket.on('guide:location:missing', () => setSocketStatus('No guide location yet'));

    return () => {
      if (trackingIntervalRef.current) { clearInterval(trackingIntervalRef.current); trackingIntervalRef.current = null; }
      setTrackingEnabled(false);
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [auth?.accessToken, locationWsUrl, showError]);

  useEffect(() => {
    if (!socketRef.current || !selectedTourId || !socketConnected) return;
    socketRef.current.emit('tour:subscribe', { tourId: selectedTourId });
    socketRef.current.emit('tour:last-known:request', { tourId: selectedTourId });
  }, [selectedTourId, socketConnected]);

  useEffect(() => {
    if (role !== 'guide' && trackingEnabled) stopTracking();
  }, [role, trackingEnabled, stopTracking]);

  /* ── Stale detection with periodic tick ── */
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!lastGuideUpdateTime) return;
    const iv = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(iv);
  }, [lastGuideUpdateTime]);

  const isGuideLocationStale = useMemo(() => {
    if (!lastGuideUpdateTime) return false;
    return Date.now() - lastGuideUpdateTime > 10000;
  }, [lastGuideUpdateTime, /* tick dependency is implicit via setTick rerender */]);

  /* ── Context value ── */
  const value = useMemo(() => ({
    gatewayUrl, setGatewayUrl, locationWsUrl, setLocationWsUrl,
    auth, loading, role, handleAuth, logout,
    activePage, setActivePage,
    tours, selectedTour, selectedTourId,
    loadMine, loadTourDetails, selectTour,
    createTour, joinTour, changeTourState,
    createMeetingPoint, deleteMeetingPoint,
    createPoi, deletePoi,
    socketConnected, socketStatus,
    lastGuideLocation, isGuideLocationStale, lastGuideUpdateTime,
    myLocation, setMyLocation,
    trackingEnabled, startTracking, stopTracking, emitGuideLocation,
    error, success, showError, showSuccess, clearFeedback,
  }), [
    gatewayUrl, locationWsUrl,
    auth, loading, role, handleAuth, logout,
    activePage,
    tours, selectedTour, selectedTourId,
    loadMine, loadTourDetails, selectTour,
    createTour, joinTour, changeTourState,
    createMeetingPoint, deleteMeetingPoint,
    createPoi, deletePoi,
    socketConnected, socketStatus,
    lastGuideLocation, isGuideLocationStale, lastGuideUpdateTime,
    myLocation,
    trackingEnabled, startTracking, stopTracking, emitGuideLocation,
    error, success, showError, showSuccess, clearFeedback,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
