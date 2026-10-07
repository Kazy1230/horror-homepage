/* ============================================================
   horror.js — 全ページ共通のホラー演出ライブラリ
   window.HorrorFX として各ページの script.js から呼び出す。
   ============================================================ */

(function () {
  "use strict";

  const sfxRegistry = new Map();
  let audioUnlocked = false;
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  // スクロール連動の演出音は、ページ上で最初に何らかの操作（クリック／タップ／キー操作／
  // マウスホイールでのスクロール）があった時点でこっそり音声再生を解錠しておく。
  // 章移動のリンククリックは「前のページ」で起きるため、新しいページ自身では
  // まだ何も操作していないことになる。読者がホイールでスクロールしただけでも
  // 解錠できるよう、wheel／scroll も対象に含めておく。
  ["pointerdown", "keydown", "touchstart", "wheel", "scroll"].forEach((type) => {
    document.addEventListener(type, () => getAudioContext(), { once: true, capture: true, passive: true });
  });

  function ensureOverlay(className) {
    let el = document.querySelector("." + className);
    if (!el) {
      el = document.createElement("div");
      el.className = className;
      document.body.appendChild(el);
    }
    return el;
  }

  /* ---------------- 入場ゲート ---------------- */
  // title: 見出し文字列 / note: 補足文字列 / onEnter: クリック後に呼ばれるコールバック
  // sound: true = 合成ドア音／false = 無音／文字列 = registerSFX した効果音名。
  // 効果音（文字列指定時）が鳴り終わるまで、ドアの中に入っていく演出を見せてから本文を表示する。
  // variant: "sliding" を指定すると、中央に札（slip＝「忌中」など）を貼った引き戸が左右に開くゲートになる。
  function initEntryGate({ title = "クリックして入る", note = "音声が流れます。音量にご注意ください。", warning, onEnter, sound = true, maxWait = 30000, variant = "default", slip = "" } = {}) {
    const sliding = variant === "sliding";
    const gate = document.createElement("div");
    gate.className = "hfx-gate" + (sliding ? " hfx-gate--sliding" : "");
    gate.innerHTML =
      (sliding
        ? '<div class="hfx-gate__void"></div>' +
          '<div class="hfx-gate__panel hfx-gate__panel--l"></div>' +
          '<div class="hfx-gate__panel hfx-gate__panel--r"></div>'
        : "") +
      (warning ? '<div class="hfx-gate__warning">' + warning + "</div>" : "") +
      (sliding && slip ? '<div class="hfx-gate__slip"><span>' + slip + "</span></div>" : "") +
      '<div class="hfx-gate__title">' + title + "</div>" +
      '<div class="hfx-gate__note">' + note + "</div>" +
      '<div class="hfx-gate__door"></div>';
    document.body.appendChild(gate);
    // ゲートが開くまで背後のスクロールを止める（見えない場所の演出が先に発火しないように）
    document.documentElement.classList.add("hfx-locked");

    gate.addEventListener("click", function handler() {
      audioUnlocked = true;
      gate.removeEventListener("click", handler);
      gate.classList.add("hfx-entering");

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        document.documentElement.classList.remove("hfx-locked");
        gate.classList.add("hfx-hidden");
        setTimeout(() => gate.remove(), 1000);
        if (typeof onEnter === "function") onEnter();
      };

      if (typeof sound === "string") {
        const node = playSFX(sound, { volume: 0.85 });
        if (node) {
          node.addEventListener("ended", finish);
          node.addEventListener("error", finish);
          // 音源が maxWait より長くても、そこで打ち切って本文を表示する
          setTimeout(() => {
            node.pause();
            finish();
          }, maxWait);
        } else {
          setTimeout(finish, 1500);
        }
      } else if (sound === false) {
        setTimeout(finish, 900);
      } else {
        playDoorCreak();
        setTimeout(finish, 1800);
      }
    });

    return gate;
  }

  /* ---------------- 効果音 ---------------- */
  function registerSFX(name, src) {
    const audio = new Audio(src);
    audio.preload = "auto";
    sfxRegistry.set(name, audio);
  }

  function playSFX(name, { volume = 1.0 } = {}) {
    const base = sfxRegistry.get(name);
    if (!base) {
      console.warn("[HorrorFX] SFX not registered:", name);
      return;
    }
    // 連打しても重ねて再生できるよう複製して再生する
    const node = base.cloneNode();
    node.volume = volume;
    node.play().catch((err) => {
      console.warn("[HorrorFX] playback blocked (need user interaction first):", err);
    });
    return node;
  }

  /* ---------------- ドアの軋み音（入場ゲートを開けるときに鳴る） ---------------- */
  function playDoorCreak({ volume = 0.55 } = {}) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const dur = 1.7;

    // 蝶番が「引っかかっては滑る」不規則な金属的きしみを何度も重ねる（stick-slip）
    const creakCount = 10;
    let t = 0.05;
    for (let i = 0; i < creakCount && t < dur - 0.15; i++) {
      const burstDur = 0.05 + Math.random() * 0.14;
      const startTime = now + t;
      const baseFreq = 260 + Math.random() * 650;

      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(baseFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * (0.55 + Math.random() * 0.6), startTime + burstDur);

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = baseFreq;
      filter.Q.value = 9 + Math.random() * 14;

      const gain = ctx.createGain();
      const peak = volume * (0.35 + Math.random() * 0.55);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peak, startTime + burstDur * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + burstDur);

      osc.connect(filter);
      filter.connect(gain);
      routeToOutput(ctx, gain, { wet: 0.3 });
      osc.start(startTime);
      osc.stop(startTime + burstDur + 0.03);

      // 引っかかったり急に滑ったりする不規則な間隔
      t += burstDur * (0.5 + Math.random() * 1.4);
    }

    // 木材がこすれるノイズ質感を全体に薄く敷く
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = createNoiseBuffer(ctx, dur);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 450;
    noiseFilter.Q.value = 0.6;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.3);
    noiseGain.gain.linearRampToValueAtTime(volume * 0.22, now + dur * 0.75);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    routeToOutput(ctx, noiseGain, { wet: 0.3 });
    noiseSrc.start(now);
    noiseSrc.stop(now + dur + 0.05);

    // 低い唸り（ドア全体が開いていく重み）がゆっくり下がっていく
    const groan = ctx.createOscillator();
    groan.type = "sawtooth";
    groan.frequency.setValueAtTime(170, now);
    groan.frequency.exponentialRampToValueAtTime(55, now + dur);
    const groanFilter = ctx.createBiquadFilter();
    groanFilter.type = "lowpass";
    groanFilter.frequency.value = 450;
    const groanGain = ctx.createGain();
    groanGain.gain.setValueAtTime(0.0001, now);
    groanGain.gain.linearRampToValueAtTime(volume * 0.55, now + 0.25);
    groanGain.gain.linearRampToValueAtTime(volume * 0.38, now + dur * 0.7);
    groanGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    groan.connect(groanFilter);
    groanFilter.connect(groanGain);
    routeToOutput(ctx, groanGain, { wet: 0.35 });
    groan.start(now);
    groan.stop(now + dur + 0.05);

    // 最後に低くドスンと沈んで止まる
    const thump = ctx.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(85, now + dur - 0.05);
    thump.frequency.exponentialRampToValueAtTime(30, now + dur + 0.25);
    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(volume * 0.9, now + dur - 0.05);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.3);
    thump.connect(thumpGain);
    routeToOutput(ctx, thumpGain, { wet: 0.25 });
    thump.start(now + dur - 0.05);
    thump.stop(now + dur + 0.35);
  }

  /* ---------------- BGM（ループ再生、フェードイン/アウト） ---------------- */
  let bgmAudio = null;
  const BGM_SRC_KEY = "hfx-bgm-src";
  const BGM_POSITION_KEY = "hfx-bgm-position";

  // resume: true（既定）の場合、sessionStorageに保存しておいた前回の再生位置から
  // 再開する。章ごとにページが丸ごと切り替わる作りのため、これがないと
  // 章を移動するたびにBGMが0秒から鳴り直してしまう。
  function playBGM(src, { volume = 0.3, fadeMs = 2500, loop = true, resume = true } = {}) {
    if (bgmAudio) {
      if (bgmAudio._hfxRamp) clearInterval(bgmAudio._hfxRamp);
      bgmAudio.pause();
      bgmAudio = null;
    }
    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = 0;
    bgmAudio = audio;

    if (resume) {
      try {
        const savedSrc = sessionStorage.getItem(BGM_SRC_KEY);
        const savedPos = parseFloat(sessionStorage.getItem(BGM_POSITION_KEY));
        if (savedSrc === src && Number.isFinite(savedPos) && savedPos > 0) {
          audio.addEventListener(
            "loadedmetadata",
            () => {
              if (Number.isFinite(audio.duration) && savedPos < audio.duration) {
                audio.currentTime = savedPos;
              }
            },
            { once: true }
          );
        }
      } catch (e) {
        // sessionStorageが使えない環境では、素直に最初から再生する
      }

      audio.addEventListener("timeupdate", () => {
        try {
          sessionStorage.setItem(BGM_SRC_KEY, src);
          sessionStorage.setItem(BGM_POSITION_KEY, String(audio.currentTime));
        } catch (e) {
          // 無視
        }
      });
    }

    audio.play().catch((err) => {
      console.warn("[HorrorFX] BGM playback blocked (need user interaction first):", err);
    });

    audio._hfxTarget = volume;
    rampVolume(audio, volume, fadeMs);

    return audio;
  }

  function stopBGM({ fadeMs = 1200 } = {}) {
    if (!bgmAudio) return;
    const audio = bgmAudio;
    bgmAudio = null;
    audio._hfxTarget = 0;
    rampVolume(audio, 0, fadeMs, () => audio.pause());
  }

  // audio.volume を ms かけて to へ滑らかに動かす（進行中のランプは打ち切る）
  function rampVolume(audio, to, ms, onDone) {
    if (audio._hfxRamp) clearInterval(audio._hfxRamp);
    const from = audio.volume;
    const t0 = performance.now();
    if (ms <= 0) {
      audio.volume = Math.max(0, Math.min(1, to));
      if (onDone) onDone();
      return;
    }
    audio._hfxRamp = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      audio.volume = Math.max(0, Math.min(1, from + (to - from) * p));
      if (p >= 1) {
        clearInterval(audio._hfxRamp);
        audio._hfxRamp = null;
        if (onDone) onDone();
      }
    }, 30);
  }

  /* ---------------- ノイズバッファ生成（合成音の材料） ---------------- */
  function createNoiseBuffer(ctx, duration = 0.3) {
    const size = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /* ---------------- 共有リバーブ（すべての合成音に薄く空間の響きを足す） ---------------- */
  let reverbNode = null;

  function getReverb(ctx) {
    if (!reverbNode) {
      reverbNode = ctx.createConvolver();
      const rate = ctx.sampleRate;
      const length = rate * 2.2;
      const impulse = ctx.createBuffer(2, length, rate);
      for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
        }
      }
      reverbNode.buffer = impulse;
      reverbNode.connect(ctx.destination);
    }
    return reverbNode;
  }

  // 音源ノードを「ドライ（直接音）」と「ウェット（残響）」の両方に接続する。
  // wet を上げるほど、狭い部屋の中で反響しているような空気感が増す。
  function routeToOutput(ctx, node, { wet = 0.25 } = {}) {
    node.connect(ctx.destination);
    if (wet > 0) {
      const send = ctx.createGain();
      send.gain.value = wet;
      node.connect(send);
      send.connect(getReverb(ctx));
    }
  }

  /* ---------------- 衝撃音（フラッシュ／シェイクに添える一撃） ---------------- */
  function playSting({ volume = 0.55 } = {}) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // 低く落ちる一撃音
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.35);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(volume, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(oscGain);
    routeToOutput(ctx, oscGain, { wet: 0.3 });
    osc.start(now);
    osc.stop(now + 0.42);

    // 高域のノイズ（ザッ、という質感を足す）
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = createNoiseBuffer(ctx, 0.22);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "highpass";
    noiseFilter.frequency.value = 1400;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    routeToOutput(ctx, noiseGain, { wet: 0.15 });
    noiseSrc.start(now);
    noiseSrc.stop(now + 0.22);
  }

  /* ---------------- 静的ノイズ（グリッチ演出に添える音） ---------------- */
  function playStatic({ volume = 0.3, duration = 900 } = {}) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const bursts = Math.max(3, Math.floor(duration / 110));
    for (let i = 0; i < bursts; i++) {
      const start = now + (i * duration) / 1000 / bursts + Math.random() * 0.02;
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = createNoiseBuffer(ctx, 0.045);
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 700 + Math.random() * 2200;
      filter.Q.value = 9;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.045);
      noiseSrc.connect(filter);
      filter.connect(gain);
      routeToOutput(ctx, gain, { wet: 0.1 });
      noiseSrc.start(start);
      noiseSrc.stop(start + 0.05);
    }
  }

  /* ---------------- 鈴の音（音声ファイル不要、Web Audioで合成） ---------------- */
  function playBell({ volume = 0.5, pitch = 880 } = {}) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    // 倍音比をわずかにずらして「鈴・鐘」らしい響きにする
    const partials = [
      { ratio: 1.0, gain: 1.0 },
      { ratio: 2.4, gain: 0.55 },
      { ratio: 3.8, gain: 0.32 },
      { ratio: 5.4, gain: 0.18 },
    ];
    const master = ctx.createGain();
    master.gain.value = volume;
    routeToOutput(ctx, master, { wet: 0.35 });

    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = pitch * p.ratio;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(p.gain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 1.9);
    });
  }

  /* ---------------- 静的ノイズの瞬間バースト（TVの砂嵐が一瞬走る） ---------------- */
  function playStaticRoar({ duration = 260, volume = 0.5 } = {}) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const dur = duration / 1000;
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = createNoiseBuffer(ctx, dur + 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2200;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + dur * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    noiseSrc.connect(filter);
    filter.connect(gain);
    routeToOutput(ctx, gain, { wet: 0.2 });
    noiseSrc.start(now);
    noiseSrc.stop(now + dur + 0.05);
  }

  function staticBurst({ duration = 260, volume = 0.5, sound = true } = {}) {
    const overlay = ensureOverlay("hfx-static-burst");
    overlay.style.setProperty("--hfx-burst-duration", duration + "ms");
    overlay.classList.remove("hfx-burst-active");
    void overlay.offsetWidth;
    overlay.classList.add("hfx-burst-active");
    setTimeout(() => overlay.classList.remove("hfx-burst-active"), duration + 50);
    if (sound) playStaticRoar({ duration, volume });
  }

  /* ---------------- ハートビート（不穏な鼓動でビネットが明滅し続ける） ---------------- */
  function playHeartThump({ volume = 0.4 } = {}) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.18);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    routeToOutput(ctx, gain, { wet: 0.2 });
    osc.start(now);
    osc.stop(now + 0.25);
  }

  function heartbeat({ duration = 3600, bpm = 70, volume = 0.4, sound = true } = {}) {
    const overlay = ensureOverlay("hfx-vignette");
    const interval = 60000 / bpm;
    overlay.style.setProperty("--hfx-heartbeat-duration", interval + "ms");
    overlay.classList.add("hfx-active");

    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += interval;
      if (sound) playHeartThump({ volume });
      if (elapsed >= duration) {
        clearInterval(timer);
        overlay.classList.remove("hfx-active");
      }
    }, interval);
    if (sound) playHeartThump({ volume });

    return () => {
      clearInterval(timer);
      overlay.classList.remove("hfx-active");
    };
  }

  /* ---------------- 囁き（画面の隅に一瞬だけ文字が浮かぶ） ---------------- */
  function playWhisperTone({ duration = 1400, volume = 0.18 } = {}) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const dur = duration / 1000;
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = createNoiseBuffer(ctx, dur);
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 1700;
    bandpass.Q.value = 4.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + dur * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    noiseSrc.connect(bandpass);
    bandpass.connect(gain);
    routeToOutput(ctx, gain, { wet: 0.45 });
    noiseSrc.start(now);
    noiseSrc.stop(now + dur + 0.05);
  }

  function whisper(text, { duration = 1400, x = null, y = null, sound = true } = {}) {
    const el = document.createElement("div");
    el.className = "hfx-whisper";
    el.textContent = text;
    el.style.setProperty("--hfx-whisper-duration", duration + "ms");
    const posX = x != null ? x : Math.random() * 55 + 20;
    const posY = y != null ? y : Math.random() * 55 + 15;
    el.style.left = posX + "%";
    el.style.top = posY + "%";
    el.style.transform = "translate(-50%, -50%)";
    document.body.appendChild(el);
    void el.offsetWidth;
    el.classList.add("hfx-whisper-active");
    if (sound) playWhisperTone({ duration });
    setTimeout(() => el.remove(), duration + 100);
  }

  /* ---------------- ひび割れ（画面が一瞬砕けたように見える） ---------------- */
  const CRACK_SVG =
    '<svg viewBox="0 0 100 100" preserveAspectRatio="none">' +
    '<g fill="none" stroke="#f4f0ec" stroke-width="0.35" opacity="0.9">' +
    '<path d="M50,48 L38,10 M50,48 L60,4 M50,48 L18,28 M50,48 L13,58 M50,48 L28,92 M50,48 L54,97 M50,48 L88,68 M50,48 L92,33 M50,48 L70,12" />' +
    '<path d="M38,10 L33,3 M60,4 L67,1 M18,28 L6,24 M13,58 L2,55 M28,92 L22,99 M88,68 L98,71 M92,33 L99,28" stroke-width="0.2" opacity="0.65"/>' +
    "</g></svg>";

  function playGlassCrack({ volume = 0.6 } = {}) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const t = now + i * 0.015 + Math.random() * 0.01;
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = 1800 + Math.random() * 2200;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(gain);
      routeToOutput(ctx, gain, { wet: 0.2 });
      osc.start(t);
      osc.stop(t + 0.05);
    }
    const thump = ctx.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(150, now);
    thump.frequency.exponentialRampToValueAtTime(45, now + 0.3);
    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(volume, now + 0.02);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    thump.connect(thumpGain);
    routeToOutput(ctx, thumpGain, { wet: 0.25 });
    thump.start(now);
    thump.stop(now + 0.4);
  }

  function crackFlash({ duration = 500, sound = true, volume = 0.6 } = {}) {
    const overlay = ensureOverlay("hfx-crack-overlay");
    overlay.innerHTML = CRACK_SVG;
    overlay.style.setProperty("--hfx-crack-duration", duration + "ms");
    overlay.classList.remove("hfx-crack-active");
    void overlay.offsetWidth;
    overlay.classList.add("hfx-crack-active");
    setTimeout(() => overlay.classList.remove("hfx-crack-active"), duration + 50);
    if (sound) playGlassCrack({ volume });
  }

  /* ---------------- フラッシュ ---------------- */
  function flash({ color = "#ffffff", duration = 180 } = {}) {
    const overlay = ensureOverlay("hfx-flash-overlay");
    overlay.style.setProperty("--hfx-flash-duration", duration + "ms");
    overlay.style.background = color;
    overlay.classList.remove("hfx-flash-active");
    // reflow を挟んでアニメーションを再トリガー
    void overlay.offsetWidth;
    overlay.classList.add("hfx-flash-active");
    setTimeout(() => overlay.classList.remove("hfx-flash-active"), duration + 50);
  }

  /* ---------------- シェイク ---------------- */
  function shake(target = document.body, { duration = 400, sound = true, volume = 0.55 } = {}) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    el.style.setProperty("--hfx-shake-duration", duration + "ms");
    el.classList.remove("hfx-shake");
    void el.offsetWidth;
    el.classList.add("hfx-shake");
    setTimeout(() => el.classList.remove("hfx-shake"), duration);
    if (sound) playSting({ volume });
  }

  /* ---------------- ジャンプスケア ---------------- */
  // sound:false にすると音は鳴らさない（別途 playSample などで好きな音を鳴らしたいとき用）
  function jumpscare({ image, sfx, duration = 700, shakeScreen = true, volume = 1.0, sound = true } = {}) {
    const overlay = ensureOverlay("hfx-jumpscare-overlay");
    overlay.innerHTML = image ? '<img src="' + image + '" alt="">' : "";
    overlay.classList.add("hfx-active");

    if (sound) {
      if (sfx) playSFX(sfx, { volume });
      else playSting({ volume });
    }
    if (shakeScreen) shake(document.body, { duration: Math.min(duration, 500), sound: false });

    setTimeout(() => {
      overlay.classList.remove("hfx-active");
    }, duration);
  }

  /* ---------------- ノイズ/走査線オーバーレイ ---------------- */
  function noise(on = true) {
    const overlay = ensureOverlay("hfx-noise-overlay");
    overlay.classList.toggle("hfx-active", on);
  }

  function scanlines(on = true) {
    let el = document.querySelector(".hfx-scanlines");
    if (on && !el) {
      ensureOverlay("hfx-scanlines");
    } else if (!on && el) {
      el.remove();
    }
  }

  /* ---------------- グリッチテキスト ---------------- */
  const GLITCH_CHARS = "アカサタナハマヤラワ日月火水木金土#%&*!?";

  function glitchText(target, { duration = 900, interval = 60, sound = true, volume = 0.28 } = {}) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    const original = el.textContent;
    el.classList.add("hfx-glitch", "hfx-glitching");
    if (sound) playStatic({ volume, duration });

    const ticks = Math.floor(duration / interval);
    let count = 0;
    const timer = setInterval(() => {
      count++;
      if (count >= ticks) {
        clearInterval(timer);
        el.textContent = original;
        el.classList.remove("hfx-glitching");
        return;
      }
      el.textContent = original
        .split("")
        .map((ch) => (ch === " " || Math.random() > 0.35 ? ch : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]))
        .join("");
    }, interval);
  }

  /* ---------------- スクロール連動トリガー ---------------- */
  // 要素が画面に入ったタイミングで一度だけ callback を実行する
  // rootMargin省略時は「画面の上半分」を判定領域にする＝要素が画面中央あたりまで
  // スクロールしてきたタイミングで発火する（下端に来た瞬間に発火する threshold 方式だと、
  // 読者がまだ読んでいないうちに演出が始まってしまうため）。
  function onScrollTrigger(target, callback, { threshold = 0, once = true, rootMargin = "0px 0px -50% 0px" } = {}) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback(entry);
            if (once) observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return observer;
  }

  // class="hfx-reveal" が付いた要素をスクロールでフェードインさせる（ページ側で呼ぶだけでOK）。
  // data-reveal="near" を付けた要素（ナビゲーションボタンなど）は、画面中央まで待たず、
  // 画面に入ってきた時点ですぐ表示する（ページ末尾にあり中央まで届かない場合があるため）。
  function autoReveal(selector = ".hfx-reveal") {
    document.querySelectorAll(selector).forEach((el) => {
      if (el.dataset.reveal === "near") {
        onScrollTrigger(el, () => el.classList.add("hfx-in"), { threshold: 0, rootMargin: "0px" });
        return;
      }
      onScrollTrigger(el, () => el.classList.add("hfx-in"));
    });
  }

  /* ============================================================
     追加演出群（足音・無音・人影・着信・遅延表示・靴の回転 ほか）
     ============================================================ */

  const reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function haptic(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (e) {
      // 非対応の端末では何もしない
    }
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* ---------------- Web Audio サンプル（パン・ピッチ・音量・残響を自由に操作できる） ---------------- */
  const sampleStore = new Map();

  // 音源をあらかじめ取得しておく（デコードは初めて鳴らすときに行う）。
  // normalize: 最大ピークがこの値になるよう自動で音量を揃える（小さすぎる素材の補正）
  function loadSample(name, url, { normalize = 0.8 } = {}) {
    if (sampleStore.has(name)) return;
    const entry = { url, normalize, raw: null, decoding: null, data: null };
    entry.raw = fetch(url).then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status + " " + url);
      return r.arrayBuffer();
    });
    entry.raw.catch((err) => console.warn("[HorrorFX] sample load failed:", err.message));
    sampleStore.set(name, entry);
  }

  // 音の立ち上がり（足音1歩ぶんなど）の位置を検出する
  function detectOnsets(buffer) {
    const ch = buffer.getChannelData(0);
    const sr = buffer.sampleRate;
    const win = Math.max(1, Math.floor(sr * 0.02));
    const env = [];
    for (let i = 0; i + win <= ch.length; i += win) {
      let s = 0;
      for (let j = 0; j < win; j++) s += ch[i + j] * ch[i + j];
      env.push(Math.sqrt(s / win));
    }
    let emax = 0;
    for (const v of env) if (v > emax) emax = v;
    const onsets = [];
    let last = -1;
    for (let k = 1; k < env.length; k++) {
      const t = (k * win) / sr;
      if (env[k] > emax * 0.28 && env[k - 1] < emax * 0.18 && t - last > 0.3) {
        onsets.push(t);
        last = t;
      }
    }
    return onsets;
  }

  async function getSample(name) {
    const entry = sampleStore.get(name);
    if (!entry) return null;
    if (entry.data) return entry.data;
    if (!entry.decoding) {
      entry.decoding = (async () => {
        const raw = await entry.raw;
        const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        const off = new Off(2, 1, 44100);
        const buffer = await new Promise((resolve, reject) => off.decodeAudioData(raw.slice(0), resolve, reject));
        const ch = buffer.getChannelData(0);
        let peak = 0;
        for (let i = 0; i < ch.length; i++) {
          const a = Math.abs(ch[i]);
          if (a > peak) peak = a;
        }
        const gain = peak > 0 ? Math.min(entry.normalize / peak, 40) : 1;
        entry.data = { buffer, gain, peak, onsets: detectOnsets(buffer) };
        return entry.data;
      })().catch((err) => {
        console.warn("[HorrorFX] sample decode failed:", name, err);
        return null;
      });
    }
    return entry.decoding;
  }

  function connectChain(ctx, source, { gain = 1, pan = 0, lowpass = 0, highpass = 0, lowshelf = 0, wet = 0.2 } = {}) {
    const g = ctx.createGain();
    g.gain.value = gain;
    source.connect(g);
    let node = g;
    if (highpass) {
      const f = ctx.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = highpass;
      node.connect(f);
      node = f;
    }
    if (lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = lowpass;
      node.connect(f);
      node = f;
    }
    if (lowshelf) {
      const f = ctx.createBiquadFilter();
      f.type = "lowshelf";
      f.frequency.value = 220;
      f.gain.value = lowshelf;
      node.connect(f);
      node = f;
    }
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      node.connect(p);
      node = p;
    }
    routeToOutput(ctx, node, { wet });
    return g;
  }

  // when は ctx.currentTime 基準の絶対時刻（秒）。offset / duration は元音源の中の位置（秒）。
  function startSample(ctx, data, { when, offset = 0, duration, volume = 1, rate = 1, fade = 0.05, ...chain }) {
    const src = ctx.createBufferSource();
    src.buffer = data.buffer;
    src.playbackRate.value = rate;
    const g = connectChain(ctx, src, { gain: volume * data.gain, ...chain });
    if (duration) {
      const real = duration / rate;
      g.gain.setValueAtTime(volume * data.gain, when + Math.max(0, real - fade));
      g.gain.linearRampToValueAtTime(0.0001, when + real);
      src.start(when, offset, duration);
    } else {
      src.start(when, offset);
    }
    return src;
  }

  async function playSample(name, { volume = 1, rate = 1, pan = 0, wet = 0.2, lowpass = 0, offset = 0, duration, delay = 0 } = {}) {
    const data = await getSample(name);
    if (!data) return null;
    const ctx = getAudioContext();
    const when = ctx.currentTime + delay / 1000 + 0.02;
    return startSample(ctx, data, { when, offset, duration, volume, rate, pan, wet, lowpass });
  }

  /* ---------------- 足音（木の床を歩く音。1歩ごとに間隔・重さ・方向を制御できる） ---------------- */
  const stepPool = { steps: [], drags: [], creaks: [] };

  // 足音の元になる音源を登録する。steps は歩く音、drags は引きずる音、creaks は床板のきしみ。
  function setFootstepSamples({ steps = [], drags = [], creaks = [] } = {}) {
    steps.forEach((u, i) => loadSample("hfx-step-" + i, u));
    drags.forEach((u, i) => loadSample("hfx-drag-" + i, u));
    creaks.forEach((u, i) => loadSample("hfx-creak-" + i, u));
    stepPool.steps = steps.map((_, i) => "hfx-step-" + i);
    stepPool.drags = drags.map((_, i) => "hfx-drag-" + i);
    stepPool.creaks = creaks.map((_, i) => "hfx-creak-" + i);
  }

  function slicesOf(data, { lead = 0.03, maxDur = 0.85 } = {}) {
    const on = data.onsets;
    if (!on.length) return [{ start: 0, dur: Math.min(maxDur, data.buffer.duration) }];
    return on.map((t, i) => {
      const start = Math.max(0, t - lead);
      const next = on[i + 1] != null ? on[i + 1] - lead : data.buffer.duration;
      return { start, dur: Math.max(0.15, Math.min(maxDur, next - start - 0.01)) };
    });
  }

  async function collectSlices(names, opts) {
    const out = [];
    for (const n of names) {
      const d = await getSample(n);
      if (d) slicesOf(d, opts).forEach((s) => out.push({ data: d, ...s }));
    }
    return out;
  }

  // サンプルが無い場合の代用（低い「ドン」＋床の「コッ」）
  function synthStep(ctx, when, { heavy = true, volume = 0.6, pan = 0, lowpass = 0 } = {}) {
    const f0 = heavy ? 72 : 118;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f0 * 1.9, when);
    osc.frequency.exponentialRampToValueAtTime(f0, when + 0.07);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(volume, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + (heavy ? 0.32 : 0.2));
    osc.connect(g);
    const n = ctx.createBufferSource();
    n.buffer = createNoiseBuffer(ctx, 0.12);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = heavy ? 260 : 420;
    bp.Q.value = 1.1;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(volume * 0.9, when);
    ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);
    n.connect(bp);
    bp.connect(ng);
    const mix = ctx.createGain();
    g.connect(mix);
    ng.connect(mix);
    let node = mix;
    if (lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = lowpass;
      node.connect(f);
      node = f;
    }
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      node.connect(p);
      node = p;
    }
    routeToOutput(ctx, node, { wet: 0.3 });
    osc.start(when);
    osc.stop(when + 0.4);
    n.start(when);
    n.stop(when + 0.13);
  }

  // kind: "heavy"（祖父のような重い足音）／"light"（右足を引きずる軽い足音）／"both"（二人が並んで歩く）
  // fromVolume→toVolume で近づく／遠ざかる。at は何ms後に始めるか。戻り値は全体の長さ(ms)。
  async function footsteps({
    kind = "heavy", steps = 6, interval = 1000, jitter = 0.1, at = 0, volume = 0.7,
    fromVolume = 1, toVolume = 1, pan = 0, panTo, muffled = false, creak = 0.25, drag, haptics = false,
  } = {}) {
    const ctx = getAudioContext();
    const [stepSl, dragSl, creakSl] = await Promise.all([
      collectSlices(stepPool.steps, { lead: 0.03, maxDur: 0.8 }),
      collectSlices(stepPool.drags, { lead: 0.06, maxDur: 1.7 }),
      collectSlices(stepPool.creaks, { lead: 0.02, maxDur: 1.4 }),
    ]);
    const useSynth = stepSl.length === 0;
    const lightSteps = kind === "light" || kind === "both";
    const withDrag = drag != null ? drag : lightSteps;
    const approach = toVolume > fromVolume;
    const retreat = toVolume < fromVolume;
    const t0 = ctx.currentTime + at / 1000 + 0.05;
    let t = t0;

    const oneStep = (when, heavy, vol, pn, cut, rightFoot) => {
      const wet = heavy ? 0.34 : 0.28;
      if (useSynth) {
        synthStep(ctx, when, { heavy, volume: vol * 0.8, pan: pn, lowpass: cut });
      } else {
        const s = pick(stepSl);
        startSample(ctx, s.data, {
          when, offset: s.start, duration: s.dur,
          volume: vol * (heavy ? 1 : 0.62),
          rate: heavy ? rand(0.8, 0.9) : rand(1.06, 1.18),
          pan: pn, lowpass: cut, lowshelf: heavy ? 7 : 0, highpass: heavy ? 0 : 140, wet,
        });
      }
      if (creakSl.length && Math.random() < creak) {
        const c = pick(creakSl);
        startSample(ctx, c.data, {
          when: when + rand(0.03, 0.09), offset: c.start, duration: c.dur,
          volume: vol * rand(0.4, 0.7), rate: rand(0.88, 1.08), pan: pn, lowpass: cut, wet: 0.35,
        });
      }
      if (withDrag && !heavy && rightFoot && dragSl.length) {
        const d = pick(dragSl);
        startSample(ctx, d.data, {
          when: when + 0.2, offset: d.start, duration: Math.min(d.dur, 1.0),
          volume: vol * 0.85, rate: rand(0.95, 1.05), pan: pn, lowpass: cut || 5500, wet: 0.25, fade: 0.2,
        });
      }
      if (haptics && heavy) setTimeout(() => haptic(16), Math.max(0, (when - ctx.currentTime) * 1000));
    };

    for (let i = 0; i < steps; i++) {
      const p = steps > 1 ? i / (steps - 1) : 1;
      const vol = volume * lerp(fromVolume, toVolume, p);
      const pn = lerp(pan, panTo != null ? panTo : pan, p);
      const cut = muffled ? 1300 : approach ? lerp(1500, 9000, p) : retreat ? lerp(9000, 1500, p) : 0;
      const step = (interval / 1000) * (1 + rand(-jitter, jitter));
      if (kind === "heavy") {
        oneStep(t, true, vol, pn, cut, false);
      } else if (kind === "light") {
        oneStep(t, false, vol, pn, cut, i % 2 === 1);
      } else {
        oneStep(t, true, vol, pn, cut, false);
        oneStep(t + step * 0.42, false, vol, pn, cut, i % 2 === 1);
      }
      t += step;
    }
    return Math.round((t - t0) * 1000);
  }

  // 床をこする音（靴が回る／足を引きずる）
  async function playScrape({ duration = 600, volume = 0.5, pan = 0 } = {}) {
    const ctx = getAudioContext();
    const slices = await collectSlices(stepPool.drags, { lead: 0.05, maxDur: 1.7 });
    const when = ctx.currentTime + 0.02;
    if (slices.length) {
      const s = pick(slices);
      const dur = Math.min(s.dur, duration / 1000 + 0.15);
      const data = s.data;
      startSample(ctx, data, { when, offset: s.start, duration: dur, volume, rate: rand(0.92, 1.05), pan, wet: 0.2, lowpass: 4500, fade: 0.12 });
      return;
    }
    const dur = duration / 1000;
    const n = ctx.createBufferSource();
    n.buffer = createNoiseBuffer(ctx, dur + 0.05);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(volume * 0.5, when + dur * 0.3);
    g.gain.linearRampToValueAtTime(0.0001, when + dur);
    n.connect(bp);
    bp.connect(g);
    routeToOutput(ctx, g, { wet: 0.2 });
    n.start(when);
    n.stop(when + dur + 0.05);
  }

  /* ---------------- 環境音レイヤー（虫の声など）と「無音」 ---------------- */
  const ambience = new Map();

  function playAmbience(name, src, { volume = 0.3, fadeMs = 3000, loop = true } = {}) {
    stopAmbience(name, { fadeMs: 400 });
    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = 0;
    audio._hfxTarget = volume;
    ambience.set(name, audio);
    audio.play().catch((err) => {
      console.warn("[HorrorFX] ambience playback blocked (need user interaction first):", err);
    });
    rampVolume(audio, volume, fadeMs);
    return audio;
  }

  function stopAmbience(name, { fadeMs = 1500 } = {}) {
    const audio = ambience.get(name);
    if (!audio) return;
    ambience.delete(name);
    audio._hfxTarget = 0;
    rampVolume(audio, 0, fadeMs, () => audio.pause());
  }

  function audioLayers() {
    return [bgmAudio, ...ambience.values()].filter(Boolean);
  }

  let silenceTimer = null;

  // 「虫の声がやんだ」「足音が止まった」を作る。BGMと環境音を一瞬で消し、画面の四隅を暗くして、
  // duration 後にゆっくり戻す。restore:false なら unsilence() を呼ぶまで無音のまま。
  function silence({ duration = 4000, restoreMs = 3000, visual = true, restore = true } = {}) {
    audioLayers().forEach((a) => rampVolume(a, 0, 140));
    if (visual) {
      document.body.classList.add("hfx-silent");
      const ov = ensureOverlay("hfx-silence-overlay");
      ov.style.transitionDuration = "0.35s";
      ov.classList.add("hfx-active");
    }
    clearTimeout(silenceTimer);
    return new Promise((resolve) => {
      if (!restore) return resolve();
      silenceTimer = setTimeout(() => {
        unsilence({ restoreMs });
        resolve();
      }, duration);
    });
  }

  function unsilence({ restoreMs = 3000 } = {}) {
    clearTimeout(silenceTimer);
    audioLayers().forEach((a) => rampVolume(a, a._hfxTarget != null ? a._hfxTarget : 0.3, restoreMs));
    const ov = document.querySelector(".hfx-silence-overlay");
    if (ov) {
      ov.style.transitionDuration = restoreMs + "ms";
      ov.classList.remove("hfx-active");
    }
    document.body.classList.remove("hfx-silent");
  }

  /* ---------------- 人影（画面の端に、青白い人の形がぼんやり立つ） ---------------- */
  function shadowFigures({ figures, duration = 2600, fadeIn = 900, kind = "woman" } = {}) {
    const list = figures || [
      { x: 36, h: 52, lean: -2 },
      { x: 62, h: 42, lean: 4 },
    ];
    const root = ensureOverlay("hfx-shadows");
    root.innerHTML = "";
    root.style.setProperty("--hfx-shadow-in", fadeIn + "ms");
    list.forEach((f, i) => {
      const el = document.createElement("div");
      el.className = "hfx-shadow-figure" + (kind === "man" ? " hfx-shadow-figure--man" : "");
      el.style.setProperty("--x", f.x + "%");
      el.style.setProperty("--h", f.h + "vh");
      el.style.setProperty("--lean", (f.lean || 0) + "deg");
      el.style.animationDelay = i * 0.7 + "s, " + i * 0.3 + "s";
      root.appendChild(el);
    });
    void root.offsetWidth;
    root.classList.add("hfx-active");
    clearTimeout(root._hfxTimer);
    root._hfxTimer = setTimeout(() => {
      root.style.setProperty("--hfx-shadow-in", "1400ms");
      root.classList.remove("hfx-active");
    }, duration);
  }

  /* ---------------- 着信通知（スマホの「不在着信」バナーが降りてくる） ---------------- */
  const PHONE_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>';

  function notify({ app = "電話", title = "不在着信", body = "", time = "いま", duration = 5600, sound = "phone", vibrate = true } = {}) {
    const el = document.createElement("div");
    el.className = "hfx-notify";
    el.setAttribute("role", "status");
    el.innerHTML =
      '<div class="hfx-notify__icon">' + PHONE_SVG + "</div>" +
      '<div class="hfx-notify__main">' +
      '<div class="hfx-notify__top"><span>' + app + "</span><span>" + time + "</span></div>" +
      '<div class="hfx-notify__title">' + title + "</div>" +
      '<div class="hfx-notify__body">' + body + "</div>" +
      "</div>";
    document.body.appendChild(el);
    void el.offsetWidth; // 初期位置を確定させてから transition を始める
    el.classList.add("hfx-in");
    if (sound) {
      if (sampleStore.has(sound)) playSample(sound, { volume: 0.9, wet: 0.05 });
      else playPhoneBuzz();
    }
    if (vibrate) haptic([260, 110, 260, 110, 260]);
    setTimeout(() => {
      el.classList.remove("hfx-in");
      setTimeout(() => el.remove(), 700);
    }, duration);
    return el;
  }

  function playPhoneBuzz() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.37;
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = 135;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 520;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.02);
      g.gain.setValueAtTime(0.16, t + 0.24);
      g.gain.linearRampToValueAtTime(0.0001, t + 0.27);
      o.connect(lp);
      lp.connect(g);
      routeToOutput(ctx, g, { wet: 0.05 });
      o.start(t);
      o.stop(t + 0.3);
    }
  }

  /* ---------------- 遅延表示テキスト（ためらうように、一文字ずつ現れる） ---------------- */
  function prepareSlowText(target = ".slow-reveal") {
    const els = typeof target === "string" ? document.querySelectorAll(target) : [target];
    els.forEach((el) => {
      if (!el || el.dataset.hfxSlow) return;
      el.dataset.hfxSlow = "1";
      const text = el.textContent.trim();
      el.setAttribute("aria-label", text);
      el.textContent = "";
      const frag = document.createDocumentFragment();
      [...text].forEach((ch) => {
        const s = document.createElement("span");
        s.className = "hfx-ch";
        s.setAttribute("aria-hidden", "true");
        s.textContent = ch;
        frag.appendChild(s);
      });
      el.appendChild(frag);
    });
  }

  // base: 1文字あたりのms／punct: 句読点などで止まるms／jitter: ばらつき（0〜1）
  function slowReveal(el, { base = 85, punct = 380, jitter = 0.5, onDone } = {}) {
    prepareSlowText(el);
    const chars = el.querySelectorAll(".hfx-ch");
    if (reduceMotion) {
      chars.forEach((c) => c.classList.add("hfx-on"));
      if (onDone) onDone();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let i = 0;
      const next = () => {
        if (i >= chars.length) {
          if (onDone) onDone();
          resolve();
          return;
        }
        const c = chars[i++];
        c.classList.add("hfx-on");
        const isPause = /[、。，．…ー―!?！？」「）]/.test(c.textContent);
        setTimeout(next, (isPause ? punct : base) * (1 + (Math.random() - 0.5) * jitter));
      };
      next();
    });
  }

  /* ---------------- 回転する靴（踏み石の上の靴が、誰の手も触れずに向きを変える） ---------------- */
  // figure: .shoe-compass 要素。deg: 靴の向き（0=戸の方、180=道の方）。
  // style "ghost" は止まっては動く不自然な回り方、"hand" は人が手で直す速い回り方。
  function turnShoe(figure, deg, { duration = 3600, style = "ghost", sound = true, caption } = {}) {
    const pair = figure.querySelector(".shoe-compass__pair");
    if (!pair) return Promise.resolve();
    const from = parseFloat(figure.dataset.angle || "0");
    const delta = deg - from;
    const ease = "cubic-bezier(.45,.05,.3,1)";
    let frames;
    let bursts = [];
    if (style === "ghost") {
      const stops = [[0, 0], [0.08, 0.06], [0.22, 0.06], [0.34, 0.32], [0.5, 0.32], [0.6, 0.55], [0.78, 0.55], [1, 1]];
      frames = stops.map(([o, p]) => ({ transform: "rotate(" + (from + delta * p) + "deg)", offset: o, easing: ease }));
      bursts = [[0, 0.08], [0.22, 0.34], [0.5, 0.6], [0.78, 1]];
    } else {
      frames = [
        { transform: "rotate(" + from + "deg)", offset: 0, easing: "ease-out" },
        { transform: "rotate(" + (from + delta * 1.05) + "deg)", offset: 0.7, easing: "ease-in-out" },
        { transform: "rotate(" + deg + "deg)", offset: 1 },
      ];
      bursts = [[0, 0.7]];
    }
    if (sound) {
      bursts.forEach(([a, b]) => {
        setTimeout(() => playScrape({ duration: (b - a) * duration, volume: style === "ghost" ? 0.5 : 0.4 }), a * duration);
      });
    }
    figure.classList.add("is-turning");
    if (!pair.animate || reduceMotion) {
      pair.style.transform = "rotate(" + deg + "deg)";
      figure.dataset.angle = String(deg);
      figure.classList.remove("is-turning");
      if (caption) setCaption(figure, caption);
      return Promise.resolve();
    }
    const anim = pair.animate(frames, { duration, fill: "forwards" });
    return anim.finished.then(
      () => {
        pair.style.transform = "rotate(" + deg + "deg)";
        anim.cancel();
        figure.dataset.angle = String(deg);
        figure.classList.remove("is-turning");
        if (caption) setCaption(figure, caption);
      },
      () => {}
    );
  }

  function setCaption(figure, text) {
    const cap = figure.querySelector("figcaption");
    if (cap) cap.textContent = text;
  }

  window.HorrorFX = {
    loadSample,
    playSample,
    setFootstepSamples,
    footsteps,
    playScrape,
    playAmbience,
    stopAmbience,
    silence,
    unsilence,
    shadowFigures,
    notify,
    prepareSlowText,
    slowReveal,
    turnShoe,
    setCaption,
    haptic,
    initEntryGate,
    registerSFX,
    playSFX,
    playBGM,
    stopBGM,
    playBell,
    playDoorCreak,
    playSting,
    playStatic,
    staticBurst,
    heartbeat,
    whisper,
    crackFlash,
    flash,
    shake,
    jumpscare,
    noise,
    scanlines,
    glitchText,
    onScrollTrigger,
    autoReveal,
    get audioUnlocked() {
      return audioUnlocked;
    },
  };
})();
