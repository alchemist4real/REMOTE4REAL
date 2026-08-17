/**
 * REMOTE4REAL — Virtual On-Screen Keyboard Engine
 * Engineered by alchemist4real
 * Provides full QWERTY virtual typing, sticky modifiers (Ctrl/Alt/Shift/Win), function keys, and navigation.
 */

class VirtualKeyboardController {
  constructor() {
    this.modifiers = {
      ctrl: false,
      alt: false,
      shift: false,
      win: false
    };

    this.capsLock = false;
    this.repeatTimer = null;
    this.repeatInterval = null;

    this.initVirtualKeys();
    this.initModifierToggles();
    this.initLongPressRepeat();
  }

  initVirtualKeys() {
    const vkeys = document.querySelectorAll('.vkey[data-vkey]');
    vkeys.forEach(btn => {
      const keyName = btn.getAttribute('data-vkey');
      if (!keyName) return;

      const triggerKey = (e) => {
        e.preventDefault();
        btn.classList.add('active');
        if (window.app && window.app.vibrate) window.app.vibrate(8);

        this.sendKey(keyName);

        setTimeout(() => btn.classList.remove('active'), 120);
      };

      btn.addEventListener('click', triggerKey);
    });

    const vcombos = document.querySelectorAll('.vkey[data-vcombo]');
    vcombos.forEach(btn => {
      const combo = btn.getAttribute('data-vcombo');
      if (!combo) return;

      const triggerCombo = (e) => {
        e.preventDefault();
        btn.classList.add('active');
        if (window.app && window.app.vibrate) window.app.vibrate([10, 20, 10]);

        const keys = combo.split(',').map(s => s.trim());
        if (window.app && window.app.send) {
          window.app.send({ t: 'key_combo', keys: keys });
        }

        setTimeout(() => btn.classList.remove('active'), 140);
      };

      btn.addEventListener('click', triggerCombo);
    });
  }

  sendKey(keyName) {
    if (!window.app || !window.app.send) return;

    // Check if any modifier is currently active
    const activeMods = Object.keys(this.modifiers).filter(m => this.modifiers[m]);

    if (activeMods.length > 0) {
      const combo = [...activeMods, keyName];
      window.app.send({ t: 'key_combo', keys: combo });

      // Auto-release Shift after single keypress unless caps lock
      if (this.modifiers.shift && !this.capsLock) {
        this.toggleModifier('shift', false);
      }
    } else {
      // Normal single key tap
      let charToSend = keyName;
      if (this.capsLock && keyName.length === 1) {
        charToSend = keyName.toUpperCase();
      }
      window.app.send({ t: 'key', k: charToSend, act: 'tap' });
    }
  }

  initModifierToggles() {
    const modBtns = document.querySelectorAll('.vkey-mod[data-vmod]');
    modBtns.forEach(btn => {
      const modName = btn.getAttribute('data-vmod');
      if (!modName) return;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const newState = !this.modifiers[modName];
        this.toggleModifier(modName, newState);
        if (window.app && window.app.vibrate) window.app.vibrate(12);
      });
    });

    const capsBtn = document.getElementById('vkey-caps');
    if (capsBtn) {
      capsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.capsLock = !this.capsLock;
        capsBtn.classList.toggle('active', this.capsLock);
        this.updateKeyLabels();
        if (window.app && window.app.vibrate) window.app.vibrate(15);
      });
    }
  }

  toggleModifier(modName, state) {
    if (this.modifiers.hasOwnProperty(modName)) {
      this.modifiers[modName] = state;
      const btns = document.querySelectorAll(`.vkey-mod[data-vmod="${modName}"]`);
      btns.forEach(b => b.classList.toggle('active', state));
      this.updateKeyLabels();
    }
  }

  updateKeyLabels() {
    const isUpper = this.capsLock || this.modifiers.shift;
    const letterKeys = document.querySelectorAll('.vkey-letter');
    letterKeys.forEach(k => {
      const baseKey = k.getAttribute('data-vkey');
      if (baseKey && baseKey.length === 1) {
        k.textContent = isUpper ? baseKey.toUpperCase() : baseKey.toLowerCase();
      }
    });
  }

  initLongPressRepeat() {
    // Backspace & Arrow keys auto-repeat on hold
    const repeatKeys = document.querySelectorAll('.vkey-repeat');
    repeatKeys.forEach(btn => {
      const keyName = btn.getAttribute('data-vkey');
      if (!keyName) return;

      const startRepeat = (e) => {
        e.preventDefault();
        this.sendKey(keyName);
        if (window.app && window.app.vibrate) window.app.vibrate(6);

        this.repeatTimer = setTimeout(() => {
          this.repeatInterval = setInterval(() => {
            this.sendKey(keyName);
            if (window.app && window.app.vibrate) window.app.vibrate(4);
          }, 60);
        }, 320);
      };

      const stopRepeat = () => {
        clearTimeout(this.repeatTimer);
        clearInterval(this.repeatInterval);
        this.repeatTimer = null;
        this.repeatInterval = null;
      };

      btn.addEventListener('touchstart', startRepeat, { passive: false });
      btn.addEventListener('touchend', stopRepeat);
      btn.addEventListener('touchcancel', stopRepeat);
      btn.addEventListener('mousedown', startRepeat);
      btn.addEventListener('mouseup', stopRepeat);
      btn.addEventListener('mouseleave', stopRepeat);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.virtualKeyboardController = new VirtualKeyboardController();
});
