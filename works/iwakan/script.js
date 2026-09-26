// 「違和感を感じるんです」第一章 の演出呼び出し。共通処理は ../../common/horror.js の HorrorFX を使う。

const BGM_SRC = "assets/bgm-ambient-horror.mp3";

HorrorFX.registerSFX("door", "assets/sfx-door-creak.mp3");
HorrorFX.registerSFX("stinger", "assets/sfx-piano-shock.mp3");
HorrorFX.registerSFX("drip", "assets/sfx-water-drip.mp3");

document.addEventListener("DOMContentLoaded", () => {
  // 入場ゲートは作品の入り口となる第一章（<body data-entry-gate="true">）だけで表示する。
  if (document.body.dataset.entryGate === "true") {
    HorrorFX.initEntryGate({
      warning: "⚠ 閲覧注意",
      title: "――続きを読む――",
      note: "光の点滅・大きな音があります。心臓の弱い方はご注意ください。",
      sound: "door", // 登録済みの実録音を再生し、鳴り終わるまでドアに入っていく演出を見せてから本文を表示する
      maxWait: 5000, // 音源は18秒あるが、5秒で切り上げて本文を表示する
      onEnter: () => {
        HorrorFX.scanlines(true);
        // タイトル画面・入室画面ではBGMを流さない。ドア音が鳴り終わってから始める。
        HorrorFX.playBGM(BGM_SRC, { volume: 0.22 });
      },
    });
  } else {
    // 入場ゲートがない第二章以降では、このページ自身での最初の操作でBGMを開始する。
    // 「次の章へ」のクリックは前のページ上で起きるため、新しいページはまだ何も
    // 操作されていない状態で読み込まれる。マウスホイールでスクロールしただけの読者も
    // 取りこぼさないよう、wheel／scroll も開始のきっかけに含める。
    let bgmStarted = false;
    const startBgmOnce = () => {
      if (bgmStarted) return;
      bgmStarted = true;
      HorrorFX.playBGM(BGM_SRC, { volume: 0.22 });
      triggerEvents.forEach((type) => document.removeEventListener(type, startBgmOnce));
    };
    const triggerEvents = ["pointerdown", "keydown", "touchstart", "wheel", "scroll"];
    triggerEvents.forEach((type) => {
      document.addEventListener(type, startBgmOnce, { passive: true });
    });
  }

  // 文章がスクロールでふわっと現れる演出
  HorrorFX.autoReveal();

  // class="glitch-target" が付いた段落：スクロールで文字化け演出（1ページに複数可）
  document.querySelectorAll(".glitch-target").forEach((el) => {
    HorrorFX.onScrollTrigger(el, () => HorrorFX.glitchText(el, { duration: 1300 }));
  });

  // class="scare-trigger" が付いた段落：スクロールで演出発火（1ページに複数可）。
  // data-fx="flash|static|crack|heartbeat" で章ごとに演出の種類を変えられる（省略時は flash）。
  document.querySelectorAll(".scare-trigger").forEach((el) => {
    const fx = el.dataset.fx || "flash";
    HorrorFX.onScrollTrigger(el, () => {
      if (fx === "static") {
        HorrorFX.staticBurst();
        HorrorFX.shake(document.body, { duration: 350, sound: false });
      } else if (fx === "crack") {
        HorrorFX.crackFlash();
        HorrorFX.shake(document.body, { duration: 400, sound: false });
      } else if (fx === "heartbeat") {
        HorrorFX.heartbeat({ duration: 2800, bpm: 105 });
      } else if (fx === "jumpscare") {
        HorrorFX.jumpscare({ image: el.dataset.image, duration: 750 });
      } else if (fx === "drip") {
        // 静かな違和感の場面なので、フラッシュ／シェイクは入れず水滴の音だけ
        HorrorFX.playSFX("drip", { volume: 0.8 });
      } else {
        HorrorFX.flash({ color: "#8a0000", duration: 220 });
        HorrorFX.shake(document.body, { duration: 450, sound: false });
        HorrorFX.playSFX("stinger", { volume: 0.55 });
      }
    });
  });

  // class="whisper-trigger" data-whisper="表示する文字" が付いた要素：
  // スクロールで画面の隅に一瞬だけ文字が浮かぶ（本文には出さない演出専用の仕掛け）
  document.querySelectorAll(".whisper-trigger").forEach((el) => {
    const text = el.dataset.whisper || "……";
    HorrorFX.onScrollTrigger(el, () => HorrorFX.whisper(text));
  });

  // 手動発火ボタン（鈴を鳴らす）
  const bell = document.getElementById("manual-scare-button");
  if (bell) {
    bell.addEventListener("click", () => {
      HorrorFX.playBell();
      HorrorFX.flash({ color: "#ffffff", duration: 150 });
      HorrorFX.shake(document.body, { duration: 350, sound: false });
    });
  }
});
