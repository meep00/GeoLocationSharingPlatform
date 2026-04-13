import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from './context/AppContext';
import Toast from './components/Toast';
import BottomNav from './components/BottomNav';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import ManageScreen from './screens/ManageScreen';
import SettingsScreen from './screens/SettingsScreen';
import { COLORS } from './theme';

function AppContent() {
  const {
    auth, role, activePage, setActivePage,
    error, success, clearFeedback,
  } = useApp();

  if (!auth) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <AuthScreen />
        <Toast
          message={error || success}
          type={error ? 'error' : 'success'}
          onDismiss={clearFeedback}
        />
      </SafeAreaView>
    );
  }

  const renderScreen = () => {
    switch (activePage) {
      case 'map': return <MapScreen />;
      case 'manage': return role === 'guide' ? <ManageScreen /> : <HomeScreen />;
      case 'settings': return <SettingsScreen />;
      default: return <HomeScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>GeoTour</Text>
        <Text style={styles.headerSubtitle}>
          {activePage === 'home' ? 'Dashboard' :
           activePage === 'map' ? 'Live Map' :
           activePage === 'manage' ? 'Tour Management' : 'Settings'}
        </Text>
      </View>

      {/* Screen content */}
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>

      {/* Bottom navigation */}
      <BottomNav
        activePage={activePage}
        onNavigate={setActivePage}
        role={role}
      />

      <Toast
        message={error || success}
        type={error ? 'error' : 'success'}
        onDismiss={clearFeedback}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#ffffffB0',
    fontWeight: '500',
    marginTop: 1,
  },
  screenContainer: {
    flex: 1,
  },
});
