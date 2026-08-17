/**
 * REMOTE4REAL — Media Remote Engine
 * Engineered by alchemist4real
 */

class MediaController {
  constructor() {
    this.subtabYt = document.getElementById('tab-yt');
    this.subtabSpotify = document.getElementById('tab-spotify');
    this.panelYt = document.getElementById('media-panel-yt');
    this.panelSpotify = document.getElementById('media-panel-spotify');

    this.ytSearchInput = document.getElementById('yt-search-input');
    this.ytSearchBtn = document.getElementById('btn-yt-search');
    this.ytSearchTabBtn = document.getElementById('btn-yt-search-tab');

    this.spotifySearchInput = document.getElementById('spotify-search-input');
    this.spotifySearchBtn = document.getElementById('btn-spotify-search');

    this.initSubtabs();
    this.initYouTubeControls();
    this.initSpotifyControls();
  }

  initSubtabs() {
    const setTab = (tabName) => {
      if (window.app && window.app.vibrate) window.app.vibrate(12);

      const allTabs = document.querySelectorAll('.media-subtab');
      const allPanels = document.querySelectorAll('.media-panel');

      allTabs.forEach(t => {
        const isTarget = t.id === `tab-${tabName}` || t.getAttribute('data-subtab') === tabName;
        t.classList.toggle('active', isTarget);
      });

      allPanels.forEach(p => {
        const isTarget = p.id === `media-panel-${tabName}` || p.id === `media-panel-${tabName === 'yt' ? 'youtube' : 'spotify'}`;
        p.classList.toggle('active', isTarget);
      });
    };

    if (this.subtabYt) {
      this.subtabYt.addEventListener('click', (e) => {
        e.preventDefault();
        setTab('yt');
      });
    }

    if (this.subtabSpotify) {
      this.subtabSpotify.addEventListener('click', (e) => {
        e.preventDefault();
        setTab('spotify');
      });
    }
  }

  initYouTubeControls() {
    const bindBtn = (id, cmd, extra = {}) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.app && window.app.vibrate) window.app.vibrate(12);
          if (window.app && window.app.send) {
            window.app.send({ t: 'yt_cmd', cmd: cmd, ...extra });
          }
        });
      }
    };

    // YouTube Core Controls
    bindBtn('btn-yt-launch', 'launch');
    bindBtn('btn-yt-close-tab', 'close_tab');
    bindBtn('btn-yt-new-tab', 'new_tab');
    bindBtn('btn-yt-nav-back', 'nav_back');

    bindBtn('btn-yt-play', 'play_pause');
    bindBtn('btn-yt-prev', 'prev');
    bindBtn('btn-yt-next', 'next');
    bindBtn('btn-yt-seek-b10', 'seek_back_10');
    bindBtn('btn-yt-seek-b5', 'seek_back_5');
    bindBtn('btn-yt-seek-f5', 'seek_fwd_5');
    bindBtn('btn-yt-seek-f10', 'seek_fwd_10');
    bindBtn('btn-yt-speed-down', 'speed_down');
    bindBtn('btn-yt-speed-up', 'speed_up');
    bindBtn('btn-yt-fullscreen', 'fullscreen');
    bindBtn('btn-yt-theater', 'theater');
    bindBtn('btn-yt-miniplayer', 'miniplayer');
    bindBtn('btn-yt-cc', 'cc');
    bindBtn('btn-yt-vol-up', 'volume_up');
    bindBtn('btn-yt-vol-down', 'volume_down');
    bindBtn('btn-yt-mute', 'mute');

    // YouTube Search in Open Tab (via '/' hotkey)
    const execTabSearch = () => {
      if (!this.ytSearchInput) return;
      const query = this.ytSearchInput.value.trim();
      if (query) {
        if (window.app && window.app.vibrate) window.app.vibrate([15, 30, 15]);
        if (window.app && window.app.send) {
          window.app.send({ t: 'yt_cmd', cmd: 'search_in_tab', q: query });
        }
      }
    };

    // YouTube Open Search in Browser
    const execLaunchSearch = () => {
      if (!this.ytSearchInput) return;
      const query = this.ytSearchInput.value.trim();
      if (window.app && window.app.vibrate) window.app.vibrate([20, 40, 20]);
      if (window.app && window.app.send) {
        window.app.send({ t: 'yt_cmd', cmd: 'search', q: query });
      }
    };

    if (this.ytSearchBtn) {
      this.ytSearchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        execLaunchSearch();
      });
    }

    if (this.ytSearchTabBtn) {
      this.ytSearchTabBtn.addEventListener('click', (e) => {
        e.preventDefault();
        execTabSearch();
      });
    }

    if (this.ytSearchInput) {
      this.ytSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          execTabSearch();
        }
      });
    }
  }

  initSpotifyControls() {
    const bindBtn = (id, cmd) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.app && window.app.vibrate) window.app.vibrate(12);
          if (window.app && window.app.send) {
            window.app.send({ t: 'spotify_cmd', cmd: cmd });
          }
        });
      }
    };

    // Spotify Core Controls
    bindBtn('btn-spotify-launch', 'open');
    bindBtn('btn-spotify-close-app', 'close_app');
    bindBtn('btn-spotify-home', 'go_home');
    bindBtn('btn-spotify-library', 'go_library');

    bindBtn('btn-spotify-play', 'play_pause');
    bindBtn('btn-spotify-prev', 'prev');
    bindBtn('btn-spotify-next', 'next');
    bindBtn('btn-spotify-seek-back', 'seek_back');
    bindBtn('btn-spotify-seek-fwd', 'seek_fwd');
    bindBtn('btn-spotify-shuffle', 'shuffle');
    bindBtn('btn-spotify-repeat', 'repeat');
    bindBtn('btn-spotify-like', 'like');
    bindBtn('btn-spotify-vol-up', 'volume_up');
    bindBtn('btn-spotify-vol-down', 'volume_down');
    bindBtn('btn-spotify-mute', 'mute');

    // Spotify Search inside App
    const execSpotifySearch = () => {
      if (!this.spotifySearchInput) return;
      const query = this.spotifySearchInput.value.trim();
      if (query) {
        if (window.app && window.app.vibrate) window.app.vibrate([15, 30, 15]);
        if (window.app && window.app.send) {
          window.app.send({ t: 'spotify_cmd', cmd: 'search_in_app', q: query });
        }
      }
    };

    if (this.spotifySearchBtn) {
      this.spotifySearchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        execSpotifySearch();
      });
    }

    if (this.spotifySearchInput) {
      this.spotifySearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          execSpotifySearch();
        }
      });
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.mediaController = new MediaController();
});
