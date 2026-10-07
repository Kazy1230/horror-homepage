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

  /* ---------------- 防犯カメラの映像 ---------------- */
  function figureSVG() {
    return (
      '<g class="c-fig">' +
      '<path d="M-8,-48 L-7,-3 L-2,-3 L0,-40 L2,-40 L3,-3 L8,-3 L8,-48 Z" fill="#0a130c"/>' +
      '<path d="M-12,-102 C-16,-92 -16,-64 -12,-44 L12,-44 C16,-64 16,-92 12,-102 Z" fill="#0c170f"/>' +
      '<path d="M-12,-99 C-21,-80 -23,-52 -20,-26" stroke="#0c170f" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M12,-99 C21,-80 22,-50 19,-22" stroke="#0c170f" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<circle cx="-20" cy="-23" r="3.6" fill="#a9c9a3"/><circle cx="19" cy="-19" r="3.6" fill="#a9c9a3"/>' +
      '<g transform="translate(0,-110)"><g class="c-head">' +
      '<ellipse cx="0" cy="0" rx="7.5" ry="9.5" fill="#a9c9a3"/>' +
      '<path d="M-9.5,-3 C-12,-16 12,-16 9.5,-3 C13,8 12,24 8,38 L4.5,25 L1,40 L-2.5,25 L-6.5,38 L-10.5,24 C-13,10 -10,4 -9.5,-3 Z" fill="#060c08"/>' +
      '<path d="M-1.2,-6 C-0.4,-2 -0.4,3 -1.2,7" stroke="#a9c9a3" stroke-width="1.6" fill="none" opacity="0.65"/>' +
      '<g class="c-eyes"><circle cx="-3.2" cy="-1" r="1.7" fill="#f3fff1"/><circle cx="3.4" cy="-1" r="1.7" fill="#f3fff1"/></g>' +
      "</g></g></g>"
    );
  }

  function cameraSVG() {
    return (
      '<svg class="cx-cam__svg" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice">' +
      "<defs>" +
      '<linearGradient id="cxWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#335a40"/><stop offset="1" stop-color="#4c7a58"/></linearGradient>' +
      '<linearGradient id="cxFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d6a49"/><stop offset="1" stop-color="#233f2d"/></linearGradient>' +
      '<radialGradient id="cxFridgeL" cx="0.15" cy="0.5" r="1"><stop offset="0" stop-color="#eaffea" stop-opacity="0.7"/><stop offset="1" stop-color="#eaffea" stop-opacity="0"/></radialGradient>' +
      "</defs>" +
      '<rect width="320" height="200" fill="url(#cxWall)"/>' +
      '<polygon points="0,126 320,126 320,200 0,200" fill="url(#cxFloor)"/>' +
      '<line x1="0" y1="126" x2="320" y2="126" stroke="#0b160f" stroke-width="2.5"/>' +
      // 玄関
      '<g class="c-genkan">' +
      '<rect x="116" y="22" width="88" height="106" fill="#42704d" stroke="#0b160f" stroke-width="3"/>' +
      '<circle cx="160" cy="62" r="3" fill="#0a120c"/><rect x="190" y="76" width="6" height="14" rx="2" fill="#7da588"/>' +
      '<rect x="96" y="106" width="128" height="3" fill="#0b160f"/>' +
      '<ellipse cx="132" cy="160" rx="14" ry="5" fill="#0a120c"/><ellipse cx="174" cy="166" rx="15" ry="5" fill="#0a120c"/>' +
      "</g>" +
      // キッチン
      '<g class="c-kitchen">' +
      '<rect x="8" y="30" width="52" height="108" fill="#e6ffe6" opacity="0.9" class="c-fridge-light"/>' +
      '<polygon points="60,30 150,40 150,126 60,138" fill="url(#cxFridgeL)" class="c-fridge-light"/>' +
      '<rect x="8" y="30" width="52" height="108" fill="#0d1a11"/>' +
      '<g class="c-fridge-door"><rect x="8" y="30" width="52" height="108" fill="#5b8c68" stroke="#0b160f" stroke-width="2"/><line x1="8" y1="66" x2="60" y2="66" stroke="#0b160f" stroke-width="1.5"/><rect x="50" y="42" width="3" height="18" fill="#86ad90"/><rect x="50" y="76" width="3" height="26" fill="#86ad90"/></g>' +
      '<rect x="60" y="100" width="40" height="30" fill="#3c6747"/><rect x="60" y="98" width="40" height="4" fill="#5a8a66"/>' +
      "</g>" +
      // クローゼット
      '<g class="c-closet">' +
      '<rect x="244" y="24" width="64" height="116" fill="#050a07" stroke="#0b160f" stroke-width="2"/>' +
      '<rect x="252" y="30" width="3" height="46" fill="#27422f"/><rect x="266" y="30" width="3" height="52" fill="#27422f"/><path d="M252,30 L290,30" stroke="#1d3223" stroke-width="2"/>' +
      '<g class="c-door"><rect x="244" y="24" width="64" height="116" fill="#5a8a66" stroke="#0b160f" stroke-width="2"/><rect x="252" y="32" width="48" height="100" fill="none" stroke="#3d6a49" stroke-width="1.5"/><rect x="249" y="78" width="3.5" height="16" rx="1.5" fill="#86ad90"/></g>' +
      "</g>" +
      // 腕（扉の隙間から）
      '<path class="c-arm" d="M248,92 C236,100 222,112 208,132" stroke="#a9c9a3" stroke-width="4.2" fill="none" stroke-linecap="round"/>' +
      '<g class="c-hand" stroke="#a9c9a3" stroke-width="1.6" stroke-linecap="round" fill="none"><circle cx="208" cy="133" r="3.4" fill="#a9c9a3"/><path d="M206,135 L199,144"/><path d="M208,136 L204,147"/><path d="M210,136 L209,148"/><path d="M212,134 L215,145"/></g>' +
      // ベッドと眠る人
      '<g class="c-bed"><rect x="102" y="116" width="130" height="62" fill="#4d7d5a"/><rect x="102" y="116" width="130" height="8" fill="#6a9a77"/><rect x="108" y="124" width="36" height="14" rx="4" fill="#7fae8b"/></g>' +
      '<g class="c-sleeper"><ellipse cx="128" cy="132" rx="9" ry="7" fill="#8dad8a"/><path d="M120,128 C122,121 136,121 138,129 C132,126 124,127 120,128 Z" fill="#0d1a11"/><path d="M134,134 C150,124 196,128 224,146 L224,170 L134,170 Z" fill="#3a6446"/><path d="M140,138 C160,132 196,136 214,148" stroke="#6a9a77" stroke-width="2" fill="none"/></g>' +
      figureSVG() +
      // 玄関の“何か”（一瞬だけ映る）
      '<g class="c-ghost" transform="translate(160,128)"><path d="M-9,-92 C-13,-80 -13,-56 -10,-34 L-7,0 L-2,0 L0,-30 L2,-30 L3,0 L8,0 L10,-34 C13,-56 13,-80 9,-92 C6,-100 -6,-100 -9,-92 Z" fill="#cfe8cb"/></g>' +
      "</svg>"
    );
  }

  const Cam = {
    el: null,
    view: null,
    dim: null,
    grainTimer: null,
    clock: null,
    clockTimer: null,
    ensure() {
      if (this.el) return this.el;
      this.dim = div("cx-cam-dim");
      this.el = div(
        "cx-cam",
        '<div class="cx-cam__view">' +
          cameraSVG() +
          '<canvas class="cx-cam__grain" width="160" height="100"></canvas>' +
          '<div class="cx-cam__roll"></div><div class="cx-cam__vig"></div></div>' +
          '<div class="cx-cam__hud"><span class="cx-cam__rec"><i></i><b>REC</b> <em class="cx-cam__label">CAM 01</em></span><span class="cx-cam__ts"></span></div>' +
          '<div class="cx-cam__sig">NO SIGNAL</div>'
      );
      this.el.setAttribute("aria-hidden", "true");
      this.view = this.el.querySelector(".cx-cam__view");
      this.canvas = this.el.querySelector(".cx-cam__grain");
      this.g = this.canvas.getContext("2d");
      this.ts = this.el.querySelector(".cx-cam__ts");
      this.setScene("room");
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
          d[i + 3] = Math.random() < 0.2 ? 80 : 0;
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
    setScene(scene, label) {
      this.el.dataset.scene = scene;
      if (label) this.el.querySelector(".cx-cam__label").textContent = label;
    },
    set(attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (v == null) delete this.el.dataset[k];
        else this.el.dataset[k] = v;
      });
    },
    reset() {
      ["door", "arm", "pose", "look", "fridge", "ghost"].forEach((k) => delete this.el.dataset[k]);
      this.unzoom();
      this.el.classList.remove("is-lost", "is-cut");
    },
    show({ big = false, scene = "room", label = "CAM 01", clock = null, dim = true } = {}) {
      this.ensure();
      this.reset();
      this.setScene(scene, label);
      this.setClock(clock);
      this.startGrain();
      this.el.classList.toggle("is-big", big);
      if (big && dim) this.dim.classList.add("is-on");
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
    zoom({ x = 30, y = 36, scale = 2.6, ms = 9000 } = {}) {
      const svg = this.view.querySelector(".cx-cam__svg");
      svg.style.setProperty("--zx", x + "%");
      svg.style.setProperty("--zy", y + "%");
      svg.style.setProperty("--zt", ms + "ms");
      svg.style.transform = "scale(" + scale + ")";
    },
    unzoom() {
      if (!this.view) return;
      const svg = this.view.querySelector(".cx-cam__svg");
      svg.style.setProperty("--zt", "0s");
      svg.style.transform = "";
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

  /* ---------------- 天井 ---------------- */
  const Ceiling = {
    el: null,
    ensure() {
      if (this.el) return this.el;
      this.el = div(
        "cx-ceiling",
        '<div class="cx-ceiling__stain"><i></i><i></i><b></b></div>' +
          '<div class="cx-ceiling__hatch"><div class="cx-ceiling__dark"></div></div>' +
          '<div class="cx-ceiling__vent"></div>' +
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
    // 懐中電灯の光が、点検口のあたりをゆっくり舐めるように動く
    sweep(ms = 6000) {
      this.ensure();
      const beam = this.el.querySelector(".cx-ceiling__beam");
      this.el.classList.add("is-beam");
      if (beam.animate && !reduceMotion) {
        const w = window.innerWidth;
        const dx = Math.min(180, w * 0.25);
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

  /* ---------------- 暗がりの目 ---------------- */
  async function eyes({ x = "50%", y = "12%", ms = 1800, near = false, blinks = 1 } = {}) {
    const el = div("cx-eyes", "<i></i><i></i>");
    el.style.left = x;
    el.style.top = y;
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

  /* ---------------- 最後の黒画面と一言 ---------------- */
  const Last = {
    el: null,
    show(text) {
      if (!this.el) this.el = div("cx-last", "<span></span>");
      this.el.querySelector("span").textContent = text;
      void this.el.offsetWidth;
      this.el.classList.add("is-on");
      setTimeout(() => this.el.classList.add("is-text"), 700);
    },
    hide(ms = 1200) {
      if (!this.el) return;
      this.el.style.transition = "opacity " + ms + "ms ease";
      this.el.classList.remove("is-on", "is-text");
    },
  };

  window.CX = { HUD, Cam, Ceiling, Lids, Last, eyes, cold, stale, wait };
})();
