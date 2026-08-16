# REMOTE4REAL — Wireless PC & Console Controller Suite

<p align="center">
  <b>Ultra-low latency (<3ms) wireless PC touchpad, gamepad, screen mirroring, and media deck controller for Desktop, Android, and iOS.</b><br>
  <i>Engineered with surgical precision by <b>alchemist4real</b></i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Author-alchemist4real-black?style=flat-square" alt="Author" />
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Android%20%7C%20iOS-black?style=flat-square" alt="Platforms" />
  <img src="https://img.shields.io/badge/Latency-%3C3ms-000000?style=flat-square" alt="Latency" />
  <img src="https://img.shields.io/badge/Design-Monochromatic%20OffBit-black?style=flat-square" alt="Design" />
  <img src="https://img.shields.io/badge/License-MIT-black?style=flat-square" alt="License" />
</p>

---

## 🌟 Core Features

- **🎮 4-in-1 Control Modes**:
  1. **Touchpad & Keyboard**: 120Hz smooth trackpad gestures, scroll wheels, PC modifier chips (Ctrl, Alt, Win, Shift), and direct native mobile keyboard typing.
  2. **Screen Mirror**: Real-time low-latency desktop screen mirroring with direct touch click support and live FPS monitor.
  3. **Media Remote**: One-tap YouTube launcher & remote deck, Spotify launcher & track controls, and master volume mixer.
  4. **Gamepad**: Console controller with dual analog spring thumbsticks, D-Pad, ABXY diamond cluster, analog shoulder triggers with live gauges, and motion gyroscope steering.
- **🔒 PIN Security**: Dynamic 4-digit session PIN preventing unauthorized device connection on local networks.
- **⚡ Dual Connection**: Supports both Local Wi-Fi and Bluetooth PAN Tethering.
- **🎨 Swiss/Braun Minimalist Aesthetic**: High-contrast monochromatic UI, custom OffBit typography, and zero-emoji design.

---

## 📦 Installer Packages

All compiled binaries, scripts, and multi-platform packages are organized in the [`installers/`](./installers/) directory:

| Platform | Package / Method | Path |
| :--- | :--- | :--- |
| **Windows Desktop** | Standalone `.exe` & 1-click Shortcut Setup | [`installers/Desktop/`](./installers/Desktop/) |
| **Android** | Standalone `.apk` Builder & ADB Fast Installer | [`installers/Android/`](./installers/Android/) |
| **iOS (iPhone/iPad)** | EAS `.ipa` Cloud Builder & Standalone Safari PWA | [`installers/iOS/`](./installers/iOS/) |

📖 Full installation instructions: See [**Master Installation Guide**](./installers/INSTALLATION_GUIDE.md).

---

## 🚀 Quick Start (Development)

### 1. Run Desktop Companion Server:
```powershell
# Install requirements
pip install -r requirements.txt

# Run Desktop Control Panel
python gui_app.py
```
*Or double-click `run.bat`.*

### 2. Connect from Mobile:
- **Instant Browser Access**: Open phone browser at `http://<YOUR_PC_IP>:8080` (or scan the QR code on the desktop GUI).
- **Native Mobile App**:
  ```powershell
  cd REMOTE4REALMobile
  npm install
  npx expo start
  ```
  *Or double-click `run_mobile_app.bat`.*

---

## 🛠️ Project Architecture

```
REMOTE4REAL/
├── gui_app.py                  # Tkinter Desktop Companion GUI (QR Code, PIN, Monitors)
├── server.py                   # Async HTTP & WebSocket Server (Ports 8080 & 8765)
├── controller_engine.py        # Low-level Win32 SendInput & Input Automation
├── screen_capture.py           # Real-time GDI/Win32 Screen Capture Engine
├── build_desktop.py            # Standalone Windows executable builder (PyInstaller)
├── web/                        # Vercel-ready Interactive Web Showcase & Documentation
├── static/                     # Web client assets (HTML, CSS, JS, OffBit fonts)
├── REMOTE4REALMobile/          # Native React Native (Expo) Mobile Application
│   ├── android/                # Native Android Gradle Project
│   ├── app.json                # Cross-platform mobile configuration
│   └── eas.json                # EAS Build Profiles for APK & IPA
├── installers/                 # Ready-to-deploy installer packages & batch tools
│   ├── Desktop/                # Standalone Windows application & shortcut setup
│   ├── Android/                # APK build tools & ADB fast installer
│   ├── iOS/                    # IPA cloud builder & iOS setup guide
│   └── INSTALLATION_GUIDE.md   # Complete step-by-step master guide
├── vercel.json                 # Zero-configuration Vercel deployment configuration
└── requirements.txt            # Python dependencies
```

---

## 🌐 Web Showcase (Vercel Ready)
Deploy the interactive product showcase site directly to Vercel:
```powershell
vercel
```
*Or import this repository directly on [Vercel Dashboard](https://vercel.com/new).*

---

## 📄 License & Credits
- **Creator & Lead Engineer**: `alchemist4real`
- **License**: Licensed under the [MIT License](./LICENSE).
