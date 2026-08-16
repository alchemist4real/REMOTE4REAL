/**
 * REMOTE4REAL — Showcase Website Interactive Engine
 * Engineered by alchemist4real
 */

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initTrackpadSim();
  initMediaSim();
  initGamepadSim();
  initCopyButtons();
});

/* =========================================================
   1. TAB SWITCHER
   ========================================================= */
function initTabs() {
  const tabButtons = document.querySelectorAll('.sim-tab-btn');
  const modePanels = document.querySelectorAll('.sim-mode-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetMode = btn.getAttribute('data-tab');

      tabButtons.forEach(b => b.classList.remove('active'));
      modePanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(`sim-${targetMode}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

/* =========================================================
   2. TRACKPAD SIMULATOR
   ========================================================= */
function initTrackpadSim() {
  const pad = document.getElementById('sim-trackpad');
  const cursor = document.getElementById('sim-cursor');
  const coordDisplay = document.getElementById('sim-coord-text');
  const hudStatus = document.querySelector('.sim-hud-status');

  if (!pad || !cursor) return;

  let isDragging = false;
  let lastX = 0, lastY = 0;

  function updateCursor(clientX, clientY) {
    const rect = pad.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));

    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;

    const dx = Math.round(x - lastX);
    const dy = Math.round(y - lastY);
    lastX = x;
    lastY = y;

    if (coordDisplay) {
      coordDisplay.textContent = `X: ${Math.round(x)} | Y: ${Math.round(y)} | ΔX: ${dx} | ΔY: ${dy} (120Hz)`;
    }
  }

  pad.addEventListener('mousemove', (e) => {
    updateCursor(e.clientX, e.clientY);
  });

  pad.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      updateCursor(e.touches[0].clientX, e.touches[0].clientY);
    }
  });

  pad.addEventListener('click', (e) => {
    if (hudStatus) {
      hudStatus.textContent = "TAP CLICK SENT (MOUSE LEFT DOWN/UP)";
      setTimeout(() => {
        hudStatus.textContent = "1-FINGER MOVE • TAP CLICK • 2-FINGER SCROLL";
      }, 900);
    }
  });

  // Modifier key chips in simulator
  const chips = document.querySelectorAll('.sim-key-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const key = chip.textContent;
      if (hudStatus) {
        hudStatus.textContent = `SENT LOW-LEVEL SCANCODE: [${key}]`;
        setTimeout(() => {
          hudStatus.textContent = "1-FINGER MOVE • TAP CLICK • 2-FINGER SCROLL";
        }, 1200);
      }
    });
  });
}

/* =========================================================
   3. MEDIA REMOTE SIMULATOR
   ========================================================= */
function initMediaSim() {
  const ytSubtab = document.getElementById('sim-subtab-yt');
  const spotifySubtab = document.getElementById('sim-subtab-spotify');
  const trackTitle = document.getElementById('sim-track-title');
  const trackArtist = document.getElementById('sim-track-artist');
  const statusDisplay = document.getElementById('sim-media-status');

  const playBtn = document.getElementById('sim-btn-play');
  const prevBtn = document.getElementById('sim-btn-prev');
  const nextBtn = document.getElementById('sim-btn-next');

  let currentApp = 'YOUTUBE';
  let isPlaying = true;

  if (ytSubtab && spotifySubtab) {
    ytSubtab.addEventListener('click', () => {
      currentApp = 'YOUTUBE';
      ytSubtab.classList.add('active');
      spotifySubtab.classList.remove('active');
      if (trackTitle) trackTitle.textContent = "YOUTUBE 4K AUDIO STREAM";
      if (trackArtist) trackArtist.textContent = "ALCHEMIST4REAL — HARDWARE SCANCODE CONTROL";
      if (statusDisplay) statusDisplay.textContent = isPlaying ? "PLAYING • YOUTUBE" : "PAUSED";
    });

    spotifySubtab.addEventListener('click', () => {
      currentApp = 'SPOTIFY';
      spotifySubtab.classList.add('active');
      ytSubtab.classList.remove('active');
      if (trackTitle) trackTitle.textContent = "SPOTIFY HI-FI DESKTOP PLAYLIST";
      if (trackArtist) trackArtist.textContent = "ALCHEMIST4REAL — 320 KBPS DIRECT STREAM";
      if (statusDisplay) statusDisplay.textContent = isPlaying ? "PLAYING • SPOTIFY" : "PAUSED";
    });
  }

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      isPlaying = !isPlaying;
      playBtn.textContent = isPlaying ? "PAUSE [SPACE]" : "PLAY [SPACE]";
      if (statusDisplay) {
        statusDisplay.textContent = isPlaying ? `PLAYING • ${currentApp}` : "PAUSED";
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (statusDisplay) {
        statusDisplay.textContent = `PREVIOUS TRACK [${currentApp === 'YOUTUBE' ? 'SHIFT+P' : 'CTRL+LEFT'}]`;
        setTimeout(() => { statusDisplay.textContent = isPlaying ? `PLAYING • ${currentApp}` : "PAUSED"; }, 1000);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (statusDisplay) {
        statusDisplay.textContent = `NEXT TRACK [${currentApp === 'YOUTUBE' ? 'SHIFT+N' : 'CTRL+RIGHT'}]`;
        setTimeout(() => { statusDisplay.textContent = isPlaying ? `PLAYING • ${currentApp}` : "PAUSED"; }, 1000);
      }
    });
  }
}

/* =========================================================
   4. GAMEPAD SIMULATOR
   ========================================================= */
function initGamepadSim() {
  const joystick = document.getElementById('sim-thumbstick');
  const stickArea = document.getElementById('sim-joystick-base');
  const telemetry = document.getElementById('sim-gamepad-telemetry');

  if (!joystick || !stickArea) return;

  let active = false;
  const radius = 36;

  function moveThumb(clientX, clientY) {
    const rect = stickArea.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > radius) {
      dx = (dx / dist) * radius;
      dy = (dy / dist) * radius;
    }

    joystick.style.transform = `translate(${dx}px, ${dy}px)`;

    const normX = (dx / radius).toFixed(2);
    const normY = (dy / radius).toFixed(2);

    if (telemetry) {
      telemetry.textContent = `STICK L: [X: ${normX}, Y: ${normY}] • DEADZONE: 0% • VIRTUAL XBOX 360`;
    }
  }

  function resetThumb() {
    joystick.style.transform = `translate(0px, 0px)`;
    if (telemetry) {
      telemetry.textContent = "STICK L: [X: 0.00, Y: 0.00] • SPRING RETURN READY";
    }
  }

  stickArea.addEventListener('mousedown', (e) => {
    active = true;
    moveThumb(e.clientX, e.clientY);
  });

  window.addEventListener('mousemove', (e) => {
    if (active) {
      moveThumb(e.clientX, e.clientY);
    }
  });

  window.addEventListener('mouseup', () => {
    if (active) {
      active = false;
      resetThumb();
    }
  });

  // Touch handlers
  stickArea.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      active = true;
      moveThumb(e.touches[0].clientX, e.touches[0].clientY);
    }
  });

  window.addEventListener('touchmove', (e) => {
    if (active && e.touches.length > 0) {
      moveThumb(e.touches[0].clientX, e.touches[0].clientY);
    }
  });

  window.addEventListener('touchend', () => {
    if (active) {
      active = false;
      resetThumb();
    }
  });

  // ABXY button triggers
  const abxyButtons = document.querySelectorAll('.sim-btn-letter');
  abxyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.textContent;
      if (telemetry) {
        telemetry.textContent = `BUTTON PRESSED: [${key}] • XINPUT PACKET SENT`;
        setTimeout(() => {
          telemetry.textContent = "STICK L: [X: 0.00, Y: 0.00] • SPRING RETURN READY";
        }, 1000);
      }
    });
  });
}

/* =========================================================
   5. COPY TO CLIPBOARD BUTTONS
   ========================================================= */
function initCopyButtons() {
  const copyButtons = document.querySelectorAll('.copy-btn');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-code');
      if (code) {
        navigator.clipboard.writeText(code).then(() => {
          const original = btn.textContent;
          btn.textContent = "COPIED!";
          setTimeout(() => {
            btn.textContent = original;
          }, 1500);
        });
      }
    });
  });
}
