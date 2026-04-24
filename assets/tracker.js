(function () {
  let currentVideoId = null;
  let currentService = null;
  let totalWatchSecs = 0;
  let segmentStart = null;
  let flushed = false;

  window.detectService = function (url) {
    if (/youtu\.be|youtube\.com/.test(url)) return 'youtube';
    if (/twitch\.tv/.test(url)) return 'twitch';
    if (/vimeo\.com/.test(url)) return 'vimeo';
    if (/dailymotion\.com|dai\.ly/.test(url)) return 'dailymotion';
    return 'other';
  };

  window.extractVideoId = function (url, service) {
    let m;
    switch (service) {
      case 'youtube':
        m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
          || url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/)
          || url.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
        return m ? m[1] : null;
      case 'vimeo':
        m = url.match(/vimeo\.com\/(\d+)/);
        return m ? m[1] : null;
      case 'dailymotion':
        m = url.match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([a-zA-Z0-9]+)/);
        return m ? m[1] : null;
      case 'twitch':
        m = url.match(/twitch\.tv\/videos\/(\d+)/);
        if (m) return 'v' + m[1];
        m = url.match(/twitch\.tv\/\w+\/clip\/([a-zA-Z0-9_-]+)/);
        if (m) return 'clip' + m[1];
        m = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)\/?$/);
        return m && m[1] !== 'videos' ? 'c' + m[1] : null;
      default:
        return null;
    }
  };

  window.trackerOnPlay = function (videoId, service) {
    flushWatch();

    if (!videoId || !service || service === 'other') return;

    const source = window.__sfSource === 'ranking' ? 'ranking' : 'direct';
    window.__sfSource = null;

    currentVideoId = videoId;
    currentService = service;
    totalWatchSecs = 0;
    segmentStart = Date.now();
    flushed = false;

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'play', videoId: videoId, service: service, source: source }),
      keepalive: true,
    }).catch(function () {});
  };

  function flushWatch() {
    if (flushed || !currentVideoId) return;

    if (segmentStart) {
      totalWatchSecs += (Date.now() - segmentStart) / 1000;
      segmentStart = null;
    }

    const secs = Math.round(totalWatchSecs);
    if (secs >= 3) {
      const payload = JSON.stringify({
        type: 'watch',
        videoId: currentVideoId,
        service: currentService,
        secs: Math.min(secs, 86400),
      });
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/track', blob);
      } else {
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(function () {});
      }
    }

    flushed = true;
    currentVideoId = null;
    currentService = null;
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (segmentStart) {
        totalWatchSecs += (Date.now() - segmentStart) / 1000;
        segmentStart = null;
      }
    } else if (currentVideoId) {
      segmentStart = Date.now();
    }
  });

  window.addEventListener('pagehide', flushWatch);
  window.addEventListener('beforeunload', flushWatch);
})();
