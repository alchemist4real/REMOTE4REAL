# Contributing to REMOTE4REAL

Thank you for your interest in contributing to **REMOTE4REAL**, engineered by **alchemist4real**!

---

## 🎯 Design & Code Guidelines

1. **Monochromatic & Zero Emoji**: We strictly adhere to high-contrast monochromatic Swiss/Braun aesthetics with OffBit typography. Avoid emoji in the UI or code unless explicitly requested.
2. **Ultra-Low Latency First**: All controller communication must prioritize sub-3ms latency, binary WebSocket packing, and low CPU/memory overhead.
3. **Cross-Platform Parity**: Features should work seamlessly across Desktop (Windows), Android, and iOS.

---

## 🛠️ Development Setup

1. **Fork and clone** the repository:
   ```powershell
   git clone https://github.com/alchemist4real/REMOTE4REAL.git
   cd REMOTE4REAL
   ```
2. **Install Python dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```
3. **Run the desktop server**:
   ```powershell
   python gui_app.py
   ```
4. **Mobile development**:
   ```powershell
   cd REMOTE4REALMobile
   npm install
   npx expo start
   ```

---

## 📝 Submitting a Pull Request

1. Create a feature branch (`git checkout -b feature/amazing-feature`).
2. Commit your changes with clear, descriptive commit messages.
3. Push to your branch (`git push origin feature/amazing-feature`).
4. Open a Pull Request on GitHub against `main`.
