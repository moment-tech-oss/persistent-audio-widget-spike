(() => {
  const ORIGIN = window.location.origin;
  const content = document.querySelector('[data-content-region]');
  const status = document.querySelector('[data-host-status]');
  const dot = document.querySelector('[data-host-status-dot]');
  const buttons = [...document.querySelectorAll('[data-route]')];
  const routeCopy = {
    'page-1': ['Page 1', 'Page 1', 'The iframe is gone, but the host audio keeps playing.', '01'],
    'page-2': ['Page 2', 'Page 2', 'There is no portal on this page. Open it again from the floating player.', '02'],
  };

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

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      show(button.dataset.route);
    });
  });
  show('entertainment');
})();