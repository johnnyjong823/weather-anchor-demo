/* 氣象播報體驗：首頁 ↔ 播報底圖切換。純原生 JS，雙擊 index.html 即可執行。 */
(function () {
  'use strict';

  var W = 1920, H = 1080;
  var FADE_MS = 500;        // 與 CSS --fade 一致
  var READY_MAX_MS = 400;   // 等待底圖載入的上限，超過就先淡入
  var IDLE_MS = 3000;       // 滑鼠閒置後隱藏游標與回首頁按鈕
  var VIDEO_EXT = /\.(mp4|webm|m4v)([?#]|$)/i;
  var COLOR_DEFAULT = '#1e9be8';

  var SVG_HEAD = '<svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="3.5" ' +
                 'stroke-linecap="round" stroke-linejoin="round">';
  var ICONS = {
    surface: '<ellipse cx="24" cy="24" rx="19" ry="14"/><ellipse cx="24" cy="24" rx="10" ry="7"/>' +
             '<circle cx="24" cy="24" r="2" fill="#fff"/>',
    radar: '<circle cx="24" cy="24" r="18"/><circle cx="24" cy="24" r="9"/><path d="M24 24 37 11"/>' +
           '<circle cx="31" cy="31" r="2.5" fill="#fff"/>',
    satellite: '<g transform="rotate(-45 24 22)"><rect x="19" y="16" width="10" height="12" rx="2"/>' +
               '<rect x="4" y="18" width="11" height="8"/><rect x="33" y="18" width="11" height="8"/>' +
               '<path d="M15 22h4M29 22h4"/></g><path d="M31 37a7 7 0 0 0 6-6M31 43a13 13 0 0 0 12-12"/>',
    rainfall: '<path d="M15 31h19a7 7 0 0 0 0-14 10 10 0 0 0-19-1 7.5 7.5 0 0 0 0 15z"/>' +
              '<path d="M17 37l-2 5M25 37l-2 5M33 37l-2 5"/>'
  };
  var ICON_DEFAULT = '<path d="M14 34h21a8 8 0 0 0 0-16 11 11 0 0 0-21-1 8.5 8.5 0 0 0 0 17z"/>';
  var ARROW = '<svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" ' +
              'stroke-linejoin="round"><path d="M8 24h28M26 13l11 11-11 11"/></svg>';

  var $ = function (sel) { return document.querySelector(sel); };
  var canvas = $('#canvas');
  var home = $('#home');
  var stage = $('#stage');
  var layers = $('.stage-layers');

  var charts = [];
  var current = null;       // 目前顯示的圖資 id；首頁為 null
  var turns = Object.create(null);   // 每張圖資已顯示幾次，用來輪流切換多張底圖
  var layerSeq = 0;
  var homeTimer = 0;

  // ---------------------------------------------------------------- 畫布縮放
  function fit() {
    var s = Math.min(window.innerWidth / W, window.innerHeight / H);
    var x = (window.innerWidth - W * s) / 2;
    var y = (window.innerHeight - H * s) / 2;
    canvas.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
  }

  // ---------------------------------------------------------------- 內容檢查
  function validate(c) {
    if (!c || typeof c !== 'object') return '讀不到內容設定';
    if (!Array.isArray(c.charts) || c.charts.length === 0) return 'charts 圖資清單是空的或格式錯誤';
    if (c.charts.length > 4) return '圖資最多 4 張，目前有 ' + c.charts.length + ' 張';
    var seen = Object.create(null);
    for (var i = 0; i < c.charts.length; i++) {
      var ch = c.charts[i], n = '第 ' + (i + 1) + ' 張圖資';
      if (!ch || typeof ch !== 'object') return n + '格式錯誤';
      if (!/^[a-z0-9-]+$/.test(ch.id || '')) return n + '的 id 只能用小寫英文、數字、減號';
      if (seen[ch.id]) return n + '的 id「' + ch.id + '」重複';
      seen[ch.id] = true;
      if (typeof ch.name !== 'string' || !ch.name) return n + '缺少 name';
      var st = stagesOf(ch);
      if (!st.length || st.some(function (s) { return typeof s !== 'string'; })) return n + '缺少 stage 底圖';
    }
    return null;
  }

  function showError(msg) {
    var box = $('#error');
    var line = 0;
    (window.__loadErrors || []).forEach(function (e) {
      if (/content\.js$/i.test(e.file) && e.line) line = e.line;
    });
    box.innerHTML = '';
    var wrap = el('div');
    var strong = document.createElement('strong');
    strong.textContent = '內容檔格式錯誤';
    var p = document.createElement('div');
    p.textContent = line ? '請檢查 content.js 第 ' + line + ' 行附近' : msg;
    var small = document.createElement('small');
    small.textContent = '請檢查 content.js 最近修改的地方（引號、逗號、括號），' +
                        '或用 content.備份.js 的內容覆蓋還原，存檔後按 F5。';
    wrap.appendChild(strong);
    wrap.appendChild(p);
    wrap.appendChild(small);
    box.appendChild(wrap);
    box.hidden = false;
  }

  // ---------------------------------------------------------------- 建立畫面
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function list(v) {
    return Array.isArray(v) ? v.filter(Boolean) : v ? [v] : [];
  }

  // stage 可以是一個檔案，或多個檔案的清單 [ 'A', 'B' ]（每次進入輪流顯示下一張）
  function stagesOf(ch) { return list(ch.stage); }

  function nextStage(ch) {
    var st = stagesOf(ch);
    var i = turns[ch.id] || 0;
    turns[ch.id] = i + 1;
    return st[i % st.length];
  }

  // 色碼打錯時改用預設色，避免卡片變透明看不見字
  function colorOf(ch) {
    var c = ch.color;
    return typeof c === 'string' && window.CSS && CSS.supports('color', c) ? c : COLOR_DEFAULT;
  }

  function buildHome(c) {
    if (c.background) home.style.backgroundImage = 'url("' + c.background + '")';
    var logo = $('.home-logo');
    if (c.logo) logo.src = c.logo; else logo.hidden = true;
    $('.home-title').textContent = c.title || '';
    $('.home-subtitle').textContent = c.subtitle || '';
    document.title = c.title || document.title;

    var cards = $('.cards');
    charts.forEach(function (ch) {
      var card = el('button', 'card');
      card.type = 'button';
      card.style.setProperty('--c', colorOf(ch));
      card.appendChild(el('div', 'card-name', ch.name));
      card.appendChild(el('div', 'card-name-en', ch.nameEn || ''));
      var img = el('img', 'card-thumb');
      img.alt = '';
      img.draggable = false;
      if (ch.thumb) img.src = ch.thumb;
      card.appendChild(img);
      var desc = el('div', 'card-desc');
      list(ch.desc).slice(0, 2).forEach(function (line) { desc.appendChild(el('div', '', line)); });
      card.appendChild(desc);
      var arrow = el('div', 'card-arrow');
      arrow.innerHTML = ARROW;
      card.appendChild(arrow);
      card.addEventListener('click', function () { go(ch.id); });
      cards.appendChild(card);
    });

    var stageLogo = $('.stage-logo');
    if (c.logo) stageLogo.src = c.logo; else stageLogo.hidden = true;
  }

  function buildLayer(ch, src) {
    var layer = el('div', 'layer');
    layer.style.setProperty('--c', colorOf(ch));

    var media, ready;
    if (VIDEO_EXT.test(src)) {
      media = el('video', 'layer-media');
      media.muted = true;
      media.loop = true;
      media.autoplay = true;
      media.playsInline = true;
      media.preload = 'auto';
      ready = new Promise(function (resolve) {
        media.addEventListener('canplay', resolve, { once: true });
        media.addEventListener('error', resolve, { once: true });
      });
      keepPlaying(media);
      media.src = src;
    } else {
      // 非 16:9 的圖完整顯示在中間，兩側用同一張圖模糊放大填滿
      var backdrop = el('img', 'layer-backdrop');
      backdrop.alt = '';
      backdrop.draggable = false;
      backdrop.src = src;
      backdrop.addEventListener('error', function () { backdrop.remove(); }, { once: true });
      layer.appendChild(backdrop);
      media = el('img', 'layer-media');
      media.alt = '';
      media.draggable = false;
      media.src = src;
      ready = media.decode ? media.decode().catch(function () {}) : Promise.resolve();
    }
    media.addEventListener('error', function () {
      if (media.dataset.played) return;          // 播放過的影片出錯由 keepPlaying 重載
      var miss = el('div', 'layer-missing');
      var box = el('div', '', '找不到底圖檔案');
      box.appendChild(el('small', '', src));
      miss.appendChild(box);
      media.replaceWith(miss);
    }, { once: true });
    layer.appendChild(media);

    var band = el('div', 'title-band');
    var icon = el('div', 'title-icon');
    icon.innerHTML = SVG_HEAD + (Object.prototype.hasOwnProperty.call(ICONS, ch.id) ? ICONS[ch.id] : ICON_DEFAULT) + '</svg>';
    band.appendChild(icon);
    band.appendChild(el('div', 'title-text', ch.name));
    layer.appendChild(band);

    var labels = list(ch.labels).slice(0, 3);
    if (labels.length) {
      var box = el('div', 'labels');
      labels.forEach(function (t) { box.appendChild(el('div', 'label', t)); });
      layer.appendChild(box);
    }
    return { el: layer, ready: ready };
  }

  // 整天播放：被瀏覽器暫停、卡住或解碼出錯時自動恢復
  function keepPlaying(v) {
    var resume = function () {
      if (!v.dataset.disposed && v.isConnected) v.play().catch(function () {});
    };
    v.addEventListener('playing', function () { v.dataset.played = '1'; });
    v.addEventListener('canplay', resume);
    v.addEventListener('pause', resume);
    v.addEventListener('stalled', resume);
    v.addEventListener('error', function () {
      if (v.dataset.played && !v.dataset.disposed) setTimeout(function () { v.load(); }, 1000);
    });
  }

  function disposeLayer(layer) {
    layer.querySelectorAll('video').forEach(function (v) {
      v.dataset.disposed = '1';
      v.pause();
      v.removeAttribute('src');
      v.load();                       // 釋放解碼器，長時間運作不累積記憶體
    });
    layer.remove();
  }

  // ---------------------------------------------------------------- 切換
  function showStage(ch) {
    clearTimeout(homeTimer);
    home.classList.remove('active');
    stage.classList.add('active');
    if (current === ch.id) return;
    current = ch.id;

    var seq = ++layerSeq;
    var built = buildLayer(ch, nextStage(ch));
    built.el.dataset.seq = seq;
    layers.appendChild(built.el);
    var timeout = new Promise(function (r) { setTimeout(r, READY_MAX_MS); });
    Promise.race([built.ready, timeout]).then(function () {
      if (seq !== layerSeq) { disposeLayer(built.el); return; }   // 已被更新的切換取代
      void built.el.offsetWidth;
      built.el.classList.add('show');
      setTimeout(function () {
        Array.prototype.slice.call(layers.children).forEach(function (l) {
          if (Number(l.dataset.seq) < seq) disposeLayer(l);
        });
      }, FADE_MS + 50);
    });
  }

  function showHome() {
    home.classList.add('active');
    stage.classList.remove('active');
    current = null;
    layerSeq++;
    clearTimeout(homeTimer);
    homeTimer = setTimeout(function () {
      Array.prototype.slice.call(layers.children).forEach(disposeLayer);
    }, FADE_MS + 50);
  }

  function route() {
    var id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { /* 網址格式錯誤 → 回首頁 */ }
    var ch = charts.filter(function (c) { return c.id === id; })[0];
    if (ch) showStage(ch); else showHome();
  }

  function go(id) {
    var hash = id ? '#' + id : '';
    if (location.hash === hash || (!id && !location.hash)) { route(); return; }
    location.hash = hash;               // 觸發 hashchange → route()
  }

  function indexOfCurrent() {
    for (var i = 0; i < charts.length; i++) if (charts[i].id === current) return i;
    return -1;
  }

  // ---------------------------------------------------------------- 操作
  function onKey(e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    var n = charts.length, i = indexOfCurrent();
    var k = e.key;
    if (k >= '1' && k <= '9' && Number(k) <= n) {
      go(charts[Number(k) - 1].id);
    } else if (k === 'Escape' || k === '0' || k === 'Home') {
      go(null);
    } else if (k === 'ArrowRight' || k === 'PageDown' || k === 'ArrowDown') {
      go(charts[(i + 1) % n].id);
    } else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'ArrowUp') {
      go(charts[i <= 0 ? n - 1 : i - 1].id);
    } else {
      return;
    }
    e.preventDefault();
  }

  var idleTimer = 0;
  function onMouseMove() {
    document.body.classList.add('mouse-active');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      document.body.classList.remove('mouse-active');
    }, IDLE_MS);
  }

  function preloadStageImages() {
    charts.forEach(function (ch) {
      stagesOf(ch).forEach(function (src) {
        if (!VIDEO_EXT.test(src)) new Image().src = src;
      });
    });
  }

  // ---------------------------------------------------------------- 啟動
  function init() {
    fit();
    window.addEventListener('resize', fit);

    var c = window.CONTENT;
    var err = validate(c);
    if (err) { showError(err); return; }
    charts = c.charts;

    buildHome(c);
    $('.back').addEventListener('click', function () { go(null); });
    window.addEventListener('hashchange', route);
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseMove);
    preloadStageImages();
    route();
  }

  init();
})();
