# REMOTE4REAL — iOS Application Package

This folder contains the complete iOS application package, EAS build pipeline, and installation guide for **REMOTE4REAL** on iPhone & iPad.

---

## 📦 Package Contents:
1. `build_ios_package.bat`: 1-click builder for creating iOS Simulator builds or device `.ipa` packages via EAS Cloud.
2. `../../REMOTE4REALMobile/eas.json`: Pre-configured iOS EAS build profiles (Simulator and Ad-Hoc / Enterprise device `.ipa`).
3. `../../REMOTE4REALMobile/app.json`: Configured with iOS Bundle Identifier `com.remote4real.app`, motion permissions, and tablet support.

---

## 🚀 How to Install on iOS (iPhone / iPad):

### Option 1: Instant Standalone Web App (No Apple Developer Account Required - Recommended)
1. Start the Desktop Companion App on your PC (`REMOTE4REAL.exe`).
2. Open **Safari** on your iPhone or iPad.
3. Browse to `http://<YOUR_PC_IP>:8080` (or scan the QR code in the PC app).
4. Tap the **Share button** (square with arrow pointing up 📤) in Safari.
5. Scroll down and tap **"Add to Home Screen"** (➕).
6. Tap **"Add"** in the top right corner.
7. The **REMOTE4REAL** icon will appear on your iOS home screen and launches in full-screen standalone mode with low-latency haptics, motion gyro, and touch controls!

### Option 2: Sideloading via Sideloadly or AltStore
1. Run `build_ios_package.bat` and select **Option 2 (Build iOS Device Package)** to generate the `.ipa` file.
2. Connect your iPhone to your PC via Lightning/USB-C cable.
3. Open **Sideloadly** (or **AltStore**) on your PC.
4. Drag and drop the downloaded `.ipa` into Sideloadly and enter your Apple ID to sign and install.
5. On your iPhone: Go to **Settings > General > VPN & Device Management** and trust your Developer App certificate.

### Option 3: Internal Distribution via TestFlight
1. Configure your Apple Developer Team ID in `eas.json`.
2. Run `npx eas-cli build -p ios --profile production` to upload directly to Apple App Store Connect / TestFlight.
