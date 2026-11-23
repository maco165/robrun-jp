#!/usr/bin/env bash
# NucBox5 の cron が毎時走らせる記事の更新 (PJ-030 の R-5。要約は NucBox5 の Claude Code で行う)。
#   main の最新に合わせる → 公式ニュースの取得 → Claude Code (claude -p) での要約 → 検査 → 記事のコミット → main に push。
#   公開は GitHub の deploy.yml が main への push で行う。
# 置き場所: 専用のクローン $HOME/robrun-jp-cron (main のまま置く。開発の作業ツリー ~/robrun-jp とは分ける)。
# 止めるには: $HOME/.local/state/robrun-jp/_off を作る。ログは同じフォルダの update-YYYYMMDD.log。
# 使い方: bash scripts/nucbox-update.sh [--fixture]
#   --fixture: 見本の応答と偽の claude で通しで走らせ、data/ を書き換えず、コミットも push もしない (確かめ用)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE="$HOME/.local/state/robrun-jp"
mkdir -p "$STATE"
LOG="$STATE/update-$(date +%Y%m%d).log"
FIXTURE=0
[ "${1:-}" = "--fixture" ] && FIXTURE=1

log() { echo "$(date '+%F %T') $*" | tee -a "$LOG"; }

if [ -e "$STATE/_off" ]; then
  log "止めてある ($STATE/_off) ので何もしない"
  exit 0
fi

# 同時に 2 つ走らせない (前の回が長引いたら、この回は飛ばす)
exec 9>"$STATE/update.lock"
if ! flock -n 9; then
  log "前の回が走っているので飛ばす"
  exit 0
fi

cd "$ROOT"
# cron の PATH には ~/.local/bin が無い。claude の CLI の場所を決める (summarize.ts も CLAUDE_BIN を見る)
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
export CLAUDE_BIN="${CLAUDE_BIN:-$HOME/.local/bin/claude}"
GIT_PUSH=(git -c credential.helper= -c "credential.helper=!gh auth git-credential")

log "== 開始 (fixture=$FIXTURE)"

if [ "$FIXTURE" = 0 ]; then
  # 専用のクローンは main のまま。手で変えたものがあれば止める (上書きしない)
  if [ "$(git branch --show-current)" != "main" ] || [ -n "$(git status --porcelain -- . ':!.cache')" ]; then
    log "作業ツリーが main でないか、変更が残っている。止める"
    exit 1
  fi
  "${GIT_PUSH[@]}" pull -q --ff-only origin main
fi

# 依存は package-lock.json が変わったときだけ入れ直す
LOCK_SUM="$(sha256sum package-lock.json | cut -d' ' -f1)"
if [ ! -d node_modules ] || [ "$(cat "$STATE/lock.sum" 2>/dev/null)" != "$LOCK_SUM" ]; then
  log "依存を入れる (npm ci)"
  npm ci --no-audit --no-fund >>"$LOG" 2>&1
  echo "$LOCK_SUM" >"$STATE/lock.sum"
fi

SUMMARIZE_FAILED=0
if [ "$FIXTURE" = 1 ]; then
  mkdir -p .cache
  cp tests/fixtures/empty-news.json .cache/news.json
  cp data/versions.json .cache/versions.json
  echo '[]' >.cache/skipped.json
  rm -f .cache/inbox.json
  npm run -s fetch:news -- --fixture tests/fixtures/steam-news.json --news .cache/news.json --skipped .cache/skipped.json 2>&1 | tee -a "$LOG"
  CLAUDE_BIN="$ROOT/tests/fixtures/fake-claude.mjs" npm run -s summarize -- --news .cache/news.json --versions .cache/versions.json --skipped .cache/skipped.json 2>&1 | tee -a "$LOG" \
    || SUMMARIZE_FAILED=1
  npx tsx scripts/check-news.ts .cache/news.json 2>&1 | tee -a "$LOG"
else
  if ! npm run -s fetch:news 2>&1 | tee -a "$LOG"; then
    log "取得に失敗した。止める"
    exit 1
  fi
  # 1 回 5 件まで・1 件ごとに書き出す。失敗は data/skipped.json に回数で残る (要約できた分は続けてコミットする)
  timeout -k 30 900 npm run -s summarize 2>&1 | tee -a "$LOG" || SUMMARIZE_FAILED=1
fi

npm run -s check:repo 2>&1 | tee -a "$LOG"
npm run -s check:data 2>&1 | tee -a "$LOG"
npm run -s check:news 2>&1 | tee -a "$LOG"

if [ "$FIXTURE" = 1 ]; then
  if [ -n "$(git status --porcelain -- data)" ]; then
    log "見本の回なのに data/ が変わった。止める"
    exit 1
  fi
  log "== 見本の回を終えた (data/ は変わらない。コミットも push もしない)"
  exit 0
fi

git add data/news.json data/versions.json data/skipped.json
if git diff --cached --quiet; then
  log "記事の変更なし"
else
  git -c user.name="robrun-jp bot (NucBox5)" -c user.email="30610407+maco165@users.noreply.github.com" \
    commit -q -m "記事を更新する (公式ニュースの要約)"
  # 走っている間に main が進んでいたら、その上に載せてから push する
  "${GIT_PUSH[@]}" pull -q --rebase origin main
  "${GIT_PUSH[@]}" push -q origin HEAD:main
  log "記事を push した ($(git rev-parse --short HEAD))"
fi

if [ "$SUMMARIZE_FAILED" = 1 ]; then
  log "要約できなかった記事がある (data/skipped.json を見る)"
  exit 1
fi
log "== 終了"
