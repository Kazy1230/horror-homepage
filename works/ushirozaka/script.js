// 「後坂」の演出。共通処理は ../../common/horror.js の HorrorFX を使う。
//
// 本文の <p> に class="scene-trigger" data-scene="名前" が付いていると、その段落が画面の中央に来たとき、
// 下の scenes[名前] が走る。class="slow-reveal" は一文字ずつ現れる（data-scene があれば、その場面も同時に走る）。
// <body> の data-bgm / data-river / data-page で、ページごとの音を決める。
//
// この作品の仕掛け：足音は、いつも「後ろ」から聞こえる。上へスクロールして読み返す（＝振り向く）と、何かが起こる。

const A = "assets/";
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (a, b) => a + Math.random() * (b - a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const S = (name, opts) => HorrorFX.playSample(name, opts);

const BGM = {
  mansion: ["bgm-mansion.mp3", 0.22],
  creeping: ["bgm-creeping.mp3", 0.2],
  whispers: ["bgm-whispers.mp3", 0.2],
  entropy: ["bgm-entropy.mp3", 0.22],
  howl: ["bgm-howl.mp3", 0.2],
};

HorrorFX.registerSFX("bell", A + "sfx-bell.mp3");
[
  "sfx-bell", "sfx-step-wood", "sfx-step-zori", "sfx-step-boots", "sfx-step-boots2", "sfx-step-leather", "sfx-step-formal",
  "sfx-step-sneaker", "sfx-march", "sfx-crowd-walk", "sfx-murmur", "sfx-sob", "sfx-paper", "sfx-breath-a", "sfx-breath-b", "sfx-gravel",
  "sfx-pen", "sfx-whisper-a", "sfx-whisper-b", "sfx-boom", "sfx-beep", "sfx-dial", "sfx-static", "sfx-scare-b", "sfx-scare-d", "sfx-creaking",
].forEach((n) => HorrorFX.loadSample(n.replace("sfx-", ""), A + n + ".mp3"));

/* ---------------- 足音（種類ごとに、音源を切り替えて鳴らす） ---------------- */
const STEP_SETS = {
  zori: { files: ["sfx-step-zori"], kind: "light" },
  geta: { files: ["sfx-step-wood"], kind: "light" },
  boots: { files: ["sfx-step-boots", "sfx-step-boots2"], kind: "heavy" },
  leather: { files: ["sfx-step-leather", "sfx-step-formal"], kind: "light" },
  sneaker: { files: ["sfx-step-sneaker"], kind: "light" },
};
const KINDS = Object.keys(STEP_SETS);

// 足音を鳴らす。pan 0 ＝ 真後ろ、muffled ＝ 壁越しのようにこもらせる
function steps(kind, o = {}) {
  const set = STEP_SETS[kind];
  HorrorFX.setFootstepSamples({ steps: set.files.map((f) => A + f + ".mp3") });
  return HorrorFX.footsteps({ kind: set.kind, drag: false, creak: 0, jitter: 0.12, steps: 6, interval: 620, volume: 0.35, pan: 0, ...o });
}

// 大勢の足音。walkers 人ぶんが、それぞれの靴・歩幅・位置で、背後を歩く
async function crowd({ walkers = 4, count = 8, volume = 0.22, from = 1, to = 1, muffled = true, spread = 0.6, interval = 640, at = 0 } = {}) {
  const off = Math.floor(Math.random() * KINDS.length);
  for (let w = 0; w < walkers; w++) {
    steps(KINDS[(w + off) % KINDS.length], {
      steps: count, interval: interval * rand(0.82, 1.22), at: at + rand(0, 450), volume,
      fromVolume: from, toVolume: to, pan: rand(-spread, spread), muffled,
    });
    await sleep(25);
  }
}

// 何十人分もの息。すぐ後ろ、首筋のあたり
function breathCrowd(vol = 0.5) {
  [[-0.5, 0.85, "breath-a"], [0.0, 1.0, "breath-b"], [0.5, 1.15, "breath-a"], [0.15, 0.93, "breath-b"]].forEach(([pan, rate, n], i) => {
    S(n, { volume: vol * (i === 1 ? 1 : 0.7), pan, rate, wet: 0.25, lowpass: 3600, delay: i * 260 });
  });
}

/* ---------------- 赤い線（坂） ---------------- */
const SVGNS = "http://www.w3.org/2000/svg";
const Red = {
  front: null,
  back: null,
  ensure() {
    if (this.front) return;
    this.front = Object.assign(document.createElement("div"), { className: "us-red us-red--front" });
    this.back = Object.assign(document.createElement("div"), { className: "us-red us-red--back" });
    document.body.append(this.front, this.back);
  },
  // 座標は画面の%。ms で引かれ、hold のあいだ残り、fade で消える
  line({ x1, y1, x2, y2, ms = 3000, hold = 3500, fade = 1800, layer = "front", sheen = false, opacity = 1 } = {}) {
    this.ensure();
    const host = layer === "back" ? this.back : this.front;
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.style.setProperty("--ms", ms + "ms");
    svg.style.setProperty("--fade", fade + "ms");
    svg.style.opacity = opacity;
    const d = "M" + x1 + "," + y1 + " L" + x2 + "," + y2;
    ["core", "sheen"].forEach((cls) => {
      const p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", d);
      p.setAttribute("class", cls);
      p.setAttribute("pathLength", "1");
      svg.appendChild(p);
    });
    host.appendChild(svg);
    void svg.getBoundingClientRect();
    svg.classList.add("is-drawn");
    if (sheen) setTimeout(() => svg.classList.add("is-sheen"), ms * 0.85);
    setTimeout(() => {
      svg.classList.add("is-out");
      setTimeout(() => svg.remove(), fade + 150);
    }, ms + hold);
    return svg;
  },
  // 筆で一本引くときの音
  brush(len = 3) {
    S("pen", { volume: 0.4, offset: rand(0, 14), duration: len, wet: 0.3, pan: -0.1 });
    S("paper", { volume: 0.2, wet: 0.4, delay: 200 });
  },
  // 赤い線の欠片が、右から左へ、コマ送りのように這ってくる
  crawl({ steps: n = 7, ms = 500, y = 64, end = 8 } = {}) {
    const seg = Object.assign(document.createElement("div"), { className: "us-seg" });
    seg.style.top = y + "vh";
    seg.style.left = "104vw";
    document.body.appendChild(seg);
    void seg.offsetWidth;
    seg.classList.add("is-on");
    return new Promise((resolve) => {
      let i = 0;
      const tick = () => {
        i++;
        seg.style.left = 104 - (104 - end) * (i / n) + "vw";
        S("boom", { volume: 0.18 + i * 0.03, offset: 1.4, duration: 0.5, lowpass: 320, wet: 0.3, pan: 0.6 - (i / n) * 1.2 });
        if (i < n) setTimeout(tick, ms * rand(0.8, 1.3));
        else
          setTimeout(() => {
            seg.classList.remove("is-on");
            setTimeout(() => seg.remove(), 1500);
            resolve();
          }, 2200);
      };
      setTimeout(tick, ms);
    });
  },
  rim(ms = 3500) {
    let el = document.querySelector(".us-rim");
    if (!el) {
      el = Object.assign(document.createElement("div"), { className: "us-rim" });
      document.body.appendChild(el);
    }
    void el.offsetWidth;
    el.classList.add("is-on");
    setTimeout(() => el.classList.remove("is-on"), ms);
  },
};

/* ---------------- 日本地図（点が増え、線が伸び、最後に“私”へ届く） ---------------- */
const DOTS = [
  { x: 66, y: 15, label: "陸奥" },
  { x: 50, y: 42, label: "信濃" },
  { x: 40, y: 72, label: "紀伊" },
  { x: 62, y: 54, label: "", me: true },
];
const MapCard = {
  el: null,
  ensure() {
    if (this.el) return;
    const el = Object.assign(document.createElement("div"), { className: "us-map" });
    const pt = (i) => DOTS[i].x + "," + DOTS[i].y * 1.25;
    el.innerHTML =
      '<svg viewBox="0 0 100 125" preserveAspectRatio="none">' +
      '<path d="M' + pt(0) + " L" + pt(1) + '" pathLength="1"></path>' +
      '<path d="M' + pt(1) + " L" + pt(2) + '" pathLength="1"></path>' +
      '<path d="M' + pt(2) + " L" + pt(3) + '" pathLength="1"></path></svg>' +
      DOTS.map((d) => '<i class="us-dot' + (d.me ? " is-me" : "") + '" style="left:' + d.x + "%;top:" + d.y + '%"><span>' + d.label + "</span></i>").join("");
    document.body.appendChild(el);
    this.el = el;
    this.dots = [...el.querySelectorAll(".us-dot")];
    this.paths = [...el.querySelectorAll("path")];
  },
  show() {
    this.ensure();
    void this.el.offsetWidth;
    this.el.classList.add("is-on");
  },
  hide() {
    if (this.el) this.el.classList.remove("is-on");
  },
  async dots3() {
    this.show();
    for (let i = 0; i < 3; i++) {
      await sleep(900);
      this.dots[i].classList.add("is-on");
      S("beep", { volume: 0.22, rate: 0.8 + i * 0.1, wet: 0.2 });
      if (i > 0) this.paths[i - 1].classList.add("is-on");
    }
  },
  // 坂は、坂のことを知った人間に、ついていく：最後の点から“私”へ、そして画面の外（読んでいる人）へ
  async reach() {
    this.show();
    this.dots.forEach((d, i) => i < 3 && d.classList.add("is-on"));
    this.paths.slice(0, 2).forEach((p) => p.classList.add("is-on"));
    await sleep(700);
    this.dots[3].classList.add("is-on");
    this.paths[2].classList.add("is-on");
    S("boom", { volume: 0.6, offset: 1.4, duration: 0.8, lowpass: 400, wet: 0.4 });
    await sleep(1500);
    const r = this.dots[3].getBoundingClientRect();
    const fx = innerWidth > 50 ? ((r.left + r.width / 2) / innerWidth) * 100 : DOTS[3].x;
    const fy = innerHeight > 50 ? ((r.top + r.height / 2) / innerHeight) * 100 : DOTS[3].y;
    Red.line({ x1: fx, y1: fy, x2: 50, y2: 106, ms: 2600, hold: 3000, sheen: true });
    HorrorFX.heartbeat({ duration: 3600, bpm: 84, volume: 0.32 });
  },
};

/* ---------------- 窓ガラス（映り込みの中で、道が坂になっている） ---------------- */
const Glass = {
  el: null,
  ensure() {
    if (this.el) return this.el;
    this.el = Object.assign(document.createElement("div"), { className: "us-glass" });
    this.el.innerHTML =
      '<div class="us-glass__view"><div class="us-glass__base"></div><div class="us-glass__refl"></div>' +
      '<div class="us-glass__back"></div><div class="us-glass__bar"></div><div class="us-glass__gloss"></div></div>';
    document.body.appendChild(this.el);
    this.refl = this.el.querySelector(".us-glass__refl");
    return this.el;
  },
  show() {
    this.ensure();
    this.el.classList.remove("is-reveal");
    void this.el.offsetWidth;
    this.el.classList.add("is-on");
  },
  reveal() {
    this.ensure().classList.add("is-on", "is-reveal");
  },
  flick() {
    this.ensure();
    this.el.classList.remove("is-flick");
    void this.el.offsetWidth;
    this.el.classList.add("is-flick");
  },
  // 列の先頭（手前の人）へ、じわじわ寄っていく
  zoom(ms = 5000, scale = 2.1) {
    this.ensure();
    this.refl.style.setProperty("--zt", ms + "ms");
    this.refl.style.transform = "scaleX(-1) scale(" + scale + ")";
  },
  hide() {
    if (!this.el) return;
    this.el.classList.remove("is-on", "is-reveal");
    if (this.refl) {
      this.refl.style.setProperty("--zt", "0s");
      this.refl.style.transform = "";
    }
  },
};

/* ---------------- まぶた／冷え／一言／画面の隅の坂 ---------------- */
const Lids = {
  top: null,
  bottom: null,
  ensure() {
    if (this.top) return;
    this.top = Object.assign(document.createElement("div"), { className: "us-lid us-lid--top" });
    this.bottom = Object.assign(document.createElement("div"), { className: "us-lid us-lid--bottom" });
    document.body.append(this.top, this.bottom);
  },
  close(ms = 2200) {
    this.ensure();
    [this.top, this.bottom].forEach((l) => l.style.setProperty("--us-lid-t", ms + "ms"));
    void this.top.offsetWidth;
    this.top.classList.add("is-closed");
    this.bottom.classList.add("is-closed");
    return sleep(ms);
  },
  open(ms = 200) {
    this.ensure();
    [this.top, this.bottom].forEach((l) => l.style.setProperty("--us-lid-t", ms + "ms"));
    this.top.classList.remove("is-closed");
    this.bottom.classList.remove("is-closed");
    return sleep(ms);
  },
};

function cold(on, ms = 0) {
  if (!document.querySelector(".us-cold-ov")) document.body.appendChild(Object.assign(document.createElement("div"), { className: "us-cold-ov" }));
  document.body.classList.toggle("us-cold", on);
  if (on && ms) setTimeout(() => document.body.classList.remove("us-cold"), ms);
}

function toggleClass(cls, ms) {
  document.body.classList.add(cls);
  if (ms) setTimeout(() => document.body.classList.remove(cls), ms);
}

// 大きな一言（画面の中央に、赤く浮かぶ）
function word(text, ms = 2600) {
  const el = Object.assign(document.createElement("div"), { className: "us-word", textContent: text });
  document.body.appendChild(el);
  void el.offsetWidth;
  el.classList.add("is-on");
  setTimeout(() => {
    el.classList.remove("is-on");
    setTimeout(() => el.remove(), 1600);
  }, ms);
}

// 画面の隅に、坂の写真がぼんやり覗く
function peek({ corner = "tr", ms = 3600, opacity = 0.5 } = {}) {
  const el = Object.assign(document.createElement("div"), { className: "us-peek" });
  const pos = { tr: ["8vh", "auto", "auto", "2vw"], tl: ["8vh", "2vw", "auto", "auto"], br: ["auto", "auto", "6vh", "2vw"], bl: ["auto", "2vw", "6vh", "auto"] }[corner];
  [el.style.top, el.style.left, el.style.bottom, el.style.right] = pos;
  el.style.setProperty("--po", opacity);
  document.body.appendChild(el);
  void el.offsetWidth;
  el.classList.add("is-on");
  setTimeout(() => {
    el.classList.remove("is-on");
    setTimeout(() => el.remove(), 1800);
  }, ms);
}

function blackCut(ms = 700) {
  let el = document.querySelector(".us-black");
  if (!el) document.body.appendChild((el = Object.assign(document.createElement("div"), { className: "us-black" })));
  void el.offsetWidth;
  el.classList.add("is-on");
  return sleep(ms).then(() => el.classList.remove("is-on"));
}

// 群衆の写真を、一瞬だけ全画面に
function crowdFlash(ms = 380) {
  HorrorFX.jumpscare({ image: A + "crowd.jpg", sound: false, duration: ms });
  S("scare-d", { volume: 0.7, offset: 2.5, duration: 2, wet: 0.2 });
}

/* ---------------- 振り向く（＝上へスクロールして読み返す）と、何かが起こる ---------------- */
const Look = {
  level: 0,
  count: 0,
  lastY: 0,
  acc: 0,
  lastT: 0,
  cool: 0,
  arm(level) {
    this.level = Math.max(this.level, level);
    this.lastY = window.scrollY;
    this.acc = 0;
  },
  init() {
    this.lastY = window.scrollY;
    window.addEventListener(
      "scroll",
      () => {
        const y = window.scrollY;
        const now = performance.now();
        const dy = this.lastY - y;
        this.lastY = y;
        if (now - this.lastT > 900) this.acc = 0;
        this.lastT = now;
        if (dy > 0) this.acc += dy;
        else this.acc = 0;
        if (this.level > 0 && this.acc > 260 && now > this.cool) {
          this.acc = 0;
          this.cool = now + 26000;
          this.react(++this.count);
        }
      },
      { passive: true }
    );
  },
  async react(n) {
    // 足音が、ぴたりと止む。そして、すぐ真後ろで、一歩。
    HorrorFX.silence({ duration: 2600, visual: n > 1, restoreMs: 1800 });
    await sleep(900);
    steps("leather", { steps: 1, volume: 0.95, pan: 0, muffled: false });
    HorrorFX.haptic([70, 40, 70]);
    if (n === 1) return;
    await sleep(900);
    crowdFlash();
    HorrorFX.shake(document.body, { duration: 360, sound: false });
    S("whisper-a", { volume: 0.5, pan: 0, wet: 0.2, lowpass: 3600, delay: 200 });
    if (n === 2) return;
    await sleep(1800);
    HorrorFX.jumpscare({ image: A + "scare-man.jpg", sound: false, duration: 600 });
    S("scare-b", { volume: 0.9, wet: 0.1, duration: 3 });
    HorrorFX.haptic([160, 40, 260]);
  },
};

/* ---------------- 場面 ---------------- */
const scenes = {
  /* ============ 序・一　陸奥 ============ */
  "p1-truth"() {
    S("paper", { volume: 0.3, wet: 0.4 });
  },
  "p1-hint"() {
    Red.line({ x1: 12, y1: 92, x2: 60, y2: 34, ms: 1300, hold: 300, fade: 1400, opacity: 0.6 });
    S("boom", { volume: 0.3, offset: 1.4, duration: 0.7, lowpass: 300, wet: 0.5 });
  },
  "p1-bell"() {
    S("bell", { volume: 0.5, wet: 0.5 });
    HorrorFX.haptic(60);
  },
  "p1-hush"() {
    HorrorFX.silence({ duration: 2800, visual: false, restoreMs: 2500 });
  },
  "p1-redline"() {
    Red.brush(3.2);
    Red.line({ x1: 14, y1: 90, x2: 62, y2: 36, ms: 3400, hold: 5200, fade: 2600 });
  },
  "p1-warn"(el) {
    HorrorFX.glitchText(el, { duration: 1300 });
    HorrorFX.staticBurst({ duration: 220, volume: 0.35 });
    S("boom", { volume: 0.7, offset: 1.4, duration: 0.9, lowpass: 360, wet: 0.5 });
    HorrorFX.haptic([60, 60, 120]);
  },
  "p1-vivid"() {
    Red.rim(4200);
    HorrorFX.heartbeat({ duration: 3200, bpm: 66, volume: 0.22 });
  },
  "p1-sheen"() {
    Red.line({ x1: 14, y1: 90, x2: 62, y2: 36, ms: 1600, hold: 4200, fade: 2200, sheen: true });
    S("breath-b", { volume: 0.07, pan: 0.5, wet: 0.6, lowpass: 1500, delay: 1200 });
  },
  "p1-finger"() {
    HorrorFX.heartbeat({ duration: 2400, bpm: 72, volume: 0.25 });
  },
  "p1-up"() {
    // 百十二人が、坂を上っていく足音（遠く、だんだん高いほうへ）
    S("crowd-walk", { volume: 0.3, lowpass: 1500, wet: 0.7, duration: 9, rate: 0.9, pan: 0.4 });
  },
  async "p1-112"() {
    S("murmur", { volume: 0.2, lowpass: 900, wet: 0.7, duration: 6 });
    await sleep(5200);
    HorrorFX.silence({ duration: 2800, visual: false, restoreMs: 2500 });
  },
  async "p1-seen"() {
    HorrorFX.silence({ duration: 3400, visual: true, restoreMs: 2200 });
    await sleep(1500);
    steps("leather", { steps: 1, volume: 0.55, pan: 0, muffled: true });
    HorrorFX.haptic(50);
  },

  /* ============ 二　信濃 ============ */
  "p2-vanished"() {
    HorrorFX.silence({ duration: 3000, visual: true, restoreMs: 2400 });
  },
  async "p2-steps"() {
    steps("zori", { steps: 3, interval: 760, volume: 0.28, muffled: true });
    await sleep(3200);
    steps("geta", { steps: 4, interval: 640, volume: 0.3, muffled: true, pan: -0.15 });
    steps("zori", { steps: 4, interval: 700, volume: 0.28, muffled: true, pan: 0.2, at: 200 });
  },
  async "p2-tilt"() {
    S("creaking", { volume: 0.25, rate: 0.7, lowpass: 900, wet: 0.5 });
    toggleClass("us-tilt", 3600);
  },
  "p2-top"() {
    peek({ corner: "tr", ms: 4200, opacity: 0.5 });
    S("murmur", { volume: 0.12, lowpass: 700, wet: 0.7, duration: 4 });
  },
  "p2-face"() {
    HorrorFX.jumpscare({ image: A + "scare-man.jpg", sound: false, duration: 160 });
    S("whisper-b", { volume: 0.4, offset: 1.7, duration: 2.5, pan: -0.3, wet: 0.4, lowpass: 3000 });
  },
  "p2-cold"() {
    cold(true, 6500);
    S("breath-a", { volume: 0.14, pan: 0, wet: 0.4, lowpass: 1800, delay: 800, rate: 0.8 });
  },
  "p2-hirano"() {
    HorrorFX.silence({ duration: 2600, visual: false, restoreMs: 2000 });
  },
  async "p2-voicemail"() {
    S("dial", { volume: 0.35, offset: 0.4, duration: 3.4, wet: 0.3 });
    await sleep(3600);
    S("beep", { volume: 0.4, wet: 0.1 });
    await sleep(500);
    S("murmur", { volume: 0.13, lowpass: 700, duration: 2.6, wet: 0.5 });
    HorrorFX.staticBurst({ duration: 240, volume: 0.3 });
    await sleep(2600);
    HorrorFX.silence({ duration: 3000, visual: false, restoreMs: 2000 });
  },
  "p2-walk-away"() {
    // 夜の散歩に出たまま、足音が遠ざかり、ふっと消える
    steps("leather", { steps: 8, interval: 640, fromVolume: 0.55, toVolume: 0.04, pan: 0.35, panTo: -0.4, muffled: false });
  },

  /* ============ 三　紀伊 ============ */
  "p3-behind"() {
    HorrorFX.heartbeat({ duration: 2600, bpm: 62, volume: 0.22 });
    S("whisper-a", { volume: 0.16, pan: 0.7, wet: 0.5, lowpass: 2200, delay: 900 });
  },
  "p3-corridor"() {
    steps("boots", { steps: 6, interval: 920, volume: 0.42, pan: -0.6, panTo: 0.6, muffled: true });
    S("creaking", { volume: 0.2, rate: 0.8, lowpass: 1000, wet: 0.5, delay: 1800 });
  },
  "p3-begin"() {
    S("murmur", { volume: 0.1, lowpass: 600, wet: 0.7, duration: 8 });
    HorrorFX.heartbeat({ duration: 2600, bpm: 64, volume: 0.2 });
  },
  "p3-step1"() {
    steps("leather", { steps: 6, interval: 620, volume: 0.32, muffled: true });
  },
  "p3-step2"() {
    steps("leather", { steps: 6, interval: 600, volume: 0.36, muffled: true });
  },
  async "p3-two"() {
    steps("leather", { steps: 8, interval: 620, volume: 0.38, muffled: true, pan: -0.1 });
    steps("sneaker", { steps: 8, interval: 540, volume: 0.34, muffled: true, pan: 0.15, at: 280 });
  },
  "p3-map"() {
    S("paper", { volume: 0.3, wet: 0.4 });
    MapCard.show();
  },
  "p3-dots"() {
    MapCard.dots3();
  },
  "p3-follows"() {
    MapCard.reach();
  },
  async "p3-readall"() {
    cold(true, 7000);
    crowd({ walkers: 3, count: 7, volume: 0.2, muffled: true });
    await sleep(3200);
    MapCard.hide();
  },

  /* ============ 四　熊本 ============ */
  "p4-record"() {
    S("paper", { volume: 0.35, wet: 0.4 });
    HorrorFX.silence({ duration: 2200, visual: false, restoreMs: 2000 });
  },
  async "p4-tilt"() {
    S("creaking", { volume: 0.3, rate: 0.62, lowpass: 800, wet: 0.5 });
    document.body.style.setProperty("--tilt", "-5deg");
    toggleClass("us-tilt", 3800);
  },
  "p4-top"() {
    peek({ corner: "tl", ms: 4600, opacity: 0.55 });
  },
  "p4-grow"() {
    crowd({ walkers: 5, count: 8, volume: 0.24, from: 0.7, to: 1.2, muffled: true });
  },
  async "p4-k"() {
    // Ｋ氏は、一度も首を回さなかった：音が消え、カーソルも消え、ゆっくりした呼吸だけが近づく
    HorrorFX.silence({ duration: 5200, visual: false, restoreMs: 2500 });
    document.body.style.cursor = "none";
    await sleep(1500);
    S("breath-a", { volume: 0.3, rate: 0.7, pan: 0, wet: 0.15, lowpass: 2600 });
    setTimeout(() => (document.body.style.cursor = ""), 5600);
  },
  "p4-near"() {
    crowd({ walkers: 7, count: 8, volume: 0.3, from: 0.8, to: 1.5, muffled: false, spread: 0.7, interval: 560 });
    cold(true, 6000);
  },
  async "p4-count"() {
    // 一人。二人。……数えきれない。
    steps("leather", { steps: 3, interval: 700, volume: 0.45, muffled: true });
    await sleep(2400);
    steps("leather", { steps: 3, interval: 700, volume: 0.42, muffled: true, pan: -0.1 });
    steps("zori", { steps: 3, interval: 640, volume: 0.4, muffled: true, pan: 0.15, at: 200 });
    await sleep(2600);
    crowd({ walkers: 9, count: 5, volume: 0.32, muffled: false, spread: 0.8, interval: 480 });
  },
  "p4-presence"() {
    HorrorFX.heartbeat({ duration: 3200, bpm: 78, volume: 0.28 });
    cold(true, 6000);
  },
  "p4-dont"() {
    Look.arm(1);
    word("振り向くな", 3000);
    HorrorFX.silence({ duration: 3200, visual: false, restoreMs: 2400 });
    HorrorFX.haptic([60, 40, 60]);
  },
  "p4-ktop"() {
    peek({ corner: "tr", ms: 4800, opacity: 0.6 });
    S("whisper-b", { volume: 0.25, offset: 1.7, duration: 3, pan: 0.6, wet: 0.5, lowpass: 2400 });
  },
  "p4-last"() {
    S("boom", { volume: 0.9, offset: 1.4, duration: 1.2, lowpass: 420, wet: 0.5 });
    HorrorFX.silence({ duration: 3800, visual: true, restoreMs: 2600 });
    HorrorFX.haptic([120, 40, 200]);
  },
  "p4-suginami"() {
    HorrorFX.heartbeat({ duration: 3600, bpm: 90, volume: 0.3 });
    Red.line({ x1: 8, y1: 94, x2: 56, y2: 40, ms: 1500, hold: 500, fade: 1600, opacity: 0.7 });
  },
  "p4-river"() {
    const el = HorrorFX.playAmbience("river", A + "amb-river.mp3", { volume: 0.08, fadeMs: 4000 });
    return el;
  },

  /* ============ 五　東京 ============ */
  async "p5-anomaly"() {
    HorrorFX.staticBurst({ duration: 260, volume: 0.35 });
    [0, 280, 560].forEach((d) => S("beep", { volume: 0.22, rate: 1.4, wet: 0.1, delay: d }));
  },
  "p5-slope"() {
    Red.brush(3);
    Red.line({ x1: 16, y1: 90, x2: 58, y2: 38, ms: 2600, hold: 4200, fade: 2200 });
  },
  "p5-red"() {
    Red.rim(3600);
    S("whisper-a", { volume: 0.2, pan: 0.5, wet: 0.5, lowpass: 2200 });
  },
  async "p5-east"() {
    Red.crawl({ steps: 6, ms: 560, y: 64, end: 40 });
  },
  async "p5-crawl"() {
    // 五十年かけて、川沿いを西へ。足音が、右から左へ、近づく
    steps("geta", { steps: 8, interval: 760, volume: 0.3, fromVolume: 0.3, toVolume: 0.7, pan: 0.8, panTo: -0.1, muffled: true });
    Red.crawl({ steps: 7, ms: 620, y: 70, end: 6 });
  },
  "p5-behind"() {
    Look.arm(2);
    HorrorFX.heartbeat({ duration: 3600, bpm: 80, volume: 0.28 });
    Red.line({ x1: 50, y1: 106, x2: 50, y2: 30, ms: 2400, hold: 3600, fade: 2400, layer: "back" });
  },
  async "p5-behind2"() {
    // 坂は、遊歩道を歩いて帰る人間の、真後ろに来るように、伸びていた
    Red.line({ x1: 50, y1: 106, x2: 50, y2: 12, ms: 2200, hold: 2600, fade: 2200, sheen: true, opacity: 0.55 });
    cold(true, 7000);
    HorrorFX.silence({ duration: 3000, visual: false, restoreMs: 2200 });
    await sleep(3600);
    steps("leather", { steps: 6, interval: 620, volume: 0.32, muffled: true });
  },

  /* ============ 六 ============ */
  "p6-start"() {
    Look.arm(3);
    HorrorFX.playAmbience("river", A + "amb-river.mp3", { volume: 0.14, fadeMs: 5000 });
    steps("leather", { steps: 10, interval: 560, volume: 0.3, pan: 0, muffled: false });
  },
  "p6-gate"() {
    crowd({ walkers: 4, count: 9, volume: 0.2, muffled: true, spread: 0.5 });
  },
  async "p6-types"() {
    // 草履。下駄。軍靴。革靴。スニーカー。
    const order = [["zori", 0.5], ["geta", 0.5], ["boots", 0.55], ["leather", 0.5], ["sneaker", 0.5]];
    for (let i = 0; i < order.length; i++) {
      steps(order[i][0], { steps: 4, interval: 560, volume: order[i][1], pan: (i % 2 ? 0.2 : -0.2), muffled: false });
      await sleep(2300);
    }
    crowd({ walkers: 6, count: 7, volume: 0.3, muffled: false, spread: 0.6, interval: 520 });
  },
  "p6-above"() {
    // 少し高いところから、背中を見下ろすように
    S("crowd-walk", { volume: 0.4, lowpass: 7000, wet: 0.7, rate: 1.18, duration: 8 });
    S("march", { volume: 0.2, lowpass: 2600, wet: 0.8, duration: 7, pan: 0.2 });
  },
  "p6-path"() {
    HorrorFX.silence({ duration: 1300, visual: false, restoreMs: 900 });
    crowd({ walkers: 5, count: 8, volume: 0.28, muffled: false, interval: 560 });
  },
  "p6-approach"() {
    crowd({ walkers: 8, count: 7, volume: 0.34, from: 0.35, to: 1.6, muffled: false, spread: 0.55, interval: 500 });
    HorrorFX.heartbeat({ duration: 4200, bpm: 92, volume: 0.3 });
  },
  "p6-breath"() {
    breathCrowd(0.5);
    cold(true, 9000);
    HorrorFX.haptic([40, 60, 40, 60, 40]);
  },
  async "p6-called"() {
    HorrorFX.silence({ duration: 2200, visual: false, restoreMs: 1600 });
    await sleep(900);
    S("whisper-a", { volume: 0.6, pan: 0, wet: 0.18, lowpass: 3600, rate: 0.9 });
  },
  "p6-mother"() {
    S("sob", { volume: 0.16, pan: 0.5, wet: 0.5, lowpass: 2600, delay: 1500, duration: 7 });
  },
  "p6-mother2"() {
    HorrorFX.silence({ duration: 2000, visual: false, restoreMs: 2500 });
  },
  "p6-lastday"() {
    HorrorFX.silence({ duration: 3600, visual: true, restoreMs: 2800 });
  },
  async "p6-okaeri"() {
    S("whisper-b", { volume: 0.75, offset: 1.7, duration: 3.2, pan: 0, wet: 0.1, lowpass: 4200, rate: 0.95 });
    HorrorFX.heartbeat({ duration: 3600, bpm: 80, volume: 0.3 });
    HorrorFX.haptic([80, 50, 80]);
  },
  "p6-stop"() {
    HorrorFX.silence({ duration: 4800, visual: true, restoreMs: 2400 });
  },
  "p6-turning"() {
    // 体が、後ろへ回りかける：画面が、ゆっくりと横を向く
    document.body.classList.remove("us-turn-snap");
    document.body.classList.add("us-turn");
    S("creaking", { volume: 0.3, rate: 0.55, lowpass: 900, wet: 0.5 });
    HorrorFX.heartbeat({ duration: 4200, bpm: 100, volume: 0.32 });
  },
  async "p6-glass"() {
    document.body.classList.add("us-turn-snap");
    document.body.classList.remove("us-turn");
    Glass.show();
    S("boom", { volume: 0.4, offset: 1.4, duration: 0.6, lowpass: 400, wet: 0.4 });
  },
  async "p6-reflect"() {
    Glass.reveal();
    S("scare-d", { volume: 0.8, offset: 2.5, duration: 3, wet: 0.2 });
    S("boom", { volume: 0.7, offset: 1.4, duration: 1, lowpass: 500, wet: 0.3 });
    HorrorFX.shake(document.body, { duration: 420, sound: false });
    HorrorFX.haptic([160, 40, 240]);
  },
  "p6-beckon"() {
    Glass.zoom(6000, 1.5);
    S("murmur", { volume: 0.16, lowpass: 900, wet: 0.6, duration: 7 });
  },
  "p6-mother-front"() {
    Glass.zoom(6000, 2.4);
    HorrorFX.heartbeat({ duration: 4200, bpm: 88, volume: 0.28 });
  },
  "p6-miura"() {
    Glass.flick();
    HorrorFX.haptic(80);
  },
  "p6-cry"() {
    S("sob", { volume: 0.6, pan: 0, wet: 0.2, lowpass: 4200, duration: 9 });
  },
  "p6-gomen"(el) {
    HorrorFX.glitchText(el, { duration: 900 });
    Glass.flick();
    S("whisper-a", { volume: 0.5, rate: 0.78, pan: -0.2, wet: 0.3, lowpass: 2600 });
    word("ご め ん ね", 3600);
  },
  async "p6-close"() {
    Look.arm(3);
    Lids.close(1900);
    await sleep(1300);
    Glass.hide();
  },
  async "p6-run"() {
    // 目を閉じたまま、前を向いて、走る
    steps("sneaker", { steps: 14, interval: 250, volume: 0.5, pan: 0, muffled: false });
    for (let i = 0; i < 6; i++) {
      HorrorFX.haptic(40);
      await sleep(600);
    }
  },
  async "p6-chase"() {
    crowd({ walkers: 10, count: 16, volume: 0.36, from: 0.6, to: 1.6, muffled: false, spread: 0.8, interval: 230 });
    HorrorFX.heartbeat({ duration: 5200, bpm: 132, volume: 0.4 });
    await sleep(4600);
    Lids.open(260);
    document.body.classList.remove("us-turn", "us-turn-snap");
    cold(false);
    HorrorFX.silence({ duration: 2600, visual: false, restoreMs: 3000 });
  },

  /* ============ 七 ============ */
  "p7-understand"() {
    Glass.hide();
    cold(false);
  },
  "p7-calls"() {
    HorrorFX.heartbeat({ duration: 3000, bpm: 64, volume: 0.2 });
  },
  async "p7-you"() {
    // これを読んでいる、あなたの後ろにも
    Look.arm(4);
    cold(true, 9000);
    await sleep(1500);
    steps("leather", { steps: 6, interval: 700, volume: 0.28, muffled: true });
  },
  "p7-tonight"() {
    crowd({ walkers: 3, count: 8, volume: 0.18, muffled: true, spread: 0.5, interval: 700 });
  },
  "p7-dont"() {
    HorrorFX.silence({ duration: 4200, visual: false, restoreMs: 3000 });
    word("振り向かないで", 4200);
  },
  "p7-flat"() {
    document.body.classList.add("us-slope");
    S("creaking", { volume: 0.2, rate: 0.5, lowpass: 700, wet: 0.6 });
  },
  "p7-room"() {
    document.body.classList.remove("us-slope");
    toggleClass("us-flicker", 1000);
  },
  "p7-silent"() {
    HorrorFX.silence({ restore: false, visual: true });
  },
  "p7-relief"() {
    HorrorFX.unsilence({ restoreMs: 5000 });
  },
  "p7-notso"() {
    HorrorFX.heartbeat({ duration: 5000, bpm: 58, volume: 0.28 });
  },
  "p7-notgone"() {
    HorrorFX.silence({ restore: false, visual: true });
    HorrorFX.heartbeat({ duration: 6000, bpm: 64, volume: 0.36 });
  },
  "p7-caught"() {
    document.body.classList.add("us-dim");
    S("breath-a", { volume: 0.45, rate: 0.75, pan: 0, wet: 0.08, lowpass: 0, delay: 600 });
  },
  async "p7-behind"() {
    // 椅子に座る私の、すぐ真後ろで：画面の縁に、ずらりと人影
    breathCrowd(0.5);
    HorrorFX.shadowFigures({
      kind: "man",
      figures: [
        { x: 3, h: 84, lean: -2 }, { x: 13, h: 70, lean: 3 }, { x: 24, h: 56, lean: -3 },
        { x: 76, h: 56, lean: 3 }, { x: 87, h: 70, lean: -2 }, { x: 97, h: 84, lean: 2 },
      ],
      duration: 90000,
      fadeIn: 5000,
    });
    HorrorFX.haptic([60, 80, 60]);
  },
  async "p7-finale"() {
    S("whisper-b", { volume: 1, offset: 1.7, duration: 3.4, pan: 0.1, wet: 0.08, lowpass: 5000, rate: 0.92 });
    HorrorFX.flash({ color: "#ffffff", duration: 140 });
    HorrorFX.shake(document.body, { duration: 500, sound: false });
    HorrorFX.haptic([200, 60, 420]);
    await sleep(700);
    await blackCut(1100);
    document.body.classList.remove("us-dim");
    HorrorFX.unsilence({ restoreMs: 8000 });
  },
};

/* ---------------- 起動 ---------------- */
function startAudio() {
  const spec = BGM[document.body.dataset.bgm];
  if (spec) HorrorFX.playBGM(A + spec[0], { volume: spec[1] });
  const river = parseInt(document.body.dataset.river, 10);
  if (river) HorrorFX.playAmbience("river", A + "amb-river.mp3", { volume: river === 2 ? 0.14 : 0.08, fadeMs: 4000 });
}

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  Look.init();

  if (body.dataset.entryGate === "true") {
    const gate = HorrorFX.initEntryGate({
      warning: "⚠ 閲覧注意",
      title: "――振り向かずに、読む――",
      note: "足音が、後ろから聞こえます。ヘッドホン推奨。<br>途中で読み返す（上へ戻る）のは、おすすめしません。",
      sound: "bell",
      maxWait: 4200,
      onEnter: () => {
        HorrorFX.scanlines(true);
        startAudio();
      },
    });
    gate.classList.add("us-gate");
    gate.insertAdjacentHTML(
      "afterbegin",
      '<svg class="us-gate__line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M8,96 L58,34" pathLength="1"/></svg>'
    );
  } else {
    // ゲートのない章では、このページ自身での最初の操作（スクロール含む）で音を始める
    let started = false;
    const events = ["pointerdown", "keydown", "touchstart", "wheel", "scroll"];
    const once = () => {
      if (started) return;
      started = true;
      HorrorFX.scanlines(true);
      startAudio();
      events.forEach((t) => document.removeEventListener(t, once));
    };
    events.forEach((t) => document.addEventListener(t, once, { passive: true }));
  }

  HorrorFX.autoReveal();

  const run = (el) => {
    const fn = scenes[el.dataset.scene];
    if (fn) fn(el);
    else if (el.dataset.scene) console.warn("scene not found:", el.dataset.scene);
  };

  // 一文字ずつ現れる段落（場面も同時に）
  document.querySelectorAll(".slow-reveal").forEach((el) => {
    HorrorFX.prepareSlowText(el);
    HorrorFX.onScrollTrigger(el, () => {
      run(el);
      HorrorFX.slowReveal(el, { base: 110, punct: 520, jitter: 0.5 });
    });
  });

  // 場面だけの段落
  document.querySelectorAll(".scene-trigger:not(.slow-reveal)").forEach((el) => {
    HorrorFX.onScrollTrigger(el, () => run(el));
  });
});
