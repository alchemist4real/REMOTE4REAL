/**
 * REMOTE4REAL — Native Keyboard Bridge
 * Streams keystrokes, autocorrect, voice typing, and swipe input from Gboard/iOS keyboard directly to PC.
 */

class KeyboardController {
  constructor() {
    this.bridgeInput = document.getElementById('native-keyboard-bridge');
    this.liveTextarea = document.getElementById('native-live-input');
    this.focusBtn = document.getElementById('btn-focus-keyboard');
    this.clearBtn = document.getElementById('btn-clear-input');

    this.modifiers = {
      ctrl: false,
      alt: false,
      shift: false,
      win: false
    };

    this.initNativeTyping();
    this.initShortcuts();
    this.initSpecialKeys();
  }

  // ==========================================
  // REAL-TIME NATIVE PHONE KEYBOARD STREAMER
  // ==========================================
  initNativeTyping() {
    const bindTypingInput = (inputEl) => {
      if (!inputEl) return;

      let lastVal = '';

      inputEl.addEventListener('input', (e) => {
        const currentVal = inputEl.value;

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
        // 4. Voice typing / Swipe Typing / Autocomplete replacement
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

      // Special keydowns (Enter, Tab, Escape)
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          window.app.send({ t: 'key', k: 'enter', act: 'tap' });
        } else if (e.key === 'Tab') {
          e.preventDefault();
          window.app.send({ t: 'key', k: 'tab', act: 'tap' });
        } else if (e.key === 'Escape') {
          window.app.send({ t: 'key', k: 'escape', act: 'tap' });
        }
      });
    };

    bindTypingInput(this.bridgeInput);
    bindTypingInput(this.liveTextarea);

    if (this.focusBtn && this.liveTextarea) {
      this.focusBtn.addEventListener('click', () => {
        this.liveTextarea.focus();
        window.app.vibrate(12);
      });
    }

    if (this.clearBtn && this.liveTextarea) {
      this.clearBtn.addEventListener('click', () => {
        this.liveTextarea.value = '';
        window.app.vibrate(10);
      });
    }

    // Floating Touchpad Keyboard trigger
    const tpKeyBtn = document.getElementById('btn-touchpad-keyboard');
    if (tpKeyBtn) {
      tpKeyBtn.addEventListener('click', () => {
        this.openNativeKeyboard();
      });
    }
  }

  openNativeKeyboard() {
    window.app.vibrate(15);
    if (this.bridgeInput) {
      this.bridgeInput.value = '';
      this.bridgeInput.focus();
    } else if (this.liveTextarea) {
      this.liveTextarea.focus();
    }
  }

  // ==========================================
  // PC SHORTCUTS & SPECIAL KEYS
  // ==========================================
  initShortcuts() {
    const chips = document.querySelectorAll('.key-chip');
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

  initSpecialKeys() {
    const keys = document.querySelectorAll('.media-btn, .fn-key, .key-arrow-btn');
    keys.forEach(btn => {
      const keyName = btn.getAttribute('data-key');
      if (!keyName) return;

      const handlePress = (e) => {
        e.preventDefault();
        btn.classList.add('active');
        window.app.vibrate(10);

        window.app.send({
          t: 'key',
          k: keyName,
          act: 'tap'
        });

        setTimeout(() => btn.classList.remove('active'), 140);
      };

      btn.addEventListener('touchstart', handlePress, { passive: false });
      btn.addEventListener('click', handlePress);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.keyboardController = new KeyboardController();
});
