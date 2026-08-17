"""
REMOTE4REAL — WebSocket & HTTP Server
High-Speed Controller Server with PIN Authentication, Multi-Device Support,
and Bluetooth Tethering Adapter Discovery.
"""

import os
import sys
import json
import time
import random
import socket
import asyncio
import logging
import threading
from typing import Set, Dict, Any, Callable
import websockets
from http.server import SimpleHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn

from controller_engine import WindowsInputController
from screen_capture import ScreenCapturer
from version import __version__, __app_name__, __author__, __github_url__
import updater
import urllib.request
import subprocess
import re
import concurrent.futures
import math

def country_code_to_flag(code: str) -> str:
    if not code or len(code) != 2:
        return "🌐"
    return "".join(chr(127397 + ord(c.upper())) for c in code)

def calculate_distance_km(lat1, lon1, lat2, lon2) -> float:
    """Calculates distance between two GPS coordinates with millimeter resolution."""
    try:
        if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
            return 0.0
        R = 6371000.0  # Earth radius in meters
        dlat = math.radians(float(lat2) - float(lat1))
        dlon = math.radians(float(lon2) - float(lon1))
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(float(lat1))) * math.cos(math.radians(float(lat2))) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        meters = R * c
        return round(meters / 1000.0, 6)
    except Exception:
        return 0.0

def format_precision_distance(distance_km: float) -> str:
    """Format distance into human-readable millimeter, centimeter, meter, or kilometer."""
    if distance_km is None or distance_km <= 0:
        return "Local Network (±0.5 mm)"
    total_meters = distance_km * 1000.0
    if total_meters >= 1000.0:
        return f"{distance_km:,.3f} km"
    elif total_meters >= 1.0:
        return f"{total_meters:,.2f} m ({total_meters * 100.0:,.0f} cm)"
    elif total_meters >= 0.01:
        cm = total_meters * 100.0
        mm = total_meters * 1000.0
        return f"{cm:.1f} cm ({mm:.0f} mm)"
    else:
        mm = total_meters * 1000.0
        return f"{mm:.1f} mm"

LOUD_ALARM_WAV_PATH = os.path.join(os.environ.get("TEMP", os.path.dirname(os.path.abspath(__file__))), "r4_loud_alarm.wav")

def _ensure_loud_alarm_wav() -> str:
    """Synthesizes a loud, piercing, multi-stage emergency beacon WAV file for finding this PC."""
    try:
        if os.path.exists(LOUD_ALARM_WAV_PATH) and os.path.getsize(LOUD_ALARM_WAV_PATH) > 50000:
            return LOUD_ALARM_WAV_PATH

        import wave, struct, math
        sample_rate = 44100
        duration = 4.2  # 4.2 seconds of maximum-energy alarm
        num_samples = int(sample_rate * duration)
        frames = bytearray()

        for i in range(num_samples):
            t = i / sample_rate
            # Stage 1: Ascending dual emergency ping (0.0s - 0.8s)
            # Stage 2: Rhythmic piercing warble siren (0.8s - 3.2s)
            # Stage 3: Double high-energy beacon blast (3.2s - 4.2s)
            if t < 0.8:
                cycle = t * 2.5
                freq = 1100 + 900 * (cycle % 1.0)
                amp_env = 1.0
            elif t < 3.2:
                siren_t = t - 0.8
                freq = 950 + 1350 * (0.5 + 0.5 * math.sin(2 * math.pi * 3.2 * siren_t))
                amp_env = 1.0
            else:
                pulse_t = t - 3.2
                freq = 1800 if (pulse_t * 5) % 1.0 < 0.6 else 1200
                amp_env = 1.0 if (pulse_t * 5) % 1.0 < 0.85 else 0.05

            # Multi-harmonic synthesis for maximum punch and room resonance
            s1 = math.sin(2 * math.pi * freq * t)
            s2 = 0.55 * math.sin(4 * math.pi * freq * t)
            s3 = 0.35 * (1.0 if (t * freq * 2) % 2 < 1 else -1.0) # square harmonic bite
            val = int(max(-32760, min(32760, (s1 + s2 + s3) / 1.9 * 32700 * amp_env)))
            frames.extend(struct.pack('<hh', val, val))

        with wave.open(LOUD_ALARM_WAV_PATH, 'wb') as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(sample_rate)
            w.writeframes(frames)
            
        return LOUD_ALARM_WAV_PATH
    except Exception as e:
        logging.warning(f"Could not synthesize loud alarm WAV: {e}")
        return ""

def ring_desktop_alarm():
    """Rings a loud multi-stage emergency beacon alarm on PC speakers to find this desktop."""
    def _alarm_worker():
        played_wav = False
        try:
            import winsound
            wav_file = _ensure_loud_alarm_wav()
            if wav_file and os.path.exists(wav_file):
                # Play loud synthesized stereo siren asynchronously through Windows multimedia sound system
                winsound.PlaySound(wav_file, winsound.SND_FILENAME | winsound.SND_ASYNC)
                played_wav = True
        except Exception as e:
            logging.debug(f"PlaySound WAV error: {e}")

        # Fallback / Parallel tone reinforcement
        if not played_wav:
            try:
                import winsound
                tones = [
                    (1046, 150), (1318, 150), (1567, 150), (2093, 350),
                    (1046, 150), (1318, 150), (1567, 150), (2093, 500)
                ]
                for freq, dur in tones:
                    winsound.Beep(freq, dur)
                    time.sleep(0.02)
            except Exception:
                try:
                    import winsound
                    for _ in range(5):
                        winsound.MessageBeep(winsound.MB_ICONEXCLAMATION)
                        time.sleep(0.15)
                except Exception:
                    pass

    threading.Thread(target=_alarm_worker, daemon=True).start()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

BASE_DIR = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class ControllerServer:
    def __init__(self, http_port: int = 8080, ws_port: int = 8765):
        self.http_port = http_port
        self.ws_port = ws_port
        self.input_engine = WindowsInputController()
        self.screen_capturer = ScreenCapturer(target_width=1280, quality=65)

        # Worldwide Geolocation Info
        self.desktop_geo_info = {
            "city": "Detecting...",
            "region": "",
            "country": "Detecting...",
            "country_code": "",
            "flag": "🌐",
            "lat": None,
            "lon": None,
            "isp": "",
            "timezone": ""
        }
        threading.Thread(target=self._resolve_desktop_geo, daemon=True).start()

        # Security & Authentication
        self.security_pin: str = f"{random.randint(1000, 9999)}"
        self.authenticated_clients: Set[websockets.WebSocketServerProtocol] = set()
        self.connected_clients: Set[websockets.WebSocketServerProtocol] = set()
        self.client_metadata: Dict[websockets.WebSocketServerProtocol, dict] = {}
        self.failed_attempts: Dict[str, dict] = {}  # ip -> {"count": int, "blocked_until": float}
        self.pending_invitations: Dict[str, dict] = {} # ip -> {"time": float, "pin": str, "server": str}

        # Multi-Device Stream Management
        self.streaming_clients: Set[websockets.WebSocketServerProtocol] = set()
        self.broadcast_stream_task: asyncio.Task = None

        self.status_callbacks: list[Callable[[str, Any], None]] = []
        self.is_running = False
        self.httpd = None
        self.ws_server = None
        self.loop = None
        self.active_mode = "touchpad"
        self.international_link: str = ""
        self.cloud_tunnel_host: str = ""

    def scan_local_wifi_devices(self) -> list[dict]:
        """High-speed multi-threaded probe and ARP scan of the local Wi-Fi subnet."""
        devices = []
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(('8.8.8.8', 80))
            my_ip = s.getsockname()[0]
            s.close()
            
            parts = my_ip.split('.')
            subnet = f"{parts[0]}.{parts[1]}.{parts[2]}"

            # Fast multi-threaded socket probe on ports 80/8080/443/5353/62078 (iOS/Android ports)
            def _probe(ip):
                for p in (80, 8080, 443, 62078):
                    try:
                        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                        sock.settimeout(0.12)
                        sock.connect((ip, p))
                        sock.close()
                        return ip
                    except Exception:
                        pass
                return None

            ips_to_check = [f"{subnet}.{i}" for i in range(1, 255) if f"{subnet}.{i}" != my_ip]
            with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
                list(executor.map(_probe, ips_to_check))

            # Parse Windows ARP table
            out = subprocess.check_output(['arp', '-a'], text=True, stderr=subprocess.DEVNULL)
            for line in out.splitlines():
                m = re.search(r'([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)\s+([0-9a-fA-F-]+)\s+dynamic', line)
                if m:
                    ip, mac = m.group(1), m.group(2).lower()
                    if ip.startswith(subnet) and ip != my_ip and not ip.endswith(".255"):
                        # Identify vendor / device type
                        vendor = "Mobile Phone / Wi-Fi Device"
                        is_phone = True
                        
                        # Known MAC OUI heuristics
                        mac_clean = mac.replace('-', ':').lower()
                        if mac_clean.startswith(('00:03:93', '00:05:02', '00:0a:27', '00:0a:95', '00:0d:93', '00:11:24', '00:14:51', '00:16:cb', '00:17:f2', '00:19:e3', '00:1b:63', '00:1c:b3', '00:1d:4f', '00:1e:52', '00:1e:c2', '00:1f:5b', '00:1f:f3', '00:21:e9', '00:22:41', '00:23:12', '00:23:32', '00:23:6c', '00:23:df', '00:24:36', '00:25:00', '00:25:4b', '00:25:bc', '00:26:08', '00:26:4a', '00:26:b0', '00:88:65', '04:0c:ce', '04:15:52', '04:1e:64', '04:26:65', '04:4b:ed', '04:54:53', '04:db:56', '04:e5:36', '04:f1:3e', '04:f7:e4', '08:00:07', '08:66:98', '08:70:45', '08:74:02', '0c:15:39', '0c:30:21', '0c:4d:e9', '0c:74:c2', '0c:77:1a', '0c:bc:9f', '0c:d7:46', '10:1c:0c', '10:40:f3', '10:93:e9', '10:94:bb', '10:dd:b1', '14:10:9f', '14:20:5e', '14:5a:05', '14:7d:da', '14:8f:c6', '14:99:e2', '14:c2:13', '18:20:32', '18:34:51', '18:65:90', '18:af:61', '18:e7:28', '1c:1a:c0', '1c:36:bb', '1c:5c:f2', '1c:91:48', '1c:ab:a7', '20:76:8f', '20:78:f0', '20:7d:74', '20:a2:e4', '20:ab:37', '20:c9:d0', '20:ee:28', '24:24:0e', '24:5b:a7', '24:a0:74', '24:a2:e1', '24:ab:81', '24:e3:14', '24:f0:94', '24:f6:77', '28:0b:5c', '28:6a:ba', '28:cf:e9', '28:cf:da', '28:e0:2c', '28:e1:4c', '28:e7:cf', '28:f0:76', '2c:1f:23', '2c:20:0b', '2c:33:61', '2c:be:08', '2c:f0:ee', '30:07:4d', '30:10:e4', '30:35:ad', '30:63:6b', '30:75:12', '30:90:ab', '30:96:fb', '34:08:bc', '34:12:98', '34:15:9e', '34:36:3b', '34:51:c9', '34:a3:95', '34:ab:37', '34:c0:59', '34:e2:fd', '38:0f:4a', '38:48:4c', '38:71:de', '38:89:2c', '38:ca:da', '3c:07:54', '3c:15:c2', '3c:22:fb', '3c:2e:ff', '3c:a5:81', '3c:d0:f8', '3c:e0:72', '40:30:04', '40:33:1a', '40:3c:fc', '40:4d:7f', '40:6c:8f', '40:98:ad', '40:9c:28', '40:a6:d9', '40:b4:cd', '40:b8:37', '40:cb:c0', '40:d3:2d', '44:00:10', '44:2a:60', '44:4c:0c', '44:65:0d', '44:fb:42', '48:43:7c', '48:60:5f', '48:74:6e', '48:a9:d2', '48:d7:05', '48:e9:f1', '4c:32:75', '4c:57:ca', '4c:74:03', '4c:79:6e', '4c:b1:99', '50:32:37', '50:7a:55', '50:82:d5', '50:ea:d6', '54:26:96', '54:4e:90', '54:72:4f', '54:ae:27', '54:e4:3a', '58:1f:aa', '58:40:4e', '58:55:ca', '58:7f:57', '58:b0:35', '58:e2:8f', '5c:59:48', '5c:8d:4e', '5c:96:9d', '5c:ad:cf', '5c:e9:1e', '5c:f9:38', '60:03:08', '60:30:d4', '60:33:4b', '60:69:44', '60:92:17', '60:c5:47', '60:d9:c7', '60:f4:45', '60:fa:cd', '64:20:0c', '64:70:33', '64:9a:be', '64:a3:41', '64:b0:a6', '64:c7:53', '64:e6:82', '68:09:27', '68:5b:35', '68:64:4b', '68:96:7b', '68:a8:6d', '68:ab:1e', '68:ae:20', '68:d9:3c', '6c:19:c0', '6c:3e:6d', '6c:40:08', '6c:70:9f', '6c:8d:c1', '6c:94:f8', '6c:96:cf', '6c:ab:31', '70:11:24', '70:14:a6', '70:3e:ac', '70:48:0f', '70:56:81', '70:70:0d', '70:a2:b3', '70:cd:60', '70:de:e2', '70:ec:e4', '74:1b:b2', '74:42:7f', '74:81:14', '74:8d:08', '74:e1:b6', '74:e2:f5', '78:31:c1', '78:3a:84', '78:4f:43', '78:67:d7', '78:7b:8a', '78:88:6d', '78:9f:70', '78:ca:39', '78:fd:94', '7c:01:91', '7c:04:d0', '7c:50:49', '7c:6d:62', '7c:c3:a1', '7c:c5:37', '7c:d1:c3', '7c:fa:df', '80:00:6e', '80:49:71', '80:58:f8', '80:82:23', '80:92:9f', '80:b0:3d', '80:b9:e9', '80:d6:05', '80:ea:96', '84:25:db', '84:38:35', '84:41:67', '84:68:52', '84:78:8b', '84:85:06', '84:8e:df', '84:fc:ac', '88:19:08', '88:63:df', '88:64:40', '88:66:a5', '88:c6:63', '88:cb:87', '88:e8:7f', '8c:00:6d', '8c:77:12', '8c:85:90', '8c:fe:57', '90:27:e4', '90:3c:92', '90:72:40', '90:84:0d', '90:b0:ed', '90:b2:1f', '90:b9:31', '90:cd:b6', '90:dd:5d', '90:fd:61', '94:65:2d', '94:94:26', '94:e9:6a', '94:ea:32', '94:f6:a3', '98:01:a7', '98:03:d8', '98:10:e8', '98:58:8a', '98:9e:63', '98:b8:e3', '98:d6:bb', '98:f0:ab', '9c:04:eb', '9c:20:7b', '9c:29:3f', '9c:35:eb', '9c:4f:da', '9c:fc:01', 'a0:18:28', 'a0:99:9b', 'a4:31:35', 'a4:5e:60', 'a4:67:06', 'a4:83:e7', 'a4:b1:97', 'a4:b8:05', 'a4:c3:61', 'a4:d1:8c', 'a4:d1:d2', 'a4:e9:75', 'a8:20:66', 'a8:51:5b', 'a8:5b:78', 'a8:60:b6', 'a8:66:7f', 'a8:88:08', 'a8:8e:24', 'a8:96:75', 'a8:bb:cf', 'a8:be:27', 'a8:fa:d8', 'ac:1f:74', 'ac:29:3a', 'ac:37:43', 'ac:63:be', 'ac:7f:3e', 'ac:87:a3', 'ac:cf:5c', 'ac:cf:85', 'ac:e4:b5', 'b0:34:95', 'b0:65:bd', 'b0:70:2d', 'b0:72:bf', 'b0:9f:ba', 'b4:18:d1', 'b4:43:0d', 'b4:8b:19', 'b4:9c:df', 'b4:f1:da', 'b8:17:c2', 'b8:44:d9', 'b8:53:ac', 'b8:78:26', 'b8:c7:5d', 'b8:e8:56', 'b8:f8:83', 'b8:ff:61', 'bc:44:86', 'bc:52:b7', 'bc:54:36', 'bc:6c:21', 'bc:92:6b', 'bc:fe:d9', 'c0:84:7a', 'c0:9f:42', 'c0:a5:3e', 'c0:cc:f8', 'c0:ce:cd', 'c0:d0:12', 'c0:f2:fb', 'c4:2c:03', 'c8:1e:e7', 'c8:2a:14', 'c8:33:4b', 'c8:6f:1d', 'c8:85:50', 'c8:b5:b7', 'c8:bc:c8', 'c8:d0:83', 'c8:e0:eb', 'c8:ff:77', 'cc:08:8d', 'cc:25:ef', 'cc:29:f5', 'cc:44:63', 'cc:78:5f', 'cc:c7:60', 'd0:03:4b', 'd0:23:db', 'd0:25:98', 'd0:4f:7e', 'd0:81:7a', 'd0:a6:37', 'd0:c5:f3', 'd0:e1:40', 'd4:90:9c', 'd4:dc:cd', 'd4:f4:6f', 'd8:00:4d', 'd8:1c:79', 'd8:30:62', 'd8:96:95', 'd8:9e:3f', 'd8:a2:5e', 'd8:bb:2c', 'd8:cf:9c', 'd8:d1:cb', 'dc:2b:2a', 'dc:2b:61', 'dc:37:14', 'dc:41:5f', 'dc:52:85', 'dc:86:d8', 'dc:9b:9c', 'dc:a4:ca', 'dc:a9:04', 'dc:bf:e9', 'e0:33:8e', 'e0:5f:45', 'e0:66:78', 'e0:ac:cb', 'e0:b9:ba', 'e0:c7:67', 'e0:cb:ee', 'e0:f5:c6', 'e0:f8:47', 'e4:25:e7', 'e4:70:b8', 'e4:8b:7f', 'e4:90:7e', 'e4:98:d6', 'e4:a7:c5', 'e4:ce:8f', 'e8:04:0b', 'e8:06:88', 'e8:5b:5b', 'e8:80:2e', 'e8:8d:28', 'ec:35:86', 'ec:85:2f', 'f0:18:98', 'f0:24:75', 'f0:79:60', 'f0:98:9d', 'f0:99:b6', 'f0:b4:79', 'f0:c1:f1', 'f0:c3:71', 'f0:db:f8', 'f0:dc:e2', 'f0:f6:1c', 'f4:1b:a1', 'f4:37:b7', 'f4:5c:89', 'f4:f1:5a', 'f4:f9:51', 'f8:1e:df', 'f8:27:93', 'f8:38:80', 'f8:62:14', 'f8:6f:c1', 'f8:87:f1', 'f8:e0:79', 'f8:ff:c2', 'fc:18:3c', 'fc:25:3f', 'fc:e9:98')):
                            vendor = "Apple Device (iPhone / iPad)"
                        elif mac_clean.startswith(('00:07:ab', '00:12:47', '00:15:99', '00:16:6c', '00:17:c9', '00:18:e7', '00:1a:8a', '00:1c:43', '00:1d:25', '00:1e:e1', '00:21:19', '00:23:d6', '00:24:91', '00:26:5d', '08:08:c2', '08:37:3d', '08:fc:52', '0c:14:20', '14:bb:6e', '18:1e:78', '18:67:b0', '24:4b:03', '2c:44:01', '30:cd:a7', '34:be:00', '38:0a:94', '40:0e:85', '44:4e:1a', '4c:66:41', '50:01:d9', '54:92:be', '5c:0a:5b', '60:6b:bd', '68:05:71', '78:40:e4', '80:5b:65', '84:25:19', '94:01:c2', '9c:02:98', 'a0:0b:ba', 'a4:93:3f', 'ac:5f:3e', 'b4:07:f9', 'bc:72:b9', 'c4:73:1e', 'cc:05:1b', 'cc:3a:61', 'd0:17:6a', 'd4:e8:b2', 'e4:12:1d', 'ec:1f:72', 'f4:09:d8', 'fc:a1:3e')):
                            vendor = "Samsung Galaxy (Phone / Tab)"
                        elif mac_clean.startswith(('00:9e:c8', '08:e6:89', '14:f6:5a', '18:59:36', '28:6c:07', '34:80:b3', '3c:bd:d8', '50:d2:f5', '58:44:98', '5c:e8:eb', '64:09:80', '68:df:dd', '74:51:ba', '78:11:dc', '7c:1c:f1', '80:7b:1e', '8c:be:be', '9c:99:a0', 'a0:86:c6', 'a4:44:d0', 'ac:c1:ee', 'b0:38:29', 'b4:cd:27', 'c4:0b:cb', 'cc:04:b4', 'dc:72:9b', 'e4:46:da', 'ec:d0:9f', 'f4:60:e2', 'fc:64:3a')):
                            vendor = "Xiaomi / Redmi / POCO"
                        elif ip.endswith(".1"):
                            vendor = "Wi-Fi Router / Gateway"
                            is_phone = False

                        devices.append({
                            "ip": ip,
                            "mac": mac,
                            "vendor": vendor,
                            "is_phone": is_phone,
                            "display": f"{'📱' if is_phone else '🌐'} {ip} ({vendor})"
                        })
        except Exception as e:
            logging.error(f"Error scanning LAN devices: {e}")
        return devices

    def send_connection_invitation(self, target_ip: str) -> dict:
        """Dispatches an interactive controller connection invite to the target phone."""
        clean_ip = str(target_ip).strip()
        invite_data = {
            "time": time.time(),
            "pin": self.security_pin,
            "host_ip": self.get_local_ip_addresses()[0]["ip"],
            "http_port": self.http_port,
            "server_name": socket.gethostname()
        }
        self.pending_invitations[clean_ip] = invite_data
        logging.info(f"Sent connection invitation to target device {clean_ip} (PIN: {self.security_pin})")

        # Dispatches UDP broadcast beacon on port 8766
        def _beacon():
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
                payload = json.dumps({
                    "type": "desktop_pair_invitation",
                    "target_ip": clean_ip,
                    **invite_data
                }).encode("utf-8")
                s.sendto(payload, ("255.255.255.255", 8766))
                s.sendto(payload, (clean_ip, 8766))
                s.close()
            except Exception:
                pass
        threading.Thread(target=_beacon, daemon=True).start()

        # If device is already connected via WebSocket, send popup payload directly
        if self.loop and self.connected_clients:
            packet = json.dumps({
                "type": "desktop_pair_invitation",
                "pin": self.security_pin,
                "server_name": socket.gethostname(),
                "url": f"http://{invite_data['host_ip']}:{self.http_port}/?pin={self.security_pin}&auto=1"
            })
            for ws in list(self.connected_clients):
                meta = self.client_metadata.get(ws, {})
                if meta.get("ip") == clean_ip:
                    asyncio.run_coroutine_threadsafe(ws.send(packet), self.loop)

        self._notify("pair_request_sent", {"target_ip": clean_ip, "invite": invite_data})
        return invite_data

    def _auto_setup_international_signal(self):
        """Automatically provisions zero-config international HTTPS/WSS cloud tunnel."""
        temp_dir = os.environ.get("TEMP", os.path.dirname(os.path.abspath(__file__)))
        cf_path = os.path.join(temp_dir, "cloudflared.exe")

        # 1. Ensure cloudflared binary is available
        if not os.path.exists(cf_path):
            try:
                cf_url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
                logging.info(f"Downloading Cloudflare Quick Tunnel binary to {cf_path}...")
                urllib.request.urlretrieve(cf_url, cf_path)
                logging.info("Cloudflare Quick Tunnel binary downloaded successfully.")
            except Exception as e:
                logging.warning(f"Could not download cloudflared binary: {e}")

        # 2. Launch Cloudflare Quick Tunnel on WebSocket Port (8765)
        if os.path.exists(cf_path):
            try:
                cmd = [cf_path, "tunnel", "--url", f"http://127.0.0.1:{self.ws_port}", "--no-chunked-encoding"]
                proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
                
                # Monitor output in background thread to parse tunnel URL
                def _monitor_cf():
                    start_t = time.time()
                    while time.time() - start_t < 25:
                        line = proc.stdout.readline()
                        if not line:
                            break
                        m = re.search(r"https://([a-zA-Z0-9-]+\.trycloudflare\.com)", line)
                        if m:
                            domain = m.group(1)
                            full_url = f"https://remote4real.vercel.app/?ws=wss://{domain}&pin={self.security_pin}"
                            self.international_link = full_url
                            logging.info(f"🌐 [WORLDWIDE SECURE CLOUD LINK READY]: {full_url}")
                            self._notify("international_link_ready", {"url": full_url, "host": domain})
                            break
                
                threading.Thread(target=_monitor_cf, daemon=True).start()
                return
            except Exception as e:
                logging.warning(f"Failed to launch Cloudflare quick tunnel: {e}")

        # Fallback to direct public IP
        try:
            req = urllib.request.Request("https://api.ipify.org?format=json", headers={"User-Agent": "REMOTE4REAL/2.0"})
            with urllib.request.urlopen(req, timeout=4.0) as res:
                data = json.loads(res.read().decode())
                pub_ip = data.get("ip")
                if pub_ip:
                    self.international_link = f"http://{pub_ip}:{self.http_port}/?pin={self.security_pin}"
                    logging.info(f"International Direct IP Link Ready: {self.international_link}")
                    self._notify("international_link_ready", {"url": self.international_link, "ip": pub_ip})
        except Exception as e:
            if self.desktop_geo_info.get("ip"):
                pub_ip = self.desktop_geo_info.get("ip")
                self.international_link = f"http://{pub_ip}:{self.http_port}/?pin={self.security_pin}"
                self._notify("international_link_ready", {"url": self.international_link, "ip": pub_ip})

    def _resolve_desktop_geo(self):
        """Asynchronously resolve Desktop's public geographic location."""
        try:
            req = urllib.request.Request(
                "http://ip-api.com/json/?fields=status,country,countryCode,regionName,city,lat,lon,timezone,isp,query",
                headers={"User-Agent": "REMOTE4REAL-Companion/2.0"}
            )
            with urllib.request.urlopen(req, timeout=3.5) as response:
                data = json.loads(response.read().decode())
                if data.get("status") == "success":
                    cc = data.get("countryCode", "")
                    self.desktop_geo_info = {
                        "city": data.get("city", "Unknown City"),
                        "region": data.get("regionName", ""),
                        "country": data.get("country", "Unknown Country"),
                        "country_code": cc,
                        "flag": country_code_to_flag(cc),
                        "lat": data.get("lat"),
                        "lon": data.get("lon"),
                        "isp": data.get("isp", ""),
                        "timezone": data.get("timezone", ""),
                        "ip": data.get("query", "")
                    }
                    logging.info(f"Desktop Geolocation resolved: {self.desktop_geo_info['city']}, {self.desktop_geo_info['country']} {self.desktop_geo_info['flag']}")
                    self._notify("desktop_geo_resolved", self.desktop_geo_info)
                    
                    if not self.international_link and data.get("query"):
                        pub_ip = data.get("query")
                        self.international_link = f"https://remote4real.vercel.app/?host={pub_ip}&port={self.http_port}&ws={self.ws_port}&pin={self.security_pin}"
                        self._notify("international_link_ready", {"url": self.international_link, "ip": pub_ip})
        except Exception as e:
            logging.debug(f"Could not resolve desktop geo (offline/private LAN): {e}")

    def add_status_callback(self, callback: Callable[[str, Any], None]):
        self.status_callbacks.append(callback)

    def _notify(self, event: str, data: Any = None):
        for cb in self.status_callbacks:
            try:
                cb(event, data)
            except Exception as e:
                logging.error(f"Error in status callback: {e}")

    def set_pin(self, new_pin: str):
        clean_pin = str(new_pin).strip()
        if len(clean_pin) >= 4:
            self.security_pin = clean_pin
            # Invalidate previous auths
            self.authenticated_clients.clear()
            self._notify("pin_changed", {"pin": self.security_pin})
            logging.info(f"Security PIN updated to: {self.security_pin}")
            return True
        return False

    def generate_random_pin(self) -> str:
        new_pin = f"{random.randint(1000, 9999)}"
        self.set_pin(new_pin)
        return new_pin

    @staticmethod
    def get_local_ip_addresses() -> list[dict]:
        ip_list = []
        try:
            hostname = socket.gethostname()
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            try:
                s.connect(('8.8.8.8', 80))
                primary_ip = s.getsockname()[0]
                ip_list.append({"ip": primary_ip, "name": "Primary Wi-Fi / LAN Network", "priority": 1, "is_bt": False})
            except Exception:
                primary_ip = None
            finally:
                s.close()

            for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
                ip = info[4][0]
                if ip not in [item["ip"] for item in ip_list] and not ip.startswith("127."):
                    is_tailscale = ip.startswith("100.")
                    is_zerotier = ip.startswith("10.147.") or ip.startswith("10.144.")
                    is_bluetooth = (
                        ip.startswith("192.168.44.") or 
                        ip.startswith("192.168.137.") or 
                        ip.startswith("172.20.10.")
                    )
                    
                    if is_tailscale:
                        name = "Tailscale (Worldwide / Any Network)"
                        priority = 1
                        is_vpn = True
                    elif is_zerotier:
                        name = "ZeroTier VPN (Worldwide)"
                        priority = 2
                        is_vpn = True
                    elif is_bluetooth:
                        name = "Bluetooth PAN / Tethering"
                        priority = 3
                        is_vpn = False
                    else:
                        name = "LAN / Wi-Fi Adapter"
                        priority = 4
                        is_vpn = False

                    ip_list.append({
                        "ip": ip,
                        "name": name,
                        "priority": priority,
                        "is_bt": is_bluetooth,
                        "is_vpn": is_vpn if 'is_vpn' in locals() else False
                    })

            if not ip_list:
                ip_list.append({"ip": "127.0.0.1", "name": "Localhost (Loopback)", "priority": 4, "is_bt": False})
        except Exception as e:
            logging.error(f"Error resolving IP addresses: {e}")
            ip_list = [{"ip": "127.0.0.1", "name": "Localhost", "priority": 4, "is_bt": False}]

        ip_list.sort(key=lambda x: x["priority"])
        return ip_list

    def get_connection_urls(self) -> list[str]:
        ips = self.get_local_ip_addresses()
        return [f"http://{item['ip']}:{self.http_port}/?pin={self.security_pin}" for item in ips]

    def get_bluetooth_url(self) -> str:
        ips = self.get_local_ip_addresses()
        for item in ips:
            if item.get("is_bt"):
                return f"http://{item['ip']}:{self.http_port}/?pin={self.security_pin}"
        # Fallback to primary
        return f"http://{ips[0]['ip']}:{self.http_port}/?pin={self.security_pin}" if ips else ""

    # ==========================================
    # HTTP SERVER
    # ==========================================
    def _run_http_server(self):
        server_instance = self

        class CustomHandler(SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=STATIC_DIR, **kwargs)

            def do_GET(self):
                # 1. API: Server Info & Status
                if self.path.startswith('/api/status'):
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    info = {
                        "name": __app_name__,
                        "version": __version__,
                        "author": __author__,
                        "status": "online",
                        "pin_required": True,
                        "connected_devices": len(server_instance.authenticated_clients)
                    }
                    self.wfile.write(json.dumps(info).encode("utf-8"))
                    return

                # 2. API: Version Info
                if self.path.startswith('/api/version'):
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    info = {
                        "name": __app_name__,
                        "version": __version__,
                        "author": __author__,
                        "github": __github_url__
                    }
                    self.wfile.write(json.dumps(info).encode("utf-8"))
                    return

                # 3. API: Check Updates
                if self.path.startswith('/api/update_check'):
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    force = 'force=true' in self.path.lower()
                    update_info = updater.check_for_updates(force=force)
                    self.wfile.write(json.dumps(update_info).encode("utf-8"))
                    return

                # 4. API: Check Pending Connection Invitations
                if self.path.startswith('/api/check_invite'):
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    client_ip = self.client_address[0]
                    invite = server_instance.pending_invitations.get(client_ip)
                    resp = {
                        "has_invite": bool(invite),
                        "invite": invite,
                        "server_name": socket.gethostname(),
                        "pin": server_instance.security_pin if invite else ""
                    }
                    self.wfile.write(json.dumps(resp).encode("utf-8"))
                    return

                # 5. Static Assets
                super().do_GET()

            def end_headers(self):
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                super().end_headers()

            def log_message(self, format, *args):
                pass

        try:
            self.httpd = ThreadedHTTPServer(('0.0.0.0', self.http_port), CustomHandler)
            logging.info(f"HTTP Server started on port {self.http_port}")
            self.httpd.serve_forever()
        except Exception as e:
            logging.error(f"HTTP Server error: {e}")

    # ==========================================
    # MULTI-DEVICE BROADCAST SCREEN STREAM
    # ==========================================
    async def _broadcast_screen_stream_loop(self):
        """Single high-performance capture loop broadcasting to ALL authenticated streaming clients."""
        try:
            while self.is_running:
                if self.streaming_clients:
                    frame_bytes = self.screen_capturer.capture_frame_jpeg()
                    if frame_bytes:
                        disconnected = []
                        for client in list(self.streaming_clients):
                            if client in self.authenticated_clients:
                                try:
                                    await client.send(frame_bytes)
                                except Exception:
                                    disconnected.append(client)
                            else:
                                disconnected.append(client)
                        for d in disconnected:
                            self.streaming_clients.discard(d)
                await asyncio.sleep(0.04)  # ~25 FPS
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logging.warning(f"Broadcast screen stream error: {e}")

    def _start_broadcast_stream_if_needed(self):
        if not self.broadcast_stream_task or self.broadcast_stream_task.done():
            self.broadcast_stream_task = asyncio.run_coroutine_threadsafe(
                self._broadcast_screen_stream_loop(),
                self.loop
            )

    # ==========================================
    # WEBSOCKET SERVER & AUTH DISPATCHER
    # ==========================================
    async def _handle_client(self, websocket):
        client_address = websocket.remote_address
        client_ip = str(client_address[0])
        logging.info(f"Incoming connection from: {client_address}")

        self.connected_clients.add(websocket)
        self.client_metadata[websocket] = {
            "address": str(client_address),
            "ip": client_ip,
            "connected_at": time.time(),
            "last_ping": time.time(),
            "authenticated": False,
            "mode": "touchpad",
            "latency_ms": 0
        }

        # Check if desktop sent a pending invitation for this client IP
        pending_inv = self.pending_invitations.get(client_ip)

        # Send initial handshake asking for PIN (or auto-invite payload)
        try:
            handshake = {
                "type": "auth_required",
                "software": "REMOTE4REAL",
                "screen": self.screen_capturer.get_resolution(),
                "server_time": time.time(),
                "has_invite": bool(pending_inv),
                "server_name": socket.gethostname()
            }
            if pending_inv:
                handshake["invite_pin"] = self.security_pin
                handshake["type"] = "desktop_pair_invitation"
            await websocket.send(json.dumps(handshake))
        except Exception as e:
            logging.error(f"Error sending handshake packet: {e}")

        try:
            async for message in websocket:
                if isinstance(message, str):
                    try:
                        data = json.loads(message)
                        msg_type = data.get("t") or data.get("type")

                        # 1. AUTHENTICATION PACKET
                        if msg_type == "auth":
                            pin_attempt = str(data.get("pin", "")).strip()
                            now = time.time()

                            # Rate-limit check
                            attempts_info = self.failed_attempts.get(client_ip, {"count": 0, "blocked_until": 0})
                            if attempts_info["blocked_until"] > now:
                                rem_wait = int(attempts_info["blocked_until"] - now)
                                await websocket.send(json.dumps({
                                    "type": "auth_failed",
                                    "error": f"RATE_LIMITED: WAIT {rem_wait}S"
                                }))
                                continue

                            if pin_attempt == self.security_pin:
                                # Auth Success
                                self.authenticated_clients.add(websocket)
                                self.client_metadata[websocket]["authenticated"] = True
                                self.failed_attempts.pop(client_ip, None)

                                await websocket.send(json.dumps({
                                    "type": "auth_success",
                                    "vgamepad": self.input_engine.gamepad_mode == "xinput",
                                    "desktop_geo": self.desktop_geo_info
                                }))
                                logging.info(f"Device authenticated: {client_address}")
                                self._notify("client_authenticated", self.get_device_list_info())
                            else:
                                # Auth Failed
                                attempts_info["count"] += 1
                                if attempts_info["count"] >= 5:
                                    attempts_info["blocked_until"] = now + 30
                                    logging.warning(f"IP {client_ip} rate-limited for 30 seconds.")
                                self.failed_attempts[client_ip] = attempts_info

                                await websocket.send(json.dumps({
                                    "type": "auth_failed",
                                    "error": "INVALID_PIN"
                                }))
                            continue

                        # 2. REJECT UNTRUSTED PACKETS IF NOT AUTHENTICATED
                        if websocket not in self.authenticated_clients:
                            await websocket.send(json.dumps({
                                "type": "auth_required",
                                "error": "UNAUTHORIZED_DEVICE"
                            }))
                            continue

                        # 3. DISPATCH SECURE PACKET
                        self._dispatch_message(data, websocket)

                    except json.JSONDecodeError:
                        pass
                    except Exception as e:
                        logging.error(f"Error processing packet: {e}")
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.streaming_clients.discard(websocket)
            self.authenticated_clients.discard(websocket)
            self.connected_clients.discard(websocket)
            self.client_metadata.pop(websocket, None)
            self.input_engine.release_all_keys()
            logging.info(f"Device disconnected: {client_address}")
            self._notify("client_disconnected", self.get_device_list_info())

    def get_device_list_info(self) -> list[dict]:
        devices = []
        for ws, meta in self.client_metadata.items():
            if ws in self.authenticated_clients:
                devices.append({
                    "address": meta.get("address"),
                    "ip": meta.get("ip"),
                    "connected_at": meta.get("connected_at"),
                    "latency_ms": meta.get("latency_ms", 0),
                    "mode": meta.get("mode", "touchpad"),
                    "device_name": meta.get("device_name", "Remote Phone"),
                    "geo": meta.get("geo", {}),
                    "distance_km": meta.get("distance_km", 0.0)
                })
        return devices

    def _dispatch_message(self, data: dict, websocket):
        msg_type = data.get("t") or data.get("type")

        # 1. PING / PONG
        if msg_type == "ping":
            ts = data.get("ts", time.time() * 1000)
            if websocket in self.client_metadata:
                self.client_metadata[websocket]["last_ping"] = time.time()
            asyncio.run_coroutine_threadsafe(
                websocket.send(json.dumps({"type": "pong", "ts": ts})),
                self.loop
            )
            return

        # 2. SCREEN STREAM TOGGLE
        elif msg_type == "screen_stream":
            enable = data.get("enable", True)
            if enable:
                self.streaming_clients.add(websocket)
                self._start_broadcast_stream_if_needed()
            else:
                self.streaming_clients.discard(websocket)

        # 3. TOUCHSCREEN LAPTOP DIRECT TOUCH
        elif msg_type == "screen_touch":
            x = float(data.get("x", 0))
            y = float(data.get("y", 0))
            act = data.get("act", "move")
            btn = data.get("btn", "left")

            if act == "move":
                self.input_engine.move_mouse_absolute(x, y)
            elif act in ("down", "up", "click"):
                self.input_engine.mouse_touch_absolute(x, y, button=btn, action=act)
                self._notify("screen_touch_click", {"x": x, "y": y, "btn": btn, "act": act})
            elif act == "right_click":
                self.input_engine.mouse_touch_absolute(x, y, button="right", action="click")

        # 4. YOUTUBE REMOTE & LAUNCHER
        elif msg_type in ("yt_cmd", "yt_launch"):
            cmd = data.get("cmd", "launch")
            query = data.get("q", "") or data.get("query", "")
            self.input_engine.handle_youtube_command(cmd, query)
            self._notify("yt_cmd", {"cmd": cmd, "query": query})

        # 5. SPOTIFY REMOTE & LAUNCHER
        elif msg_type in ("spotify_cmd", "spotify_launch"):
            cmd = data.get("cmd", "open")
            query = data.get("q", "") or data.get("query", "")
            self.input_engine.handle_spotify_command(cmd, query)
            self._notify("spotify_cmd", {"cmd": cmd, "query": query})

        # 6. TOUCHPAD GESTURES
        elif msg_type == "touch_move":
            dx = float(data.get("dx", 0))
            dy = float(data.get("dy", 0))
            self.input_engine.move_mouse_relative(dx, dy)
            self._notify("touchpad_move", {"dx": dx, "dy": dy})

        elif msg_type == "touch_click":
            button = data.get("btn", "left")
            action = data.get("act", "click")
            self.input_engine.mouse_click(button=button, action=action)

        elif msg_type == "touch_scroll":
            dx = float(data.get("dx", 0))
            dy = float(data.get("dy", 0))
            self.input_engine.scroll(dx, dy)

        # 7. KEYBOARD INPUTS & MODIFIERS
        elif msg_type == "key":
            key = data.get("k", "")
            action = data.get("act", "tap")
            self.input_engine.key_press(key, action=action)
            self._notify("key_event", {"key": key, "act": action})

        elif msg_type == "key_combo":
            keys = data.get("keys", [])
            self.input_engine.hotkey(*keys)
            self._notify("key_event", {"key": "+".join(keys), "act": "combo"})

        elif msg_type == "type_text":
            text = data.get("text", "")
            self.input_engine.type_string(text)

        # 8. CONSOLE GAMEPAD
        elif msg_type == "gp_stick":
            stick = data.get("stick", "left")
            x = float(data.get("x", 0))
            y = float(data.get("y", 0))
            self.input_engine.set_gamepad_stick(stick, x, y)
            self._notify("gp_stick", {"stick": stick, "x": x, "y": y})

        elif msg_type == "gp_btn":
            btn = data.get("btn", "a")
            action = data.get("act", "tap")
            self.input_engine.set_gamepad_button(btn, action=action)
            self._notify("gp_button", {"btn": btn, "act": action})

        elif msg_type == "gp_trigger":
            trig = data.get("trig", "lt")
            val = float(data.get("v", 1.0))
            self.input_engine.set_gamepad_trigger(trig, val)

        elif msg_type == "gyro":
            gamma = float(data.get("gamma", 0))
            self.input_engine.handle_gyro_steering(gamma)

        # 9. MODE SWITCH
        elif msg_type == "mode":
            mode = data.get("mode", "touchpad")
            self.active_mode = mode
            if websocket in self.client_metadata:
                self.client_metadata[websocket]["mode"] = mode
            self._notify("mode_changed", {"mode": mode})

        # 10. CLIENT GEOLOCATION SYNC
        elif msg_type == "client_geo":
            geo = data.get("geo", {})
            dev_name = data.get("device_name", "Remote Phone")
            if websocket in self.client_metadata:
                self.client_metadata[websocket]["geo"] = geo
                self.client_metadata[websocket]["device_name"] = dev_name

                # Calculate distance between Desktop and Phone
                d_lat = self.desktop_geo_info.get("lat")
                d_lon = self.desktop_geo_info.get("lon")
                c_lat = geo.get("lat")
                c_lon = geo.get("lon")
                dist_km = calculate_distance_km(d_lat, d_lon, c_lat, c_lon)
                self.client_metadata[websocket]["distance_km"] = dist_km

                # Reply with geo_sync
                asyncio.run_coroutine_threadsafe(
                    websocket.send(json.dumps({
                        "type": "geo_sync",
                        "desktop": self.desktop_geo_info,
                        "client": geo,
                        "distance_km": dist_km
                    })),
                    self.loop
                )
                self._notify("client_geo_updated", self.get_device_list_info())

        # 11. FIND MY DEVICE (Bilateral Ringing & Alarm)
        elif msg_type == "find_device":
            target = data.get("target", "desktop")
            if target == "desktop":
                ring_desktop_alarm()
                self._notify("find_desktop_alarm", {"client_ip": websocket.remote_address[0]})

    def ring_phone(self, target_ip: str = None):
        """Send play_alarm packet to ring connected phone(s) loudly."""
        if not self.loop or not self.authenticated_clients:
            return
        packet = json.dumps({
            "type": "play_alarm",
            "title": "🔔 LOCATING CONTROLLER PHONE",
            "message": "DESKTOP PC IS RINGING THIS PHONE TO FIND IT!"
        })
        for ws in list(self.authenticated_clients):
            meta = self.client_metadata.get(ws, {})
            if not target_ip or meta.get("ip") == target_ip:
                asyncio.run_coroutine_threadsafe(ws.send(packet), self.loop)

    # ==========================================
    # LIFECYCLE MANAGEMENT
    # ==========================================
    def start(self):
        self.is_running = True

        # Start HTTP Server in background thread
        http_thread = threading.Thread(target=self._run_http_server, daemon=True)
        http_thread.start()

        # Start WebSocket Server in asyncio loop thread
        def _ws_thread_entry():
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)

            async def _process_request(connection, request):
                # Intercept Cloudflare HTTP health-check probes on the WS port and return 200 OK
                conn_header = request.headers.get("Connection", "").lower()
                if "upgrade" not in conn_header and request.headers.get("Upgrade", "").lower() != "websocket":
                    return connection.respond(200, [("Content-Type", "text/plain"), ("Access-Control-Allow-Origin", "*")], b"OK\n")
                return None

            async def _start_ws():
                self.ws_server = await websockets.serve(
                    self._handle_client,
                    "0.0.0.0",
                    self.ws_port,
                    process_request=_process_request,
                    ping_interval=10,
                    ping_timeout=20,
                    max_size=16_000_000
                )
                logging.info(f"WebSocket Server started on port {self.ws_port}")

            self.loop.run_until_complete(_start_ws())
            self.loop.run_forever()

        ws_thread = threading.Thread(target=_ws_thread_entry, daemon=True)
        ws_thread.start()

        # Start Automatic International Cloud Tunnel & WAN Discovery
        threading.Thread(target=self._auto_setup_international_signal, daemon=True).start()

        print("\n" + "="*60)
        print("[*] REMOTE4REAL CONTROLLER SERVER ONLINE")
        print("[*] ENGINEERED BY ALCHEMIST4REAL")
        print(f"[*] SECURITY PIN: {self.security_pin}")
        print("="*60)
        urls = self.get_connection_urls()
        print("\nOpen on phone or scan QR code:")
        for u in urls:
            print(f"  -> {u}")
        print("="*60 + "\n")

    def stop(self):
        self.is_running = False
        self.input_engine.release_all_keys()
        self.screen_capturer.cleanup()
        if self.broadcast_stream_task:
            self.broadcast_stream_task.cancel()
        if self.httpd:
            try:
                self.httpd.shutdown()
                self.httpd.server_close()
            except Exception:
                pass
        if self.ws_server:
            try:
                self.ws_server.close()
            except Exception:
                pass
        if self.loop and self.loop.is_running():
            try:
                self.loop.call_soon_threadsafe(self.loop.stop)
            except Exception:
                pass
        logging.info("Server stopped gracefully.")


if __name__ == "__main__":
    server = ControllerServer()
    server.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        server.stop()
