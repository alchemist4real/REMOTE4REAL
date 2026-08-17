# REMOTE4REAL — Wireless PC & Console Controller Suite

<p align="center">
  <b>Ultra-low latency (<3ms) wireless PC touchpad, gamepad, screen mirroring, and media deck controller for Desktop, Android, and iOS.</b><br>
  <i>Engineered with surgical precision by <b>alchemist4real</b></i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Author-alchemist4real-black?style=flat-square" alt="Author" />
  <a href="https://remote4real-showcase.vercel.app" target="_blank"><img src="https://img.shields.io/badge/Live%20Showcase-remote4real--showcase.vercel.app-black?style=flat-square&logo=vercel" alt="Vercel Showcase" /></a>
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Android%20%7C%20iOS-black?style=flat-square" alt="Platforms" />
  <img src="https://img.shields.io/badge/Latency-%3C3ms-000000?style=flat-square" alt="Latency" />
  <img src="https://img.shields.io/badge/Design-Monochromatic%20OffBit-black?style=flat-square" alt="Design" />
  <img src="https://img.shields.io/badge/License-MIT-black?style=flat-square" alt="License" />
</p>

---

## 🌟 Core Features

- **🎮 6-in-1 Versatile Control Modes**:
  1. **Trackpad & Laptop Deck**: 120Hz smooth trackpad gestures, scroll wheels, PC modifier chips (Ctrl, Alt, Win, Shift, Taskmgr, Close), and direct native mobile keyboard typing.
  2. **Keyboard Only**: Full on-screen virtual QWERTY keyboard with F1–F12 function row, sticky modifiers (Ctrl/Alt/Shift/Win), arrow navigation, and native typing dock.
  3. **Keys + Trackpad**: Split viewport combining a top 45% touch surface + mouse click buttons with a bottom 55% tactile QWERTY keyboard.
  4. **Touchscreen Stream**: Real-time 60 FPS desktop screen mirror with direct touch clicks, fit/fill scaling, and device auto-rotation sync.
  5. **Media Remote**: Active tab search & browser navigation for YouTube (`/` hotkey integration), Spotify app search (`Ctrl+L`) & desktop app controls, and master volume mixer.
  6. **Gamepad**: Realistic dark console controller skin with color-coded ABXY tactile buttons, cross D-Pad, dual analog thumbsticks (L3/R3), and shoulder triggers.
- **🔒 PIN Security**: Dynamic 4-digit session PIN preventing unauthorized device connection on local networks.
- **⚡ Dual Connection**: Supports both Local Wi-Fi and Bluetooth PAN Tethering.
- **🎨 Swiss/Braun Minimalist Aesthetic**: High-contrast monochromatic UI, custom OffBit typography, and zero-emoji design.

---

## 🚀 One-Command Zero-Friction Setup (Clean PC / Laptop)

Run this single command in PowerShell on any Windows laptop (even without Python or Git pre-installed):

```powershell
irm https://remote4real.vercel.app/install.ps1 | iex
```

*This prompts for an installation folder (defaults to `~/REMOTE4REAL`), clones the repo, installs Python if needed, sets up `.venv`, installs all drivers/packages, configures firewall rules, and creates a Desktop shortcut.*

**Custom path via command:**
```powershell
$env:REMOTE4REAL_DIR = "D:\MyApps\REMOTE4REAL"; irm https://remote4real.vercel.app/install.ps1 | iex
```

---

## ⚡ 1-Click Run & Auto-Update

- **1-Click Run**: Double-click `run.bat` — it auto-detects dependencies, tests system health, and launches the app.
- **Auto-Update**: Installed copies automatically check GitHub Releases for updates and display a one-click update banner inside the Desktop GUI.

---

## 📦 Installer Packages

All compiled binaries, scripts, and multi-platform packages are organized in the [`installers/`](./installers/) directory:

| Platform | Package / Method | Path |
| :--- | :--- | :--- |
| **Windows Desktop** | Standalone `.exe`, 1-click Shortcut Setup & Zero-Friction Script | [`installers/Desktop/`](./installers/Desktop/) |
| **Android** | Standalone `.apk` Builder & ADB Fast Installer | [`installers/Android/`](./installers/Android/) |
| **iOS (iPhone/iPad)** | EAS `.ipa` Cloud Builder & Standalone Safari PWA | [`installers/iOS/`](./installers/iOS/) |

📖 Full installation instructions: See [**Master Installation Guide**](./installers/INSTALLATION_GUIDE.md).

---

## 💻 Manual Quick Start (Development)

### 1. Run Desktop Companion Server:
```powershell
# Run zero-friction setup and launcher
.\setup_environment.ps1

# Or run manual diagnostic
python health_check.py
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

## 🌐 Live Web Showcase (Vercel)
Experience the interactive simulator and documentation live on Vercel:
👉 **[https://remote4real-showcase.vercel.app](https://remote4real-showcase.vercel.app)**

To deploy your own instance to Vercel:
```powershell
cd web
npx vercel --prod
```
*Or import this repository directly on the [Vercel Dashboard](https://vercel.com/new).*

---

## 📄 License & Credits
- **Creator & Lead Engineer**: `alchemist4real`
- **License**: Licensed under the [MIT License](./LICENSE).
