(() => {
  const ORIGIN = window.location.origin;
  const tracks = {
    'window-seat': ['Window Seat', 'Lea Martin', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'],
    'blue-platform': ['Blue Platform', 'Anton Vale', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'],
    'after-the-tunnel': ['After the Tunnel', 'June Isles', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'],
  };
  const connection = document.querySelector('[data-connection-status]');
  const syncStatus = document.querySelector('[data-sync-status]');
  const current = document.querySelector('[data-current-time]');
  const duration = document.querySelector('[data-duration]');
  const seek = document.querySelector('[data-portal-seek]');
  const previous = document.querySelector('[data-previous]');
  const toggle = document.querySelector('[data-toggle]');
  const next = document.querySelector('[data-next]');
  let state = {};

  function send(type, data = {}) {
    window.parent.postMessage({ type, ...data }, ORIGIN);
  }

  function formatTime(value) {
    const seconds = Math.max(0, Math.floor(Number(value) || 0));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function render(nextState) {
    state = nextState;
    const track = state.track;
    const label = track ? `${track.title} - ${track.artist}` : 'Nothing is playing yet.';
    const messages = {
      error: 'The host audio element reported an error.',
      'needs-activation': 'Autoplay was blocked. Tap the floating player to start listening.',
      paused: `Paused - ${label}`,
      playing: `Playing - ${label}`,
      stopped: 'The floating player was closed.',
    };

    connection.textContent = track ? 'Connected to the persistent host player.' : 'Connected. Choose a title to begin.';
    syncStatus.textContent = messages[state.status] || label;
    syncStatus.dataset.status = state.status;
    current.textContent = formatTime(state.currentTime);
    duration.textContent = formatTime(state.duration);
    seek.disabled = !track || !state.duration;
    seek.max = String(state.duration || 0);
    seek.value = String(Math.min(state.currentTime || 0, state.duration || 0));
    toggle.disabled = !track;
    toggle.textContent = state.status === 'playing' ? 'Pause from iframe' : 'Play from iframe';
    previous.disabled = !state.canPrevious;
    next.disabled = !state.canNext;
  }

  window.addEventListener('message', (event) => {
    if (event.origin === ORIGIN && event.source === window.parent && event.data?.type === 'PLAYER_STATE') {
      render(event.data.state);
    }
  });

  document.querySelectorAll('[data-track-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const [title, artist, src] = tracks[button.dataset.trackId];
      send('LOAD_AND_PLAY', { track: { title, artist, src } });
    });
  });

  toggle.addEventListener('click', () => send(state.status === 'playing' ? 'PAUSE' : 'RESUME'));
  previous.addEventListener('click', () => send('PREVIOUS'));
  next.addEventListener('click', () => send('NEXT'));
  seek.addEventListener('input', () => send('SEEK', { currentTime: Number(seek.value) }));
  send('SET_PLAYLIST', {
    tracks: Object.values(tracks).map(([title, artist, src]) => ({ title, artist, src })),
  });
  send('PORTAL_READY');
})();