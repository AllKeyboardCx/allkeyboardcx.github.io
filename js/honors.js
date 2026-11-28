(function () {
  'use strict';

  var DATA_URL = '../assets/honors/honors.json';
  var IMG_BASE = '../assets/honors/';
  var DANMAKU_MAX = 12;
  var LANES = 3;
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  var state = { items: [], shots: [], index: 0, lastFocus: null, lb: null };

  function $(id) { return document.getElementById(id); }

  function parse(list) {
    var ok = [], bad = 0;
    list.forEach(function (raw) {
      if (!raw || typeof raw !== 'object') { bad++; return; }
      var date = typeof raw.date === 'string' ? raw.date.trim() : '';
      var title = typeof raw.title === 'string' ? raw.title.trim() : '';
      if (!DATE_RE.test(date) || !title) { bad++; return; }
      ok.push({
        date: date,
        title: title,
        desc: typeof raw.desc === 'string' ? raw.desc.trim() : '',
        image: typeof raw.image === 'string' ? raw.image.trim() : '',
        link: typeof raw.link === 'string' ? raw.link.trim() : ''
      });
    });
    if (bad) {
      console.warn('[honors] 已跳过 ' + bad + ' 条格式不对的记录（date 需要 YYYY-MM-DD，title 不能为空）');
    }
    ok.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    return ok;
  }

  function renderDanmaku(items) {
    var host = $('honor-danmaku');
    if (!host) return;
    if (!items.length) { host.hidden = true; return; }
    host.hidden = false;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) host.classList.add('is-static');
    items.slice(0, DANMAKU_MAX).forEach(function (it, i) {
      var span = document.createElement('span');
      span.className = 'honor-dm';
      span.textContent = it.date + ' · ' + it.title;
      if (!reduced) {
        span.style.top = (12 + (i % LANES) * 40) + 'px';
        span.style.setProperty('--honor-dur', Math.min(34, Math.max(15, 11 + it.title.length * 0.5)).toFixed(1) + 's');
        span.style.animationDelay = (i * 1.7).toFixed(1) + 's';
      }
      host.appendChild(span);
    });
  }

  function renderA11y(items) {
    var ul = $('honor-a11y');
    if (!ul) return;
    items.forEach(function (it) {
      var li = document.createElement('li');
      li.textContent = it.date + ' ' + it.title + (it.desc ? '（' + it.desc + '）' : '');
      ul.appendChild(li);
    });
  }

  function renderGallery(items) {
    var host = $('honor-gallery');
    if (!host) return;
    var shots = items.filter(function (it) { return it.image; });
    if (!shots.length) { host.hidden = true; return; }
    host.hidden = false;
    state.shots = shots;

    shots.forEach(function (it, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'honor-shot';
      btn.setAttribute('aria-label', '放大查看：' + it.title);

      var img = document.createElement('img');
      img.src = IMG_BASE + it.image;
      img.alt = it.title;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', function () {
        console.warn('[honors] 图片加载失败：' + it.image + '（检查文件名和 assets/honors/ 目录）');
        btn.remove();
      });

      var cap = document.createElement('span');
      cap.className = 'honor-shot-cap';
      var line1 = document.createElement('b');
      line1.textContent = it.title;
      var line2 = document.createElement('i');
      line2.textContent = it.date + (it.desc ? ' · ' + it.desc : '');
      cap.appendChild(line1);
      cap.appendChild(line2);

      btn.appendChild(img);
      btn.appendChild(cap);
      btn.addEventListener('click', function () { openLightbox(i, btn); });
      host.appendChild(btn);
    });
  }

  function openLightbox(i, trigger) {
    var it = state.shots[i];
    if (!it) return;
    state.index = i;
    state.lastFocus = trigger || null;

    if (!state.lb) {
      var box = document.createElement('div');
      box.id = 'honor-lightbox';
      box.className = 'honor-lightbox';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', '荣誉照片');
      box.innerHTML = '<figure><img alt=""><figcaption><b></b><span></span></figcaption></figure>'
        + '<button type="button" class="honor-lb-close" aria-label="关闭">×</button>'
        + '<button type="button" class="honor-lb-prev" aria-label="上一张">‹</button>'
        + '<button type="button" class="honor-lb-next" aria-label="下一张">›</button>';
      box.addEventListener('click', function (e) {
        var t = e.target;
        if (t === box || t.classList.contains('honor-lb-close')) { closeLightbox(); return; }
        if (t.classList.contains('honor-lb-prev')) { step(-1); return; }
        if (t.classList.contains('honor-lb-next')) { step(1); return; }
      });
      document.body.appendChild(box);
      state.lb = box;
    }
    fillLightbox();
    state.lb.classList.add('is-open');
    document.body.classList.add('honor-lb-lock');
    var closeBtn = state.lb.querySelector('.honor-lb-close');
    if (closeBtn) closeBtn.focus();
  }

  function fillLightbox() {
    var it = state.shots[state.index], box = state.lb;
    if (!it || !box) return;
    var img = box.querySelector('img');
    img.src = IMG_BASE + it.image;
    img.alt = it.title;
    box.querySelector('figcaption b').textContent = it.title;
    var meta = it.date + (it.desc ? ' · ' + it.desc : '');
    var span = box.querySelector('figcaption span');
    span.textContent = meta;
    var prev = box.querySelector('.honor-lb-prev');
    var next = box.querySelector('.honor-lb-next');
    var many = state.shots.length > 1;
    prev.hidden = !many;
    next.hidden = !many;
  }

  function step(d) {
    if (!state.shots.length) return;
    state.index = (state.index + d + state.shots.length) % state.shots.length;
    fillLightbox();
  }

  function closeLightbox() {
    if (!state.lb) return;
    state.lb.classList.remove('is-open');
    document.body.classList.remove('honor-lb-lock');
    if (state.lastFocus && document.body.contains(state.lastFocus)) state.lastFocus.focus();
  }

  document.addEventListener('keydown', function (e) {
    if (!state.lb || !state.lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  });

  function fail(err) {
    console.warn('[honors] 读取 honors.json 失败，保留默认文案：' + err.message);
    ['honor-danmaku', 'honor-gallery'].forEach(function (id) {
      var n = $(id);
      if (n) n.hidden = true;
    });
    var empty = $('honor-empty');
    if (empty) empty.hidden = false;
  }

  fetch(DATA_URL + '?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      if (!Array.isArray(data)) throw new Error('honors.json 必须是一个数组');
      state.items = parse(data);
      if (!state.items.length) {
        var empty = $('honor-empty');
        if (empty) empty.hidden = false;
        renderDanmaku([]);
        renderGallery([]);
        return;
      }
      var empty = $('honor-empty');
      if (empty) empty.hidden = true;
      renderDanmaku(state.items);
      renderA11y(state.items);
      renderGallery(state.items);
    })
    .catch(fail);
}());
