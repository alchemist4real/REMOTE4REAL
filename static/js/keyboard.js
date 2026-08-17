/**
 * REMOTE4REAL — Native Keyboard Bridge
 * Engineered by alchemist4real
 * Streams keystrokes, autocorrect, voice typing, swipe input, and continuous backspaces from mobile keyboards directly to PC.
 */

class KeyboardController {
  constructor() {
    this.modifiers = {
      ctrl: false,
      alt: false,
      shift: false,
      win: false
    };

    this.SENTINEL = '\u200B'; // Zero-width space buffer to capture mobile backspaces on empty input
    this.repeatTimer = null;
    this.repeatInterval = null;

    this.initNativeTyping();
    this.initShortcuts();
    this.initSpecialKeys();
    this.initHoldRepeatKeys();
  }

  // ==========================================
  // REAL-TIME NATIVE PHONE KEYBOARD STREAMER
  // ==========================================
  initNativeTyping() {
    const inputs = [
      { inputId: 'deck-native-input', sendId: 'btn-deck-send', clearId: 'btn-deck-clear', bkspId: 'btn-deck-bksp' },
      { inputId: 'keyboard-native-input', sendId: 'btn-keyboard-send', clearId: 'btn-keyboard-clear', bkspId: 'btn-keyboard-bksp' },
      { inputId: 'keypad-native-input', sendId: 'btn-keypad-send', clearId: 'btn-keypad-clear', bkspId: 'btn-keypad-bksp' },
      { inputId: 'screen-native-input', sendId: 'btn-screen-send', clearId: null, bkspId: 'btn-screen-bksp' },
      { inputId: 'native-keyboard-bridge', sendId: null, clearId: null, bkspId: null },
      { inputId: 'native-live-input', sendId: null, clearId: null, bkspId: null }
    ];

    inputs.forEach(({ inputId, sendId, clearId, bkspId }) => {
      const inputEl = document.getElementById(inputId);
      if (!inputEl) return;

      // Initialize with sentinel when focused or empty
      const ensureSentinel = () => {
        if (!inputEl.value || inputEl.value === '') {
          inputEl.value = this.SENTINEL;
        }
      };

      inputEl.addEventListener('focus', () => {
        ensureSentinel();
      });

      // 1. BEFOREINPUT EVENT (Standard across modern Android & iOS)
      inputEl.addEventListener('beforeinput', (e) => {
        const inputType = e.inputType;

        if (inputType === 'deleteContentBackward') {
          if (window.app && window.app.send) {
            window.app.send({ t: 'key', k: 'backspace', act: 'tap' });
          }
          if (window.app && window.app.vibrate) window.app.vibrate(8);
        } else if (inputType === 'deleteContentForward') {
          if (window.app && window.app.send) {
            window.app.send({ t: 'key', k: 'delete', act: 'tap' });
          }
          if (window.app && window.app.vibrate) window.app.vibrate(8);
        } else if (inputType === 'deleteWordBackward') {
          if (window.app && window.app.send) {
            window.app.send({ t: 'key_combo', keys: ['ctrl', 'backspace'] });
          }
          if (window.app && window.app.vibrate) window.app.vibrate(12);
        } else if (inputType === 'deleteWordForward') {
          if (window.app && window.app.send) {
            window.app.send({ t: 'key_combo', keys: ['ctrl', 'delete'] });
          }
          if (window.app && window.app.vibrate) window.app.vibrate(12);
        } else if (inputType === 'deleteHardLineBackward' || inputType === 'deleteSoftLineBackward') {
          if (window.app && window.app.send) {
            window.app.send({ t: 'key_combo', keys: ['shift', 'home'] });
            window.app.send({ t: 'key', k: 'backspace', act: 'tap' });
          }
          if (window.app && window.app.vibrate) window.app.vibrate(14);
        }
      });

      // 2. INPUT EVENT (Fallback & character streaming)
      let lastVal = inputEl.value || this.SENTINEL;

      inputEl.addEventListener('input', (e) => {
        const currentVal = inputEl.value;

        // Clean values by stripping sentinel for length comparisons
        const cleanCurrent = currentVal.replace(/\u200B/g, '');
        const cleanLast = lastVal.replace(/\u200B/g, '');

        // A. Single character insertion
        if (e.inputType === 'insertText' && e.data) {
          if (window.app && window.app.send) {
            window.app.send({ t: 'type_text', text: e.data });
          }
          if (window.app && window.app.vibrate) window.app.vibrate(8);
        }
        // B. Backspace when input is at or below sentinel
        else if (currentVal === '' || (cleanCurrent.length < cleanLast.length && !e.inputType?.startsWith('insert'))) {
          // If beforeinput did not already fire or for mobile webview fallback
          if (!e.inputType || e.inputType === 'deleteContentBackward') {
            // Already handled in beforeinput if supported, but if value dropped to 0, ensure we restore sentinel
          }
          const deleteCount = Math.max(1, cleanLast.length - cleanCurrent.length);
          if (deleteCount > 1) {
            for (let i = 1; i < deleteCount; i++) {
              if (window.app && window.app.send) {
                window.app.send({ t: 'key', k: 'backspace', act: 'tap' });
              }
            }
          }
          if (window.app && window.app.vibrate) window.app.vibrate(8);
        }
        // C. Enter / Linebreak
        else if (e.inputType === 'insertLineBreak') {
          if (window.app && window.app.send) {
            window.app.send({ t: 'key', k: 'enter', act: 'tap' });
          }
          if (window.app && window.app.vibrate) window.app.vibrate(12);
        }
        // D. Voice typing / Paste / Autocomplete
        else if (cleanCurrent.length > cleanLast.length) {
          const addedText = cleanCurrent.slice(cleanLast.length);
          if (window.app && window.app.send) {
            window.app.send({ t: 'type_text', text: addedText });
          }
          if (window.app && window.app.vibrate) window.app.vibrate(8);
        }

        // Always keep sentinel active so mobile keyboard doesn't disable backspace
        if (currentVal === '') {
          inputEl.value = this.SENTINEL;
          lastVal = this.SENTINEL;
        } else {
          lastVal = currentVal;
        }
      });

      // 3. KEYDOWN EVENT (Hardware keyboard / Desktop testing)
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') {
          const clean = inputEl.value.replace(/\u200B/g, '');
          if (clean.length === 0) {
            e.preventDefault();
            if (window.app && window.app.send) {
              window.app.send({ t: 'key', k: 'backspace', act: 'tap' });
            }
            if (window.app && window.app.vibrate) window.app.vibrate(8);
            inputEl.value = this.SENTINEL;
            lastVal = this.SENTINEL;
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const val = inputEl.value.replace(/\u200B/g, '');
          if (window.app && window.app.send) {
            window.app.send({ t: 'key', k: 'enter', act: 'tap' });
          }
          inputEl.value = this.SENTINEL;
          lastVal = this.SENTINEL;
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

      // 4. DEDICATED BACKSPACE BUTTON (Tap & Hold-to-repeat)
      if (bkspId) {
        const bkspBtn = document.getElementById(bkspId);
        if (bkspBtn) {
          const doBksp = () => {
            if (window.app && window.app.send) {
              window.app.send({ t: 'key', k: 'backspace', act: 'tap' });
            }
            if (window.app && window.app.vibrate) window.app.vibrate(8);
            // Also trim local input if it has content
            const clean = inputEl.value.replace(/\u200B/g, '');
            if (clean.length > 0) {
              inputEl.value = this.SENTINEL + clean.slice(0, -1);
              lastVal = inputEl.value;
            }
          };

          const startRepeat = (e) => {
            e.preventDefault();
            bkspBtn.classList.add('active');
            doBksp();

            this.repeatTimer = setTimeout(() => {
              this.repeatInterval = setInterval(() => {
                doBksp();
              }, 60);
            }, 300);
          };

          const stopRepeat = () => {
            bkspBtn.classList.remove('active');
            clearTimeout(this.repeatTimer);
            clearInterval(this.repeatInterval);
            this.repeatTimer = null;
            this.repeatInterval = null;
          };

          bkspBtn.addEventListener('touchstart', startRepeat, { passive: false });
          bkspBtn.addEventListener('touchend', stopRepeat);
          bkspBtn.addEventListener('touchcancel', stopRepeat);
          bkspBtn.addEventListener('mousedown', startRepeat);
          bkspBtn.addEventListener('mouseup', stopRepeat);
          bkspBtn.addEventListener('mouseleave', stopRepeat);
        }
      }

      // 5. SEND BUTTON (Dispatches Enter to submit active field & clears dock)
      if (sendId) {
        const sendBtn = document.getElementById(sendId);
        if (sendBtn) {
          const handleSend = (e) => {
            e.preventDefault();
            // Keystrokes are already streamed in real-time. Only send Enter to submit.
            if (window.app && window.app.send) {
              window.app.send({ t: 'key', k: 'enter', act: 'tap' });
            }
            inputEl.value = this.SENTINEL;
            lastVal = this.SENTINEL;
            if (window.app && window.app.vibrate) window.app.vibrate([12, 25, 12]);
          };
          sendBtn.addEventListener('click', handleSend);
        }
      }

      // 6. CLEAR BUTTON (Single click clears field, Double-click clears active PC text)
      if (clearId) {
        const clearBtn = document.getElementById(clearId);
        if (clearBtn) {
          let lastClearTap = 0;
          const handleClear = (e) => {
            e.preventDefault();
            const now = Date.now();
            const isDouble = (now - lastClearTap) < 350;
            lastClearTap = now;

            if (isDouble) {
              // Double tap: Erase line/selection on PC (Ctrl+A -> Backspace)
              if (window.app && window.app.send) {
                window.app.send({ t: 'key_combo', keys: ['ctrl', 'a'] });
                setTimeout(() => {
                  window.app.send({ t: 'key', k: 'backspace', act: 'tap' });
                }, 40);
              }
              if (window.app && window.app.vibrate) window.app.vibrate([15, 30, 15]);
            } else {
              // Single tap: Clear local dock input
              if (window.app && window.app.vibrate) window.app.vibrate(10);
            }

            inputEl.value = this.SENTINEL;
            lastVal = this.SENTINEL;
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

  initHoldRepeatKeys() {
    const repeatChips = document.querySelectorAll('.key-chip[data-key="backspace"], .key-chip[data-key="delete"]');
    repeatChips.forEach(chip => {
      const keyName = chip.getAttribute('data-key');
      if (!keyName) return;

      const doKey = () => {
        if (window.app && window.app.send) {
          window.app.send({ t: 'key', k: keyName, act: 'tap' });
        }
        if (window.app && window.app.vibrate) window.app.vibrate(6);
      };

      let timer = null;
      let interval = null;

      const startRepeat = (e) => {
        e.preventDefault();
        chip.classList.add('active');
        doKey();

        timer = setTimeout(() => {
          interval = setInterval(() => {
            doKey();
          }, 60);
        }, 280);
      };

      const stopRepeat = () => {
        chip.classList.remove('active');
        clearTimeout(timer);
        clearInterval(interval);
        timer = null;
        interval = null;
      };

      chip.addEventListener('touchstart', startRepeat, { passive: false });
      chip.addEventListener('touchend', stopRepeat);
      chip.addEventListener('touchcancel', stopRepeat);
      chip.addEventListener('mousedown', startRepeat);
      chip.addEventListener('mouseup', stopRepeat);
      chip.addEventListener('mouseleave', stopRepeat);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.keyboardController = new KeyboardController();
});
