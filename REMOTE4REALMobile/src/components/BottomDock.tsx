import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radii, Shadows } from '../theme';
import { wsService } from '../services/WebSocketService';

export type ModeType = 'touchpad' | 'screen' | 'media' | 'gamepad';

interface BottomDockProps {
  activeMode: ModeType;
  onSelectMode: (mode: ModeType) => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({ activeMode, onSelectMode }) => {
  const tabs = [
    { id: 'touchpad' as ModeType, label: 'TRACKPAD' },
    { id: 'screen' as ModeType, label: 'SCREEN' },
    { id: 'media' as ModeType, label: 'MEDIA' },
    { id: 'gamepad' as ModeType, label: 'GAMEPAD' },
  ];

  const handleTabPress = (mode: ModeType) => {
    wsService.triggerHaptic();
    onSelectMode(mode);
    wsService.send({ t: 'mode', mode });
  };

  return (
    <View style={styles.dockWrapper}>
      <View style={styles.dockContainer}>
        {tabs.map(tab => {
          const isActive = activeMode === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.dockItem, isActive && styles.dockItemActive]}
              activeOpacity={0.8}
              onPress={() => handleTabPress(tab.id)}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    bottom: 6,
    left: 10,
    right: 10,
    alignItems: 'center',
    zIndex: 90,
  },
  dockContainer: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.bgCard,
    borderWidth: 2,
    borderColor: Colors.borderDark,
    borderRadius: Radii.sm,
    padding: 3,
    gap: 3,
    ...Shadows.card,
  },
  dockItem: {
    flex: 1,
    height: 40,
    borderRadius: Radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockItemActive: {
    backgroundColor: Colors.inkPrimary,
  },
  tabLabel: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '900',
    color: Colors.inkSecondary,
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: Colors.inkInverse,
  },
});
