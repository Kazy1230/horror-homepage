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
  function initEntryGate({ title = "クリックして入る", note = "音声が流れます。音量にご注意ください。", warning, onEnter, sound = true, maxWait = 30000 } = {}) {
    const gate = document.createElement("div");
    gate.className = "hfx-gate";
    gate.innerHTML =
      (warning ? '<div class="hfx-gate__warning">' + warning + "</div>" : "") +
      '<div class="hfx-gate__title">' + title + "</div>" +
      '<div class="hfx-gate__note">' + note + "</div>" +
      '<div class="hfx-gate__door"></div>';
    document.body.appendChild(gate);

    gate.addEventListener("click", function handler() {
      audioUnlocked = true;
      gate.removeEventListener("click", handler);
      gate.classList.add("hfx-entering");

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
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

  function playBGM(src, { volume = 0.3, fadeMs = 2500, loop = true } = {}) {
    if (bgmAudio) {
      bgmAudio.pause();
      bgmAudio = null;
    }
    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = 0;
    bgmAudio = audio;
    audio.play().catch((err) => {
      console.warn("[HorrorFX] BGM playback blocked (need user interaction first):", err);
    });

    const steps = 30;
    let i = 0;
    const timer = setInterval(() => {
      if (bgmAudio !== audio) {
        clearInterval(timer);
        return;
      }
      i++;
      audio.volume = Math.min(volume, (volume * i) / steps);
      if (i >= steps) clearInterval(timer);
    }, fadeMs / steps);

    return audio;
  }

  function stopBGM({ fadeMs = 1200 } = {}) {
    if (!bgmAudio) return;
    const audio = bgmAudio;
    bgmAudio = null;
    const startVolume = audio.volume;
    const steps = 20;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      audio.volume = Math.max(0, startVolume * (1 - i / steps));
      if (i >= steps) {
        clearInterval(timer);
        audio.pause();
      }
    }, fadeMs / steps);
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
  function jumpscare({ image, sfx, duration = 700, shakeScreen = true, volume = 1.0 } = {}) {
    const overlay = ensureOverlay("hfx-jumpscare-overlay");
    overlay.innerHTML = image ? '<img src="' + image + '" alt="">' : "";
    overlay.classList.add("hfx-active");

    if (sfx) playSFX(sfx, { volume });
    else playSting({ volume });
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

  window.HorrorFX = {
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
