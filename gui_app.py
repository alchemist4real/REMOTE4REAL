"""
REMOTE4REAL — Desktop Companion Control Panel
Monochromatic Swiss/Braun Design with QR Code, PIN Security, Bluetooth Tethering, and Live Multi-Device Monitor.
Zero Emoji • Zero Overflow • OffBit Typography
"""

import os
import sys
import io
import time
import socket
import logging
import threading
import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
import qrcode
from PIL import Image, ImageTk

from server import ControllerServer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

class Remote4RealDesktopGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("REMOTE4REAL — Desktop Companion")
        self.root.geometry("660x740")
        self.root.minsize(600, 680)
        self.root.configure(bg="#ffffff")

        icon_path = os.path.join(getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__))), "app_icon.ico")
        if os.path.exists(icon_path):
            try:
                self.root.iconbitmap(icon_path)
            except Exception:
                pass

        self.server = ControllerServer(http_port=8080, ws_port=8765)
        self.qr_image_tk = None
        self.selected_ip = ""
        self.connection_mode = "wifi" # "wifi" or "bluetooth"
        
        self.setup_styles()
        self.build_ui()
        self.server.add_status_callback(self.on_server_event)
        self.start_server()

        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

    def setup_styles(self):
        self.style = ttk.Style()
        self.style.theme_use('clam')

        self.style.configure("TNotebook", background="#ffffff", borderwidth=0)
        self.style.configure("TNotebook.Tab", background="#f1f1f4", foreground="#000000",
                             padding=[14, 8], font=("Courier", 10, "bold"), borderwidth=0)
        self.style.map("TNotebook.Tab",
                       background=[("selected", "#000000"), ("active", "#e5e5e7")],
                       foreground=[("selected", "#ffffff"), ("active", "#000000")])

        self.style.configure("TCombobox", fieldbackground="#ffffff", background="#f1f1f4",
                             foreground="#000000", arrowcolor="#000000")

    def build_ui(self):
        # 1. TOP HEADER BAR
        header_frame = tk.Frame(self.root, bg="#ffffff", height=50, padx=16, pady=8)
        header_frame.pack(fill=tk.X)

        brand_frame = tk.Frame(header_frame, bg="#ffffff")
        brand_frame.pack(side=tk.LEFT)

        logo_lbl = tk.Label(brand_frame, text="R4", font=("Courier", 10, "bold"),
                            bg="#000000", fg="#ffffff", padx=6, pady=2)
        logo_lbl.pack(side=tk.LEFT, padx=(0, 8))

        title_lbl = tk.Label(brand_frame, text="REMOTE4REAL", font=("Courier", 14, "bold"),
                             fg="#000000", bg="#ffffff")
        title_lbl.pack(side=tk.LEFT)

        # PIN Badge in Header
        pin_frame = tk.Frame(header_frame, bg="#ffffff")
        pin_frame.pack(side=tk.RIGHT)

        tk.Label(pin_frame, text="PIN:", font=("Courier", 10, "bold"), fg="#666666", bg="#ffffff").pack(side=tk.LEFT, padx=(0, 4))
        self.lbl_pin_display = tk.Label(pin_frame, text=self.server.security_pin, font=("Courier", 11, "bold"),
                                        fg="#000000", bg="#f1f1f4", padx=8, pady=2, relief=tk.SOLID, bd=1)
        self.lbl_pin_display.pack(side=tk.LEFT, padx=(0, 6))

        btn_regen_pin = tk.Button(pin_frame, text="NEW PIN", font=("Courier", 8, "bold"),
                                  bg="#000000", fg="#ffffff", padx=6, pady=2, relief=tk.FLAT,
                                  cursor="hand2", command=self.on_regenerate_pin)
        btn_regen_pin.pack(side=tk.LEFT)

        tk.Frame(self.root, bg="#000000", height=2).pack(fill=tk.X)

        # 2. QUICK LAUNCHERS
        launch_bar = tk.Frame(self.root, bg="#f8f8fa", padx=16, pady=6)
        launch_bar.pack(fill=tk.X)

        tk.Label(launch_bar, text="LAUNCHERS:", font=("Courier", 9, "bold"),
                 fg="#666666", bg="#f8f8fa").pack(side=tk.LEFT, padx=(0, 10))

        btn_yt = tk.Button(launch_bar, text="[OPEN YOUTUBE]", font=("Courier", 9, "bold"),
                           bg="#ffffff", fg="#000000", relief=tk.SOLID, bd=1, padx=8, pady=2,
                           cursor="hand2", command=lambda: self.server.input_engine.launch_youtube())
        btn_yt.pack(side=tk.LEFT, padx=3)

        btn_spot = tk.Button(launch_bar, text="[OPEN SPOTIFY]", font=("Courier", 9, "bold"),
                             bg="#ffffff", fg="#000000", relief=tk.SOLID, bd=1, padx=8, pady=2,
                             cursor="hand2", command=lambda: self.server.input_engine.launch_spotify())
        btn_spot.pack(side=tk.LEFT, padx=3)

        self.lbl_active_devs_count = tk.Label(launch_bar, text="DEVICES: 0", font=("Courier", 9, "bold"),
                                              fg="#000000", bg="#f8f8fa")
        self.lbl_active_devs_count.pack(side=tk.RIGHT)

        # 3. TABBED INTERFACE
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=12, pady=8)

        self.tab_connect = tk.Frame(self.notebook, bg="#ffffff", padx=10, pady=10)
        self.tab_devices = tk.Frame(self.notebook, bg="#ffffff", padx=10, pady=10)
        self.tab_bluetooth = tk.Frame(self.notebook, bg="#ffffff", padx=10, pady=10)
        self.tab_settings = tk.Frame(self.notebook, bg="#ffffff", padx=10, pady=10)

        self.notebook.add(self.tab_connect, text=" CONNECT QR ")
        self.notebook.add(self.tab_devices, text=" ACTIVE DEVICES ")
        self.notebook.add(self.tab_bluetooth, text=" BLUETOOTH TETHERING ")
        self.notebook.add(self.tab_settings, text=" SECURITY & CONFIG ")

        self.build_connect_tab()
        self.build_devices_tab()
        self.build_bluetooth_tab()
        self.build_settings_tab()

    # ==========================================
    # 1. CONNECT TAB (QR & ADAPTER SELECTOR)
    # ==========================================
    def build_connect_tab(self):
        top_ctrl = tk.Frame(self.tab_connect, bg="#ffffff")
        top_ctrl.pack(fill=tk.X, pady=(0, 6))

        # Mode Selector Buttons
        mode_btn_bar = tk.Frame(top_ctrl, bg="#ffffff")
        mode_btn_bar.pack(fill=tk.X, pady=(0, 6))

        self.btn_mode_wifi = tk.Button(mode_btn_bar, text="WI-FI / LAN QR", font=("Courier", 9, "bold"),
                                       bg="#000000", fg="#ffffff", padx=10, pady=4, relief=tk.FLAT,
                                       cursor="hand2", command=lambda: self.switch_conn_mode("wifi"))
        self.btn_mode_wifi.pack(side=tk.LEFT, padx=(0, 6))

        self.btn_mode_bt = tk.Button(mode_btn_bar, text="BLUETOOTH TETHERING QR", font=("Courier", 9, "bold"),
                                     bg="#f1f1f4", fg="#000000", padx=10, pady=4, relief=tk.SOLID, bd=1,
                                     cursor="hand2", command=lambda: self.switch_conn_mode("bluetooth"))
        self.btn_mode_bt.pack(side=tk.LEFT)

        tk.Label(top_ctrl, text="ACTIVE NETWORK ADAPTER IP:", font=("Courier", 9, "bold"),
                 fg="#333333", bg="#ffffff").pack(anchor=tk.W, pady=(4, 2))

        self.ip_choices = self.server.get_local_ip_addresses()
        self.combo_options = [f"{item['ip']} ({item['name']})" for item in self.ip_choices]
        
        self.combo_ip = ttk.Combobox(top_ctrl, values=self.combo_options, state="readonly", font=("Courier", 9))
        if self.combo_options:
            self.combo_ip.current(0)
            self.selected_ip = self.ip_choices[0]['ip']
        self.combo_ip.pack(fill=tk.X, pady=2)
        self.combo_ip.bind("<<ComboboxSelected>>", self.on_ip_change)

        # QR Display Card
        qr_card = tk.Frame(self.tab_connect, bg="#f8f8fa", padx=14, pady=10, relief=tk.SOLID, bd=1)
        qr_card.pack(fill=tk.BOTH, expand=True, pady=4)

        self.qr_label = tk.Label(qr_card, bg="#f8f8fa")
        self.qr_label.pack(pady=2)

        url_frame = tk.Frame(qr_card, bg="#f8f8fa")
        url_frame.pack(fill=tk.X, pady=4)

        self.url_label = tk.Label(url_frame, text="http://localhost:8080", font=("Courier", 10, "bold"),
                                  fg="#000000", bg="#ffffff", padx=10, pady=4, relief=tk.SOLID, bd=1)
        self.url_label.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))

        btn_copy = tk.Button(url_frame, text="COPY", font=("Courier", 9, "bold"),
                             bg="#000000", fg="#ffffff", padx=12, pady=4, relief=tk.FLAT,
                             cursor="hand2", command=self.copy_url)
        btn_copy.pack(side=tk.RIGHT)

        self.phone_status_lbl = tk.Label(qr_card, text="Scan with Phone Camera or in-app scanner to connect auto-authenticated",
                                         font=("Courier", 8, "bold"), fg="#555555", bg="#f8f8fa")
        self.phone_status_lbl.pack(pady=2)

        self.update_qr_code()

    def switch_conn_mode(self, mode: str):
        self.connection_mode = mode
        if mode == "wifi":
            self.btn_mode_wifi.config(bg="#000000", fg="#ffffff", relief=tk.FLAT)
            self.btn_mode_bt.config(bg="#f1f1f4", fg="#000000", relief=tk.SOLID, bd=1)
            # Pick first non-bt IP
            for idx, item in enumerate(self.ip_choices):
                if not item.get("is_bt"):
                    self.combo_ip.current(idx)
                    self.selected_ip = item["ip"]
                    break
        else:
            self.btn_mode_bt.config(bg="#000000", fg="#ffffff", relief=tk.FLAT)
            self.btn_mode_wifi.config(bg="#f1f1f4", fg="#000000", relief=tk.SOLID, bd=1)
            # Pick bluetooth IP if exists
            for idx, item in enumerate(self.ip_choices):
                if item.get("is_bt"):
                    self.combo_ip.current(idx)
                    self.selected_ip = item["ip"]
                    break

        self.update_qr_code()

    def on_ip_change(self, event=None):
        idx = self.combo_ip.current()
        if 0 <= idx < len(self.ip_choices):
            self.selected_ip = self.ip_choices[idx]['ip']
            self.update_qr_code()

    def update_qr_code(self):
        url = f"http://{self.selected_ip}:{self.server.http_port}/?pin={self.server.security_pin}"
        self.url_label.config(text=url)

        qr = qrcode.QRCode(box_size=5, border=2)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#000000", back_color="#ffffff")
        
        img = img.resize((180, 180), Image.NEAREST)
        self.qr_image_tk = ImageTk.PhotoImage(img)
        self.qr_label.config(image=self.qr_image_tk)

    def on_regenerate_pin(self):
        new_pin = self.server.generate_random_pin()
        self.lbl_pin_display.config(text=new_pin)
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
        card = tk.Frame(self.tab_devices, bg="#f8f8fa", padx=12, pady=12, relief=tk.SOLID, bd=1)
        card.pack(fill=tk.BOTH, expand=True)

        tk.Label(card, text="AUTHENTICATED CONNECTED DEVICES", font=("Courier", 10, "bold"),
                 fg="#000000", bg="#f8f8fa").pack(anchor=tk.W, pady=(0, 6))

        # Device Listbox Frame
        list_frame = tk.Frame(card, bg="#ffffff", relief=tk.SOLID, bd=1)
        list_frame.pack(fill=tk.BOTH, expand=True, pady=4)

        self.devices_listbox = tk.Listbox(list_frame, font=("Courier", 9), bg="#ffffff", fg="#000000",
                                          selectbackground="#000000", selectforeground="#ffffff", borderwidth=0)
        self.devices_listbox.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)
        self.devices_listbox.insert(tk.END, "No devices connected yet. Scan QR code to connect.")

        # Live Activity Display
        tk.Label(card, text="LIVE INPUT STREAM:", font=("Courier", 9, "bold"),
                 fg="#555555", bg="#f8f8fa").pack(anchor=tk.W, pady=(8, 2))

        self.lbl_last_action = tk.Label(card, text="[IDLE - WAITING FOR INPUT]", font=("Courier", 9),
                                        fg="#000000", bg="#ffffff", padx=8, pady=6, relief=tk.SOLID, bd=1, anchor=tk.W)
        self.lbl_last_action.pack(fill=tk.X)

    # ==========================================
    # 3. BLUETOOTH TETHERING SETUP GUIDE
    # ==========================================
    def build_bluetooth_tab(self):
        card = tk.Frame(self.tab_bluetooth, bg="#f8f8fa", padx=14, pady=14, relief=tk.SOLID, bd=1)
        card.pack(fill=tk.BOTH, expand=True)

        tk.Label(card, text="PORTABLE BLUETOOTH / OFFLINE SETUP",
                 font=("Courier", 11, "bold"), fg="#000000", bg="#f8f8fa").pack(anchor=tk.W, pady=(0, 10))

        guide_text = (
            "OPTION A: BLUETOOTH TETHERING (OFFLINE)\n"
            "  1. Pair your phone with this PC via Windows Bluetooth Settings.\n"
            "  2. On phone: Go to Settings -> Connections -> Enable 'Bluetooth Tethering'.\n"
            "  3. On PC: Right click phone in Bluetooth -> Connect using -> Access Point.\n"
            "  4. In REMOTE4REAL: Select 'BLUETOOTH TETHERING QR' and scan!\n\n"
            "OPTION B: PHONE PORTABLE HOTSPOT (FASTEST <2ms)\n"
            "  1. Turn on Mobile Hotspot on phone (mobile data not required).\n"
            "  2. Connect PC Wi-Fi to your phone's hotspot.\n"
            "  3. Scan the QR code in CONNECT QR tab.\n\n"
            "OPTION C: LOCAL WI-FI ROUTER\n"
            "  - Connect PC and phone to the same home/office Wi-Fi network."
        )

        txt = tk.Label(card, text=guide_text, font=("Courier", 9), fg="#222222",
                       bg="#f8f8fa", justify=tk.LEFT, wraplength=560)
        txt.pack(anchor=tk.W)

    # ==========================================
    # 4. SECURITY & CONFIG TAB
    # ==========================================
    def build_settings_tab(self):
        card = tk.Frame(self.tab_settings, bg="#f8f8fa", padx=14, pady=14, relief=tk.SOLID, bd=1)
        card.pack(fill=tk.BOTH, expand=True)

        tk.Label(card, text="ACCESS CONTROL & SECURITY PIN", font=("Courier", 11, "bold"),
                 fg="#000000", bg="#f8f8fa").pack(anchor=tk.W, pady=(0, 8))

        pin_edit_row = tk.Frame(card, bg="#f8f8fa")
        pin_edit_row.pack(fill=tk.X, pady=4)

        tk.Label(pin_edit_row, text="CUSTOM PIN:", font=("Courier", 9, "bold"), fg="#333333", bg="#f8f8fa").pack(side=tk.LEFT, padx=(0, 6))

        self.entry_custom_pin = tk.Entry(pin_edit_row, font=("Courier", 10, "bold"), width=8, justify=tk.CENTER)
        self.entry_custom_pin.insert(0, self.server.security_pin)
        self.entry_custom_pin.pack(side=tk.LEFT, padx=(0, 6))

        btn_save_pin = tk.Button(pin_edit_row, text="SET PIN", font=("Courier", 8, "bold"),
                                 bg="#000000", fg="#ffffff", padx=8, pady=2, relief=tk.FLAT,
                                 cursor="hand2", command=self.on_set_custom_pin)
        btn_save_pin.pack(side=tk.LEFT)

        tk.Label(card, text="Unauthenticated devices are strictly prohibited from controlling input or streaming screen.",
                 font=("Courier", 8), fg="#666666", bg="#f8f8fa").pack(anchor=tk.W, pady=(4, 12))

        tk.Label(card, text="GAMEPAD DRIVER MODE:", font=("Courier", 9, "bold"), fg="#000000", bg="#f8f8fa").pack(anchor=tk.W)
        
        mode_val = tk.StringVar(value="DirectX High-Speed Keyboard/Mouse Simulation")

        rb1 = tk.Radiobutton(card, text="DirectX High-Speed Keyboard/Mouse Simulation",
                             variable=mode_val, value="DirectX High-Speed Keyboard/Mouse Simulation",
                             font=("Courier", 9), fg="#000000", bg="#f8f8fa",
                             command=lambda: setattr(self.server.input_engine, 'gamepad_mode', 'keyboard_directx'))
        rb1.pack(anchor=tk.W, pady=2)

        rb2 = tk.Radiobutton(card, text="Xbox 360 Controller (vgamepad XInput)",
                             variable=mode_val, value="Xbox 360 Controller (vgamepad XInput)",
                             font=("Courier", 9), fg="#000000", bg="#f8f8fa",
                             command=lambda: setattr(self.server.input_engine, 'gamepad_mode', 'xinput'))
        rb2.pack(anchor=tk.W, pady=2)

        btn_emergency = tk.Button(card, text="[EMERGENCY RELEASE ALL KEYS]", font=("Courier", 9, "bold"),
                                  bg="#000000", fg="#ffffff", padx=12, pady=5, relief=tk.FLAT, cursor="hand2",
                                  command=self.server.input_engine.release_all_keys)
        btn_emergency.pack(anchor=tk.W, pady=12)

    def on_set_custom_pin(self):
        new_pin = self.entry_custom_pin.get().strip()
        if len(new_pin) < 4:
            messagebox.showwarning("Invalid PIN", "PIN must be at least 4 characters/digits.")
            return
        self.server.set_pin(new_pin)
        self.lbl_pin_display.config(text=new_pin)
        self.update_qr_code()
        messagebox.showinfo("PIN Updated", f"Security PIN updated to: {new_pin}")

    # ==========================================
    # SERVER EVENT DISPATCHER
    # ==========================================
    def on_server_event(self, event: str, data: any):
        self.root.after(0, self._process_ui_update, event, data)

    def _process_ui_update(self, event: str, data: any):
        if event in ("client_authenticated", "client_disconnected"):
            devices = data if isinstance(data, list) else []
            self.lbl_active_devs_count.config(text=f"DEVICES: {len(devices)}")
            self.devices_listbox.delete(0, tk.END)
            if not devices:
                self.devices_listbox.insert(tk.END, "No devices connected. Scan QR code to connect.")
            else:
                for idx, dev in enumerate(devices, 1):
                    self.devices_listbox.insert(
                        tk.END,
                        f"[{idx}] IP: {dev.get('ip')} | Mode: {dev.get('mode', 'touchpad').upper()}"
                    )

        elif event == "screen_touch_click":
            self.lbl_last_action.config(text=f"SCREEN TOUCH: ({data.get('x',0):.2f}, {data.get('y',0):.2f}) [{data.get('btn').upper()}]")

        elif event == "yt_cmd":
            self.lbl_last_action.config(text=f"YOUTUBE: {data.get('cmd').upper()} {data.get('query', '')}")

        elif event == "spotify_cmd":
            self.lbl_last_action.config(text=f"SPOTIFY: {data.get('cmd').upper()}")

        elif event == "touchpad_move":
            self.lbl_last_action.config(text=f"MOUSE MOVE: dx={data.get('dx',0):.1f}, dy={data.get('dy',0):.1f}")

        elif event == "key_event":
            self.lbl_last_action.config(text=f"KEY EVENT: {data.get('key').upper()} [{data.get('act').upper()}]")

        elif event == "gp_stick":
            stick = data.get("stick")
            x = data.get("x", 0)
            y = data.get("y", 0)
            self.lbl_last_action.config(text=f"STICK ({stick.upper()}): ({x:+.2f}, {y:+.2f})")

        elif event == "gp_button":
            self.lbl_last_action.config(text=f"GAMEPAD BTN: {data.get('btn').upper()} [{data.get('act').upper()}]")

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
    root = tk.Tk()
    app = Remote4RealDesktopGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
