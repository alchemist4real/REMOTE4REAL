/**
 * REMOTE4REAL — Core Client Engine
 * Features: PIN Authentication, Dropdown Mode Selector, Fullscreen Engine, 
 * In-App Camera QR Scanner, Download/Install Hub, Multi-Device Networking, & UI Controls.
 * Engineered by alchemist4real
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
    this.isFullscreen = false;
    this.pingInterval = null;
    this.currentPingMs = 0;

    // PIN Security State
    this.currentPin = this.extractPinFromUrl() || localStorage.getItem('r4_security_pin') || '';
    this.enteredPin = '';
    this.modesList = ['touchpad', 'keyboard', 'keypad', 'screen', 'media', 'gamepad'];

    // Camera QR Scanner State
    this.qrVideo = null;
    this.qrCanvas = null;
    this.qrContext = null;
    this.qrStream = null;
    this.isScanning = false;

    // Worldwide Dual-Location State
    this.clientGeo = { city: 'Detecting...', country: '', countryCode: '', flag: '🌐', lat: null, lon: null };
    this.desktopGeo = null;
    this.deviceName = this.detectDeviceName();

    this.initSecurityUI();
    this.initScannerUI();
    this.initModeDropdown();
    this.initFullscreenUI();
    this.initDownloadModal();
    this.detectClientGeolocation();
    this.initNetwork();
    this.initUI();
    this.initRotation();
    this.initSwipeGestures();
  }

  detectDeviceName() {
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return 'iPhone (iOS)';
    if (/iPad/i.test(ua)) return 'iPad (iPadOS)';
    if (/Android/i.test(ua)) return 'Android Device';
    if (/Macintosh/i.test(ua)) return 'Mac';
    if (/Windows/i.test(ua)) return 'Windows PC';
    return 'Mobile Browser';
  }

  async detectClientGeolocation() {
    try {
      // 1. Fetch IP Geolocation (Fast & zero-auth)
      const res = await fetch('http://ip-api.com/json/?fields=status,country,countryCode,regionName,city,lat,lon,timezone', { cache: 'no-cache' }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          const cc = data.countryCode || '';
          const flag = cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map(c => 127397 + c.charCodeAt(0))) : '🌐';
          this.clientGeo = {
            city: data.city || 'Unknown City',
            region: data.regionName || '',
            country: data.country || '',
            countryCode: cc,
            flag: flag,
            lat: data.lat,
            lon: data.lon,
            timezone: data.timezone || ''
          };
          this.updateGeoUI();
          return;
        }
      }
    } catch (e) {
      // Fallback
    }

    // 2. Timezone-based fallback if offline / direct LAN
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const city = tz.includes('/') ? tz.split('/')[1].replace(/_/g, ' ') : 'Local Device';
    this.clientGeo = {
      city: city,
      country: 'Local Network',
      countryCode: '',
      flag: '📍',
      lat: null,
      lon: null,
      timezone: tz
    };
    this.updateGeoUI();
  }

  updateGeoUI(distanceKm = null) {
    const clientLocEl = document.getElementById('geo-client-location');
    const desktopLocEl = document.getElementById('geo-desktop-location');
    const distEl = document.getElementById('geo-distance-text');

    if (clientLocEl) {
      const cStr = `${this.clientGeo.city}${this.clientGeo.country ? ', ' + this.clientGeo.country : ''} ${this.clientGeo.flag}`;
      clientLocEl.textContent = cStr.trim();
    }

    if (desktopLocEl && this.desktopGeo) {
      const dStr = `${this.desktopGeo.city}${this.desktopGeo.country ? ', ' + this.desktopGeo.country : ''} ${this.desktopGeo.flag || ''}`;
      desktopLocEl.textContent = dStr.trim();
    }

    if (distEl) {
      if (distanceKm !== null && distanceKm > 0) {
        distEl.textContent = `⚡ ${Math.round(distanceKm).toLocaleString()} KM DISTANCE`;
      } else if (this.isConnected) {
        distEl.textContent = `⚡ DIRECT LOW-LATENCY LINK`;
      } else {
        distEl.textContent = `CALCULATING DISTANCE...`;
      }
    }
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

    const handleDigit = (num) => {
      if (this.enteredPin.length < 4) {
        this.enteredPin += num;
        this.vibrate(12);
        this.updatePinDots();
        if (this.enteredPin.length === 4) {
          setTimeout(() => this.submitPin(this.enteredPin), 60);
        }
      }
    };

    keypadBtns.forEach((btn) => {
      const num = btn.getAttribute('data-num');
      const onKeypadPress = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleDigit(num);
      };
      btn.addEventListener('touchstart', onKeypadPress, { passive: false });
      btn.addEventListener('click', onKeypadPress);
    });

    if (backspaceBtn) {
      const onBackspace = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.enteredPin.length > 0) {
          this.enteredPin = this.enteredPin.slice(0, -1);
          this.vibrate(10);
          this.updatePinDots();
        }
      };
      backspaceBtn.addEventListener('touchstart', onBackspace, { passive: false });
      backspaceBtn.addEventListener('click', onBackspace);
    }

    if (scanBtn) {
      scanBtn.addEventListener('click', (e) => {
        e.preventDefault();
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

    // Physical / virtual keyboard numpad fallback when PIN modal is open
    window.addEventListener('keydown', (e) => {
      if (pinModal && !pinModal.classList.contains('hidden')) {
        if (/^[0-9]$/.test(e.key)) {
          handleDigit(e.key);
        } else if (e.key === 'Backspace') {
          if (this.enteredPin.length > 0) {
            this.enteredPin = this.enteredPin.slice(0, -1);
            this.vibrate(10);
            this.updatePinDots();
          }
        }
      }
    });
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
      scanBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openQrScanner();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
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
        if (statusHint) statusHint.textContent = 'ALIGN PC QR CODE IN VIEW';
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

      if (pin) {
        this.currentPin = pin;
        localStorage.setItem('r4_security_pin', pin);
      }

      if (host && host !== window.location.hostname) {
        window.location.href = url.href;
      } else if (pin) {
        this.submitPin(pin);
      }
    } catch (e) {
      if (/^\d{4,8}$/.test(qrData.trim())) {
        this.submitPin(qrData.trim());
      }
    }
  }

  // ==========================================
  // DROPDOWN MODE SELECTOR
  // ==========================================
  initModeDropdown() {
    const triggerBtn = document.getElementById('btn-mode-dropdown');
    const menu = document.getElementById('mode-dropdown-menu');
    const options = document.querySelectorAll('.mode-option-item');

    if (triggerBtn && menu) {
      triggerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = !menu.classList.contains('hidden');
        menu.classList.toggle('hidden', isOpen);
        triggerBtn.classList.toggle('active', !isOpen);
        this.vibrate(8);
      });

      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !triggerBtn.contains(e.target)) {
          menu.classList.add('hidden');
          triggerBtn.classList.remove('active');
        }
      });
    }

    options.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.preventDefault();
        const mode = opt.getAttribute('data-mode');
        if (mode) {
          this.switchMode(mode);
          if (menu) menu.classList.add('hidden');
          if (triggerBtn) triggerBtn.classList.remove('active');
        }
      });
    });
  }

  // ==========================================
  // FULLSCREEN ENGINE
  // ==========================================
  initFullscreenUI() {
    const fsBtns = document.querySelectorAll('#btn-fullscreen, .btn-trigger-fs');
    const exitFsBtn = document.getElementById('btn-exit-fullscreen');

    fsBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleFullscreen();
      });
    });

    if (exitFsBtn) {
      exitFsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleFullscreen(false);
      });
    }

    document.addEventListener('fullscreenchange', () => {
      this.syncFullscreenState(Boolean(document.fullscreenElement));
    });
  }

  toggleFullscreen(forceState = null) {
    const targetState = forceState !== null ? forceState : !this.isFullscreen;
    this.vibrate(15);

    if (targetState) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      }
      this.syncFullscreenState(true);
    } else {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
      this.syncFullscreenState(false);
    }
  }

  syncFullscreenState(active) {
    this.isFullscreen = active;
    const wrapper = document.getElementById('app-wrapper');
    const exitBtn = document.getElementById('btn-exit-fullscreen');

    if (wrapper) wrapper.classList.toggle('fs-active', active);
    if (exitBtn) exitBtn.classList.toggle('visible', active);
  }

  // ==========================================
  // DOWNLOAD & INSTALL MODAL
  // ==========================================
  initDownloadModal() {
    const downloadBtn = document.getElementById('btn-download-app');
    const modal = document.getElementById('download-modal');
    const closeBtn = document.getElementById('btn-close-download');
    const copyCmdBtn = document.getElementById('btn-copy-install-cmd');

    if (downloadBtn && modal) {
      downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.classList.remove('hidden');
        this.vibrate(10);
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.classList.add('hidden');
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    }

    if (copyCmdBtn) {
      copyCmdBtn.addEventListener('click', () => {
        const cmd = 'irm https://raw.githubusercontent.com/alchemist4real/REMOTE4REAL/main/install.ps1 | iex';
        navigator.clipboard.writeText(cmd).then(() => {
          this.vibrate([20, 50, 20]);
          copyCmdBtn.textContent = 'COPIED TO CLIPBOARD!';
          copyCmdBtn.classList.add('copied');
          setTimeout(() => {
            copyCmdBtn.textContent = 'COPY COMMAND';
            copyCmdBtn.classList.remove('copied');
          }, 2000);
        }).catch(() => {
          prompt('Copy this command for Windows PowerShell:', cmd);
        });
      });
    }
  }

  // ==========================================
  // WEBSOCKET & NETWORKING
  // ==========================================
  initNetwork() {
    const params = new URLSearchParams(window.location.search);
    const host = window.location.hostname || 'localhost';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    let wsUrl;
    if (params.get('ws')) {
      wsUrl = params.get('ws');
    } else {
      const customWsPort = params.get('ws_port') || (window.location.port === '8080' ? 8765 : (window.location.port || 8765));
      wsUrl = `${protocol}//${host}:${customWsPort}`;
    }

    this.updateStatus('CONNECTING...', 'disconnected');

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.isConnected = true;
        this.startPingLoop();

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

            if (data.desktop_geo) {
              this.desktopGeo = data.desktop_geo;
              this.updateGeoUI();
            }

            // Send Phone Geolocation to Desktop
            this.send({
              t: 'client_geo',
              geo: this.clientGeo,
              device_name: this.deviceName
            });
          }

          // 3. GEO SYNC PACKET
          else if (data.type === 'geo_sync') {
            if (data.desktop) this.desktopGeo = data.desktop;
            if (data.client) this.clientGeo = data.client;
            this.updateGeoUI(data.distance_km);
          }

          // 4. AUTH FAILED
          else if (data.type === 'auth_failed') {
            this.isAuthenticated = false;
            const err = data.error || 'INVALID PIN';
            this.showPinModal(err);
          }

          // 5. PONG LATENCY
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
      if (['gamepad', 'screen'].includes(this.activeMode)) return;

      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (['gamepad', 'screen'].includes(this.activeMode)) return;

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
    const settingsBtn = document.getElementById('btn-settings');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('btn-close-settings');

    if (settingsBtn && settingsModal) {
      settingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        settingsModal.classList.remove('hidden');
      });
    }

    if (closeSettingsBtn && settingsModal) {
      closeSettingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
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

    // Update Dropdown current label & active option
    const labelEl = document.getElementById('current-mode-name');
    if (labelEl) {
      const modeNames = {
        touchpad: 'TRACKPAD',
        keyboard: 'KEYBOARD',
        keypad: 'KEYS+PAD',
        screen: 'SCREEN',
        media: 'MEDIA',
        gamepad: 'GAMEPAD'
      };
      labelEl.textContent = modeNames[mode] || mode.toUpperCase();
    }

    document.querySelectorAll('.mode-option-item').forEach((b) => {
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
