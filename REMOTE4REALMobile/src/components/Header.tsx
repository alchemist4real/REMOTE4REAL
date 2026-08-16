import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Colors, Radii, Shadows } from '../theme';
import { wsService } from '../services/WebSocketService';

interface HeaderProps {
  currentIp: string;
  onIpChange: (ip: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentIp, onIpChange }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ping, setPing] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [ipInput, setIpInput] = useState(currentIp);
  const [pinInput, setPinInput] = useState('');
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    return wsService.onStatusChange((connected, pingMs, auth) => {
      setIsConnected(connected);
      setPing(pingMs);
      setIsAuthenticated(auth);
      if (connected && !auth) {
        setModalVisible(true);
      }
    });
  }, []);

  const toggleOrientation = async () => {
    wsService.triggerHaptic();
    try {
      if (!isLandscape) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
        setIsLandscape(true);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setIsLandscape(false);
      }
    } catch (e) {}
  };

  const handleConnect = () => {
    wsService.triggerHaptic();
    if (pinInput.trim()) {
      wsService.setPin(pinInput.trim());
    }
    onIpChange(ipInput.trim());
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandGroup}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>R4</Text>
        </View>
        <Text style={styles.brandTitle}>REMOTE4REAL</Text>
      </View>

      <View style={styles.actionsGroup}>
        <TouchableOpacity
          style={[styles.statusPill, isConnected && isAuthenticated ? styles.statusConnected : styles.statusDisconnected]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.dot, { backgroundColor: isConnected && isAuthenticated ? Colors.inkPrimary : Colors.accentRed }]} />
          <Text style={styles.statusText}>
            {!isConnected ? 'OFFLINE' : !isAuthenticated ? 'NEED PIN' : `${ping}MS`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={toggleOrientation} activeOpacity={0.7}>
          <Text style={styles.btnLabel}>ROTATE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => setModalVisible(true)} activeOpacity={0.7}>
          <Text style={styles.btnLabel}>CONNECT</Text>
        </TouchableOpacity>
      </View>

      {/* IP & PIN Connection Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CONNECT & SECURITY PIN</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtn}>X</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>PC HOST IP (e.g. 192.168.2.62):</Text>
            <TextInput
              style={styles.input}
              value={ipInput}
              onChangeText={setIpInput}
              placeholder="192.168.2.62"
              placeholderTextColor={Colors.inkTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.inputLabel}>4-DIGIT SECURITY PIN:</Text>
            <TextInput
              style={styles.input}
              value={pinInput}
              onChangeText={setPinInput}
              placeholder="ENTER PIN (e.g. 8492)"
              placeholderTextColor={Colors.inkTertiary}
              autoCapitalize="none"
              keyboardType="number-pad"
              maxLength={8}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleConnect} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>AUTHORIZE & CONNECT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: Colors.bgVoid,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.borderDark,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 24,
    height: 24,
    borderRadius: 3,
    backgroundColor: Colors.inkPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  logoText: {
    color: Colors.inkInverse,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'Courier',
  },
  brandTitle: {
    fontFamily: 'Courier',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    color: Colors.inkPrimary,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: Radii.xs,
    borderWidth: 1.5,
    borderColor: Colors.borderDark,
    backgroundColor: Colors.bgCard,
    gap: 4,
  },
  statusConnected: {},
  statusDisconnected: {},
  dot: {
    width: 6,
    height: 6,
    borderRadius: 1,
  },
  statusText: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '800',
    color: Colors.inkPrimary,
  },
  actionBtn: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1.5,
    borderColor: Colors.borderDark,
    height: 28,
    paddingHorizontal: 7,
    borderRadius: Radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '800',
    color: Colors.inkPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.bgCard,
    borderWidth: 2,
    borderColor: Colors.borderDark,
    borderRadius: Radii.sm,
    padding: 16,
    ...Shadows.elevated,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: 'Courier',
    fontSize: 13,
    fontWeight: '900',
    color: Colors.inkPrimary,
  },
  closeBtn: {
    fontFamily: 'Courier',
    fontSize: 14,
    fontWeight: '900',
    color: Colors.inkPrimary,
  },
  inputLabel: {
    fontFamily: 'Courier',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.inkSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.bgSubtle,
    borderWidth: 1.5,
    borderColor: Colors.borderDark,
    borderRadius: Radii.xs,
    padding: 8,
    fontSize: 12,
    color: Colors.inkPrimary,
    fontFamily: 'Courier',
    marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: Colors.inkPrimary,
    borderRadius: Radii.xs,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: Colors.inkInverse,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'Courier',
  },
});
