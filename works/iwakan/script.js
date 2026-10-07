// 「最近、違和感を感じるんです」の演出。共通処理は ../../common/horror.js の HorrorFX、
// この作品だけの視覚演出（防犯カメラ・天井・目・まぶた）は fx.js の CX を使う。
//
// 本文の <p> に class="scene-trigger" data-scene="名前" を付けると、その段落が画面の中央に来たときに
// 下の scenes[名前] が走る。class="glitch-target" は文字化け。class="note-hand" は犯人のノート
// （一文字ずつ書かれていく）。<body> の data-bgm / data-hum / data-rec で、章ごとの音と録画ランプを決める。

const A = "assets/";
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (a, b) => a + Math.random() * (b - a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const S = (name, opts) => HorrorFX.playSample(name, opts);

const BGM = {
  drone: ["bgm-drone.mp3", 0.2],
  psycho: ["bgm-psycho.mp3", 0.22],
  pressure: ["bgm-pressure.mp3", 0.2],
  paranoia: ["bgm-paranoia.mp3", 0.2],
  dread: ["bgm-dread.mp3", 0.24],
  dementia: ["bgm-dementia.mp3", 0.2],
};

HorrorFX.registerSFX("static", A + "sfx-static.mp3");
[
  ["creak-1", "sfx-creak-1.mp3"], ["creak-2", "sfx-creak-2.mp3"], ["creak-3", "sfx-creak-3.mp3"], ["creak-4", "sfx-creak-4.mp3"],
  ["creaking", "sfx-creaking.mp3"], ["walls", "sfx-walls-creak.mp3"], ["drip", "sfx-drip.mp3"], ["breath", "sfx-breath.mp3"],
  ["boom", "sfx-boom.mp3"], ["plastic-a", "sfx-plastic-a.mp3"], ["plastic-b", "sfx-plastic-b.mp3"], ["pen", "sfx-pen.mp3"],
  ["whisper-a", "sfx-whisper-a.mp3"], ["whisper-b", "sfx-whisper-b.mp3"], ["dial", "sfx-dial.mp3"], ["wardrobe", "sfx-wardrobe.mp3"],
  ["fridge-open", "sfx-fridge-open.mp3"], ["beep", "sfx-beep.mp3"], ["scare-b", "sfx-scare-b.mp3"], ["scare-d", "sfx-scare-d.mp3"],
].forEach(([name, file]) => HorrorFX.loadSample(name, A + file));
HorrorFX.setFootstepSamples({
  steps: [A + "sfx-steps-a.mp3", A + "sfx-steps-b.mp3", A + "sfx-steps-c.mp3"],
  creaks: [A + "sfx-steps-creak.mp3"],
});

/* ---------------- 天井から聞こえる音 ---------------- */
// 床板／天井板のきしみ。close:true で「すぐ真上」（こもらず、残響も少ない）。
function creakAbove({ vol = 0.5, pan, delay = 0, rate, close = false, which } = {}) {
  const name = which || pick(["creak-1", "creak-2", "creak-3", "creak-4", "creaking"]);
  return S(name, {
    volume: vol,
    pan: pan != null ? pan : rand(-0.7, 0.7),
    rate: rate != null ? rate : rand(0.78, 0.98),
    wet: close ? 0.1 : 0.45,
    lowpass: close ? 0 : 1500,
    delay,
  });
}

// 誰かが天井裏を横切っていく（左から右へ、きしみが連なる）
function creakWalk({ n = 5, from = -0.8, to = 0.8, vol = 0.35, gap = [800, 1500] } = {}) {
  let t = 0;
  for (let i = 0; i < n; i++) {
    const p = n > 1 ? i / (n - 1) : 0.5;
    creakAbove({ vol: vol * (0.7 + 0.5 * Math.sin(p * Math.PI)), pan: from + (to - from) * p, delay: t });
    t += rand(gap[0], gap[1]);
  }
  return t;
}

const hum = {
  start(vol = 0.15) {
    if (document.body.dataset.hum) HorrorFX.playAmbience("hum", A + "amb-fridge.mp3", { volume: vol, fadeMs: 2500 });
  },
  // 冷蔵庫の唸りが、ふっと止まる
  async cut(ms = 3200) {
    HorrorFX.stopAmbience("hum", { fadeMs: 60 });
    await sleep(ms);
    hum.start();
  },
};

const camReady = () => CX.Cam.ensure();

/* ---------------- 場面（段落が画面の中央に来たとき、または別の場面の中から呼ばれる） ---------------- */
const scenes = {
  /* 第一章 */
  async "c1-fridge-stop"() {
    S("fridge-open", { volume: 0.35, wet: 0.1, pan: -0.3 });
    await sleep(1300);
    await hum.cut(3400);
  },
  "c1-drip"() {
    S("drip", { volume: 0.7, pan: 0.3 });
    creakAbove({ vol: 0.12, delay: 2800, rate: 0.8 });
  },
  "c1-last"() {
    creakAbove({ vol: 0.1, delay: 2400, pan: 0.5, rate: 0.8 });
  },

  /* 第二章 */
  async "c2-hum-cut"() {
    creakAbove({ vol: 0.18, delay: 1800, pan: -0.4 });
    await hum.cut(4200);
  },
  "c2-chill"() {
    HorrorFX.heartbeat({ duration: 2400, bpm: 60, volume: 0.3 });
    HorrorFX.haptic([60, 90, 60]);
    creakAbove({ vol: 0.3, delay: 1700, pan: -0.3 });
  },
  "c2-search"() {
    creakAbove({ vol: 0.25, delay: 1500, pan: 0.5 });
    creakAbove({ vol: 0.2, delay: 3300, pan: 0.2 });
  },

  /* 第三章 */
  "c3-rec-on"() {
    S("beep", { volume: 0.55, wet: 0 });
    CX.HUD.on();
  },
  async "c3-cam-view"() {
    camReady();
    CX.Cam.show({ scene: "gen", label: "CAM 01 玄関" });
    await sleep(8000);
    CX.Cam.hide();
  },
  "c3-static"() {
    HorrorFX.staticBurst({ duration: 280, volume: 0.35 });
    CX.HUD.glitch();
  },
  async "c3-ghost-frame"() {
    camReady();
    CX.Cam.show({ scene: "gen", label: "CAM 01 玄関" });
    await sleep(2600);
    CX.Cam.set({ ghost: "on" });
    HorrorFX.staticBurst({ duration: 160, volume: 0.5 });
    await sleep(140);
    CX.Cam.set({ ghost: null });
    CX.HUD.glitch();
    await sleep(2400);
    CX.Cam.hide();
  },

  /* 第四章 */
  "c4-above"() {
    S("plastic-a", { volume: 0.14, pan: -0.5, wet: 0.5, lowpass: 1800, offset: rand(0, 8), duration: 2.4, delay: 1400 });
  },
  async "c4-rec-blink"() {
    CX.HUD.glitch();
    await HorrorFX.silence({ duration: 3800, visual: false, restoreMs: 2500 });
    creakAbove({ vol: 0.2, pan: 0.6 });
  },

  /* 第五章 */
  "c5-air"() {
    HorrorFX.stopAmbience("hum", { fadeMs: 600 });
    HorrorFX.heartbeat({ duration: 3200, bpm: 58, volume: 0.22 });
    CX.stale(true, 9000);
  },
  "c5-breath"() {
    S("breath", { volume: 0.13, pan: 0.65, wet: 0.5, lowpass: 1200, offset: 0.8, duration: 5, delay: 300 });
  },
  "c5-closet"() {
    S("wardrobe", { volume: 0.7, wet: 0.25, offset: 0.9, duration: 3.5 });
    HorrorFX.staticBurst({ duration: 300, volume: 0.35 });
  },
  async "c5-cam-empty"() {
    camReady();
    CX.Cam.show({ scene: "gen", label: "CAM 01 玄関" });
    await sleep(5200);
    CX.Cam.hide();
  },
  "c5-last"() {
    creakAbove({ vol: 0.4, delay: 900 });
    CX.HUD.glitch();
  },

  /* 第六章 */
  "c6-stain-show"() {
    CX.Ceiling.show({ "has-stain": true });
  },
  async "c6-stain-face"() {
    CX.Ceiling.show({ "has-stain": true });
    creakAbove({ vol: 0.25, delay: 1200, pan: 0.3 });
    await sleep(800);
    CX.Ceiling.set({ "is-face": true });
    await sleep(3400);
    CX.Ceiling.set({ "is-face": false });
  },
  "c6-hatch-hint"() {
    CX.Ceiling.show({ "has-stain": true, "has-hatch": true });
  },

  /* 第七章 */
  async "c7-hatch-open"() {
    CX.Ceiling.show({ "has-hatch": true });
    await sleep(2200);
    S("creaking", { volume: 0.5, lowpass: 1800, rate: 0.85, wet: 0.4 });
    CX.Ceiling.set({ "is-open": true });
  },
  async "c7-dark"() {
    CX.Ceiling.show({ "has-hatch": true, "is-open": true });
    creakAbove({ vol: 0.2, delay: 2200, pan: 0.1 });
    await CX.Ceiling.sweep(5000);
  },
  async "c7-beam"() {
    CX.Ceiling.show({ "has-hatch": true, "is-open": true });
    const sweep = CX.Ceiling.sweep(7000);
    await sleep(4300);
    CX.eyes({ x: "50%", y: "13%", ms: 380, blinks: 0 }); // 光の奥で一瞬だけ、何かが光る
    await sweep;
  },
  "c7-close"() {
    CX.Ceiling.set({ "is-open": false });
    S("boom", { volume: 0.6, offset: 1.4, duration: 0.7, lowpass: 350, wet: 0.4 });
  },
  async "c7-eyes"() {
    CX.Ceiling.show({ "has-hatch": true, "is-ajar": true });
    HorrorFX.heartbeat({ duration: 4200, bpm: 96, volume: 0.38 });
    await sleep(1600);
    creakAbove({ vol: 0.75, close: true, delay: 900, pan: 0 });
    CX.eyes({ x: "50%", y: "14%", ms: 2600, blinks: 1 });
    await sleep(3000);
    CX.Ceiling.set({ "is-ajar": false });
  },

  /* 第八章 */
  async "c8-first"() {
    HorrorFX.silence({ duration: 2400, visual: true, restoreMs: 2500 });
    creakAbove({ vol: 0.4, delay: 1100, pan: -0.5, rate: 0.9 });
    creakAbove({ vol: 0.3, delay: 2200, pan: 0.2, rate: 0.9 });
  },
  "c8-mishi"() {
    creakAbove({ vol: 0.55, pan: 0.2, rate: 0.82 });
  },
  "c8-louder"() {
    creakAbove({ vol: 0.85, pan: -0.1, rate: 0.78 });
    HorrorFX.haptic(80);
  },
  async "c8-hours"() {
    for (let i = 0; i < 9; i++) {
      await sleep(rand(1400, 4200));
      creakAbove({ vol: 0.25 + i * 0.05, pan: Math.sin(i * 1.3) * 0.7 });
    }
  },
  async "c8-drowse"() {
    const closing = CX.Lids.close(3800);
    await sleep(1800);
    HorrorFX.silence({ restore: false, visual: false });
    await closing;
    await sleep(1200);
    // 眠りに落ちる、まさにそのとき——すぐ真上で、みしっ
    creakAbove({ vol: 1, close: true, pan: 0, rate: 0.85, which: "creaking" });
    S("boom", { volume: 0.7, offset: 1.4, duration: 0.6, lowpass: 400, wet: 0.2 });
    CX.Lids.open(120);
    HorrorFX.shake(document.body, { duration: 420, sound: false });
    HorrorFX.haptic([90, 40, 220]);
    HorrorFX.heartbeat({ duration: 3600, bpm: 112, volume: 0.4 });
    HorrorFX.unsilence({ restoreMs: 4200 });
  },
  "c8-dread"() {
    creakAbove({ vol: 0.35, delay: 1800, pan: 0.6 });
  },

  /* 第九章 */
  "c9-inside"() {
    HorrorFX.shadowFigures({ figures: [{ x: 80, h: 46, lean: 3 }], duration: 3400, fadeIn: 1500 });
    HorrorFX.heartbeat({ duration: 3400, bpm: 88, volume: 0.32 });
    creakAbove({ vol: 0.35, delay: 900 });
  },

  /* 第十章 */
  "c10-cam-on"() {
    camReady();
    CX.Cam.show({ scene: "room", label: "CAM 02 室内" });
    S("beep", { volume: 0.5, wet: 0 });
  },
  "c10-led"() {
    CX.HUD.on({ live: true });
  },
  async "c10-fast"() {
    CX.Cam.setClock({ h: 23, m: 40, s: 0, rate: 2400 });
    await sleep(4000);
    CX.Cam.setClock(null);
  },
  "c10-ajar"() {
    CX.Cam.set({ door: "ajar" });
    HorrorFX.staticBurst({ duration: 220, volume: 0.3 });
  },
  async "c10-door"() {
    camReady();
    if (!CX.Cam.el.classList.contains("is-on")) CX.Cam.show({ scene: "room", label: "CAM 02 室内" });
    CX.HUD.on();
    CX.Cam.setClock({ h: 2, m: 2, s: 58, rate: 1 });
    CX.Cam.morph(true);
    HorrorFX.heartbeat({ duration: 4200, bpm: 110, volume: 0.4 });
    await sleep(1800);
    CX.Cam.set({ door: "open" });
    S("wardrobe", { volume: 0.8, wet: 0.2, offset: 0.9, duration: 3.6 });
    HorrorFX.crackFlash({ duration: 480 });
    HorrorFX.shake(document.body, { duration: 400, sound: false });
    await sleep(7000);
    HorrorFX.staticBurst({ duration: 350 });
    CX.Cam.hide();
  },

  /* 第十一章 */
  "c11-start"() {
    CX.Cam.hide();
    HorrorFX.heartbeat({ duration: 3400, bpm: 112, volume: 0.35 });
    HorrorFX.haptic([60, 40, 60]);
  },
  "c11-replay"() {
    camReady();
    CX.Cam.show({ big: true, scene: "room", label: "CAM 02 室内", clock: { h: 2, m: 2, s: 50, rate: 1 } });
    S("beep", { volume: 0.5, wet: 0 });
  },
  "c11-door"() {
    CX.Cam.set({ door: "open" });
    S("wardrobe", { volume: 0.85, wet: 0.2, offset: 0.9, duration: 3.6 });
  },
  "c11-arm"() {
    CX.Cam.set({ arm: "out" });
    S("plastic-a", { volume: 0.4, offset: 2, duration: 4, wet: 0.2 });
    HorrorFX.staticBurst({ duration: 200, volume: 0.35 });
  },
  async "c11-crawl"() {
    CX.Cam.set({ pose: "crawl-a" });
    await sleep(1400);
    HorrorFX.jumpscare({ image: A + "scare-hair.jpg", sound: false, duration: 650 });
    S("scare-b", { volume: 0.9, wet: 0.1, duration: 3 });
    HorrorFX.haptic([120, 40, 300]);
    await sleep(900);
    CX.Cam.set({ arm: null, pose: "crawl-b" });
    await sleep(5200);
    CX.Cam.set({ pose: "crawl-c" });
  },
  async "c11-stare"() {
    CX.Cam.set({ pose: "rise" });
    HorrorFX.silence({ duration: 15000, visual: false, restoreMs: 3000 });
    await sleep(4300);
    CX.Cam.set({ pose: "stand" });
    await sleep(3300);
    CX.Cam.zoom({ x: 30, y: 33, scale: 2.4, ms: 9000 });
    await sleep(8200);
    CX.Cam.set({ look: "on" }); // 画面の向こう——こちらを見る
    HorrorFX.heartbeat({ duration: 4200, bpm: 100, volume: 0.35 });
    await sleep(4300);
    HorrorFX.staticBurst({ duration: 450, volume: 0.5 });
    await CX.Cam.cut(260);
    CX.Cam.set({ look: null });
    CX.Cam.unzoom();
  },
  async "c11-fridge"() {
    CX.Cam.unzoom();
    CX.Cam.set({ look: null, pose: "fridge" });
    await sleep(3000);
    CX.Cam.set({ fridge: "open" });
    S("fridge-open", { volume: 0.8, wet: 0.15 });
    await sleep(2400);
    S("plastic-a", { volume: 0.18, offset: 3, duration: 3.5, wet: 0.3, pan: -0.5 });
  },
  async "c11-return"() {
    CX.Cam.set({ fridge: null, pose: "back-a" });
    await sleep(6200);
    CX.Cam.set({ pose: "back-b" });
    await sleep(4200);
    CX.Cam.set({ door: "shut" });
    S("wardrobe", { volume: 0.6, wet: 0.2, offset: 3.6, duration: 2.8 });
    await sleep(900);
    CX.Cam.set({ pose: "gone" });
    await sleep(1800);
    CX.Cam.lost();
    CX.HUD.glitch();
    HorrorFX.staticBurst({ duration: 500 });
    await sleep(1600);
    CX.Cam.hide();
  },

  /* 第十二章 */
  "c12-heart"() {
    HorrorFX.heartbeat({ duration: 3200, bpm: 92, volume: 0.32 });
  },
  "c12-creaks"() {
    [0, 650, 1250, 2100].forEach((d, i) => creakAbove({ vol: 0.5, delay: d, pan: -0.6 + i * 0.4 }));
    CX.HUD.glitch();
  },
  "c12-look-up"() {
    CX.Ceiling.show({ "has-vent": true });
  },
  async "c12-vent-eyes"() {
    CX.Ceiling.show({ "has-vent": true });
    await sleep(900);
    CX.eyes({ x: "50%", y: "11%", ms: 2200, blinks: 1 });
  },
  async "c12-everywhere"() {
    HorrorFX.crackFlash({ duration: 500 });
    CX.eyes({ x: "50%", y: "9%", ms: 2600, blinks: 1 });
    await sleep(700);
    CX.eyes({ x: "6%", y: "48%", ms: 2200, blinks: 1 });
    await sleep(600);
    CX.eyes({ x: "93%", y: "64%", ms: 2000, blinks: 1 });
  },
  "c12-dial"() {
    S("dial", { volume: 0.4, wet: 0.3, offset: 0.4, duration: 9 });
  },
  "c12-night"() {
    creakAbove({ vol: 0.12, delay: 3000, pan: 0.4 });
  },

  /* 第十三章 */
  async "c13-hatch"() {
    CX.Ceiling.show({ "has-hatch": true, "is-open": true });
    await CX.Ceiling.sweep(7000);
  },
  "c13-space"() {
    CX.stale(true, 9000);
    S("walls", { volume: 0.35, pan: -0.3, lowpass: 1400, offset: 1, duration: 4 });
  },
  "c13-bag"() {
    S("plastic-b", { volume: 0.45, duration: 5, offset: 2 });
    HorrorFX.heartbeat({ duration: 3600, bpm: 84, volume: 0.3 });
    CX.stale(true, 14000);
  },
  "c13-notebook"() {
    S("whisper-a", { volume: 0.55, pan: -0.4, wet: 0.5, lowpass: 2600 });
  },

  /* 第十四章 */
  async "c14-sleep"() {
    // 手書きの最後の一文のあと、本文がぶるっと震える
    creakAbove({ vol: 0.5, delay: 1500, close: true, pan: 0 });
    HorrorFX.heartbeat({ duration: 3600, bpm: 74, volume: 0.3 });
  },
  "c14-behind"() {
    HorrorFX.shadowFigures({ figures: [{ x: 18, h: 52, lean: -3 }], duration: 3600, fadeIn: 1800 });
    S("breath", { volume: 0.3, pan: -0.8, wet: 0.4, lowpass: 1500, offset: 0.8, duration: 4 });
  },

  /* 第十五章 */
  async "c15-calm"() {
    HorrorFX.silence({ duration: 6500, visual: false, restoreMs: 4000 });
    S("whisper-b", { volume: 0.4, pan: -0.7, wet: 0.5, lowpass: 2200, offset: 1.6, duration: 5.5, delay: 1500 });
  },
  "c15-cold"() {
    CX.cold(true, 7000);
    HorrorFX.heartbeat({ duration: 3400, bpm: 78, volume: 0.3 });
    HorrorFX.haptic([50, 80, 50]);
    creakAbove({ vol: 0.3, delay: 1300 });
  },

  /* 第十六章 */
  async "c16-check"() {
    S("wardrobe", { volume: 0.5, offset: 0.9, duration: 3, wet: 0.3 });
    setTimeout(() => scenes["c16-far"](), 3600);
    await HorrorFX.silence({ duration: 4800, visual: false, restoreMs: 3500 });
  },
  "c16-far"() {
    creakAbove({ vol: 0.2, pan: 0.85, delay: 600 });
  },

  /* あとがき */
  "ae-cam"() {
    camReady();
    CX.Cam.show({ scene: "new", label: "CAM 01 新居" });
    S("beep", { volume: 0.45, wet: 0 });
    CX.HUD.on();
  },
  "ae-know"() {
    HorrorFX.staticBurst({ duration: 320, volume: 0.4 });
    S("whisper-a", { volume: 0.35, pan: 0.6, wet: 0.5, lowpass: 2000, delay: 800 });
  },
  async "ae-gaze"() {
    // 背後から、誰かがついてくる足音。振り返ろうとするとやむ
    HorrorFX.footsteps({ kind: "light", steps: 6, interval: 540, volume: 0.35, fromVolume: 0.12, toVolume: 0.4, pan: -0.25, muffled: true, creak: 0.1 });
    await sleep(3400);
    HorrorFX.silence({ duration: 2800, visual: false, restoreMs: 2500 });
    HorrorFX.shadowFigures({ figures: [{ x: 90, h: 34, lean: 2 }], duration: 2600, fadeIn: 1400 });
  },
  async "ae-finale"() {
    HorrorFX.silence({ restore: false, visual: true });
    camReady();
    CX.Cam.show({ big: true, scene: "new", label: "CAM 01 新居", clock: null });
    CX.HUD.on();
    S("beep", { volume: 0.5, wet: 0 });
    await sleep(4200);
    // 映像が一瞬途切れ、戻ったときには——ベッドの足元に、立っている
    CX.Cam.cut(140);
    CX.Cam.set({ pose: "new-stand" });
    HorrorFX.staticBurst({ duration: 220, volume: 0.45 });
    CX.HUD.glitch();
    await sleep(4000);
    CX.Cam.set({ look: "on" });
    CX.Cam.zoom({ x: 47, y: 38, scale: 2.5, ms: 5200 });
    HorrorFX.heartbeat({ duration: 5200, bpm: 96, volume: 0.35 });
    await sleep(5400);
    HorrorFX.jumpscare({ image: A + "scare-doorway.jpg", sound: false, duration: 900 });
    S("scare-b", { volume: 1, wet: 0.1 });
    HorrorFX.shake(document.body, { duration: 450, sound: false });
    HorrorFX.haptic([200, 60, 420]);
    await sleep(500);
    CX.Cam.hide();
    HorrorFX.staticBurst({ duration: 500, volume: 0.6 });
    await sleep(900);
    CX.Last.show("まだ、みてる");
    S("whisper-b", { volume: 0.85, offset: 1.6, duration: 5.5, wet: 0.45, pan: 0.2 });
    await sleep(6200);
    CX.Last.hide(1800);
    HorrorFX.unsilence({ restoreMs: 6000 });
  },
};

/* ---------------- ノート（一文字ずつ書かれていく） ---------------- */
async function writeNote(el) {
  const len = (el.getAttribute("aria-label") || el.textContent).length;
  const base = 78;
  S("pen", { volume: 0.5, wet: 0.1, offset: rand(0, 12), duration: Math.min(20, (len * (base + 25)) / 1000 + 1), pan: -0.1 });
  await HorrorFX.slowReveal(el, { base, punct: 340, jitter: 0.6 });
  if (el.dataset.afterScene && scenes[el.dataset.afterScene]) {
    el.classList.add("is-shiver");
    setTimeout(() => el.classList.remove("is-shiver"), 2600);
    scenes[el.dataset.afterScene](el);
  }
}

/* ---------------- 起動 ---------------- */
function startAudio() {
  const spec = BGM[document.body.dataset.bgm];
  if (spec) HorrorFX.playBGM(A + spec[0], { volume: spec[1] });
  hum.start();
}

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;

  // 録画ランプ：第三章以降は、読んでいる側も録画されている
  if (body.dataset.rec) setTimeout(() => CX.HUD.on(), 1600);

  if (body.dataset.entryGate === "true") {
    const gate = HorrorFX.initEntryGate({
      warning: "⚠ 閲覧注意",
      title: "――映像を、再生する――",
      note: "光の点滅・大きな音・突然の無音があります。ヘッドホンでの視聴を推奨します。心臓の弱い方はご注意ください。",
      sound: "static",
      maxWait: 2400,
      onEnter: () => {
        HorrorFX.scanlines(true);
        startAudio();
      },
    });
    gate.classList.add("cx-gate");
    gate.insertAdjacentHTML("afterbegin", '<div class="cx-gate__rec"><i></i>REC</div><div class="cx-gate__cam">CAM 01</div>');
    gate.querySelector(".hfx-gate__note").insertAdjacentHTML("afterend", '<div class="cx-gate__play">▶ PLAY</div>');
    gate.addEventListener("click", () => S("beep", { volume: 0.6, wet: 0 }), { once: true });
  } else {
    // 入場ゲートがない章では、このページ自身での最初の操作（スクロール含む）で音を始める
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

  // 文字化け（data-scene が付いていれば、場面も同時に走る）
  document.querySelectorAll(".glitch-target").forEach((el) => {
    HorrorFX.onScrollTrigger(el, () => {
      HorrorFX.glitchText(el, { duration: 1300 });
      const fn = scenes[el.dataset.scene];
      if (fn) fn(el);
    });
  });

  // 場面
  document.querySelectorAll(".scene-trigger").forEach((el) => {
    HorrorFX.onScrollTrigger(el, () => {
      const fn = scenes[el.dataset.scene];
      if (fn) fn(el);
      else console.warn("scene not found:", el.dataset.scene);
    });
  });

  // 囁き（本文には出さない文字）
  document.querySelectorAll(".whisper-trigger").forEach((el) => {
    const text = el.dataset.whisper || "……";
    HorrorFX.onScrollTrigger(el, () => {
      HorrorFX.whisper(text);
      const fn = scenes[el.dataset.scene];
      if (fn) fn(el);
    });
  });

  // ノート
  const notes = document.querySelectorAll(".note-hand");
  notes.forEach((el) => {
    HorrorFX.prepareSlowText(el);
    HorrorFX.onScrollTrigger(el, () => writeNote(el));
  });

  // 鈴を鳴らす：押すほどに、天井が応える
  const bell = document.getElementById("manual-scare-button");
  if (bell) {
    bell.addEventListener("click", () => {
      let n = 0;
      try {
        n = (parseInt(sessionStorage.getItem("iwakan-bell"), 10) || 0) + 1;
        sessionStorage.setItem("iwakan-bell", String(n));
      } catch (e) {
        n = 1;
      }
      HorrorFX.playBell();
      HorrorFX.flash({ color: "#ffffff", duration: 150 });
      HorrorFX.shake(document.body, { duration: 300, sound: false });
      if (n >= 2) creakAbove({ vol: 0.12 + Math.min(n, 8) * 0.07, delay: 2200 + rand(0, 800) });
      if (n === 4) CX.eyes({ x: "50%", y: "10%", ms: 1800, blinks: 1 });
      if (n === 6) {
        bell.classList.add("is-wrong");
        HorrorFX.whisper("鳴らさないで");
      }
      if (n >= 8 && n % 2 === 0) CX.eyes({ x: rand(15, 85) + "%", y: rand(10, 80) + "%", ms: 1400, blinks: 1 });
    });
  }
});
