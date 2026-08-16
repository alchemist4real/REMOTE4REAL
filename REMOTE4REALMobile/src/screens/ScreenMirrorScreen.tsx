import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
  LayoutChangeEvent,
} from 'react-native';
import { Colors, Radii, Shadows } from '../theme';
import { wsService } from '../services/WebSocketService';
import { KeyChip } from '../components/KeyChip';

export const ScreenMirrorScreen: React.FC = () => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isFit, setIsFit] = useState(true);
  const [fps, setFps] = useState(0);
  const [showDrawer, setShowDrawer] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 360, height: 640 });

  const frameCount = useRef(0);
  const lastFpsTime = useRef(Date.now());
  const touchStartTime = useRef(0);
  const hasMoved = useRef(false);

  useEffect(() => {
    wsService.send({ t: 'screen_stream', enable: true });

    const unsubscribe = wsService.onBinaryFrame((arrayBuffer) => {
      try {
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        setImageUri(`data:image/jpeg;base64,${base64}`);

        frameCount.current++;
        const now = Date.now();
        if (now - lastFpsTime.current >= 1000) {
          setFps(frameCount.current);
          frameCount.current = 0;
          lastFpsTime.current = now;
        }
      } catch (e) {}
    });

    return () => {
      wsService.send({ t: 'screen_stream', enable: false });
      unsubscribe();
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        touchStartTime.current = Date.now();
        hasMoved.current = false;

        const normX = Math.max(0, Math.min(1, locationX / containerSize.width));
        const normY = Math.max(0, Math.min(1, locationY / containerSize.height));

        wsService.send({
          t: 'screen_touch',
          x: normX,
          y: normY,
          act: 'down',
          btn: 'left',
        });
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        hasMoved.current = true;
        const { locationX, locationY } = evt.nativeEvent;
        const normX = Math.max(0, Math.min(1, locationX / containerSize.width));
        const normY = Math.max(0, Math.min(1, locationY / containerSize.height));

        wsService.send({
          t: 'screen_touch',
          x: normX,
          y: normY,
          act: 'move',
        });
      },
      onPanResponderRelease: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const normX = Math.max(0, Math.min(1, locationX / containerSize.width));
        const normY = Math.max(0, Math.min(1, locationY / containerSize.height));

        wsService.send({
          t: 'screen_touch',
          x: normX,
          y: normY,
          act: 'up',
          btn: 'left',
        });

        if (!hasMoved.current) {
          wsService.triggerHaptic();
        }
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  const handleReconnect = () => {
    wsService.triggerHaptic();
    wsService.send({ t: 'screen_stream', enable: true });
  };

  return (
    <View style={styles.container}>
      {/* Floating Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolBtn, !isFit && styles.toolBtnActive]}
          onPress={() => setIsFit(!isFit)}
          activeOpacity={0.7}
        >
          <Text style={[styles.toolBtnText, !isFit && styles.toolBtnTextActive]}>
            {isFit ? 'FIT' : 'FILL'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => setShowDrawer(!showDrawer)}
          activeOpacity={0.7}
        >
          <Text style={styles.toolBtnText}>KEYS</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolBtn} onPress={handleReconnect} activeOpacity={0.7}>
          <Text style={styles.toolBtnText}>RECONNECT</Text>
        </TouchableOpacity>

        <Text style={styles.fpsText}>{fps} FPS</Text>
      </View>

      {/* Screen Mirror Viewport */}
      <View style={styles.viewport} onLayout={onLayout} {...panResponder.panHandlers}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={[styles.streamImage, !isFit && styles.fillImage]}
            resizeMode={isFit ? 'contain' : 'cover'}
          />
        ) : (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>STREAMING PC SCREEN...</Text>
          </View>
        )}
      </View>

      {/* Floating Keys Drawer */}
      {showDrawer && (
        <View style={styles.keysDrawer}>
          <View style={styles.keysRow}>
            <KeyChip label="ESC" keyName="esc" />
            <KeyChip label="ENTER" keyName="enter" />
            <KeyChip label="BKSP" keyName="backspace" />
            <KeyChip label="TAB" keyName="tab" />
            <KeyChip label="COPY" combo="ctrl,c" />
            <KeyChip label="PASTE" combo="ctrl,v" />
            <KeyChip label="DESKTOP" combo="win,d" />
            <KeyChip label="ALT+TAB" combo="alt,tab" />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgSubtle,
    paddingBottom: 58,
  },
  toolbar: {
    position: 'absolute',
    top: 6,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderWidth: 1.5,
    borderColor: Colors.borderDark,
    borderRadius: Radii.xs,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 4,
    zIndex: 50,
    ...Shadows.card,
  },
  toolBtn: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: Radii.xs,
  },
  toolBtnActive: {
    backgroundColor: Colors.inkPrimary,
  },
  toolBtnText: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '900',
    color: Colors.inkPrimary,
  },
  toolBtnTextActive: {
    color: Colors.inkInverse,
  },
  fpsText: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '900',
    color: Colors.inkSecondary,
    borderLeftWidth: 1.5,
    borderLeftColor: Colors.borderMedium,
    paddingLeft: 6,
  },
  viewport: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streamImage: {
    width: '100%',
    height: '100%',
  },
  fillImage: {
    width: '100%',
    height: '100%',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: 'Courier',
    fontSize: 11,
    fontWeight: '800',
    color: Colors.inkSecondary,
  },
  keysDrawer: {
    position: 'absolute',
    bottom: 66,
    left: 10,
    right: 10,
    backgroundColor: Colors.bgCard,
    borderWidth: 2,
    borderColor: Colors.borderDark,
    borderRadius: Radii.xs,
    padding: 8,
    zIndex: 60,
    ...Shadows.elevated,
  },
  keysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
});
