/**
 * REMOTE4REAL — Core Client Engine
 * Features: PIN Authentication, In-App Camera QR Scanner, Multi-Device Networking, Gestures, & UI Controls.
 */

class Remote4RealApp {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.activeMode = 'touchpad';
    this.hapticsEnabled = true;
    this.autoReconnect = true;
    this.isForcedLandscape = false;
    this.pingInterval = null;
    this.currentPingMs = 0;

    // PIN Security State
    this.currentPin = this.extractPinFromUrl() || localStorage.getItem('r4_security_pin') || '';
    this.enteredPin = '';
    this.modesList = ['touchpad', 'screen', 'media', 'gamepad'];

    // Camera QR Scanner State
    this.qrVideo = null;
    this.qrCanvas = null;
    this.qrContext = null;
    this.qrStream = null;
    this.isScanning = false;

    this.initSecurityUI();
    this.initScannerUI();
    this.initNetwork();
    this.initUI();
    this.initRotation();
    this.initSwipeGestures();
  }

  // ==========================================
  // PIN & SECURITY INITIALIZATION
  // ==========================================
  extractPinFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('pin') || params.get('auth') || '';
  }

  initSecurityUI() {
    const pinModal = document.getElementById('pin-lock-modal');
    const keypadBtns = document.querySelectorAll('.keypad-btn[data-num]');
    const backspaceBtn = document.getElementById('btn-pin-backspace');
    const scanBtn = document.getElementById('btn-pin-qr-scan');
    const resetAuthBtn = document.getElementById('btn-reset-auth');

    keypadBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const num = btn.getAttribute('data-num');
        if (this.enteredPin.length < 4) {
          this.enteredPin += num;
          this.vibrate(10);
          this.updatePinDots();
          if (this.enteredPin.length === 4) {
            this.submitPin(this.enteredPin);
          }
        }
      });
    });

    if (backspaceBtn) {
      backspaceBtn.addEventListener('click', () => {
        if (this.enteredPin.length > 0) {
          this.enteredPin = this.enteredPin.slice(0, -1);
          this.vibrate(10);
          this.updatePinDots();
        }
      });
    }

    if (scanBtn) {
      scanBtn.addEventListener('click', () => {
        this.openQrScanner();
      });
    }

    if (resetAuthBtn) {
      resetAuthBtn.addEventListener('click', () => {
        localStorage.removeItem('r4_security_pin');
        this.currentPin = '';
        this.isAuthenticated = false;
        this.showPinModal();
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) settingsModal.classList.add('hidden');
      });
    }
  }

  updatePinDots() {
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById(`pdot-${i}`);
      if (dot) {
        dot.classList.toggle('filled', i < this.enteredPin.length);
      }
    }
  }

  showPinModal(errorMsg = null) {
    const modal = document.getElementById('pin-lock-modal');
    const alertElem = document.getElementById('pin-error-alert');
    if (modal) modal.classList.remove('hidden');
    if (alertElem) {
      if (errorMsg) {
        alertElem.textContent = errorMsg;
        alertElem.classList.remove('hidden');
      } else {
        alertElem.classList.add('hidden');
      }
    }
    this.enteredPin = '';
    this.updatePinDots();
  }

  hidePinModal() {
    const modal = document.getElementById('pin-lock-modal');
    if (modal) modal.classList.add('hidden');
  }

  submitPin(pin) {
    this.currentPin = pin;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ t: 'auth', pin: this.currentPin });
    }
  }

  // ==========================================
  // IN-APP CAMERA QR SCANNER
  // ==========================================
  initScannerUI() {
    const scanBtn = document.getElementById('btn-scan-qr');
    const closeBtn = document.getElementById('btn-close-scanner');
    this.qrVideo = document.getElementById('qr-video');
    this.qrCanvas = document.getElementById('qr-canvas');
    if (this.qrCanvas) {
      this.qrContext = this.qrCanvas.getContext('2d', { willReadFrequently: true });
    }

    if (scanBtn) {
      scanBtn.addEventListener('click', () => {
        this.openQrScanner();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeQrScanner();
      });
    }
  }

  async openQrScanner() {
    const modal = document.getElementById('qr-scanner-modal');
    const statusHint = document.getElementById('scanner-status-text');
    if (modal) modal.classList.remove('hidden');

    try {
      if (statusHint) statusHint.textContent = 'STARTING CAMERA...';
      const constraints = {
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      };
      this.qrStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (this.qrVideo) {
        this.qrVideo.srcObject = this.qrStream;
        this.qrVideo.setAttribute('playsinline', true);
        await this.qrVideo.play();
        this.isScanning = true;
        if (statusHint) statusHint.textContent = 'ALIGN QR CODE IN VIEW';
        requestAnimationFrame(() => this.scanQrFrame());
      }
    } catch (err) {
      if (statusHint) statusHint.textContent = 'CAMERA ACCESS DENIED OR UNAVAILABLE';
    }
  }

  closeQrScanner() {
    const modal = document.getElementById('qr-scanner-modal');
    if (modal) modal.classList.add('hidden');
    this.isScanning = false;
    if (this.qrStream) {
      this.qrStream.getTracks().forEach((track) => track.stop());
      this.qrStream = null;
    }
  }

  scanQrFrame() {
    if (!this.isScanning || !this.qrVideo || !this.qrCanvas || !this.qrContext) return;

    if (this.qrVideo.readyState === this.qrVideo.HAVE_ENOUGH_DATA) {
      this.qrCanvas.height = this.qrVideo.videoHeight;
      this.qrCanvas.width = this.qrVideo.videoWidth;
      this.qrContext.drawImage(this.qrVideo, 0, 0, this.qrCanvas.width, this.qrCanvas.height);

      const imageData = this.qrContext.getImageData(0, 0, this.qrCanvas.width, this.qrCanvas.height);
      
      if (typeof jsQR !== 'undefined') {
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          this.vibrate([30, 50, 30]);
          this.handleScannedQr(code.data);
          this.closeQrScanner();
          return;
        }
      }
    }

    if (this.isScanning) {
      requestAnimationFrame(() => this.scanQrFrame());
    }
  }

  handleScannedQr(qrData) {
    try {
      const url = new URL(qrData);
      const pin = url.searchParams.get('pin') || url.searchParams.get('auth');
      const host = url.hostname;
      const port = url.port || '8080';

      if (pin) {
        this.currentPin = pin;
        localStorage.setItem('r4_security_pin', pin);
      }

      // If scanned a different host IP, redirect or reconnect
      if (host && host !== window.location.hostname) {
        window.location.href = url.href;
      } else if (pin) {
        this.submitPin(pin);
      }
    } catch (e) {
      // Direct PIN string
      if (/^\d{4,8}$/.test(qrData.trim())) {
        this.submitPin(qrData.trim());
      }
    }
  }

  // ==========================================
  // WEBSOCKET & NETWORKING
  // ==========================================
  initNetwork() {
    const host = window.location.hostname || 'localhost';
    const wsPort = 8765;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${host}:${wsPort}`;

    this.updateStatus('CONNECTING...', 'disconnected');

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.isConnected = true;
        this.startPingLoop();

        // Send PIN auth immediately if we have it
        if (this.currentPin) {
          this.send({ t: 'auth', pin: this.currentPin });
        }
      };

      this.ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          if (this.isAuthenticated && window.touchscreenController) {
            window.touchscreenController.onBinaryFrame(event.data);
          }
          return;
        }

        try {
          const data = JSON.parse(event.data);

          // 1. AUTH REQUIRED
          if (data.type === 'auth_required') {
            if (!this.currentPin) {
              this.showPinModal();
            } else {
              this.send({ t: 'auth', pin: this.currentPin });
            }
          }

          // 2. AUTH SUCCESS
          else if (data.type === 'auth_success') {
            this.isAuthenticated = true;
            localStorage.setItem('r4_security_pin', this.currentPin);
            this.hidePinModal();
            this.updateStatus('ONLINE', 'connected');
            this.vibrate([20, 50, 20]);
            this.sendMode(this.activeMode);
          }

          // 3. AUTH FAILED
          else if (data.type === 'auth_failed') {
            this.isAuthenticated = false;
            const err = data.error || 'INVALID PIN';
            this.showPinModal(err);
          }

          // 4. PONG LATENCY
          else if (data.type === 'pong') {
            const now = Date.now();
            this.currentPingMs = Math.round(now - data.ts);
            this.updateStatus(`${this.currentPingMs}MS`, 'connected');
          }
        } catch (e) {
          // ignore
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.isAuthenticated = false;
        this.updateStatus('OFFLINE', 'disconnected');
        this.stopPingLoop();
        if (this.autoReconnect) {
          setTimeout(() => this.initNetwork(), 1500);
        }
      };

      this.ws.onerror = () => {
        // ignore
      };
    } catch (e) {
      if (this.autoReconnect) {
        setTimeout(() => this.initNetwork(), 2000);
      }
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  startPingLoop() {
    this.stopPingLoop();
    this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ t: 'ping', ts: Date.now() });
      }
    }, 1500);
  }

  stopPingLoop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  updateStatus(text, statusClass) {
    const badge = document.getElementById('ping-indicator');
    const textElem = document.getElementById('ping-text');
    if (badge && textElem) {
      badge.className = `status-pill ${statusClass}`;
      textElem.textContent = text;
    }
  }

  vibrate(pattern = 10) {
    if (this.hapticsEnabled && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  // ==========================================
  // ROTATION & GESTURES
  // ==========================================
  initRotation() {
    const rotateBtn = document.getElementById('btn-rotate-screen');
    const wrapper = document.getElementById('app-wrapper');

    if (rotateBtn && wrapper) {
      rotateBtn.addEventListener('click', async () => {
        this.isForcedLandscape = !this.isForcedLandscape;
        wrapper.classList.toggle('force-landscape', this.isForcedLandscape);
        rotateBtn.classList.toggle('active', this.isForcedLandscape);
        this.vibrate([15, 30, 15]);

        if (screen.orientation && typeof screen.orientation.lock === 'function') {
          try {
            if (this.isForcedLandscape) {
              await screen.orientation.lock('landscape');
            } else {
              screen.orientation.unlock();
            }
          } catch (e) {}
        }
      });
    }
  }

  initSwipeGestures() {
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    window.addEventListener('touchstart', (e) => {
      if (['mode-gamepad', 'mode-screen'].includes(this.activeMode)) return;

      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (['mode-gamepad', 'mode-screen'].includes(this.activeMode)) return;

      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - startX;
        const deltaY = e.changedTouches[0].clientY - startY;
        const duration = Date.now() - startTime;

        if (Math.abs(deltaX) > 90 && Math.abs(deltaY) < 60 && duration < 300) {
          const currentIndex = this.modesList.indexOf(this.activeMode);
          if (deltaX < 0 && currentIndex < this.modesList.length - 1) {
            this.switchMode(this.modesList[currentIndex + 1]);
          } else if (deltaX > 0 && currentIndex > 0) {
            this.switchMode(this.modesList[currentIndex - 1]);
          }
        }
      }
    }, { passive: true });
  }

  // ==========================================
  // UI & NAVIGATION
  // ==========================================
  initUI() {
    const dockTabs = document.querySelectorAll('.dock-item');
    dockTabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        this.switchMode(mode);
      });
    });

    const fullBtn = document.getElementById('btn-fullscreen');
    if (fullBtn) {
      fullBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    const settingsBtn = document.getElementById('btn-settings');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('btn-close-settings');

    if (settingsBtn && settingsModal) {
      settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
      });
    }

    if (closeSettingsBtn && settingsModal) {
      closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
      });
      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
          settingsModal.classList.add('hidden');
        }
      });
    }

    const sensSlider = document.getElementById('setting-sensitivity');
    const sensVal = document.getElementById('val-sensitivity');
    if (sensSlider && sensVal) {
      sensSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        sensVal.textContent = `${val.toFixed(1)}X`;
        if (window.touchpadController) {
          window.touchpadController.sensitivity = val;
        }
      });
    }

    const deadzoneSlider = document.getElementById('setting-deadzone');
    const deadzoneVal = document.getElementById('val-deadzone');
    if (deadzoneSlider && deadzoneVal) {
      deadzoneSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        deadzoneVal.textContent = `${Math.round(val * 100)}%`;
        if (window.gamepadController) {
          window.gamepadController.deadzone = val;
        }
      });
    }
  }

  switchMode(mode) {
    if (!this.modesList.includes(mode)) return;
    this.activeMode = mode;
    this.vibrate(10);

    document.querySelectorAll('.dock-item').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-mode') === mode);
    });

    document.querySelectorAll('.controller-mode-view').forEach((v) => {
      v.classList.remove('active');
    });

    const activeView = document.getElementById(`mode-${mode}`);
    if (activeView) {
      activeView.classList.add('active');
    }

    this.sendMode(mode);

    if (mode === 'screen' && window.touchscreenController) {
      window.touchscreenController.onModeActivated();
    } else if (mode !== 'screen' && window.touchscreenController) {
      window.touchscreenController.onModeDeactivated();
    }
  }

  sendMode(mode) {
    if (this.isAuthenticated) {
      this.send({ t: 'mode', mode });
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new Remote4RealApp();
});
