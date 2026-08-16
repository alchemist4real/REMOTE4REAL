import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Animated,
} from 'react-native';
import { DeviceMotion } from 'expo-sensors';
import { Colors, Radii, Shadows } from '../theme';
import { wsService } from '../services/WebSocketService';

export const GamepadScreen: React.FC = () => {
  const [gyroActive, setGyroActive] = useState(false);
  const [ltActive, setLtActive] = useState(false);
  const [rtActive, setRtActive] = useState(false);

  const leftStickAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const rightStickAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const leftStickPos = useRef({ x: 0, y: 0 });
  const rightStickPos = useRef({ x: 0, y: 0 });

  const maxRadius = 42;
  const deadzone = 0.12;

  const leftPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        wsService.triggerHaptic();
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const dist = Math.hypot(dx, dy);
        const clampedDist = Math.min(dist, maxRadius);
        const angle = Math.atan2(dy, dx);

        const posX = Math.cos(angle) * clampedDist;
        const posY = Math.sin(angle) * clampedDist;

        leftStickAnim.setValue({ x: posX, y: posY });

        let normX = posX / maxRadius;
        let normY = posY / maxRadius;
        if (dist / maxRadius < deadzone) {
          normX = 0;
          normY = 0;
        }

        leftStickPos.current = { x: normX, y: normY };
        wsService.send({ t: 'gp_stick', stick: 'left', x: normX, y: normY });
      },
      onPanResponderRelease: () => {
        Animated.spring(leftStickAnim, {
          toValue: { x: 0, y: 0 },
          friction: 5,
          tension: 80,
          useNativeDriver: false,
        }).start();
        leftStickPos.current = { x: 0, y: 0 };
        wsService.send({ t: 'gp_stick', stick: 'left', x: 0, y: 0 });
      },
    })
  ).current;

  const rightPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        wsService.triggerHaptic();
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const dist = Math.hypot(dx, dy);
        const clampedDist = Math.min(dist, maxRadius);
        const angle = Math.atan2(dy, dx);

        const posX = Math.cos(angle) * clampedDist;
        const posY = Math.sin(angle) * clampedDist;

        rightStickAnim.setValue({ x: posX, y: posY });

        let normX = posX / maxRadius;
        let normY = posY / maxRadius;
        if (dist / maxRadius < deadzone) {
          normX = 0;
          normY = 0;
        }

        rightStickPos.current = { x: normX, y: normY };
        wsService.send({ t: 'gp_stick', stick: 'right', x: normX, y: normY });
      },
      onPanResponderRelease: () => {
        Animated.spring(rightStickAnim, {
          toValue: { x: 0, y: 0 },
          friction: 5,
          tension: 80,
          useNativeDriver: false,
        }).start();
        rightStickPos.current = { x: 0, y: 0 };
        wsService.send({ t: 'gp_stick', stick: 'right', x: 0, y: 0 });
      },
    })
  ).current;

  const handleButton = (btn: string, act: 'down' | 'up') => {
    wsService.triggerHaptic();
    wsService.send({ t: 'gp_btn', btn, act });
  };

  const handleTrigger = (trig: 'lt' | 'rt', isDown: boolean) => {
    wsService.triggerHaptic();
    if (trig === 'lt') setLtActive(isDown);
    if (trig === 'rt') setRtActive(isDown);
    wsService.send({ t: 'gp_trigger', trig, v: isDown ? 1.0 : 0.0 });
  };

  useEffect(() => {
    let sub: any = null;
    if (gyroActive) {
      DeviceMotion.setUpdateInterval(30);
      sub = DeviceMotion.addListener((motionData) => {
        if (motionData.rotation && motionData.rotation.gamma !== undefined) {
          const gammaDeg = (motionData.rotation.gamma * 180) / Math.PI;
          wsService.send({ t: 'gyro', gamma: gammaDeg });
        }
      });
    } else {
      wsService.send({ t: 'gyro', gamma: 0 });
    }

    return () => {
      if (sub) sub.remove();
    };
  }, [gyroActive]);

  return (
    <View style={styles.container}>
      {/* Shoulder Triggers */}
      <View style={styles.shouldersRow}>
        <View style={styles.shoulderGroup}>
          <TouchableOpacity
            style={[styles.shoulderBtn, ltActive && styles.shoulderBtnActive]}
            activeOpacity={0.8}
            onPressIn={() => handleTrigger('lt', true)}
            onPressOut={() => handleTrigger('lt', false)}
          >
            <Text style={[styles.shoulderBtnText, ltActive && styles.shoulderBtnTextActive]}>LT</Text>
            <View style={styles.gaugeTrack}>
              <View style={[styles.gaugeFill, { width: ltActive ? '100%' : '0%' }]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shoulderBtn}
            activeOpacity={0.7}
            onPressIn={() => handleButton('lb', 'down')}
            onPressOut={() => handleButton('lb', 'up')}
          >
            <Text style={styles.shoulderBtnText}>LB</Text>
          </TouchableOpacity>
        </View>

        {/* Center Cluster */}
        <View style={styles.centerGroup}>
          <TouchableOpacity
            style={styles.centerBtn}
            activeOpacity={0.7}
            onPress={() => {
              handleButton('select', 'down');
              setTimeout(() => handleButton('select', 'up'), 100);
            }}
          >
            <Text style={styles.centerBtnText}>BACK</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.centerBtn}
            activeOpacity={0.7}
            onPress={() => {
              handleButton('home', 'down');
              setTimeout(() => handleButton('home', 'up'), 100);
            }}
          >
            <Text style={styles.centerBtnText}>WIN</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.centerBtn}
            activeOpacity={0.7}
            onPress={() => {
              handleButton('start', 'down');
              setTimeout(() => handleButton('start', 'up'), 100);
            }}
          >
            <Text style={styles.centerBtnText}>START</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.centerBtn, gyroActive && styles.centerBtnActive]}
            activeOpacity={0.7}
            onPress={() => setGyroActive(!gyroActive)}
          >
            <Text style={[styles.centerBtnText, gyroActive && styles.centerBtnTextActive]}>GYRO</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.shoulderGroup, styles.rightShoulderGroup]}>
          <TouchableOpacity
            style={styles.shoulderBtn}
            activeOpacity={0.7}
            onPressIn={() => handleButton('rb', 'down')}
            onPressOut={() => handleButton('rb', 'up')}
          >
            <Text style={styles.shoulderBtnText}>RB</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shoulderBtn, rtActive && styles.shoulderBtnActive]}
            activeOpacity={0.8}
            onPressIn={() => handleTrigger('rt', true)}
            onPressOut={() => handleTrigger('rt', false)}
          >
            <Text style={[styles.shoulderBtnText, rtActive && styles.shoulderBtnTextActive]}>RT</Text>
            <View style={styles.gaugeTrack}>
              <View style={[styles.gaugeFill, { width: rtActive ? '100%' : '0%' }]} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Dual Pods */}
      <View style={styles.mainPodsArea}>
        
        {/* Left Pod */}
        <View style={styles.pod}>
          <View style={styles.joystickBase} {...leftPanResponder.panHandlers}>
            <View style={styles.crosshairRing} />
            <Animated.View
              style={[
                styles.joystickNipple,
                { transform: [{ translateX: leftStickAnim.x }, { translateY: leftStickAnim.y }] },
              ]}
            >
              <View style={styles.nippleRing} />
              <Text style={styles.nippleLabel}>L3</Text>
            </Animated.View>
          </View>

          <View style={styles.dpadCluster}>
            <TouchableOpacity
              style={[styles.dpadBtn, styles.dpadUp]}
              activeOpacity={0.7}
              onPressIn={() => handleButton('dpad_up', 'down')}
              onPressOut={() => handleButton('dpad_up', 'up')}
            >
              <Text style={styles.dpadArrow}>U</Text>
            </TouchableOpacity>
            <View style={styles.dpadMiddleRow}>
              <TouchableOpacity
                style={[styles.dpadBtn, styles.dpadLeft]}
                activeOpacity={0.7}
                onPressIn={() => handleButton('dpad_left', 'down')}
                onPressOut={() => handleButton('dpad_left', 'up')}
              >
                <Text style={styles.dpadArrow}>L</Text>
              </TouchableOpacity>
              <View style={styles.dpadCenterHub} />
              <TouchableOpacity
                style={[styles.dpadBtn, styles.dpadRight]}
                activeOpacity={0.7}
                onPressIn={() => handleButton('dpad_right', 'down')}
                onPressOut={() => handleButton('dpad_right', 'up')}
              >
                <Text style={styles.dpadArrow}>R</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.dpadBtn, styles.dpadDown]}
              activeOpacity={0.7}
              onPressIn={() => handleButton('dpad_down', 'down')}
              onPressOut={() => handleButton('dpad_down', 'up')}
            >
              <Text style={styles.dpadArrow}>D</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Pod */}
        <View style={styles.pod}>
          <View style={styles.abxyCluster}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.abxyY]}
              activeOpacity={0.7}
              onPressIn={() => handleButton('y', 'down')}
              onPressOut={() => handleButton('y', 'up')}
            >
              <Text style={styles.actionBtnText}>Y</Text>
            </TouchableOpacity>
            <View style={styles.abxyMiddleRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.abxyX]}
                activeOpacity={0.7}
                onPressIn={() => handleButton('x', 'down')}
                onPressOut={() => handleButton('x', 'up')}
              >
                <Text style={styles.actionBtnText}>X</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.abxyB]}
                activeOpacity={0.7}
                onPressIn={() => handleButton('b', 'down')}
                onPressOut={() => handleButton('b', 'up')}
              >
                <Text style={styles.actionBtnText}>B</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.actionBtn, styles.abxyA]}
              activeOpacity={0.7}
              onPressIn={() => handleButton('a', 'down')}
              onPressOut={() => handleButton('a', 'up')}
            >
              <Text style={styles.actionBtnText}>A</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.joystickBase} {...rightPanResponder.panHandlers}>
            <View style={styles.crosshairRing} />
            <Animated.View
              style={[
                styles.joystickNipple,
                { transform: [{ translateX: rightStickAnim.x }, { translateY: rightStickAnim.y }] },
              ]}
            >
              <View style={styles.nippleRing} />
              <Text style={styles.nippleLabel}>R3</Text>
            </Animated.View>
          </View>
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgVoid,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 58,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  shouldersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  shoulderGroup: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  rightShoulderGroup: {
    justifyContent: 'flex-end',
  },
  shoulderBtn: {
    width: 58,
    height: 38,
    backgroundColor: Colors.bgCard,
    borderWidth: 2,
    borderColor: Colors.borderDark,
    borderRadius: Radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shoulderBtnActive: {
    backgroundColor: Colors.inkPrimary,
  },
  shoulderBtnText: {
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '900',
    color: Colors.inkPrimary,
  },
  shoulderBtnTextActive: {
    color: Colors.inkInverse,
  },
  gaugeTrack: {
    width: '70%',
    height: 2,
    backgroundColor: Colors.borderLight,
    borderRadius: 1,
    marginTop: 2,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    backgroundColor: Colors.inkPrimary,
  },
  centerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  centerBtn: {
    backgroundColor: Colors.bgSurface,
    borderWidth: 1.5,
    borderColor: Colors.borderDark,
    borderRadius: Radii.xs,
    paddingVertical: 5,
    paddingHorizontal: 7,
  },
  centerBtnActive: {
    backgroundColor: Colors.inkPrimary,
  },
  centerBtnText: {
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: '900',
    color: Colors.inkSecondary,
  },
  centerBtnTextActive: {
    color: Colors.inkInverse,
  },
  mainPodsArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
    overflow: 'hidden',
  },
  pod: {
    alignItems: 'center',
    justifyContent: 'space-around',
    height: '100%',
    flex: 1,
  },
  joystickBase: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: Colors.bgSurface,
    borderWidth: 2,
    borderColor: Colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  crosshairRing: {
    position: 'absolute',
    width: '78%',
    height: '78%',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  joystickNipple: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.inkPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  nippleRing: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  nippleLabel: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '900',
    color: Colors.inkInverse,
  },
  dpadCluster: {
    alignItems: 'center',
    width: 108,
  },
  dpadMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dpadCenterHub: {
    width: 32,
    height: 32,
    backgroundColor: Colors.bgSurface,
  },
  dpadBtn: {
    width: 32,
    height: 32,
    backgroundColor: Colors.bgCard,
    borderWidth: 2,
    borderColor: Colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadUp: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  dpadDown: { borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  dpadLeft: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  dpadRight: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  dpadArrow: {
    fontFamily: 'Courier',
    fontSize: 11,
    fontWeight: '900',
    color: Colors.inkPrimary,
  },
  abxyCluster: {
    alignItems: 'center',
    width: 116,
  },
  abxyMiddleRow: {
    flexDirection: 'row',
    gap: 30,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    borderWidth: 2,
    borderColor: Colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abxyY: { marginBottom: 2 },
  abxyA: { marginTop: 2 },
  abxyX: {},
  abxyB: {},
  actionBtnText: {
    fontFamily: 'Courier',
    fontSize: 15,
    fontWeight: '900',
    color: Colors.inkPrimary,
  },
});
