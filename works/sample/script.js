// このページ固有の演出呼び出し。共通処理は ../../common/horror.js の HorrorFX を使う。
// 新しい作品を作るときは、このファイルと index.html / style.css をまとめてコピーする。

document.addEventListener("DOMContentLoaded", () => {
  // 1) 入場ゲート：クリックさせることで音声再生の許可を得る（音声を使う場合は必須）
  HorrorFX.initEntryGate({
    warning: "⚠ 閲覧注意",
    title: "――続きを読む――",
    note: "クリックして入室してください",
    // sound: "door" のように registerSFX した名前を渡すと、その音が鳴り終わるまで
    // 待ってから本文を表示する（未指定なら合成音のドアの軋み音を使う）。
    onEnter: () => {
      HorrorFX.scanlines(true);
      // 音声を使う場合はここで registerSFX しておき、以後 playSFX(name) で再生できる
      // HorrorFX.registerSFX("bgm", "assets/bgm.mp3");
      // HorrorFX.playBGM("assets/bgm.mp3", { volume: 0.25 });
    },
  });

  // 2) スクロールで文章がふわっと現れる演出（class="hfx-reveal" を付けた要素すべてに適用）
  //    画面の中央あたりまで来たら発火する。ナビゲーション系のボタンなど、ページ末尾にあって
  //    中央まで届かない要素には data-reveal="near" を付けると、画面に入った時点で表示される。
  HorrorFX.autoReveal();

  // 3) class="glitch-target" を付けた段落：スクロールで文字化け演出（1ページに複数可）
  document.querySelectorAll(".glitch-target").forEach((el) => {
    HorrorFX.onScrollTrigger(el, () => HorrorFX.glitchText(el, { duration: 1200 }));
  });

  // 4) class="scare-trigger" を付けた要素：スクロールで演出発火（1ページに複数可）。
  //    data-fx="flash|static|crack|heartbeat|jumpscare|drip" で種類を変えられる（省略時は flash）。
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
        // 画像を使ったジャンプスケア。assets に画像を置いて data-image で指定する。
        HorrorFX.jumpscare({ image: el.dataset.image, duration: 700 });
      } else if (fx === "drip") {
        HorrorFX.playSFX("drip", { volume: 0.8 });
      } else {
        HorrorFX.flash({ color: "#8a0000", duration: 220 });
        HorrorFX.shake(document.body, { duration: 450 });
      }
    });
  });

  // 5) class="whisper-trigger" data-whisper="表示する文字" を付けた要素：
  //    スクロールで画面の隅に一瞬だけ文字が浮かぶ（本文には出さない演出専用の仕掛け）
  document.querySelectorAll(".whisper-trigger").forEach((el) => {
    const text = el.dataset.whisper || "……";
    HorrorFX.onScrollTrigger(el, () => HorrorFX.whisper(text));
  });

  // 6) ボタンクリックで手動トリガーする演出の例
  const bell = document.getElementById("manual-scare-button");
  if (bell) {
    bell.addEventListener("click", () => {
      HorrorFX.playBell();
      HorrorFX.flash({ color: "#ffffff", duration: 150 });
      HorrorFX.shake(document.body, { duration: 350, sound: false });
    });
  }
});
