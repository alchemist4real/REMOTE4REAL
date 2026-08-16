/**
 * REMOTE4REAL — Screen Mirror & Direct Touch Engine
 */

class TouchscreenController {
  constructor() {
    this.container = document.getElementById('screen-mirror-container');
    this.streamImg = document.getElementById('screen-stream-img');
    this.loadingOverlay = document.getElementById('screen-loading-overlay');
    this.btnFit = document.getElementById('btn-screen-fit');
    this.btnKeyboard = document.getElementById('btn-screen-keyboard');
    this.miniKeyboard = document.getElementById('screen-mini-keyboard');

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
    this.fpsText = document.getElementById('screen-fps-text');

    this.initTouchEvents();
    this.initControls();
  }

  onModeActivated() {
    console.log('Screen Mirror mode activated - requesting WebSocket stream...');
    if (this.loadingOverlay) this.loadingOverlay.classList.remove('hidden');
    if (window.app) {
      window.app.send({ t: 'screen_stream', enable: true });
    }
  }

  onModeDeactivated() {
    console.log('Screen Mirror mode deactivated - pausing stream...');
    if (window.app) {
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
      console.error('Error rendering binary screen frame:', e);
    }
  }

  updateFps() {
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFpsTime;
    if (elapsed >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / elapsed);
      if (this.fpsText) {
        this.fpsText.textContent = `${fps} FPS`;
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

        // Long press detection for Right Click (320ms)
        clearTimeout(this.longPressTimer);
        this.longPressTimer = setTimeout(() => {
          if (!this.hasMoved) {
            window.app.vibrate([20, 50, 20]);
            window.app.send({
              t: 'screen_touch',
              x: coords.x,
              y: coords.y,
              act: 'right_click'
            });
            this.spawnTouchIndicator(t.clientX, t.clientY, 'right-click');
          }
        }, 320);

        const btn = this.isRightClickMode ? 'right' : 'left';
        window.app.send({
          t: 'screen_touch',
          x: coords.x,
          y: coords.y,
          act: 'down',
          btn: btn
        });

      } else if (numTouches === 2) {
        clearTimeout(this.longPressTimer);
        const t = e.touches[0];
        const coords = getNormalizedCoords(t);
        window.app.vibrate(15);
        window.app.send({
          t: 'screen_touch',
          x: coords.x,
          y: coords.y,
          act: 'right_click'
        });
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
        window.app.send({
          t: 'screen_touch',
          x: coords.x,
          y: coords.y,
          act: 'move'
        });
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
        window.app.send({
          t: 'screen_touch',
          x: coords.x,
          y: coords.y,
          act: 'up',
          btn: btn
        });

        if (!this.hasMoved && duration < 300 && !this.isRightClickMode) {
          window.app.vibrate(10);
          this.spawnTouchIndicator(t.clientX, t.clientY, 'left-click');
        }

        if (this.isRightClickMode) {
          this.isRightClickMode = false;
          const rBtn = document.getElementById('btn-screen-rc');
          if (rBtn) rBtn.classList.remove('active');
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
      this.btnFit.addEventListener('click', () => {
        this.isFit = !this.isFit;
        this.streamImg.classList.toggle('screen-fill-mode', !this.isFit);
        this.btnFit.textContent = this.isFit ? '🔍 FIT' : '🔍 FILL';
        window.app.vibrate(12);
      });
    }

    if (this.btnKeyboard && this.miniKeyboard) {
      this.btnKeyboard.addEventListener('click', () => {
        this.miniKeyboard.classList.toggle('hidden');
        window.app.vibrate(15);
      });
    }

    const rBtn = document.getElementById('btn-screen-rc');
    if (rBtn) {
      rBtn.addEventListener('click', () => {
        this.isRightClickMode = !this.isRightClickMode;
        rBtn.classList.toggle('active', this.isRightClickMode);
        window.app.vibrate(15);
      });
    }

    const refreshBtn = document.getElementById('btn-screen-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        if (this.loadingOverlay) this.loadingOverlay.classList.remove('hidden');
        if (window.app) {
          window.app.send({ t: 'screen_stream', enable: true });
        }
        window.app.vibrate(15);
      });
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.touchscreenController = new TouchscreenController();
});
