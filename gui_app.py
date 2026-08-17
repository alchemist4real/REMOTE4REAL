"""
REMOTE4REAL — Desktop Companion Control Panel
Monochromatic Swiss/Braun Design with CustomTkinter, HighDPI Support,
Dynamic QR Code, PIN Security, Bluetooth Tethering, and Live Multi-Device Monitor.
Zero Emoji • Zero Overflow • Monochromatic Aesthetics
"""

import os
import sys
import io
import time
import socket
import logging
import threading
import tkinter as tk
from tkinter import messagebox
import customtkinter as ctk
import qrcode
from PIL import Image

from server import ControllerServer
from version import __version__, __github_url__, __app_name__, __author__
import updater

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Load Custom Theme
THEME_PATH = os.path.join(getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__))), "r4r_theme.json")
if os.path.exists(THEME_PATH):
    try:
        ctk.set_default_color_theme(THEME_PATH)
    except Exception as e:
        logging.warning(f"Could not load custom theme: {e}")

ctk.set_appearance_mode("Light")


class Remote4RealDesktopGUI:
    def __init__(self, root: ctk.CTk):
        self.root = root
        self.root.title(f"REMOTE4REAL v{__version__} — Desktop Companion • by {__author__}")
        self.root.geometry("700x780")
        self.root.minsize(640, 720)

        # App Icon
        icon_path = os.path.join(getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__))), "app_icon.ico")
        if os.path.exists(icon_path):
            try:
                self.root.iconbitmap(icon_path)
            except Exception:
                pass

        self.server = ControllerServer(http_port=8080, ws_port=8765)
        self.qr_image_ctk = None
        self.selected_ip = ""
        self.connection_mode = "wifi" # "wifi" or "bluetooth"
        self.latest_update_info = None
        self.current_theme_mode = "Light"

        self.build_ui()
        self.server.add_status_callback(self.on_server_event)
        self.start_server()

        # Check for updates in background on launch
        self.root.after(1000, lambda: updater.check_for_updates_async(self.on_update_check_result))

        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

    def build_ui(self):
        # 0. UPDATE BANNER (Hidden by default)
        self.update_banner_frame = ctk.CTkFrame(self.root, fg_color=("#000000", "#1a1a22"), corner_radius=0)
        
        self.lbl_update_text = ctk.CTkLabel(
            self.update_banner_frame,
            text="",
            font=("Courier New", 11, "bold"),
            text_color="#ffffff"
        )
        self.lbl_update_text.pack(side=tk.LEFT, padx=(16, 12), pady=8)

        self.btn_download_update = ctk.CTkButton(
            self.update_banner_frame,
            text="[DOWNLOAD UPDATE]",
            font=("Courier New", 10, "bold"),
            fg_color="#ffffff",
            text_color="#000000",
            hover_color="#e0e0e0",
            corner_radius=4,
            height=28,
            command=self.open_update_url
        )
        self.btn_download_update.pack(side=tk.LEFT, padx=(0, 8), pady=8)

        btn_dismiss_update = ctk.CTkButton(
            self.update_banner_frame,
            text="✕",
            font=("Courier New", 11, "bold"),
            fg_color="#333333",
            text_color="#ffffff",
            hover_color="#555555",
            corner_radius=4,
            width=28,
            height=28,
            command=self.dismiss_update_banner
        )
        btn_dismiss_update.pack(side=tk.RIGHT, padx=16, pady=8)

        # 1. TOP HEADER BAR
        header_frame = ctk.CTkFrame(self.root, fg_color=("#ffffff", "#0c0c0e"), corner_radius=0)
        header_frame.pack(fill=tk.X, padx=16, pady=(12, 6))

        # Brand / Title
        brand_frame = ctk.CTkFrame(header_frame, fg_color="transparent")
        brand_frame.pack(side=tk.LEFT)

        logo_lbl = ctk.CTkLabel(
            brand_frame,
            text="R4",
            font=("Courier New", 11, "bold"),
            fg_color=("#000000", "#ffffff"),
            text_color=("#ffffff", "#000000"),
            corner_radius=4,
            width=32,
            height=28
        )
        logo_lbl.pack(side=tk.LEFT, padx=(0, 10))

        title_lbl = ctk.CTkLabel(
            brand_frame,
            text="REMOTE4REAL",
            font=("Courier New", 15, "bold"),
            text_color=("#000000", "#ffffff")
        )
        title_lbl.pack(side=tk.LEFT)

        ver_lbl = ctk.CTkLabel(
            brand_frame,
            text=f"v{__version__}",
            font=("Courier New", 10, "bold"),
            fg_color=("#f1f1f4", "#1c1c22"),
            text_color=("#000000", "#f1f1f4"),
            corner_radius=4,
            width=48,
            height=24
        )
        ver_lbl.pack(side=tk.LEFT, padx=(8, 6))

        author_lbl = ctk.CTkLabel(
            brand_frame,
            text="BY ALCHEMIST4REAL",
            font=("Courier New", 9, "bold"),
            fg_color=("#f8f8fa", "#16161a"),
            text_color=("#666666", "#999999"),
            corner_radius=4,
            height=24
        )
        author_lbl.pack(side=tk.LEFT)

        # Header Right Controls (PIN + Theme Toggle)
        header_right = ctk.CTkFrame(header_frame, fg_color="transparent")
        header_right.pack(side=tk.RIGHT)

        pin_label = ctk.CTkLabel(
            header_right,
            text="PIN:",
            font=("Courier New", 11, "bold"),
            text_color=("#666666", "#888888")
        )
        pin_label.pack(side=tk.LEFT, padx=(0, 6))

        self.lbl_pin_display = ctk.CTkLabel(
            header_right,
            text=self.server.security_pin,
            font=("Courier New", 13, "bold"),
            fg_color=("#f1f1f4", "#1a1a20"),
            text_color=("#000000", "#ffffff"),
            corner_radius=4,
            width=64,
            height=28
        )
        self.lbl_pin_display.pack(side=tk.LEFT, padx=(0, 6))

        btn_regen_pin = ctk.CTkButton(
            header_right,
            text="NEW PIN",
            font=("Courier New", 9, "bold"),
            fg_color=("#000000", "#ffffff"),
            text_color=("#ffffff", "#000000"),
            hover_color=("#222222", "#dcdcdc"),
            corner_radius=4,
            width=72,
            height=28,
            command=self.on_regenerate_pin
        )
        btn_regen_pin.pack(side=tk.LEFT, padx=(0, 8))

        # Dark/Light Mode Switcher Button
        self.btn_theme_toggle = ctk.CTkButton(
            header_right,
            text="◐ THEME",
            font=("Courier New", 9, "bold"),
            fg_color=("#f1f1f4", "#1a1a20"),
            text_color=("#000000", "#ffffff"),
            hover_color=("#e2e2e6", "#282832"),
            corner_radius=4,
            width=68,
            height=28,
            command=self.toggle_theme_mode
        )
        self.btn_theme_toggle.pack(side=tk.LEFT)

        # Header Separator Line
        ctk.CTkFrame(self.root, height=2, fg_color=("#000000", "#ffffff"), corner_radius=0).pack(fill=tk.X, padx=16, pady=(4, 6))

        # 2. QUICK LAUNCHERS & STATUS BAR
        launch_bar = ctk.CTkFrame(self.root, fg_color=("#f8f8fa", "#141418"), corner_radius=6, border_width=1, border_color=("#e2e2e6", "#26262e"))
        launch_bar.pack(fill=tk.X, padx=16, pady=4)

        tk_launch_inner = ctk.CTkFrame(launch_bar, fg_color="transparent")
        tk_launch_inner.pack(fill=tk.X, padx=12, pady=6)

        ctk.CTkLabel(
            tk_launch_inner,
            text="QUICK LAUNCHERS:",
            font=("Courier New", 10, "bold"),
            text_color=("#666666", "#888888")
        ).pack(side=tk.LEFT, padx=(0, 10))

        btn_yt = ctk.CTkButton(
            tk_launch_inner,
            text="[OPEN YOUTUBE]",
            font=("Courier New", 9, "bold"),
            fg_color=("#ffffff", "#1a1a20"),
            text_color=("#000000", "#ffffff"),
            border_width=1,
            border_color=("#d0d0d4", "#303038"),
            hover_color=("#f0f0f4", "#262630"),
            corner_radius=4,
            height=26,
            command=lambda: self.server.input_engine.launch_youtube()
        )
        btn_yt.pack(side=tk.LEFT, padx=4)

        btn_spot = ctk.CTkButton(
            tk_launch_inner,
            text="[OPEN SPOTIFY]",
            font=("Courier New", 9, "bold"),
            fg_color=("#ffffff", "#1a1a20"),
            text_color=("#000000", "#ffffff"),
            border_width=1,
            border_color=("#d0d0d4", "#303038"),
            hover_color=("#f0f0f4", "#262630"),
            corner_radius=4,
            height=26,
            command=lambda: self.server.input_engine.launch_spotify()
        )
        btn_spot.pack(side=tk.LEFT, padx=4)

        self.lbl_active_devs_count = ctk.CTkLabel(
            tk_launch_inner,
            text="CONNECTED DEVICES: 0",
            font=("Courier New", 10, "bold"),
            text_color=("#000000", "#ffffff"),
            fg_color=("#ffffff", "#1a1a20"),
            corner_radius=4,
            padx=10,
            pady=2
        )
        self.lbl_active_devs_count.pack(side=tk.RIGHT)

        # 3. TABBED INTERFACE
        self.tabview = ctk.CTkTabview(
            self.root,
            corner_radius=6,
            border_width=1,
            border_color=("#e2e2e6", "#26262e"),
            fg_color=("#ffffff", "#0e0e10"),
            segmented_button_fg_color=("#f1f1f4", "#1a1a20"),
            segmented_button_selected_color=("#000000", "#ffffff"),
            segmented_button_selected_hover_color=("#222222", "#dedede"),
            segmented_button_unselected_color=("#f1f1f4", "#1a1a20"),
            segmented_button_unselected_hover_color=("#e5e5e8", "#24242c"),
            text_color=("#ffffff", "#000000")
        )
        self.tabview.pack(fill=tk.BOTH, expand=True, padx=16, pady=(4, 12))

        self.tab_connect = self.tabview.add(" CONNECT QR ")
        self.tab_devices = self.tabview.add(" ACTIVE DEVICES ")
        self.tab_bluetooth = self.tabview.add(" GLOBAL & OFFLINE GUIDE ")
        self.tab_settings = self.tabview.add(" SECURITY & CONFIG ")

        self.build_connect_tab()
        self.build_devices_tab()
        self.build_bluetooth_tab()
        self.build_settings_tab()

    def toggle_theme_mode(self):
        if self.current_theme_mode == "Light":
            self.current_theme_mode = "Dark"
            ctk.set_appearance_mode("Dark")
        else:
            self.current_theme_mode = "Light"
            ctk.set_appearance_mode("Light")
        self.update_qr_code()

    # ==========================================
    # 1. CONNECT TAB (QR & ADAPTER SELECTOR)
    # ==========================================
    def build_connect_tab(self):
        container = ctk.CTkFrame(self.tab_connect, fg_color="transparent")
        container.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        # Connection Mode Selector (Segmented Button)
        self.seg_mode = ctk.CTkSegmentedButton(
            container,
            values=["LOCAL WI-FI / LAN", "BLUETOOTH TETHERING", "WORLDWIDE / VPN"],
            command=self.on_segmented_mode_change,
            font=("Courier New", 10, "bold"),
            height=32
        )
        self.seg_mode.set("LOCAL WI-FI / LAN")
        self.seg_mode.pack(fill=tk.X, pady=(0, 8))

        # Adapter Selection Row
        adapter_row = ctk.CTkFrame(container, fg_color="transparent")
        adapter_row.pack(fill=tk.X, pady=(0, 6))

        ctk.CTkLabel(
            adapter_row,
            text="NETWORK ADAPTER / INTERFACE IP:",
            font=("Courier New", 10, "bold"),
            text_color=("#444444", "#aaaaaa")
        ).pack(anchor=tk.W, pady=(0, 2))

        self.ip_choices = self.server.get_local_ip_addresses()
        self.combo_options = [f"{item['ip']} ({item['name']})" for item in self.ip_choices]
        
        self.combo_ip = ctk.CTkComboBox(
            adapter_row,
            values=self.combo_options if self.combo_options else ["127.0.0.1 (Loopback)"],
            command=self.on_ip_combo_change,
            font=("Courier New", 10),
            dropdown_font=("Courier New", 10),
            height=30
        )
        if self.combo_options:
            self.combo_ip.set(self.combo_options[0])
            self.selected_ip = self.ip_choices[0]['ip']
        else:
            self.selected_ip = "127.0.0.1"
        self.combo_ip.pack(fill=tk.X)

        # Custom Global URL Row (for Cloudflare / Ngrok / Custom Domain)
        custom_url_row = ctk.CTkFrame(container, fg_color="transparent")
        custom_url_row.pack(fill=tk.X, pady=(4, 6))

        ctk.CTkLabel(
            custom_url_row,
            text="CUSTOM GLOBAL HOST / TUNNEL URL:",
            font=("Courier New", 9, "bold"),
            text_color=("#666666", "#888888")
        ).pack(anchor=tk.W, pady=(0, 1))

        custom_url_inner = ctk.CTkFrame(custom_url_row, fg_color="transparent")
        custom_url_inner.pack(fill=tk.X)

        self.entry_custom_host = ctk.CTkEntry(
            custom_url_inner,
            font=("Courier New", 10),
            placeholder_text="e.g. 100.x.x.x, my-tunnel.trycloudflare.com, or public IP",
            height=28
        )
        self.entry_custom_host.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))

        btn_apply_host = ctk.CTkButton(
            custom_url_inner,
            text="APPLY HOST",
            font=("Courier New", 9, "bold"),
            fg_color=("#000000", "#ffffff"),
            text_color=("#ffffff", "#000000"),
            hover_color=("#222222", "#dcdcdc"),
            corner_radius=4,
            width=80,
            height=28,
            command=self.on_apply_custom_host
        )
        btn_apply_host.pack(side=tk.RIGHT)

        # QR Display Card
        qr_card = ctk.CTkFrame(
            container,
            fg_color=("#f8f8fa", "#141418"),
            border_width=1,
            border_color=("#e2e2e6", "#26262e"),
            corner_radius=6
        )
        qr_card.pack(fill=tk.BOTH, expand=True, pady=(2, 0))

        # QR Container Frame (Fixed pure white background for QR scannability)
        qr_border_box = ctk.CTkFrame(
            qr_card,
            fg_color="#ffffff",
            corner_radius=6,
            border_width=1,
            border_color="#d0d0d4",
            width=180,
            height=180
        )
        qr_border_box.pack(pady=(8, 6))
        qr_border_box.pack_propagate(False)

        self.qr_label = ctk.CTkLabel(qr_border_box, text="", fg_color="#ffffff")
        self.qr_label.pack(expand=True)

        # URL Box & Copy Button
        url_box = ctk.CTkFrame(qr_card, fg_color="transparent")
        url_box.pack(fill=tk.X, padx=14, pady=2)

        self.url_label = ctk.CTkLabel(
            url_box,
            text="http://localhost:8080",
            font=("Courier New", 10, "bold"),
            fg_color=("#ffffff", "#1a1a20"),
            text_color=("#000000", "#ffffff"),
            corner_radius=4,
            height=32
        )
        self.url_label.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))

        btn_copy = ctk.CTkButton(
            url_box,
            text="[COPY URL]",
            font=("Courier New", 9, "bold"),
            fg_color=("#000000", "#ffffff"),
            text_color=("#ffffff", "#000000"),
            hover_color=("#222222", "#dcdcdc"),
            corner_radius=4,
            width=85,
            height=32,
            command=self.copy_url
        )
        btn_copy.pack(side=tk.RIGHT)

        self.phone_status_lbl = ctk.CTkLabel(
            qr_card,
            text="Scan with Phone Camera or in-app scanner to connect auto-authenticated",
            font=("Courier New", 9, "bold"),
            text_color=("#666666", "#888888")
        )
        self.phone_status_lbl.pack(pady=(2, 6))

        self.update_qr_code()

    def on_apply_custom_host(self):
        host = self.entry_custom_host.get().strip()
        if not host:
            return
        # Clean host (remove http:// or https:// if provided)
        host = host.replace("http://", "").replace("https://", "").rstrip("/")
        self.selected_ip = host
        self.update_qr_code()
        messagebox.showinfo("Global Host Applied", f"Active Host set to:\n{self.selected_ip}\nQR Code updated for worldwide access.")

    def on_segmented_mode_change(self, value):
        if "BLUETOOTH" in value:
            self.switch_conn_mode("bluetooth")
        elif "WORLDWIDE" in value or "VPN" in value:
            self.switch_conn_mode("vpn")
        else:
            self.switch_conn_mode("wifi")

    def switch_conn_mode(self, mode: str):
        self.connection_mode = mode
        if mode == "wifi":
            for idx, item in enumerate(self.ip_choices):
                if not item.get("is_bt") and not item.get("is_vpn"):
                    if idx < len(self.combo_options):
                        self.combo_ip.set(self.combo_options[idx])
                    self.selected_ip = item["ip"]
                    break
        elif mode == "bluetooth":
            for idx, item in enumerate(self.ip_choices):
                if item.get("is_bt"):
                    if idx < len(self.combo_options):
                        self.combo_ip.set(self.combo_options[idx])
                    self.selected_ip = item["ip"]
                    break
        elif mode == "vpn":
            found_vpn = False
            for idx, item in enumerate(self.ip_choices):
                if item.get("is_vpn"):
                    if idx < len(self.combo_options):
                        self.combo_ip.set(self.combo_options[idx])
                    self.selected_ip = item["ip"]
                    found_vpn = True
                    break
            if not found_vpn:
                messagebox.showinfo(
                    "Worldwide / Tailscale Setup",
                    "No active VPN (Tailscale/ZeroTier) detected on this PC.\n\n"
                    "Tip: Install Tailscale on PC & Phone for instant 1-click international connection, "
                    "or enter your Cloudflare Tunnel URL in 'CUSTOM GLOBAL HOST'."
                )
        else:
            for idx, item in enumerate(self.ip_choices):
                if item.get("is_bt"):
                    if idx < len(self.combo_options):
                        self.combo_ip.set(self.combo_options[idx])
                    self.selected_ip = item["ip"]
                    break

        self.update_qr_code()

    def on_ip_combo_change(self, choice_str):
        for item in self.ip_choices:
            if item['ip'] in choice_str:
                self.selected_ip = item['ip']
                break
        self.update_qr_code()

    def update_qr_code(self):
        url = f"http://{self.selected_ip}:{self.server.http_port}/?pin={self.server.security_pin}"
        self.url_label.configure(text=url)

        qr = qrcode.QRCode(box_size=5, border=1)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#000000", back_color="#ffffff").convert("RGB")
        img = img.resize((180, 180), Image.NEAREST)
        
        self.qr_image_ctk = ctk.CTkImage(light_image=img, dark_image=img, size=(180, 180))
        self.qr_label.configure(image=self.qr_image_ctk)

    def on_regenerate_pin(self):
        new_pin = self.server.generate_random_pin()
        self.lbl_pin_display.configure(text=new_pin)
        self.entry_custom_pin.delete(0, tk.END)
        self.entry_custom_pin.insert(0, new_pin)
        self.update_qr_code()
        messagebox.showinfo("Security PIN Updated", f"New Security PIN: {new_pin}\nPrevious connections must re-authenticate.")

    def copy_url(self):
        url = f"http://{self.selected_ip}:{self.server.http_port}/?pin={self.server.security_pin}"
        self.root.clipboard_clear()
        self.root.clipboard_append(url)
        messagebox.showinfo("Copied", f"Auto-Auth URL copied:\n{url}")

    # ==========================================
    # 2. ACTIVE DEVICES TAB (MULTI-DEVICE MONITOR)
    # ==========================================
    def build_devices_tab(self):
        card = ctk.CTkFrame(
            self.tab_devices,
            fg_color=("#f8f8fa", "#141418"),
            border_width=1,
            border_color=("#e2e2e6", "#26262e"),
            corner_radius=6
        )
        card.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        ctk.CTkLabel(
            card,
            text="AUTHENTICATED CONNECTED DEVICES",
            font=("Courier New", 11, "bold"),
            text_color=("#000000", "#ffffff")
        ).pack(anchor=tk.W, padx=14, pady=(12, 6))

        # Device List Textbox
        self.devices_textbox = ctk.CTkTextbox(
            card,
            font=("Courier New", 10),
            corner_radius=4,
            border_width=1,
            border_color=("#d0d0d4", "#2e2e36"),
            fg_color=("#ffffff", "#101014"),
            text_color=("#000000", "#ffffff"),
            height=180
        )
        self.devices_textbox.pack(fill=tk.BOTH, expand=True, padx=14, pady=4)
        self.devices_textbox.insert(tk.END, "No devices connected yet. Scan QR code to connect.\n")
        self.devices_textbox.configure(state="disabled")

        # Live Input Stream Activity Box
        ctk.CTkLabel(
            card,
            text="LIVE INPUT STREAM MONITOR:",
            font=("Courier New", 10, "bold"),
            text_color=("#666666", "#888888")
        ).pack(anchor=tk.W, padx=14, pady=(10, 4))

        self.lbl_last_action = ctk.CTkLabel(
            card,
            text="[IDLE - WAITING FOR INPUT]",
            font=("Courier New", 10, "bold"),
            fg_color=("#ffffff", "#101014"),
            text_color=("#000000", "#ffffff"),
            corner_radius=4,
            height=36
        )
        self.lbl_last_action.pack(fill=tk.X, padx=14, pady=(0, 14))

    # ==========================================
    # 3. BLUETOOTH TETHERING SETUP GUIDE
    # ==========================================
    def build_bluetooth_tab(self):
        card = ctk.CTkFrame(
            self.tab_bluetooth,
            fg_color=("#f8f8fa", "#141418"),
            border_width=1,
            border_color=("#e2e2e6", "#26262e"),
            corner_radius=6
        )
        card.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        ctk.CTkLabel(
            card,
            text="PORTABLE BLUETOOTH & OFFLINE CONNECTION GUIDE",
            font=("Courier New", 11, "bold"),
            text_color=("#000000", "#ffffff")
        ).pack(anchor=tk.W, padx=14, pady=(12, 8))

        guide_box = ctk.CTkTextbox(
            card,
            font=("Courier New", 10),
            corner_radius=4,
            border_width=1,
            border_color=("#d0d0d4", "#2e2e36"),
            fg_color=("#ffffff", "#101014"),
            text_color=("#222222", "#e0e0e0")
        )
        guide_box.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 14))

        guide_text = (
            "================================================================\n"
            "OPTION 1: WORLDWIDE ACCESS VIA TAILSCALE MESH VPN (RECOMMENDED)\n"
            "================================================================\n"
            "Connect from ANY country, cellular 4G/5G, or hotel Wi-Fi without port forwarding:\n"
            "1. Install Tailscale (free) on both your PC and your Phone (tailscale.com).\n"
            "2. Sign in with the same account (Google/Apple/Microsoft) on both devices.\n"
            "3. In REMOTE4REAL: Select 'WORLDWIDE / VPN' on the Connect tab.\n"
            "4. Scan the QR code or open the 100.x.x.x URL on your phone from anywhere worldwide!\n\n"
            "================================================================\n"
            "OPTION 2: WORLDWIDE VIA CLOUDFLARE QUICK TUNNEL / REVERSE PROXY\n"
            "================================================================\n"
            "Instant public HTTPS link without signup or router configuration:\n"
            "1. Run in terminal: cloudflared tunnel --url http://localhost:8080\n"
            "2. Copy the generated URL (e.g. https://xxx.trycloudflare.com).\n"
            "3. Paste into 'CUSTOM GLOBAL HOST' on the Connect tab and click 'APPLY HOST'.\n"
            "4. Scan the generated QR code from any phone on mobile cellular data!\n\n"
            "================================================================\n"
            "OPTION 3: PHONE PORTABLE HOTSPOT (ULTRA-FAST < 2ms LATENCY)\n"
            "================================================================\n"
            "1. Turn on Mobile Hotspot on phone (cellular data is NOT required).\n"
            "2. Connect your PC's Wi-Fi directly to the phone's Hotspot.\n"
            "3. Scan the QR code in 'CONNECT QR' tab.\n\n"
            "================================================================\n"
            "OPTION 4: BLUETOOTH TETHERING (100% OFFLINE / NO ROUTER REQUIRED)\n"
            "================================================================\n"
            "1. Pair your phone with this PC via Windows Bluetooth Settings.\n"
            "2. On Phone: Go to Settings -> Network/Connections -> Enable 'Bluetooth Tethering'.\n"
            "3. On PC: Right-click phone in Bluetooth Devices -> Connect using -> Access Point.\n"
            "4. In REMOTE4REAL: Switch to 'BLUETOOTH TETHERING' on the Connect tab and scan the QR!\n\n"
            "================================================================\n"
            "OPTION 5: LOCAL WI-FI ROUTER (HOME / OFFICE LAN)\n"
            "================================================================\n"
            "1. Connect both PC and Phone to the same Wi-Fi network.\n"
            "2. Scan the Wi-Fi QR code in 'LOCAL WI-FI / LAN'."
        )
        guide_box.insert(tk.END, guide_text)
        guide_box.configure(state="disabled")

    # ==========================================
    # 4. SECURITY & CONFIG TAB
    # ==========================================
    def build_settings_tab(self):
        card = ctk.CTkFrame(
            self.tab_settings,
            fg_color=("#f8f8fa", "#141418"),
            border_width=1,
            border_color=("#e2e2e6", "#26262e"),
            corner_radius=6
        )
        card.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        # Access Control & Custom PIN
        ctk.CTkLabel(
            card,
            text="ACCESS CONTROL & SECURITY PIN",
            font=("Courier New", 11, "bold"),
            text_color=("#000000", "#ffffff")
        ).pack(anchor=tk.W, padx=14, pady=(12, 4))

        pin_row = ctk.CTkFrame(card, fg_color="transparent")
        pin_row.pack(fill=tk.X, padx=14, pady=4)

        ctk.CTkLabel(
            pin_row,
            text="CUSTOM PIN:",
            font=("Courier New", 10, "bold"),
            text_color=("#444444", "#aaaaaa")
        ).pack(side=tk.LEFT, padx=(0, 8))

        self.entry_custom_pin = ctk.CTkEntry(
            pin_row,
            font=("Courier New", 11, "bold"),
            width=100,
            justify=tk.CENTER,
            height=30
        )
        self.entry_custom_pin.insert(0, self.server.security_pin)
        self.entry_custom_pin.pack(side=tk.LEFT, padx=(0, 8))

        btn_save_pin = ctk.CTkButton(
            pin_row,
            text="SET CUSTOM PIN",
            font=("Courier New", 9, "bold"),
            fg_color=("#000000", "#ffffff"),
            text_color=("#ffffff", "#000000"),
            hover_color=("#222222", "#dcdcdc"),
            corner_radius=4,
            height=30,
            command=self.on_set_custom_pin
        )
        btn_save_pin.pack(side=tk.LEFT)

        ctk.CTkLabel(
            card,
            text="Unauthenticated devices are strictly prohibited from controlling input or streaming screen.",
            font=("Courier New", 8),
            text_color=("#777777", "#888888")
        ).pack(anchor=tk.W, padx=14, pady=(2, 12))

        # Gamepad Driver Mode Selector
        ctk.CTkLabel(
            card,
            text="GAMEPAD DRIVER ENGINE:",
            font=("Courier New", 10, "bold"),
            text_color=("#000000", "#ffffff")
        ).pack(anchor=tk.W, padx=14, pady=(0, 4))

        self.gamepad_mode_var = tk.StringVar(value="keyboard_directx")

        rb1 = ctk.CTkRadioButton(
            card,
            text="DirectX High-Speed Keyboard/Mouse Simulation",
            variable=self.gamepad_mode_var,
            value="keyboard_directx",
            font=("Courier New", 10),
            command=lambda: setattr(self.server.input_engine, 'gamepad_mode', 'keyboard_directx')
        )
        rb1.pack(anchor=tk.W, padx=14, pady=2)

        rb2 = ctk.CTkRadioButton(
            card,
            text="Xbox 360 Controller (vgamepad XInput Virtual Bus)",
            variable=self.gamepad_mode_var,
            value="xinput",
            font=("Courier New", 10),
            command=lambda: setattr(self.server.input_engine, 'gamepad_mode', 'xinput')
        )
        rb2.pack(anchor=tk.W, padx=14, pady=2)

        btn_emergency = ctk.CTkButton(
            card,
            text="[EMERGENCY RELEASE ALL KEYS]",
            font=("Courier New", 9, "bold"),
            fg_color=("#000000", "#ffffff"),
            text_color=("#ffffff", "#000000"),
            hover_color=("#222222", "#dcdcdc"),
            corner_radius=4,
            height=30,
            command=self.server.input_engine.release_all_keys
        )
        btn_emergency.pack(anchor=tk.W, padx=14, pady=(8, 14))

        # Software Version & Updates
        ctk.CTkLabel(
            card,
            text="SOFTWARE VERSION & GITHUB UPDATES:",
            font=("Courier New", 10, "bold"),
            text_color=("#000000", "#ffffff")
        ).pack(anchor=tk.W, padx=14, pady=(0, 4))

        ver_row = ctk.CTkFrame(card, fg_color="transparent")
        ver_row.pack(fill=tk.X, padx=14, pady=2)

        ctk.CTkLabel(
            ver_row,
            text=f"CURRENT: v{__version__}",
            font=("Courier New", 10, "bold"),
            fg_color=("#ffffff", "#1a1a20"),
            text_color=("#000000", "#ffffff"),
            corner_radius=4,
            padx=10,
            pady=4,
            height=30
        ).pack(side=tk.LEFT, padx=(0, 8))

        btn_check_update = ctk.CTkButton(
            ver_row,
            text="CHECK FOR UPDATES NOW",
            font=("Courier New", 9, "bold"),
            fg_color=("#000000", "#ffffff"),
            text_color=("#ffffff", "#000000"),
            hover_color=("#222222", "#dcdcdc"),
            corner_radius=4,
            height=30,
            command=self.check_updates_now
        )
        btn_check_update.pack(side=tk.LEFT)

        self.lbl_update_status = ctk.CTkLabel(
            card,
            text="Status: Ready",
            font=("Courier New", 9),
            text_color=("#666666", "#888888")
        )
        self.lbl_update_status.pack(anchor=tk.W, padx=14, pady=(4, 12))

    def on_set_custom_pin(self):
        new_pin = self.entry_custom_pin.get().strip()
        if len(new_pin) < 4:
            messagebox.showwarning("Invalid PIN", "PIN must be at least 4 characters/digits.")
            return
        self.server.set_pin(new_pin)
        self.lbl_pin_display.configure(text=new_pin)
        self.update_qr_code()
        messagebox.showinfo("PIN Updated", f"Security PIN updated to: {new_pin}")

    # ==========================================
    # AUTO-UPDATE UI DISPATCHERS
    # ==========================================
    def on_update_check_result(self, result: dict):
        try:
            self.root.after(0, self._apply_update_result, result)
        except Exception:
            pass

    def _apply_update_result(self, result: dict):
        self.latest_update_info = result
        if result.get("has_update"):
            new_ver = result.get("latest_version", "latest")
            self.lbl_update_text.configure(text=f"UPDATE AVAILABLE: v{new_ver}")
            self.update_banner_frame.pack(fill=tk.X, side=tk.TOP, before=self.tabview)
            self.lbl_update_status.configure(
                text=f"Update v{new_ver} available! Click Download.",
                text_color=("#0066cc", "#4da6ff")
            )
        elif result.get("error") == "NO_RELEASES_PUBLISHED":
            self.lbl_update_status.configure(text=f"You are running the latest version (v{__version__}).", text_color=("#228822", "#44bb44"))
        elif result.get("error"):
            self.lbl_update_status.configure(text=f"Update check offline: {result['error']}", text_color=("#888888", "#888888"))
        else:
            self.lbl_update_status.configure(text=f"REMOTE4REAL is up to date (v{__version__}).", text_color=("#228822", "#44bb44"))

    def check_updates_now(self):
        self.lbl_update_status.configure(text="Checking GitHub for latest release...", text_color=("#000000", "#ffffff"))
        updater.check_for_updates_async(self.on_update_check_result, force=True)

    def open_update_url(self):
        url = self.latest_update_info.get("release_url") if self.latest_update_info else f"{__github_url__}/releases"
        import webbrowser
        webbrowser.open(url)

    def dismiss_update_banner(self):
        self.update_banner_frame.pack_forget()

    # ==========================================
    # SERVER EVENT DISPATCHER
    # ==========================================
    def on_server_event(self, event: str, data: any):
        try:
            self.root.after(0, self._process_ui_update, event, data)
        except Exception:
            pass

    def _process_ui_update(self, event: str, data: any):
        if event in ("client_authenticated", "client_disconnected"):
            devices = data if isinstance(data, list) else []
            self.lbl_active_devs_count.configure(text=f"CONNECTED DEVICES: {len(devices)}")
            self.devices_textbox.configure(state="normal")
            self.devices_textbox.delete("1.0", tk.END)
            if not devices:
                self.devices_textbox.insert(tk.END, "No devices connected yet. Scan QR code to connect.\n")
            else:
                for idx, dev in enumerate(devices, 1):
                    self.devices_textbox.insert(
                        tk.END,
                        f"[{idx}] IP: {dev.get('ip')} | Mode: {dev.get('mode', 'touchpad').upper()}\n"
                    )
            self.devices_textbox.configure(state="disabled")

        elif event == "screen_touch_click":
            self.lbl_last_action.configure(text=f"SCREEN TOUCH: ({data.get('x',0):.2f}, {data.get('y',0):.2f}) [{data.get('btn').upper()}]")

        elif event == "yt_cmd":
            self.lbl_last_action.configure(text=f"YOUTUBE: {data.get('cmd').upper()} {data.get('query', '')}")

        elif event == "spotify_cmd":
            self.lbl_last_action.configure(text=f"SPOTIFY: {data.get('cmd').upper()}")

        elif event == "touchpad_move":
            self.lbl_last_action.configure(text=f"MOUSE MOVE: dx={data.get('dx',0):.1f}, dy={data.get('dy',0):.1f}")

        elif event == "key_event":
            self.lbl_last_action.configure(text=f"KEY EVENT: {data.get('key').upper()} [{data.get('act').upper()}]")

        elif event == "gp_stick":
            stick = data.get("stick")
            x = data.get("x", 0)
            y = data.get("y", 0)
            self.lbl_last_action.configure(text=f"STICK ({stick.upper()}): ({x:+.2f}, {y:+.2f})")

        elif event == "gp_button":
            self.lbl_last_action.configure(text=f"GAMEPAD BTN: {data.get('btn').upper()} [{data.get('act').upper()}]")

    def start_server(self):
        try:
            self.server.start()
        except Exception as e:
            messagebox.showerror("Server Error", f"Could not start server: {e}")

    def on_closing(self):
        self.server.stop()
        self.root.destroy()
        sys.exit(0)


def main():
    root = ctk.CTk()
    app = Remote4RealDesktopGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
