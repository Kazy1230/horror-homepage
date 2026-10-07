// 「四十九日の戸」の演出の組み立て。共通処理は ../../common/horror.js の HorrorFX を使う。
// 本文の段落に付けた data-scene / data-whisper / class の名前と、下の scenes を対応させている。

const A = "assets/";
const BGM = {
  sorrow: { src: A + "bgm-sorrow.mp3", volume: 0.3 }, // 第一〜三章：思い出と喪失
  dark: { src: A + "bgm-dark.mp3", volume: 0.42 }, // 第四章〜：戸の前に何かがいる
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

HorrorFX.registerSFX("slide", A + "sfx-slide-barn.mp3");
HorrorFX.setFootstepSamples({
  steps: [A + "sfx-steps-a.mp3", A + "sfx-steps-b.mp3", A + "sfx-steps-c.mp3", A + "sfx-steps-creak.mp3"],
  drags: [A + "sfx-drag.mp3", A + "sfx-shuffle.mp3"],
  creaks: [A + "sfx-creak-1.mp3", A + "sfx-creak-2.mp3", A + "sfx-creak-3.mp3", A + "sfx-creak-4.mp3"],
});
HorrorFX.loadSample("rin", A + "sfx-rin.mp3");
HorrorFX.loadSample("boom", A + "sfx-boom.mp3");
HorrorFX.loadSample("breath", A + "sfx-breath.mp3");
HorrorFX.loadSample("phone", A + "sfx-phone.mp3");
HorrorFX.loadSample("drip", A + "sfx-drip.mp3");

/* ---------------- 場面（scenes） ----------------
   それぞれ「その段落が画面の中央に来たとき」に一度だけ呼ばれる。
   figure（靴の図）に付いたものは、その図が画面に来たときに呼ばれ、引数で要素を受け取る。 */
const scenes = {
  /* 第一章：まだ、怖くない足音 */
  "ch1-steps": () =>
    HorrorFX.footsteps({ kind: "heavy", steps: 5, interval: 1300, fromVolume: 0.35, toVolume: 0.55, pan: -0.4, panTo: 0.35, muffled: true, volume: 0.6, creak: 0.45, at: 400 }),

  /* 第二章：折り返せなかった電話 */
  "ch2-missed-call": () => HorrorFX.notify({ title: "不在着信", body: "おばあちゃん", time: "2週間前" }),
  "ch2-death": () => HorrorFX.silence({ duration: 2600, restoreMs: 4000 }),

  /* 第三章：お鈴と、願い */
  "ch3-rin": () => HorrorFX.playSample("rin", { volume: 0.75, wet: 0.4 }),
  "ch3-wish": async () => {
    await sleep(2400);
    HorrorFX.whisper("おかえり", { duration: 2400, x: 50, y: 44 });
    await sleep(2200);
    HorrorFX.footsteps({ kind: "light", steps: 1, volume: 0.45, muffled: true, creak: 0 });
  },

  /* 第四章：靴の向き、止まる足音 */
  "ch4-shoe-a": async (fig) => {
    await sleep(1400);
    await HorrorFX.turnShoe(fig, 180, { style: "ghost", duration: 5200, caption: "翌朝 ── 道の方へ" });
  },
  "ch4-shoe-b": async (fig) => {
    await sleep(900);
    await HorrorFX.turnShoe(fig, 0, { style: "hand", duration: 900, caption: "私が、戸の方に直す" });
    await sleep(2600);
    await HorrorFX.turnShoe(fig, 180, { style: "ghost", duration: 5600, caption: "朝 ── また、道の方へ" });
  },
  "ch4-grandma-steps": () =>
    HorrorFX.footsteps({ kind: "light", steps: 6, interval: 1250, fromVolume: 0.45, toVolume: 0.9, pan: -0.5, panTo: 0.25, volume: 0.7, creak: 0.3, at: 300 }),
  "ch4-hush": () => HorrorFX.silence({ duration: 2800, restoreMs: 3500 }),
  "ch4-stop-longer": () => {
    // 足音が止まっている時間が、数秒→十秒→一分と長くなる。音楽も消して、足音と「間」だけにする。
    HorrorFX.silence({ duration: 44000, restoreMs: 6000 });
    const walk = (at, steps) =>
      HorrorFX.footsteps({ kind: "light", steps, interval: 1200, fromVolume: 0.5, toVolume: 0.85, pan: -0.2, panTo: 0.1, volume: 0.7, at });
    walk(600, 4);
    walk(9400, 3);
    walk(21000, 2);
    walk(36000, 2);
  },
  "ch4-heart-slow": () => HorrorFX.heartbeat({ duration: 5200, bpm: 52, volume: 0.35 }),

  /* 第五章：老人 */
  "ch5-figure": () => {
    HorrorFX.silence({ duration: 2200, restoreMs: 3000 });
    HorrorFX.shadowFigures({ figures: [{ x: 70, h: 62, lean: 0 }], duration: 1700, fadeIn: 450 });
    HorrorFX.playSample("boom", { volume: 0.55, offset: 1.46, wet: 0.2 });
    HorrorFX.heartbeat({ duration: 3600, bpm: 96, volume: 0.45 });
    HorrorFX.haptic([40, 60, 40]);
  },
  "ch5-shoe": async (fig) => {
    await sleep(800);
    await HorrorFX.turnShoe(fig, 180, { style: "hand", duration: 1100, caption: "老人が向け直す ── 道の方へ" });
  },
  "ch5-reveal": () => HorrorFX.silence({ duration: 21000, restoreMs: 5000 }),
  "ch5-reveal-done": async () => {
    await sleep(1300);
    HorrorFX.footsteps({ kind: "heavy", steps: 1, volume: 0.5, muffled: true, pan: 0.3, creak: 0 });
  },
  "ch5-water": async (fig) => {
    await sleep(500);
    fig.classList.add("has-water");
    HorrorFX.playSample("drip", { volume: 0.9, wet: 0.45 });
    await sleep(2400);
    HorrorFX.playSample("drip", { volume: 0.7, wet: 0.5, rate: 0.96 });
  },
  "ch5-dawn-steps": () => HorrorFX.footsteps({ kind: "light", steps: 5, interval: 1300, fromVolume: 0.3, toVolume: 0.8, volume: 0.65, at: 300 }),

  /* 第六章：遺言 */
  "ch6-plea": () => HorrorFX.heartbeat({ duration: 5200, bpm: 56, volume: 0.32 }),
  "ch6-death": async () => {
    HorrorFX.silence({ duration: 3800, restoreMs: 4000 });
    await sleep(700);
    HorrorFX.playSample("rin", { volume: 0.7, wet: 0.45 });
  },
  "ch6-steps-night": () => {
    HorrorFX.silence({ duration: 24000, restoreMs: 6000 });
    HorrorFX.footsteps({ kind: "light", steps: 5, interval: 1300, fromVolume: 0.5, toVolume: 0.9, volume: 0.7, at: 700 });
  },
  "ch6-water": async (fig) => {
    fig.classList.add("has-water");
    for (let i = 0; i < 3; i++) {
      await sleep(1800 + i * 900);
      HorrorFX.playSample("drip", { volume: 0.75 - i * 0.12, wet: 0.5, rate: 1 - i * 0.04 });
    }
  },

  /* 第七章：四十九日目の夜 */
  "ch7-start": () => HorrorFX.heartbeat({ duration: 6000, bpm: 54, volume: 0.25 }),
  "ch7-shoe-hand": async (fig) => {
    await sleep(900);
    await HorrorFX.turnShoe(fig, 180, { style: "hand", duration: 1400, caption: "四十九日目 ── 道の方へ" });
  },
  "ch7-night": () => HorrorFX.playAmbience("insects", A + "amb-insects.mp3", { volume: 0.3, fadeMs: 5000 }),
  "ch7-approach": () =>
    HorrorFX.footsteps({ kind: "both", steps: 9, interval: 1300, fromVolume: 0.12, toVolume: 1, volume: 0.8, pan: -0.15, panTo: 0, creak: 0.35, haptics: true, at: 500 }),
  "ch7-heart": () => HorrorFX.heartbeat({ duration: 9000, bpm: 70, volume: 0.45 }),
  "ch7-behind": async () => {
    HorrorFX.shadowFigures({ figures: [{ x: 34, h: 54, lean: -2 }, { x: 64, h: 44, lean: 4 }], duration: 15000, fadeIn: 5000 });
    await sleep(1500);
    HorrorFX.playSample("breath", { volume: 0.22, wet: 0.5, pan: 0.2, lowpass: 3500 });
    HorrorFX.heartbeat({ duration: 8000, bpm: 76, volume: 0.5 });
  },
  "ch7-insects-stop": () => {
    HorrorFX.stopAmbience("insects", { fadeMs: 250 });
    HorrorFX.silence({ duration: 16000, restoreMs: 7000 });
  },
  "ch7-shoe-self": async (fig) => {
    await sleep(1800);
    await HorrorFX.turnShoe(fig, 0, { style: "ghost", duration: 7000, caption: "四十九日目 ── 戸の方へ" });
  },
  "ch7-scare": () => {
    HorrorFX.jumpscare({ image: A + "scare-silhouette.jpg", duration: 520, sound: false });
    HorrorFX.playSample("boom", { volume: 1, offset: 1.46, wet: 0.2 });
    HorrorFX.haptic([120, 60, 220]);
  },
  "ch7-retreat": () => HorrorFX.footsteps({ kind: "both", steps: 8, interval: 1250, fromVolume: 0.9, toVolume: 0.08, volume: 0.75, at: 600 }),

  /* あとがき */
  "ae-behind-mother": () => {
    HorrorFX.shadowFigures({ figures: [{ x: 47, h: 30, lean: -1 }, { x: 54, h: 27, lean: 2 }], duration: 2600, fadeIn: 1400 });
    HorrorFX.footsteps({ kind: "heavy", steps: 1, volume: 0.35, muffled: true, creak: 0, at: 800 });
  },
  "ae-recall": () => HorrorFX.silence({ duration: 14000, restoreMs: 4000 }),
  "ae-two-pairs": () =>
    HorrorFX.footsteps({ kind: "both", steps: 5, interval: 1400, fromVolume: 0.15, toVolume: 0.6, volume: 0.6, at: 600 }),
  "ae-finale": async () => {
    // 最後の一文が出終わったあと。音を消したまま、二人分の足音が背後まで来る。
    HorrorFX.silence({ restore: false });
    await sleep(2200);
    HorrorFX.footsteps({ kind: "both", steps: 5, interval: 760, fromVolume: 0.5, toVolume: 1.15, volume: 0.9, creak: 0.5, haptics: true });
    await sleep(4300);
    HorrorFX.shadowFigures({ figures: [{ x: 30, h: 92, lean: -2 }, { x: 68, h: 84, lean: 3 }], duration: 1900, fadeIn: 250 });
    HorrorFX.jumpscare({ image: A + "scare-man-corridor.jpg", duration: 420, sound: false });
    HorrorFX.playSample("boom", { volume: 1, offset: 1.46, wet: 0.2 });
    HorrorFX.staticBurst({ duration: 520, volume: 0.35 });
    HorrorFX.haptic([160, 60, 260]);
    await sleep(2300);
    HorrorFX.flash({ color: "#000", duration: 1400 });
    await sleep(1700);
    HorrorFX.whisper("おかえり", { duration: 3400, x: 50, y: 48 });
    await sleep(2800);
    HorrorFX.unsilence({ restoreMs: 9000 });
  },
};

document.addEventListener("DOMContentLoaded", () => {
  const bgm = BGM[document.body.dataset.bgm] || BGM.sorrow;

  // 入場ゲートは第一章だけ。「忌中」の札を貼った引き戸が開き、その音が鳴り終わってから本文に入る。
  if (document.body.dataset.entryGate === "true") {
    HorrorFX.initEntryGate({
      variant: "sliding",
      slip: "忌中",
      warning: "⚠ 閲覧注意",
      title: "――戸を、開ける――",
      note: "音が重要な作品です。イヤホン・ヘッドホンでの鑑賞を推奨します。大きな音・突然の無音・光の点滅・スマホの振動があります。",
      sound: "slide",
      maxWait: 4800,
      onEnter: () => HorrorFX.playBGM(bgm.src, { volume: bgm.volume, fadeMs: 4000 }),
    });
  } else {
    // 第二章以降は、このページ自身での最初の操作（スクロールを含む）でBGMを再開する
    let started = false;
    const events = ["pointerdown", "keydown", "touchstart", "wheel", "scroll"];
    const startOnce = () => {
      if (started) return;
      started = true;
      events.forEach((type) => document.removeEventListener(type, startOnce));
      HorrorFX.playBGM(bgm.src, { volume: bgm.volume, fadeMs: 3000 });
    };
    events.forEach((type) => document.addEventListener(type, startOnce, { passive: true }));
  }

  HorrorFX.prepareSlowText(".slow-reveal");
  HorrorFX.autoReveal();

  // ためらうように一文字ずつ現れる文（data-scene は出始め、data-after-scene は出終わりに呼ぶ）
  document.querySelectorAll(".slow-reveal").forEach((el) => {
    HorrorFX.onScrollTrigger(el, async () => {
      if (el.dataset.scene && scenes[el.dataset.scene]) scenes[el.dataset.scene](el);
      await HorrorFX.slowReveal(el, {
        base: Number(el.dataset.slowBase) || 85,
        punct: Number(el.dataset.slowPunct) || 380,
      });
      if (el.dataset.afterScene && scenes[el.dataset.afterScene]) scenes[el.dataset.afterScene](el);
    });
  });

  // 通常の場面（段落、または靴の図）
  document.querySelectorAll(".scene-trigger:not(.slow-reveal), figure[data-scene]").forEach((el) => {
    HorrorFX.onScrollTrigger(el, () => {
      const scene = scenes[el.dataset.scene];
      if (scene) scene(el);
    });
  });

  document.querySelectorAll(".glitch-target").forEach((el) => {
    HorrorFX.onScrollTrigger(el, () => HorrorFX.glitchText(el, { duration: 1500 }));
  });

  document.querySelectorAll(".whisper-trigger").forEach((el) => {
    const text = el.dataset.whisper || "……";
    const delay = Number(el.dataset.delay) || 0;
    HorrorFX.onScrollTrigger(el, () => setTimeout(() => HorrorFX.whisper(text, { duration: 2600, x: 50, y: 46 }), delay));
  });

  // お鈴：鳴らすたびに、何かが応える（鳴らした回数は章をまたいで数える）
  const bell = document.getElementById("manual-scare-button");
  if (bell) {
    const KEY = "shijukunichi-rin";
    bell.addEventListener("click", () => {
      let count = 1;
      try {
        count = (parseInt(sessionStorage.getItem(KEY) || "0", 10) || 0) + 1;
        sessionStorage.setItem(KEY, String(count));
      } catch (e) {
        // 数えられなくても鳴らすだけは鳴らす
      }
      HorrorFX.playSample("rin", { volume: 0.75, wet: 0.45 });
      HorrorFX.flash({ color: "#ffe6bd", duration: 160 });
      const reactions = [
        null,
        () => HorrorFX.footsteps({ kind: "light", steps: 2, interval: 1300, volume: 0.4, muffled: true, creak: 0, at: 2200 }),
        () => setTimeout(() => HorrorFX.whisper("いる", { duration: 2400 }), 2600),
        () => {
          HorrorFX.silence({ duration: 3600, restoreMs: 3000 });
          HorrorFX.footsteps({ kind: "heavy", steps: 1, volume: 0.5, muffled: true, creak: 0, at: 1800 });
        },
        () => HorrorFX.heartbeat({ duration: 4200, bpm: 62, volume: 0.4 }),
        () => HorrorFX.footsteps({ kind: "both", steps: 4, interval: 1200, fromVolume: 0.2, toVolume: 0.7, volume: 0.6, at: 2000 }),
      ];
      const react = count <= reactions.length ? reactions[count - 1] : reactions[1 + Math.floor(Math.random() * (reactions.length - 1))];
      if (react) react();
    });
  }
});
