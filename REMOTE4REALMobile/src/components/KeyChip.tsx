import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Radii } from '../theme';
import { wsService } from '../services/WebSocketService';

interface KeyChipProps {
  label: string;
  combo?: string;
  keyName?: string;
}

export const KeyChip: React.FC<KeyChipProps> = ({ label, combo, keyName }) => {
  const handlePress = () => {
    wsService.triggerHaptic();
    if (combo) {
      const keys = combo.split(',').map(s => s.trim());
      wsService.send({ t: 'key_combo', keys });
    } else if (keyName) {
      wsService.send({ t: 'key', k: keyName, act: 'tap' });
    }
  };

  return (
    <TouchableOpacity
      style={styles.chip}
      activeOpacity={0.7}
      onPress={handlePress}
    >
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1.5,
    borderColor: Colors.borderMedium,
    borderRadius: Radii.sm + 2,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '800',
    color: Colors.inkPrimary,
  },
});
