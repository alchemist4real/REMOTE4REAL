/**
 * REMOTE4REAL — Media Remote Engine
 */

class MediaController {
  constructor() {
    this.subtabYt = document.getElementById('subtab-yt');
    this.subtabSpotify = document.getElementById('subtab-spotify');
    this.panelYt = document.getElementById('media-panel-youtube');
    this.panelSpotify = document.getElementById('media-panel-spotify');

    this.ytSearchInput = document.getElementById('yt-search-input');
    this.ytSearchBtn = document.getElementById('btn-yt-search');

    this.initSubtabs();
    this.initYouTubeControls();
    this.initSpotifyControls();
  }

  initSubtabs() {
    if (this.subtabYt && this.subtabSpotify) {
      this.subtabYt.addEventListener('click', () => {
        this.subtabYt.classList.add('active');
        this.subtabSpotify.classList.remove('active');
        if (this.panelYt) this.panelYt.classList.add('active');
        if (this.panelSpotify) this.panelSpotify.classList.remove('active');
        window.app.vibrate(12);
      });

      this.subtabSpotify.addEventListener('click', () => {
        this.subtabSpotify.classList.add('active');
        this.subtabYt.classList.remove('active');
        if (this.panelSpotify) this.panelSpotify.classList.add('active');
        if (this.panelYt) this.panelYt.classList.remove('active');
        window.app.vibrate(12);
      });
    }
  }

  initYouTubeControls() {
    const ytButtons = document.querySelectorAll('[data-yt]');
    ytButtons.forEach(btn => {
      const cmd = btn.getAttribute('data-yt');
      btn.addEventListener('click', () => {
        window.app.vibrate([15, 30, 15]);
        if (cmd === 'launch') {
          window.app.send({ t: 'yt_cmd', cmd: 'launch', q: '' });
        } else {
          window.app.send({ t: 'yt_cmd', cmd: cmd });
        }
      });
    });

    if (this.ytSearchBtn && this.ytSearchInput) {
      const executeSearch = () => {
        const query = this.ytSearchInput.value.trim();
        if (query) {
          window.app.vibrate([20, 40, 20]);
          window.app.send({ t: 'yt_cmd', cmd: 'search', q: query });
        }
      };

      this.ytSearchBtn.addEventListener('click', executeSearch);
      this.ytSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') executeSearch();
      });
    }
  }

  initSpotifyControls() {
    const spotifyButtons = document.querySelectorAll('[data-spotify]');
    spotifyButtons.forEach(btn => {
      const cmd = btn.getAttribute('data-spotify');
      btn.addEventListener('click', () => {
        window.app.vibrate([15, 30, 15]);
        if (cmd === 'launch' || cmd === 'open') {
          window.app.send({ t: 'spotify_cmd', cmd: 'open' });
        } else {
          window.app.send({ t: 'spotify_cmd', cmd: cmd });
        }
      });
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.mediaController = new MediaController();
});
