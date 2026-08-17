/**
 * REMOTE4REAL — Advanced Screen Mirror & Direct Touch Engine
 * Features: Sub-pixel Coordinate Mapping, 2-Finger Smooth Scrolling, Pinch-to-Zoom Precision Magnifier,
 * Long-Press Right-Click with Visual Ring, Double-Tap Double Click, & Slide-Up Keyboard Dock.
 * Engineered by alchemist4real
 */

class TouchscreenController {
  constructor() {
    this.container = document.getElementById('screen-mirror-container');
    this.streamImg = document.getElementById('screen-stream-img');
    this.loadingOverlay = document.getElementById('screen-loading-spinner') || document.getElementById('screen-loading-overlay');
    
    // Toolbar controls
    this.btnFit = document.getElementById('btn-screen-fit');
    this.btnZoom = document.getElementById('btn-screen-zoom');
    this.btnRClick = document.getElementById('btn-screen-rclick');
    this.btnKbToggle = document.getElementById('btn-screen-keyboard-toggle');
    this.btnReconnect = document.getElementById('btn-screen-reconnect');
    this.fpsBadge = document.getElementById('screen-fps-counter') || document.getElementById('screen-fps-text');
    
    // Slide-up Typing Dock
    this.typingDock = document.getElementById('screen-typing-dock');
    this.btnKbClose = document.getElementById('btn-screen-close-dock');
    this.nativeInput = document.getElementById('screen-native-input');

    // Display & Zoom State
    this.isFit = true;
    this.zoomScale = 1.0;
    this.panOffset = { x: 0, y: 0 };
    this.isRightClickMode = false;
    this.currentBlobUrl = null;

    // Gesture Tracking State
    this.touchStartTime = 0;
    this.touchStartPos = { x: 0, y: 0 };
    this.lastTapTime = 0;
    this.lastTapPos = { x: 0, y: 0 };
    this.hasMoved = false;
    this.longPressTimer = null;
    this.activeTouchRing = null;

    // Multi-touch Tracking
    this.initialPinchDist = 0;
    this.initialPinchScale = 1.0;
    this.lastTwoFingerPos = { x: 0, y: 0 };
    this.isTwoFingerScrolling = false;

    // Desktop Resolution Reference
    this.serverWidth = 1920;
    this.serverHeight = 1080;

    // FPS Counter
    this.frameCount = 0;
    this.lastFpsTime = performance.now();

    this.initTouchEvents();
    this.initControls();
    this.initTypingDock();
    this.initAutoRotateListener();
  }

  onModeActivated() {
    if (this.loadingOverlay) this.loadingOverlay.classList.remove('hidden');
    if (window.app && window.app.send) {
      window.app.send({ t: 'screen_stream', enable: true });
    }
  }

  onModeDeactivated() {
    if (window.app && window.app.send) {
      window.app.send({ t: 'screen_stream', enable: false });
    }
    if (this.typingDock) this.typingDock.classList.add('hidden');
    this.resetZoom();
  }

  onBinaryFrame(arrayBuffer) {
    if (!this.streamImg) return;

    try {
      const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
      const newUrl = URL.createObjectURL(blob);

      const tempImg = new Image();
      tempImg.onload = () => {
        if (this.currentBlobUrl) {
          URL.revokeObjectURL(this.currentBlobUrl);
        }
        this.streamImg.src = newUrl;
        this.currentBlobUrl = newUrl;

        if (this.loadingOverlay && !this.loadingOverlay.classList.contains('hidden')) {
          this.loadingOverlay.classList.add('hidden');
        }
        this.updateFps();
      };
      tempImg.onerror = () => {
        URL.revokeObjectURL(newUrl);
      };
      tempImg.src = newUrl;

    } catch (e) {
      console.error('Error rendering screen frame:', e);
    }
  }

  updateFps() {
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFpsTime;
    if (elapsed >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / elapsed);
      if (this.fpsBadge) {
        this.fpsBadge.textContent = `${fps} FPS`;
      }
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  // ==========================================
  // NORMALIZED COORDINATE CALCULATION (SUB-PIXEL PRECISION)
  // ==========================================
  getNormalizedCoords(touch) {
    const rect = this.streamImg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { x: 0.5, y: 0.5 };

    const clientX = touch.clientX;
    const clientY = touch.clientY;

    const imgAspect = this.serverWidth / this.serverHeight;
    const rectAspect = rect.width / rect.height;

    let renderW = rect.width;
    let renderH = rect.height;
    let renderLeft = rect.left;
    let renderTop = rect.top;

    if (rectAspect > imgAspect) {
      renderW = rect.height * imgAspect;
      renderLeft = rect.left + (rect.width - renderW) / 2;
    } else {
      renderH = rect.width / imgAspect;
      renderTop = rect.top + (rect.height - renderH) / 2;
    }

    let normX = (clientX - renderLeft) / renderW;
    let normY = (clientY - renderTop) / renderH;

    // Handle landscape orientation flip if forced
    if (window.app && window.app.isForcedLandscape) {
      const tempX = normY;
      const tempY = 1.0 - normX;
      normX = tempX;
      normY = tempY;
    }

    return {
      x: Math.max(0.0, Math.min(1.0, normX)),
      y: Math.max(0.0, Math.min(1.0, normY))
    };
  }

  // ==========================================
  // MULTI-TOUCH & GESTURE INTERACTION ENGINE
  // ==========================================
  initTouchEvents() {
    if (!this.container) return;

    // TOUCH START
    this.container.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const numTouches = e.touches.length;

      // 1-FINGER TOUCH
      if (numTouches === 1) {
        const t = e.touches[0];
        const coords = this.getNormalizedCoords(t);
        this.touchStartTime = Date.now();
        this.touchStartPos = { x: t.clientX, y: t.clientY };
        this.hasMoved = false;

        // Double-Tap Detection for Double-Click
        const timeSinceLastTap = this.touchStartTime - this.lastTapTime;
        const distFromLastTap = Math.hypot(t.clientX - this.lastTapPos.x, t.clientY - this.lastTapPos.y);

        if (timeSinceLastTap < 260 && distFromLastTap < 20) {
          clearTimeout(this.longPressTimer);
          this.removeTouchRing();

          // Dispatch Windows Double Click
          if (window.app && window.app.vibrate) window.app.vibrate([15, 20, 15]);
          if (window.app && window.app.send) {
            window.app.send({ t: 'screen_touch', x: coords.x, y: coords.y, act: 'click', btn: 'left' });
            setTimeout(() => {
              window.app.send({ t: 'screen_touch', x: coords.x, y: coords.y, act: 'click', btn: 'left' });
            }, 50);
          }
          this.spawnTouchIndicator(t.clientX, t.clientY, 'double-click');
          this.lastTapTime = 0;
          return;
        }

        this.lastTapTime = this.touchStartTime;
        this.lastTapPos = { x: t.clientX, y: t.clientY };

        // Long Press Visual Ring & Right-Click Countdown (280ms)
        this.removeTouchRing();
        this.spawnTouchRing(t.clientX, t.clientY);

        clearTimeout(this.longPressTimer);
        this.longPressTimer = setTimeout(() => {
          if (!this.hasMoved) {
            this.removeTouchRing();
            if (window.app && window.app.vibrate) window.app.vibrate([20, 45, 20]);
            if (window.app && window.app.send) {
              window.app.send({
                t: 'screen_touch',
                x: coords.x,
                y: coords.y,
                act: 'right_click'
              });
            }
            this.spawnTouchIndicator(t.clientX, t.clientY, 'right-click');
          }
        }, 280);

        // Send Windows Mouse Down (Left or Right)
        const btn = this.isRightClickMode ? 'right' : 'left';
        if (window.app && window.app.send) {
          window.app.send({
            t: 'screen_touch',
            x: coords.x,
            y: coords.y,
            act: 'down',
            btn: btn
          });
        }

      }
      // 2-FINGER TOUCH (SCROLL OR PINCH)
      else if (numTouches === 2) {
        clearTimeout(this.longPressTimer);
        this.removeTouchRing();

        const t1 = e.touches[0];
        const t2 = e.touches[1];

        this.initialPinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        this.initialPinchScale = this.zoomScale;
        this.lastTwoFingerPos = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
        this.isTwoFingerScrolling = false;
      }
    }, { passive: false });

    // TOUCH MOVE
    this.container.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const numTouches = e.touches.length;

      // 1-FINGER DRAG (Window moving / text selection)
      if (numTouches === 1) {
        const t = e.touches[0];
        const dist = Math.hypot(t.clientX - this.touchStartPos.x, t.clientY - this.touchStartPos.y);

        if (dist > 8) {
          this.hasMoved = true;
          clearTimeout(this.longPressTimer);
          this.removeTouchRing();
        }

        const coords = this.getNormalizedCoords(t);
        if (window.app && window.app.send) {
          window.app.send({
            t: 'screen_touch',
            x: coords.x,
            y: coords.y,
            act: 'move'
          });
        }
      }
      // 2-FINGER SCROLL & PINCH-TO-ZOOM
      else if (numTouches === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const distDelta = Math.abs(currentDist - this.initialPinchDist);

        const currentCenter = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };

        const dy = (currentCenter.y - this.lastTwoFingerPos.y);
        const dx = (currentCenter.x - this.lastTwoFingerPos.x);

        // A. Pinch to Zoom
        if (distDelta > 20 && !this.isTwoFingerScrolling) {
          const pinchFactor = currentDist / this.initialPinchDist;
          let newScale = this.initialPinchScale * pinchFactor;
          newScale = Math.max(1.0, Math.min(3.0, newScale));
          this.setZoom(newScale);
        }
        // B. 2-Finger Momentum Scroll
        else if (Math.hypot(dx, dy) > 3) {
          this.isTwoFingerScrolling = true;
          // Send smooth scroll wheel event to Windows
          const scrollFactor = 0.08;
          if (window.app && window.app.send) {
            window.app.send({
              t: 'touch_scroll',
              dx: -dx * scrollFactor,
              dy: -dy * scrollFactor
            });
          }
        }

        this.lastTwoFingerPos = currentCenter;
      }
    }, { passive: false });

    // TOUCH END
    this.container.addEventListener('touchend', (e) => {
      e.preventDefault();
      clearTimeout(this.longPressTimer);
      this.removeTouchRing();

      if (e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        const coords = this.getNormalizedCoords(t);
        const duration = Date.now() - this.touchStartTime;

        // 2-Finger Quick Tap = Instant Right Click
        if (e.touches.length === 0 && e.changedTouches.length === 2 && !this.hasMoved && duration < 240) {
          if (window.app && window.app.vibrate) window.app.vibrate(15);
          if (window.app && window.app.send) {
            window.app.send({
              t: 'screen_touch',
              x: coords.x,
              y: coords.y,
              act: 'right_click'
            });
          }
          this.spawnTouchIndicator(t.clientX, t.clientY, 'right-click');
          return;
        }

        // Send Windows Mouse Up
        const btn = this.isRightClickMode ? 'right' : 'left';
        if (window.app && window.app.send) {
          window.app.send({
            t: 'screen_touch',
            x: coords.x,
            y: coords.y,
            act: 'up',
            btn: btn
          });
        }

        // Tap Left-Click Indicator
        if (!this.hasMoved && duration < 260 && !this.isRightClickMode) {
          if (window.app && window.app.vibrate) window.app.vibrate(8);
          this.spawnTouchIndicator(t.clientX, t.clientY, 'left-click');
        }

        // Auto-disarm sticky right click mode after tap
        if (this.isRightClickMode) {
          this.isRightClickMode = false;
          if (this.btnRClick) this.btnRClick.classList.remove('active');
        }
      }
    }, { passive: false });
  }

  // ==========================================
  // ZOOM & PRECISION MAGNIFIER ENGINE
  // ==========================================
  setZoom(scale) {
    this.zoomScale = scale;
    if (this.streamImg) {
      this.streamImg.style.transform = `scale(${this.zoomScale})`;
      this.streamImg.style.transition = 'transform 0.08s ease-out';
    }
    if (this.btnZoom) {
      this.btnZoom.textContent = this.zoomScale > 1.1 ? `${this.zoomScale.toFixed(1)}X` : 'ZOOM';
      this.btnZoom.classList.toggle('active', this.zoomScale > 1.1);
    }
    if (this.btnFit) {
      this.btnFit.classList.toggle('active', this.zoomScale <= 1.1);
    }
  }

  resetZoom() {
    this.setZoom(1.0);
    if (this.streamImg) {
      this.streamImg.style.transform = 'scale(1.0)';
    }
  }

  // ==========================================
  // VISUAL FEEDBACK (RIPPLE & LONG-PRESS RING)
  // ==========================================
  spawnTouchIndicator(clientX, clientY, type) {
    const dot = document.createElement('div');
    dot.className = `screen-touch-dot ${type}`;
    dot.style.left = `${clientX}px`;
    dot.style.top = `${clientY}px`;
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 350);
  }

  spawnTouchRing(clientX, clientY) {
    this.removeTouchRing();
    const ring = document.createElement('div');
    ring.className = 'screen-touch-ring';
    ring.style.left = `${clientX}px`;
    ring.style.top = `${clientY}px`;
    document.body.appendChild(ring);
    this.activeTouchRing = ring;
  }

  removeTouchRing() {
    if (this.activeTouchRing) {
      this.activeTouchRing.remove();
      this.activeTouchRing = null;
    }
  }

  // ==========================================
  // CONTROLS & KEYBOARD DOCK
  // ==========================================
  initControls() {
    if (this.btnFit) {
      this.btnFit.addEventListener('click', (e) => {
        e.preventDefault();
        this.resetZoom();
        if (window.app && window.app.vibrate) window.app.vibrate(10);
      });
    }

    if (this.btnZoom) {
      this.btnZoom.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.zoomScale > 1.1) {
          this.resetZoom();
        } else {
          this.setZoom(2.0);
        }
        if (window.app && window.app.vibrate) window.app.vibrate(12);
      });
    }

    if (this.btnRClick) {
      this.btnRClick.addEventListener('click', (e) => {
        e.preventDefault();
        this.isRightClickMode = !this.isRightClickMode;
        this.btnRClick.classList.toggle('active', this.isRightClickMode);
        if (window.app && window.app.vibrate) window.app.vibrate(12);
      });
    }

    if (this.btnKbToggle) {
      this.btnKbToggle.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.typingDock) {
          const isOpen = !this.typingDock.classList.contains('hidden');
          this.typingDock.classList.toggle('hidden', isOpen);
          this.btnKbToggle.classList.toggle('active', !isOpen);
          if (!isOpen && this.nativeInput) {
            setTimeout(() => this.nativeInput.focus(), 80);
          }
        }
        if (window.app && window.app.vibrate) window.app.vibrate(10);
      });
    }

    if (this.btnReconnect) {
      this.btnReconnect.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.loadingOverlay) this.loadingOverlay.classList.remove('hidden');
        if (window.app && window.app.send) {
          window.app.send({ t: 'screen_stream', enable: true });
        }
        if (window.app && window.app.vibrate) window.app.vibrate(15);
      });
    }
  }

  initTypingDock() {
    if (this.btnKbClose && this.typingDock) {
      this.btnKbClose.addEventListener('click', (e) => {
        e.preventDefault();
        this.typingDock.classList.add('hidden');
        if (this.btnKbToggle) this.btnKbToggle.classList.remove('active');
        if (this.nativeInput) this.nativeInput.blur();
        if (window.app && window.app.vibrate) window.app.vibrate(8);
      });
    }
  }

  initAutoRotateListener() {
    const handleOrientation = () => {
      setTimeout(() => {
        if (this.container && this.streamImg) {
          this.resetZoom();
        }
      }, 120);
    };

    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientation);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.touchscreenController = new TouchscreenController();
});
