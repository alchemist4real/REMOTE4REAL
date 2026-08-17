/**
 * REMOTE4REAL — Native Keyboard Bridge
 * Engineered by alchemist4real
 * Streams keystrokes, autocorrect, voice typing, and swipe input from mobile keyboards directly to PC.
 */

class KeyboardController {
  constructor() {
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
    const inputs = [
      { inputId: 'deck-native-input', sendId: 'btn-deck-send', clearId: 'btn-deck-clear' },
      { inputId: 'keyboard-native-input', sendId: 'btn-keyboard-send', clearId: 'btn-keyboard-clear' },
      { inputId: 'keypad-native-input', sendId: 'btn-keypad-send', clearId: 'btn-keypad-clear' },
      { inputId: 'native-keyboard-bridge', sendId: null, clearId: null },
      { inputId: 'native-live-input', sendId: null, clearId: null }
    ];

    inputs.forEach(({ inputId, sendId, clearId }) => {
      const inputEl = document.getElementById(inputId);
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

      // Special keydowns
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = inputEl.value;
          if (val) {
            if (window.app && window.app.send) {
              window.app.send({ t: 'key', k: 'enter', act: 'tap' });
            }
            inputEl.value = '';
            lastVal = '';
          } else {
            if (window.app && window.app.send) {
              window.app.send({ t: 'key', k: 'enter', act: 'tap' });
            }
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
          inputEl.blur();
          if (window.app && window.app.vibrate) window.app.vibrate(10);
        }
      });

      // Send button
      if (sendId) {
        const sendBtn = document.getElementById(sendId);
        if (sendBtn) {
          const handleSend = (e) => {
            e.preventDefault();
            const val = inputEl.value;
            if (val) {
              if (window.app && window.app.send) {
                window.app.send({ t: 'type_text', text: val });
                window.app.send({ t: 'key', k: 'enter', act: 'tap' });
              }
              inputEl.value = '';
              lastVal = '';
            } else {
              if (window.app && window.app.send) {
                window.app.send({ t: 'key', k: 'enter', act: 'tap' });
              }
            }
            if (window.app && window.app.vibrate) window.app.vibrate([12, 25, 12]);
          };
          sendBtn.addEventListener('click', handleSend);
        }
      }

      // Clear button
      if (clearId) {
        const clearBtn = document.getElementById(clearId);
        if (clearBtn) {
          const handleClear = (e) => {
            e.preventDefault();
            inputEl.value = '';
            lastVal = '';
            if (window.app && window.app.vibrate) window.app.vibrate(10);
          };
          clearBtn.addEventListener('click', handleClear);
        }
      }
    });
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

      btn.addEventListener('click', handlePress);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.keyboardController = new KeyboardController();
});
