(() => {
  'use strict';

  if (window.__persistentAudioWidget) {
    return;
  }

  const ORIGIN = window.location.origin;
  const MESSAGE = {
    LOAD: 'LOAD_AND_PLAY',
    NEXT: 'NEXT',
    PAUSE: 'PAUSE',
    PLAYER_STATE: 'PLAYER_STATE',
    PREVIOUS: 'PREVIOUS',
    PLAYLIST: 'SET_PLAYLIST',
    READY: 'PORTAL_READY',
    RESUME: 'RESUME',
    SEEK: 'SEEK',
  };
  const STATUS = {
    ERROR: 'error',
    IDLE: 'idle',
    LOADING: 'loading',
    NEEDS_ACTIVATION: 'needs-activation',
    PAUSED: 'paused',
    PLAYING: 'playing',
    STOPPED: 'stopped',
  };

  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });
  const state = {
    track: null,
    status: STATUS.IDLE,
    error: '',
  };
  let playRequest = 0;

  host.id = 'persistent-audio-widget';
  host.dataset.open = 'false';
  document.body.append(host);

  shadow.innerHTML = `
    <link rel="stylesheet" href="/widget.css" />
    <section class="widget" hidden aria-label="Persistent audio player">
      <header class="widget-header">
        <div class="header-title">
          <span class="drag-grip" aria-hidden="true">
            <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
              <circle cx="2" cy="2" r="1.5"/>
              <circle cx="8" cy="2" r="1.5"/>
              <circle cx="2" cy="7" r="1.5"/>
              <circle cx="8" cy="7" r="1.5"/>
              <circle cx="2" cy="12" r="1.5"/>
              <circle cx="8" cy="12" r="1.5"/>
            </svg>
          </span>
          <span class="header-label">ONBOARD AUDIO / HOST LAYER</span>
          <span class="retracted-title" data-mini-title>Audio player</span>
        </div>
        <div class="header-actions">
          <button type="button" data-action="retract" aria-label="Minimize player">-</button>
          <button type="button" data-action="close" aria-label="Close player">&times;</button>
        </div>
      </header>
      <div class="widget-body">
        <div class="track">
          <div class="track-mark" aria-hidden="true">
            <div class="equalizer" data-equalizer data-playing="false">
              <span class="eq-bar"></span>
              <span class="eq-bar"></span>
              <span class="eq-bar"></span>
            </div>
            <svg class="note-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <div class="track-info">
            <h2 data-title>Nothing loaded</h2>
            <p data-artist>Choose a title in Entertainment</p>
          </div>
        </div>
        <p class="status" data-status aria-live="polite">Ready when you are</p>
        <section class="playlist-panel" data-playlist-panel hidden aria-label="Playlist">
          <button class="playlist-toggle" type="button" data-action="toggle-playlist" aria-expanded="true" aria-controls="widget-playlist">
            <span class="playlist-heading">
              <svg class="playlist-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M3 10h11v2H3zm0-4h11v2H3zm0 8h7v2H3zm13-1v8l6-4z"/>
              </svg>
              Playlist
            </span>
            <span data-playlist-count class="playlist-badge">0 tracks</span>
            <span data-playlist-icon class="playlist-chevron">-</span>
          </button>
          <div class="playlist" id="widget-playlist" data-playlist></div>
        </section>
        <label class="timeline">
          <span data-current>0:00</span>
          <input type="range" min="0" max="0" value="0" step="0.1" data-seek aria-label="Seek audio" disabled />
          <span data-duration>0:00</span>
        </label>
        <div class="actions">
          <button type="button" class="btn-step" data-action="previous" aria-label="Previous track">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            <span>Prev</span>
          </button>
          <button type="button" class="play" data-action="toggle" disabled>
            <span class="play-content">
              <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
              <span>Play</span>
            </span>
          </button>
          <button type="button" class="btn-step" data-action="next" aria-label="Next track">
            <span>Next</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
        </div>
        <button type="button" class="expand" data-action="expand">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
          </svg>
          <span>Open Entertainment</span>
        </button>
        <p class="error" data-error hidden></p>
      </div>
    </section>
  `;

  const widget = shadow.querySelector('.widget');
  const retractButton = shadow.querySelector('[data-action="retract"]');
  const miniTitle = shadow.querySelector('[data-mini-title]');
  const widgetHeader = shadow.querySelector('.widget-header');
  const equalizer = shadow.querySelector('[data-equalizer]');
  const title = shadow.querySelector('[data-title]');
  const artist = shadow.querySelector('[data-artist]');
  const statusLabel = shadow.querySelector('[data-status]');
  const playlistPanel = shadow.querySelector('[data-playlist-panel]');
  const playlistToggle = shadow.querySelector('[data-action="toggle-playlist"]');
  const playlistCount = shadow.querySelector('[data-playlist-count]');
  const playlistIcon = shadow.querySelector('[data-playlist-icon]');
  const playlistElement = shadow.querySelector('[data-playlist]');
  const currentLabel = shadow.querySelector('[data-current]');
  const durationLabel = shadow.querySelector('[data-duration]');
  const seek = shadow.querySelector('[data-seek]');
  const previousButton = shadow.querySelector('[data-action="previous"]');
  const playButton = shadow.querySelector('[data-action="toggle"]');
  const nextButton = shadow.querySelector('[data-action="next"]');
  const errorLabel = shadow.querySelector('[data-error]');
  const audio = document.createElement('audio');
  let retracted = false;
  let drag = null;
  let playlist = [];
  let currentIndex = -1;
  let playlistExpanded = true;

  audio.preload = 'metadata';
  audio.playsInline = true;
  audio.setAttribute('playsinline', '');
  shadow.append(audio);

  function formatTime(value) {
    const seconds = Math.max(0, Math.floor(Number(value) || 0));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function snapshot() {
    return {
      ...state,
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      playlistIndex: currentIndex,
      playlistLength: playlist.length,
      canPrevious: Boolean(state.track && playlist.length > 1),
      canNext: Boolean(state.track && playlist.length > 1),
    };
  }

  function renderPlaylist() {
    const needsBuild = playlistElement.children.length !== playlist.length
      || [...playlistElement.children].some((button, index) => button.dataset.src !== playlist[index]?.src);

    if (needsBuild) {
      playlistElement.replaceChildren(...playlist.map((track, index) => {
        const button = document.createElement('button');
        const number = document.createElement('span');
        const details = document.createElement('span');
        const trackTitle = document.createElement('strong');
        const trackArtist = document.createElement('small');
        const playingIndicator = document.createElement('span');

        button.type = 'button';
        button.dataset.action = 'select';
        button.dataset.index = String(index);
        button.dataset.src = track.src;
        number.className = 'track-num';
        number.textContent = String(index + 1).padStart(2, '0');
        trackTitle.textContent = track.title;
        trackArtist.textContent = track.artist;
        details.className = 'track-meta';
        details.append(trackTitle, trackArtist);
        playingIndicator.className = 'track-playing-icon';
        playingIndicator.setAttribute('aria-hidden', 'true');
        playingIndicator.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M8 5v14l11-7z"/></svg>';
        button.append(number, details, playingIndicator);
        return button;
      }));
    }

    playlistPanel.hidden = playlist.length === 0;
    playlistElement.hidden = !playlistExpanded;
    playlistToggle.setAttribute('aria-expanded', String(playlistExpanded));
    playlistCount.textContent = `${playlist.length} ${playlist.length === 1 ? 'track' : 'tracks'}`;
    playlistIcon.textContent = playlistExpanded ? '-' : '+';
    [...playlistElement.children].forEach((button, index) => {
      const isCurrent = currentIndex === index;
      button.dataset.current = String(isCurrent);
      button.setAttribute('aria-current', isCurrent ? 'true' : 'false');
      button.disabled = state.status === STATUS.LOADING;
    });
  }

  function render() {
    const current = snapshot();
    const statusText = {
      [STATUS.ERROR]: 'Audio could not be loaded',
      [STATUS.IDLE]: 'Ready when you are',
      [STATUS.LOADING]: 'Loading audio...',
      [STATUS.NEEDS_ACTIVATION]: 'One tap is needed to start listening',
      [STATUS.PAUSED]: 'Paused',
      [STATUS.PLAYING]: 'Playing',
      [STATUS.STOPPED]: 'Stopped',
    };
    const buttonText = {
      [STATUS.ERROR]: 'Try again',
      [STATUS.NEEDS_ACTIVATION]: 'Tap here to start listening',
      [STATUS.PLAYING]: 'Pause',
    };

    const isPlaying = state.status === STATUS.PLAYING;
    host.dataset.retracted = String(retracted);
    widget.dataset.retracted = String(retracted);
    miniTitle.textContent = state.track?.title || 'Audio player';
    retractButton.textContent = retracted ? '+' : '-';
    retractButton.setAttribute('aria-label', retracted ? 'Expand player' : 'Minimize player');
    if (equalizer) {
      equalizer.dataset.playing = String(isPlaying);
    }
    renderPlaylist();
    title.textContent = state.track?.title || 'Nothing loaded';
    artist.textContent = state.track?.artist || 'Choose a title in Entertainment';
    statusLabel.textContent = statusText[state.status] || 'Ready when you are';
    statusLabel.dataset.status = state.status;
    currentLabel.textContent = formatTime(current.currentTime);
    durationLabel.textContent = formatTime(current.duration);
    seek.disabled = !state.track || !current.duration;
    seek.max = String(current.duration);
    seek.value = String(Math.min(current.currentTime, current.duration || 0));
    playButton.disabled = !state.track || state.status === STATUS.LOADING;
    const label = buttonText[state.status] || 'Play';
    const playSvg = isPlaying
      ? '<svg class="play-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
      : '<svg class="play-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
    playButton.innerHTML = `<span class="play-content">${playSvg}<span>${label}</span></span>`;
    previousButton.disabled = !current.canPrevious || state.status === STATUS.LOADING;
    nextButton.disabled = !current.canNext || state.status === STATUS.LOADING;
    errorLabel.hidden = !state.error && state.status !== STATUS.NEEDS_ACTIVATION;
    errorLabel.textContent = state.error || 'The browser blocked autoplay. Use this button to grant playback.';
  }

  function sendState() {
    const message = { type: MESSAGE.PLAYER_STATE, state: snapshot() };

    document.querySelectorAll('iframe[data-entertainment-portal]').forEach((frame) => {
      frame.contentWindow?.postMessage(message, ORIGIN);
    });
    window.dispatchEvent(new CustomEvent('persistent-audio-state', { detail: message.state }));
  }

  function publish() {
    render();
    sendState();
  }

  function openWidget(isOpen) {
    host.dataset.open = String(isOpen);
    widget.hidden = !isOpen;
    clampWidgetPosition();
  }

  function clampWidgetPosition() {
    if (!host.style.left || !host.style.top) {
      return;
    }

    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - host.offsetWidth - margin);
    const maxTop = Math.max(margin, window.innerHeight - host.offsetHeight - margin);
    const left = Math.max(margin, Math.min(parseFloat(host.style.left), maxLeft));
    const top = Math.max(margin, Math.min(parseFloat(host.style.top), maxTop));
    host.style.left = `${left}px`;
    host.style.top = `${top}px`;
  }

  function startDrag(event) {
    if (event.button !== 0 || event.target.closest?.('[data-action]')) {
      return;
    }

    const bounds = host.getBoundingClientRect();
    host.style.left = `${bounds.left}px`;
    host.style.top = `${bounds.top}px`;
    host.style.right = 'auto';
    host.style.bottom = 'auto';
    host.dataset.dragging = 'true';
    drag = {
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
    };
    event.preventDefault();
  }

  function moveDrag(event) {
    if (!drag) {
      return;
    }

    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - host.offsetWidth - margin);
    const maxTop = Math.max(margin, window.innerHeight - host.offsetHeight - margin);
    const left = Math.max(margin, Math.min(event.clientX - drag.offsetX, maxLeft));
    const top = Math.max(margin, Math.min(event.clientY - drag.offsetY, maxTop));
    host.style.left = `${left}px`;
    host.style.top = `${top}px`;
  }

  function stopDrag() {
    if (!drag) {
      return;
    }

    host.dataset.dragging = 'false';
    drag = null;
  }

  function validTrack(value) {
    if (!value || !value.title || !value.artist || !value.src) {
      return null;
    }

    try {
      const url = new URL(value.src, document.baseURI);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return null;
      }
      return {
        title: String(value.title).slice(0, 120),
        artist: String(value.artist).slice(0, 120),
        src: url.href,
      };
    } catch {
      return null;
    }
  }

  function setPlaylist(tracks) {
    playlist = Array.isArray(tracks) ? tracks.map(validTrack).filter(Boolean) : [];
    currentIndex = state.track
      ? playlist.findIndex((track) => track.src === state.track.src)
      : -1;
    publish();
  }

  function playbackError(error) {
    retracted = false;
    state.status = error?.name === 'NotAllowedError' ? STATUS.NEEDS_ACTIVATION : STATUS.ERROR;
    state.error = error?.name === 'NotAllowedError'
      ? ''
      : 'The audio source could not be played. Check the network and try again.';
    openWidget(true);
    publish();
  }

  function play() {
    if (!state.track) {
      return;
    }

    const request = ++playRequest;
    state.status = STATUS.LOADING;
    state.error = '';

    let promise;
    try {
      promise = audio.play();
    } catch (error) {
      playbackError(error);
      return;
    }

    publish();
    Promise.resolve(promise)
      .then(() => {
        if (request === playRequest) {
          state.status = STATUS.PLAYING;
          publish();
        }
      })
      .catch((error) => {
        if (request === playRequest) {
          playbackError(error);
        }
      });
  }

  function loadAndPlay(track, index = playlist.findIndex((item) => item.src === track.src)) {
    retracted = false;
    currentIndex = index;
    state.track = track;
    state.status = STATUS.LOADING;
    state.error = '';
    openWidget(true);
    audio.pause();
    audio.src = track.src;
    audio.load();

    // Keep play() in the postMessage call stack for WebKit user activation.
    play();
  }

  function changeTrack(direction) {
    if (playlist.length < 2) {
      return;
    }

    const startIndex = currentIndex < 0 ? 0 : currentIndex;
    const nextIndex = (startIndex + direction + playlist.length) % playlist.length;
    loadAndPlay(playlist[nextIndex], nextIndex);
  }

  function pause() {
    if (!state.track) {
      return;
    }

    ++playRequest;
    state.status = STATUS.PAUSED;
    audio.pause();
    publish();
  }

  function close() {
    ++playRequest;
    retracted = false;
    currentIndex = -1;
    state.track = null;
    state.status = STATUS.STOPPED;
    state.error = '';
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    openWidget(false);
    publish();
  }

  function handleCommand(data) {
    switch (data.type) {
      case MESSAGE.LOAD: {
        const track = validTrack(data.track);
        if (track) {
          loadAndPlay(track);
        }
        break;
      }
      case MESSAGE.PLAYLIST:
        setPlaylist(data.tracks);
        break;
      case MESSAGE.PREVIOUS:
        changeTrack(-1);
        break;
      case MESSAGE.NEXT:
        changeTrack(1);
        break;
      case MESSAGE.PAUSE:
        pause();
        break;
      case MESSAGE.RESUME:
        openWidget(true);
        play();
        break;
      case MESSAGE.READY:
        sendState();
        break;
      case MESSAGE.SEEK: {
        const time = Number(data.currentTime);
        if (state.track && Number.isFinite(time) && Number.isFinite(audio.duration)) {
          audio.currentTime = Math.max(0, Math.min(time, audio.duration));
          publish();
        }
        break;
      }
      default:
        break;
    }
  }

  function handleMessage(event) {
    if (event.origin !== ORIGIN || event.source === window || !event.data) {
      return;
    }

    handleCommand(event.data);
  }

  shadow.addEventListener('click', (event) => {
    const action = event.target.closest?.('[data-action]')?.dataset.action;
    if (action === 'retract') {
      retracted = !retracted;
      render();
    } else if (action === 'toggle-playlist') {
      playlistExpanded = !playlistExpanded;
      render();
    } else if (action === 'select') {
      const index = Number(event.target.closest('[data-action="select"]').dataset.index);
      if (playlist[index]) {
        loadAndPlay(playlist[index], index);
      }
    } else if (action === 'previous') {
      changeTrack(-1);
    } else if (action === 'next') {
      changeTrack(1);
    } else if (action === 'close') {
      close();
    } else if (action === 'expand') {
      window.postMessage({ type: 'NAVIGATE_TO_ENTERTAINMENT' }, ORIGIN);
    } else if (action === 'toggle') {
      state.status === STATUS.PLAYING && !audio.paused ? pause() : play();
    }
  });

  widgetHeader.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', stopDrag);
  window.addEventListener('pointercancel', stopDrag);
  window.addEventListener('resize', clampWidgetPosition);

  seek.addEventListener('input', () => {
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = Number(seek.value);
      publish();
    }
  });

  audio.addEventListener('playing', () => {
    state.status = STATUS.PLAYING;
    state.error = '';
    publish();
  });
  audio.addEventListener('pause', () => {
    if (state.track && state.status === STATUS.PLAYING) {
      state.status = STATUS.PAUSED;
      publish();
    }
  });
  audio.addEventListener('ended', () => {
    state.status = STATUS.PAUSED;
    publish();
  });
  audio.addEventListener('error', () => state.track && playbackError(new Error('Audio error')));
  ['timeupdate', 'durationchange', 'loadedmetadata'].forEach((eventName) => {
    audio.addEventListener(eventName, publish);
  });

  function command(type, data = {}) {
    handleCommand({ type, ...data });
  }

  window.addEventListener('message', handleMessage);
  render();
  window.__persistentAudioWidget = { audio, command, getState: snapshot };
})();
