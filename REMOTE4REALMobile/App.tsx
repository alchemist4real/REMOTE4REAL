import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Colors } from './src/theme';
import { wsService } from './src/services/WebSocketService';
import { Header } from './src/components/Header';
import { BottomDock, ModeType } from './src/components/BottomDock';
import { TrackpadScreen } from './src/screens/TrackpadScreen';
import { ScreenMirrorScreen } from './src/screens/ScreenMirrorScreen';
import { MediaScreen } from './src/screens/MediaScreen';
import { GamepadScreen } from './src/screens/GamepadScreen';

export default function App() {
  const [activeMode, setActiveMode] = useState<ModeType>('touchpad');
  const [serverIp, setServerIp] = useState('192.168.1.100');

  useEffect(() => {
    // Initial connection attempt
    wsService.connect(serverIp, 8765);
    return () => {
      wsService.disconnect(true);
    };
  }, []);

  const handleIpChange = (newIp: string) => {
    setServerIp(newIp);
    wsService.connect(newIp, 8765);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgVoid} />
      <View style={styles.appContainer}>
        {/* Top Minimalist Header */}
        <Header currentIp={serverIp} onIpChange={handleIpChange} />

        {/* Dynamic Screen View */}
        <View style={styles.screenContainer}>
          {activeMode === 'touchpad' && <TrackpadScreen />}
          {activeMode === 'screen' && <ScreenMirrorScreen />}
          {activeMode === 'media' && <MediaScreen />}
          {activeMode === 'gamepad' && <GamepadScreen />}
        </View>

        {/* Ergonomic Bottom Navigation Dock */}
        <BottomDock activeMode={activeMode} onSelectMode={setActiveMode} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bgVoid,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  appContainer: {
    flex: 1,
    backgroundColor: Colors.bgVoid,
    position: 'relative',
  },
  screenContainer: {
    flex: 1,
  },
});
