/**
 * REMOTE4REAL — Console Gamepad Engine
 * Dual Analog Joysticks, D-Pad, ABXY, Triggers, and Motion Gyroscope.
 */

class GamepadController {
  constructor() {
    this.deadzone = 0.12;
    this.gyroEnabled = false;
    this.gyroListener = null;

    this.leftStick = { x: 0, y: 0, active: false, touchId: null, baseEl: null, nippleEl: null, radius: 48 };
    this.rightStick = { x: 0, y: 0, active: false, touchId: null, baseEl: null, nippleEl: null, radius: 48 };

    this.initJoysticks();
    this.initActionButtons();
    this.initDpad();
    this.initShouldersAndTriggers();
    this.initGyro();
    this.startLoop();
  }

  // ==========================================
  // DUAL ANALOG JOYSTICKS
  // ==========================================
  initJoysticks() {
    this.setupJoystick(
      'joystick-left-zone',
      'stick-left-base',
      'stick-left-nipple',
      this.leftStick,
      'left'
    );

    this.setupJoystick(
      'joystick-right-zone',
      'stick-right-base',
      'stick-right-nipple',
      this.rightStick,
      'right'
    );
  }

  setupJoystick(zoneId, baseId, nippleId, stickState, stickName) {
    const zone = document.getElementById(zoneId);
    const base = document.getElementById(baseId);
    const nipple = document.getElementById(nippleId);

    if (!zone || !base || !nipple) return;

    stickState.baseEl = base;
    stickState.nippleEl = nipple;

    const handleStart = (touch, id) => {
      stickState.active = true;
      stickState.touchId = id;
      window.app.vibrate(10);
      nipple.style.transition = 'none';
      this.updateJoystickPos(touch.clientX, touch.clientY, stickState, stickName);
    };

    const handleMove = (touch) => {
      if (!stickState.active) return;
      this.updateJoystickPos(touch.clientX, touch.clientY, stickState, stickName);
    };

    const handleEnd = () => {
      stickState.active = false;
      stickState.touchId = null;
      stickState.x = 0;
      stickState.y = 0;
      
      // Smooth spring back to center
      nipple.style.transition = 'transform 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      nipple.style.transform = `translate(0px, 0px)`;
      
      window.app.send({
        t: 'gp_stick',
        stick: stickName,
        x: 0,
        y: 0
      });
    };

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (!stickState.active) {
          handleStart(t, t.identifier);
          break;
        }
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (!stickState.active) return;
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (t.identifier === stickState.touchId) {
          e.preventDefault();
          handleMove(t);
          break;
        }
      }
    }, { passive: false });

    const finishTouch = (e) => {
      if (!stickState.active) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === stickState.touchId) {
          handleEnd();
          break;
        }
      }
    };

    window.addEventListener('touchend', finishTouch, { passive: false });
    window.addEventListener('touchcancel', finishTouch, { passive: false });

    // Double tap for stick click (L3/R3)
    let lastTap = 0;
    zone.addEventListener('touchend', () => {
      const now = Date.now();
      if (now - lastTap < 260) {
        const clickBtn = stickName === 'left' ? 'l3' : 'r3';
        window.app.vibrate([20, 40, 20]);
        window.app.send({ t: 'gp_btn', btn: clickBtn, act: 'tap' });
      }
      lastTap = now;
    });
  }

  updateJoystickPos(clientX, clientY, stickState, stickName) {
    const rect = stickState.baseEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let deltaX = clientX - centerX;
    let deltaY = clientY - centerY;

    if (window.app && window.app.isForcedLandscape) {
      const origDx = deltaX;
      const origDy = deltaY;
      deltaX = origDy;
      deltaY = -origDx;
    }

    const dist = Math.hypot(deltaX, deltaY);
    const maxRadius = stickState.radius;
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(deltaY, deltaX);

    const dispX = Math.cos(angle) * clampedDist;
    const dispY = Math.sin(angle) * clampedDist;

    if (window.app && window.app.isForcedLandscape) {
      stickState.nippleEl.style.transform = `translate(${-dispY}px, ${dispX}px)`;
    } else {
      stickState.nippleEl.style.transform = `translate(${dispX}px, ${dispY}px)`;
    }

    let normX = dispX / maxRadius;
    let normY = dispY / maxRadius;

    const normDist = dist / maxRadius;
    if (normDist < this.deadzone) {
      normX = 0;
      normY = 0;
    }

    stickState.x = parseFloat(normX.toFixed(3));
    stickState.y = parseFloat(normY.toFixed(3));

    window.app.send({
      t: 'gp_stick',
      stick: stickName,
      x: stickState.x,
      y: stickState.y
    });
  }

  // ==========================================
  // BUTTONS & TRIGGERS
  // ==========================================
  initActionButtons() {
    const btns = document.querySelectorAll('.action-btn, .gp-center-btn:not(.gp-gyro-btn)');
    btns.forEach(btn => {
      const btnName = btn.getAttribute('data-btn');
      if (!btnName) return;

      const handlePress = (e) => {
        e.preventDefault();
        btn.classList.add('active');
        window.app.vibrate(12);
        window.app.send({ t: 'gp_btn', btn: btnName, act: 'down' });
      };

      const handleRelease = (e) => {
        e.preventDefault();
        btn.classList.remove('active');
        window.app.send({ t: 'gp_btn', btn: btnName, act: 'up' });
      };

      btn.addEventListener('touchstart', handlePress, { passive: false });
      btn.addEventListener('touchend', handleRelease, { passive: false });
      btn.addEventListener('touchcancel', handleRelease, { passive: false });
      btn.addEventListener('mousedown', handlePress);
      btn.addEventListener('mouseup', handleRelease);
    });
  }

  initDpad() {
    const dpadBtns = document.querySelectorAll('.dpad-btn');
    dpadBtns.forEach(btn => {
      const btnName = btn.getAttribute('data-btn');
      if (!btnName) return;

      const handlePress = (e) => {
        e.preventDefault();
        btn.classList.add('active');
        window.app.vibrate(10);
        window.app.send({ t: 'gp_btn', btn: btnName, act: 'down' });
      };

      const handleRelease = (e) => {
        e.preventDefault();
        btn.classList.remove('active');
        window.app.send({ t: 'gp_btn', btn: btnName, act: 'up' });
      };

      btn.addEventListener('touchstart', handlePress, { passive: false });
      btn.addEventListener('touchend', handleRelease, { passive: false });
      btn.addEventListener('touchcancel', handleRelease, { passive: false });
    });
  }

  initShouldersAndTriggers() {
    const shoulders = document.querySelectorAll('.gp-shoulder-btn');
    shoulders.forEach(btn => {
      const btnName = btn.getAttribute('data-btn');
      if (!btnName) return;

      const isTrigger = ['lt', 'rt'].includes(btnName);
      const fillEl = isTrigger ? document.getElementById(`fill-${btnName}`) : null;

      const handlePress = (e) => {
        e.preventDefault();
        btn.classList.add('active');
        window.app.vibrate(15);

        if (isTrigger) {
          if (fillEl) fillEl.style.width = '100%';
          window.app.send({ t: 'gp_trigger', trig: btnName, v: 1.0 });
        } else {
          window.app.send({ t: 'gp_btn', btn: btnName, act: 'down' });
        }
      };

      const handleRelease = (e) => {
        e.preventDefault();
        btn.classList.remove('active');

        if (isTrigger) {
          if (fillEl) fillEl.style.width = '0%';
          window.app.send({ t: 'gp_trigger', trig: btnName, v: 0.0 });
        } else {
          window.app.send({ t: 'gp_btn', btn: btnName, act: 'up' });
        }
      };

      btn.addEventListener('touchstart', handlePress, { passive: false });
      btn.addEventListener('touchend', handleRelease, { passive: false });
      btn.addEventListener('touchcancel', handleRelease, { passive: false });
    });
  }

  // ==========================================
  // GYROSCOPE TILT STEERING
  // ==========================================
  initGyro() {
    const gyroBtn = document.getElementById('btn-gyro-toggle');
    if (!gyroBtn) return;

    gyroBtn.addEventListener('click', async () => {
      this.gyroEnabled = !this.gyroEnabled;
      gyroBtn.classList.toggle('active', this.gyroEnabled);
      window.app.vibrate([20, 50, 20]);

      if (this.gyroEnabled) {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
          try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission !== 'granted') {
              alert('Gyroscope motion permission was denied.');
              this.gyroEnabled = false;
              gyroBtn.classList.remove('active');
              return;
            }
          } catch (e) {
            console.error('Error requesting gyro permission:', e);
          }
        }

        this.gyroListener = (e) => {
          if (!this.gyroEnabled) return;
          const gamma = e.gamma || 0;
          window.app.send({ t: 'gyro', gamma: gamma });
        };
        window.addEventListener('deviceorientation', this.gyroListener);
      } else {
        if (this.gyroListener) {
          window.removeEventListener('deviceorientation', this.gyroListener);
          this.gyroListener = null;
        }
        window.app.send({ t: 'gyro', gamma: 0 });
      }
    });
  }

  startLoop() {
    setInterval(() => {
      if (this.leftStick.active) {
        window.app.send({
          t: 'gp_stick',
          stick: 'left',
          x: this.leftStick.x,
          y: this.leftStick.y
        });
      }
      if (this.rightStick.active) {
        window.app.send({
          t: 'gp_stick',
          stick: 'right',
          x: this.rightStick.x,
          y: this.rightStick.y
        });
      }
    }, 25);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.gamepadController = new GamepadController();
});
