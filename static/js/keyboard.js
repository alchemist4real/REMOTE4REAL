/**
 * REMOTE4REAL — Native Keyboard Bridge
 * Engineered by alchemist4real
 * Streams keystrokes, autocorrect, voice typing, and swipe input from mobile keyboards directly to PC.
 */

class KeyboardController {
  constructor() {
    this.deckInput = document.getElementById('deck-native-input');
    this.btnSend = document.getElementById('btn-deck-send');
    this.btnClear = document.getElementById('btn-deck-clear');

    this.bridgeInput = document.getElementById('native-keyboard-bridge');
    this.liveTextarea = document.getElementById('native-live-input');

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

      let lastVal = inputEl.value || '';

      inputEl.addEventListener('input', (e) => {
        const currentVal = inputEl.value;

        // 1. Single character insertion
        if (e.inputType === 'insertText' && e.data) {
          if (window.app && window.app.send) {
            window.app.send({ t: 'type_text', text: e.data });
          }
          if (window.app && window.app.vibrate) window.app.vibrate(8);
        }
        // 2. Backspace / Delete
        else if (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward') {
          if (window.app && window.app.send) {
            window.app.send({ t: 'key', k: 'backspace', act: 'tap' });
          }
          if (window.app && window.app.vibrate) window.app.vibrate(10);
        }
        // 3. Enter / Linebreak
        else if (e.inputType === 'insertLineBreak') {
          if (window.app && window.app.send) {
            window.app.send({ t: 'key', k: 'enter', act: 'tap' });
          }
          if (window.app && window.app.vibrate) window.app.vibrate(12);
        }
        // 4. Voice typing / Swipe Typing / Autocomplete replacement / Paste
        else {
          if (currentVal.length > lastVal.length) {
            const addedText = currentVal.slice(lastVal.length);
            if (window.app && window.app.send) {
              window.app.send({ t: 'type_text', text: addedText });
            }
            if (window.app && window.app.vibrate) window.app.vibrate(8);
          } else if (currentVal.length < lastVal.length) {
            const deleteCount = lastVal.length - currentVal.length;
            for (let i = 0; i < deleteCount; i++) {
              if (window.app && window.app.send) {
                window.app.send({ t: 'key', k: 'backspace', act: 'tap' });
              }
            }
            if (window.app && window.app.vibrate) window.app.vibrate(10);
          }
        }

        lastVal = currentVal;
      });

      // Special keydowns (Enter, Tab, Escape, Backspace)
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (window.app && window.app.send) {
            window.app.send({ t: 'key', k: 'enter', act: 'tap' });
          }
          if (window.app && window.app.vibrate) window.app.vibrate(12);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          if (window.app && window.app.send) {
            window.app.send({ t: 'key', k: 'tab', act: 'tap' });
          }
          if (window.app && window.app.vibrate) window.app.vibrate(10);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          if (window.app && window.app.send) {
            window.app.send({ t: 'key', k: 'escape', act: 'tap' });
          }
          if (window.app && window.app.vibrate) window.app.vibrate(10);
        }
      });
    };

    bindTypingInput(this.deckInput);
    bindTypingInput(this.bridgeInput);
    bindTypingInput(this.liveTextarea);

    if (this.btnSend && this.deckInput) {
      const handleSend = (e) => {
        e.preventDefault();
        const val = this.deckInput.value;
        if (val) {
          if (window.app && window.app.send) {
            window.app.send({ t: 'type_text', text: val });
            window.app.send({ t: 'key', k: 'enter', act: 'tap' });
          }
          this.deckInput.value = '';
        } else {
          if (window.app && window.app.send) {
            window.app.send({ t: 'key', k: 'enter', act: 'tap' });
          }
        }
        if (window.app && window.app.vibrate) window.app.vibrate([12, 25, 12]);
      };
      this.btnSend.addEventListener('click', handleSend);
      this.btnSend.addEventListener('touchstart', handleSend, { passive: false });
    }

    if (this.btnClear && this.deckInput) {
      const handleClear = (e) => {
        e.preventDefault();
        this.deckInput.value = '';
        if (window.app && window.app.vibrate) window.app.vibrate(10);
      };
      this.btnClear.addEventListener('click', handleClear);
      this.btnClear.addEventListener('touchstart', handleClear, { passive: false });
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
        if (window.app && window.app.vibrate) window.app.vibrate([12, 25, 12]);

        if (window.app && window.app.send) {
          if (comboStr) {
            const keys = comboStr.split(',').map(s => s.trim());
            window.app.send({ t: 'key_combo', keys: keys });
          } else if (singleKey) {
            window.app.send({ t: 'key', k: singleKey, act: 'tap' });
          }
        }

        setTimeout(() => chip.classList.remove('active'), 180);
      };

      chip.addEventListener('touchstart', trigger, { passive: false });
      chip.addEventListener('click', trigger);
    });
  }

  initSpecialKeys() {
    const keys = document.querySelectorAll('.media-btn, .fn-key, .key-arrow-btn, .mouse-btn');
    keys.forEach(btn => {
      const keyName = btn.getAttribute('data-key');
      if (!keyName) return;

      const handlePress = (e) => {
        e.preventDefault();
        btn.classList.add('active');
        if (window.app && window.app.vibrate) window.app.vibrate(10);

        if (window.app && window.app.send) {
          window.app.send({
            t: 'key',
            k: keyName,
            act: 'tap'
          });
        }

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
