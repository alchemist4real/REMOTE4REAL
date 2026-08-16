# REMOTE4REAL — Android Installer Package

This folder contains the complete Android application package, native Gradle project, and installer scripts for **REMOTE4REAL**.

---

## 📦 Package Contents:
1. `build_android_apk.bat`: 1-click builder for generating `.apk` standalone installers (via EAS Cloud or local Gradle).
2. `install_android_apk.bat`: 1-click ADB fast installer to push the built APK to your phone via USB.
3. `../../REMOTE4REALMobile/android/`: Complete native Android Studio project with `AndroidManifest.xml`, Gradle wrapper, and source code.
4. `../../REMOTE4REALMobile/eas.json`: Pre-configured EAS build profile for direct APK installer generation.

---

## 🚀 How to Install on Android:

### Option 1: Direct APK Sideloading (Recommended)
1. Run `build_android_apk.bat` and select **Option 1 (EAS Cloud Build)**.
2. Download the resulting `.apk` file directly to your Android device or scan the QR code displayed in the terminal.
3. Open the `.apk` file on your phone and tap **Install** (allow "Install from Unknown Sources" if prompted).

### Option 2: USB Fast Install via ADB
1. Connect your Android phone to your PC with **USB Debugging** enabled in Developer Options.
2. Run `install_android_apk.bat`.

### Option 3: Direct Instant PWA Web Install (Zero Sideloading)
1. Start the Desktop Companion App on your PC (`REMOTE4REAL.exe`).
2. Open Chrome on your Android phone and browse to `http://<YOUR_PC_IP>:8080` (or scan the QR code in the PC app).
3. Tap the **three dots menu (⋮)** in Chrome and select **"Add to Home screen"** or **"Install app"**.
4. The app will install as a standalone native-feeling fullscreen controller!
