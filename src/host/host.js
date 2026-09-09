(() => {
  const ORIGIN = window.location.origin;
  const content = document.querySelector('[data-content-region]');
  const status = document.querySelector('[data-host-status]');
  const dot = document.querySelector('[data-host-status-dot]');
  const buttons = [...document.querySelectorAll('[data-route]')];
  const hostTrack = document.querySelector('[data-host-track]');
  const hostControlStatus = document.querySelector('[data-host-control-status]');
  const hostCurrent = document.querySelector('[data-host-current]');
  const hostDuration = document.querySelector('[data-host-duration]');
  const hostSeek = document.querySelector('[data-host-seek]');
  const hostPrevious = document.querySelector('[data-host-previous]');
  const hostToggle = document.querySelector('[data-host-toggle]');
  const hostNext = document.querySelector('[data-host-next]');
  const routeCopy = {
    'page-1': ['Page 1', 'Page 1', 'The iframe is gone, but the host audio keeps playing.', '01'],
    'page-2': ['Page 2', 'Page 2', 'There is no portal on this page. Open it again from the floating player.', '02'],
  };
  let audioState = window.__persistentAudioWidget?.getState?.() || {
    status: 'idle',
    track: null,
    currentTime: 0,
    duration: 0,
    canPrevious: false,
    canNext: false,
  };

  function formatTime(value) {
    const seconds = Math.max(0, Math.floor(Number(value) || 0));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function sendAudioCommand(type, data = {}) {
    window.__persistentAudioWidget?.command?.(type, data);
  }

  function renderHostControls(nextState) {
    audioState = nextState;
    const track = audioState.track;
    const statusLabels = {
      error: 'Audio error',
      'needs-activation': 'Tap start to listen',
      paused: 'Audio paused',
      playing: 'Audio playing',
      stopped: 'Audio stopped',
    };

    hostTrack.textContent = track ? `${track.title} - ${track.artist}` : 'Choose a title in Entertainment';
    hostControlStatus.textContent = statusLabels[audioState.status] || 'Ready when you are';
    hostCurrent.textContent = formatTime(audioState.currentTime);
    hostDuration.textContent = formatTime(audioState.duration);
    hostSeek.disabled = !track || !audioState.duration;
    hostSeek.max = String(audioState.duration || 0);
    hostSeek.value = String(Math.min(audioState.currentTime || 0, audioState.duration || 0));
    hostToggle.disabled = !track || audioState.status === 'loading';
    hostToggle.textContent = audioState.status === 'playing'
      ? 'Pause'
      : audioState.status === 'needs-activation' ? 'Start listening' : 'Play';
    hostPrevious.disabled = !audioState.canPrevious || audioState.status === 'loading';
    hostNext.disabled = !audioState.canNext || audioState.status === 'loading';
  }

  function show(route) {
    buttons.forEach((button) => {
      button.setAttribute('aria-selected', String(button.dataset.route === route));
    });

    if (route === 'entertainment') {
      const iframe = document.createElement('iframe');
      iframe.className = 'portal-frame';
      iframe.title = 'Onboard entertainment portal';
      iframe.src = '/portal.html';
      iframe.allow = 'autoplay';
      iframe.dataset.entertainmentPortal = 'true';
      content.replaceChildren(iframe);
      return;
    }

    const [eyebrow, title, body, marker] = routeCopy[route];
    content.innerHTML = `
      <article class="host-route">
        <div>
          <p class="eyebrow">${eyebrow}</p>
          <h2>${title}</h2>
          <p>${body}</p>
        </div>
        <strong>${marker}</strong>
      </article>
    `;
  }

  window.addEventListener('message', (event) => {
    if (event.origin === ORIGIN && event.source === window && event.data?.type === 'NAVIGATE_TO_ENTERTAINMENT') {
      show('entertainment');
    }
  });

  window.addEventListener('persistent-audio-state', ({ detail }) => {
    renderHostControls(detail);
    const labels = {
      error: 'Audio error',
      'needs-activation': 'Tap widget to start',
      paused: 'Audio paused',
      playing: 'Audio playing',
      stopped: 'Audio stopped',
    };
    status.textContent = `${labels[detail.status] || 'Audio layer ready'}${detail.track ? ` - ${detail.track.title}` : ''}`;
    dot.dataset.playing = String(detail.status === 'playing');
  });

  hostToggle.addEventListener('click', () => {
    sendAudioCommand(audioState.status === 'playing' ? 'PAUSE' : 'RESUME');
  });
  hostPrevious.addEventListener('click', () => sendAudioCommand('PREVIOUS'));
  hostNext.addEventListener('click', () => sendAudioCommand('NEXT'));
  hostSeek.addEventListener('input', () => {
    sendAudioCommand('SEEK', { currentTime: Number(hostSeek.value) });
  });

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      show(button.dataset.route);
    });
  });
  renderHostControls(audioState);
  show('entertainment');
})();