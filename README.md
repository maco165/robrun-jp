# ROB RUN 日本語アップデート

**https://maco165.github.io/robrun-jp/** (準備中)

ROB RUN の公式アップデートを、日本語で・日本時間で・すぐに届ける、個人の非公式のファンサイトです。
開発元・販売元とは関係ありません。

## 何をまとめるか

| 柱 | 中身 |
|---|---|
| 公式のアップデート | Steam の公式ニュースを 1 時間ごとに取得し、AI (Claude) が日本語で要約する。原文へのリンクを必ず付ける |
| ゲームについて | アーリーアクセスの状況と主な仕組み (ワイプなど) |
| 開発会社について | 開発会社・販売会社と公式の窓口 |
| 公開中のサーバー | いま公開されているサーバーへの外部リンク |

他のサイトの記事は、自動では集めず、選んだ記事を出典 (サイト名・URL・取得日) つきで要約します。

**どの版の情報かを必ず書く。** ROB RUN はアーリーアクセスで、仕様が版ごとに変わります。
記事・ゲームの情報・サーバーの情報のすべてに対象の版を持たせ、いまの版より古い情報には「古い版の情報」と出します。

## 仕組み

```mermaid
flowchart LR
  steam["Steam Web API<br/>(公式ニュース・同時接続数)"] --> fetch["取得<br/>(GitHub Actions・1 時間ごと)"]
  fetch --> summarize["要約・タグ・変更種別<br/>(Claude API)"]
  summarize --> data[("data/*.json<br/>記事・版・サーバー")]
  manual["人が確かめた情報<br/>(ゲーム・開発会社・サーバー・他サイトの要約)"] -->|PR で確認| data
  data --> build["ビルド<br/>(Vite + React + Astryx)"]
  build --> pages["GitHub Pages"]
  data --> notify["RSS・Discord"]
```

## ページ

| 道 | 中身 |
|---|---|
| `/robrun-jp/` | 新サーバーの開放までの残り時間 (EU・East US、日本時間)、最新のお知らせ、これまでのお知らせ |
| `/robrun-jp/news/` | 記事の一覧。タグ・変更の種類・キーワードで絞り込む |
| `/robrun-jp/articles/<id>/` | 記事。日本語の要約・変更点・対象の版・原文へのリンク |
| `/robrun-jp/guide/` | 攻略の入口。ジャンルのカードとアップデートの履歴 |
| `/robrun-jp/guide/<ページ>/` | 攻略 5 ページ (はじめに・ワイプと最初の動き・稼ぐ/売る/守る・武器と防具・地図/拠点/警察)。ページの中は見出しと目次で分け、出典は折りたたむ。以前の URL は転送 |
| `/robrun-jp/tools/sensitivity/` | 感度変換。ほかのゲームの感度を、同じ振り向き (cm/360) になる ROB RUN の感度に変換する |
| `/robrun-jp/links/` | リンク集。公式・SteamDB・人数とサーバーの確認だけ |

どのページも、作るときに HTML を書き出す (事前描画) ので、JavaScript を動かさない読み手にも中身が届きます。
道は `src/routes.tsx` の 1 か所で決め、画面の振り分けと書き出し (`scripts/prerender.mjs`) の両方がそこを読みます。

## 検索と共有

- ページごとに題・説明・canonical・OGP (共有したときのカード) を書き出します。Twitter (X) のカードの形 (summary_large_image) は全ページ共通で、題・説明・画像は OGP から読まれます。共有の画像は `public/og.png` (1200×630) です
- 構造化データ (JSON-LD): トップは WebSite、記事は NewsArticle (公開日・原文を `isBasedOn` で指す)、攻略のジャンルは Article とパンくず (BreadcrumbList)、攻略の入口とリンク集は CollectionPage、感度変換は WebApplication
- 攻略のジャンルごとに共有の画像 (`public/img/og-guide-<id>.png`) と見出しの帯 (`public/img/guide-<id>.png`) を自前で描きます (`npm run images:guide`)。公式の画像は使いません
- `sitemap.xml` は検索に載せるページだけを載せ、作るたびの日付は付けません。404 は検索に載せません (noindex)
- 検索エンジンが読む `robots.txt` はドメインの直下 (`maco165.github.io` のリポジトリ) にあり、そこに robrun-jp の Sitemap の行を置きます。`public/robots.txt` はその写しです
- ファビコンは日本時間のカウントダウンを表すストップウォッチの印で、公式のロゴは使いません。`npm run images` で `public/apple-touch-icon.png` と `public/og.png` を描き直せます

## データ

| ファイル | 中身 | 誰が書くか |
|---|---|---|
| `data/news.json` | 記事 (原文の情報・日本語の要約・タグ・変更の種類・対象の版・人が確かめたか) | NucBox5 の毎時の更新 |
| `data/steam.json` | ROB RUN の Steam の appid (4262460) と、確かめた日と方法 | 人 |
| `data/versions.json` | 版の一覧 (発売とパッチノート。日時と元のお知らせ) | 人、のちに取得の仕組み |
| `data/skipped.json` | 要約できなかった記事の gid・状態・回数・最後の理由 (本文は入れない)。断られた記事は 1 回、それ以外は 3 回で取らなくなる | 毎時の更新の仕組み |
| `data/schedule.json` | 新サーバーの開放の時刻のきまりと、その出典・更新日 | 人 (公式のお知らせを確かめて) |
| `data/guide.json` | 攻略のジャンル・図・項目。どれも出所の種類 (公式か攻略サイトか) と出典を持つ。基にした版 (`basedOn`) | 人 (調べて) |
| `data/gear.json` | 武器と防具の段・Mk ごとの性能と解放費・購入額、土地の費用、出典 | 人 (調べて) |
| `data/links.json` | リンク集の各サイト (説明・言語・更新日・フィード) | 人 (調べて) |
| `data/sensitivity.json` | 感度変換の係数 (各ゲームの yaw) と出典、ROB RUN の設定の範囲、測り方 | 人 (調べて) |
| `tests/fixtures/news.json` | 画面の検査だけに使う見本の記事。題に【見本】が付く | 人 |

### 版の決め方

ROB RUN の公式はパッチに版の番号を付けません (2026-11-23 時点の公式のお知らせ 18 件の題と本文に 0 件)。
そこで **公式のお知らせ (発売・パッチノート) が出た日 (日本時間) を版の名前** にします (例 `2026-11-20 版`)。発売より前の情報は `プレイテスト` です。
公式の記事の版は公開された時点の最新の版です。ただし次の版に向けた変更を告げる記事 (発売の直前の変更点の告知など) は、理由 (`versionNote`) を書けば直後の版を付けられます。
他サイトの記事は、扱う中身の版を人が決めます。いまの版より古い記事には【古い版の情報】と出します。決め方は `src/lib/versions.ts` の 1 か所にあります。

見本の記事 (id が `fixture-`) が公開用の `dist` に入ると、`ROBRUN_NEWS` の有無によらず `scripts/prerender.mjs` が止めます。

## 1 時間ごとの更新

NucBox5 の cron が毎時、`scripts/nucbox-update.sh` を走らせます (専用のクローン `~/robrun-jp-cron`)。
main の最新に合わせ → 取得 → 要約 → 検査 → 記事のコミット → main に push し、公開は GitHub の `deploy.yml` が main への push で行います。
要約は NucBox5 の Claude Code (`claude -p`) で作るので、API の鍵は要りません (ログインしたアカウントの使える量から使う)。
NucBox5 が止まっている間は記事が増えないだけで、サイトの公開はそのまま続きます。
止めるには `~/.local/state/robrun-jp/_off` を作ります。ログは同じフォルダにあります。
`bash scripts/nucbox-update.sh --fixture` で、見本の応答と偽の claude を使って通しで確かめられます (data/ を書き換えず、コミットも push もしない)。
記事 (`data/news.json`) を人が PR で直すときは、毎時の回 (13 分) の前後を避けてください。重なるとその回の要約は push に失敗し、次の回にやり直しになります。

## 要約の仕方

要約は Claude Haiku (`claude-haiku-5-5`) が、`prompts/summarize.md` のきまりで作ります。既定は NucBox5 の Claude Code の CLI (ツールなし・設定と MCP を読まない) で、`--engine api` なら Anthropic の API (要 `ANTHROPIC_API_KEY`) で作ります。
出力の形 (見出し・影響・要点・タグ・お知らせの区分) は `src/lib/summary.ts` の型で決め、その形に合わない出力は受け取りません。
タグと変更の種類は `src/lib/tags.ts` の決めたリストからだけ選びます。全文は訳さず、自分の言葉で短くまとめ、原文へのリンクと「AI による要約」を必ず付けます。
新しいパッチノートを要約すると、版の一覧に版が 1 つ増えます。
要約は記事の検査 (`check:news`) を通ったものだけを入れます。断られた記事は `data/skipped.json` に記録して次から取らず、形の合わない記事や検査に通らない記事は次の回にまた試し、3 回失敗したら取りません。
1 回の要約は 5 件までで、溜まった記事は次の回に回します。1 件ごとに書き出すので、途中で止まっても要約できた分と失敗の回数は残ります。
要点は 12 件まで、見出しは 80 字までなど、全文の訳にならない上限を要約の形と検査の両方に置いています (`src/lib/tags.ts`)。

## 技術

| 項目 | 使うもの |
|---|---|
| 画面 | React 19・Vite・[Astryx](https://github.com/meta/astryx) (Meta の部品集) と独自テーマ `robrun` |
| 書体 | Noto Sans JP (本文と見出し)・Dela Gothic One (サイト名と特集の見出しだけ)・JetBrains Mono。どれも同梱し、外部から読まない |
| 公開 | GitHub Pages (`.github/workflows/deploy.yml`) |

テーマの元は `themes/robrun/` にあり、`npx astryx experimental theme editor set robrun ...` で変えると `src/themes/robrun/` が作り直されます。手で書き換えません。

## 手元で動かす

```bash
npm ci
npm run dev     # http://localhost:5173/robrun-jp/
npm run build   # dist/ に書き出す (画面・事前描画の入口・ページごとの HTML の順)
npm test        # 単体テスト (版の決め方・データの検査)
npm run check:data  # data/ の検査 (版の一覧と記事の版)
npm run fetch:news  # Steam の公式ニュースを取り、まだ要約していない記事を .cache/inbox.json に足す (本文はコミットしない)
npm run summarize   # .cache/inbox.json の記事を Claude Haiku で日本語に要約して data/news.json に足す (既定は claude の CLI。--mock で見本の要約)
npm run check:news  # data/news.json の様式の検査 (タグ・変更の種類・原文の URL・要約の主体・人の確認)
npm run e2e     # 見本の記事で dist-e2e/ に組み、1280px と 390px で各ページを開いて確かめる
npm run images:guide  # 攻略のジャンルごとのイメージ画像を public/img/ に描く (ジャンルを足したら走らせてコミット)
```

`npm run e2e` は、事前描画の HTML に見出しがあること、横にはみ出さないこと、ページのエラーが無いこと、
記事の情報欄に要約の主体と原文のリンクがあること、攻略の図・出典の番号・まとめた出典、リンク集のサイト、感度変換の計算を確かめます。CI (`.github/workflows/deploy.yml`) でも PR ごとに走ります。

## 方針

- パッチノートの全文の翻訳・転載はしない。短い要約と原文へのリンクにする
- 他のサイトから自動で取得 (スクレイピング) しない
- 公式のロゴやアートワークは、開発元の方針を確かめるまで使わない
- 日本語化 MOD は配らず、案内もしない (アンチチートによる BAN の危険があるため)
- 記事の情報欄に要約の主体 (AI か人か) を書く。人が確かめたかどうかはデータに持つ
- ゲーム内通貨・アイテムの販売、代行、チートの販売をしているサイトは、リンク集にも出典にも載せない (`src/lib/links.ts` の `BLOCKED_HOSTS`、`check:data` が落とす)
- 公式が出していない数値 (ゲームのファイルから集めた可能性があるもの) は、攻略サイトの情報として印を付け、出典と注記を添える

## ライセンス

コードは MIT ([LICENSE](LICENSE))。ROB RUN の名称と内容の権利は開発元・販売元にあります。
