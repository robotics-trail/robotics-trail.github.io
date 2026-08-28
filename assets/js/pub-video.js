/*
 * TRAIL — lazy playback for the publication clips.
 *
 * The nine animations used to be GIFs totalling 19 MB, all of which the browser
 * downloaded whether or not you ever scrolled to them. They are VP9/WebM now,
 * and this script means nothing but the poster is fetched until a card is
 * nearly on screen: the <video> elements ship with no <source> children at all,
 * so there is nothing for the browser to request.
 *
 * A clip that scrolls well out of view is torn back down, which keeps a long
 * scroll from holding nine decoders open at once.
 *
 * prefers-reduced-motion is honoured: those visitors get the poster and a set
 * of controls, and nothing moves until they ask it to.
 */
(function () {
  'use strict';

  var videos = document.querySelectorAll('video.pub-video');
  if (!videos.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function attach(v) {
    if (v.dataset.loaded) return;
    v.dataset.loaded = '1';
    [['data-webm', 'video/webm'], ['data-mp4', 'video/mp4']].forEach(function (pair) {
      var url = v.getAttribute(pair[0]);
      if (!url) return;
      var s = document.createElement('source');
      s.src = url;
      s.type = pair[1];
      v.appendChild(s);
    });
    v.load();
  }

  function detach(v) {
    if (!v.dataset.loaded) return;
    delete v.dataset.loaded;
    v.pause();
    while (v.firstChild) v.removeChild(v.firstChild);
    v.removeAttribute('src');
    v.load();               // drops the buffer and restores the poster
  }

  if (reduce) {
    // No autoplay. The controls make each clip playable on demand.
    Array.prototype.forEach.call(videos, function (v) {
      v.controls = true;
      v.preload = 'none';
      v.addEventListener('play', function () { attach(v); }, { once: true });
    });
    return;
  }

  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(videos, function (v) { attach(v); v.autoplay = true; v.play().catch(function () {}); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        attach(v);
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        v.pause();
      }
    });
  }, { rootMargin: '300px 0px' });

  // A second, much wider observer frees clips that are far off screen.
  var far = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (!e.isIntersecting) detach(e.target); });
  }, { rootMargin: '2000px 0px' });

  Array.prototype.forEach.call(videos, function (v) { io.observe(v); far.observe(v); });
})();
