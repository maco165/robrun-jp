#!/usr/bin/env node
// リポジトリに残してはいけないものが追跡されていないかを見る (npm run check:repo。CI でも走らせる)。
//   .cache/ の下: 取得した公式の本文 (英語の全文) を置く場所。全文を公開リポジトリに残さない
// 追跡されていれば、ファイルを出して終了コード 1。
import { execFileSync } from 'node:child_process';

const FORBIDDEN = ['.cache/'];
const tracked = execFileSync('git', ['ls-files', '-z', '--', ...FORBIDDEN], { encoding: 'utf8' }).split('\0').filter(Boolean);
if (tracked.length) {
  for (const f of tracked) console.log(`NG 追跡してはいけないファイル: ${f} (取り消すには git rm --cached ${f})`);
  process.exit(1);
}
console.log(`check-repo: OK (${FORBIDDEN.join('・')} の下に追跡されたファイルは無い)`);
