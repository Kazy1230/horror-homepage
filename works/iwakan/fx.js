// 「最近、違和感を感じるんです」専用の視覚演出部品。window.CX として script.js から使う。
// 共通ライブラリ HorrorFX には入れず、この作品だけで使う仕掛け（防犯カメラ映像・天井・暗がりの目・まぶた・録画ランプ）。

(function () {
  "use strict";

  const pad = (n) => String(n).padStart(2, "0");
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function div(cls, html) {
    const el = document.createElement("div");
    el.className = cls;
    if (html) el.innerHTML = html;
    document.body.appendChild(el);
    return el;
  }

  function fmtStamp(d) {
    return d.getFullYear() + "/" + pad(d.getMonth() + 1) + "/" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }

  /* ---------------- 録画ランプ（読んでいる側の端末の時刻が、そのまま録画時刻になる） ---------------- */
  const HUD = {
    el: null,
    timer: null,
    ensure() {
      if (this.el) return this.el;
      this.el = div("cx-hud", '<span class="cx-hud__dot"></span><span class="cx-hud__label">REC</span><span class="cx-hud__time"></span>');
      this.tick();
      this.timer = setInterval(() => this.tick(), 500);
      return this.el;
    },
    tick() {
      if (!this.el) return;
      this.el.querySelector(".cx-hud__time").textContent = fmtStamp(new Date());
    },
    on({ live = false } = {}) {
      const el = this.ensure();
      el.classList.toggle("is-live", live);
      el.querySelector(".cx-hud__label").textContent = live ? "LIVE" : "REC";
      void el.offsetWidth;
      el.classList.add("is-on");
    },
    off() {
      if (this.el) this.el.classList.remove("is-on");
    },
    glitch() {
      if (!this.el) return;
      this.el.classList.remove("is-glitch");
      void this.el.offsetWidth;
      this.el.classList.add("is-glitch");
    },
  };

  /* ---------------- 防犯カメラの映像（写真を暗視カメラ風に加工した“コマ”を切り替える） ---------------- */
  const FRAME_DIR = "assets/cam/cam-";
  const FRAMES = [
    "room-closed", "room-ajar", "room-open", "room-arm", "room-ghost", "room-ghost2",
    "room-stand", "room-stare", "room-empty", "kitchen", "genkan", "genkan-ghost", "new-empty",
  ];

  const Cam = {
    el: null,
    view: null,
    stage: null,
    dim: null,
    grainTimer: null,
    clock: null,
    clockTimer: null,
    ensure() {
      if (this.el) return this.el;
      this.dim = div("cx-cam-dim");
      this.el = div(
        "cx-cam",
        '<div class="cx-cam__view"><div class="cx-cam__stage">' +
          FRAMES.map((f) => '<img class="cx-cam__frame" data-f="' + f + '" src="' + FRAME_DIR + f + '.jpg" alt="">').join("") +
          '</div><canvas class="cx-cam__grain" width="160" height="100"></canvas>' +
          '<div class="cx-cam__roll"></div><div class="cx-cam__vig"></div></div>' +
          '<div class="cx-cam__hud"><span class="cx-cam__rec"><i></i><b>REC</b> <em class="cx-cam__label">CAM 01</em></span><span class="cx-cam__ts"></span></div>' +
          '<div class="cx-cam__sig">NO SIGNAL</div>'
      );
      this.el.setAttribute("aria-hidden", "true");
      this.view = this.el.querySelector(".cx-cam__view");
      this.stage = this.el.querySelector(".cx-cam__stage");
      this.canvas = this.el.querySelector(".cx-cam__grain");
      this.g = this.canvas.getContext("2d");
      this.ts = this.el.querySelector(".cx-cam__ts");
      return this.el;
    },
    startGrain() {
      if (this.grainTimer) return;
      const w = this.canvas.width;
      const h = this.canvas.height;
      const draw = () => {
        const img = this.g.createImageData(w, h);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const v = (Math.random() * 255) | 0;
          d[i] = v * 0.75;
          d[i + 1] = v;
          d[i + 2] = v * 0.75;
          d[i + 3] = Math.random() < 0.2 ? 70 : 0;
        }
        this.g.putImageData(img, 0, 0);
      };
      draw();
      this.grainTimer = setInterval(draw, 90);
    },
    stopGrain() {
      clearInterval(this.grainTimer);
      this.grainTimer = null;
    },
    // 時計：clock が null なら端末の現在時刻、{h,m,s,rate} なら録画時刻（rate倍速で進む）
    setClock(clock) {
      this.clock = clock ? { base: clock.h * 3600 + clock.m * 60 + clock.s, t0: performance.now(), rate: clock.rate || 1 } : null;
      clearInterval(this.clockTimer);
      const upd = () => {
        const now = new Date();
        let text;
        if (this.clock) {
          const sec = Math.floor(this.clock.base + ((performance.now() - this.clock.t0) / 1000) * this.clock.rate) % 86400;
          text = now.getFullYear() + "/" + pad(now.getMonth() + 1) + "/" + pad(now.getDate()) + " " + pad(Math.floor(sec / 3600)) + ":" + pad(Math.floor((sec % 3600) / 60)) + ":" + pad(sec % 60);
        } else {
          text = fmtStamp(now);
        }
        this.ts.textContent = text;
      };
      upd();
      this.clockTimer = setInterval(upd, 250);
    },
    // コマを切り替える。jolt:true なら、切り替わりでブレる（映像が飛んだ感じ）
    frame(name, { jolt = false } = {}) {
      this.ensure();
      this.stage.querySelectorAll(".cx-cam__frame").forEach((im) => im.classList.toggle("is-on", im.dataset.f === name));
      if (jolt) {
        this.el.classList.remove("is-jolt");
        void this.el.offsetWidth;
        this.el.classList.add("is-jolt");
      }
    },
    label(text) {
      this.el.querySelector(".cx-cam__label").textContent = text;
    },
    reset() {
      this.unzoom();
      this.el.classList.remove("is-lost", "is-cut", "is-jolt");
    },
    show({ big = false, frame = "room-closed", label = "CAM 01", clock = null, dim = true } = {}) {
      this.ensure();
      this.reset();
      this.frame(frame);
      this.label(label);
      this.setClock(clock);
      this.startGrain();
      this.el.classList.toggle("is-big", big);
      this.dim.classList.toggle("is-on", big && dim);
      void this.el.offsetWidth;
      this.el.classList.add("is-on");
    },
    hide() {
      if (!this.el) return;
      this.el.classList.remove("is-on");
      this.dim.classList.remove("is-on");
      setTimeout(() => {
        if (!this.el.classList.contains("is-on")) this.stopGrain();
      }, 700);
    },
    // 小窓 ⇄ 画面いっぱい。位置と大きさを滑らかに繋ぐ（FLIP）
    morph(big, { dim = true } = {}) {
      this.ensure();
      const el = this.el;
      if (el.classList.contains("is-big") === big) return;
      const first = el.getBoundingClientRect();
      el.classList.toggle("is-big", big);
      this.dim.classList.toggle("is-on", big && dim);
      if (!el.animate || reduceMotion || !el.classList.contains("is-on")) return;
      const last = el.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      const sx = first.width / last.width;
      el.animate(
        [
          { transformOrigin: "0 0", transform: "translate(" + dx + "px," + dy + "px) scale(" + sx + ")" },
          { transformOrigin: "0 0", transform: "none" },
        ],
        { duration: 900, easing: "cubic-bezier(.6,0,.2,1)" }
      );
    },
    zoom({ x = 30, y = 30, scale = 2.4, ms = 9000 } = {}) {
      this.stage.style.setProperty("--zx", x + "%");
      this.stage.style.setProperty("--zy", y + "%");
      this.stage.style.setProperty("--zt", ms + "ms");
      this.stage.style.transform = "scale(" + scale + ")";
    },
    unzoom() {
      if (!this.stage) return;
      this.stage.style.setProperty("--zt", "0s");
      this.stage.style.transform = "";
    },
    // 映像が一瞬途切れる（ブツッ）
    async cut(ms = 160) {
      this.el.classList.add("is-cut");
      await wait(ms);
      this.el.classList.remove("is-cut");
    },
    lost() {
      this.el.classList.add("is-lost");
    },
  };

  /* ---------------- 天井（剥がれた漆喰の写真。シミ・点検口・通気口） ---------------- */
  const Ceiling = {
    el: null,
    ensure() {
      if (this.el) return this.el;
      const dir = "assets/cam/";
      this.el = div(
        "cx-ceiling",
        ["plain", "closed", "ajar", "open", "vent"].map((n) => '<img class="cx-ceiling__img im-' + n + '" src="' + dir + "ceil-" + n + '.jpg" alt="">').join("") +
          '<img class="cx-ceiling__stain" src="' + dir + 'stain.png" alt="">' +
          '<img class="cx-ceiling__stain-face" src="' + dir + 'stain-face.png" alt="">' +
          '<div class="cx-ceiling__beam"></div>'
      );
      return this.el;
    },
    set(flags) {
      this.ensure();
      Object.entries(flags).forEach(([k, v]) => this.el.classList.toggle(k, !!v));
    },
    // 本文を読む邪魔にならないよう、hideAfter ms 経つと天井は消える
    show(flags = {}, hideAfter = 15000) {
      this.set(flags);
      void this.el.offsetWidth;
      this.el.classList.add("is-on");
      clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(() => this.hide(), hideAfter);
    },
    hide() {
      if (this.el) this.el.classList.remove("is-on");
    },
    // 天井写真の中の、点検口（kind "hatch"）や通気口（"vent"）の中心を、画面上の座標で返す
    center(kind = "hatch") {
      this.ensure();
      const r = this.el.getBoundingClientRect();
      const scale = Math.max(r.width / 1280, r.height / 427);
      const offY = (427 * scale - r.height) * 0.3;
      const cy = (kind === "vent" ? 210 : 225) * scale - offY;
      return { x: r.left + r.width / 2, y: r.top + cy, w: (kind === "vent" ? 380 : 210) * scale };
    },
    // 懐中電灯の光が、点検口のあたりをゆっくり舐めるように動く
    sweep(ms = 6000) {
      this.ensure();
      const beam = this.el.querySelector(".cx-ceiling__beam");
      this.el.classList.add("is-beam");
      if (beam.animate && !reduceMotion) {
        const w = window.innerWidth;
        const dx = Math.min(200, w * 0.28);
        beam.animate(
          [
            { transform: "translate(" + -dx + "px,-10px)" },
            { transform: "translate(" + dx * 0.4 + "px,30px)" },
            { transform: "translate(" + dx + "px,0)" },
            { transform: "translate(" + -dx * 0.3 + "px,40px)" },
            { transform: "translate(0,10px)" },
          ],
          { duration: ms, easing: "ease-in-out" }
        );
      }
      return wait(ms).then(() => this.el.classList.remove("is-beam"));
    },
  };

  /* ---------------- 暗がりの目（写真の目が、暗闇にぼうっと浮かぶ） ---------------- */
  async function eyes({ x = "50%", y = "12%", ms = 1800, near = false, blinks = 1, width } = {}) {
    const el = div("cx-eyes");
    el.style.left = x;
    el.style.top = y;
    if (width) el.style.setProperty("--ew", width + "px");
    el.classList.toggle("is-near", near);
    void el.offsetWidth;
    el.classList.add("is-on");
    const slot = ms / (blinks + 1);
    for (let i = 0; i < blinks; i++) {
      await wait(slot);
      el.classList.add("is-blink");
      await wait(130);
      el.classList.remove("is-blink");
    }
    await wait(slot);
    el.classList.remove("is-on");
    await wait(400);
    el.remove();
  }

  /* ---------------- まぶた ---------------- */
  const Lids = {
    top: null,
    bottom: null,
    ensure() {
      if (this.top) return;
      this.top = div("cx-lid cx-lid--top");
      this.bottom = div("cx-lid cx-lid--bottom");
    },
    close(ms = 3200) {
      this.ensure();
      [this.top, this.bottom].forEach((l) => l.style.setProperty("--cx-lid-t", ms + "ms"));
      void this.top.offsetWidth;
      this.top.classList.add("is-closed");
      this.bottom.classList.add("is-closed");
      return wait(ms);
    },
    open(ms = 180) {
      this.ensure();
      [this.top, this.bottom].forEach((l) => l.style.setProperty("--cx-lid-t", ms + "ms"));
      this.top.classList.remove("is-closed");
      this.bottom.classList.remove("is-closed");
      return wait(ms);
    },
  };

  /* ---------------- 本文を冷やす／濁らせる ---------------- */
  function cold(on, ms = 0) {
    if (!document.querySelector(".cx-cold-ov")) div("cx-cold-ov");
    document.body.classList.toggle("cx-cold", on);
    if (on && ms) setTimeout(() => document.body.classList.remove("cx-cold"), ms);
  }
  function stale(on, ms = 0) {
    document.body.classList.toggle("cx-stale", on);
    if (on && ms) setTimeout(() => document.body.classList.remove("cx-stale"), ms);
  }

  // 点検口／通気口の暗がりの中に、目を浮かべる
  function eyesIn(kind, opts = {}) {
    const c = Ceiling.center(kind);
    return eyes({ x: c.x + "px", y: c.y + "px", width: Math.round(c.w * 0.92), ...opts });
  }

  window.CX = { HUD, Cam, Ceiling, Lids, eyes, eyesIn, cold, stale, wait };
})();
