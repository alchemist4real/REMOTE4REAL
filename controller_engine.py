"""
REMOTE4REAL — Windows Input Engine
Supports:
1. Low-level Win32 ctypes SendInput (zero-latency mouse & hardware keyboard scan codes)
2. Absolute pixel-perfect touchscreen cursor positioning & click
3. Dedicated YouTube & Spotify launchers and hotkey automation
4. Unicode text typing (for mobile voice-to-text / direct typing)
5. Virtual Xbox 360 controller emulation via vgamepad (if available)
6. DirectX-compatible Gamepad keyboard/mouse mapping profiles
"""

import os
import sys
import time
import math
import ctypes
import webbrowser
import urllib.parse
from ctypes import wintypes
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Windows Win32 Constants
INPUT_MOUSE = 0
INPUT_KEYBOARD = 1
INPUT_HARDWARE = 2

# Mouse flags
MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010
MOUSEEVENTF_MIDDLEDOWN = 0x0020
MOUSEEVENTF_MIDDLEUP = 0x0040
MOUSEEVENTF_WHEEL = 0x0800
MOUSEEVENTF_HWHEEL = 0x01000
MOUSEEVENTF_ABSOLUTE = 0x8000

# Keyboard flags
KEYEVENTF_EXTENDEDKEY = 0x0001
KEYEVENTF_KEYUP = 0x0002
KEYEVENTF_UNICODE = 0x0004
KEYEVENTF_SCANCODE = 0x0008

class MOUSEINPUT(ctypes.Structure):
    _fields_ = [
        ("dx", wintypes.LONG),
        ("dy", wintypes.LONG),
        ("mouseData", wintypes.DWORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.POINTER(wintypes.ULONG))
    ]

class KEYBDINPUT(ctypes.Structure):
    _fields_ = [
        ("wVk", wintypes.WORD),
        ("wScan", wintypes.WORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.POINTER(wintypes.ULONG))
    ]

class HARDWAREINPUT(ctypes.Structure):
    _fields_ = [
        ("uMsg", wintypes.DWORD),
        ("wParamL", wintypes.WORD),
        ("wParamH", wintypes.WORD)
    ]

class INPUT_UNION(ctypes.Union):
    _fields_ = [
        ("mi", MOUSEINPUT),
        ("ki", KEYBDINPUT),
        ("hi", HARDWAREINPUT)
    ]

class INPUT(ctypes.Structure):
    _fields_ = [
        ("type", wintypes.DWORD),
        ("union", INPUT_UNION)
    ]

try:
    user32 = ctypes.windll.user32
    SendInput = user32.SendInput
    SendInput.argtypes = (wintypes.UINT, ctypes.POINTER(INPUT), ctypes.c_int)
    SendInput.restype = wintypes.UINT
    MapVirtualKeyW = user32.MapVirtualKeyW
    MapVirtualKeyW.argtypes = (wintypes.UINT, wintypes.UINT)
    MapVirtualKeyW.restype = wintypes.UINT
    SetCursorPos = user32.SetCursorPos
    SetCursorPos.argtypes = (ctypes.c_int, ctypes.c_int)
    SetCursorPos.restype = wintypes.BOOL
    IS_WINDOWS = True
except Exception as e:
    logging.warning(f"Not running on standard Windows or SendInput unavailable: {e}")
    IS_WINDOWS = False

# Hardware Scan Codes (DirectX Game Compatible)
SCAN_CODES = {
    'escape': 0x01, 'esc': 0x01,
    '1': 0x02, '2': 0x03, '3': 0x04, '4': 0x05, '5': 0x06,
    '6': 0x07, '7': 0x08, '8': 0x09, '9': 0x0A, '0': 0x0B,
    '-': 0x0C, '=': 0x0D, 'backspace': 0x0E, 'bksp': 0x0E,
    'tab': 0x0F,
    'q': 0x10, 'w': 0x11, 'e': 0x12, 'r': 0x13, 't': 0x14,
    'y': 0x15, 'u': 0x16, 'i': 0x17, 'o': 0x18, 'p': 0x19,
    '[': 0x1A, ']': 0x1B, 'enter': 0x1C, 'return': 0x1C,
    'ctrl': 0x1D, 'control': 0x1D, 'lctrl': 0x1D,
    'a': 0x1E, 's': 0x1F, 'd': 0x20, 'f': 0x21, 'g': 0x22,
    'h': 0x23, 'j': 0x24, 'k': 0x25, 'l': 0x26,
    ';': 0x27, "'": 0x28, '`': 0x29,
    'shift': 0x2A, 'lshift': 0x2A,
    '\\': 0x2B, 'z': 0x2C, 'x': 0x2D, 'c': 0x2E, 'v': 0x2F,
    'b': 0x30, 'n': 0x31, 'm': 0x32, ',': 0x33, '.': 0x34,
    '/': 0x35, 'rshift': 0x36,
    'alt': 0x38, 'lalt': 0x38,
    'space': 0x39, ' ': 0x39,
    'capslock': 0x3A,
    'f1': 0x3B, 'f2': 0x3C, 'f3': 0x3D, 'f4': 0x3E, 'f5': 0x3F,
    'f6': 0x40, 'f7': 0x41, 'f8': 0x42, 'f9': 0x43, 'f10': 0x44,
    'numlock': 0x45, 'scrolllock': 0x46,
    'f11': 0x57, 'f12': 0x58,
    'win': 0x5B, 'windows': 0x5B, 'lwin': 0x5B,
    'rwin': 0x5C, 'apps': 0x5D,
    'up': 0x48, 'down': 0x50, 'left': 0x4B, 'right': 0x4D,
    'insert': 0x52, 'delete': 0x53, 'del': 0x53,
    'home': 0x47, 'end': 0x4F,
    'pageup': 0x49, 'pgup': 0x49,
    'pagedown': 0x51, 'pgdn': 0x51,
    'prtscn': 0x37, 'printscreen': 0x37
}

# Virtual Key (VK) Fallbacks
VK_CODES = {
    'volume_mute': 0xAD,
    'volume_down': 0xAE,
    'volume_up': 0xAF,
    'media_next': 0xB0,
    'media_prev': 0xB1,
    'media_stop': 0xB2,
    'media_play_pause': 0xB3,
    'browser_back': 0xA6,
    'browser_forward': 0xA7,
    'browser_refresh': 0xA8,
    'browser_home': 0xAC,
}

VGAMEPAD_AVAILABLE = False
try:
    import vgamepad as vg
    VGAMEPAD_AVAILABLE = True
    logging.info("vgamepad is available: Virtual Xbox 360 Controller enabled!")
except Exception:
    logging.info("vgamepad not installed: Using high-speed DirectX Keyboard/Mouse mapping for Gamepad mode.")


class WindowsInputController:
    def __init__(self):
        self.held_keys = set()
        self.mouse_buttons_held = set()
        self.touchpad_sensitivity = 1.2
        self.touchpad_acceleration = 1.1
        self.scroll_sensitivity = 1.0
        
        self.update_screen_metrics()
        
        # Virtual Gamepad state
        self.gamepad_mode = "keyboard_directx"
        self.vx360 = None
        if VGAMEPAD_AVAILABLE:
            try:
                self.vx360 = vg.VX360Gamepad()
                self.gamepad_mode = "xinput"
            except Exception as e:
                logging.warning(f"Could not initialize VX360Gamepad: {e}")
        
        self.gamepad_key_map = {
            'a': 'space',
            'b': 'c',
            'x': 'r',
            'y': 'e',
            'lb': 'lshift',
            'rb': 'f',
            'lt': 'mouse_right',
            'rt': 'mouse_left',
            'start': 'escape',
            'select': 'tab',
            'home': 'win',
            'l3': 'lctrl',
            'r3': 'v',
            'dpad_up': 'up',
            'dpad_down': 'down',
            'dpad_left': 'left',
            'dpad_right': 'right'
        }
        
        self.active_wasd = {'w': False, 's': False, 'a': False, 'd': False}

    def update_screen_metrics(self):
        if IS_WINDOWS:
            self.screen_width = user32.GetSystemMetrics(0)
            self.screen_height = user32.GetSystemMetrics(1)
        else:
            self.screen_width = 1920
            self.screen_height = 1080

    # ==========================================
    # LAUNCHERS: YOUTUBE & SPOTIFY
    # ==========================================
    def launch_youtube(self, query: str = ""):
        """Launch YouTube in PC default browser or search for a specific query."""
        if query and query.strip():
            url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(query.strip())}"
        else:
            url = "https://www.youtube.com"
        logging.info(f"Opening YouTube on PC: {url}")
        webbrowser.open(url)

    def launch_spotify(self):
        """Launch Spotify Desktop app via URI scheme with web fallback."""
        logging.info("Launching Spotify app on PC...")
        try:
            os.startfile("spotify:")
        except Exception:
            webbrowser.open("https://open.spotify.com")

    # ==========================================
    # ABSOLUTE TOUCHSCREEN LAPTOP METHODS
    # ==========================================
    def move_mouse_absolute(self, x_ratio: float, y_ratio: float):
        if not IS_WINDOWS:
            return
        target_x = int(max(0, min(self.screen_width - 1, x_ratio * self.screen_width)))
        target_y = int(max(0, min(self.screen_height - 1, y_ratio * self.screen_height)))
        SetCursorPos(target_x, target_y)

    def mouse_touch_absolute(self, x_ratio: float, y_ratio: float, button: str = 'left', action: str = 'click'):
        if not IS_WINDOWS:
            return
        self.move_mouse_absolute(x_ratio, y_ratio)
        self.mouse_click(button, action)

    # ==========================================
    # MOUSE & TOUCHPAD METHODS
    # ==========================================
    def move_mouse_relative(self, dx: float, dy: float):
        if not IS_WINDOWS:
            return
        dist = math.hypot(dx, dy)
        factor = self.touchpad_sensitivity
        if dist > 3.0:
            factor *= (1.0 + (dist / 100.0) * (self.touchpad_acceleration - 1.0))
            
        final_dx = int(round(dx * factor))
        final_dy = int(round(dy * factor))
        
        if final_dx == 0 and dx != 0:
            final_dx = 1 if dx > 0 else -1
        if final_dy == 0 and dy != 0:
            final_dy = 1 if dy > 0 else -1

        extra = ctypes.c_ulong(0)
        ii = INPUT_UNION()
        ii.mi = MOUSEINPUT(final_dx, final_dy, 0, MOUSEEVENTF_MOVE, 0, ctypes.pointer(extra))
        input_obj = INPUT(INPUT_MOUSE, ii)
        SendInput(1, ctypes.pointer(input_obj), ctypes.sizeof(input_obj))

    def mouse_click(self, button: str = 'left', action: str = 'click'):
        if not IS_WINDOWS:
            return
        btn = button.lower()
        down_flag = 0
        up_flag = 0
        
        if btn == 'left':
            down_flag = MOUSEEVENTF_LEFTDOWN
            up_flag = MOUSEEVENTF_LEFTUP
        elif btn == 'right':
            down_flag = MOUSEEVENTF_RIGHTDOWN
            up_flag = MOUSEEVENTF_RIGHTUP
        elif btn == 'middle':
            down_flag = MOUSEEVENTF_MIDDLEDOWN
            up_flag = MOUSEEVENTF_MIDDLEUP
        else:
            return

        extra = ctypes.c_ulong(0)
        if action in ('down', 'click'):
            ii = INPUT_UNION()
            ii.mi = MOUSEINPUT(0, 0, 0, down_flag, 0, ctypes.pointer(extra))
            input_obj = INPUT(INPUT_MOUSE, ii)
            SendInput(1, ctypes.pointer(input_obj), ctypes.sizeof(input_obj))
            self.mouse_buttons_held.add(btn)
            
        if action == 'click':
            time.sleep(0.015)
            
        if action in ('up', 'click'):
            ii = INPUT_UNION()
            ii.mi = MOUSEINPUT(0, 0, 0, up_flag, 0, ctypes.pointer(extra))
            input_obj = INPUT(INPUT_MOUSE, ii)
            SendInput(1, ctypes.pointer(input_obj), ctypes.sizeof(input_obj))
            self.mouse_buttons_held.discard(btn)

    def mouse_scroll(self, dx: float = 0, dy: float = 0):
        if not IS_WINDOWS:
            return
        extra = ctypes.c_ulong(0)
        if dy != 0:
            scroll_amount = int(round(dy * 120 * self.scroll_sensitivity))
            ii = INPUT_UNION()
            ii.mi = MOUSEINPUT(0, 0, scroll_amount, MOUSEEVENTF_WHEEL, 0, ctypes.pointer(extra))
            input_obj = INPUT(INPUT_MOUSE, ii)
            SendInput(1, ctypes.pointer(input_obj), ctypes.sizeof(input_obj))
            
        if dx != 0:
            scroll_amount = int(round(dx * 120 * self.scroll_sensitivity))
            ii = INPUT_UNION()
            ii.mi = MOUSEINPUT(0, 0, scroll_amount, MOUSEEVENTF_HWHEEL, 0, ctypes.pointer(extra))
            input_obj = INPUT(INPUT_MOUSE, ii)
            SendInput(1, ctypes.pointer(input_obj), ctypes.sizeof(input_obj))

    # ==========================================
    # KEYBOARD & SHORTCUT METHODS
    # ==========================================
    def key_event(self, key_name: str, action: str = 'tap'):
        if not IS_WINDOWS:
            return
        key_name = key_name.lower().strip()
        
        if key_name in ('mouse_left', 'mouse_right', 'mouse_middle'):
            self.mouse_click(key_name.replace('mouse_', ''), action)
            return

        if key_name in SCAN_CODES:
            scan_code = SCAN_CODES[key_name]
            flags = KEYEVENTF_SCANCODE
            if key_name in ('up', 'down', 'left', 'right', 'insert', 'delete', 'home', 'end', 'pageup', 'pagedown', 'rctrl', 'rwin', 'apps'):
                flags |= KEYEVENTF_EXTENDEDKEY

            extra = ctypes.c_ulong(0)
            if action in ('down', 'tap'):
                ii = INPUT_UNION()
                ii.ki = KEYBDINPUT(0, scan_code, flags, 0, ctypes.pointer(extra))
                input_obj = INPUT(INPUT_KEYBOARD, ii)
                SendInput(1, ctypes.pointer(input_obj), ctypes.sizeof(input_obj))
                self.held_keys.add(key_name)
                
            if action == 'tap':
                time.sleep(0.015)
                
            if action in ('up', 'tap'):
                ii = INPUT_UNION()
                ii.ki = KEYBDINPUT(0, scan_code, flags | KEYEVENTF_KEYUP, 0, ctypes.pointer(extra))
                input_obj = INPUT(INPUT_KEYBOARD, ii)
                SendInput(1, ctypes.pointer(input_obj), ctypes.sizeof(input_obj))
                self.held_keys.discard(key_name)
            return

        if key_name in VK_CODES:
            vk_code = VK_CODES[key_name]
            extra = ctypes.c_ulong(0)
            if action in ('down', 'tap'):
                ii = INPUT_UNION()
                ii.ki = KEYBDINPUT(vk_code, 0, KEYEVENTF_EXTENDEDKEY, 0, ctypes.pointer(extra))
                input_obj = INPUT(INPUT_KEYBOARD, ii)
                SendInput(1, ctypes.pointer(input_obj), ctypes.sizeof(input_obj))
                self.held_keys.add(key_name)
                
            if action == 'tap':
                time.sleep(0.015)
                
            if action in ('up', 'tap'):
                ii = INPUT_UNION()
                ii.ki = KEYBDINPUT(vk_code, 0, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, 0, ctypes.pointer(extra))
                input_obj = INPUT(INPUT_KEYBOARD, ii)
                SendInput(1, ctypes.pointer(input_obj), ctypes.sizeof(input_obj))
                self.held_keys.discard(key_name)
            return

        if len(key_name) == 1:
            self.type_text(key_name)

    def key_combination(self, keys: list):
        for k in keys:
            self.key_event(k, 'down')
        time.sleep(0.02)
        for k in reversed(keys):
            self.key_event(k, 'up')

    def type_text(self, text: str):
        if not IS_WINDOWS:
            return
        extra = ctypes.c_ulong(0)
        for char in text:
            code = ord(char)
            ii_down = INPUT_UNION()
            ii_down.ki = KEYBDINPUT(0, code, KEYEVENTF_UNICODE, 0, ctypes.pointer(extra))
            input_down = INPUT(INPUT_KEYBOARD, ii_down)
            SendInput(1, ctypes.pointer(input_down), ctypes.sizeof(input_down))
            
            ii_up = INPUT_UNION()
            ii_up.ki = KEYBDINPUT(0, code, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP, 0, ctypes.pointer(extra))
            input_up = INPUT(INPUT_KEYBOARD, ii_up)
            SendInput(1, ctypes.pointer(input_up), ctypes.sizeof(input_up))
            time.sleep(0.002)

    # ==========================================
    # YOUTUBE & SPOTIFY CONTROLLER SHORTCUTS
    # ==========================================
    def handle_youtube_command(self, cmd: str, query: str = ""):
        cmd = cmd.lower().strip()
        if cmd == "launch":
            self.launch_youtube(query)
        elif cmd == "search":
            if query:
                self.launch_youtube(query)
            else:
                self.launch_youtube()
        elif cmd == "search_in_tab":
            # Press '/' to focus YouTube search box, clear existing text if needed, type query, press Enter
            self.key_event('/', 'tap')
            time.sleep(0.08)
            if query:
                self.key_combination(['ctrl', 'a'])
                time.sleep(0.02)
                self.type_string(query)
                time.sleep(0.05)
                self.key_event('enter', 'tap')
        elif cmd == "close_tab":
            self.key_combination(['ctrl', 'w'])
        elif cmd == "new_tab":
            self.key_combination(['ctrl', 't'])
        elif cmd == "nav_back":
            self.key_combination(['alt', 'left'])
        elif cmd == "play_pause":
            self.key_event('k', 'tap')
        elif cmd == "seek_fwd_10":
            self.key_event('l', 'tap')
        elif cmd == "seek_back_10":
            self.key_event('j', 'tap')
        elif cmd == "seek_fwd_5":
            self.key_event('right', 'tap')
        elif cmd == "seek_back_5":
            self.key_event('left', 'tap')
        elif cmd == "fullscreen":
            self.key_event('f', 'tap')
        elif cmd == "theater":
            self.key_event('t', 'tap')
        elif cmd == "miniplayer":
            self.key_event('i', 'tap')
        elif cmd == "cc":
            self.key_event('c', 'tap')
        elif cmd == "mute":
            self.key_event('m', 'tap')
        elif cmd == "speed_up":
            self.key_combination(['shift', '.'])
        elif cmd == "speed_down":
            self.key_combination(['shift', ','])
        elif cmd == "next":
            self.key_combination(['shift', 'n'])
        elif cmd == "prev":
            self.key_combination(['shift', 'p'])
        elif cmd == "volume_up":
            self.key_event('up', 'tap')
        elif cmd == "volume_down":
            self.key_event('down', 'tap')

    def handle_spotify_command(self, cmd: str, query: str = ""):
        cmd = cmd.lower().strip()
        if cmd == "open" or cmd == "launch":
            self.launch_spotify()
        elif cmd == "search_in_app":
            # In Spotify, Ctrl+L or Ctrl+K focuses the search field
            self.key_combination(['ctrl', 'l'])
            time.sleep(0.08)
            if query:
                self.key_combination(['ctrl', 'a'])
                time.sleep(0.02)
                self.type_string(query)
                time.sleep(0.05)
                self.key_event('enter', 'tap')
        elif cmd == "close_app":
            self.key_combination(['alt', 'f4'])
        elif cmd == "go_home":
            self.key_combination(['alt', 'left'])
        elif cmd == "go_library":
            self.key_combination(['ctrl', 'alt', '2'])
        elif cmd == "play_pause":
            self.key_event('media_play_pause', 'tap')
        elif cmd == "next":
            self.key_combination(['ctrl', 'right'])
        elif cmd == "prev":
            self.key_combination(['ctrl', 'left'])
        elif cmd == "seek_fwd":
            self.key_combination(['shift', 'right'])
        elif cmd == "seek_back":
            self.key_combination(['shift', 'left'])
        elif cmd == "volume_up":
            self.key_combination(['ctrl', 'up'])
        elif cmd == "volume_down":
            self.key_combination(['ctrl', 'down'])
        elif cmd == "mute":
            self.key_combination(['ctrl', 'shift', 'down'])
        elif cmd == "shuffle":
            self.key_combination(['ctrl', 's'])
        elif cmd == "repeat":
            self.key_combination(['ctrl', 'r'])
        elif cmd == "like":
            self.key_combination(['alt', 'shift', 'b'])

    def release_all_keys(self):
        for k in list(self.held_keys):
            self.key_event(k, 'up')
        for b in list(self.mouse_buttons_held):
            self.mouse_click(b, 'up')
        for k, active in list(self.active_wasd.items()):
            if active:
                self.key_event(k, 'up')
                self.active_wasd[k] = False

    # ==========================================
    # GAMEPAD / GAMESTICK ENGINE
    # ==========================================
    def handle_gamepad_stick(self, stick: str, x: float, y: float):
        if self.gamepad_mode == "xinput" and self.vx360:
            try:
                val_x = int(max(-32768, min(32767, x * 32767)))
                val_y = int(max(-32768, min(32767, -y * 32767)))
                if stick == 'left':
                    self.vx360.left_joystick(x_value=val_x, y_value=val_y)
                elif stick == 'right':
                    self.vx360.right_joystick(x_value=val_x, y_value=val_y)
                self.vx360.update()
                return
            except Exception as e:
                logging.error(f"vgamepad stick error: {e}")

        deadzone = 0.22
        if stick == 'left':
            target_w = y < -deadzone
            target_s = y > deadzone
            target_a = x < -deadzone
            target_d = x > deadzone
            
            for key, target_state in [('w', target_w), ('s', target_s), ('a', target_a), ('d', target_d)]:
                if target_state != self.active_wasd[key]:
                    self.key_event(key, 'down' if target_state else 'up')
                    self.active_wasd[key] = target_state
                    
        elif stick == 'right':
            if math.hypot(x, y) > 0.08:
                speed_multiplier = 15.0
                dx = x * speed_multiplier
                dy = y * speed_multiplier
                self.move_mouse_relative(dx, dy)

    def handle_gamepad_button(self, button_name: str, action: str):
        btn = button_name.lower().strip()
        if self.gamepad_mode == "xinput" and self.vx360:
            vg_button_map = {
                'a': vg.XUSB_BUTTON.XUSB_GAMEPAD_A,
                'b': vg.XUSB_BUTTON.XUSB_GAMEPAD_B,
                'x': vg.XUSB_BUTTON.XUSB_GAMEPAD_X,
                'y': vg.XUSB_BUTTON.XUSB_GAMEPAD_Y,
                'lb': vg.XUSB_BUTTON.XUSB_GAMEPAD_LEFT_SHOULDER,
                'rb': vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_SHOULDER,
                'start': vg.XUSB_BUTTON.XUSB_GAMEPAD_START,
                'select': vg.XUSB_BUTTON.XUSB_GAMEPAD_BACK,
                'home': vg.XUSB_BUTTON.XUSB_GAMEPAD_GUIDE,
                'l3': vg.XUSB_BUTTON.XUSB_GAMEPAD_LEFT_THUMB,
                'r3': vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_THUMB,
                'dpad_up': vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_UP,
                'dpad_down': vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_DOWN,
                'dpad_left': vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_LEFT,
                'dpad_right': vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_RIGHT
            }
            if btn in vg_button_map:
                try:
                    vg_btn = vg_button_map[btn]
                    if action == 'down':
                        self.vx360.press_button(button=vg_btn)
                    elif action == 'up':
                        self.vx360.release_button(button=vg_btn)
                    elif action == 'tap':
                        self.vx360.press_button(button=vg_btn)
                        self.vx360.update()
                        time.sleep(0.02)
                        self.vx360.release_button(button=vg_btn)
                    self.vx360.update()
                    return
                except Exception as e:
                    logging.error(f"vgamepad button error: {e}")

        if btn in self.gamepad_key_map:
            mapped_key = self.gamepad_key_map[btn]
            self.key_event(mapped_key, action)

    def handle_gamepad_trigger(self, trigger: str, value: float):
        if self.gamepad_mode == "xinput" and self.vx360:
            try:
                int_val = int(max(0, min(255, value * 255)))
                if trigger == 'lt':
                    self.vx360.left_trigger(value=int_val)
                elif trigger == 'rt':
                    self.vx360.right_trigger(value=int_val)
                self.vx360.update()
                return
            except Exception as e:
                logging.error(f"vgamepad trigger error: {e}")

        btn_name = trigger.lower()
        if value > 0.5:
            self.handle_gamepad_button(btn_name, 'down')
        else:
            self.handle_gamepad_button(btn_name, 'up')

    def handle_gyro_steer(self, gamma: float):
        tilt_deadzone = 6.0
        max_tilt = 35.0
        if self.gamepad_mode == "xinput" and self.vx360:
            if abs(gamma) < tilt_deadzone:
                val_x = 0
            else:
                norm = max(-1.0, min(1.0, (gamma) / max_tilt))
                val_x = int(norm * 32767)
            self.vx360.left_joystick_float(x_value_float=val_x / 32767.0, y_value_float=0.0)
            self.vx360.update()
        else:
            if gamma < -tilt_deadzone:
                self.key_event('a', 'down')
                self.key_event('d', 'up')
            elif gamma > tilt_deadzone:
                self.key_event('d', 'down')
                self.key_event('a', 'up')
            else:
                self.key_event('a', 'up')
                self.key_event('d', 'up')

    # ==========================================
    # ALIASES FOR MAXIMUM CROSS-VERSION STABILITY
    # ==========================================
    def scroll(self, dx: float = 0, dy: float = 0):
        self.mouse_scroll(dx, dy)

    def key_press(self, key_name: str, action: str = 'tap'):
        self.key_event(key_name, action)

    def hotkey(self, *keys):
        self.key_combination(list(keys))

    def type_string(self, text: str):
        self.type_text(text)

    def set_gamepad_stick(self, stick: str, x: float, y: float):
        self.handle_gamepad_stick(stick, x, y)

    def set_gamepad_button(self, button_name: str, action: str = 'tap'):
        self.handle_gamepad_button(button_name, action)

    def set_gamepad_trigger(self, trigger: str, value: float):
        self.handle_gamepad_trigger(trigger, value)

    def handle_gyro_steering(self, gamma: float):
        self.handle_gyro_steer(gamma)
