export const AGORA_MEETING_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<title>Agora Meeting</title>
<script src="https://download.agora.io/sdk/release/AgoraRTC_N-4.20.0.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #000; font-family: -apple-system, sans-serif; }
  #video-grid {
    position: absolute; inset: 0;
    display: grid; gap: 4px; padding: 4px;
    grid-template-columns: 1fr;
    grid-auto-rows: 1fr;
    background: #111;
  }
  .video-tile {
    position: relative; background: #222; border-radius: 8px; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  }
  .video-tile video {
    width: 100%; height: 100%; object-fit: cover;
    transform: scaleX(-1);
  }
  .video-tile.remote video { transform: none; }
  .video-tile .name {
    position: absolute; bottom: 6px; left: 6px;
    background: rgba(0,0,0,0.6); color: #fff;
    font-size: 11px; padding: 3px 8px; border-radius: 10px;
    max-width: 90%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .video-tile .muted-badge {
    position: absolute; top: 6px; right: 6px;
    background: rgba(239,68,68,0.9); color: #fff;
    font-size: 12px; width: 22px; height: 22px; border-radius: 11px;
    display: none; align-items: center; justify-content: center;
  }
  .video-tile.audio-muted .muted-badge { display: flex; }
  .tile-count-2 { grid-template-columns: 1fr 1fr; }
  .tile-count-3, .tile-count-4 { grid-template-columns: 1fr 1fr; }
  .tile-count-5, .tile-count-6, .tile-count-7, .tile-count-8, .tile-count-9 { grid-template-columns: repeat(3, 1fr); }
  .tile-count-10, .tile-count-11, .tile-count-12 { grid-template-columns: repeat(4, 1fr); }

  #controls {
    position: absolute; bottom: 0; left: 0; right: 0;
    display: flex; align-items: center; justify-content: center;
    gap: 12px; padding: 14px;
    background: linear-gradient(to top, rgba(0,0,0,0.85), transparent);
  }
  .ctrl-btn {
    width: 52px; height: 52px; border-radius: 26px;
    border: none; background: rgba(255,255,255,0.15);
    color: #fff; font-size: 22px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: background 0.2s;
  }
  .ctrl-btn:active { background: rgba(255,255,255,0.3); }
  .ctrl-btn.active { background: #7C3AED; }
  .ctrl-btn.danger { background: #EF4444; }
  .ctrl-btn.leave { background: #EF4444; width: auto; padding: 0 22px; border-radius: 26px; font-size: 15px; font-weight: 700; }

  #status {
    position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,0.7); color: #fff; padding: 6px 14px;
    border-radius: 14px; font-size: 12px; font-weight: 600;
    display: none;
  }
  #status.visible { display: block; }
</style>
</head>
<body>
<div id="video-grid"></div>

<div id="controls">
  <button class="ctrl-btn" id="btn-mic" onclick="toggleMic()">🎙️</button>
  <button class="ctrl-btn" id="btn-cam" onclick="toggleCam()">📹</button>
  <button class="ctrl-btn" id="btn-chat" onclick="toggleChat()">💬</button>
  <button class="ctrl-btn leave" id="btn-leave" onclick="leaveCall()">Leave</button>
</div>

<div id="status"></div>

<script>
  let client = null;
  let localTracks = { audio: null, video: null };
  let remoteUsers = {};
  let micOn = true;
  let camOn = true;
  let config = null;

  function setStatus(text, show) {
    const el = document.getElementById('status');
    el.textContent = text || '';
    el.className = show ? 'visible' : '';
  }

  function sendToRN(type, payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
    }
  }

  function updateGridClass() {
    const grid = document.getElementById('video-grid');
    const total = 1 + Object.keys(remoteUsers).length;
    grid.className = '';
    if (total >= 2 && total <= 4) grid.classList.add('tile-count-' + total);
    else if (total > 4) grid.classList.add('tile-count-' + Math.min(total, 12));
  }

  function createTile(uid, isLocal, name) {
    const tile = document.createElement('div');
    tile.className = 'video-tile' + (isLocal ? '' : ' remote');
    tile.id = 'tile-' + uid;

    const nameEl = document.createElement('div');
    nameEl.className = 'name';
    nameEl.textContent = name || (isLocal ? 'You' : 'User ' + uid);
    tile.appendChild(nameEl);

    const mutedEl = document.createElement('div');
    mutedEl.className = 'muted-badge';
    mutedEl.textContent = '🔇';
    tile.appendChild(mutedEl);

    return tile;
  }

  async function joinChannel() {
    if (!config) return;
    setStatus('Joining...', true);

    try {
      client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'video') {
          const tile = document.getElementById('tile-' + user.uid);
          if (tile) {
            tile.innerHTML = '';
            const nameEl = document.createElement('div');
            nameEl.className = 'name';
            nameEl.textContent = 'User ' + user.uid;
            tile.appendChild(nameEl);
            const mutedEl = document.createElement('div');
            mutedEl.className = 'muted-badge';
            mutedEl.textContent = '🔇';
            tile.appendChild(mutedEl);
            user.videoTrack.play(tile);
          }
        }
        if (mediaType === 'audio') {
          user.audioTrack.play();
        }
      });

      client.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'video') {
          const tile = document.getElementById('tile-' + user.uid);
          if (tile) {
            const video = tile.querySelector('video');
            if (video) video.remove();
          }
        }
      });

      client.on('user-left', (user) => {
        const tile = document.getElementById('tile-' + user.uid);
        if (tile) tile.remove();
        delete remoteUsers[user.uid];
        updateGridClass();
      });

      await client.join(config.appId, config.channelName, config.token, config.uid);

      // Local preview
      const localTile = createTile('local', true, 'You');
      document.getElementById('video-grid').appendChild(localTile);

      localTracks.audio = await AgoraRTC.createMicrophoneAudioTrack();
      localTracks.video = await AgoraRTC.createCameraVideoTrack();

      localTracks.video.play(localTile);

      const publishTracks = [];
      if (localTracks.audio) publishTracks.push(localTracks.audio);
      if (localTracks.video) publishTracks.push(localTracks.video);

      if (publishTracks.length > 0) {
        await client.publish(publishTracks);
      }

      updateGridClass();
      setStatus('', false);
      sendToRN('joined', { uid: config.uid });
    } catch (err) {
      setStatus('Failed to join: ' + err.message, true);
      sendToRN('error', { message: err.message });
    }
  }

  async function toggleMic() {
    if (!localTracks.audio) return;
    micOn = !micOn;
    await localTracks.audio.setEnabled(micOn);
    const btn = document.getElementById('btn-mic');
    btn.className = 'ctrl-btn' + (micOn ? '' : ' active');
    btn.textContent = micOn ? '🎙️' : '🔇';
    sendToRN('mic-toggled', { on: micOn });
  }

  async function toggleCam() {
    if (!localTracks.video) return;
    camOn = !camOn;
    await localTracks.video.setEnabled(camOn);
    const btn = document.getElementById('btn-cam');
    btn.className = 'ctrl-btn' + (camOn ? '' : ' active');
    btn.textContent = camOn ? '📹' : '🚫';
    sendToRN('cam-toggled', { on: camOn });
  }

  function toggleChat() {
    sendToRN('toggle-chat', {});
  }

  async function leaveCall() {
    try {
      if (localTracks.audio) { localTracks.audio.stop(); localTracks.audio.close(); }
      if (localTracks.video) { localTracks.video.stop(); localTracks.video.close(); }
      if (client) await client.leave();
      sendToRN('left', {});
    } catch (e) {
      sendToRN('left', {});
    }
  }

  // Listen for RN → WebView messages
  window.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'init') {
        config = msg.payload;
        joinChannel();
      } else if (msg.type === 'force-leave') {
        leaveCall();
      }
    } catch (e) {}
  });

  // Also accept direct window.AgoraBridge calls (fallback)
  window.AgoraBridge = {
    init: (cfg) => { config = cfg; joinChannel(); },
    leave: leaveCall,
    toggleMic,
    toggleCam,
  };

  sendToRN('ready', {});
</script>
</body>
</html>
`;
