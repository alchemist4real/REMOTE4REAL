# REMOTE4REAL — Master Multi-Platform Installation Hub

Welcome to the **REMOTE4REAL** installer suite. This package contains the installers, native project binaries, and automated setup tools for **Windows Desktop**, **Android**, and **iOS**.

---

## 📁 Package Directory Structure

```
installers/
├── Desktop/
│   ├── REMOTE4REAL-Windows/          # Standalone Windows Application (REMOTE4REAL.exe)
│   ├── install_desktop_shortcut.bat  # 1-Click Desktop & Start Menu Shortcut Installer
│   ├── REMOTE4REAL_Setup.iss         # Inno Setup Compiler Script for Setup Wizard .exe
│   └── README.md
│
├── Android/
│   ├── build_android_apk.bat         # 1-Click APK Builder (EAS Cloud & Local Gradle)
│   ├── install_android_apk.bat       # 1-Click ADB USB Fast Installer
│   └── README.md
│
├── iOS/
│   ├── build_ios_package.bat         # 1-Click IPA / Simulator Package Builder
│   └── README.md
│
└── INSTALLATION_GUIDE.md             # This comprehensive master guide
```

---

## 1. 🖥️ Desktop App (Windows)

### Quick Run:
- Navigate to `installers/Desktop/REMOTE4REAL-Windows/` and launch `REMOTE4REAL.exe`.

### 1-Click Shortcut Installation:
- Double-click `installers/Desktop/install_desktop_shortcut.bat`. This automatically places desktop and start menu shortcuts with custom icons on your Windows system.

### Create Windows Setup Wizard:
- If you have [Inno Setup](https://jrsoftware.org/isinfo.php) installed, open `installers/Desktop/REMOTE4REAL_Setup.iss` and click **Compile** to produce a single `REMOTE4REAL_Windows_Setup_v1.0.0.exe` installer.

---

## 2. 🤖 Android App

### Direct Standalone APK Build:
1. Double-click `installers/Android/build_android_apk.bat`.
2. Choose **Option 1 (EAS Cloud Build)** to generate the standalone `.apk` without requiring Android Studio or local SDKs.
3. Download and open the `.apk` on your phone to install.

### Direct USB Install (ADB):
1. Connect your Android device to PC with USB Debugging enabled.
2. Double-click `installers/Android/install_android_apk.bat`.

### Instant Fullscreen Web/PWA Install (Zero Sideloading):
1. Run `REMOTE4REAL.exe` on your PC.
2. Open Chrome on Android and visit `http://<YOUR_PC_IP>:8080` (or scan the QR code).
3. Tap **Menu (⋮) > Add to Home screen** (or "Install app").

---

## 3. 🍎 iOS App (iPhone / iPad)

### Instant Fullscreen Standalone App (Recommended):
1. Run `REMOTE4REAL.exe` on your PC.
2. Open **Safari** on iPhone/iPad and visit `http://<YOUR_PC_IP>:8080` (or scan the QR code).
3. Tap the **Share button (📤)** and select **"Add to Home Screen" (➕)**.
4. Tap **Add**. The app installs directly to your iOS home screen as a standalone fullscreen controller with motion gyroscope, haptics, and zero lag.

### Sideloading via Sideloadly or AltStore:
1. Double-click `installers/iOS/build_ios_package.bat` and select **Option 2** to generate the device `.ipa`.
2. Open [Sideloadly](https://sideloadly.io/) or AltStore on PC, drag the `.ipa`, and sign with your Apple ID.
3. Trust the developer profile under **Settings > General > VPN & Device Management** on iOS.

---

## 🔒 Security Note
Every session generates a dynamic 4-digit PIN displayed on the PC Companion screen to ensure only authorized controllers can connect.
