import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import TroubleshootScreen from './src/screens/TroubleshootScreen';
import ManualsScreen from './src/screens/ManualsScreen';
import ManualViewerScreen from './src/screens/ManualViewerScreen';

type Screen = 'home' | 'troubleshoot' | 'manuals' | 'manual-viewer' | 'equipment' | 'history';

interface NavState {
  screen: Screen;
  params?: { manualId?: number };
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [navState, setNavState] = useState < NavState > ({ screen: 'home' });

  const navigate = (screen: Screen, params?: NavState['params']) => {
    setNavState({ screen, params });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => navigate('home')} />;
  }

  // Simple navigation without external router
  switch (navState.screen) {
    case 'troubleshoot':
      return <TroubleshootScreen onBack={() => navigate('home')} />;
    case 'manuals':
      return (
        <ManualsScreen
          onBack={() => navigate('home')}
          onViewManual={(id) => navigate('manual-viewer', { manualId: id })}
        />
      );
    case 'manual-viewer':
      return (
        <ManualViewerScreen
          manualId={navState.params?.manualId || 0}
          onBack={() => navigate('manuals')}
        />
      );
    case 'home':
    default:
      return <HomeScreen onNavigate={(screen) => navigate(screen as Screen)} />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        <AppContent />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
});
