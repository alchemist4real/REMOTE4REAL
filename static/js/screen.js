/**
 * REMOTE4REAL — Screen Mirror & Direct Touch Engine
 * Engineered by alchemist4real
 */

class TouchscreenController {
  constructor() {
    this.container = document.getElementById('screen-mirror-container');
    this.streamImg = document.getElementById('screen-stream-img');
    this.loadingOverlay = document.getElementById('screen-loading-spinner') || document.getElementById('screen-loading-overlay');
    this.btnFit = document.getElementById('btn-screen-fit');
    this.btnFill = document.getElementById('btn-screen-fill');
    this.btnReconnect = document.getElementById('btn-screen-reconnect');
    this.fpsBadge = document.getElementById('screen-fps-counter') || document.getElementById('screen-fps-text');

    this.isFit = true;
    this.isRightClickMode = false;
    this.touchStartTime = 0;
    this.touchStartPos = { x: 0, y: 0 };
    this.longPressTimer = null;
    this.hasMoved = false;
    this.currentBlobUrl = null;
    
    this.serverWidth = 1920;
    this.serverHeight = 1080;

    // FPS Counter
    this.frameCount = 0;
    this.lastFpsTime = performance.now();

    this.initTouchEvents();
    this.initControls();
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

  initTouchEvents() {
    if (!this.container) return;

    const getNormalizedCoords = (touch) => {
      const rect = this.streamImg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return { x: 0.5, y: 0.5 };

      let clientX = touch.clientX;
      let clientY = touch.clientY;

      if (!this.isFit) {
        let x = (clientX - rect.left) / rect.width;
        let y = (clientY - rect.top) / rect.height;

        if (window.app && window.app.isForcedLandscape) {
          const tempX = y;
          const tempY = 1.0 - x;
          x = tempX;
          y = tempY;
        }

        return {
          x: Math.max(0.0, Math.min(1.0, x)),
          y: Math.max(0.0, Math.min(1.0, y))
        };
      }

      // Letterbox calculation for aspect-ratio fit
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
    };

    // Touch Start
    this.container.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const numTouches = e.touches.length;

      if (numTouches === 1) {
        const t = e.touches[0];
        const coords = getNormalizedCoords(t);
        this.touchStartTime = Date.now();
        this.touchStartPos = { x: t.clientX, y: t.clientY };
        this.hasMoved = false;

        // Long press detection for Right Click (300ms)
        clearTimeout(this.longPressTimer);
        this.longPressTimer = setTimeout(() => {
          if (!this.hasMoved) {
            if (window.app && window.app.vibrate) window.app.vibrate([20, 50, 20]);
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
        }, 300);

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

      } else if (numTouches === 2) {
        clearTimeout(this.longPressTimer);
        const t = e.touches[0];
        const coords = getNormalizedCoords(t);
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
      }
    }, { passive: false });

    // Touch Move
    this.container.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const numTouches = e.touches.length;

      if (numTouches === 1) {
        const t = e.touches[0];
        const dist = Math.hypot(t.clientX - this.touchStartPos.x, t.clientY - this.touchStartPos.y);
        if (dist > 8) {
          this.hasMoved = true;
          clearTimeout(this.longPressTimer);
        }

        const coords = getNormalizedCoords(t);
        if (window.app && window.app.send) {
          window.app.send({
            t: 'screen_touch',
            x: coords.x,
            y: coords.y,
            act: 'move'
          });
        }
      }
    }, { passive: false });

    // Touch End
    this.container.addEventListener('touchend', (e) => {
      e.preventDefault();
      clearTimeout(this.longPressTimer);

      if (e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        const coords = getNormalizedCoords(t);
        const duration = Date.now() - this.touchStartTime;

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

        if (!this.hasMoved && duration < 280 && !this.isRightClickMode) {
          if (window.app && window.app.vibrate) window.app.vibrate(10);
          this.spawnTouchIndicator(t.clientX, t.clientY, 'left-click');
        }

        if (this.isRightClickMode) {
          this.isRightClickMode = false;
        }
      }
    }, { passive: false });
  }

  spawnTouchIndicator(clientX, clientY, type) {
    const dot = document.createElement('div');
    dot.className = `screen-touch-dot ${type}`;
    dot.style.left = `${clientX}px`;
    dot.style.top = `${clientY}px`;
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 350);
  }

  initControls() {
    if (this.btnFit && this.streamImg) {
      this.btnFit.addEventListener('click', (e) => {
        e.preventDefault();
        this.isFit = true;
        this.streamImg.classList.remove('screen-fill-mode');
        this.btnFit.classList.add('active');
        if (this.btnFill) this.btnFill.classList.remove('active');
        if (window.app && window.app.vibrate) window.app.vibrate(12);
      });
    }

    if (this.btnFill && this.streamImg) {
      this.btnFill.addEventListener('click', (e) => {
        e.preventDefault();
        this.isFit = false;
        this.streamImg.classList.add('screen-fill-mode');
        this.btnFill.classList.add('active');
        if (this.btnFit) this.btnFit.classList.remove('active');
        if (window.app && window.app.vibrate) window.app.vibrate(12);
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

  initAutoRotateListener() {
    const handleOrientation = () => {
      // Small timeout to allow browser layout to complete
      setTimeout(() => {
        if (this.container && this.streamImg) {
          // Trigger layout recalculation
          const rect = this.container.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            // Container resized smoothly
          }
        }
      }, 100);
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
