// 手机菜单；「免费试用」「预约演示」弹窗；滚到眼前的动效；「一张单的全流程」演示动画；价格页的计算器；页脚年份。不依赖任何库。
(function () {
  // 中英文两个站共用这份脚本：<html lang="en"> 时用英文
  var L = function (zh, en) { return document.documentElement.lang === 'en' ? en : zh; };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canObserve = 'IntersectionObserver' in window;

  // ---------- 手机菜单 ----------
  var nav = document.querySelector('[data-nav]');
  var btn = document.querySelector('[data-nav-toggle]');
  var setOpen = function (open) {
    if (!nav || !btn) return;
    if (open) nav.setAttribute('data-open', ''); else nav.removeAttribute('data-open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? L('关闭菜单', 'Close menu') : L('打开菜单', 'Open menu'));
  };
  if (nav && btn) {
    btn.addEventListener('click', function () { setOpen(!nav.hasAttribute('data-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('.nav__links a')) setOpen(false); });
  }

  // ---------- 弹窗（老浏览器没有 <dialog>：退回成跳到联系方式） ----------
  var trial = document.getElementById('trial');
  var contact = document.getElementById('contact-dialog');
  var canDialog = trial && typeof trial.showModal === 'function';
  var open = function (dlg) {
    [trial, contact].forEach(function (d) { if (d && d.open) d.close(); });
    if (canDialog) dlg.showModal(); else location.hash = '#contact';
  };
  [trial, contact].forEach(function (d) {
    if (!d) return;
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); }); // 点遮罩关掉
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-trial], [data-contact], [data-trial-go]');
    if (!t) return;
    if (t.hasAttribute('data-trial')) { e.preventDefault(); setOpen(false); open(trial); }
    else if (t.hasAttribute('data-contact')) { e.preventDefault(); open(contact); }
    else if (t.hasAttribute('data-trial-go')) {
      // 演示店开放后：去掉 is-soon，这里直接跳 data-trial-url
      e.preventDefault();
      if (!t.classList.contains('is-soon')) location.href = trial.getAttribute('data-trial-url');
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  if (location.hash === '#trial') open(trial);

  // ---------- 滚到眼前：加 is-in（卡片里的小画面跟着动起来） ----------
  var reveals = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  var onIn = function (el) {
    el.classList.add('is-in');
    // 小翼：先「打字中」一会儿再出回复
    if (el.querySelector('.chat')) setTimeout(function () { el.classList.add('is-done'); }, reduce ? 0 : 1800);
  };
  if (reduce || !canObserve) reveals.forEach(onIn);
  else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { onIn(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  // ---------- 一张单的全流程：代码画的演示（五段脚本），看得见才动，一段演完自动下一段 ----------
  var flow = document.querySelector('[data-flow]');
  if (flow) {
    var demo = flow.querySelector('[data-demo]');
    var tabs = Array.prototype.slice.call(flow.querySelectorAll('[role=tab]'));
    var scenes = Array.prototype.slice.call(demo.querySelectorAll('.scene'));
    var tpl = scenes.map(function (s) { return s.innerHTML; });
    var cursor = demo.querySelector('[data-cursor]');
    var toastEl = demo.querySelector('[data-toast]');
    var CANCEL = {};
    var runId = 0, cur = 0, visible = false, clock = 0, started = false;
    var dur = [11000, 7500, 9500, 8500, 7500];   // 第一遍演完后换成实际时长（进度条用）
    var instant = reduce;                          // 「减少动态效果」：直接显示每一段的最后样子
    var playing = function () { return visible && !document.hidden; };
    var yuan = function (n) { return '¥' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };

    var wait = function (ms, id) {
      if (instant) return id === runId ? Promise.resolve() : Promise.reject(CANCEL);
      return new Promise(function (res, rej) {
        var left = ms, last = performance.now();
        var f = function (now) {
          if (id !== runId) return rej(CANCEL);
          var dt = Math.min(now - last, 100); last = now;
          if (playing()) { left -= dt; clock += dt; }   // 滚出视野、切到后台就停在原地
          if (left <= 0) res(); else requestAnimationFrame(f);
        };
        requestAnimationFrame(f);
      });
    };
    var place = function (el, dx, dy) {
      var r = el.getBoundingClientRect(), d = demo.getBoundingClientRect();
      cursor.style.transform = 'translate(' + (r.left - d.left + r.width * dx) + 'px,' + (r.top - d.top + r.height * dy) + 'px)';
    };
    var api = function (id, root) {
      var a = {
        $: function (k) { return root.querySelector('[data-k="' + k + '"]'); },
        wait: function (ms) { return wait(ms, id); },
        move: function (el, dx, dy) { place(el, dx == null ? 0.55 : dx, dy == null ? 0.62 : dy); return wait(650, id); },
        click: function (el, dx, dy) {
          return a.move(el, dx, dy).then(function () {
            cursor.classList.remove('is-click'); void cursor.offsetWidth; cursor.classList.add('is-click');
            el.classList.add('is-press');
            return wait(150, id);
          }).then(function () { el.classList.remove('is-press'); return wait(120, id); });
        },
        type: function (input, text) {
          var v = input.querySelector('.d-val'), i = 0;
          input.classList.add('has-val');
          var next = function () {
            if (i >= text.length) return Promise.resolve();
            v.textContent += text[i++];
            return wait(120, id).then(next);
          };
          return next();
        },
        count: function (el, from, to, ms) {
          if (instant) { el.textContent = yuan(to); return Promise.resolve(); }
          var t = 0;
          var step = function () {
            t = Math.min(1, t + 16 / ms);
            el.textContent = yuan(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))));
            return t >= 1 ? Promise.resolve() : wait(16, id).then(step);
          };
          return step();
        },
        bump: function (el, text) { el.textContent = text; el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump'); },
        flash: function (el, text) { if (text != null) el.textContent = text; el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash'); },
        status: function (el, text, tone) { el.hidden = false; el.textContent = text; el.className = 'd-tag d-tag--' + tone + ' is-swap'; },
        toast: function (text) { toastEl.textContent = text; toastEl.classList.add('is-on'); },
        on: function (el) { el.classList.add('is-in'); },
      };
      return a;
    };

    var SCENES = [
      // 01 录单：选客户 → 明天起 3 天 → 打 FX3，附件和单价带出来 → 改成 2 台 → 保存
      function (a) {
        var cust = a.$('cust'), cd = a.$('custDrop'), eq = a.$('eq'), ed = a.$('eqDrop'), acc = a.$('acc').children;
        var chips = function (q) { for (var i = 0; i < acc.length; i++) acc[i].querySelector('b').textContent = '×' + acc[i].getAttribute('data-per') * q; };
        return a.wait(500)
          .then(function () { return a.click(cust, 0.3); })
          .then(function () { cust.classList.add('is-focus'); return a.type(cust, L('星河', 'Star')); })
          .then(function () { cd.classList.add('is-open'); return a.wait(650); })
          .then(function () { return a.click(cd.firstElementChild, 0.3); })
          .then(function () {
            cd.classList.remove('is-open'); cust.classList.remove('is-focus'); cust.classList.add('is-picked');
            cust.querySelector('.d-val').textContent = L('星河影视', 'Starlight Films'); return a.wait(350);
          })
          .then(function () { return a.click(a.$('q3')); })
          .then(function () { a.$('q3').classList.add('is-on'); a.flash(a.$('period'), L('10-20 周二 → 10-22 周四 · 共 3 天', 'Tue 10/20 → Thu 10/22 · 3 days')); return a.wait(500); })
          .then(function () { return a.click(eq, 0.3); })
          .then(function () { eq.classList.add('is-focus'); return a.type(eq, 'FX3'); })
          .then(function () { ed.classList.add('is-open'); return a.wait(600); })
          .then(function () { return a.click(ed.firstElementChild, 0.3); })
          .then(function () {
            ed.classList.remove('is-open'); eq.classList.remove('is-focus'); eq.querySelector('.d-val').textContent = L('索尼 FX3', 'Sony FX3');
            a.$('sub').textContent = '¥969.00';
            var i = 0;
            var pop = function () { if (i >= acc.length) return Promise.resolve(); acc[i++].classList.add('is-in'); return a.wait(180).then(pop); };
            return Promise.all([pop(), a.count(a.$('total'), 0, 969, 500)]);
          })
          .then(function () { return a.wait(500); })
          .then(function () { return a.click(a.$('plus')); })
          .then(function () { a.bump(a.$('qty'), '2'); chips(2); a.$('sub').textContent = '¥1,938.00'; return a.count(a.$('total'), 969, 1938, 500); })
          .then(function () { return a.wait(600); })
          .then(function () { return a.click(a.$('save')); })
          .then(function () { a.status(a.$('status'), L('预订单', 'Booked'), 'cyan'); a.toast(L('订单 26100024 已创建', 'Order 26100024 created')); return a.wait(2000); });
      },
      // 02 出库：逐件扫码清点 → 出库，状态变成租赁中
      function (a) {
        var seq = [['i0', '26100004'], ['i0', '26100005'], ['i1', '26100012'], ['i2', '26109001'], ['i2', '26109001'], ['i2', '26109001'], ['i3', '26109002'], ['i3', '26109002']];
        var got = {}, beep = a.$('beep'), n = 0;
        var scan = function () {
          if (n >= seq.length) return Promise.resolve();
          var k = seq[n][0], li = a.$(k), need = +li.getAttribute('data-need');
          got[k] = (got[k] || 0) + 1; n++;
          beep.textContent = L('嘀 ', 'Beep ') + seq[n - 1][1]; beep.classList.add('is-on');
          li.querySelector('b').textContent = got[k] + '/' + need;
          li.classList.add('is-hit'); if (got[k] >= need) li.classList.add('is-done');
          a.$('n').textContent = n; a.$('bar').style.width = (n / seq.length * 100) + '%';
          return a.wait(430).then(function () { li.classList.remove('is-hit'); }).then(scan);
        };
        return a.wait(700).then(scan)
          .then(function () { beep.classList.remove('is-on'); return a.wait(400); })
          .then(function () { return a.click(a.$('go')); })
          .then(function () { a.status(a.$('status'), L('租赁中', 'Out'), 'blue'); a.toast(L('26100017 已出库 · 8 件', '26100017 checked out · 8 items')); return a.wait(2000); });
      },
      // 03 续租 2 天 → 追加出库一台监视器
      function (a) {
        var ext = a.$('ext'), btn = a.$('extBtn');
        return a.wait(600)
          .then(function () { return a.click(btn); })
          .then(function () { a.on(ext); return a.wait(450); })
          .then(function () { return a.click(a.$('e2')); })
          .then(function () { a.$('e2').classList.add('is-on'); a.on(a.$('extNote')); btn.textContent = L('续租到 10-23', 'Extend to 10/23'); btn.classList.remove('d-btn--ghost'); return a.wait(700); })
          .then(function () { return a.click(btn); })
          .then(function () {
            ext.classList.remove('is-in'); btn.textContent = L('续租', 'Extend'); btn.classList.add('d-btn--ghost');
            a.flash(a.$('period'), L('10-18 → 10-23 · 共 6 天', '10/18 → 10/23 · 6 days')); a.toast(L('已续租到 10-23', 'Extended to 10/23'));
            return a.count(a.$('total'), 21120, 31680, 700);
          })
          .then(function () { return a.wait(900); })
          .then(function () { toastEl.classList.remove('is-on'); return a.click(a.$('moreBtn')); })
          .then(function () { a.on(a.$('added')); a.toast(L('已追加出库 · 1 件', 'Added to order · 1 item')); return a.count(a.$('total'), 31680, 32428, 500); })
          .then(function () { return a.wait(2000); });
      },
      // 04 分批归还：扫码还回 12 件 → 收尾中 · 还剩 14 件
      function (a) {
        var beep = a.$('beep'), n = 0;
        var scan = function (code, fn) {
          return function () {
            beep.textContent = L('嘀 ', 'Beep ') + code; beep.classList.add('is-on'); fn(); n++;
            a.$('n').textContent = n; a.$('left').textContent = L('在外 ' + (26 - n) + ' 件', (26 - n) + ' still out');
            return a.wait(380);
          };
        };
        var p = a.wait(600)
          .then(scan('26100001', function () { a.$('u1').classList.add('is-on'); a.bump(a.$('s0'), '1'); }))
          .then(scan('26100002', function () { a.$('u2').classList.add('is-on'); a.bump(a.$('s0'), '2'); }));
        [1, 2, 3, 4, 5, 6].forEach(function (i) { p = p.then(scan('26109001', function () { a.bump(a.$('s1'), String(i)); })); });
        [1, 2, 3, 4].forEach(function (i) { p = p.then(scan('26109002', function () { a.bump(a.$('s2'), String(i)); })); });
        return p
          .then(function () { beep.classList.remove('is-on'); return a.wait(400); })
          .then(function () { return a.click(a.$('go')); })
          .then(function () { a.on(a.$('done')); a.toast(L('已归还 12 件 · 还剩 14 件在外', '12 returned · 14 still out')); return a.wait(2200); });
      },
      // 05 收尾款：记一笔微信 → 账平了，自动结清
      function (a) {
        var go = a.$('go');
        return a.wait(700)
          .then(function () { return a.click(go); })
          .then(function () { a.on(a.$('form')); go.textContent = L('确认记账', 'Record payment'); a.$('hint').textContent = L('记完应收 ¥0.00，自动结清', 'Balance → ¥0.00, auto-settles'); return a.wait(500); })
          .then(function () { return a.click(a.$('wx')); })
          .then(function () { a.$('wx').classList.add('is-on'); return a.wait(500); })
          .then(function () { return a.click(go); })
          .then(function () {
            a.$('form').classList.remove('is-in'); go.parentNode.style.display = 'none';
            a.$('owed').textContent = '¥0.00'; a.$('owedRow').classList.add('is-zero');
            return a.count(a.$('paid'), 900, 3000, 600);
          })
          .then(function () { a.status(a.$('status'), L('已结清', 'Settled'), 'green'); a.on(a.$('logNew')); a.toast(L('账已结平，订单自动结清', 'Paid in full — order settled')); return a.wait(2400); });
      },
    ];

    var tick = function () {
      var bar = tabs[cur].querySelector('.flow__bar');
      bar.style.setProperty('--p', String(Math.min(1, clock / dur[cur])));
      requestAnimationFrame(tick);
    };
    var run = function (i) {
      var id = ++runId;
      clock = 0;
      scenes[i].innerHTML = tpl[i];
      toastEl.classList.remove('is-on');
      cursor.style.transform = 'translate(' + demo.clientWidth * 0.72 + 'px,' + demo.clientHeight * 0.88 + 'px)';
      SCENES[i](api(id, scenes[i])).then(function () {
        if (instant) return;
        dur[i] = clock;
        return wait(400, id).then(function () { show((i + 1) % scenes.length); });
      }, function (e) { if (e !== CANCEL) throw e; });
    };
    var show = function (i) {
      tabs[cur].setAttribute('aria-selected', 'false');
      tabs[cur].querySelector('.flow__bar').style.setProperty('--p', '0');
      scenes[cur].classList.remove('is-active');
      cur = i;
      tabs[cur].setAttribute('aria-selected', 'true');
      scenes[cur].classList.add('is-active');
      // 手机上步骤是一排横滑的：把当前这步滑进来（只滑这一排，不动整页）
      var strip = tabs[0].parentNode;
      if (strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: Math.max(0, tabs[cur].offsetLeft - 16), behavior: reduce ? 'auto' : 'smooth' });
      run(cur);
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(i); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var n = (i + d + tabs.length) % tabs.length;
        tabs[n].focus(); show(n);
      });
    });
    if (instant) { visible = true; run(0); }
    else {
      requestAnimationFrame(tick);
      var startOnce = function () { if (!started) { started = true; run(0); } };
      if (canObserve) {
        new IntersectionObserver(function (entries) {
          visible = entries[0].isIntersecting;
          if (visible) startOnce();
        }, { threshold: 0.35 }).observe(demo);
      } else { visible = true; startOnce(); }
    }
  }

  // ---------- 价格页：算一算一年能省多少（库管人数 × 月薪 × 12 × 30%） ----------
  var calc = document.querySelector('[data-calc]');
  if (calc) {
    var inStaff = calc.querySelector('[data-calc-in="staff"]');
    var inSalary = calc.querySelector('[data-calc-in="salary"]');
    var out = calc.querySelector('[data-calc-out="save"]');
    var fmt = function (n) { return Math.round(n).toLocaleString('en-US'); };
    var update = function () {
      var staff = Math.max(0, Math.min(99, +inStaff.value || 0));
      var salary = Math.max(0, +inSalary.value || 0);
      out.textContent = fmt(staff * salary * 12 * 0.3);
    };
    calc.addEventListener('input', update);
    calc.addEventListener('click', function (e) {
      var b = e.target.closest('[data-calc-inc], [data-calc-dec]');
      if (!b) return;
      e.preventDefault();
      var v = (+inStaff.value || 0) + (b.hasAttribute('data-calc-inc') ? 1 : -1);
      inStaff.value = String(Math.max(1, Math.min(20, v)));
      update();
    });
    update();
  }

  var y = document.querySelector('[data-year]');
  if (y) y.textContent = String(new Date().getFullYear());
})();
