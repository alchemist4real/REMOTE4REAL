"""
REMOTE4REAL — System & Dependency Health Check
Validates runtime environment, required Python packages, screen capture,
input controller drivers, and network ports.
"""

import sys
import os
import socket
import logging

logging.basicConfig(level=logging.WARNING)

def print_header():
    print("=" * 65)
    print("  REMOTE4REAL System & Runtime Diagnostic")
    print("=" * 65)

def check_python():
    print(f"[*] Python Version: {sys.version.split()[0]} ({sys.executable})")
    if sys.version_info < (3, 8):
        print("  [FAIL] Python 3.8 or newer is required.")
        return False
    print("  [OK] Python version is compatible.")
    return True

def check_packages():
    critical_pkgs = [
        ("websockets", "websockets"),
        ("qrcode", "qrcode"),
        ("PIL", "Pillow"),
        ("psutil", "psutil")
    ]
    all_ok = True
    for module_name, display_name in critical_pkgs:
        try:
            __import__(module_name)
            print(f"  [OK] Package '{display_name}' installed.")
        except ImportError:
            print(f"  [FAIL] Missing package: '{display_name}'. Run: pip install {display_name}")
            all_ok = False
            
    # Optional vgamepad check
    try:
        import vgamepad
        print("  [OK] Virtual Gamepad driver ('vgamepad') is installed (XInput mode enabled).")
    except ImportError:
        print("  [INFO] 'vgamepad' not installed. Controller will use DirectX Keyboard/Mouse fallback.")
        
    return all_ok

def check_screen_capture():
    print("[*] Testing Screen Capture Engine...")
    try:
        from screen_capture import ScreenCapturer
        sc = ScreenCapturer(target_width=1280, quality=65)
        res = sc.get_resolution()
        print(f"  [OK] Native Screen Resolution detected: {res['width']}x{res['height']} (Scaled: {res['scaled_width']}x{res['scaled_height']})")
        
        frame = sc.capture_frame_jpeg()
        if frame and len(frame) > 1000:
            print(f"  [OK] Screen capture frame captured successfully ({len(frame):,} bytes JPEG).")
            sc.cleanup()
            return True
        else:
            print(f"  [WARN] Screen capture returned small/empty frame ({len(frame)} bytes).")
            sc.cleanup()
            return True
    except Exception as e:
        print(f"  [FAIL] Screen capture engine error: {e}")
        return False

def check_input_engine():
    print("[*] Testing Input Engine...")
    try:
        from controller_engine import WindowsInputController
        engine = WindowsInputController()
        print(f"  [OK] Input engine initialized. Gamepad mode: '{engine.gamepad_mode}'.")
        return True
    except Exception as e:
        print(f"  [FAIL] Input engine error: {e}")
        return False

def check_ports(http_port=8080, ws_port=8765):
    print("[*] Testing Network Ports...")
    def is_port_in_use(port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            return s.connect_ex(('127.0.0.1', port)) == 0

    http_in_use = is_port_in_use(http_port)
    ws_in_use = is_port_in_use(ws_port)

    if http_in_use:
        print(f"  [INFO] Port {http_port} is currently bound (server may already be running).")
    else:
        print(f"  [OK] Port {http_port} (HTTP Server) is available.")

    if ws_in_use:
        print(f"  [INFO] Port {ws_port} is currently bound (server may already be running).")
    else:
        print(f"  [OK] Port {ws_port} (WebSocket Server) is available.")

    return True

def run_all_checks():
    print_header()
    py_ok = check_python()
    pkg_ok = check_packages()
    sc_ok = check_screen_capture()
    inp_ok = check_input_engine()
    ports_ok = check_ports()

    print("=" * 65)
    if py_ok and pkg_ok and sc_ok and inp_ok:
        print("  [SUCCESS] All core components are healthy and ready to launch!")
        print("=" * 65)
        return 0
    else:
        print("  [ERROR] One or more core checks failed. See above diagnostics.")
        print("=" * 65)
        return 1

if __name__ == "__main__":
    sys.exit(run_all_checks())
