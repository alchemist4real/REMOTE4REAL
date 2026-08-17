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

def ring_desktop_alarm():
    """Rings a loud multi-tone alert chime on PC speakers to find this desktop."""
    def _beep_worker():
        try:
            import winsound
            tones = [
                (1046, 120), (1318, 120), (1567, 120), (2093, 280),
                (1046, 120), (1318, 120), (1567, 120), (2093, 400)
            ]
            for freq, dur in tones:
                winsound.Beep(freq, dur)
                time.sleep(0.03)
        except Exception:
            try:
                import winsound
                for _ in range(4):
                    winsound.MessageBeep(winsound.MB_ICONEXCLAMATION)
                    time.sleep(0.2)
            except Exception:
                pass
    threading.Thread(target=_beep_worker, daemon=True).start()

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

        # Multi-Device Stream Management
        self.streaming_clients: Set[websockets.WebSocketServerProtocol] = set()
        self.broadcast_stream_task: asyncio.Task = None

        self.status_callbacks: list[Callable[[str, Any], None]] = []
        self.is_running = False
        self.httpd = None
        self.ws_server = None
        self.loop = None
        self.active_mode = "touchpad"

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

                # 4. Static Assets
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

        # Send initial handshake asking for PIN
        try:
            await websocket.send(json.dumps({
                "type": "auth_required",
                "software": "REMOTE4REAL",
                "screen": self.screen_capturer.get_resolution(),
                "server_time": time.time()
            }))
        except Exception as e:
            logging.error(f"Error sending auth_required packet: {e}")

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

            async def _start_ws():
                self.ws_server = await websockets.serve(
                    self._handle_client,
                    "0.0.0.0",
                    self.ws_port,
                    ping_interval=10,
                    ping_timeout=20,
                    max_size=16_000_000
                )
                logging.info(f"WebSocket Server started on port {self.ws_port}")

            self.loop.run_until_complete(_start_ws())
            self.loop.run_forever()

        ws_thread = threading.Thread(target=_ws_thread_entry, daemon=True)
        ws_thread.start()

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
