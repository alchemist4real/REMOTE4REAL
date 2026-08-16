/**
 * REMOTE4REAL — Trackpad & Keys Engine
 */

class TouchpadController {
  constructor() {
    this.touchpad = document.getElementById('touchpad-area');
    this.rippleContainer = document.getElementById('touch-ripple-container');
    this.deckInput = document.getElementById('deck-native-input');
    this.deckSendBtn = document.getElementById('btn-deck-send');
    this.deckClearBtn = document.getElementById('btn-deck-clear');
    
    this.sensitivity = 1.2;
    this.touchStartTime = 0;
    this.touchStartPos = { x: 0, y: 0 };
    this.lastPos = { x: 0, y: 0 };
    this.twoFingerLastPos = { x: 0, y: 0 };
    this.hasMoved = false;

    this.initTouchpadEvents();
    this.initMouseButtons();
    this.initNativeTypingDock();
    this.initModifierChips();
  }

  // ==========================================
  // 1. TRACKPAD TOUCH EVENTS
  // ==========================================
  initTouchpadEvents() {
    if (!this.touchpad) return;

    this.touchpad.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const now = Date.now();
      const numTouches = e.touches.length;

      if (numTouches === 1) {
        const t = e.touches[0];
        this.touchStartTime = now;
        this.touchStartPos = { x: t.clientX, y: t.clientY };
        this.lastPos = { x: t.clientX, y: t.clientY };
        this.hasMoved = false;
        this.spawnRipple(t.clientX, t.clientY);

      } else if (numTouches === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        this.twoFingerLastPos = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
        this.touchStartTime = now;
        this.hasMoved = false;
      }
    }, { passive: false });

    this.touchpad.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const numTouches = e.touches.length;

      if (numTouches === 1) {
        const t = e.touches[0];
        let rawDx = (t.clientX - this.lastPos.x) * this.sensitivity;
        let rawDy = (t.clientY - this.lastPos.y) * this.sensitivity;

        let dx = rawDx;
        let dy = rawDy;
        if (window.app && window.app.isForcedLandscape) {
          dx = rawDy;
          dy = -rawDx;
        }

        const totalDist = Math.hypot(t.clientX - this.touchStartPos.x, t.clientY - this.touchStartPos.y);
        if (totalDist > 6) {
          this.hasMoved = true;
        }

        if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
          window.app.send({
            t: 'touch_move',
            dx: dx,
            dy: dy
          });
        }

        this.lastPos = { x: t.clientX, y: t.clientY };

      } else if (numTouches === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const avgX = (t1.clientX + t2.clientX) / 2;
        const avgY = (t1.clientY + t2.clientY) / 2;

        let rawScrollDx = (avgX - this.twoFingerLastPos.x) * 0.15;
        let rawScrollDy = (this.twoFingerLastPos.y - avgY) * 0.15;

        let scrollDx = rawScrollDx;
        let scrollDy = rawScrollDy;
        if (window.app && window.app.isForcedLandscape) {
          scrollDx = -rawScrollDy;
          scrollDy = rawScrollDx;
        }

        const totalDist = Math.hypot(avgX - this.twoFingerLastPos.x, avgY - this.twoFingerLastPos.y);
        if (totalDist > 5) {
          this.hasMoved = true;
        }

        if (Math.abs(scrollDy) > 0.1 || Math.abs(scrollDx) > 0.1) {
          window.app.send({
            t: 'touch_scroll',
            dx: scrollDx,
            dy: scrollDy
          });
        }

        this.twoFingerLastPos = { x: avgX, y: avgY };
      }
    }, { passive: false });

    this.touchpad.addEventListener('touchend', (e) => {
      e.preventDefault();
      const duration = Date.now() - this.touchStartTime;

      if (!this.hasMoved && duration < 240) {
        if (e.touches.length === 0 && e.changedTouches.length === 1) {
          window.app.send({ t: 'touch_click', btn: 'left', act: 'click' });
          window.app.vibrate(12);
        }
      }

      if (e.changedTouches.length === 2 && !this.hasMoved && duration < 240) {
        window.app.send({ t: 'touch_click', btn: 'right', act: 'click' });
        window.app.vibrate([15, 30, 15]);
      }
    }, { passive: false });
  }

  spawnRipple(clientX, clientY) {
    if (!this.rippleContainer || !this.touchpad) return;
    const rect = this.touchpad.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const ripple = document.createElement('div');
    ripple.className = 'touch-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    this.rippleContainer.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 400);
  }

  // ==========================================
  // 2. INTEGRATED NATIVE TYPING DOCK
  // ==========================================
  initNativeTypingDock() {
    if (!this.deckInput) return;

    let lastVal = '';

    this.deckInput.addEventListener('input', (e) => {
      const currentVal = this.deckInput.value;

      // 1. Single character insertion
      if (e.inputType === 'insertText' && e.data) {
        window.app.send({ t: 'type_text', text: e.data });
        window.app.vibrate(8);
      }
      // 2. Backspace / Delete
      else if (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward') {
        window.app.send({ t: 'key', k: 'backspace', act: 'tap' });
        window.app.vibrate(10);
      }
      // 3. Enter / Linebreak
      else if (e.inputType === 'insertLineBreak') {
        window.app.send({ t: 'key', k: 'enter', act: 'tap' });
        window.app.vibrate(12);
      }
      // 4. Voice typing / Swipe Typing
      else {
        if (currentVal.length > lastVal.length) {
          const addedText = currentVal.slice(lastVal.length);
          window.app.send({ t: 'type_text', text: addedText });
          window.app.vibrate(8);
        } else if (currentVal.length < lastVal.length) {
          const deleteCount = lastVal.length - currentVal.length;
          for (let i = 0; i < deleteCount; i++) {
            window.app.send({ t: 'key', k: 'backspace', act: 'tap' });
          }
          window.app.vibrate(10);
        }
      }

      lastVal = currentVal;
    });

    this.deckInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        window.app.send({ t: 'key', k: 'enter', act: 'tap' });
        window.app.vibrate(12);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        window.app.send({ t: 'key', k: 'tab', act: 'tap' });
      } else if (e.key === 'Escape') {
        window.app.send({ t: 'key', k: 'escape', act: 'tap' });
        this.deckInput.blur();
      }
    });

    if (this.deckSendBtn) {
      this.deckSendBtn.addEventListener('click', () => {
        window.app.send({ t: 'key', k: 'enter', act: 'tap' });
        window.app.vibrate(15);
      });
    }

    if (this.deckClearBtn) {
      this.deckClearBtn.addEventListener('click', () => {
        this.deckInput.value = '';
        lastVal = '';
        window.app.vibrate(10);
      });
    }
  }

  // ==========================================
  // 3. PC MODIFIER CHIPS
  // ==========================================
  initModifierChips() {
    const chips = document.querySelectorAll('.deck-modifier-bar .key-chip');
    chips.forEach(chip => {
      const comboStr = chip.getAttribute('data-combo');
      const singleKey = chip.getAttribute('data-key');

      const trigger = (e) => {
        e.preventDefault();
        chip.classList.add('active');
        window.app.vibrate([12, 25, 12]);

        if (comboStr) {
          const keys = comboStr.split(',').map(s => s.trim());
          window.app.send({ t: 'key_combo', keys: keys });
        } else if (singleKey) {
          window.app.send({ t: 'key', k: singleKey, act: 'tap' });
        }

        setTimeout(() => chip.classList.remove('active'), 180);
      };

      chip.addEventListener('touchstart', trigger, { passive: false });
      chip.addEventListener('click', trigger);
    });
  }

  // ==========================================
  // 4. MOUSE BUTTONS
  // ==========================================
  initMouseButtons() {
    const bindButton = (elemId, btnName) => {
      const btn = document.getElementById(elemId);
      if (!btn) return;

      const handlePress = (e) => {
        e.preventDefault();
        btn.classList.add('active');
        window.app.vibrate(15);
        window.app.send({ t: 'touch_click', btn: btnName, act: 'down' });
      };

      const handleRelease = (e) => {
        e.preventDefault();
        btn.classList.remove('active');
        window.app.send({ t: 'touch_click', btn: btnName, act: 'up' });
      };

      btn.addEventListener('touchstart', handlePress, { passive: false });
      btn.addEventListener('touchend', handleRelease, { passive: false });
      btn.addEventListener('touchcancel', handleRelease, { passive: false });
      btn.addEventListener('mousedown', handlePress);
      btn.addEventListener('mouseup', handleRelease);
    };

    bindButton('mouse-btn-left', 'left');
    bindButton('mouse-btn-middle', 'middle');
    bindButton('mouse-btn-right', 'right');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.touchpadController = new TouchpadController();
});
