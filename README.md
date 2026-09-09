# Persistent Audio Widget Spike

This small spike keeps one native `<audio>` element in the host page while the entertainment portal is mounted and removed as an iframe.

## Project tree

```text
.
├── src/
│   ├── host/
│   │   ├── index.html  # Host simulator
│   │   └── host.js     # Host routes and iframe lifecycle
│   ├── portal/
│   │   ├── portal.html # Embedded entertainment portal
│   │   └── portal.js   # Portal catalog and controls
│   ├── widget/
│   │   ├── audio-widget.js # Persistent audio and postMessage bridge
│   │   └── widget.css      # Shadow DOM widget styles
│   └── shared/
│       └── styles.css # Host and portal styles
├── server.js          # Dependency-free local server and public route map
├── package.json       # Run scripts
└── README.md          # Run and device test instructions
```

## Files

- `src/host/index.html` and `src/host/host.js`: host navigation and iframe lifecycle.
- `src/portal/portal.html` and `src/portal/portal.js`: catalog and iframe-side controls.
- `src/widget/audio-widget.js`: host-owned audio element, playlist controls, Shadow DOM player, and `postMessage` bridge.
- `src/shared/styles.css` and `src/widget/widget.css`: page and widget styling.
- `server.js`: dependency-free local server and route map that preserves the browser-facing URLs.

## Run

```bash
npm start
```

Open `http://localhost:4173`. The server also prints a LAN URL for phones on the same Wi-Fi network.

The sample tracks use public SoundHelix MP3 URLs. Replace them in `portal.js` with your own CDN or local media when needed.

## Device checklist

Run this on physical iOS Safari and Android Chrome using the printed LAN URL:

- Tap **Play** in the iframe. Audio should start, or the widget should show **Tap here to start listening** after autoplay rejection.
- Switch to **Page 1** and **Page 2**. The iframe should disappear while the same audio keeps playing.
- Return to **Entertainment (Iframe)**. The new iframe should show the current track, time, and playing state.
- Pause/resume from both the floating widget and the iframe.
- Use **Prev** and **Next** in the widget or iframe to move through the catalog.
- Select any track directly from the playlist shown in the expanded widget.
- Use the **Playlist** header to collapse or expand the track list.
- Drag the widget by its header and use `-` to retract it without stopping playback. Use `+` to restore it.
- Use **Open Entertainment** from another route.
- Use `X` to stop playback and collapse the widget.

The browser console should have no unhandled `NotAllowedError`. For inspection, use `window.__persistentAudioWidget.audio` and `window.__persistentAudioWidget.getState()` in the host console.
