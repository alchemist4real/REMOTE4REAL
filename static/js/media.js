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
      this.subtabYt.addEventListener('click', (e) => { e.preventDefault(); setTab('yt'); });
      this.subtabYt.addEventListener('touchstart', (e) => { e.preventDefault(); setTab('yt'); }, { passive: false });
    }

    if (this.subtabSpotify) {
      this.subtabSpotify.addEventListener('click', (e) => { e.preventDefault(); setTab('spotify'); });
      this.subtabSpotify.addEventListener('touchstart', (e) => { e.preventDefault(); setTab('spotify'); }, { passive: false });
    }

    document.querySelectorAll('.media-subtab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const target = tab.getAttribute('data-subtab') || (tab.id.includes('spotify') ? 'spotify' : 'yt');
        setTab(target);
      });
    });
  }

  initYouTubeControls() {
    const bindBtn = (id, cmd, extra = {}) => {
      const btn = document.getElementById(id);
      if (btn) {
        const handler = (e) => {
          e.preventDefault();
          if (window.app && window.app.vibrate) window.app.vibrate(15);
          if (window.app && window.app.send) {
            window.app.send({ t: 'yt_cmd', cmd: cmd, ...extra });
          }
        };
        btn.addEventListener('click', handler);
        btn.addEventListener('touchstart', handler, { passive: false });
      }
    };

    bindBtn('btn-yt-launch', 'launch');
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

    document.querySelectorAll('[data-yt]').forEach(btn => {
      const cmd = btn.getAttribute('data-yt');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.app && window.app.send) window.app.send({ t: 'yt_cmd', cmd: cmd });
      });
    });

    if (this.ytSearchBtn && this.ytSearchInput) {
      const executeSearch = () => {
        const query = this.ytSearchInput.value.trim();
        if (query) {
          if (window.app && window.app.vibrate) window.app.vibrate([20, 40, 20]);
          if (window.app && window.app.send) {
            window.app.send({ t: 'yt_cmd', cmd: 'search', q: query });
          }
        }
      };

      this.ytSearchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        executeSearch();
      });
      this.ytSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          executeSearch();
        }
      });
    }
  }

  initSpotifyControls() {
    const bindBtn = (id, cmd) => {
      const btn = document.getElementById(id);
      if (btn) {
        const handler = (e) => {
          e.preventDefault();
          if (window.app && window.app.vibrate) window.app.vibrate(15);
          if (window.app && window.app.send) {
            window.app.send({ t: 'spotify_cmd', cmd: cmd });
          }
        };
        btn.addEventListener('click', handler);
        btn.addEventListener('touchstart', handler, { passive: false });
      }
    };

    bindBtn('btn-spotify-launch', 'open');
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

    document.querySelectorAll('[data-spotify]').forEach(btn => {
      const cmd = btn.getAttribute('data-spotify');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.app && window.app.send) window.app.send({ t: 'spotify_cmd', cmd: cmd });
      });
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.mediaController = new MediaController();
});
