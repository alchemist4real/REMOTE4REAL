import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { Colors, Radii, Shadows } from '../theme';
import { wsService } from '../services/WebSocketService';
import { KeyChip } from '../components/KeyChip';

export const TrackpadScreen: React.FC = () => {
  const [textInput, setTextInput] = useState('');
  const lastPanPos = useRef({ x: 0, y: 0 });
  const touchStartTime = useRef(0);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { pageX, pageY } = evt.nativeEvent;
        touchStartTime.current = Date.now();
        touchStartPos.current = { x: pageX, y: pageY };
        lastPanPos.current = { x: pageX, y: pageY };
        hasMoved.current = false;
      },
      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 1) {
          const dx = gestureState.moveX - lastPanPos.current.x;
          const dy = gestureState.moveY - lastPanPos.current.y;
          const totalDist = Math.hypot(
            gestureState.moveX - touchStartPos.current.x,
            gestureState.moveY - touchStartPos.current.y
          );

          if (totalDist > 4) hasMoved.current = true;

          if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
            wsService.send({
              t: 'touch_move',
              dx: dx * 1.3,
              dy: dy * 1.3,
            });
          }
          lastPanPos.current = { x: gestureState.moveX, y: gestureState.moveY };
        } else if (touches.length === 2) {
          hasMoved.current = true;
          const dy = gestureState.vy || gestureState.dy * 0.1;
          wsService.send({
            t: 'touch_scroll',
            dx: 0,
            dy: -dy * 0.5,
          });
        }
      },
      onPanResponderRelease: (evt: GestureResponderEvent) => {
        const duration = Date.now() - touchStartTime.current;
        if (!hasMoved.current && duration < 240) {
          wsService.triggerHaptic();
          wsService.send({ t: 'touch_click', btn: 'left', act: 'click' });
        }
      },
    })
  ).current;

  const handleMouseButton = (btn: 'left' | 'middle' | 'right', act: 'down' | 'up') => {
    wsService.triggerHaptic();
    wsService.send({ t: 'touch_click', btn, act });
  };

  const handleTextChange = (newVal: string) => {
    const oldVal = textInput;
    if (newVal.length > oldVal.length) {
      const added = newVal.slice(oldVal.length);
      wsService.send({ t: 'type_text', text: added });
      wsService.triggerHaptic();
    } else if (newVal.length < oldVal.length) {
      const diff = oldVal.length - newVal.length;
      for (let i = 0; i < diff; i++) {
        wsService.send({ t: 'key', k: 'backspace', act: 'tap' });
      }
      wsService.triggerHaptic();
    }
    setTextInput(newVal);
  };

  const handleSendEnter = () => {
    wsService.triggerHaptic();
    wsService.send({ t: 'key', k: 'enter', act: 'tap' });
  };

  const handleClear = () => {
    wsService.triggerHaptic();
    setTextInput('');
  };

  return (
    <View style={styles.container}>
      {/* Top PC Modifiers */}
      <View style={styles.modifiersSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modifierScroll}>
          <KeyChip label="COPY" combo="ctrl,c" />
          <KeyChip label="PASTE" combo="ctrl,v" />
          <KeyChip label="UNDO" combo="ctrl,z" />
          <KeyChip label="DESKTOP" combo="win,d" />
          <KeyChip label="ALT+TAB" combo="alt,tab" />
          <KeyChip label="ESC" keyName="esc" />
          <KeyChip label="TAB" keyName="tab" />
          <KeyChip label="ENTER" keyName="enter" />
          <KeyChip label="BKSP" keyName="backspace" />
        </ScrollView>
      </View>

      {/* Main Trackpad Surface */}
      <View style={styles.trackpadSurface} {...panResponder.panHandlers}>
        <View style={styles.hudPill}>
          <Text style={styles.hudText}>1-FINGER MOVE • TAP CLICK • 2-FINGER SCROLL</Text>
        </View>
      </View>

      {/* Typing Dock */}
      <View style={styles.typingDock}>
        <TextInput
          style={styles.typingInput}
          value={textInput}
          onChangeText={handleTextChange}
          placeholder="TYPE OR USE VOICE INPUT..."
          placeholderTextColor={Colors.inkTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          multiline={false}
        />
        <TouchableOpacity style={styles.enterBtn} onPress={handleSendEnter} activeOpacity={0.7}>
          <Text style={styles.enterBtnText}>OK</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.7}>
          <Text style={styles.clearBtnText}>CLR</Text>
        </TouchableOpacity>
      </View>

      {/* Left / Middle / Right Click Bar */}
      <View style={styles.mouseButtonBar}>
        <TouchableOpacity
          style={[styles.mouseBtn, styles.leftBtn]}
          activeOpacity={0.7}
          onPressIn={() => handleMouseButton('left', 'down')}
          onPressOut={() => handleMouseButton('left', 'up')}
        >
          <Text style={styles.mouseBtnMain}>LEFT CLICK</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mouseBtn, styles.midBtn]}
          activeOpacity={0.7}
          onPressIn={() => handleMouseButton('middle', 'down')}
          onPressOut={() => handleMouseButton('middle', 'up')}
        >
          <Text style={styles.mouseBtnSub}>WHEEL</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mouseBtn, styles.rightBtn]}
          activeOpacity={0.7}
          onPressIn={() => handleMouseButton('right', 'down')}
          onPressOut={() => handleMouseButton('right', 'up')}
        >
          <Text style={styles.mouseBtnMain}>RIGHT CLICK</Text>
        </TouchableOpacity>
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
    gap: 6,
  },
  modifiersSection: {
    height: 34,
  },
  modifierScroll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackpadSurface: {
    flex: 1,
    backgroundColor: Colors.bgSubtle,
    borderWidth: 2,
    borderColor: Colors.borderDark,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  hudPill: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: Radii.xs,
  },
  hudText: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '800',
    color: Colors.inkSecondary,
  },
  typingDock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderWidth: 1.5,
    borderColor: Colors.borderDark,
    borderRadius: Radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 6,
  },
  typingInput: {
    flex: 1,
    fontFamily: 'Courier',
    fontSize: 12,
    color: Colors.inkPrimary,
    paddingVertical: 6,
  },
  enterBtn: {
    backgroundColor: Colors.inkPrimary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radii.xs,
  },
  enterBtnText: {
    color: Colors.inkInverse,
    fontFamily: 'Courier',
    fontSize: 11,
    fontWeight: '900',
  },
  clearBtn: {
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: Radii.xs,
  },
  clearBtnText: {
    color: Colors.inkPrimary,
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '900',
  },
  mouseButtonBar: {
    flexDirection: 'row',
    height: 50,
    gap: 6,
  },
  mouseBtn: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderWidth: 2,
    borderColor: Colors.borderDark,
    borderRadius: Radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftBtn: { flex: 1 },
  midBtn: { flex: 0.5, backgroundColor: Colors.bgSurface },
  rightBtn: { flex: 1 },
  mouseBtnMain: {
    fontFamily: 'Courier',
    fontSize: 11,
    fontWeight: '900',
    color: Colors.inkPrimary,
    letterSpacing: 0.5,
  },
  mouseBtnSub: {
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: '800',
    color: Colors.inkSecondary,
  },
});
