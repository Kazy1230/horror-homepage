# ホラーホームページ

長編ミステリーホラー作品を、スクロール/クリック演出付きで公開するための静的サイト。
HTML/CSS/JSのみで動作し、ビルド不要。

## フォルダ構成

```
/
├── index.html            トップページ（作品一覧）
├── common/
│   ├── horror.css        全ページ共通の演出スタイル（編集しない）
│   └── horror.js         全ページ共通の演出ライブラリ HorrorFX（編集しない）
└── works/
    └── sample/            1作品 = 1フォルダ
        ├── index.html
        ├── style.css      その作品固有の見た目
        ├── script.js      その作品固有の演出の組み立て
        └── assets/        画像・音声（作品ごとに用意）
```

## 新しい作品ページを追加する手順

1. `works/sample` フォルダを丸ごとコピーし、`works/新しい作品名` にリネーム。
2. `index.html` の本文・タイトル・`<link>`/`<script>` の相対パス（`../../common/...`）はそのままでOK。
3. `style.css` で見た目、`script.js` で演出のタイミングを調整する。
4. トップページ `index.html` の `<ul class="work-list">` に新しい `<li><a href="works/新しい作品名/index.html">...</a></li>` を追加する。

## 演出ライブラリ HorrorFX の使い方

`common/horror.js` を読み込むと `window.HorrorFX` が使える。主な関数：

| 関数 | 説明 |
|---|---|
| `HorrorFX.initEntryGate({title, note, warning, onEnter, sound, maxWait})` | 「クリックして入る」画面を出す。音声を使うページでは**必須**（ブラウザの自動再生制限の回避を兼ねる）。クリックすると、ドアの中に入っていくような視覚演出（文字が消え、画面が暗転）を見せながら音を鳴らし、**音が鳴り終わってから** `onEnter` を呼んで本文を表示する。`warning` を指定すると赤い警告文（ハザードストライプ付き）を追加表示できる。`sound` は `true`（合成ドア音）／`false`（無音）／`"登録したSFX名"`（`registerSFX` した実音源。鳴り終わるまで待つ）。`maxWait`（既定30000ms）で、音源が長くてもそこで打ち切って本文を表示できる。 |
| `HorrorFX.playDoorCreak({volume})` | 音声ファイル不要、Web Audioで合成したドアの軋み音。`sound: true`（既定）のとき `initEntryGate` から呼ばれる。 |
| `HorrorFX.registerSFX(name, path)` / `HorrorFX.playSFX(name)` | 音声ファイルを使った効果音の登録と再生。 |
| `HorrorFX.playBell({volume, pitch})` | 音声ファイル不要、Web Audioで合成した鈴の音を鳴らす。 |
| `HorrorFX.playSting({volume})` | 音声ファイル不要の「衝撃音」。`shake()`から自動で呼ばれる。 |
| `HorrorFX.playStatic({volume, duration})` | 音声ファイル不要の「静的ノイズ」。`glitchText()`から自動で呼ばれる。 |
| `HorrorFX.flash({color, duration})` | 画面全体を一瞬フラッシュさせる。 |
| `HorrorFX.shake(target, {duration, sound})` | 要素（既定は body 全体）を揺らす。`sound: false` で自動再生される衝撃音を止められる。 |
| `HorrorFX.jumpscare({image, sfx, duration})` | 画像を全画面表示してジャンプスケア。`sfx` 未指定時は `playSting` が自動で鳴る。 |
| `HorrorFX.glitchText(selector, {duration, sound})` | テキストを一時的に文字化けさせる。`sound: false` で自動再生される静的ノイズを止められる。 |
| `HorrorFX.staticBurst({duration, volume})` | TVの砂嵐のようなノイズが画面全体に一瞬走る。 |
| `HorrorFX.heartbeat({duration, bpm, volume})` | 画面端が赤黒く明滅し、鼓動音が一定時間続く（じわじわ系の緊張演出）。 |
| `HorrorFX.whisper(text, {duration, x, y})` | 画面の任意の位置に文字が一瞬だけ浮かび上がる（本文には出てこない“何か”の演出）。 |
| `HorrorFX.crackFlash({duration, volume})` | 画面にヒビが入ったように一瞬砕ける演出。 |
| `HorrorFX.noise(true/false)` | 砂嵐ノイズオーバーレイの表示切替。 |
| `HorrorFX.scanlines(true/false)` | ブラウン管風の走査線の表示切替。 |
| `HorrorFX.onScrollTrigger(selector, callback, {threshold, once})` | 要素が画面に入ったタイミングで任意の演出を発火。 |
| `HorrorFX.autoReveal(selector)` | `class="hfx-reveal"` を付けた要素をスクロールでフェードインさせる。 |

すべての合成音（鈴・衝撃音・静的ノイズ・鼓動・囁き・ガラス割れ）は共有のリバーブ（残響）を薄くかけていて、単なるビープ音ではなく空間の中で鳴っているような響きになる。

具体的な使い方は `works/iwakan/script.js` を参照。`works/iwakan` では、以下のクラス／data属性を本文の `<p>` に付けるだけで演出を組み込める：

| クラス / 属性 | 効果 |
|---|---|
| `class="glitch-target"` | スクロールでその段落が文字化けする |
| `class="scare-trigger" data-fx="flash\|static\|crack\|heartbeat\|jumpscare\|drip"` | スクロールで指定した演出が発火（`data-fx` 省略時は `flash`＝フラッシュ＋シェイク）。`jumpscare` は `data-image` の画像を全画面表示、`drip` は演出なしで水滴音のみ再生（静かな違和感の場面向け） |
| `class="whisper-trigger" data-whisper="表示したい文字"` | スクロールで画面の隅に一瞬だけ文字が浮かぶ |

具体的な使い方は `works/sample/script.js` を参照。

### 「四十九日の戸」（`works/shijukunichi`）で追加した演出

実音源のサンプルを読み込み、足音を1歩ずつ切り出して再生する仕組みなど、より空間的な演出を追加している。使い方は `works/shijukunichi/script.js` を参照。

| 関数 | 説明 |
|---|---|
| `initEntryGate({variant: "sliding", slip: "忌中"})` | 引き戸が左右に開く入場ゲート。開くまで本文のスクロールをロックする。 |
| `loadSample` / `playSample` / `setFootstepSamples` | 音声を読み込み（自動で音量を正規化）、音量・再生速度・左右定位・リバーブ・ローパス付きで再生。 |
| `footsteps({kind, steps, interval, jitter, at, fromVolume, toVolume, pan, panTo, muffled, creak, drag})` | 複数歩の足音を、遠→近／左→右などの変化つきで鳴らす。返り値は総再生時間(ms)。 |
| `playAmbience` / `stopAmbience` | 環境音（虫の声など）をループ再生。 |
| `silence({duration, restoreMs})` / `unsilence()` | BGM・環境音を急に消し、画面を暗くする「無音」演出。 |
| `shadowFigures({figures, duration})` | 画面の端にぼんやり立つ人影を出す。 |
| `notify({app, title, body})` | スマホの通知バナー（不在着信など）を表示。 |
| `prepareSlowText` / `slowReveal(el)` | 文字を一文字ずつ、句読点で間を置きながら表示。 |
| `turnShoe(figure, deg, {style: "ghost"\|"hand"})` | 飛び石上の靴の向きを、目を離した隙に回す。 |
| `haptic(pattern)` | 対応端末で振動させる。 |

### 「最近、違和感を感じるんです」（`works/iwakan`）の専用演出

共通ライブラリではなく、この作品だけの `works/iwakan/fx.js`（`window.CX`）と `fx.css` で持っている。本文の `<p>` に `class="scene-trigger" data-scene="名前"` を付けると、`script.js` の `scenes[名前]` が走る。

| 部品 | 説明 |
|---|---|
| `CX.HUD` | 画面隅の録画ランプ。読んでいる端末の現在時刻が、そのまま録画時刻になる。 |
| `CX.Cam` | 防犯カメラの映像（SVG製）。小窓⇄全画面、扉・腕・人影のポーズ、デジタルズーム、ノイズ。 |
| `CX.Ceiling` | 画面上端に天井（シミ・点検口・通気口・懐中電灯の光）を出す。 |
| `CX.eyes` | 暗がりに浮かぶ目。 |
| `CX.Lids` | 眠りに落ちる直前の、閉じていくまぶた。 |
| `class="note-hand"` | 犯人のノート。手書き風の字が一文字ずつ書かれる。 |

素材クレジットは `works/*/assets/CREDITS.md` に記載。

## 見た目の共通ルール（フレーム／背景写真）

- `common/horror.css` が、全ページの外側に「うっすら写真の壁紙＋グランジノイズ＋ビネット」を敷き、`.story`（や `.hfx-frame`）を中央の読みやすい1枚の画面として浮かび上がらせている。
- ページの `<body>` に `style="--hfx-page-photo: url('assets/xxx.jpg')"` を指定すると、その写真がぼかされて壁紙になる。省略した場合は写真なしの無地になる。
- `works/iwakan` では章のグループごとに背景写真を変えている（`01〜04.html`=部屋、`05〜08.html`=クローゼット、`09〜12.html`=廊下、`13〜17.html`=別の廊下）。新しい作品でも同じ仕組みが使える。

## 音声を使う場合の注意

- ブラウザは「ユーザー操作なしの自動再生」をブロックする。`initEntryGate` のクリックが最初の操作になるので、音声再生はこの後（`onEnter` の中）で行うこと。
- 音声ファイルは各作品の `works/作品名/assets/` に置き、著作権的に問題のない音源（自作 or フリー素材のライセンス条件を確認したもの）を使うこと。

## デプロイ（Netlify / Vercel）

このリポジトリはビルド不要の静的サイトなので、Netlify/Vercelどちらでも「ビルドコマンドなし・公開ディレクトリはルート（`/`）」の設定でそのまま公開できる。

- Git連携で自動デプロイする場合：GitHubリポジトリ化してNetlify/Vercelと連携すれば、`git push` するたびに自動反映される。
- Git連携しない場合：Netlify/Vercelの管理画面からこのフォルダをドラッグ＆ドロップでもデプロイ可能。
